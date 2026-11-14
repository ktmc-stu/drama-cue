/* Deterministic offline synthesis so the desk opens with real, playable sound. */
export const SYNTHS = [
  { id:'rain',     sec:9,  en:'Rain ambience',   zh:'雨聲環境' },
  { id:'thunder',  sec:5,  en:'Thunder clap',    zh:'雷聲' },
  { id:'wind',     sec:7,  en:'Wind gust',       zh:'風聲' },
  { id:'knock',    sec:2,  en:'Door knocks',     zh:'敲門聲' },
  { id:'phone',    sec:3.4,en:'Telephone bell',  zh:'電話鈴聲' },
  { id:'ticks',    sec:8,  en:'Clock ticking',   zh:'時鐘滴答' },
  { id:'heart',    sec:4.4,en:'Heartbeat',       zh:'心跳' },
  { id:'applause', sec:8,  en:'Applause',        zh:'掌聲' },
  { id:'chime',    sec:5,  en:'Stage chime',     zh:'鐘聲' },
  { id:'whoosh',   sec:2.6,en:'Transition whoosh',zh:'轉場呼聲' }
];
export const synthLabel = (id, lang) => {
  const s = SYNTHS.find(x => x.id === id);
  return s ? (lang === 'zh-HK' ? s.zh : s.en) : id;
};

const SR = 44100;
function rng(seed){ let s = seed >>> 0 || 1; return () => (s = (Math.imul(s,1664525) + 1013904223) >>> 0) / 4294967296; }
function noise(ctx, sec, seed){
  const b = ctx.createBuffer(1, Math.max(1, Math.ceil(sec*SR)), SR), d = b.getChannelData(0), r = rng(seed);
  for(let i=0;i<d.length;i++) d[i] = r()*2-1;
  return b;
}
function src(ctx, buf, loop=false){ const s = ctx.createBufferSource(); s.buffer = buf; s.loop = loop; return s; }
function filt(ctx, type, f, q=1){ const b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; return b; }
function gain(ctx, v=0){ const g = ctx.createGain(); g.gain.value = v; return g; }
function env(g, pts){ g.gain.setValueAtTime(Math.max(0.0001,pts[0][1]), pts[0][0]);
  for(let i=1;i<pts.length;i++) g.gain.linearRampToValueAtTime(Math.max(0.0001,pts[i][1]), pts[i][0]); }
function chain(...nodes){ for(let i=0;i<nodes.length-1;i++) nodes[i].connect(nodes[i+1]); return nodes[nodes.length-1]; }

export async function renderSynth(id, seconds){
  const def = SYNTHS.find(s => s.id === id) || SYNTHS[0];
  const dur = Math.max(0.4, Math.min(30, seconds || def.sec));
  const ctx = new OfflineAudioContext(2, Math.ceil(dur*SR), SR);
  const out = gain(ctx, 0.9); out.connect(ctx.destination);
  const N = noise(ctx, Math.max(dur, 3), 1337);

  if(id === 'rain'){
    const s = src(ctx, N, true);
    const lp = filt(ctx,'lowpass',2100,.6), hp = filt(ctx,'highpass',260,.7), g = gain(ctx);
    chain(s, hp, lp, g, out);
    env(g, [[0,0],[.5,.5],[dur-.6,.5],[dur,0]]);
    const lfo = ctx.createOscillator(), lg = gain(ctx,.12);
    lfo.frequency.value = .17; chain(lfo, lg); lg.connect(g.gain); lfo.start(0);
    const s2 = src(ctx, N, true), bp = filt(ctx,'bandpass',5200,.9), g2 = gain(ctx);
    chain(s2, bp, g2, out); env(g2, [[0,0],[.7,.14],[dur-.6,.14],[dur,0]]);
    s.start(0); s2.start(0);
  }
  else if(id === 'thunder'){
    const s = src(ctx, N), lp = filt(ctx,'lowpass',900,.9), g = gain(ctx);
    chain(s, lp, g, out);
    lp.frequency.setValueAtTime(1100,0); lp.frequency.exponentialRampToValueAtTime(110, dur);
    env(g, [[0,0],[.03,.95],[.35,.55],[dur*.55,.3],[dur,0]]);
    const c = src(ctx, N), chp = filt(ctx,'highpass',1800,.8), cg = gain(ctx);
    chain(c, chp, cg, out); env(cg, [[0,0],[.008,.55],[.22,.05],[.4,0]]);
    const sub = ctx.createOscillator(), sg = gain(ctx);
    sub.type='sine'; sub.frequency.setValueAtTime(58,0); sub.frequency.exponentialRampToValueAtTime(34,dur);
    chain(sub, sg, out); env(sg, [[0,0],[.05,.6],[dur,0]]);
    s.start(0); c.start(0); sub.start(0); sub.stop(dur);
  }
  else if(id === 'wind'){
    const s = src(ctx, N, true), bp = filt(ctx,'bandpass',520,1.4), g = gain(ctx);
    chain(s, bp, g, out);
    bp.frequency.setValueAtTime(300,0);
    bp.frequency.linearRampToValueAtTime(1150,dur*.42);
    bp.frequency.linearRampToValueAtTime(340,dur);
    env(g, [[0,0],[dur*.4,.72],[dur*.72,.4],[dur,0]]);
    const lfo = ctx.createOscillator(), lg = gain(ctx,160);
    lfo.frequency.value = .9; chain(lfo, lg); lg.connect(bp.frequency); lfo.start(0);
    s.start(0);
  }
  else if(id === 'knock'){
    [0,.32,.64].forEach((t,i) => {
      const s = src(ctx, N), bp = filt(ctx,'bandpass',1500,1.1), g = gain(ctx);
      chain(s, bp, g, out); env(g, [[t,0],[t+.004,.7-i*.06],[t+.07,0]]);
      s.start(t); s.stop(t+.12);
      const o = ctx.createOscillator(), og = gain(ctx);
      o.type='sine'; o.frequency.setValueAtTime(180,t); o.frequency.exponentialRampToValueAtTime(72,t+.14);
      chain(o, og, out); env(og, [[t,0],[t+.005,.85],[t+.2,0]]);
      o.start(t); o.stop(t+.25);
    });
  }
  else if(id === 'phone'){
    [[0,1.0],[1.45,2.45]].forEach(([a,b]) => {
      [1040,1390].forEach((f,k) => {
        const o = ctx.createOscillator(), g = gain(ctx);
        o.type='triangle'; o.frequency.value = f; chain(o, g, out);
        env(g, [[a,0],[a+.02,k?.2:.3],[b-.03,k?.2:.3],[b,0]]);
        const trem = ctx.createOscillator(), tg = gain(ctx,k?.1:.15);
        trem.type='sine'; trem.frequency.value = 23; chain(trem, tg); tg.connect(g.gain);
        trem.start(a); trem.stop(b); o.start(a); o.stop(b);
      });
    });
  }
  else if(id === 'ticks'){
    for(let t=0; t<dur-.05; t+=1){
      const s = src(ctx, N), hp = filt(ctx,'highpass',2600,.8), g = gain(ctx);
      chain(s, hp, g, out); env(g, [[t,0],[t+.002,.5],[t+.03,0]]);
      s.start(t); s.stop(t+.05);
      const o = ctx.createOscillator(), og = gain(ctx);
      o.type='square'; o.frequency.value = 2300; chain(o, og, out);
      env(og, [[t,0],[t+.001,.16],[t+.014,0]]); o.start(t); o.stop(t+.03);
    }
  }
  else if(id === 'heart'){
    for(let c=0; c<dur; c+=1.1){
      [[c,.9],[c+.29,.6]].forEach(([t,a]) => {
        if(t > dur-.25) return;
        const o = ctx.createOscillator(), g = gain(ctx), lp = filt(ctx,'lowpass',180,.7);
        o.type='sine'; o.frequency.setValueAtTime(72,t); o.frequency.exponentialRampToValueAtTime(38,t+.2);
        chain(o, lp, g, out); env(g, [[t,0],[t+.012,a],[t+.24,0]]);
        o.start(t); o.stop(t+.3);
      });
    }
  }
  else if(id === 'applause'){
    const len = Math.ceil(dur*SR), b = ctx.createBuffer(2, len, SR), r = rng(90210);
    for(let ch=0; ch<2; ch++){
      const d = b.getChannelData(ch);
      for(let k=0;k<1500;k++){
        const at = Math.floor(r()*len), amp = .18+r()*.5, decay = 220+Math.floor(r()*700);
        for(let j=0;j<decay && at+j<len;j++) d[at+j] += (r()*2-1)*amp*Math.exp(-j/(decay*.28));
      }
    }
    const s = ctx.createBufferSource(); s.buffer = b;
    const bp = filt(ctx,'bandpass',2400,.55), g = gain(ctx);
    chain(s, bp, g, out); env(g, [[0,0],[1.1,.5],[dur-1.8,.45],[dur,0]]);
    s.start(0);
  }
  else if(id === 'chime'){
    const base = 330;
    [[1,.5,4.2],[2.76,.28,2.6],[5.4,.16,1.6],[8.9,.09,1]].forEach(([m,a,dec]) => {
      const o = ctx.createOscillator(), g = gain(ctx);
      o.type='sine'; o.frequency.value = base*m; chain(o, g, out);
      g.gain.setValueAtTime(0.0001,0); g.gain.linearRampToValueAtTime(a,.006);
      g.gain.exponentialRampToValueAtTime(0.0001, Math.min(dur, dec));
      o.start(0); o.stop(dur);
    });
  }
  else { /* whoosh */
    const s = src(ctx, N), bp = filt(ctx,'bandpass',300,1.1), g = gain(ctx);
    chain(s, bp, g, out);
    bp.frequency.setValueAtTime(260,0);
    bp.frequency.exponentialRampToValueAtTime(6200,dur*.62);
    bp.frequency.exponentialRampToValueAtTime(420,dur);
    env(g, [[0,0],[dur*.55,.8],[dur,0]]);
    s.start(0);
  }
  return ctx.startRendering();
}
