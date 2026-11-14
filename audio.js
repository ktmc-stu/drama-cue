/* Web Audio engine + IndexedDB byte cache + waveform peak analysis. */
export const dbToGain = db => db <= -60 ? 0 : Math.pow(10, db/20);
const clamp = (v,a,b) => Math.min(b, Math.max(a,v));

const DB = 'dramacue', STORE = 'bytes';
let dbp = null;
function idb(){
  if(dbp) return dbp;
  dbp = new Promise((res,rej) => {
    const r = indexedDB.open(DB,1);
    r.onupgradeneeded = () => { if(!r.result.objectStoreNames.contains(STORE)) r.result.createObjectStore(STORE); };
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  });
  return dbp;
}
export async function bytesGet(key){
  try{
    const db = await idb();
    return await new Promise((res,rej) => {
      const q = db.transaction(STORE,'readonly').objectStore(STORE).get(key);
      q.onsuccess = () => res(q.result || null); q.onerror = () => rej(q.error);
    });
  }catch{ return null; }
}
export async function bytesPut(key, value){
  try{
    const db = await idb();
    await new Promise((res,rej) => {
      const q = db.transaction(STORE,'readwrite').objectStore(STORE).put(value, key);
      q.onsuccess = () => res(); q.onerror = () => rej(q.error);
    });
  }catch{}
}
export async function bytesDel(key){
  try{
    const db = await idb();
    await new Promise(res => { const q = db.transaction(STORE,'readwrite').objectStore(STORE).delete(key); q.onsuccess = q.onerror = () => res(); });
  }catch{}
}

export class AudioEngine {
  constructor(){
    this.ctx = null; this.master = null; this.analyser = null; this.streamDest = null; this.el = null;
    this.buffers = new Map(); this.peaks = new Map(); this.instances = new Map();
    this._seq = 1; this.masterDb = 0; this.muted = false; this.onEnded = null; this.sinkId = 'default';
  }
  ensure(){
    if(this.ctx) return this.ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.analyser = this.ctx.createAnalyser(); this.analyser.fftSize = 1024;
    this.master.connect(this.analyser);
    this.analyser.connect(this.ctx.destination);
    this.master.gain.value = this.muted ? 0 : dbToGain(this.masterDb);
    return this.ctx;
  }
  async unlock(){ this.ensure(); if(this.ctx.state !== 'running'){ try{ await this.ctx.resume(); }catch{} } }
  decode(bytes){ this.ensure(); return this.ctx.decodeAudioData(bytes); }
  _applyMaster(){
    if(!this.master) return;
    const now = this.ctx.currentTime, g = this.master.gain;
    g.cancelScheduledValues(now); g.setValueAtTime(g.value, now);
    g.linearRampToValueAtTime(this.muted ? 0 : dbToGain(this.masterDb), now + .05);
  }
  setMasterDb(db){ this.masterDb = db; this._applyMaster(); }
  setMuted(m){ this.muted = !!m; this._applyMaster(); }

  async setOutput(deviceId){
    this.ensure();
    if(!this.el){ this.el = new Audio(); this.el.autoplay = true; }
    if(deviceId && deviceId !== 'default'){
      if(!this.el.setSinkId) throw new Error('unsupported');
      if(!this.streamDest) this.streamDest = this.ctx.createMediaStreamDestination();
      await this.el.setSinkId(deviceId);
      this.el.srcObject = this.streamDest.stream;
      await this.el.play().catch(()=>{});
      try{ this.analyser.disconnect(); }catch{}
      this.analyser.connect(this.streamDest);
    }else{
      try{ this.analyser.disconnect(); }catch{}
      this.analyser.connect(this.ctx.destination);
      this.el.srcObject = null;
    }
    this.sinkId = deviceId || 'default';
  }

  peaksFor(key, buf){
    if(this.peaks.has(key)) return this.peaks.get(key);
    const N = 1400, len = buf.length, step = Math.max(1, Math.floor(len/N));
    const out = new Float32Array(N*2);
    const chans = []; for(let c=0;c<Math.min(2,buf.numberOfChannels);c++) chans.push(buf.getChannelData(c));
    for(let i=0;i<N;i++){
      let mn = 0, mx = 0;
      const a = i*step, b = Math.min(len, a+step);
      for(let j=a;j<b;j+=2){
        let v = 0; for(let c=0;c<chans.length;c++) v += chans[c][j];
        v /= chans.length;
        if(v < mn) mn = v; if(v > mx) mx = v;
      }
      out[i*2] = mn; out[i*2+1] = mx;
    }
    this.peaks.set(key, out);
    return out;
  }

  _hold(p, now){
    if(p.cancelAndHoldAtTime) p.cancelAndHoldAtTime(now);
    else { const v = p.value; p.cancelScheduledValues(now); p.setValueAtTime(v, now); }
  }
  _raw(i){ return i.paused ? i.offset : i.offset + (this.ctx.currentTime - i.startAt)*i.rate; }
  _attach(i){
    const s = this.ctx.createBufferSource();
    s.buffer = i.buf; s.playbackRate.value = i.rate;
    if(i.loop){ s.loop = true; s.loopStart = i.trimIn; s.loopEnd = i.trimIn + i.region; }
    s.connect(i.gain);
    s.onended = () => { if(i.ignore || i.paused) return; this._remove(i); this.onEnded && this.onEnded(i); };
    return s;
  }
  _remove(i){
    this.instances.delete(i.id);
    ['src','gain','pan','meter'].forEach(k => { try{ i[k] && i[k].disconnect(); }catch{} });
  }

  play(cue, key, offset = 0){
    this.ensure();
    const buf = this.buffers.get(key); if(!buf) return null;
    const ctx = this.ctx, now = ctx.currentTime;
    const trimIn = clamp(cue.trimIn || 0, 0, Math.max(0, buf.duration - .02));
    const trimOut = cue.trimOut > 0 ? clamp(cue.trimOut, trimIn + .02, buf.duration) : buf.duration;
    const region = Math.max(.02, trimOut - trimIn);
    const off = clamp(offset, 0, region - .01);

    const gain = ctx.createGain();
    const meter = ctx.createAnalyser(); meter.fftSize = 256;
    const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    gain.connect(meter);
    if(pan){ pan.pan.value = clamp(cue.pan || 0, -1, 1); meter.connect(pan); pan.connect(this.master); }
    else meter.connect(this.master);

    const i = { id:'ch'+(this._seq++), cueId:cue.id, name:cue.name, buf, key, gain, pan, meter,
      trimIn, region, rate:clamp(cue.rate || 1, .25, 4), loop:!!cue.loop, offset:off, startAt:now,
      paused:false, manual:false, ignore:false, targetDb:cue.volume ?? 0, fadeOut:cue.fadeOut || 0 };
    i.src = this._attach(i);

    const target = Math.max(.0001, dbToGain(i.targetDb)), fi = Math.max(0, cue.fadeIn || 0);
    i.gain.gain.setValueAtTime(fi > 0 ? .0001 : target, now);
    if(fi > 0) i.gain.gain.linearRampToValueAtTime(target, now + fi);

    if(i.loop) i.src.start(now, trimIn + off);
    else i.src.start(now, trimIn + off, Math.max(.01, region - off));
    this.instances.set(i.id, i);
    return i;
  }
  info(i){
    const el = this._raw(i);
    const pos = i.loop ? el % i.region : Math.min(el, i.region);
    return { elapsed:el, pos, remaining:Math.max(0, i.region - pos), region:i.region, paused:i.paused, loop:i.loop };
  }
  peakOf(i){
    if(!i.meter || i.paused) return 0;
    const a = new Uint8Array(i.meter.fftSize); i.meter.getByteTimeDomainData(a);
    let p = 0; for(let k=0;k<a.length;k++) p = Math.max(p, Math.abs(a[k]-128)/128);
    return p;
  }
  list(target='all'){ return [...this.instances.values()].filter(i => target === 'all' || i.cueId === target); }
  cueIds(){ return new Set([...this.instances.values()].map(i => i.cueId)); }
  anyPaused(){ return [...this.instances.values()].some(i => i.paused); }

  pause(id){
    const i = this.instances.get(id); if(!i || i.paused) return;
    i.offset = this._raw(i); i.paused = true; i.ignore = true;
    try{ i.src.stop(); }catch{}
  }
  unpause(id){
    const i = this.instances.get(id); if(!i || !i.paused) return;
    const now = this.ctx.currentTime;
    i.paused = false; i.ignore = false; i.startAt = now;
    i.src = this._attach(i);
    const off = i.loop ? i.offset % i.region : clamp(i.offset, 0, i.region - .01);
    if(i.loop) i.src.start(now, i.trimIn + off);
    else i.src.start(now, i.trimIn + off, Math.max(.01, i.region - off));
  }
  toggle(id){ const i = this.instances.get(id); if(i) i.paused ? this.unpause(id) : this.pause(id); }
  pauseAll(){ this.list().forEach(i => this.pause(i.id)); }
  unpauseAll(){ this.list().forEach(i => this.unpause(i.id)); }

  setDb(id, db){
    const i = this.instances.get(id); if(!i) return;
    const now = this.ctx.currentTime;
    this._hold(i.gain.gain, now);
    i.gain.gain.linearRampToValueAtTime(Math.max(.0001, dbToGain(db)), now + .06);
    i.targetDb = db;
  }
  setCueDb(cueId, db){ this.list(cueId).forEach(i => this.setDb(i.id, db)); }

  stop(id, fade = 0){
    const i = this.instances.get(id); if(!i) return;
    i.manual = true;
    if(i.paused){ this._remove(i); return; }
    const f = Math.max(0, fade), now = this.ctx.currentTime;
    if(f > 0){ this._hold(i.gain.gain, now); i.gain.gain.linearRampToValueAtTime(.0001, now + f); }
    try{ i.src.stop(now + f + .02); }catch{ this._remove(i); }
  }
  stopCue(target='all', fade=0){ this.list(target).forEach(i => this.stop(i.id, fade)); }
  stopAll(fade=0){ this.stopCue('all', fade); }

  fade(target, toDb, time, stopAtEnd){
    const now = this.ctx.currentTime, d = Math.max(.01, time || 0);
    this.list(target).forEach(i => {
      this._hold(i.gain.gain, now);
      i.gain.gain.linearRampToValueAtTime(Math.max(.0001, dbToGain(toDb)), now + d);
      i.targetDb = toDb;
      if(stopAtEnd){
        i.manual = true;
        if(i.paused) setTimeout(() => this._remove(i), d*1000);
        else { try{ i.src.stop(now + d + .03); }catch{ this._remove(i); } }
      }
    });
  }
  level(){
    if(!this.analyser || this.muted) return 0;
    const a = new Uint8Array(this.analyser.fftSize); this.analyser.getByteTimeDomainData(a);
    let p = 0; for(let k=0;k<a.length;k++) p = Math.max(p, Math.abs(a[k]-128)/128);
    return p;
  }
}
