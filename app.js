import { icon, hydrate, setIcon } from './icons.js';
import { t, setLang, getLang, applyI18n, LANGS } from './i18n.js';
import { AudioEngine } from './audio.js';
import { renderSynth, SYNTHS, synthLabel } from './synth.js';
import { cloudConfigured, watchAuth, cloudSignIn, cloudPassword, cloudAuth,
         localGateExists, localSetPasscode, localVerify, localSession, localSessionActive,
         LocalStore, CloudStore } from './store.js';

/* ═════════ helpers ═════════ */
const $  = (s,r=document) => r.querySelector(s);
const $$ = (s,r=document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2,7);
const clamp = (v,a,b) => Math.min(b, Math.max(a,v));
const fmt = s => { if(!isFinite(s) || s < 0) s = 0;
  return `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}.${Math.floor((s*10)%10)}`; };
const clock = ms => { const s = Math.floor(ms/1000);
  return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`; };

const engine = new AudioEngine();
const DEFAULTS = { lang:'en', masterDb:0, muted:false, panicFade:2, spaceGo:true, confirmDelete:true,
                   motion:true, autoLockMin:0, output:'default', views:[] };
const S = {
  store:null, settings:{ ...DEFAULTS }, shows:[], show:null, standby:0,
  selected:new Set(), view:{ q:'', type:'all', flag:'any', sort:'order', dir:1 }, activeView:'all',
  rev:0, dirty:false, saveTimer:null, unsubShows:null, unsubShow:null,
  timers:new Set(), loading:new Map(), loadState:new Map(), lastInst:new Map(),
  undo:null, clockStart:0, preloadToken:0, lastActivity:Date.now(), wake:null, wave:null, seeding:false
};

/* ═════════ toast / dialog ═════════ */
let toastTimer = null, toastActionFn = null;
function toast(msg, kind = 'info', opts = {}){
  const el = $('#toast');
  $('#toastMsg').textContent = msg;
  setIcon($('#toastIcon'), kind === 'ok' ? 'check' : kind === 'error' ? 'alert' : kind === 'warn' ? 'alert' : 'info', 17);
  el.className = 'toast show ' + kind;
  const btn = $('#toastAction');
  toastActionFn = opts.onAction || null;
  btn.classList.toggle('hidden', !opts.onAction);
  if(opts.onAction) btn.textContent = opts.actionLabel || t('undo');
  const ms = opts.ms || (opts.onAction ? 8000 : 2800);
  const bar = $('#toastBar');
  bar.style.transition = 'none'; bar.style.transform = 'scaleX(1)';
  requestAnimationFrame(() => { bar.style.transition = `transform ${ms}ms linear`; bar.style.transform = 'scaleX(0)'; });
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.classList.remove('show'); S.undo = null; }, ms);
}
$('#toastClose').onclick = () => { clearTimeout(toastTimer); $('#toast').classList.remove('show'); };
$('#toastAction').onclick = () => { const fn = toastActionFn; $('#toast').classList.remove('show'); clearTimeout(toastTimer); fn && fn(); };

function dialog({ title, body = '', input = null, okText, danger = false, iconName = 'alert' }){
  return new Promise(res => {
    const wrap = $('#dialog'), inp = $('#dlgInput'), ok = $('#dlgOk'), cancel = $('#dlgCancel');
    $('#dlgTitle').textContent = title; $('#dlgBody').textContent = body;
    setIcon($('#dlgIcon'), iconName, 19);
    inp.classList.toggle('hidden', input === null);
    if(input !== null) inp.value = input;
    ok.textContent = okText || t('ok'); ok.className = 'btn ' + (danger ? 'danger' : 'primary');
    cancel.textContent = t('cancel');
    wrap.classList.remove('hidden');
    setTimeout(() => (input !== null ? inp : ok).focus(), 30);
    const close = v => { wrap.classList.add('hidden'); ok.onclick = cancel.onclick = wrap.onkeydown = null; res(v); };
    ok.onclick = () => close(input === null ? true : (inp.value.trim() || null));
    cancel.onclick = () => close(input === null ? false : null);
    wrap.onkeydown = e => {
      if(e.key === 'Enter'){ e.preventDefault(); ok.click(); }
      if(e.key === 'Escape'){ e.preventDefault(); e.stopPropagation(); cancel.click(); }
    };
  });
}
const askConfirm = (title, body, iconName='trash') => dialog({ title, body, okText:t('confirm'), danger:true, iconName });
const askText = (title, value='') => dialog({ title, input:value, iconName:'edit' });

/* ═════════ lock screen ═════════ */
function fillLangs(){
  const opts = LANGS.map(l => `<option value="${l.id">${esc(l.label)}</option>`).join('')
    .replace('value="'+getLang()+'"', 'value="'+getLang()+'" selected');
  ['#lockLang','#setLang'].forEach(sel => { const el = $(sel); if(el){ el.innerHTML = opts; el.value = getLang(); } });
}
function buildEq(){
  const eq = $('.eq'); if(!eq) return;
  eq.innerHTML = Array.from({ length:26 }, (_,i) =>
    `<i style="animation-delay:${(i*0.09).toFixed(2)}s;animation-duration:${(1.1 + (i%5)*0.22).toFixed(2)}s"></i>`).join('');
}
function setTab(which){
  const cloud = which === 'cloud';
  $('#tabCloud').classList.toggle('on', cloud);
  $('#tabLocal').classList.toggle('on', !cloud);
  $('#cloudForm').classList.toggle('hidden', !cloud);
  $('#localForm').classList.toggle('hidden', cloud);
  if(!cloud) refreshLocalGate();
}
function refreshLocalGate(){
  const exists = localGateExists();
  $('#lNewWrap').classList.toggle('hidden', exists);
  $('#lPass2').required = !exists;
  $('#lSubmitLabel').textContent = exists ? t('lock.enter') : t('lock.create');
  $('#lHint').textContent = exists ? t('lock.existingHint') : t('lock.newHint');
  $('#lPass').value = ''; $('#lPass2').value = ''; $('#lErr').textContent = '';
}
function wireLock(){
  const ok = cloudConfigured();
  $('#tabCloud').disabled = !ok;
  $('#cErr').textContent = ok ? '' : t('lock.noCloud');
  $('#tabCloud').onclick = () => setTab('cloud');
  $('#tabLocal').onclick = () => setTab('local');
  setTab(ok ? 'cloud' : 'local');

  $('#lockLang').onchange = e => { setLang(e.target.value); applyI18n(); fillLangs(); refreshLocalGate(); renderAll(); };

  $('#cloudForm').onsubmit = async e => {
    e.preventDefault();
    const err = $('#cErr'); err.textContent = '';
    if(!ok){ err.textContent = t('lock.noCloud'); return; }
    const btn = $('#cSubmit'); btn.disabled = true;
    try{
      const cred = await cloudSignIn($('#cEmail').value.trim(), $('#cPass').value, $('#cRemember').checked);
      await engine.unlock();
      await startSession(new CloudStore(cred.user));
    }catch(ex){
      const c = ex.code || '';
      err.textContent = /network/.test(c) ? t('lock.err.net') : /too-many/.test(c) ? t('lock.err.many') : t('lock.err.auth');
    }finally{ btn.disabled = false; }
  };

  $('#localForm').onsubmit = async e => {
    e.preventDefault();
    const err = $('#lErr'); err.textContent = '';
    const p = $('#lPass').value;
    if(p.length < 4){ err.textContent = t('lock.err.passShort'); return; }
    if(localGateExists()){
      if(!await localVerify(p)){ err.textContent = t('lock.err.pass'); return; }
    }else{
      if(p !== $('#lPass2').value){ err.textContent = t('lock.err.pass2'); return; }
      await localSetPasscode(p);
    }
    localSession(true, $('#lKeep').checked);
    await engine.unlock();
    await startSession(new LocalStore());
  };
}

/* ═════════ session ═════════ */
async function startSession(store){
  if(S.store) return;
  S.store = store;
  $('#lock').classList.add('hidden');
  $('#desk').classList.remove('hidden');
  await store.init();
  S.settings = { ...DEFAULTS, ...(await store.settings()) };
  if(!Array.isArray(S.settings.views)) S.settings.views = [];
  applySettings();
  $('#syncPill').classList.toggle('local', store.mode === 'local');
  $('#syncText').textContent = store.mode === 'cloud' ? t('rail.sync.cloud') : t('rail.sync.local');
  $('#accountInfo').textContent = store.mode === 'cloud' ? (store.user.email || '') : t('lock.local');
  S.unsubShows = store.watchShows(async list => {
    S.shows = list;
    if(!list.length){
      if(S.seeding) return;
      S.seeding = true;
      try{ await seed(); } finally { S.seeding = false; }
      return;
    }
    renderShows();
    const remembered = localStorage.getItem('dc.show');
    const id = S.show && list.some(s => s.id === S.show.id) ? S.show.id
             : list.some(s => s.id === remembered) ? remembered : list[0].id;
    if(!S.show || S.show.id !== id) openShow(id);
  });
  requestAnimationFrame(loop);
}
async function endSession(){
  clearTimers(); engine.stopAll(0);
  S.unsubShows && S.unsubShows(); S.unsubShow && S.unsubShow();
  const store = S.store;
  S.store = null; S.show = null; S.shows = []; S.selected.clear(); S.undo = null; S.clockStart = 0;
  S.unsubShows = S.unsubShow = null;
  if(store) await store.signOut();
  $('#desk').classList.add('hidden');
  $('#lock').classList.remove('hidden');
  $('#cPass').value = '';
  refreshLocalGate(); applyI18n(); fillLangs();
}
function applySettings(){
  setLang(S.settings.lang); applyI18n(); fillLangs();
  document.body.classList.toggle('no-motion', !S.settings.motion);
  engine.setMasterDb(S.settings.masterDb); engine.setMuted(S.settings.muted);
  $('#masterFader').value = S.settings.masterDb;
  $('#masterVal').textContent = S.settings.masterDb;
  renderMute();
  if(S.settings.output !== 'default') engine.setOutput(S.settings.output).catch(()=>{});
}
let setTimer;
function saveSettings(){
  clearTimeout(setTimer);
  setTimer = setTimeout(() => S.store && S.store.saveSettings(S.settings).catch(() => toast(t('toast.saveFail'),'error')), 350);
}
function renderMute(){
  setIcon($('#muteIcon'), S.settings.muted ? 'mute' : 'volume', 17);
  $('#muteLabel').textContent = S.settings.muted ? t('rail.unmute') : t('rail.mute');
  $('#muteBtn').classList.toggle('on', S.settings.muted);
}

/* ═════════ seed content ═════════ */
function mk(type, extra){
  const c = { id:uid(), type, name:'', hotkey:'', notes:'', cont:'manual', delay:0 };
  if(type === 'audio') Object.assign(c, { file:null, duration:0, volume:0, pan:0, fadeIn:0, fadeOut:.5,
    loop:false, rate:1, trimIn:0, trimOut:0, stopOthers:false });
  if(type === 'fade')  Object.assign(c, { target:'all', fadeTo:-60, fadeTime:2, stopAtEnd:true });
  if(type === 'stop')  Object.assign(c, { target:'all', fadeTime:1 });
  if(type === 'wait')  Object.assign(c, { wait:2 });
  return Object.assign(c, extra);
}
const snd = (id, sec) => ({ kind:'synth', synth:id, seconds:sec, name:synthLabel(id, getLang()) });
function seed(){
  const A = (synthId, sec, name, o={}) => mk('audio', { name, file:snd(synthId, sec), duration:sec, ...o });
  const c = [
    mk('memo', { name:t('seed.c1') }),
    A('rain', 9, t('seed.c2'), { volume:-18, fadeIn:4, fadeOut:3, loop:true }),
    A('thunder', 5, t('seed.c3'), { volume:-11, hotkey:'T', cont:'continue' }),
    mk('wait', { name:t('seed.c4'), wait:1.8, cont:'follow' }),
    A('thunder', 5, t('seed.c5'), { volume:-2, rate:.85 }),
    A('knock', 2, t('seed.c6'), { volume:-4, hotkey:'D' }),
    A('wind', 7, t('seed.c7'), { volume:-13, fadeIn:1.5, fadeOut:3 }),
    mk('fade', { name:t('seed.c8'), fadeTo:-27, fadeTime:4, stopAtEnd:false }),
    A('phone', 3.4, t('seed.c9'), { volume:-7, hotkey:'P' }),
    mk('stop', { name:t('seed.c10'), fadeTime:1.2 }),
    A('ticks', 8, t('seed.c11'), { volume:-22, loop:true }),
    A('heart', 4.4, t('seed.c12'), { volume:-11, loop:true, rate:1.05 }),
    A('whoosh', 2.6, t('seed.c13'), { volume:-9 }),
    mk('fade', { name:t('seed.c14'), target:'all', fadeTo:-60, fadeTime:5, stopAtEnd:true }),
    A('applause', 8, t('seed.c15'), { volume:-5, hotkey:'A', fadeIn:.4, fadeOut:2 }),
    mk('memo', { name:t('seed.c16') })
  ];
  c[7].target = c[1].id;
  c[9].target = c[8].id;
  const d = [
    A('chime', 5, t('seed.d1'), { volume:-8, fadeIn:.1 }),
    A('applause', 8, t('seed.d2'), { volume:-6, loop:true, fadeIn:1, fadeOut:4 }),
    mk('fade', { name:t('seed.d3'), target:'all', fadeTo:-60, fadeTime:6, stopAtEnd:true }),
    mk('memo', { name:t('seed.d4') })
  ];
  return Promise.all([ S.store.create(t('seed.show1'), c), S.store.create(t('seed.show2'), d) ]);
}

/* ═════════ shows ═════════ */
function renderShows(){
  $('#showSelect').innerHTML = S.shows.map(s => `<option value="${s.id}">${esc(s.name)}</option>`).join('');
  if(S.show) $('#showSelect').value = S.show.id;
}
function openShow(id){
  S.unsubShow && S.unsubShow();
  clearTimers(); engine.stopAll(0);
  S.show = null; S.selected.clear(); S.standby = 0; S.rev = 0; S.dirty = false; S.clockStart = 0;
  S.loadState.clear(); S.lastInst.clear();
  localStorage.setItem('dc.show', id);
  $('#showSelect').value = id;
  S.unsubShow = S.store.watchShow(id, d => {
    if((d.rev || 0) < S.rev || S.dirty) return;
    const incoming = JSON.stringify({ n:d.name, c:d.cues || [] });
    const local = S.show && JSON.stringify({ n:S.show.name, c:S.show.cues });
    S.rev = d.rev || 0;
    if(incoming === local){ if(!S.show){ S.show = { id, name:d.name, cues:d.cues || [] }; renderAll(); } return; }
    S.show = { id, name:d.name || 'Show', cues:d.cues || [] };
    S.standby = clamp(S.standby, 0, S.show.cues.length);
    S.selected.forEach(sid => { if(!S.show.cues.some(c => c.id === sid)) S.selected.delete(sid); });
    renderShows(); renderAll(); preloadAll();
  });
}
function commit(now = false){
  if(!S.show || !S.store) return;
  S.dirty = true; S.rev++;
  clearTimeout(S.saveTimer);
  const write = async () => {
    try{ await S.store.put({ id:S.show.id, name:S.show.name, cues:S.show.cues, rev:S.rev }); S.dirty = false; }
    catch(e){ console.error(e); toast(t('toast.saveFail'),'error'); }
  };
  now ? write() : (S.saveTimer = setTimeout(write, 420));
}
$('#showSelect').onchange = e => openShow(e.target.value);
$('#newShow').onclick = async () => {
  const name = await askText(t('dlg.newShow'), t('dlg.defaultShow')); if(!name) return;
  const id = await S.store.create(name, []); openShow(id);
};
$('#renameShow').onclick = async () => {
  if(!S.show) return;
  const name = await askText(t('dlg.renameShow'), S.show.name); if(!name) return;
  S.show.name = name; commit(true); renderShows();
};
$('#deleteShow').onclick = async () => {
  if(!S.show) return;
  if(!await askConfirm(t('dlg.delShow'), t('dlg.delShowBody'))) return;
  const id = S.show.id;
  S.unsubShow && S.unsubShow(); S.unsubShow = null; S.show = null;
  await S.store.remove(id);
  localStorage.removeItem('dc.show');
};

/* ═════════ cue access ═════════ */
const cues = () => S.show ? S.show.cues : [];
const cur = () => cues()[S.standby] || null;
const idxOf = id => cues().findIndex(c => c.id === id);
const cueLen = c => c.type === 'audio'
  ? Math.max(0, ((c.trimOut > 0 ? c.trimOut : c.duration || 0) - (c.trimIn || 0)) / (c.rate || 1))
  : c.type === 'wait' ? (c.wait || 0) : c.type === 'memo' ? 0 : (c.fadeTime || 0);
const fileKey = f => !f ? '' : f.kind === 'synth' ? `synth:${f.synth}:${f.seconds}` : f.kind === 'url' ? 'url:'+f.url : f.kind === 'local' ? f.key : f.path;
const canReorder = () => S.view.sort === 'order' && !S.view.q && S.view.type === 'all' && S.view.flag === 'any';

function visibleIdx(){
  let idx = cues().map((_,i) => i);
  const { q, type, flag, sort, dir } = S.view;
  if(type !== 'all') idx = idx.filter(i => cues()[i].type === type);
  if(flag === 'hotkey') idx = idx.filter(i => !!cues()[i].hotkey);
  if(flag === 'loop') idx = idx.filter(i => !!cues()[i].loop);
  if(flag === 'error') idx = idx.filter(i => S.loadState.get(cues()[i].id) === 'error');
  if(q){
    const s = q.toLowerCase();
    idx = idx.filter(i => { const c = cues()[i];
      return `${c.name} ${c.notes || ''} ${c.file?.name || ''} ${c.hotkey || ''} ${i+1}`.toLowerCase().includes(s); });
  }
  if(sort !== 'order'){
    const key = i => sort === 'name' ? (cues()[i].name || '').toLowerCase()
              : sort === 'type' ? cues()[i].type : cueLen(cues()[i]);
    idx.sort((a,b) => { const A = key(a), B = key(b); return (A < B ? -1 : A > B ? 1 : a-b) * dir; });
  }
  return idx;
}

/* ═════════ mutations ═════════ */
function addCues(list){
  if(!S.show) return;
  const at = cues().length ? Math.min(S.standby + 1, cues().length) : 0;
  S.show.cues.splice(at, 0, ...list);
  S.standby = at; commit(true); renderAll();
  toast(t('toast.added'),'ok',{ ms:1500 });
}
function removeAt(indices){
  const removed = indices.slice().sort((a,b) => a-b).map(i => ({ i, c:cues()[i] }));
  removed.slice().reverse().forEach(({ i, c }) => { engine.stopCue(c.id, 0); S.show.cues.splice(i,1); });
  S.selected.clear();
  S.standby = clamp(S.standby, 0, cues().length);
  commit(true); renderAll();
  S.undo = () => {
    removed.forEach(({ i, c }) => S.show.cues.splice(Math.min(i, cues().length), 0, c));
    S.standby = removed[0].i; commit(true); renderAll(); preloadAll();
    toast(t('toast.restored'),'ok',{ ms:1800 });
  };
  toast(t('toast.deleted',{ n:removed.length }),'warn',{ onAction:() => { const f = S.undo; S.undo = null; f && f(); }, actionLabel:t('undo') });
}
async function deleteStandby(){
  const c = cur(); if(!c) return;
  if(S.settings.confirmDelete && !await askConfirm(t('dlg.delCue'), t('dlg.delCueBody'))) return;
  removeAt([S.standby]);
}
$('#addCue').onclick = () => {
  const type = $('#addType').value;
  const extra = { name:t('type.'+type) };
  if(type === 'audio') extra.file = null;
  addCues([mk(type, extra)]);
};
$('#addAudio').onclick = () => $('#fileInput').click();
$('#fileInput').onchange = e => { importFiles(e.target.files); e.target.value = ''; };

async function importFiles(files, target = null){
  const arr = [...files].filter(f => (f.type || '').startsWith('audio/') || /\.(mp3|wav|m4a|aac|ogg|oga|opus|flac|aif|aiff)$/i.test(f.name));
  if(!arr.length || !S.show) return;
  await engine.unlock();
  for(const f of arr){
    try{
      toast(t('toast.uploading',{ name:f.name }),'info',{ ms:120000 });
      const desc = await S.store.importAudio(f, p => toast(t('toast.uploading',{ name:f.name }) + '  ' + p + '%','info',{ ms:120000 }));
      let duration = 0;
      try{ const b = await getBuffer(desc); duration = b.duration; }catch{}
      if(target){
        target.file = desc; target.duration = duration; target.trimOut = 0;
        if(!target.name) target.name = f.name.replace(/\.[^.]+$/,'');
        commit(true); renderAll();
      }else{
        addCues([mk('audio', { name:f.name.replace(/\.[^.]+$/,''), file:desc, duration })]);
      }
      toast(t('toast.uploaded',{ name:f.name }),'ok');
    }catch(e){ console.error(e); toast(t('toast.uploadFail'),'error'); }
    target = null;
  }
}

/* ═════════ buffers ═════════ */
async function getBuffer(file){
  const key = fileKey(file);
  if(!key) throw new Error('no file');
  if(engine.buffers.has(key)) return engine.buffers.get(key);
  if(S.loading.has(key)) return S.loading.get(key);
  const p = (async () => {
    let buf;
    if(file.kind === 'synth') buf = await renderSynth(file.synth, file.seconds);
    else buf = await engine.decode(await S.store.loadBytes(file));
    engine.buffers.set(key, buf);
    engine.peaksFor(key, buf);
    return buf;
  })();
  S.loading.set(key, p);
  try{ return await p; } finally { S.loading.delete(key); }
}
async function ensure(cue){
  if(!cue.file) throw new Error('no file');
  S.loadState.set(cue.id, 'loading'); paintStates();
  try{
    const b = await getBuffer(cue.file);
    if(!cue.duration || Math.abs(cue.duration - b.duration) > .05){ cue.duration = b.duration; commit(); }
    S.loadState.set(cue.id, 'ready'); paintStates();
    return b;
  }catch(e){ S.loadState.set(cue.id, 'error'); paintStates(); throw e; }
}
async function preloadAll(){
  if(!S.show) return;
  const token = ++S.preloadToken;
  const list = cues().filter(c => c.type === 'audio' && c.file);
  let ok = 0, done = 0;
  const paint = () => $('#preloadPill').textContent = `${done}/${list.length}`;
  paint();
  const queue = [...list];
  await Promise.all(Array.from({ length:3 }, async () => {
    while(queue.length){
      if(token !== S.preloadToken || !S.show) return;
      const c = queue.shift();
      try{ await ensure(c); ok++; }catch(e){ console.warn('preload', c.name, e); }
      done++; paint();
    }
  }));
  if(token !== S.preloadToken || !S.show) return;
  renderAll();
  if(list.length) toast(t('toast.preloadDone',{ ok, total:list.length }), ok === list.length ? 'ok' : 'warn');
}
$('#preloadBtn').onclick = async () => { await engine.unlock(); toast(t('toast.preloading')); preloadAll(); };

/* ═════════ playback ═════════ */
function clearTimers(){ S.timers.forEach(clearTimeout); S.timers.clear(); }
function later(fn, ms){ const id = setTimeout(() => { S.timers.delete(id); fn(); }, Math.max(0, ms)); S.timers.add(id); return id; }

engine.onEnded = i => {
  renderRack(); paintStates();
  const idx = idxOf(i.cueId); if(idx < 0) return;
  const c = cues()[idx];
  if(i.manual || c.cont !== 'follow' || S.lastInst.get(c.id) !== i.id) return;
  if(cues()[idx+1]) runChain(idx+1);
};
async function runCue(cue, offset = 0){
  if(!cue) return;
  await engine.unlock(); keepAwake();
  if(cue.type === 'audio'){
    if(!cue.file){ toast(t('toast.noFile'),'warn'); return; }
    try{ await ensure(cue); }catch(e){ console.error(e); toast(t('toast.loadFail'),'error'); return; }
    if(cue.stopOthers) engine.stopAll(cue.fadeOut || 0);
    const i = engine.play(cue, fileKey(cue.file), offset);
    if(i) S.lastInst.set(cue.id, i.id);
  }
  else if(cue.type === 'fade') engine.fade(cue.target || 'all', cue.fadeTo ?? -60, cue.fadeTime || 0, !!cue.stopAtEnd);
  else if(cue.type === 'stop') engine.stopCue(cue.target || 'all', cue.fadeTime || 0);
  else if(cue.type === 'wait' && cue.cont === 'follow')
    later(() => { const i = idxOf(cue.id); if(i >= 0 && cues()[i+1]) runChain(i+1); }, (cue.wait || 0)*1000);
  renderRack(); paintStates();
}
function runChain(i){
  if(!cues()[i]){ toast(t('toast.end'),'warn',{ ms:1400 }); return; }
  if(!S.clockStart) S.clockStart = Date.now();
  const c = cues()[i];
  S.standby = Math.min(i+1, cues().length);
  renderRows(); renderStandby(); renderInspector();
  runCue(c);
  if(c.cont === 'continue' && cues()[i+1]) later(() => runChain(i+1), (c.delay || 0)*1000);
}
function go(){
  clearTimers();
  const b = $('#goBtn'); b.classList.remove('fire'); void b.offsetWidth; b.classList.add('fire');
  runChain(S.standby);
}
function panic(){ clearTimers(); engine.stopAll(S.settings.panicFade); renderRack(); paintStates(); toast(t('toast.panic'),'warn'); }
function setStandby(i){
  if(!cues().length) return;
  S.standby = clamp(i, 0, cues().length - 1);
  renderRows(); renderStandby(); renderInspector();
  $(`#cueBody tr[data-i="${S.standby}"]`)?.scrollIntoView({ block:'nearest' });
}
function stepStandby(d){
  const vis = visibleIdx(); if(!vis.length) return;
  const at = vis.indexOf(S.standby);
  const next = at < 0 ? vis[0] : vis[clamp(at + d, 0, vis.length - 1)];
  setStandby(next);
}
async function keepAwake(){
  try{ if('wakeLock' in navigator && !S.wake){
    S.wake = await navigator.wakeLock.request('screen');
    S.wake.addEventListener('release', () => S.wake = null);
  } }catch{}
}
$('#goBtn').onclick = go;
$('#panicBtn').onclick = panic;
$('#stopAllBtn').onclick = () => { clearTimers(); engine.stopAll(0); renderRack(); paintStates(); };
$('#pauseAllBtn').onclick = () => { engine.anyPaused() ? engine.unpauseAll() : engine.pauseAll(); renderRack(); paintStates(); };
$('#prevBtn').onclick = () => stepStandby(-1);
$('#nextBtn').onclick = () => stepStandby(1);
$('#topBtn').onclick = () => { clearTimers(); S.clockStart = 0; setStandby(0); };

/* ═════════ rendering: sheet ═════════ */
function renderAll(){ renderShows(); renderViews(); renderRows(); renderStandby(); renderInspector(); renderRack(); applyI18n(); }

function renderViews(){
  const built = [
    { id:'all', label:t('view.all'), v:{ q:'', type:'all', flag:'any', sort:'order', dir:1 } },
    { id:'audio', label:t('view.audio'), v:{ q:'', type:'audio', flag:'any', sort:'order', dir:1 } },
    { id:'hotkeys', label:t('view.hotkeys'), v:{ q:'', type:'all', flag:'hotkey', sort:'order', dir:1 } },
    { id:'loops', label:t('view.loops'), v:{ q:'', type:'all', flag:'loop', sort:'order', dir:1 } }
  ];
  const custom = S.settings.views.map(v => ({ ...v, custom:true }));
  $('#views').innerHTML = [...built, ...custom].map(v =>
    `<button class="chip ${S.activeView === v.id ? 'on' : ''}" data-view="${esc(v.id)}">${esc(v.label)}${
      v.custom ? `<span class="x" data-delview="${esc(v.id)}">${icon('close',12)}</span>` : ''}</button>`).join('');
  const filtered = S.view.q || S.view.type !== 'all' || S.view.flag !== 'any' || S.view.sort !== 'order';
  $('#clearFilters').classList.toggle('hidden', !filtered);
  $('#orderHint').classList.toggle('hidden', canReorder());
  $('#search').value = S.view.q; $('#typeFilter').value = S.view.type;
  $('#flagFilter').value = S.view.flag; $('#sortBy').value = S.view.sort;
  setIcon($('#sortDir').firstElementChild, S.view.dir > 0 ? 'arrowDown' : 'arrowUp', 16);
}
function applyView(v, id){
  S.view = { ...v }; S.activeView = id; S.selected.clear();
  renderViews(); renderRows(); renderStandby();
}
$('#views').onclick = async e => {
  const del = e.target.closest('[data-delview]');
  if(del){
    e.stopPropagation();
    const id = del.dataset.delview;
    if(!await askConfirm(t('dlg.delView'), t('dlg.delViewBody'))) return;
    S.settings.views = S.settings.views.filter(v => v.id !== id);
    saveSettings(); if(S.activeView === id) S.activeView = ''; renderViews();
    toast(t('toast.viewDeleted'),'ok',{ ms:1600 });
    return;
  }
  const b = e.target.closest('[data-view]'); if(!b) return;
  const id = b.dataset.view;
  const built = {
    all:{ q:'', type:'all', flag:'any', sort:'order', dir:1 },
    audio:{ q:'', type:'audio', flag:'any', sort:'order', dir:1 },
    hotkeys:{ q:'', type:'all', flag:'hotkey', sort:'order', dir:1 },
    loops:{ q:'', type:'all', flag:'loop', sort:'order', dir:1 }
  };
  const found = built[id] || S.settings.views.find(v => v.id === id)?.v;
  if(found) applyView(found, id);
};
$('#saveView').onclick = async () => {
  const name = await askText(t('dlg.saveView'), t('dlg.viewName')); if(!name) return;
  const id = 'v' + uid();
  S.settings.views.push({ id, label:name, v:{ ...S.view } });
  S.activeView = id; saveSettings(); renderViews(); toast(t('toast.viewSaved'),'ok',{ ms:1600 });
};
$('#clearFilters').onclick = () => applyView({ q:'', type:'all', flag:'any', sort:'order', dir:1 }, 'all');
let searchTimer;
$('#search').oninput = e => { const q = e.target.value; clearTimeout(searchTimer);
  searchTimer = setTimeout(() => { S.view.q = q; S.activeView = ''; renderViews(); renderRows(); }, 130); };
$('#typeFilter').onchange = e => { S.view.type = e.target.value; S.activeView = ''; renderViews(); renderRows(); };
$('#flagFilter').onchange = e => { S.view.flag = e.target.value; S.activeView = ''; renderViews(); renderRows(); };
$('#sortBy').onchange = e => { S.view.sort = e.target.value; S.activeView = ''; renderViews(); renderRows(); };
$('#sortDir').onclick = () => { S.view.dir *= -1; renderViews(); renderRows(); };

function stateOf(c){
  if(c.type !== 'audio' || !c.file) return 'idle';
  return S.loadState.get(c.id) || (engine.buffers.has(fileKey(c.file)) ? 'ready' : 'idle');
}
function renderRows(){
  const body = $('#cueBody');
  if(!S.show){ body.innerHTML = ''; return; }
  const vis = visibleIdx(), playing = engine.cueIds(), reorder = canReorder();
  $('#emptyState').classList.toggle('hidden', vis.length > 0);
  $('#emptyText').textContent = cues().length ? t('sheet.noMatch') : t('sheet.empty');
  $('#rowCount').textContent = t('sheet.rows',{ shown:vis.length, total:cues().length });
  $('#selectAll').checked = vis.length > 0 && vis.every(i => S.selected.has(cues()[i].id));
  $('#bulkBar').classList.toggle('hidden', S.selected.size === 0);
  $('#bulkCount').textContent = t('bulk.count',{ n:S.selected.size });

  body.innerHTML = vis.map(i => {
    const c = cues()[i], st = stateOf(c);
    const cls = ['cue-row', i === S.standby ? 'standby' : '', playing.has(c.id) ? 'playing' : '',
                 S.selected.has(c.id) ? 'sel' : '', c.type === 'memo' ? 'memo' : ''].join(' ');
    const sub = c.type === 'audio' ? (c.file ? c.file.name : t('toast.noFile')) : (c.notes || '');
    const cont = c.cont || 'manual';
    return `<tr class="${cls}" data-i="${i}" data-id="${c.id}" ${reorder ? 'draggable="true"' : ''}>
      <td class="c-sel"><input type="checkbox" data-sel="${c.id}" ${S.selected.has(c.id) ? 'checked' : ''} aria-label="select"></td>
      <td class="c-num"><div class="numwrap">${reorder ? `<span class="grip">${icon('grip',14)}</span>` : ''}<b>${i+1}</b></div></td>
      <td class="c-state"><span class="sdot ${st}" title="${esc(t('cue.'+st))}"></span></td>
      <td class="c-key">${c.hotkey ? `<kbd>${esc(c.hotkey.toUpperCase())}</kbd>` : ''}</td>
      <td class="c-type"><span class="tag ${c.type}">${icon(c.type === 'audio' ? 'wave' : c.type === 'fade' ? 'fade' : c.type === 'stop' ? 'stop' : c.type === 'wait' ? 'clock' : 'memo',12)}${t('type.'+c.type)}</span></td>
      <td class="c-name"><span class="name-main">${esc(c.name || t('cue.untitled'))}${c.loop ? ' ·' + t('insp.loop') : ''}</span>${sub ? `<span class="name-sub">${esc(sub)}</span>` : ''}</td>
      <td class="c-len"><span>${c.type === 'memo' ? '—' : fmt(cueLen(c))}</span></td>
      <td class="c-cont"><span class="${cont}">${t('cont.'+cont+'.s')}</span></td>
      <td class="c-act"><button class="rowbtn" data-act="play" title="${esc(t('cue.preview'))}">${icon('play',13)}</button></td>
    </tr>`;
  }).join('');
}
function paintStates(){
  const playing = engine.cueIds();
  $$('#cueBody tr').forEach(tr => {
    const c = cues()[+tr.dataset.i]; if(!c) return;
    tr.classList.toggle('playing', playing.has(c.id));
    const d = tr.querySelector('.sdot');
    if(d){ const st = stateOf(c); d.className = 'sdot ' + st; d.title = t('cue.'+st); }
  });
}
function renderStandby(){
  const c = cur();
  $('#standbyNum').textContent = c ? String(S.standby+1).padStart(2,'0') : '—';
  $('#standbyName').textContent = c ? (c.name || t('cue.untitled')) : t('tx.end');
  $('#standbyMeta').textContent = c
    ? `${t('type.'+c.type)} · ${c.type === 'memo' ? '—' : fmt(cueLen(c))} · ${t('cont.'+(c.cont||'manual'))}`
    : '';
  const paused = engine.anyPaused();
  setIcon($('#pauseIcon'), paused ? 'play' : 'pause', 15);
  $('#pauseLabel').textContent = paused ? t('tx.resumeAll') : t('tx.pauseAll');
}

/* selection + row interaction */
let lastSelIdx = null;
$('#cueBody').addEventListener('click', e => {
  const tr = e.target.closest('tr'); if(!tr) return;
  const i = +tr.dataset.i, id = tr.dataset.id;
  if(e.target.matches('input[data-sel]')){
    if(e.shiftKey && lastSelIdx !== null){
      const vis = visibleIdx(), a = vis.indexOf(lastSelIdx), b = vis.indexOf(i);
      if(a >= 0 && b >= 0) vis.slice(Math.min(a,b), Math.max(a,b)+1).forEach(k => S.selected.add(cues()[k].id));
    }else e.target.checked ? S.selected.add(id) : S.selected.delete(id);
    lastSelIdx = i; renderRows(); return;
  }
  if(e.target.closest('[data-act="play"]')){ runCue(cues()[i]); return; }
  setStandby(i);
  if(window.matchMedia('(max-width:1180px)').matches) openInspector();
});
$('#selectAll').onchange = e => {
  const vis = visibleIdx();
  e.target.checked ? vis.forEach(i => S.selected.add(cues()[i].id)) : vis.forEach(i => S.selected.delete(cues()[i].id));
  renderRows();
};
$('#bulkClear').onclick = () => { S.selected.clear(); renderRows(); };
$('#bulkDelete').onclick = async () => {
  const idx = cues().map((c,i) => S.selected.has(c.id) ? i : -1).filter(i => i >= 0);
  if(!idx.length) return;
  if(S.settings.confirmDelete && !await askConfirm(t('dlg.delBulk',{ n:idx.length }), t('dlg.delBulkBody'))) return;
  removeAt(idx);
};
$('#bulkDuplicate').onclick = () => {
  const list = cues().filter(c => S.selected.has(c.id))
    .map(c => Object.assign(JSON.parse(JSON.stringify(c)), { id:uid(), name:(c.name||'') + t('cue.copySuffix') }));
  if(list.length){ S.selected.clear(); addCues(list); }
};

/* drag reorder */
let dragFrom = null;
$('#cueBody').addEventListener('dragstart', e => {
  const tr = e.target.closest('tr'); if(!tr || !canReorder()){ e.preventDefault(); return; }
  dragFrom = +tr.dataset.i; tr.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain','cue');
});
$('#cueBody').addEventListener('dragover', e => {
  if(dragFrom === null) return;
  e.preventDefault();
  $$('#cueBody tr').forEach(r => r.classList.remove('dragover'));
  e.target.closest('tr')?.classList.add('dragover');
});
$('#cueBody').addEventListener('drop', e => {
  if(dragFrom === null) return;
  e.preventDefault();
  const tr = e.target.closest('tr'); if(!tr) return;
  const to = +tr.dataset.i, [m] = S.show.cues.splice(dragFrom,1);
  S.show.cues.splice(to,0,m); S.standby = to; dragFrom = null;
  commit(true); renderAll();
});
$('#cueBody').addEventListener('dragend', () => {
  dragFrom = null;
  $$('#cueBody tr').forEach(r => r.classList.remove('dragover','dragging'));
});

/* file drop */
const tw = $('#tableWrap');
tw.addEventListener('dragover', e => { if([...e.dataTransfer.types].includes('Files')){ e.preventDefault(); tw.classList.add('dragging'); } });
tw.addEventListener('dragleave', e => { if(e.target === tw) tw.classList.remove('dragging'); });
tw.addEventListener('drop', e => {
  tw.classList.remove('dragging');
  if(e.dataTransfer.files?.length){ e.preventDefault(); importFiles(e.dataTransfer.files); }
});

/* ═════════ rendering: inspector ═════════ */
const rowF = (label, inner, hint) => `<label class="f"><span class="fl">${esc(label)}${hint ? `<em>${esc(hint)}</em>` : ''}</span>${inner}</label>`;
const numI = (k,v,step='.1',min='0',max='9999') => `<input type="number" data-k="${k}" value="${v ?? 0}" step="${step}" min="${min}" max="${max}">`;
const slide = (k,v,min,max,step,out) => `<div class="slide"><input type="range" data-k="${k}" value="${v ?? 0}" min="${min}" max="${max}" step="${step}"><output>${out}</output></div>`;
const dbOut = v => `${v} dB`;
const panOut = v => Number(v) === 0 ? 'C' : (v < 0 ? 'L'+Math.round(-v*100) : 'R'+Math.round(v*100));
const sec = (label, ic) => `<div class="insp-sec">${icon(ic,13)}${esc(label)}</div>`;

function renderInspector(){
  const box = $('#inspBody'), c = cur();
  S.wave = null;
  if(!c){ box.innerHTML = `<p class="dim tiny">${esc(t('insp.none'))}</p>`; return; }
  let h = `<div class="insp-hero"><span class="n">${String(S.standby+1).padStart(2,'0')}</span>
    <span class="t"><b>${esc(c.name || t('cue.untitled'))}</b><span class="tiny dim">${esc(t('type.'+c.type))}${c.file ? ' · ' + esc(c.file.name) : ''}</span></span>
    <span class="tag ${c.type}">${t('type.'+c.type)}</span></div>`;

  h += rowF(t('insp.type'), `<select data-k="type">${['audio','fade','stop','wait','memo'].map(x =>
    `<option value="${x}" ${x === c.type ? 'selected' : ''}>${esc(t('type.'+x))}</option>`).join('')}</select>`);
  h += rowF(t('insp.name'), `<input type="text" data-k="name" value="${esc(c.name)}">`);
  h += rowF(t('insp.hotkey'), `<input type="text" data-k="hotkey" maxlength="1" value="${esc(c.hotkey)}">`, t('insp.hotkeyHint'));

  if(c.type === 'audio'){
    h += sec(t('insp.source'),'wave');
    h += `<div class="filecard ${c.file ? '' : 'none'}"><span class="fi">${icon(c.file ? (c.file.kind === 'synth' ? 'synth' : 'wave') : 'alert',17)}</span>
      <span class="ft"><b>${esc(c.file ? c.file.name : t('toast.noFile'))}</b>
      <span class="tiny dim">${c.file ? (c.file.kind === 'synth' ? t('insp.synth') : c.file.kind === 'url' ? t('insp.url') : (c.file.size ? (c.file.size/1048576).toFixed(2)+' MB' : '')) : ''}${c.duration ? ' · ' + fmt(c.duration) : ''}</span></span></div>`;
    h += `<div class="wavebox"><canvas id="waveCanvas"></canvas>
      <div class="wave-meta"><span id="waveIn">0:00.0</span><span id="waveLen">${fmt(cueLen(c))}</span><span id="waveOut">${fmt(c.duration||0)}</span></div></div>`;
    h += `<p class="wave-hint">${esc(engine.buffers.has(fileKey(c.file)) ? t('insp.waveHint') : t('insp.noBuffer'))}</p>`;
    h += `<div class="btnrow"><button class="btn sm primary" id="iPreview">${icon('play',14)}${esc(t('cue.preview'))}</button>
      <button class="btn sm" id="iStop">${icon('stop',14)}${esc(t('cue.stop'))}</button>
      <button class="btn sm" id="iUpload">${icon('upload',14)}${esc(t('insp.upload'))}</button></div>`;
    h += rowF(t('insp.synth'), `<select data-k="synth"><option value="">${esc(t('insp.synthPick'))}</option>${
      SYNTHS.map(s => `<option value="${s.id}" ${c.file?.kind === 'synth' && c.file.synth === s.id ? 'selected' : ''}>${esc(synthLabel(s.id, getLang()))}</option>`).join('')}</select>`);
    h += rowF(t('insp.url'), `<input type="text" data-k="url" placeholder="${esc(t('insp.urlPh'))}" value="${esc(c.file?.kind === 'url' ? c.file.url : '')}">`);

    h += sec(t('insp.levels'),'meter');
    h += rowF(t('insp.volume'), slide('volume', c.volume, -60, 6, 1, dbOut(c.volume ?? 0)));
    h += rowF(t('insp.pan'), slide('pan', c.pan, -1, 1, .05, panOut(c.pan ?? 0)));
    h += `<div class="grid2">${rowF(t('insp.fadeIn'), numI('fadeIn', c.fadeIn, '.1', '0', '60'))}${rowF(t('insp.fadeOut'), numI('fadeOut', c.fadeOut, '.1', '0', '60'))}</div>`;

    h += sec(t('insp.trim'),'trim');
    h += `<div class="grid2">${rowF(t('insp.trimIn'), numI('trimIn', c.trimIn, '.1', '0'))}${rowF(t('insp.trimOut'), numI('trimOut', c.trimOut, '.1', '0'))}
      ${rowF(t('insp.rate'), numI('rate', c.rate, '.05', '.25', '4'))}
      <label class="check" style="align-self:end"><input type="checkbox" data-k="loop" ${c.loop ? 'checked' : ''}><span>${esc(t('insp.loop'))}</span></label></div>`;
    h += `<label class="check"><input type="checkbox" data-k="stopOthers" ${c.stopOthers ? 'checked' : ''}><span>${esc(t('insp.stopOthers'))}</span></label>`;
  }

  if(c.type === 'fade' || c.type === 'stop'){
    h += sec(t('insp.target'),'link');
    const opts = [`<option value="all" ${c.target === 'all' ? 'selected' : ''}>${esc(t('insp.targetAll'))}</option>`]
      .concat(cues().map((x,i) => x.type !== 'audio' ? '' :
        `<option value="${x.id}" ${c.target === x.id ? 'selected' : ''}>${i+1} · ${esc(x.name || t('cue.untitled'))}</option>`));
    h += rowF(t('insp.target'), `<select data-k="target">${opts.join('')}</select>`);
    if(c.type === 'fade'){
      h += rowF(t('insp.fadeTo'), slide('fadeTo', c.fadeTo, -60, 6, 1, dbOut(c.fadeTo ?? -60)));
      h += rowF(t('insp.fadeTime'), numI('fadeTime', c.fadeTime, '.1', '0', '120'));
      h += `<label class="check"><input type="checkbox" data-k="stopAtEnd" ${c.stopAtEnd ? 'checked' : ''}><span>${esc(t('insp.stopAtEnd'))}</span></label>`;
    }else h += rowF(t('insp.fadeTime'), numI('fadeTime', c.fadeTime, '.1', '0', '120'));
  }
  if(c.type === 'wait'){ h += sec(t('insp.wait'),'clock'); h += rowF(t('insp.wait'), numI('wait', c.wait, '.1', '0', '3600')); }

  h += sec(t('insp.cont'),'arrowDown');
  h += rowF(t('insp.cont'), `<select data-k="cont">${['manual','follow','continue'].map(x =>
    `<option value="${x}" ${c.cont === x ? 'selected' : ''}>${esc(t('cont.'+x))}</option>`).join('')}</select>`);
  if(c.cont === 'continue') h += rowF(t('insp.delay'), numI('delay', c.delay, '.1', '0', '3600'));
  h += rowF(t('insp.notes'), `<textarea data-k="notes" rows="3">${esc(c.notes)}</textarea>`);
  box.innerHTML = h;

  if(c.type === 'audio'){
    $('#iPreview').onclick = () => runCue(c);
    $('#iStop').onclick = () => { engine.stopCue(c.id, c.fadeOut || 0); renderRack(); paintStates(); };
    $('#iUpload').onclick = () => {
      const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'audio/*';
      inp.onchange = () => importFiles(inp.files, c); inp.click();
    };
    setupWave(c);
  }
}
const outText = (k,v) => k === 'volume' || k === 'fadeTo' ? dbOut(v) : k === 'pan' ? panOut(v) : String(v);

$('#inspBody').addEventListener('input', e => {
  const k = e.target.dataset.k, c = cur(); if(!k || !c) return;
  let v;
  if(e.target.type === 'checkbox') v = e.target.checked;
  else if(e.target.type === 'number' || e.target.type === 'range'){ v = parseFloat(e.target.value); if(!Number.isFinite(v)) v = 0; }
  else v = e.target.value;

  if(k === 'type'){
    const keep = { id:c.id, name:c.name, hotkey:c.hotkey, notes:c.notes, cont:c.cont, delay:c.delay };
    S.show.cues[S.standby] = Object.assign(mk(v), keep);
    commit(true); renderAll(); return;
  }
  if(k === 'hotkey'){
    v = v.slice(-1).toUpperCase();
    if(v && (/\s/.test(v) || !/^[\w\d]$/.test(v))){ toast(t('toast.hotkeyReserved'),'warn'); v = ''; }
    else if(v && cues().some(x => x.id !== c.id && (x.hotkey||'').toUpperCase() === v)){ toast(t('toast.hotkeyReserved'),'warn'); v = ''; }
    e.target.value = v;
  }
  if(k === 'synth'){
    if(!v) return;
    const d = SYNTHS.find(s => s.id === v);
    c.file = snd(v, d.sec); c.duration = d.sec; c.trimIn = 0; c.trimOut = 0;
    commit(true); ensure(c).then(() => renderInspector()).catch(() => {});
    renderRows(); return;
  }
  if(k === 'url'){
    const val = v.trim();
    c.file = val ? { kind:'url', url:val, name:val.split('/').pop() } : null;
    c.duration = 0; commit(); renderRows(); return;
  }
  c[k] = v;
  const out = e.target.parentElement.querySelector?.('output');
  if(out) out.textContent = outText(k, v);
  if(k === 'volume') engine.setCueDb(c.id, v);
  if(['trimIn','trimOut','rate','loop'].includes(k)) drawWave(true);
  commit(); renderRows(); renderStandby();
  if(k === 'cont' || k === 'name') { if(k === 'cont') renderInspector(); else $('.insp-hero .t b').textContent = c.name || t('cue.untitled'); }
});

/* ═════════ waveform ═════════ */
function setupWave(cue){
  const cv = $('#waveCanvas'); if(!cv) return;
  const key = fileKey(cue.file);
  const W = { cv, ctx:cv.getContext('2d'), cue, key, cache:null, drag:null, w:0, h:0 };
  S.wave = W;
  const resize = () => {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const r = cv.getBoundingClientRect();
    W.w = Math.max(80, r.width); W.h = 104;
    cv.width = Math.round(W.w*dpr); cv.height = Math.round(W.h*dpr);
    W.ctx.setTransform(dpr,0,0,dpr,0,0);
    W.cache = null; drawWave(true);
  };
  if(window.ResizeObserver){ const ro = new ResizeObserver(resize); ro.observe(cv); W.ro = ro; }
  resize();
  if(cue.file && !engine.buffers.has(key)) ensure(cue).then(() => { if(S.wave === W){ W.cache = null; drawWave(true); } }).catch(()=>{});

  const pos = e => { const r = cv.getBoundingClientRect(); return clamp((e.clientX - r.left)/r.width, 0, 1); };
  cv.addEventListener('pointerdown', e => {
    const buf = engine.buffers.get(key); if(!buf) return;
    const p = pos(e)*buf.duration;
    const inT = cue.trimIn || 0, outT = cue.trimOut > 0 ? cue.trimOut : buf.duration;
    const tol = buf.duration*0.025 + .05;
    W.drag = Math.abs(p-inT) <= tol ? 'in' : Math.abs(p-outT) <= tol ? 'out' : null;
    cv.setPointerCapture(e.pointerId);
    if(!W.drag){ W.audition = p; }
  });
  cv.addEventListener('pointermove', e => {
    if(!W.drag) return;
    const buf = engine.buffers.get(key); if(!buf) return;
    const p = pos(e)*buf.duration;
    if(W.drag === 'in') cue.trimIn = clamp(p, 0, (cue.trimOut > 0 ? cue.trimOut : buf.duration) - .05);
    else cue.trimOut = clamp(p, (cue.trimIn || 0) + .05, buf.duration);
    const iIn = $('input[data-k="trimIn"]'), iOut = $('input[data-k="trimOut"]');
    if(iIn) iIn.value = cue.trimIn.toFixed(2);
    if(iOut) iOut.value = cue.trimOut.toFixed(2);
    drawWave(true); renderRows();
  });
  const end = e => {
    if(W.drag){ W.drag = null; commit(true); renderStandby(); }
    else if(W.audition != null){
      const buf = engine.buffers.get(key);
      if(buf) runCue(cue, Math.max(0, W.audition - (cue.trimIn || 0)));
      W.audition = null;
    }
    try{ cv.releasePointerCapture(e.pointerId); }catch{}
  };
  cv.addEventListener('pointerup', end);
  cv.addEventListener('pointercancel', () => { W.drag = null; W.audition = null; });
}
function drawWave(rebuild = false){
  const W = S.wave; if(!W) return;
  const { ctx, w, h, cue, key } = W;
  const buf = engine.buffers.get(key);
  if(rebuild || !W.cache){
    const off = document.createElement('canvas');
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    off.width = Math.round(w*dpr); off.height = Math.round(h*dpr);
    const o = off.getContext('2d'); o.setTransform(dpr,0,0,dpr,0,0);
    o.fillStyle = '#080C13'; o.fillRect(0,0,w,h);
    o.strokeStyle = '#161E2C'; o.lineWidth = 1;
    for(let i=1;i<8;i++){ const x = Math.round(w*i/8)+.5; o.beginPath(); o.moveTo(x,0); o.lineTo(x,h); o.stroke(); }
    o.strokeStyle = '#1E2839'; o.beginPath(); o.moveTo(0,h/2+.5); o.lineTo(w,h/2+.5); o.stroke();
    if(buf){
      const pk = engine.peaksFor(key, buf), N = pk.length/2;
      const g = o.createLinearGradient(0,0,w,0);
      g.addColorStop(0,'#3ED8E8'); g.addColorStop(.55,'#3D8BFF'); g.addColorStop(1,'#F062D0');
      o.fillStyle = g;
      for(let x=0;x<w;x++){
        const i = Math.min(N-1, Math.floor(x/w*N));
        const mn = pk[i*2], mx = pk[i*2+1];
        const y1 = h/2 - mx*(h/2-6), y2 = h/2 - mn*(h/2-6);
        o.fillRect(x, y1, 1, Math.max(1.2, y2-y1));
      }
    }else{
      o.fillStyle = '#3A4763'; o.font = '11px ui-monospace,monospace'; o.textAlign = 'center';
      o.fillText(t('insp.noBuffer'), w/2, h/2+4);
    }
    W.cache = off;
  }
  ctx.clearRect(0,0,w,h);
  ctx.drawImage(W.cache, 0, 0, w, h);
  if(buf){
    const inX = (cue.trimIn || 0)/buf.duration*w;
    const outX = (cue.trimOut > 0 ? cue.trimOut : buf.duration)/buf.duration*w;
    ctx.fillStyle = '#05070BAA';
    ctx.fillRect(0,0,inX,h); ctx.fillRect(outX,0,w-outX,h);
    ctx.fillStyle = '#FFB02018'; ctx.fillRect(inX,0,outX-inX,h);
    ctx.fillStyle = '#FFB020';
    ctx.fillRect(inX-1,0,2,h); ctx.fillRect(outX-1,0,2,h);
    ctx.fillRect(inX-1,0,9,4); ctx.fillRect(outX-8,0,9,4);
    ctx.fillRect(inX-1,h-4,9,4); ctx.fillRect(outX-8,h-4,9,4);
    const inst = engine.list(cue.id)[0];
    if(inst){
      const info = engine.info(inst);
      const x = ((cue.trimIn || 0) + info.pos)/buf.duration*w;
      ctx.fillStyle = '#FFFFFF'; ctx.fillRect(x-1,0,2,h);
      ctx.fillStyle = '#19D26A'; ctx.fillRect(x-3,0,6,3);
    }
    const wi = $('#waveIn'), wl = $('#waveLen'), wo = $('#waveOut');
    if(wi) wi.textContent = fmt(cue.trimIn || 0);
    if(wl) wl.textContent = fmt(cueLen(cue));
    if(wo) wo.textContent = fmt(cue.trimOut > 0 ? cue.trimOut : buf.duration);
  }
}

/* ═════════ live rack ═════════ */
let rackSig = '';
function renderRack(){
  const list = [...engine.instances.values()];
  const sig = list.map(i => i.id + (i.paused ? 'p' : '')).join(',');
  if(sig === rackSig) { renderStandby(); return; }
  rackSig = sig;
  const box = $('#rack');
  if(!list.length){ box.innerHTML = `<div class="rack-empty">${esc(t('tx.rackEmpty'))}</div>`; renderStandby(); return; }
  box.innerHTML = list.map(i => {
    const n = idxOf(i.cueId);
    return `<div class="card ${i.paused ? 'paused' : ''}" data-id="${i.id}">
      <div class="card-top"><span class="cn">${n >= 0 ? String(n+1).padStart(2,'0') : '--'}</span>
        <span class="nm">${esc(i.name || t('cue.untitled'))}${i.loop ? ' ·' + t('insp.loop') : ''}</span>
        <span class="tm"></span></div>
      <div class="prog"><i></i></div><div class="lvl"><i></i></div>
      <div class="card-ctl"><input type="range" min="-60" max="6" step="1" value="${i.targetDb}" data-act="vol" aria-label="level">
        <button class="rowbtn" data-act="pause" title="${esc(i.paused ? t('tx.resumeAll') : t('tx.pauseAll'))}">${icon(i.paused ? 'play' : 'pause',12)}</button>
        <button class="rowbtn" data-act="stop" title="${esc(t('cue.stop'))}">${icon('stop',12)}</button></div></div>`;
  }).join('');
  renderStandby();
}
$('#rack').addEventListener('input', e => {
  if(e.target.dataset.act !== 'vol') return;
  engine.setDb(e.target.closest('.card').dataset.id, parseFloat(e.target.value));
});
$('#rack').addEventListener('click', e => {
  const b = e.target.closest('[data-act]'); if(!b || b.dataset.act === 'vol') return;
  const id = b.closest('.card').dataset.id, i = engine.instances.get(id);
  if(b.dataset.act === 'pause') engine.toggle(id);
  if(b.dataset.act === 'stop') engine.stop(id, i ? i.fadeOut : 0);
  rackSig = ''; renderRack(); paintStates();
});

/* ═════════ main loop ═════════ */
let meterSmooth = 0, lastFrame = 0;
function loop(ts){
  requestAnimationFrame(loop);
  if(!S.store) return;
  if(ts - lastFrame < 32) return;
  lastFrame = ts;

  for(const el of $$('#rack .card')){
    const i = engine.instances.get(el.dataset.id); if(!i) continue;
    const info = engine.info(i);
    el.querySelector('.tm').textContent = `${fmt(info.pos)} / ${fmt(info.region)}`;
    el.querySelector('.prog i').style.width = (info.region ? info.pos/info.region*100 : 0) + '%';
    el.querySelector('.lvl i').style.width = Math.min(100, engine.peakOf(i)*118) + '%';
  }
  const cv = $('#meterCanvas'), c2 = cv.getContext('2d');
  const lv = engine.level(); meterSmooth = Math.max(lv, meterSmooth*0.86);
  c2.clearRect(0,0,cv.width,cv.height);
  const g = c2.createLinearGradient(0,0,cv.width,0);
  g.addColorStop(0,'#19D26A'); g.addColorStop(.72,'#FFB020'); g.addColorStop(1,'#EF4136');
  c2.fillStyle = g; c2.fillRect(0,0,cv.width*Math.min(1,meterSmooth),cv.height);
  c2.fillStyle = '#0B0D12'; for(let x=6;x<cv.width;x+=8) c2.fillRect(x,0,1,cv.height);

  if(S.wave && engine.list(S.wave.cue.id).length) drawWave(false);
  $('#showClock').textContent = S.clockStart ? clock(Date.now()-S.clockStart) : '00:00';
}

/* ═════════ inspector drawer ═════════ */
function openInspector(){ $('#inspector').classList.add('open'); $('#inspScrim').classList.remove('hidden'); }
function closeInspector(){ $('#inspector').classList.remove('open'); $('#inspScrim').classList.add('hidden'); }
$('#inspectorToggle').onclick = openInspector;
$('#inspClose').onclick = closeInspector;
$('#inspScrim').onclick = closeInspector;

/* ═════════ settings ═════════ */
async function openSettings(){
  $('#setLang').value = getLang();
  $('#setPanic').value = S.settings.panicFade;
  $('#setSpace').checked = S.settings.spaceGo;
  $('#setConfirm').checked = S.settings.confirmDelete;
  $('#setMotion').checked = S.settings.motion;
  $('#setAutoLock').value = S.settings.autoLockMin;
  $('#settings').classList.remove('hidden');
  await fillDevices();
}
const closeSettings = () => $('#settings').classList.add('hidden');
$('#settingsBtn').onclick = openSettings;
$('#closeSettings').onclick = closeSettings;
$('#closeSettings2').onclick = closeSettings;
$('#settings').addEventListener('click', e => { if(e.target.id === 'settings') closeSettings(); });

async function fillDevices(){
  const sel = $('#setOutput'); let devs = [];
  try{ devs = (await navigator.mediaDevices.enumerateDevices()).filter(d => d.kind === 'audiooutput'); }catch{}
  sel.innerHTML = `<option value="default">${esc(t('set.default'))}</option>` +
    devs.filter(d => d.deviceId !== 'default')
        .map(d => `<option value="${esc(d.deviceId)}">${esc(d.label || d.deviceId.slice(0,10))}</option>`).join('');
  sel.value = S.settings.output;
}
$('#refreshDev').onclick = async () => {
  try{ const s = await navigator.mediaDevices.getUserMedia({ audio:true }); s.getTracks().forEach(x => x.stop()); }catch{}
  fillDevices();
};
$('#setOutput').onchange = async e => {
  try{ await engine.unlock(); await engine.setOutput(e.target.value); S.settings.output = e.target.value; saveSettings(); }
  catch(err){ console.error(err); toast(t('toast.deviceFail'),'error'); e.target.value = S.settings.output; }
};
$('#setLang').onchange = e => {
  S.settings.lang = e.target.value; setLang(e.target.value); saveSettings();
  applyI18n(); fillLangs(); renderAll(); fillDevices(); renderMute();
  $('#syncText').textContent = S.store?.mode === 'cloud' ? t('rail.sync.cloud') : t('rail.sync.local');
  $('#accountInfo').textContent = S.store?.mode === 'cloud' ? (S.store.user.email || '') : t('lock.local');
};
$('#setPanic').onchange = e => { S.settings.panicFade = clamp(parseFloat(e.target.value)||0,0,30); saveSettings(); };
$('#setSpace').onchange = e => { S.settings.spaceGo = e.target.checked; saveSettings(); };
$('#setConfirm').onchange = e => { S.settings.confirmDelete = e.target.checked; saveSettings(); };
$('#setMotion').onchange = e => { S.settings.motion = e.target.checked; document.body.classList.toggle('no-motion', !e.target.checked); saveSettings(); };
$('#setAutoLock').onchange = e => { S.settings.autoLockMin = Math.max(0, parseInt(e.target.value)||0); saveSettings(); };
$('#changePass').onclick = async () => {
  const p = $('#newPass').value;
  if(p.length < 4){ toast(t('toast.passShort'),'warn'); return; }
  try{
    if(S.store.mode === 'cloud'){ if(p.length < 6) throw new Error('short'); await cloudPassword(p); }
    else await localSetPasscode(p);
    $('#newPass').value = ''; toast(t('set.passOk'),'ok');
  }catch(e){ console.error(e); toast(t('toast.passFail'),'error'); }
};
$('#signOut').onclick = async () => { closeSettings(); await endSession(); toast(t('toast.locked'),'ok'); };
$('#lockBtn').onclick = async () => {
  if(!await askConfirm(t('dlg.lock'), t('dlg.lockBody'), 'lock')) return;
  await endSession(); toast(t('toast.locked'),'ok');
};
$('#masterFader').addEventListener('input', e => {
  const v = parseInt(e.target.value);
  engine.setMasterDb(v); $('#masterVal').textContent = v;
  S.settings.masterDb = v; saveSettings();
});
$('#muteBtn').onclick = () => {
  S.settings.muted = !S.settings.muted;
  engine.setMuted(S.settings.muted); renderMute(); saveSettings();
};

/* ═════════ export / import ═════════ */
$('#exportBtn').onclick = () => {
  if(!S.show) return;
  const blob = new Blob([JSON.stringify({ app:'drama-cue', version:2, name:S.show.name, cues:S.show.cues }, null, 2)], { type:'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = `${S.show.name}.dramacue.json`; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  toast(t('toast.exported'),'ok');
};
$('#importBtn').onclick = () => $('#importInput').click();
$('#importInput').onchange = async e => {
  const f = e.target.files[0]; e.target.value = ''; if(!f) return;
  try{
    const d = JSON.parse(await f.text());
    const list = (d.cues || []).map(c => Object.assign(mk(c.type || 'memo'), c, { id:uid() }));
    const map = new Map((d.cues || []).map((c,i) => [c.id, list[i].id]));
    list.forEach(c => { if(c.target && c.target !== 'all') c.target = map.get(c.target) || 'all'; });
    const id = await S.store.create(d.name || f.name.replace(/\.json$/i,''), list);
    openShow(id); toast(t('toast.imported'),'ok');
  }catch(err){ console.error(err); toast(t('toast.loadFail'),'error'); }
};

/* ═════════ keyboard ═════════ */
document.addEventListener('keydown', e => {
  S.lastActivity = Date.now();
  if(!S.store || !S.show) return;
  if(!$('#dialog').classList.contains('hidden')) return;
  if(!$('#settings').classList.contains('hidden')){ if(e.key === 'Escape') closeSettings(); return; }
  if((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z'){
    if(S.undo){ e.preventDefault(); const f = S.undo; S.undo = null; $('#toast').classList.remove('show'); f(); }
    return;
  }
  if((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f'){ e.preventDefault(); $('#search').focus(); $('#search').select(); return; }
  if(e.key === 'Escape'){ e.preventDefault(); panic(); return; }
  const tag = (e.target.tagName || '').toLowerCase();
  if(['input','textarea','select'].includes(tag) || e.target.isContentEditable) return;
  if(e.code === 'Space'){ e.preventDefault(); if(S.settings.spaceGo) go(); return; }
  if(e.key === 'ArrowDown'){ e.preventDefault(); stepStandby(1); return; }
  if(e.key === 'ArrowUp'){ e.preventDefault(); stepStandby(-1); return; }
  if(e.key === 'Delete' || e.key === 'Backspace'){ e.preventDefault(); deleteStandby(); return; }
  if(e.ctrlKey || e.metaKey || e.altKey) return;
  const k = (e.key || '').toUpperCase();
  if(k.length !== 1) return;
  const c = cues().find(x => (x.hotkey || '').toUpperCase() === k);
  if(c){ e.preventDefault(); runCue(c); }
});
document.addEventListener('pointerdown', () => { S.lastActivity = Date.now(); if(S.store) engine.unlock(); }, { passive:true });
setInterval(() => {
  if(!S.store || !S.settings.autoLockMin) return;
  if(Date.now() - S.lastActivity > S.settings.autoLockMin*60000){
    endSession(); toast(t('toast.locked'),'warn');
  }
}, 20000);
window.addEventListener('beforeunload', () => { if(S.dirty) commit(true); });

/* ═════════ boot ═════════ */
hydrate();
buildEq();
setLang(getLang());
applyI18n();
fillLangs();
wireLock();
renderMute();
renderRack();
watchAuth(async user => {
  if(user && !S.store && !localSessionActive()) await startSession(new CloudStore(user));
});
if(localSessionActive()) startSession(new LocalStore());
