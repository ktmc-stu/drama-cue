import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut, setPersistence,
         browserLocalPersistence, browserSessionPersistence, updatePassword }
  from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js';
import { getFirestore, collection, doc, addDoc, setDoc, updateDoc, deleteDoc, getDoc,
         onSnapshot, query, orderBy }
  from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js';
import { getStorage, ref as sRef, uploadBytesResumable, getDownloadURL }
  from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-storage.js';
import { firebaseConfig } from './firebase-config.js';
import { t, setLang, getLang, applyI18n, LANGS } from './i18n.js';
import { AudioEngine } from './audio.js';

/* ================= helpers ================= */
const $  = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2,7);
const clamp = (v,a,b) => Math.min(b, Math.max(a,v));
const fmt = s => { if(!isFinite(s) || s < 0) s = 0;
  return `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}.${Math.floor((s*10)%10)}`; };

const fb = initializeApp(firebaseConfig);
const auth = getAuth(fb), db = getFirestore(fb), storage = getStorage(fb);
const engine = new AudioEngine();

const DEFAULTS = { lang:'en', masterDb:0, panicFade:2, spaceGo:true, confirmDelete:true, autoLockMin:0, output:'default' };
let settings = { ...DEFAULTS };
let user = null, shows = [], show = null, currentShowId = null;
let standby = 0, rev = 0, dirty = false, saveTimer = null;
let unsubShows = null, unsubShow = null;
const timers = new Set();          // auto-follow / auto-continue / wait timers
const urlCache = new Map();
const lastInst = new Map();        // cueId -> latest instance id
let preloadToken = 0, lastActivity = Date.now(), wakeLock = null;

/* ================= toast / dialog ================= */
let toastTimer;
function toast(msg, kind='info', ms=2600){
  const el = $('#toast'); el.textContent = msg; el.className = 'toast show ' + kind;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => el.className = 'toast', ms);
}
function dialog({ title, body='', input=null, okText, danger=false }){
  return new Promise(res => {
    const wrap = $('#dialog'), inp = $('#dlgInput'), ok = $('#dlgOk'), cancel = $('#dlgCancel');
    $('#dlgTitle').textContent = title; $('#dlgBody').textContent = body;
    inp.classList.toggle('hidden', input === null); if(input !== null) inp.value = input;
    ok.textContent = okText || t('dialog.ok'); ok.className = 'btn ' + (danger ? 'danger' : 'primary');
    cancel.textContent = t('dialog.cancel');
    wrap.classList.remove('hidden'); (input !== null ? inp : ok).focus();
    const close = v => { wrap.classList.add('hidden'); ok.onclick = cancel.onclick = wrap.onkeydown = null; res(v); };
    ok.onclick = () => close(input === null ? true : (inp.value.trim() || null));
    cancel.onclick = () => close(input === null ? false : null);
    wrap.onkeydown = e => {
      if(e.key === 'Enter'){ e.preventDefault(); ok.click(); }
      if(e.key === 'Escape'){ e.preventDefault(); e.stopPropagation(); cancel.click(); }
    };
  });
}
const uiConfirm = (title, body) => dialog({ title, body, okText:t('dialog.confirm'), danger:true });
const uiPrompt  = (title, value='') => dialog({ title, input:value });

/* ================= settings ================= */
async function loadSettings(){
  try{ const s = await getDoc(doc(db,'userSettings',user.uid)); if(s.exists()) settings = { ...DEFAULTS, ...s.data() }; }
  catch(e){ console.warn(e); }
  setLang(settings.lang); applyI18n(); fillLangSelects();
  engine.setMasterDb(settings.masterDb);
  $('#masterVol').value = settings.masterDb;
  $('#masterVolLabel').textContent = settings.masterDb + ' dB';
  if(settings.output !== 'default') engine.setOutput(settings.output).catch(()=>{});
}
let setTimer;
function saveSettings(){
  clearTimeout(setTimer);
  setTimer = setTimeout(() => setDoc(doc(db,'userSettings',user.uid), settings, { merge:true })
    .catch(() => toast(t('err.save'),'error')), 400);
}
function fillLangSelects(){
  const opts = LANGS.map(l => `<option value="${l.id}">${esc(l.label)}</option>`).join('');
  ['#loginLang','#setLang'].forEach(sel => { const el = $(sel); el.innerHTML = opts; el.value = getLang(); });
}

/* ================= auth ================= */
onAuthStateChanged(auth, async u => {
  if(u){
    user = u;
    $('#loginView').classList.add('hidden'); $('#appView').classList.remove('hidden');
    await loadSettings(); subscribeShows(); tick();
  }else{
    user = null; engine.stopAll(0); clearTimers();
    unsubShows && unsubShows(); unsubShow && unsubShow(); unsubShows = unsubShow = null;
    shows = []; show = null; currentShowId = null;
    $('#appView').classList.add('hidden'); $('#loginView').classList.remove('hidden');
    $('#loginPassword').value = ''; applyI18n(); fillLangSelects();
  }
});
$('#loginForm').addEventListener('submit', async e => {
  e.preventDefault();
  const err = $('#loginError'); err.textContent = '';
  if(String(firebaseConfig.apiKey).startsWith('YOUR_')){ err.textContent = t('err.config'); return; }
  $('#loginBtn').disabled = true; $('#loginBtn').textContent = t('login.busy');
  try{
    await setPersistence(auth, $('#loginRemember').checked ? browserLocalPersistence : browserSessionPersistence);
    await signInWithEmailAndPassword(auth, $('#loginEmail').value.trim(), $('#loginPassword').value);
    engine.unlock();
  }catch(ex){
    const c = ex.code || '';
    err.textContent = /network/.test(c) ? t('err.network')
      : /too-many/.test(c) ? t('err.tooMany')
      : /invalid-credential|wrong-password|user-not-found|invalid-email/.test(c) ? t('err.auth')
      : (ex.message || t('err.auth'));
  }finally{
    $('#loginBtn').disabled = false; $('#loginBtn').textContent = t('login.signIn');
  }
});
$('#loginLang').addEventListener('change', e => { setLang(e.target.value); applyI18n(); fillLangSelects(); });

async function lock(){
  if(await uiConfirm(t('dialog.lockTitle'), t('dialog.lockBody'))){
    engine.stopAll(0); clearTimers(); await signOut(auth); toast(t('toast.locked'));
  }
}
$('#lockBtn').onclick = lock;
$('#signOutBtn').onclick = async () => { closeSettings(); engine.stopAll(0); clearTimers(); await signOut(auth); };

/* ================= shows ================= */
function subscribeShows(){
  unsubShows && unsubShows();
  unsubShows = onSnapshot(query(collection(db,'shows'), orderBy('createdAt','asc')), async snap => {
    shows = snap.docs.map(d => ({ id:d.id, name:d.data().name || 'Show' }));
    if(!shows.length){
      await addDoc(collection(db,'shows'), { name:t('dialog.defaultShow'), cues:[], rev:1,
        createdAt:Date.now(), updatedAt:Date.now(), owner:user.uid });
      return;
    }
    renderShowSelect();
    const remembered = localStorage.getItem('dc.show');
    const id = shows.some(s => s.id === currentShowId) ? currentShowId
             : shows.some(s => s.id === remembered) ? remembered : shows[0].id;
    if(id !== currentShowId) openShow(id);
  }, e => { console.error(e); toast(t('err.save'),'error'); });
}
function renderShowSelect(){
  $('#showSelect').innerHTML = shows.map(s => `<option value="${s.id}">${esc(s.name)}</option>`).join('');
  $('#showSelect').value = currentShowId || '';
}
function openShow(id){
  unsubShow && unsubShow(); clearTimers(); engine.stopAll(0);
  currentShowId = id; localStorage.setItem('dc.show', id);
  renderShowSelect(); standby = 0; rev = 0; dirty = false;
  unsubShow = onSnapshot(doc(db,'shows',id), snap => {
    if(!snap.exists()) return;
    const d = snap.data();
    if((d.rev || 0) < rev || dirty) return;                  // ignore stale echo / local edits
    const incoming = JSON.stringify({ n:d.name, c:d.cues || [] });
    const local = show && JSON.stringify({ n:show.name, c:show.cues });
    rev = d.rev || 0;
    if(incoming === local) return;
    show = { id, name:d.name || 'Show', cues:d.cues || [] };
    standby = clamp(standby, 0, Math.max(0, show.cues.length - 1));
    renderAll(); preloadAll();
  }, e => { console.error(e); toast(t('err.save'),'error'); });
}
function scheduleSave(now = false){
  if(!show) return;
  dirty = true; rev++;
  clearTimeout(saveTimer);
  const write = async () => {
    try{
      await updateDoc(doc(db,'shows',show.id), { name:show.name, cues:show.cues, rev, updatedAt:Date.now() });
      dirty = false;
    }catch(e){ console.error(e); toast(t('err.save'),'error'); }
  };
  now ? write() : (saveTimer = setTimeout(write, 500));
}
$('#showSelect').onchange = e => openShow(e.target.value);
$('#newShowBtn').onclick = async () => {
  const name = await uiPrompt(t('dialog.newShow'), t('dialog.defaultShow')); if(!name) return;
  const r = await addDoc(collection(db,'shows'), { name, cues:[], rev:1, createdAt:Date.now(), updatedAt:Date.now(), owner:user.uid });
  openShow(r.id);
};
$('#renameShowBtn').onclick = async () => {
  if(!show) return;
  const name = await uiPrompt(t('dialog.renameShow'), show.name); if(!name) return;
  show.name = name; scheduleSave(true); renderShowSelect();
};
$('#deleteShowBtn').onclick = async () => {
  if(!show) return;
  if(!await uiConfirm(t('dialog.delShowTitle'), t('dialog.delShowBody'))) return;
  const id = show.id; unsubShow && unsubShow(); unsubShow = null; show = null; currentShowId = null;
  await deleteDoc(doc(db,'shows',id));
};

/* ================= cue model ================= */
function newCue(type, extra = {}){
  const c = { id:uid(), type, name:'', hotkey:'', notes:'', cont:'manual', delay:0 };
  if(type === 'audio') Object.assign(c, { file:null, duration:0, volume:0, pan:0, fadeIn:0, fadeOut:0.5,
    loop:false, rate:1, trimIn:0, trimOut:0, stopOthers:false });
  if(type === 'fade')  Object.assign(c, { target:'all', fadeTo:-60, fadeTime:2, stopAtEnd:true });
  if(type === 'stop')  Object.assign(c, { target:'all', fadeTime:1 });
  if(type === 'wait')  Object.assign(c, { wait:3 });
  return Object.assign(c, extra);
}
const curCue = () => show && show.cues[standby] || null;
const cueIndex = id => show ? show.cues.findIndex(c => c.id === id) : -1;
const cueLen = c => c.type === 'audio'
  ? Math.max(0, ((c.trimOut > 0 ? c.trimOut : c.duration || 0) - (c.trimIn || 0)) / (c.rate || 1))
  : c.type === 'wait' ? (c.wait || 0) : (c.fadeTime || 0);

function addCues(list){
  if(!show) return;
  const at = show.cues.length ? standby + 1 : 0;
  show.cues.splice(at, 0, ...list); standby = at;
  scheduleSave(true); renderAll();
}
$('#addCueBtn').onclick = () => {
  const type = $('#addCueType').value;
  addCues([newCue(type, { name:t('cue.type.'+type) })]);
};
$('#dupCueBtn').onclick = () => { const c = curCue(); if(!c) return;
  const copy = JSON.parse(JSON.stringify(c)); copy.id = uid(); copy.name = (c.name || '') + t('cue.copySuffix');
  addCues([copy]); };
$('#delCueBtn').onclick = async () => {
  const c = curCue(); if(!c) return;
  if(settings.confirmDelete && !await uiConfirm(t('dialog.delCueTitle'), t('dialog.delCueBody'))) return;
  engine.stopCue(c.id, 0);
  show.cues.splice(standby, 1); standby = clamp(standby, 0, Math.max(0, show.cues.length - 1));
  scheduleSave(true); renderAll();
};
function move(delta){
  const i = standby, j = i + delta;
  if(!show || j < 0 || j >= show.cues.length) return;
  [show.cues[i], show.cues[j]] = [show.cues[j], show.cues[i]];
  standby = j; scheduleSave(true); renderAll();
}
$('#upCueBtn').onclick = () => move(-1);
$('#downCueBtn').onclick = () => move(1);

/* ================= files ================= */
async function getUrl(file){
  if(file.url) return file.url;
  if(urlCache.has(file.path)) return urlCache.get(file.path);
  const u = await getDownloadURL(sRef(storage, file.path));
  urlCache.set(file.path, u); return u;
}
async function ensureBuffer(cue){
  const key = cue.file.path || cue.file.url;
  if(engine.has(key)) return;
  const buf = await engine.load(key, await getUrl(cue.file));
  if(!cue.duration || Math.abs(cue.duration - buf.duration) > 0.05){ cue.duration = buf.duration; scheduleSave(); }
}
const AUDIO_RE = /\.(mp3|wav|m4a|aac|ogg|oga|opus|flac|aif|aiff)$/i;
async function uploadFiles(files, replaceCue = null){
  const arr = [...files].filter(f => (f.type || '').startsWith('audio/') || AUDIO_RE.test(f.name));
  if(!arr.length || !show) return;
  await engine.unlock();
  for(const f of arr){
    const path = `audio/${user.uid}/${Date.now()}_${f.name.replace(/[^\w.\-]+/g,'_')}`;
    try{
      toast(t('toast.uploading',{ name:f.name }),'info',120000);
      const task = uploadBytesResumable(sRef(storage, path), f, { contentType:f.type || 'audio/mpeg' });
      await new Promise((res, rej) => task.on('state_changed',
        s => toast(t('toast.uploading',{ name:f.name }) + ` ${Math.round(s.bytesTransferred/s.totalBytes*100)}%`,'info',120000),
        rej, res));
      const url = await getDownloadURL(sRef(storage, path)); urlCache.set(path, url);
      const file = { path, name:f.name, size:f.size };
      let duration = 0;
      try{ duration = (await engine.load(path, url)).duration; }catch{}
      if(replaceCue){ replaceCue.file = file; replaceCue.duration = duration; replaceCue.trimOut = 0;
        if(!replaceCue.name) replaceCue.name = f.name.replace(/\.[^.]+$/,''); }
      else addCues([newCue('audio', { name:f.name.replace(/\.[^.]+$/,''), file, duration })]);
      scheduleSave(true); renderAll();
      toast(t('toast.uploaded',{ name:f.name }),'ok');
    }catch(e){ console.error(e); toast(t('err.upload'),'error'); }
    replaceCue = null;
  }
}
$('#addAudioBtn').onclick = () => $('#fileInput').click();
$('#fileInput').onchange = e => { uploadFiles(e.target.files); e.target.value = ''; };

const wrap = $('#cueWrap');
wrap.addEventListener('dragover', e => {
  if([...e.dataTransfer.types].includes('Files')){ e.preventDefault(); wrap.classList.add('dragging'); }
});
wrap.addEventListener('dragleave', () => wrap.classList.remove('dragging'));
wrap.addEventListener('drop', e => {
  wrap.classList.remove('dragging');
  if(e.dataTransfer.files?.length){ e.preventDefault(); uploadFiles(e.dataTransfer.files); }
});

/* preload */
async function preloadAll(){
  if(!show) return;
  const token = ++preloadToken;
  const list = show.cues.filter(c => c.type === 'audio' && c.file);
  let ok = 0, done = 0;
  const status = () => $('#preloadStatus').textContent = `${done}/${list.length}`;
  status();
  const queue = [...list];
  await Promise.all(Array.from({ length:3 }, async () => {
    while(queue.length){
      if(token !== preloadToken) return;
      const c = queue.shift();
      try{ await ensureBuffer(c); ok++; }catch(e){ console.warn('preload', e); }
      done++; status();
    }
  }));
  if(token !== preloadToken) return;
  renderRows();
  if(list.length) toast(ok === list.length ? t('toast.preloadDone',{ ok, total:list.length }) : t('toast.preloadFail'),
                        ok === list.length ? 'ok' : 'warn');
}
$('#preloadBtn').onclick = async () => { await engine.unlock(); toast(t('toast.preloading')); preloadAll(); };

/* ================= playback ================= */
function clearTimers(){ timers.forEach(id => clearTimeout(id)); timers.clear(); }
function later(fn, ms){ const id = setTimeout(() => { timers.delete(id); fn(); }, Math.max(0, ms)); timers.add(id); return id; }

engine.onEnded = inst => {
  renderActive(); renderRows();
  const c = show && show.cues[cueIndex(inst.cueId)];
  if(!c || inst.manual || c.cont !== 'follow') return;
  if(lastInst.get(c.id) !== inst.id) return;      // only the newest run auto-follows
  const i = cueIndex(c.id);
  if(i >= 0 && show.cues[i+1]) runChain(i+1);
};

async function runCue(cue){
  if(!cue) return;
  await engine.unlock();
  requestWakeLock();
  switch(cue.type){
    case 'audio': {
      if(!cue.file){ toast(t('err.noFile'),'warn'); return; }
      try{ await ensureBuffer(cue); }catch(e){ console.error(e); toast(t('err.load'),'error'); return; }
      if(cue.stopOthers) engine.stopAll(cue.fadeOut || 0);
      const inst = engine.play(cue);
      if(inst) lastInst.set(cue.id, inst.id);
      break;
    }
    case 'fade': engine.fade(cue.target || 'all', cue.fadeTo ?? -60, cue.fadeTime || 0, !!cue.stopAtEnd); break;
    case 'stop': engine.stopCue(cue.target || 'all', cue.fadeTime || 0); break;
    case 'wait': if(cue.cont === 'follow') later(() => { const i = cueIndex(cue.id);
                   if(i >= 0 && show.cues[i+1]) runChain(i+1); }, (cue.wait || 0) * 1000); break;
    case 'memo': break;
  }
  renderActive(); renderRows();
}
function runChain(i){
  if(!show || !show.cues[i]){ toast(t('toast.endOfList'),'warn',1500); return; }
  const cue = show.cues[i];
  standby = Math.min(i+1, show.cues.length);
  renderRows(); renderStandby(); renderInspector();
  runCue(cue);
  if(cue.cont === 'continue' && show.cues[i+1]) later(() => runChain(i+1), (cue.delay || 0) * 1000);
}
function go(){ clearTimers(); runChain(standby); }
function panic(){ clearTimers(); engine.stopAll(settings.panicFade); renderActive(); renderRows(); toast(t('toast.panic'),'warn'); }
function setStandby(i){
  if(!show || !show.cues.length) return;
  standby = clamp(i, 0, show.cues.length - 1);
  renderRows(); renderStandby(); renderInspector();
  $(`#cueBody tr[data-i="${standby}"]`)?.scrollIntoView({ block:'nearest' });
}
$('#goBtn').onclick = go;
$('#panicBtn').onclick = panic;
$('#stopAllBtn').onclick = () => { clearTimers(); engine.stopAll(0); renderActive(); renderRows(); };
$('#pauseAllBtn').onclick = () => {
  engine.anyPaused() ? engine.unpauseAll() : engine.pauseAll();
  renderActive();
};
async function requestWakeLock(){
  try{ if('wakeLock' in navigator && !wakeLock){
    wakeLock = await navigator.wakeLock.request('screen');
    wakeLock.addEventListener('release', () => wakeLock = null);
  } }catch{}
}

/* ================= rendering ================= */
function renderAll(){ renderRows(); renderStandby(); renderInspector(); renderActive(); applyI18n(); }

function contLabel(c){ return t('cont.' + (c.cont || 'manual') + '.short'); }
function renderRows(){
  if(!show){ $('#cueBody').innerHTML = ''; return; }
  const playing = engine.cueIds();
  $('#cueEmpty').classList.toggle('hidden', show.cues.length > 0);
  $('#cueBody').innerHTML = show.cues.map((c,i) => {
    const cls = ['cue-row', i === standby ? 'standby' : '', playing.has(c.id) ? 'playing' : '', c.type === 'memo' ? 'memo' : ''].join(' ');
    const sub = c.file ? `<em>${esc(c.file.name)}</em>` : (c.notes ? `<em>${esc(c.notes)}</em>` : '');
    return `<tr class="${cls}" draggable="true" data-i="${i}" data-id="${c.id}">
      <td class="c-num">${i+1}</td>
      <td class="c-hk">${c.hotkey ? `<kbd>${esc(c.hotkey.toUpperCase())}</kbd>` : ''}</td>
      <td class="c-type"><span class="badge b-${c.type}">${t('cue.type.'+c.type)}</span></td>
      <td class="c-name">${esc(c.name || t('cue.untitled'))}${sub}</td>
      <td class="c-len">${c.type === 'memo' ? '—' : fmt(cueLen(c))}${c.loop ? ' ∞' : ''}</td>
      <td class="c-cont" title="${esc(t('cont.'+(c.cont||'manual')))}">${contLabel(c)}</td>
      <td class="c-act"><button class="mini" data-act="play" title="${esc(t('insp.preview'))}">▶</button></td>
    </tr>`;
  }).join('');
}
function renderStandby(){
  const c = curCue();
  $('#standbyName').textContent = c ? `${standby+1}. ${c.name || t('cue.untitled')}` : t('transport.end');
  $('#pauseAllBtn').textContent = engine.anyPaused() ? t('transport.resumeAll') : t('transport.pauseAll');
}
function fRow(label, inner, hint){
  return `<label class="f"><span class="fl">${esc(label)}${hint ? `<em>${esc(hint)}</em>` : ''}</span>${inner}</label>`;
}
const num = (k, v, step='0.1', min='0', max='9999') =>
  `<input type="number" data-k="${k}" value="${v ?? 0}" step="${step}" min="${min}" max="${max}">`;
const slider = (k, v, min, max, step, out) =>
  `<div class="slider"><input type="range" data-k="${k}" value="${v ?? 0}" min="${min}" max="${max}" step="${step}"><output>${out}</output></div>`;
const dbOut = v => `${v} dB`;
const panOut = v => v == 0 ? 'C' : (v < 0 ? 'L' + Math.round(-v*100) : 'R' + Math.round(v*100));

function renderInspector(){
  const box = $('#inspector'), c = curCue();
  if(!c){ box.innerHTML = `<div class="insp-head"><strong>${t('insp.title')}</strong></div><p class="muted">${t('insp.none')}</p>`; return; }
  const types = ['audio','fade','stop','wait','memo'];
  let h = `<div class="insp-head"><strong>${t('insp.title')} · #${standby+1}</strong>
    <span class="badge b-${c.type}">${t('cue.type.'+c.type)}</span></div>`;
  h += fRow(t('insp.type'), `<select data-k="type">${types.map(x =>
    `<option value="${x}" ${x === c.type ? 'selected' : ''}>${t('cue.type.'+x)}</option>`).join('')}</select>`);
  h += fRow(t('insp.name'), `<input type="text" data-k="name" value="${esc(c.name)}">`);
  h += fRow(t('insp.hotkey'), `<input type="text" data-k="hotkey" maxlength="1" value="${esc(c.hotkey)}">`, t('insp.hotkeyHint'));

  if(c.type === 'audio'){
    h += `<h3>${t('insp.source')}</h3>`;
    h += `<div class="filebox">${c.file ? esc(c.file.name) + (c.duration ? ` · ${fmt(c.duration)}` : '') : t('err.noFile')}</div>`;
    h += `<div class="row"><button class="btn" id="inspUpload">${t('insp.upload')}</button>
          <button class="btn" id="inspPreview">▶ ${t('insp.preview')}</button>
          <button class="btn" id="inspStop">■ ${t('insp.stop')}</button></div>`;
    h += fRow(t('insp.url'), `<input type="text" data-k="url" placeholder="${esc(t('insp.urlPh'))}" value="${esc(c.file?.url || '')}">`);
    h += `<div class="insp-grid">`;
    h += `<div class="full">${fRow(t('insp.volume'), slider('volume', c.volume, -60, 6, 1, dbOut(c.volume ?? 0)))}</div>`;
    h += `<div class="full">${fRow(t('insp.pan'), slider('pan', c.pan, -1, 1, 0.05, panOut(c.pan ?? 0)))}</div>`;
    h += fRow(t('insp.fadeIn'), num('fadeIn', c.fadeIn, '0.1', '0', '60'));
    h += fRow(t('insp.fadeOut'), num('fadeOut', c.fadeOut, '0.1', '0', '60'));
    h += fRow(t('insp.trimIn'), num('trimIn', c.trimIn, '0.1', '0'));
    h += fRow(t('insp.trimOut'), num('trimOut', c.trimOut, '0.1', '0'));
    h += fRow(t('insp.rate'), num('rate', c.rate, '0.05', '0.25', '4'));
    h += `<label class="check"><input type="checkbox" data-k="loop" ${c.loop ? 'checked' : ''}><span>${t('insp.loop')}</span></label>`;
    h += `<label class="check full"><input type="checkbox" data-k="stopOthers" ${c.stopOthers ? 'checked' : ''}><span>${t('insp.stopOthers')}</span></label>`;
    h += `</div>`;
  }
  if(c.type === 'fade' || c.type === 'stop'){
    const opts = [`<option value="all" ${c.target === 'all' ? 'selected' : ''}>${t('insp.targetAll')}</option>`]
      .concat(show.cues.filter(x => x.type === 'audio').map(x =>
        `<option value="${x.id}" ${c.target === x.id ? 'selected' : ''}>#${cueIndex(x.id)+1} ${esc(x.name || t('cue.untitled'))}</option>`));
    h += fRow(t('insp.target'), `<select data-k="target">${opts.join('')}</select>`);
    if(c.type === 'fade'){
      h += fRow(t('insp.fadeTo'), slider('fadeTo', c.fadeTo, -60, 6, 1, dbOut(c.fadeTo ?? -60)));
      h += fRow(t('insp.fadeTime'), num('fadeTime', c.fadeTime, '0.1', '0', '120'));
      h += `<label class="check"><input type="checkbox" data-k="stopAtEnd" ${c.stopAtEnd ? 'checked' : ''}><span>${t('insp.stopAtEnd')}</span></label>`;
    }else{
      h += fRow(t('insp.fadeTime'), num('fadeTime', c.fadeTime, '0.1', '0', '120'));
    }
  }
  if(c.type === 'wait') h += fRow(t('insp.wait'), num('wait', c.wait, '0.1', '0', '3600'));

  h += `<h3>${t('insp.cont')}</h3>`;
  h += fRow(t('insp.cont'), `<select data-k="cont">${['manual','follow','continue'].map(x =>
    `<option value="${x}" ${c.cont === x ? 'selected' : ''}>${t('cont.'+x)}</option>`).join('')}</select>`);
  if(c.cont === 'continue') h += fRow(t('insp.delay'), num('delay', c.delay, '0.1', '0', '3600'));
  h += fRow(t('insp.notes'), `<textarea data-k="notes" rows="3">${esc(c.notes)}</textarea>`);
  box.innerHTML = h;

  $('#inspUpload') && ($('#inspUpload').onclick = () => {
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'audio/*';
    inp.onchange = () => uploadFiles(inp.files, c); inp.click();
  });
  $('#inspPreview') && ($('#inspPreview').onclick = () => runCue(c));
  $('#inspStop') && ($('#inspStop').onclick = () => { engine.stopCue(c.id, c.fadeOut || 0); renderActive(); renderRows(); });
}
function valText(k, v){
  if(k === 'volume' || k === 'fadeTo') return dbOut(v);
  if(k === 'pan') return panOut(v);
  return String(v);
}
$('#inspector').addEventListener('input', e => {
  const k = e.target.dataset.k, c = curCue(); if(!k || !c) return;
  let v;
  if(e.target.type === 'checkbox') v = e.target.checked;
  else if(e.target.type === 'number' || e.target.type === 'range'){ v = parseFloat(e.target.value); if(!Number.isFinite(v)) v = 0; }
  else v = e.target.value;

  if(k === 'hotkey'){
    v = v.slice(-1).toUpperCase();
    if(v && (/[\s]/.test(v) || ['ESCAPE','ARROWUP','ARROWDOWN'].includes(v))){ toast(t('toast.hotkeyReserved'),'warn'); v = ''; }
    if(show.cues.some(x => x.id !== c.id && (x.hotkey||'').toUpperCase() === v && v)) toast(t('toast.hotkeyReserved'),'warn');
    e.target.value = v;
  }
  if(k === 'type'){
    const keep = { id:c.id, name:c.name, hotkey:c.hotkey, notes:c.notes, cont:c.cont, delay:c.delay };
    show.cues[standby] = Object.assign(newCue(v), keep);
    scheduleSave(true); renderAll(); return;
  }
  if(k === 'url'){
    c.file = v.trim() ? { url:v.trim(), name:v.trim().split('/').pop() } : null;
    c.duration = 0; scheduleSave(); renderRows(); return;
  }
  c[k] = v;
  const out = e.target.parentElement.querySelector?.('output'); if(out) out.textContent = valText(k, v);
  if(k === 'volume') engine.setCueDb(c.id, v);
  scheduleSave(); renderRows();
  if(k === 'cont') renderInspector();
});

/* cue table interaction */
$('#cueBody').addEventListener('click', e => {
  const tr = e.target.closest('tr'); if(!tr) return;
  const i = +tr.dataset.i;
  if(e.target.dataset.act === 'play'){ runCue(show.cues[i]); return; }
  setStandby(i);
});
let dragFrom = null;
$('#cueBody').addEventListener('dragstart', e => {
  const tr = e.target.closest('tr'); if(!tr) return;
  dragFrom = +tr.dataset.i; e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', 'cue');
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
  const to = +tr.dataset.i, [m] = show.cues.splice(dragFrom, 1);
  show.cues.splice(to, 0, m); standby = to; dragFrom = null;
  scheduleSave(true); renderAll();
});
$('#cueBody').addEventListener('dragend', () => {
  dragFrom = null; $$('#cueBody tr').forEach(r => r.classList.remove('dragover'));
});

/* active playback panel */
let activeSig = '';
function renderActive(){
  const list = [...engine.instances.values()];
  const sig = list.map(i => i.id + (i.paused ? 'p' : '')).join(',');
  const box = $('#activeList');
  if(sig === activeSig){ return; }
  activeSig = sig;
  if(!list.length){ box.innerHTML = `<div class="act-none">${t('transport.none')}</div>`; renderStandby(); return; }
  box.innerHTML = list.map(i => `<div class="act ${i.paused ? 'paused' : ''}" data-id="${i.id}">
    <div class="act-top"><span class="act-name">${esc(i.name || '')}${i.loop ? ' ∞' : ''}</span><span class="act-time mono"></span></div>
    <div class="bar"><i></i></div>
    <div class="act-ctl">
      <input type="range" min="-60" max="6" step="1" value="${i.targetDb}" data-act="vol">
      <button class="mini" data-act="pause">${i.paused ? '▶' : '⏸'}</button>
      <button class="mini" data-act="stop">■</button>
    </div></div>`).join('');
  renderStandby();
}
$('#activeList').addEventListener('input', e => {
  if(e.target.dataset.act !== 'vol') return;
  engine.setDb(e.target.closest('.act').dataset.id, parseFloat(e.target.value));
});
$('#activeList').addEventListener('click', e => {
  const act = e.target.dataset.act, id = e.target.closest('.act')?.dataset.id;
  if(!act || !id) return;
  const inst = engine.instances.get(id);
  if(act === 'pause') engine.toggle(id);
  if(act === 'stop') engine.stop(id, inst ? inst.fadeOut : 0);
  activeSig = ''; renderActive(); renderRows();
});

/* animation loop: timers, meters, row state */
let rowSig = '';
function tick(){
  requestAnimationFrame(tick);
  if(!user) return;
  for(const el of $$('#activeList .act')){
    const i = engine.instances.get(el.dataset.id); if(!i) continue;
    const info = engine.info(i);
    el.querySelector('.act-time').textContent = `${fmt(info.pos)} / ${fmt(info.region)}`;
    el.querySelector('.bar i').style.width = (info.region ? info.pos/info.region*100 : 0) + '%';
  }
  const playing = [...engine.cueIds()].sort().join(',');
  if(playing !== rowSig){ rowSig = playing; renderRows(); activeSig = ''; renderActive(); }
  const cv = $('#meter'), ctx2 = cv.getContext('2d'), lv = engine.level();
  ctx2.clearRect(0,0,cv.width,cv.height);
  ctx2.fillStyle = lv > 0.92 ? '#e0463c' : lv > 0.7 ? '#f0b429' : '#2fbf5f';
  ctx2.fillRect(0,0,cv.width*Math.min(1,lv),cv.height);
}

/* ================= keyboard ================= */
document.addEventListener('keydown', e => {
  lastActivity = Date.now();
  if(!user || !show) return;
  if(!$('#dialog').classList.contains('hidden')) return;
  if(!$('#settingsModal').classList.contains('hidden')){ if(e.key === 'Escape') closeSettings(); return; }
  if(e.key === 'Escape'){ e.preventDefault(); panic(); return; }         // panic always works
  const tag = (e.target.tagName || '').toLowerCase();
  if(['input','textarea','select'].includes(tag) || e.target.isContentEditable) return;
  if(e.code === 'Space'){ e.preventDefault(); if(settings.spaceGo) go(); return; }
  if(e.key === 'ArrowDown'){ e.preventDefault(); setStandby(standby+1); return; }
  if(e.key === 'ArrowUp'){ e.preventDefault(); setStandby(standby-1); return; }
  if(e.metaKey || e.ctrlKey || e.altKey) return;
  const k = (e.key || '').toUpperCase();
  if(k.length !== 1) return;
  const c = show.cues.find(x => (x.hotkey || '').toUpperCase() === k);
  if(c){ e.preventDefault(); runCue(c); }
});
document.addEventListener('pointerdown', () => { lastActivity = Date.now(); engine.unlock(); }, { passive:true });

/* auto-lock */
setInterval(() => {
  if(!user || !settings.autoLockMin) return;
  if(Date.now() - lastActivity > settings.autoLockMin * 60000){
    engine.stopAll(settings.panicFade); clearTimers(); signOut(auth); toast(t('toast.locked'),'warn');
  }
}, 20000);

/* ================= settings UI ================= */
async function openSettings(){
  $('#setLang').value = getLang();
  $('#setPanicFade').value = settings.panicFade;
  $('#setSpaceGo').checked = settings.spaceGo;
  $('#setConfirmDelete').checked = settings.confirmDelete;
  $('#setAutoLock').value = settings.autoLockMin;
  $('#settingsModal').classList.remove('hidden');
  await fillDevices();
}
function closeSettings(){ $('#settingsModal').classList.add('hidden'); }
$('#settingsBtn').onclick = openSettings;
$('#closeSettingsBtn').onclick = closeSettings;
$('#settingsModal').addEventListener('click', e => { if(e.target.id === 'settingsModal') closeSettings(); });

async function fillDevices(){
  const sel = $('#setOutput');
  let devs = [];
  try{ devs = (await navigator.mediaDevices.enumerateDevices()).filter(d => d.kind === 'audiooutput'); }catch{}
  sel.innerHTML = `<option value="default">${t('settings.defaultOut')}</option>` +
    devs.filter(d => d.deviceId !== 'default')
        .map(d => `<option value="${d.deviceId}">${esc(d.label || d.deviceId.slice(0,8))}</option>`).join('');
  sel.value = settings.output;
}
$('#refreshDevBtn').onclick = async () => {
  try{ const s = await navigator.mediaDevices.getUserMedia({ audio:true }); s.getTracks().forEach(t => t.stop()); }catch{}
  fillDevices();
};
$('#setOutput').onchange = async e => {
  try{ await engine.unlock(); await engine.setOutput(e.target.value); settings.output = e.target.value; saveSettings(); }
  catch(err){ console.error(err); toast(t('err.device'),'error'); e.target.value = settings.output; }
};
$('#setLang').onchange = e => { settings.lang = e.target.value; setLang(e.target.value); saveSettings();
  applyI18n(); fillLangSelects(); renderAll(); fillDevices(); };
$('#setPanicFade').onchange = e => { settings.panicFade = Math.max(0, parseFloat(e.target.value) || 0); saveSettings(); };
$('#setSpaceGo').onchange = e => { settings.spaceGo = e.target.checked; saveSettings(); };
$('#setConfirmDelete').onchange = e => { settings.confirmDelete = e.target.checked; saveSettings(); };
$('#setAutoLock').onchange = e => { settings.autoLockMin = Math.max(0, parseInt(e.target.value) || 0); saveSettings(); };
$('#changePwdBtn').onclick = async () => {
  const pw = $('#setNewPassword').value;
  try{ await updatePassword(auth.currentUser, pw); $('#setNewPassword').value = ''; toast(t('settings.passwordOk'),'ok'); }
  catch(e){ console.error(e); toast(t('err.password'),'error'); }
};
$('#masterVol').addEventListener('input', e => {
  const v = parseInt(e.target.value);
  engine.setMasterDb(v); $('#masterVolLabel').textContent = v + ' dB';
  settings.masterDb = v; saveSettings();
});

/* ================= export / import ================= */
$('#exportBtn').onclick = () => {
  if(!show) return;
  const blob = new Blob([JSON.stringify({ app:'drama-cue', version:1, name:show.name, cues:show.cues }, null, 2)],
    { type:'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = `${show.name}.dramacue.json`; a.click();
  URL.revokeObjectURL(a.href); toast(t('toast.exported'),'ok');
};
$('#importBtn').onclick = () => $('#importInput').click();
$('#importInput').onchange = async e => {
  const f = e.target.files[0]; e.target.value = ''; if(!f) return;
  try{
    const data = JSON.parse(await f.text());
    const cues = (data.cues || []).map(c => Object.assign(newCue(c.type || 'memo'), c, { id:uid() }));
    const r = await addDoc(collection(db,'shows'), { name:data.name || f.name, cues, rev:1,
      createdAt:Date.now(), updatedAt:Date.now(), owner:user.uid });
    openShow(r.id); toast(t('toast.imported'),'ok');
  }catch(err){ console.error(err); toast(t('err.load'),'error'); }
};

window.addEventListener('beforeunload', () => { if(dirty) scheduleSave(true); });
applyI18n(); fillLangSelects();
if(String(firebaseConfig.apiKey).startsWith('YOUR_')) $('#loginError').textContent = t('err.config');
