window.DC = window.DC || {};
(function(DC){
"use strict";
var CFG=window.DC_CONFIG||{};
var AUDIO=Object.assign({useStorage:false,folder:"audio",manifest:[]},window.DC_AUDIO||{});
function cloudConfigured(){return !!CFG.apiKey&&String(CFG.apiKey).indexOf("YOUR_")!==0;}
function storageEnabled(){return AUDIO.useStorage===true;}
var fbPromise=null;
function loadScript(src){return new Promise(function(res,rej){var s=document.createElement("script");s.src=src;s.onload=res;s.onerror=function(){rej(new Error("load"));};document.head.appendChild(s);});}
function loadFirebase(){
if(fbPromise)return fbPromise;
fbPromise=(async function(){
var base="https://www.gstatic.com/firebasejs/10.12.2/";
await loadScript(base+"firebase-app-compat.js");
var jobs=[loadScript(base+"firebase-auth-compat.js"),loadScript(base+"firebase-firestore-compat.js")];
if(storageEnabled())jobs.push(loadScript(base+"firebase-storage-compat.js"));
await Promise.all(jobs);
var app=firebase.apps.length?firebase.app():firebase.initializeApp(CFG);
return{auth:firebase.auth(),db:firebase.firestore(),storage:storageEnabled()?firebase.storage():null};
})();
return fbPromise;
}

/* ---- passcode gate ---- */
var GATE="dc.local.gate.v3";
function rndSalt(){return Array.from(crypto.getRandomValues(new Uint8Array(12))).map(function(b){return b.toString(16).padStart(2,"0");}).join("");}
async function hashCode(pass,salt){var data=new TextEncoder().encode(salt+":"+pass);if(window.crypto&&crypto.subtle){var d=await crypto.subtle.digest("SHA-256",data);return Array.from(new Uint8Array(d)).map(function(b){return b.toString(16).padStart(2,"0");}).join("");}var h=0x811c9dc5;for(var i=0;i<data.length;i++){h^=data[i];h=Math.imul(h,0x01000193)>>>0;}return"fnv"+h.toString(16);}
function localGateExists(){return !!localStorage.getItem(GATE);}
async function localSetPasscode(pass){var salt=rndSalt();localStorage.setItem(GATE,JSON.stringify({salt:salt,hash:await hashCode(pass,salt)}));}
async function localVerify(pass){try{var g=JSON.parse(localStorage.getItem(GATE)||"null");return !!g&&await hashCode(pass,g.salt)===g.hash;}catch(e){return false;}}
function localSession(on,keep){if(on){sessionStorage.setItem("dc.session","local");if(keep)localStorage.setItem("dc.local.keep","1");}else{sessionStorage.removeItem("dc.session");localStorage.removeItem("dc.local.keep");}}
function localSessionActive(){return localGateExists()&&(sessionStorage.getItem("dc.session")==="local"||localStorage.getItem("dc.local.keep")==="1");}

/* ---- helpers ---- */
function readLS(k,d){try{var v=JSON.parse(localStorage.getItem(k));return v==null?d:v;}catch(e){return d;}}
function clone(o){return JSON.parse(JSON.stringify(o));}
var bytesGet=DC.audio.bytesGet,bytesPut=DC.audio.bytesPut;

/* Resolve a repo-relative path against the directory of the current page,
   so it works at https://user.github.io/drama-cue/ and at localhost root. */
function resolveAudioPath(raw){
var s=String(raw||"").trim();
if(!s)return"";
if(/^(https?:|data:|blob:)/i.test(s))return s;
var dir=location.href.replace(/[?#].*$/,"").replace(/[^/]*$/,"");
s=s.replace(/^\.\//,"").split("/").map(function(seg){return encodeURIComponent(seg);}).join("/");
if(s.charAt(0)==="/")return location.origin+s;
return dir+s;
}
function inFolder(name){var f=AUDIO.folder.replace(/^\/+|\/+$/g,"");return f?f+"/"+String(name).replace(/^\/+/,""):String(name);}
async function fetchBytes(url){
var ck="cache/"+url,hit=await bytesGet(ck);
if(hit)return hit;
var r=await fetch(url,{cache:"force-cache"});
if(!r.ok)throw new Error("HTTP "+r.status);
var b=await r.arrayBuffer();
bytesPut(ck,b.slice(0));
return b;
}

/* ---- offline backend ---- */
function LocalStore(){this.mode="local";this.user=null;this.listeners=new Set();}
LocalStore.prototype.init=async function(){};
LocalStore.prototype._emit=function(){this.listeners.forEach(function(fn){fn();});};
LocalStore.prototype._all=function(){return readLS("dc.local.shows.v3",[]);};
LocalStore.prototype._write=function(list){localStorage.setItem("dc.local.shows.v3",JSON.stringify(list));this._emit();};
LocalStore.prototype.watchShows=function(cb){var self=this,run=function(){cb(self._all().slice().sort(function(a,b){return a.createdAt-b.createdAt;}).map(function(s){return{id:s.id,name:s.name,createdAt:s.createdAt,updatedAt:s.updatedAt};}));};this.listeners.add(run);queueMicrotask(run);return function(){self.listeners.delete(run);};};
LocalStore.prototype.watchShow=function(id,cb){var self=this,run=function(){var s=self._all().find(function(x){return x.id===id;});if(s)cb(clone(s));};this.listeners.add(run);queueMicrotask(run);return function(){self.listeners.delete(run);};};
LocalStore.prototype.create=async function(name,cues){var id="s"+Date.now().toString(36)+Math.random().toString(36).slice(2,6),list=this._all();list.push({id:id,name:name,cues:cues,rev:1,createdAt:Date.now(),updatedAt:Date.now()});this._write(list);return id;};
LocalStore.prototype.put=async function(show){var list=this._all(),i=list.findIndex(function(s){return s.id===show.id;});if(i<0)return;list[i]=Object.assign({},list[i],{name:show.name,cues:show.cues,rev:show.rev,updatedAt:Date.now()});this._write(list);};
LocalStore.prototype.remove=async function(id){this._write(this._all().filter(function(s){return s.id!==id;}));};
LocalStore.prototype.settings=async function(){return readLS("dc.local.settings.v3",{});};
LocalStore.prototype.saveSettings=async function(patch){localStorage.setItem("dc.local.settings.v3",JSON.stringify(Object.assign({},readLS("dc.local.settings.v3",{}),patch)));};
LocalStore.prototype.importAudio=async function(file,onProgress){var key="local/"+Date.now().toString(36)+Math.random().toString(36).slice(2,7),buf=await file.arrayBuffer();if(onProgress)onProgress(60);await bytesPut(key,buf);if(onProgress)onProgress(100);return{kind:"local",key:key,name:file.name,size:file.size};};
LocalStore.prototype.loadBytes=async function(f){
if(f.kind==="local"){var b=await bytesGet(f.key);if(!b)throw new Error("missing");return b;}
if(f.kind==="repo")return fetchBytes(resolveAudioPath(f.path));
return fetchBytes(resolveAudioPath(f.url));
};
LocalStore.prototype.signOut=async function(){localSession(false);};

/* ---- cloud backend (Firestore + Auth only) ---- */
function CloudStore(user){this.mode="cloud";this.user=user;this.urls=new Map();this.fb=null;}
CloudStore.prototype.init=async function(){this.fb=await loadFirebase();};
CloudStore.prototype.signIn=async function(email,pass,remember){this.fb=await loadFirebase();await this.fb.auth.setPersistence(remember?firebase.auth.Auth.Persistence.LOCAL:firebase.auth.Auth.Persistence.SESSION);var cred=await this.fb.auth.signInWithEmailAndPassword(email,pass);this.user=cred.user;return cred.user;};
CloudStore.prototype.watchShows=function(cb){return this.fb.db.collection("shows").orderBy("createdAt","asc").onSnapshot(function(snap){cb(snap.docs.map(function(d){return Object.assign({id:d.id},d.data());}));},function(e){console.error(e);});};
CloudStore.prototype.watchShow=function(id,cb){return this.fb.db.collection("shows").doc(id).onSnapshot(function(snap){if(snap.exists)cb(Object.assign({id:id},snap.data()));},function(e){console.error(e);});};
CloudStore.prototype.create=async function(name,cues){var r=await this.fb.db.collection("shows").add({name:name,cues:cues,rev:1,createdAt:Date.now(),updatedAt:Date.now(),owner:this.user.uid});return r.id;};
CloudStore.prototype.put=async function(show){await this.fb.db.collection("shows").doc(show.id).update({name:show.name,cues:show.cues,rev:show.rev,updatedAt:Date.now()});};
CloudStore.prototype.remove=async function(id){await this.fb.db.collection("shows").doc(id).delete();};
CloudStore.prototype.settings=async function(){var s=await this.fb.db.collection("userSettings").doc(this.user.uid).get();return s.exists?s.data():{};};
CloudStore.prototype.saveSettings=async function(patch){await this.fb.db.collection("userSettings").doc(this.user.uid).set(patch,{merge:true});};
CloudStore.prototype.importAudio=async function(file,onProgress){
if(!storageEnabled()||!this.fb.storage)throw new Error("storage-disabled");
var path="audio/"+this.user.uid+"/"+Date.now()+"_"+file.name.replace(/[^\w.\-]+/g,"_"),task=this.fb.storage.ref(path).put(file,{contentType:file.type||"audio/mpeg"});
await new Promise(function(res,rej){task.on("state_changed",function(s){if(onProgress)onProgress(Math.round(s.bytesTransferred/s.totalBytes*100));},rej,res);});
return{kind:"cloud",path:path,name:file.name,size:file.size};
};
CloudStore.prototype.loadBytes=async function(f){
if(f.kind==="repo")return fetchBytes(resolveAudioPath(f.path));
if(f.kind==="url")return fetchBytes(resolveAudioPath(f.url));
if(f.kind==="cloud"){
if(!this.fb.storage)throw new Error("storage-disabled");
var u=this.urls.get(f.path);
if(!u){u=await this.fb.storage.ref(f.path).getDownloadURL();this.urls.set(f.path,u);}
return fetchBytes(u);
}
throw new Error("unknown source");
};
CloudStore.prototype.signOut=async function(){await this.fb.auth.signOut();};

DC.store={
cloudConfigured:cloudConfigured,storageEnabled:storageEnabled,loadFirebase:loadFirebase,
LocalStore:LocalStore,CloudStore:CloudStore,
localGateExists:localGateExists,localSetPasscode:localSetPasscode,localVerify:localVerify,
localSession:localSession,localSessionActive:localSessionActive,
resolveAudioPath:resolveAudioPath,inFolder:inFolder,audioManifest:function(){return AUDIO.manifest.slice();},audioFolder:function(){return AUDIO.folder;}
};
})(window.DC);
