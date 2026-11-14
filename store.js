/* Two interchangeable backends: Firebase cloud, or a fully working offline desk. */
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
import { bytesGet, bytesPut } from './audio.js';

export const cloudConfigured = () =>
  !!firebaseConfig.apiKey && !String(firebaseConfig.apiKey).startsWith('YOUR_');

let fb = null, auth = null, db = null, storage = null;
if(cloudConfigured()){
  fb = initializeApp(firebaseConfig);
  auth = getAuth(fb); db = getFirestore(fb); storage = getStorage(fb);
}
export const cloudAuth = () => auth;
export const watchAuth = cb => auth ? onAuthStateChanged(auth, cb) : (() => {});
export async function cloudSignIn(email, pass, remember){
  await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence);
  return signInWithEmailAndPassword(auth, email, pass);
}
export const cloudSignOut = () => auth ? signOut(auth) : Promise.resolve();
export const cloudPassword = p => updatePassword(auth.currentUser, p);

/* ── local passcode gate ── */
const GATE = 'dc.local.gate';
const rndSalt = () => [...crypto.getRandomValues(new Uint8Array(12))].map(b => b.toString(16).padStart(2,'0')).join('');
async function hash(pass, salt){
  const data = new TextEncoder().encode(salt + ':' + pass);
  if(globalThis.crypto?.subtle){
    const d = await crypto.subtle.digest('SHA-256', data);
    return [...new Uint8Array(d)].map(b => b.toString(16).padStart(2,'0')).join('');
  }
  let h = 0x811c9dc5; for(const b of data){ h ^= b; h = Math.imul(h, 0x01000193) >>> 0; }
  return 'fnv' + h.toString(16);
}
export const localGateExists = () => !!localStorage.getItem(GATE);
export async function localSetPasscode(pass){
  const salt = rndSalt();
  localStorage.setItem(GATE, JSON.stringify({ salt, hash: await hash(pass, salt) }));
}
export async function localVerify(pass){
  try{
    const g = JSON.parse(localStorage.getItem(GATE) || 'null');
    return !!g && (await hash(pass, g.salt)) === g.hash;
  }catch{ return false; }
}
export function localSession(on, keep){
  if(on){ sessionStorage.setItem('dc.session','local'); if(keep) localStorage.setItem('dc.local.keep','1'); }
  else { sessionStorage.removeItem('dc.session'); localStorage.removeItem('dc.local.keep'); }
}
export const localSessionActive = () =>
  localGateExists() && (sessionStorage.getItem('dc.session') === 'local' || localStorage.getItem('dc.local.keep') === '1');

/* ── offline backend ── */
const LSHOWS = 'dc.local.shows', LSET = 'dc.local.settings';
const read = (k, d) => { try{ return JSON.parse(localStorage.getItem(k)) ?? d; }catch{ return d; } };

export class LocalStore {
  constructor(){ this.mode = 'local'; this.user = null; this.listeners = new Set(); }
  async init(){}
  _emit(){ this.listeners.forEach(fn => fn()); }
  _all(){ return read(LSHOWS, []); }
  _write(list){ localStorage.setItem(LSHOWS, JSON.stringify(list)); this._emit(); }
  watchShows(cb){
    const run = () => cb(this._all().map(s => ({ id:s.id, name:s.name, updatedAt:s.updatedAt })).sort((a,b) => a.createdAt-b.createdAt));
    this.listeners.add(run); queueMicrotask(run);
    return () => this.listeners.delete(run);
  }
  watchShow(id, cb){
    const run = () => { const s = this._all().find(x => x.id === id); if(s) cb(structuredClone(s)); };
    this.listeners.add(run); queueMicrotask(run);
    return () => this.listeners.delete(run);
  }
  async create(name, cues){
    const id = 's' + Date.now().toString(36) + Math.random().toString(36).slice(2,6);
    const list = this._all();
    list.push({ id, name, cues, rev:1, createdAt:Date.now(), updatedAt:Date.now() });
    this._write(list); return id;
  }
  async put(show){
    const list = this._all(), i = list.findIndex(s => s.id === show.id);
    if(i < 0) return;
    list[i] = { ...list[i], name:show.name, cues:show.cues, rev:show.rev, updatedAt:Date.now() };
    this._write(list);
  }
  async remove(id){ this._write(this._all().filter(s => s.id !== id)); }
  async settings(){ return read(LSET, {}); }
  async saveSettings(patch){ localStorage.setItem(LSET, JSON.stringify({ ...read(LSET,{}), ...patch })); }
  async importAudio(file, onProgress){
    const key = 'local/' + Date.now().toString(36) + Math.random().toString(36).slice(2,7);
    const buf = await file.arrayBuffer();
    onProgress && onProgress(60);
    await bytesPut(key, buf);
    onProgress && onProgress(100);
    return { kind:'local', key, name:file.name, size:file.size };
  }
  async loadBytes(f){
    if(f.kind === 'local'){
      const b = await bytesGet(f.key);
      if(!b) throw new Error('missing local file');
      return b;
    }
    return fetchBytes(f.url);
  }
  async signOut(){ localSession(false); }
}

async function fetchBytes(url){
  const ck = 'cache/' + url;
  const hit = await bytesGet(ck);
  if(hit) return hit;
  const r = await fetch(url);
  if(!r.ok) throw new Error('HTTP ' + r.status);
  const b = await r.arrayBuffer();
  bytesPut(ck, b.slice(0));
  return b;
}

/* ── cloud backend ── */
export class CloudStore {
  constructor(user){ this.mode = 'cloud'; this.user = user; this.urls = new Map(); }
  async init(){}
  watchShows(cb){
    return onSnapshot(query(collection(db,'shows'), orderBy('createdAt','asc')),
      snap => cb(snap.docs.map(d => ({ id:d.id, name:d.data().name || 'Show', updatedAt:d.data().updatedAt || 0 }))),
      err => console.error(err));
  }
  watchShow(id, cb){
    return onSnapshot(doc(db,'shows',id),
      snap => { if(snap.exists()) cb({ id, ...snap.data() }); },
      err => console.error(err));
  }
  async create(name, cues){
    const r = await addDoc(collection(db,'shows'),
      { name, cues, rev:1, createdAt:Date.now(), updatedAt:Date.now(), owner:this.user.uid });
    return r.id;
  }
  async put(show){
    await updateDoc(doc(db,'shows',show.id),
      { name:show.name, cues:show.cues, rev:show.rev, updatedAt:Date.now() });
  }
  async remove(id){ await deleteDoc(doc(db,'shows',id)); }
  async settings(){
    const s = await getDoc(doc(db,'userSettings',this.user.uid));
    return s.exists() ? s.data() : {};
  }
  async saveSettings(patch){ await setDoc(doc(db,'userSettings',this.user.uid), patch, { merge:true }); }
  async importAudio(file, onProgress){
    const path = `audio/${this.user.uid}/${Date.now()}_${file.name.replace(/[^\w.\-]+/g,'_')}`;
    const task = uploadBytesResumable(sRef(storage, path), file, { contentType:file.type || 'audio/mpeg' });
    await new Promise((res, rej) => task.on('state_changed',
      s => onProgress && onProgress(Math.round(s.bytesTransferred / s.totalBytes * 100)), rej, res));
    return { kind:'cloud', path, name:file.name, size:file.size };
  }
  async loadBytes(f){
    if(f.kind === 'url') return fetchBytes(f.url);
    let u = this.urls.get(f.path);
    if(!u){ u = await getDownloadURL(sRef(storage, f.path)); this.urls.set(f.path, u); }
    return fetchBytes(u);
  }
  async signOut(){ await cloudSignOut(); }
}
