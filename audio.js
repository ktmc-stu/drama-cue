/* Web Audio engine: preloaded buffers, per-cue gain/pan, fades, offline byte cache. */

export const dbToGain = db => db <= -60 ? 0 : Math.pow(10, db / 20);
const clamp = (v,a,b) => Math.min(b, Math.max(a, v));

/* ---------- IndexedDB cache of raw audio bytes (survives reloads / offline) ---------- */
const DB='dramacue', STORE='files';
function idb(){
  return new Promise((res,rej)=>{
    const r = indexedDB.open(DB,1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE);
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  });
}
async function cacheGet(k){
  try{ const db = await idb();
    return await new Promise((res,rej)=>{ const q = db.transaction(STORE,'readonly').objectStore(STORE).get(k);
      q.onsuccess=()=>res(q.result||null); q.onerror=()=>rej(q.error); });
  }catch{ return null; }
}
async function cachePut(k,v){
  try{ const db = await idb();
    await new Promise((res,rej)=>{ const q = db.transaction(STORE,'readwrite').objectStore(STORE).put(v,k);
      q.onsuccess=()=>res(); q.onerror=()=>rej(q.error); });
  }catch{}
}

export class AudioEngine {
  constructor(){
    this.ctx=null; this.master=null; this.analyser=null; this.streamDest=null; this.el=null;
    this.buffers=new Map(); this.instances=new Map(); this._seq=1;
    this.masterDb=0; this.onEnded=null; this.sinkId='default';
  }
  ensure(){
    if(this.ctx) return this.ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.analyser = this.ctx.createAnalyser(); this.analyser.fftSize = 1024;
    this.master.connect(this.analyser);
    this.analyser.connect(this.ctx.destination);
    this.master.gain.value = dbToGain(this.masterDb);
    return this.ctx;
  }
  async unlock(){ this.ensure(); if(this.ctx.state !== 'running'){ try{ await this.ctx.resume(); }catch{} } }
  setMasterDb(db){ this.masterDb = db; if(this.master) this.master.gain.value = dbToGain(db); }

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

  async load(key, url){
    this.ensure();
    if(this.buffers.has(key)) return this.buffers.get(key);
    let bytes = await cacheGet(key);
    if(!bytes){
      const r = await fetch(url);
      if(!r.ok) throw new Error('HTTP '+r.status);
      bytes = await r.arrayBuffer();
      cachePut(key, bytes.slice(0));
    }
    const buf = await this.ctx.decodeAudioData(bytes);
    this.buffers.set(key, buf);
    return buf;
  }
  has(key){ return this.buffers.has(key); }

  /* ---------- instances ---------- */
  _hold(param, now){
    if(param.cancelAndHoldAtTime) param.cancelAndHoldAtTime(now);
    else { const v = param.value; param.cancelScheduledValues(now); param.setValueAtTime(v, now); }
  }
  _raw(i){ return i.paused ? i.offset : i.offset + (this.ctx.currentTime - i.startAt) * i.rate; }
  _attach(i){
    const s = this.ctx.createBufferSource();
    s.buffer = i.buf; s.playbackRate.value = i.rate;
    if(i.loop){ s.loop = true; s.loopStart = i.trimIn; s.loopEnd = i.trimIn + i.region; }
    s.connect(i.gain);
    s.onended = () => { if(i._ignore || i.paused) return; this._remove(i); this.onEnded && this.onEnded(i); };
    return s;
  }
  _remove(i){
    this.instances.delete(i.id);
    try{ i.src.disconnect(); }catch{}
    try{ i.gain.disconnect(); }catch{}
    try{ i.pan && i.pan.disconnect(); }catch{}
  }

  play(cue){
    this.ensure();
    const key = cue.file.path || cue.file.url;
    const buf = this.buffers.get(key); if(!buf) return null;
    const ctx = this.ctx, now = ctx.currentTime;
    const trimIn  = clamp(cue.trimIn || 0, 0, buf.duration - 0.02);
    const trimOut = cue.trimOut > 0 ? clamp(cue.trimOut, trimIn + 0.02, buf.duration) : buf.duration;
    const region  = Math.max(0.02, trimOut - trimIn);
    const gain = ctx.createGain();
    const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    if(pan){ pan.pan.value = clamp(cue.pan || 0, -1, 1); gain.connect(pan); pan.connect(this.master); }
    else gain.connect(this.master);

    const i = { id:'p'+(this._seq++), cueId:cue.id, name:cue.name, buf, gain, pan,
      trimIn, region, rate:cue.rate || 1, loop:!!cue.loop, offset:0, startAt:now,
      paused:false, manual:false, _ignore:false, targetDb:cue.volume ?? 0, fadeOut:cue.fadeOut || 0 };
    i.src = this._attach(i);

    const target = Math.max(0.0001, dbToGain(i.targetDb)), fi = Math.max(0, cue.fadeIn || 0);
    i.gain.gain.setValueAtTime(fi > 0 ? 0.0001 : target, now);
    if(fi > 0) i.gain.gain.linearRampToValueAtTime(target, now + fi);

    if(i.loop) i.src.start(now, trimIn);
    else i.src.start(now, trimIn, region);
    this.instances.set(i.id, i);
    return i;
  }
  info(i){
    const el = this._raw(i);
    const pos = i.loop ? el % i.region : Math.min(el, i.region);
    return { elapsed:el, pos, remaining:Math.max(0, i.region - pos), region:i.region, paused:i.paused, loop:i.loop };
  }
  list(target='all'){ return [...this.instances.values()].filter(i => target === 'all' || i.cueId === target); }
  cueIds(){ return new Set([...this.instances.values()].map(i => i.cueId)); }
  anyPaused(){ return [...this.instances.values()].some(i => i.paused); }

  pause(id){
    const i = this.instances.get(id); if(!i || i.paused) return;
    i.offset = this._raw(i); i.paused = true; i._ignore = true;
    try{ i.src.stop(); }catch{}
  }
  unpause(id){
    const i = this.instances.get(id); if(!i || !i.paused) return;
    const now = this.ctx.currentTime;
    i.paused = false; i._ignore = false; i.startAt = now;
    i.src = this._attach(i);
    const off = i.loop ? i.offset % i.region : clamp(i.offset, 0, i.region - 0.01);
    if(i.loop) i.src.start(now, i.trimIn + off);
    else i.src.start(now, i.trimIn + off, Math.max(0.01, i.region - off));
  }
  toggle(id){ const i = this.instances.get(id); if(!i) return; i.paused ? this.unpause(id) : this.pause(id); }
  pauseAll(){ this.list().forEach(i => this.pause(i.id)); }
  unpauseAll(){ this.list().forEach(i => this.unpause(i.id)); }

  setDb(id, db){
    const i = this.instances.get(id); if(!i) return;
    const now = this.ctx.currentTime;
    this._hold(i.gain.gain, now);
    i.gain.gain.linearRampToValueAtTime(Math.max(0.0001, dbToGain(db)), now + 0.06);
    i.targetDb = db;
  }
  setCueDb(cueId, db){ this.list(cueId).forEach(i => this.setDb(i.id, db)); }

  stop(id, fade = 0){
    const i = this.instances.get(id); if(!i) return;
    i.manual = true;
    const f = Math.max(0, fade), now = this.ctx.currentTime;
    if(i.paused){ this._remove(i); return; }
    if(f > 0){ this._hold(i.gain.gain, now); i.gain.gain.linearRampToValueAtTime(0.0001, now + f); }
    try{ i.src.stop(now + f + 0.02); }catch{ this._remove(i); }
  }
  stopCue(target = 'all', fade = 0){ this.list(target).forEach(i => this.stop(i.id, fade)); }
  stopAll(fade = 0){ this.stopCue('all', fade); }

  fade(target, toDb, time, stopAtEnd){
    const now = this.ctx.currentTime, t = Math.max(0.01, time || 0);
    this.list(target).forEach(i => {
      this._hold(i.gain.gain, now);
      i.gain.gain.linearRampToValueAtTime(Math.max(0.0001, dbToGain(toDb)), now + t);
      i.targetDb = toDb;
      if(stopAtEnd){
        i.manual = true;
        if(i.paused) setTimeout(() => this._remove(i), t * 1000);
        else { try{ i.src.stop(now + t + 0.03); }catch{ this._remove(i); } }
      }
    });
  }
  level(){
    if(!this.analyser) return 0;
    const a = new Uint8Array(this.analyser.fftSize);
    this.analyser.getByteTimeDomainData(a);
    let peak = 0;
    for(let k = 0; k < a.length; k++) peak = Math.max(peak, Math.abs(a[k] - 128) / 128);
    return peak;
  }
}
