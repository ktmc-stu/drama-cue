(function(){
"use strict";
var DC=window.DC||{};
if(!DC.i18n||!DC.audio||!DC.store){document.body.insertAdjacentHTML("beforeend",'<div class="fatal-note">Drama Cue failed to load. Check that all JS files are present.</div>');return;}
var t=DC.i18n.t,setLang=DC.i18n.setLang,getLang=DC.i18n.getLang,applyI18n=DC.i18n.applyI18n;
var ic=DC.icons.icon,setUse=DC.icons.setUse;
var SYNTHS=DC.synth.SYNTHS,synthLabel=DC.synth.synthLabel,renderSynth=DC.synth.renderSynth;
var engine=new DC.audio.AudioEngine();
var ST=DC.store;
var $=function(s,r){return (r||document).querySelector(s);},$$=function(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s));};
function esc(s){return String(s==null?"":s).replace(/[&<>"']/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];});}
function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,7);}
function clamp(v,a,b){return Math.min(b,Math.max(a,v));}
function clone(o){return JSON.parse(JSON.stringify(o));}
function fmt(s){if(!isFinite(s)||s<0)s=0;return Math.floor(s/60)+":"+String(Math.floor(s%60)).padStart(2,"0")+"."+Math.floor((s*10)%10);}
var FS_RULES="rules_version = '2';\nservice cloud.firestore {\n  match /databases/{database}/documents {\n    function crew() { return request.auth != null; }\n    match /shows/{showId} { allow read, write: if crew(); }\n    match /userSettings/{userId} { allow read, write: if request.auth != null && request.auth.uid == userId; }\n    match /{document=**} { allow read, write: if false; }\n  }\n}";
var DEFAULTS={lang:"en",masterDb:0,muted:false,panicFade:2,spaceGo:true,confirmDelete:true,motion:true,autoLockMin:0,output:"default",views:[]};
var S={store:null,settings:Object.assign({},DEFAULTS),shows:[],show:null,standby:0,selected:new Set(),view:{q:"",type:"all",flag:"any",sort:"order",dir:1},activeView:"all",rev:0,dirty:false,saveTimer:null,unsubShows:null,unsubShow:null,timers:new Set(),loading:new Map(),loadState:new Map(),lastInst:new Map(),undo:null,clockStart:0,preloadToken:0,lastActivity:Date.now(),wake:null,wave:null,waveRO:null,seeding:false,pickTarget:null};

/* ---------- toast / dialog ---------- */
var toastTimer=null,toastActionFn=null;
function toast(msg,kind,opts){kind=kind||"info";opts=opts||{};var el=$("#toast");$("#toastMsg").textContent=msg;setUse($(".toast-icon",el),kind==="ok"?"check":kind==="error"?"alert":"info");el.className="toast show "+kind;var btn=$("#toastAction");toastActionFn=opts.onAction||null;btn.classList.toggle("hidden",!opts.onAction);if(opts.onAction)btn.textContent=opts.actionLabel||t("undo");clearTimeout(toastTimer);toastTimer=setTimeout(function(){el.classList.remove("show");S.undo=null;},opts.ms||(opts.onAction?8000:2600));}
$("#toastClose").onclick=function(){clearTimeout(toastTimer);$("#toast").classList.remove("show");};
$("#toastAction").onclick=function(){var fn=toastActionFn;$("#toast").classList.remove("show");clearTimeout(toastTimer);if(fn)fn();};
function dialog(o){return new Promise(function(res){var wrap=$("#dialog"),inp=$("#dlgInput"),ok=$("#dlgOk"),cancel=$("#dlgCancel");$("#dlgTitle").textContent=o.title;$("#dlgBody").textContent=o.body||"";inp.classList.toggle("hidden",o.input==null);if(o.input!=null)inp.value=o.input;ok.textContent=o.okText||t("ok");ok.className="btn "+(o.danger?"danger":"primary");cancel.textContent=t("cancel");wrap.classList.remove("hidden");setTimeout(function(){(o.input!=null?inp:ok).focus();},20);function close(v){wrap.classList.add("hidden");ok.onclick=cancel.onclick=wrap.onkeydown=null;res(v);}ok.onclick=function(){close(o.input==null?true:(inp.value.trim()||null));};cancel.onclick=function(){close(o.input==null?false:null);};wrap.onkeydown=function(e){if(e.key==="Enter"){e.preventDefault();ok.click();}if(e.key==="Escape"){e.preventDefault();e.stopPropagation();cancel.click();}};});}
function askConfirm(title,body){return dialog({title:title,body:body,okText:t("confirm"),danger:true});}
function askText(title,value){return dialog({title:title,input:value==null?"":value});}

/* ---------- settings ---------- */
function fillLangs(){["lockLang","setLang"].forEach(function(id){var e=$("#"+id);if(e)e.value=getLang();});}
function renderMute(){setUse($("#muteIcon"),S.settings.muted?"mute":"volume");$("#muteLabel").textContent=S.settings.muted?t("rail.unmute"):t("rail.mute");}
function applySettings(){setLang(S.settings.lang);applyI18n();fillLangs();document.body.classList.toggle("no-motion",!S.settings.motion);engine.setMasterDb(S.settings.masterDb);engine.setMuted(S.settings.muted);$("#masterFader").value=S.settings.masterDb;$("#masterVal").textContent=S.settings.masterDb+" dB";renderMute();if(S.settings.output!=="default")engine.setOutput(S.settings.output).catch(function(){});}
var setTimer;
function saveSettings(){clearTimeout(setTimer);setTimer=setTimeout(function(){if(S.store)S.store.saveSettings(S.settings).catch(function(){toast(t("toast.saveFail"),"error");});},300);}

/* ---------- cue model ---------- */
function mk(type,extra){var c={id:uid(),type:type,name:"",hotkey:"",notes:"",cont:"manual",delay:0};if(type==="audio")Object.assign(c,{file:null,duration:0,volume:0,pan:0,fadeIn:0,fadeOut:.5,loop:false,rate:1,trimIn:0,trimOut:0,stopOthers:false});if(type==="fade")Object.assign(c,{target:"all",fadeTo:-60,fadeTime:2,stopAtEnd:true});if(type==="stop")Object.assign(c,{target:"all",fadeTime:1});if(type==="wait")Object.assign(c,{wait:2});return Object.assign(c,extra||{});}
function snd(id,sec){return{kind:"synth",synth:id,seconds:sec,name:synthLabel(id)};}
function repo(name){return{kind:"repo",path:ST.inFolder(name),name:name};}
function seed(){
var A=function(f,name,o){return mk("audio",Object.assign({name:name,file:f},o||{}));};
var c=[
mk("memo",{name:t("seed.c1")}),
A(snd("rain",9),t("seed.c2"),{volume:-18,fadeIn:4,fadeOut:3,loop:true}),
A(snd("thunder",5),t("seed.c3"),{volume:-11,hotkey:"T",cont:"continue"}),
mk("wait",{name:t("seed.c4"),wait:1.8,cont:"follow"}),
A(snd("thunder",5),t("seed.c5"),{volume:-2,rate:.85}),
A(snd("knock",2),t("seed.c6"),{volume:-4,hotkey:"D"}),
A(snd("wind",7),t("seed.c7"),{volume:-13,fadeIn:1.5,fadeOut:3}),
mk("fade",{name:t("seed.c8"),fadeTo:-27,fadeTime:4,stopAtEnd:false}),
A(snd("phone",3.4),t("seed.c9"),{volume:-7,hotkey:"P"}),
mk("stop",{name:t("seed.c10"),fadeTime:1.2}),
A(snd("ticks",8),t("seed.c11"),{volume:-22,loop:true}),
A(snd("heart",4.4),t("seed.c12"),{volume:-11,loop:true,rate:1.05}),
A(snd("whoosh",2.6),t("seed.c13"),{volume:-9}),
mk("fade",{name:t("seed.c14"),target:"all",fadeTo:-60,fadeTime:5,stopAtEnd:true}),
A(snd("applause",8),t("seed.c15"),{volume:-5,hotkey:"A",fadeIn:.4,fadeOut:2}),
mk("memo",{name:t("seed.c16")})
];
c[7].target=c[1].id;c[9].target=c[8].id;
var d=[A(snd("chime",5),t("seed.d1"),{volume:-8}),A(snd("applause",8),t("seed.d2"),{volume:-6,loop:true,fadeIn:1,fadeOut:4}),mk("fade",{name:t("seed.d3"),target:"all",fadeTo:-60,fadeTime:6,stopAtEnd:true}),mk("memo",{name:t("seed.d4")})];
return Promise.all([S.store.create(t("seed.show1"),c),S.store.create(t("seed.show2"),d)]);
}

/* ---------- session ---------- */
async function startSession(store){
if(S.store)return;
S.store=store;$("#lock").classList.add("hidden");$("#desk").classList.remove("hidden");
await store.init();
S.settings=Object.assign({},DEFAULTS,await store.settings());
if(!Array.isArray(S.settings.views))S.settings.views=[];
applySettings();applyStaticI18n();
$("#syncPill").classList.toggle("local",store.mode==="local");
$("#syncText").textContent=store.mode==="cloud"?t("rail.sync.cloud"):t("rail.sync.local");
$("#accountInfo").textContent=store.mode==="cloud"?(store.user.email||""):t("lock.local");
$("#sourceNote").textContent=ST.storageEnabled()?t("src.cloudNote"):t("src.repoNote");
S.unsubShows=store.watchShows(async function(list){
S.shows=list;
if(!list.length){if(S.seeding)return;S.seeding=true;try{await seed();}finally{S.seeding=false;}return;}
renderShows();
var remembered=localStorage.getItem("dc.show");
var id=S.show&&list.some(function(s){return s.id===S.show.id;})?S.show.id:list.some(function(s){return s.id===remembered;})?remembered:list[0].id;
if(!S.show||S.show.id!==id)openShow(id);
});
}
async function endSession(){clearTimers();engine.stopAll(0);if(S.unsubShows)S.unsubShows();if(S.unsubShow)S.unsubShow();var store=S.store;S.store=null;S.show=null;S.shows=[];S.selected.clear();S.undo=null;S.clockStart=0;S.unsubShows=S.unsubShow=null;if(store)await store.signOut();$("#desk").classList.add("hidden");$("#lock").classList.remove("hidden");$("#cPass").value="";refreshLocalGate();applyI18n();applyStaticI18n();fillLangs();}
function renderShows(){var sel=$("#showSelect");sel.innerHTML=S.shows.map(function(s){return'<option value="'+esc(s.id)+'">'+esc(s.name)+'</option>';}).join("");if(S.show)sel.value=S.show.id;}
function openShow(id){
if(S.unsubShow)S.unsubShow();
clearTimers();engine.stopAll(0);
S.show=null;S.selected.clear();S.standby=0;S.rev=0;S.dirty=false;S.clockStart=0;S.loadState.clear();S.lastInst.clear();
localStorage.setItem("dc.show",id);$("#showSelect").value=id;
S.unsubShow=S.store.watchShow(id,function(d){
if((d.rev||0)<S.rev||S.dirty)return;
var incoming=JSON.stringify({n:d.name,c:d.cues||[]}),local=S.show&&JSON.stringify({n:S.show.name,c:S.show.cues});
S.rev=d.rev||0;
if(incoming===local){if(!S.show){S.show={id:id,name:d.name,cues:d.cues||[]};renderAll();}return;}
S.show={id:id,name:d.name||"Show",cues:d.cues||[]};
S.standby=clamp(S.standby,0,S.show.cues.length);
S.selected.forEach(function(sid){if(!S.show.cues.some(function(c){return c.id===sid;}))S.selected.delete(sid);});
renderShows();renderAll();preloadAll();
});
}
function commit(now){if(!S.show||!S.store)return;S.dirty=true;S.rev++;clearTimeout(S.saveTimer);var write=async function(){try{await S.store.put({id:S.show.id,name:S.show.name,cues:S.show.cues,rev:S.rev});S.dirty=false;}catch(e){console.error(e);toast(t("toast.saveFail"),"error");}};if(now)write();else S.saveTimer=setTimeout(write,400);}
$("#showSelect").onchange=function(e){openShow(e.target.value);};
$("#newShow").onclick=async function(){var name=await askText(t("dlg.newShow"),t("dlg.defaultShow"));if(!name)return;var id=await S.store.create(name,[]);openShow(id);};
$("#renameShow").onclick=async function(){if(!S.show)return;var name=await askText(t("dlg.renameShow"),S.show.name);if(!name)return;S.show.name=name;commit(true);renderShows();};
$("#deleteShow").onclick=async function(){if(!S.show)return;if(!await askConfirm(t("dlg.delShow"),t("dlg.delShowBody")))return;var id=S.show.id;if(S.unsubShow)S.unsubShow();S.unsubShow=null;S.show=null;await S.store.remove(id);localStorage.removeItem("dc.show");};

/* ---------- cue access ---------- */
function cues(){return S.show?S.show.cues:[];}
function cur(){return cues()[S.standby]||null;}
function idxOf(id){return cues().findIndex(function(c){return c.id===id;});}
function cueLen(c){if(c.type==="audio")return Math.max(0,((c.trimOut>0?c.trimOut:c.duration||0)-(c.trimIn||0))/(c.rate||1));if(c.type==="wait")return c.wait||0;if(c.type==="memo")return 0;return c.fadeTime||0;}
function fileKey(f){if(!f)return"";if(f.kind==="synth")return"synth:"+f.synth+":"+f.seconds;if(f.kind==="repo")return"repo:"+f.path;if(f.kind==="url")return"url:"+f.url;if(f.kind==="local")return f.key;return"cloud:"+f.path;}
function fileLabel(f){if(!f)return t("toast.noFile");if(f.kind==="synth")return t("insp.synth");if(f.kind==="repo")return t("src.repo");if(f.kind==="local")return t("src.local");if(f.kind==="cloud")return t("src.cloud");return t("src.url");}
function canReorder(){return S.view.sort==="order"&&!S.view.q&&S.view.type==="all"&&S.view.flag==="any";}
function visibleIdx(){var cs=cues(),idx=cs.map(function(_,i){return i;}),v=S.view;if(v.type!=="all")idx=idx.filter(function(i){return cs[i].type===v.type;});if(v.flag==="hotkey")idx=idx.filter(function(i){return !!cs[i].hotkey;});if(v.flag==="loop")idx=idx.filter(function(i){return !!cs[i].loop;});if(v.flag==="error")idx=idx.filter(function(i){return S.loadState.get(cs[i].id)==="error";});if(v.q){var q=v.q.toLowerCase();idx=idx.filter(function(i){var c=cs[i];return(c.name+" "+(c.notes||"")+" "+(c.file&&c.file.name||"")+" "+(c.hotkey||"")+" "+(i+1)).toLowerCase().indexOf(q)>=0;});}if(v.sort!=="order"){var key=function(i){return v.sort==="name"?(cs[i].name||"").toLowerCase():v.sort==="type"?cs[i].type:cueLen(cs[i]);};idx.sort(function(a,b){var A=key(a),B=key(b);return(A<B?-1:A>B?1:a-b)*v.dir;});}return idx;}
function addCues(list){if(!S.show)return;var at=cues().length?Math.min(S.standby+1,cues().length):0;S.show.cues.splice.apply(S.show.cues,[at,0].concat(list));S.standby=at;commit(true);renderAll();toast(t("toast.added"),"ok",{ms:1400});}
function removeAt(indices){var cs=cues(),removed=indices.slice().sort(function(a,b){return a-b;}).map(function(i){return{i:i,c:cs[i]};});removed.slice().reverse().forEach(function(x){engine.stopCue(x.c.id,0);S.show.cues.splice(x.i,1);});S.selected.clear();S.standby=clamp(S.standby,0,cues().length);commit(true);renderAll();S.undo=function(){removed.forEach(function(x){S.show.cues.splice(Math.min(x.i,cues().length),0,x.c);});S.standby=removed[0].i;commit(true);renderAll();preloadAll();toast(t("toast.restored"),"ok",{ms:1600});};toast(t("toast.deleted",{n:removed.length}),"warn",{onAction:function(){var f=S.undo;S.undo=null;if(f)f();},actionLabel:t("undo")});}
async function deleteStandby(){var c=cur();if(!c)return;if(S.settings.confirmDelete&&!await askConfirm(t("dlg.delCue"),t("dlg.delCueBody")))return;removeAt([S.standby]);}
$("#addCue").onclick=function(){var ty=$("#addType").value;addCues([mk(ty,{name:t("type."+ty)})]);};

/* ---------- audio sources ---------- */
$("#addAudio").onclick=function(){openPicker(null);};
$("#fileInput").onchange=function(e){attachLocalFiles(e.target.files,null);e.target.value="";};
async function attachLocalFiles(files,target){
var arr=Array.from(files).filter(function(f){return(f.type||"").indexOf("audio/")===0||/\.(mp3|wav|m4a|aac|ogg|oga|opus|flac|aif|aiff)$/i.test(f.name);});
if(!arr.length||!S.show)return;
if(S.store.mode!=="local"){toast(t("src.localOnly"),"warn",{ms:3600});return;}
await engine.unlock();
for(var n=0;n<arr.length;n++){
var f=arr[n];
try{
var desc=await S.store.importAudio(f);
var duration=0;try{duration=(await getBuffer(desc)).duration;}catch(e){}
if(target){target.file=desc;target.duration=duration;target.trimIn=0;target.trimOut=0;if(!target.name)target.name=f.name.replace(/\.[^.]+$/,"");commit(true);renderAll();}
else addCues([mk("audio",{name:f.name.replace(/\.[^.]+$/,""),file:desc,duration:duration})]);
toast(t("toast.uploaded",{name:f.name}),"ok");
}catch(e){console.error(e);toast(t("toast.loadFail"),"error");}
target=null;
}
}
async function attachRepo(cue,path,name){
cue.file={kind:"repo",path:path,name:name||path.split("/").pop()};
cue.duration=0;cue.trimIn=0;cue.trimOut=0;
if(!cue.name)cue.name=(name||path).replace(/\.[^.]+$/,"").split("/").pop();
commit(true);renderRows();
try{await ensure(cue);renderInspector();}catch(e){toast(t("toast.loadFail"),"error");}
renderAll();
}
async function getBuffer(file){var key=fileKey(file);if(!key)throw new Error("no file");if(engine.buffers.has(key))return engine.buffers.get(key);if(S.loading.has(key))return S.loading.get(key);var p=(async function(){var buf;if(file.kind==="synth")buf=await renderSynth(file.synth,file.seconds);else buf=await engine.decode(await S.store.loadBytes(file));engine.buffers.set(key,buf);engine.peaksFor(key,buf);return buf;})();S.loading.set(key,p);try{return await p;}finally{S.loading.delete(key);}}
async function ensure(cue){if(!cue.file)throw new Error("no file");S.loadState.set(cue.id,"loading");paintStates();try{var b=await getBuffer(cue.file);if(!cue.duration||Math.abs(cue.duration-b.duration)>.05){cue.duration=b.duration;commit();}S.loadState.set(cue.id,"ready");paintStates();return b;}catch(e){S.loadState.set(cue.id,"error");paintStates();throw e;}}
async function preloadAll(){if(!S.show)return;var token=++S.preloadToken,list=cues().filter(function(c){return c.type==="audio"&&c.file;}),ok=0,done=0,paint=function(){$("#preloadPill").textContent=done+"/"+list.length;};paint();var queue=list.slice();await Promise.all(Array.from({length:3},async function(){while(queue.length){if(token!==S.preloadToken||!S.show)return;var c=queue.shift();try{await ensure(c);ok++;}catch(e){console.warn(e);}done++;paint();}}));if(token!==S.preloadToken||!S.show)return;renderAll();if(list.length)toast(ok===list.length?t("toast.preloadDone",{ok:ok,total:list.length}):t("toast.preloadFail"),ok===list.length?"ok":"warn");}
$("#preloadBtn").onclick=async function(){await engine.unlock();toast(t("toast.preloading"));preloadAll();};

/* ---------- audio picker ---------- */
function openPicker(target){
S.pickTarget=target||null;
var man=ST.audioManifest();
$("#pickerFolder").textContent=ST.audioFolder()+"/";
$("#pickerList").innerHTML=man.length?man.map(function(n){
return '<button class="picker-item" type="button" data-file="'+esc(n)+'">'+ic("wave",15)+'<span class="pi-name">'+esc(n)+'</span><span class="pi-path mono">'+esc(ST.inFolder(n))+'</span></button>';
}).join(""):'<p class="hint-text">'+esc(t("src.manifestEmpty"))+'</p>';
$("#pickerPath").value=target&&target.file&&target.file.kind==="repo"?target.file.path:"";
$("#pickerUrl").value=target&&target.file&&target.file.kind==="url"?target.file.url:"";
$("#pickerLocalRow").classList.toggle("hidden",S.store.mode!=="local");
$("#picker").classList.remove("hidden");
setTimeout(function(){$("#pickerPath").focus();},20);
}
function closePicker(){$("#picker").classList.add("hidden");S.pickTarget=null;}
$("#closePicker").onclick=closePicker;
$("#closePicker2").onclick=closePicker;
$("#picker").addEventListener("click",function(e){if(e.target.id==="picker")closePicker();});
$("#pickerList").onclick=async function(e){
var b=e.target.closest("[data-file]");if(!b)return;
var name=b.getAttribute("data-file");
var cue=S.pickTarget||mk("audio",{name:name.replace(/\.[^.]+$/,"")});
var isNew=!S.pickTarget;
closePicker();
if(isNew)addCues([cue]);
await attachRepo(cue,ST.inFolder(name),name);
};
$("#pickerPathBtn").onclick=async function(){
var raw=$("#pickerPath").value.trim();if(!raw)return;
var path=/^https?:/i.test(raw)?raw:raw.replace(/^\/+/,"");
var cue=S.pickTarget||mk("audio",{});
var isNew=!S.pickTarget;
closePicker();
if(isNew)addCues([cue]);
if(/^https?:/i.test(path)){cue.file={kind:"url",url:path,name:path.split("/").pop()};cue.duration=0;commit(true);try{await ensure(cue);}catch(e){toast(t("toast.loadFail"),"error");}renderAll();}
else await attachRepo(cue,path,path.split("/").pop());
};
$("#pickerUrlBtn").onclick=async function(){
var raw=$("#pickerUrl").value.trim();if(!raw)return;
var cue=S.pickTarget||mk("audio",{});
var isNew=!S.pickTarget;
closePicker();
cue.file={kind:"url",url:raw,name:raw.split("/").pop()};cue.duration=0;cue.trimIn=0;cue.trimOut=0;
if(!cue.name)cue.name=raw.split("/").pop().replace(/\.[^.]+$/,"");
if(isNew)addCues([cue]);else commit(true);
try{await ensure(cue);}catch(e){toast(t("toast.loadFail"),"error");}
renderAll();
};
$("#pickerLocalBtn").onclick=function(){$("#fileInput").click();};
$("#fileInput").addEventListener("change",function(){if(!$("#picker").classList.contains("hidden")){var tgt=S.pickTarget;closePicker();S.pickTarget=tgt;}},{once:false});

/* ---------- playback ---------- */
function clearTimers(){S.timers.forEach(clearTimeout);S.timers.clear();}
function later(fn,ms){var id=setTimeout(function(){S.timers.delete(id);fn();},Math.max(0,ms));S.timers.add(id);return id;}
engine.onEnded=function(i){renderRack();paintStates();var idx=idxOf(i.cueId);if(idx<0)return;var c=cues()[idx];if(i.manual||c.cont!=="follow"||S.lastInst.get(c.id)!==i.id)return;if(cues()[idx+1])runChain(idx+1);};
async function runCue(cue,offset){
if(!cue)return;
await engine.unlock();keepAwake();
if(cue.type==="audio"){
if(!cue.file){toast(t("toast.noFile"),"warn");return;}
try{await ensure(cue);}catch(e){toast(t("toast.loadFail"),"error");return;}
if(cue.stopOthers)engine.stopAll(cue.fadeOut||0);
var i=engine.play(cue,fileKey(cue.file),offset||0);
if(i)S.lastInst.set(cue.id,i.id);
}else if(cue.type==="fade")engine.fade(cue.target||"all",cue.fadeTo==null?-60:cue.fadeTo,cue.fadeTime||0,!!cue.stopAtEnd);
else if(cue.type==="stop")engine.stopCue(cue.target||"all",cue.fadeTime||0);
else if(cue.type==="wait"&&cue.cont==="follow")later(function(){var i=idxOf(cue.id);if(i>=0&&cues()[i+1])runChain(i+1);},(cue.wait||0)*1000);
renderRack();paintStates();
}
function runChain(i){if(!cues()[i]){toast(t("toast.end"),"warn",{ms:1200});return;}if(!S.clockStart)S.clockStart=Date.now();var c=cues()[i];S.standby=Math.min(i+1,cues().length);renderRows();renderStandby();renderInspector();runCue(c);if(c.cont==="continue"&&cues()[i+1])later(function(){runChain(i+1);},(c.delay||0)*1000);}
function go(){clearTimers();var b=$("#goBtn");b.classList.remove("fire");void b.offsetWidth;b.classList.add("fire");runChain(S.standby);}
function panic(){clearTimers();engine.stopAll(S.settings.panicFade);renderRack();paintStates();toast(t("toast.panic"),"warn");}
function setStandby(i){if(!cues().length)return;S.standby=clamp(i,0,cues().length-1);renderRows();renderStandby();renderInspector();var row=$('#cueBody tr[data-i="'+S.standby+'"]');if(row)row.scrollIntoView({block:"nearest"});}
function stepStandby(d){var vis=visibleIdx();if(!vis.length)return;var at=vis.indexOf(S.standby),next=at<0?vis[0]:vis[clamp(at+d,0,vis.length-1)];setStandby(next);}
async function keepAwake(){try{if("wakeLock" in navigator&&!S.wake){S.wake=await navigator.wakeLock.request("screen");S.wake.addEventListener("release",function(){S.wake=null;});}}catch(e){}}
$("#goBtn").onclick=go;$("#panicBtn").onclick=panic;
$("#stopAllBtn").onclick=function(){clearTimers();engine.stopAll(0);renderRack();paintStates();};
$("#pauseAllBtn").onclick=function(){engine.anyPaused()?engine.unpauseAll():engine.pauseAll();renderRack();paintStates();};
$("#prevBtn").onclick=function(){stepStandby(-1);};$("#nextBtn").onclick=function(){stepStandby(1);};
$("#topBtn").onclick=function(){clearTimers();S.clockStart=0;setStandby(0);};

/* ---------- rendering ---------- */
function renderAll(){renderShows();renderViews();renderRows();renderStandby();renderInspector();renderRack();applyI18n();applyStaticI18n();}
function renderViews(){
var built=[{id:"all",label:t("view.all"),v:{q:"",type:"all",flag:"any",sort:"order",dir:1}},{id:"audio",label:t("view.audio"),v:{q:"",type:"audio",flag:"any",sort:"order",dir:1}},{id:"hotkeys",label:t("view.hotkeys"),v:{q:"",type:"all",flag:"hotkey",sort:"order",dir:1}},{id:"loops",label:t("view.loops"),v:{q:"",type:"all",flag:"loop",sort:"order",dir:1}}],custom=S.settings.views.map(function(v){return Object.assign({},v,{custom:true});});
$("#views").innerHTML=built.concat(custom).map(function(v){return'<button class="chip '+(S.activeView===v.id?"on":"")+'" type="button" data-view="'+esc(v.id)+'">'+esc(v.label)+(v.custom?'<span class="x" data-delview="'+esc(v.id)+'">'+ic("close",11)+'</span>':"")+'</button>';}).join("");
var filtered=S.view.q||S.view.type!=="all"||S.view.flag!=="any"||S.view.sort!=="order";
$("#clearFilters").classList.toggle("hidden",!filtered);
$("#orderHint").classList.toggle("hidden",canReorder());
$("#search").value=S.view.q;$("#typeFilter").value=S.view.type;$("#flagFilter").value=S.view.flag;$("#sortBy").value=S.view.sort;
setUse($("#sortDir svg"),S.view.dir>0?"down":"up");
}
function applyView(v,id){S.view=Object.assign({},v);S.activeView=id;S.selected.clear();renderViews();renderRows();renderStandby();}
$("#views").onclick=async function(e){
var del=e.target.closest("[data-delview]");
if(del){e.stopPropagation();var id=del.getAttribute("data-delview");if(!await askConfirm(t("dlg.delView"),t("dlg.delViewBody")))return;S.settings.views=S.settings.views.filter(function(v){return v.id!==id;});saveSettings();if(S.activeView===id)S.activeView="";renderViews();toast(t("toast.viewDeleted"),"ok",{ms:1400});return;}
var b=e.target.closest("[data-view]");if(!b)return;
var id2=b.getAttribute("data-view"),built={all:{q:"",type:"all",flag:"any",sort:"order",dir:1},audio:{q:"",type:"audio",flag:"any",sort:"order",dir:1},hotkeys:{q:"",type:"all",flag:"hotkey",sort:"order",dir:1},loops:{q:"",type:"all",flag:"loop",sort:"order",dir:1}},cv=S.settings.views.find(function(v){return v.id===id2;}),found=built[id2]||(cv&&cv.v);
if(found)applyView(found,id2);
};
$("#saveView").onclick=async function(){var name=await askText(t("dlg.saveView"),t("dlg.viewName"));if(!name)return;var id="v"+uid();S.settings.views.push({id:id,label:name,v:Object.assign({},S.view)});S.activeView=id;saveSettings();renderViews();toast(t("toast.viewSaved"),"ok",{ms:1400});};
$("#clearFilters").onclick=function(){applyView({q:"",type:"all",flag:"any",sort:"order",dir:1},"all");};
var searchTimer;$("#search").oninput=function(e){var q=e.target.value;clearTimeout(searchTimer);searchTimer=setTimeout(function(){S.view.q=q;S.activeView="";renderViews();renderRows();},120);};
$("#typeFilter").onchange=function(e){S.view.type=e.target.value;S.activeView="";renderViews();renderRows();};
$("#flagFilter").onchange=function(e){S.view.flag=e.target.value;S.activeView="";renderViews();renderRows();};
$("#sortBy").onchange=function(e){S.view.sort=e.target.value;S.activeView="";renderViews();renderRows();};
$("#sortDir").onclick=function(){S.view.dir*=-1;renderViews();renderRows();};
function stateOf(c){if(c.type!=="audio"||!c.file)return"idle";return S.loadState.get(c.id)||(engine.buffers.has(fileKey(c.file))?"ready":"idle");}
function renderRows(){
var body=$("#cueBody");if(!S.show){body.innerHTML="";return;}
var vis=visibleIdx(),playing=engine.cueIds(),reorder=canReorder();
$("#emptyState").classList.toggle("hidden",vis.length>0);
$("#emptyText").textContent=cues().length?t("sheet.noMatch"):t("sheet.empty");
$("#rowCount").textContent=t("sheet.rows",{shown:vis.length,total:cues().length});
$("#selectAll").checked=vis.length>0&&vis.every(function(i){return S.selected.has(cues()[i].id);});
$("#bulkBar").classList.toggle("hidden",S.selected.size===0);
$("#bulkCount").textContent=t("bulk.count",{n:S.selected.size});
body.innerHTML=vis.map(function(i){
var c=cues()[i],st=stateOf(c),cls=["cue-row",i===S.standby?"standby":"",playing.has(c.id)?"playing":"",S.selected.has(c.id)?"selected":"",c.type==="memo"?"memo":""].join(" "),
sub=c.type==="audio"?(c.file?c.file.name:t("toast.noFile")):(c.notes||""),
cont=c.cont||"manual",typeIcon=c.type==="audio"?"wave":c.type==="fade"?"fade":c.type==="stop"?"stop":c.type==="wait"?"clock":"memo";
return'<tr class="'+cls+'" data-i="'+i+'" data-id="'+esc(c.id)+'" '+(reorder?'draggable="true"':"")+'><td class="col-check"><input type="checkbox" data-sel="'+esc(c.id)+'" '+(S.selected.has(c.id)?"checked":"")+'></td><td class="col-num"><div class="num-wrap">'+(reorder?'<span class="grip">'+ic("grip",13)+'</span>':"")+'<span class="num-box">'+String(i+1).padStart(2,"0")+'</span></div></td><td class="col-state"><span class="state-dot '+st+'" title="'+esc(t("cue."+st))+'"></span></td><td class="col-key">'+(c.hotkey?'<kbd>'+esc(c.hotkey.toUpperCase())+'</kbd>':"")+'</td><td class="col-type"><span class="type-tag '+c.type+'">'+ic(typeIcon,11)+t("type."+c.type)+'</span></td><td><span class="cue-name">'+esc(c.name||t("cue.untitled"))+(c.loop?" · "+t("insp.loop"):"")+'</span>'+(sub?'<span class="cue-sub">'+esc(sub)+'</span>':"")+'</td><td class="col-len"><span>'+(c.type==="memo"?"—":fmt(cueLen(c)))+'</span></td><td class="col-cont"><span class="'+cont+'">'+t("cont."+cont+".s")+'</span></td><td class="col-act"><button class="row-btn" type="button" data-act="play" title="'+esc(t("cue.preview"))+'">'+ic("play",12)+'</button></td></tr>';
}).join("");
}
function paintStates(){var playing=engine.cueIds();$$("#cueBody tr").forEach(function(tr){var c=cues()[+tr.getAttribute("data-i")];if(!c)return;tr.classList.toggle("playing",playing.has(c.id));var d=tr.querySelector(".state-dot");if(d){var st=stateOf(c);d.className="state-dot "+st;d.title=t("cue."+st);}});}
function renderStandby(){var c=cur();$("#standbyNum").textContent=c?String(S.standby+1).padStart(2,"0"):"—";$("#standbyName").textContent=c?(c.name||t("cue.untitled")):t("tx.end");$("#standbyMeta").textContent=c?(t("type."+c.type)+" · "+(c.type==="memo"?"—":fmt(cueLen(c)))+" · "+t("cont."+(c.cont||"manual"))):"";var paused=engine.anyPaused();setUse($("#pauseIcon"),paused?"play":"pause");$("#pauseLabel").textContent=paused?t("tx.resumeAll"):t("tx.pauseAll");}
var lastSelIdx=null;
$("#cueBody").addEventListener("click",function(e){
var tr=e.target.closest("tr");if(!tr)return;
var i=+tr.getAttribute("data-i"),id=tr.getAttribute("data-id");
if(e.target.matches("input[data-sel]")){
if(e.shiftKey&&lastSelIdx!==null){var vis=visibleIdx(),a=vis.indexOf(lastSelIdx),b=vis.indexOf(i);if(a>=0&&b>=0)vis.slice(Math.min(a,b),Math.max(a,b)+1).forEach(function(k){S.selected.add(cues()[k].id);});}
else if(e.target.checked)S.selected.add(id);else S.selected.delete(id);
lastSelIdx=i;renderRows();return;}
if(e.target.closest('[data-act="play"]')){runCue(cues()[i]);return;}
setStandby(i);
if(window.matchMedia("(max-width:1180px)").matches)openInspector();
});
$("#selectAll").onchange=function(e){visibleIdx().forEach(function(i){if(e.target.checked)S.selected.add(cues()[i].id);else S.selected.delete(cues()[i].id);});renderRows();};
$("#bulkClear").onclick=function(){S.selected.clear();renderRows();};
$("#bulkDelete").onclick=async function(){var idx=cues().map(function(c,i){return S.selected.has(c.id)?i:-1;}).filter(function(i){return i>=0;});if(!idx.length)return;if(S.settings.confirmDelete&&!await askConfirm(t("dlg.delBulk",{n:idx.length}),t("dlg.delBulkBody")))return;removeAt(idx);};
$("#bulkDuplicate").onclick=function(){var list=cues().filter(function(c){return S.selected.has(c.id);}).map(function(c){var x=clone(c);x.id=uid();x.name=(c.name||"")+t("cue.copySuffix");return x;});if(list.length){S.selected.clear();addCues(list);}};
var dragFrom=null;
$("#cueBody").addEventListener("dragstart",function(e){var tr=e.target.closest("tr");if(!tr||!canReorder()){e.preventDefault();return;}dragFrom=+tr.getAttribute("data-i");tr.classList.add("dragging");e.dataTransfer.effectAllowed="move";e.dataTransfer.setData("text/plain","cue");});
$("#cueBody").addEventListener("dragover",function(e){if(dragFrom===null)return;e.preventDefault();$$("#cueBody tr").forEach(function(r){r.classList.remove("dragover");});var tr=e.target.closest("tr");if(tr)tr.classList.add("dragover");});
$("#cueBody").addEventListener("drop",function(e){if(dragFrom===null)return;e.preventDefault();var tr=e.target.closest("tr");if(!tr)return;var to=+tr.getAttribute("data-i"),m=S.show.cues.splice(dragFrom,1)[0];S.show.cues.splice(to,0,m);S.standby=to;dragFrom=null;commit(true);renderAll();});
$("#cueBody").addEventListener("dragend",function(){dragFrom=null;$$("#cueBody tr").forEach(function(r){r.classList.remove("dragover","dragging");});});
var tw=$("#tableWrap");
tw.addEventListener("dragover",function(e){if(Array.from(e.dataTransfer.types).indexOf("Files")>=0){e.preventDefault();tw.classList.add("dragging");}});
tw.addEventListener("dragleave",function(e){if(e.target===tw)tw.classList.remove("dragging");});
tw.addEventListener("drop",function(e){tw.classList.remove("dragging");if(e.dataTransfer.files&&e.dataTransfer.files.length){e.preventDefault();if(S.store.mode==="local")attachLocalFiles(e.dataTransfer.files,null);else{toast(t("src.dropRepo"),"warn",{ms:4200});openPicker(null);}}});

/* ---------- inspector ---------- */
function field(label,inner,hint){return'<label class="field"><span class="field-label">'+esc(label)+(hint?' <span class="muted">'+esc(hint)+'</span>':"")+'</span>'+inner+'</label>';}
function num(k,v,step,min,max){return'<input type="number" data-k="'+k+'" value="'+(v==null?0:v)+'" step="'+(step||".1")+'" min="'+(min==null?"0":min)+'" max="'+(max==null?"9999":max)+'">';}
function slider(k,v,min,max,step,out){return'<div class="slider-row"><input type="range" data-k="'+k+'" value="'+(v==null?0:v)+'" min="'+min+'" max="'+max+'" step="'+step+'"><output>'+out+'</output></div>';}
function dbOut(v){return v+" dB";}
function panOut(v){return Number(v)===0?"C":v<0?"L"+Math.round(-v*100):"R"+Math.round(v*100);}
function section(label,icon){return'<div class="inspector-section">'+ic(icon,12)+esc(label)+'</div>';}
function renderInspector(){
var box=$("#inspBody"),c=cur();
if(S.waveRO){S.waveRO.disconnect();S.waveRO=null;}S.wave=null;
if(!c){box.innerHTML='<p class="hint-text">'+esc(t("insp.none"))+'</p>';return;}
var h='<div class="inspector-hero"><span class="n">'+String(S.standby+1).padStart(2,"0")+'</span><span class="t"><b>'+esc(c.name||t("cue.untitled"))+'</b><span class="hint-text">'+esc(t("type."+c.type))+(c.file?" · "+esc(c.file.name):"")+'</span></span></div>';
h+=field(t("insp.type"),'<select data-k="type">'+["audio","fade","stop","wait","memo"].map(function(x){return'<option value="'+x+'" '+(x===c.type?"selected":"")+'>'+esc(t("type."+x))+'</option>';}).join("")+'</select>');
h+=field(t("insp.name"),'<input type="text" data-k="name" value="'+esc(c.name)+'">');
h+=field(t("insp.hotkey"),'<input type="text" data-k="hotkey" maxlength="1" value="'+esc(c.hotkey)+'">',t("insp.hotkeyHint"));
if(c.type==="audio"){
h+=section(t("insp.source"),"wave");
h+='<div class="file-card '+(c.file?"":"missing")+'"><span>'+ic(c.file?(c.file.kind==="synth"?"synth":"wave"):"alert",16)+'</span><span class="ft"><b>'+esc(c.file?c.file.name:t("toast.noFile"))+'</b><span class="hint-text">'+esc(fileLabel(c.file))+(c.duration?" · "+fmt(c.duration):"")+'</span></span></div>';
if(c.file&&(c.file.kind==="repo"||c.file.kind==="url"))h+='<p class="hint-text mono source-path">'+esc(c.file.kind==="repo"?c.file.path:c.file.url)+'</p>';
h+='<div class="wave-box"><canvas id="waveCanvas"></canvas><div class="wave-meta"><span id="waveIn">0:00.0</span><span id="waveLen">'+fmt(cueLen(c))+'</span><span id="waveOut">'+fmt(c.duration||0)+'</span></div></div>';
h+='<p class="hint-text">'+esc(engine.buffers.has(fileKey(c.file))?t("insp.waveHint"):t("insp.noBuffer"))+'</p>';
h+='<div class="button-row"><button class="btn small primary" type="button" id="iPreview">'+ic("play",13)+esc(t("cue.preview"))+'</button><button class="btn small" type="button" id="iStop">'+ic("stop",13)+esc(t("cue.stop"))+'</button><button class="btn small" type="button" id="iLink">'+ic("link",13)+esc(t("src.link"))+'</button></div>';
h+=field(t("insp.synth"),'<select data-k="synth"><option value="">'+esc(t("insp.synthPick"))+'</option>'+SYNTHS.map(function(s){return'<option value="'+s.id+'" '+(c.file&&c.file.kind==="synth"&&c.file.synth===s.id?"selected":"")+'>'+esc(synthLabel(s.id))+'</option>';}).join("")+'</select>');
h+=section(t("insp.levels"),"meter");
h+=field(t("insp.volume"),slider("volume",c.volume,-60,6,1,dbOut(c.volume==null?0:c.volume)));
h+=field(t("insp.pan"),slider("pan",c.pan,-1,1,.05,panOut(c.pan==null?0:c.pan)));
h+='<div class="grid-2">'+field(t("insp.fadeIn"),num("fadeIn",c.fadeIn))+field(t("insp.fadeOut"),num("fadeOut",c.fadeOut))+'</div>';
h+=section(t("insp.trim"),"trim");
h+='<div class="grid-2">'+field(t("insp.trimIn"),num("trimIn",c.trimIn))+field(t("insp.trimOut"),num("trimOut",c.trimOut))+field(t("insp.rate"),num("rate",c.rate,".05",".25","4"))+'<label class="check"><input type="checkbox" data-k="loop" '+(c.loop?"checked":"")+'><span>'+esc(t("insp.loop"))+'</span></label></div>';
h+='<label class="check"><input type="checkbox" data-k="stopOthers" '+(c.stopOthers?"checked":"")+'><span>'+esc(t("insp.stopOthers"))+'</span></label>';
}
if(c.type==="fade"||c.type==="stop"){
h+=section(t("insp.target"),"link");
var opts=['<option value="all" '+(c.target==="all"?"selected":"")+'>'+esc(t("insp.targetAll"))+'</option>'].concat(cues().map(function(x,i){return x.type!=="audio"?"":'<option value="'+x.id+'" '+(c.target===x.id?"selected":"")+'>'+(i+1)+" · "+esc(x.name||t("cue.untitled"))+'</option>';}));
h+=field(t("insp.target"),'<select data-k="target">'+opts.join("")+'</select>');
if(c.type==="fade"){h+=field(t("insp.fadeTo"),slider("fadeTo",c.fadeTo,-60,6,1,dbOut(c.fadeTo==null?-60:c.fadeTo)));h+=field(t("insp.fadeTime"),num("fadeTime",c.fadeTime));h+='<label class="check"><input type="checkbox" data-k="stopAtEnd" '+(c.stopAtEnd?"checked":"")+'><span>'+esc(t("insp.stopAtEnd"))+'</span></label>';}
else h+=field(t("insp.fadeTime"),num("fadeTime",c.fadeTime));
}
if(c.type==="wait"){h+=section(t("insp.wait"),"clock");h+=field(t("insp.wait"),num("wait",c.wait));}
h+=section(t("insp.cont"),"down");
h+=field(t("insp.cont"),'<select data-k="cont">'+["manual","follow","continue"].map(function(x){return'<option value="'+x+'" '+(c.cont===x?"selected":"")+'>'+esc(t("cont."+x))+'</option>';}).join("")+'</select>');
if(c.cont==="continue")h+=field(t("insp.delay"),num("delay",c.delay));
h+=field(t("insp.notes"),'<textarea data-k="notes" rows="3">'+esc(c.notes)+'</textarea>');
box.innerHTML=h;
if(c.type==="audio"){
$("#iPreview").onclick=function(){runCue(c);};
$("#iStop").onclick=function(){engine.stopCue(c.id,c.fadeOut||0);renderRack();paintStates();};
$("#iLink").onclick=function(){openPicker(c);};
setupWave(c);
}
}
function outText(k,v){return k==="volume"||k==="fadeTo"?dbOut(v):k==="pan"?panOut(v):String(v);}
$("#inspBody").addEventListener("input",function(e){
var k=e.target.getAttribute("data-k"),c=cur();if(!k||!c)return;
var v;
if(e.target.type==="checkbox")v=e.target.checked;
else if(e.target.type==="number"||e.target.type==="range"){v=parseFloat(e.target.value);if(!isFinite(v))v=0;}
else v=e.target.value;
if(k==="type"){var keep={id:c.id,name:c.name,hotkey:c.hotkey,notes:c.notes,cont:c.cont,delay:c.delay};S.show.cues[S.standby]=Object.assign(mk(v),keep);commit(true);renderAll();return;}
if(k==="hotkey"){v=v.slice(-1).toUpperCase();if(v&&(/\s/.test(v)||!/^[\w\d]$/.test(v))){toast(t("toast.hotkeyReserved"),"warn");v="";}else if(v&&cues().some(function(x){return x.id!==c.id&&(x.hotkey||"").toUpperCase()===v;})){toast(t("toast.hotkeyReserved"),"warn");v="";}e.target.value=v;}
if(k==="synth"){if(!v)return;var d=SYNTHS.find(function(s){return s.id===v;});c.file=snd(v,d.sec);c.duration=d.sec;c.trimIn=0;c.trimOut=0;commit(true);ensure(c).then(function(){renderInspector();}).catch(function(){});renderRows();return;}
c[k]=v;
var out=e.target.parentElement.querySelector("output");if(out)out.textContent=outText(k,v);
if(k==="volume")engine.setCueDb(c.id,v);
if(["trimIn","trimOut","rate","loop"].includes(k))drawWave(true);
commit();renderRows();renderStandby();
if(k==="cont")renderInspector();
if(k==="name"){var hb=$(".inspector-hero .t b");if(hb)hb.textContent=c.name||t("cue.untitled");}
});

/* ---------- waveform ---------- */
function setupWave(cue){
var cv=$("#waveCanvas");if(!cv)return;
var key=fileKey(cue.file),W={cv:cv,ctx:cv.getContext("2d"),cue:cue,key:key,cache:null,drag:null,w:0,h:0};S.wave=W;
function resize(){var dpr=Math.min(2,window.devicePixelRatio||1),r=cv.getBoundingClientRect();W.w=Math.max(80,r.width);W.h=100;cv.width=Math.round(W.w*dpr);cv.height=Math.round(W.h*dpr);W.ctx.setTransform(dpr,0,0,dpr,0,0);W.cache=null;drawWave(true);}
if(window.ResizeObserver){S.waveRO=new ResizeObserver(resize);S.waveRO.observe(cv);}
resize();
if(cue.file&&!engine.buffers.has(key))ensure(cue).then(function(){if(S.wave===W){W.cache=null;drawWave(true);}}).catch(function(){});
function pos(e){var r=cv.getBoundingClientRect();return clamp((e.clientX-r.left)/r.width,0,1);}
cv.addEventListener("pointerdown",function(e){var buf=engine.buffers.get(key);if(!buf)return;var p=pos(e)*buf.duration,inT=cue.trimIn||0,outT=cue.trimOut>0?cue.trimOut:buf.duration,tol=buf.duration*.025+.05;W.drag=Math.abs(p-inT)<=tol?"in":Math.abs(p-outT)<=tol?"out":null;cv.setPointerCapture(e.pointerId);if(!W.drag)W.audition=p;});
cv.addEventListener("pointermove",function(e){if(!W.drag)return;var buf=engine.buffers.get(key);if(!buf)return;var p=pos(e)*buf.duration;if(W.drag==="in")cue.trimIn=clamp(p,0,(cue.trimOut>0?cue.trimOut:buf.duration)-.05);else cue.trimOut=clamp(p,(cue.trimIn||0)+.05,buf.duration);var iIn=$('input[data-k="trimIn"]'),iOut=$('input[data-k="trimOut"]');if(iIn)iIn.value=cue.trimIn.toFixed(2);if(iOut)iOut.value=cue.trimOut.toFixed(2);drawWave(true);renderRows();});
function end(e){if(W.drag){W.drag=null;commit(true);renderStandby();}else if(W.audition!=null){var buf=engine.buffers.get(key);if(buf)runCue(cue,Math.max(0,W.audition-(cue.trimIn||0)));W.audition=null;}try{cv.releasePointerCapture(e.pointerId);}catch(err){}}
cv.addEventListener("pointerup",end);
cv.addEventListener("pointercancel",function(){W.drag=null;W.audition=null;});
}
function drawWave(rebuild){
var W=S.wave;if(!W)return;
var ctx=W.ctx,w=W.w,h=W.h,cue=W.cue,key=W.key,buf=engine.buffers.get(key);
if(rebuild||!W.cache){
var off=document.createElement("canvas"),dpr=Math.min(2,window.devicePixelRatio||1);
off.width=Math.round(w*dpr);off.height=Math.round(h*dpr);
var o=off.getContext("2d");o.setTransform(dpr,0,0,dpr,0,0);
o.fillStyle="#0c1014";o.fillRect(0,0,w,h);
o.strokeStyle="#232a33";o.lineWidth=1;
for(var i=1;i<8;i++){var x=Math.round(w*i/8)+.5;o.beginPath();o.moveTo(x,0);o.lineTo(x,h);o.stroke();}
o.strokeStyle="#2c343e";o.beginPath();o.moveTo(0,h/2+.5);o.lineTo(w,h/2+.5);o.stroke();
if(buf){var pk=engine.peaksFor(key,buf),N=pk.length/2;o.fillStyle="#6fb3b8";for(var xx=0;xx<w;xx++){var ii=Math.min(N-1,Math.floor(xx/w*N)),mn=pk[ii*2],mx=pk[ii*2+1],y1=h/2-mx*(h/2-6),y2=h/2-mn*(h/2-6);o.fillRect(xx,y1,1,Math.max(1.2,y2-y1));}}
else{o.fillStyle="#6b7480";o.font="11px system-ui";o.textAlign="center";o.fillText(t("insp.noBuffer"),w/2,h/2+4);}
W.cache=off;
}
ctx.clearRect(0,0,w,h);ctx.drawImage(W.cache,0,0,w,h);
if(buf){
var inX=(cue.trimIn||0)/buf.duration*w,outX=(cue.trimOut>0?cue.trimOut:buf.duration)/buf.duration*w;
ctx.fillStyle="rgba(12,16,20,.66)";ctx.fillRect(0,0,inX,h);ctx.fillRect(outX,0,w-outX,h);
ctx.fillStyle="rgba(217,164,65,.12)";ctx.fillRect(inX,0,outX-inX,h);
ctx.fillStyle="#d9a441";ctx.fillRect(inX-1,0,2,h);ctx.fillRect(outX-1,0,2,h);
ctx.fillRect(inX-1,0,8,3);ctx.fillRect(outX-7,0,8,3);ctx.fillRect(inX-1,h-3,8,3);ctx.fillRect(outX-7,h-3,8,3);
var inst=engine.list(cue.id)[0];
if(inst){var info=engine.info(inst),px=((cue.trimIn||0)+info.pos)/buf.duration*w;ctx.fillStyle="#e6e3dd";ctx.fillRect(px-1,0,2,h);}
var wi=$("#waveIn"),wl=$("#waveLen"),wo=$("#waveOut");
if(wi)wi.textContent=fmt(cue.trimIn||0);
if(wl)wl.textContent=fmt(cueLen(cue));
if(wo)wo.textContent=fmt(cue.trimOut>0?cue.trimOut:buf.duration);
}
}

/* ---------- live rack ---------- */
var rackSig="";
function renderRack(){
var list=engine.list(),sig=list.map(function(i){return i.id+(i.paused?"p":"");}).join(",");
if(sig===rackSig){renderStandby();return;}
rackSig=sig;var box=$("#rack");
if(!list.length){box.innerHTML='<div class="rack-empty">'+esc(t("tx.rackEmpty"))+'</div>';renderStandby();return;}
box.innerHTML=list.map(function(i){var n=idxOf(i.cueId);return'<div class="channel-card '+(i.paused?"paused":"")+'" data-id="'+i.id+'"><div class="channel-top"><span class="cn">'+(n>=0?String(n+1).padStart(2,"0"):"--")+'</span><span class="nm">'+esc(i.name||t("cue.untitled"))+'</span><span class="tm"></span></div><div class="progress"><i></i></div><div class="level"><i></i></div><div class="channel-controls"><input type="range" min="-60" max="6" step="1" value="'+i.targetDb+'" data-act="vol"><button class="row-btn" type="button" data-act="pause">'+ic(i.paused?"play":"pause",11)+'</button><button class="row-btn" type="button" data-act="stop">'+ic("stop",11)+'</button></div></div>';}).join("");
renderStandby();
}
$("#rack").addEventListener("input",function(e){if(e.target.getAttribute("data-act")!=="vol")return;engine.setDb(e.target.closest(".channel-card").getAttribute("data-id"),parseFloat(e.target.value));});
$("#rack").addEventListener("click",function(e){var b=e.target.closest("[data-act]");if(!b||b.getAttribute("data-act")==="vol")return;var id=b.closest(".channel-card").getAttribute("data-id"),i=engine.instances.get(id);if(b.getAttribute("data-act")==="pause")engine.toggle(id);if(b.getAttribute("data-act")==="stop")engine.stop(id,i?i.fadeOut:0);rackSig="";renderRack();paintStates();});

/* ---------- loop ---------- */
var meterSmooth=0,lastFrame=0;
function loop(ts){
requestAnimationFrame(loop);
if(!S.store)return;
if(ts-lastFrame<32)return;lastFrame=ts;
$$("#rack .channel-card").forEach(function(el){var i=engine.instances.get(el.getAttribute("data-id"));if(!i)return;var info=engine.info(i);el.querySelector(".tm").textContent=fmt(info.pos)+" / "+fmt(info.region);el.querySelector(".progress i").style.width=(info.region?info.pos/info.region*100:0)+"%";el.querySelector(".level i").style.width=Math.min(100,engine.peakOf(i)*118)+"%";});
var cv=$("#meterCanvas"),c2=cv.getContext("2d"),lv=engine.level();
meterSmooth=Math.max(lv,meterSmooth*.86);
c2.clearRect(0,0,cv.width,cv.height);c2.fillStyle="#4caf7d";c2.fillRect(0,0,cv.width*Math.min(1,meterSmooth),cv.height);
if(S.wave&&engine.list(S.wave.cue.id).length)drawWave(false);
}

/* ---------- inspector drawer / settings ---------- */
function openInspector(){$("#inspector").classList.add("open");$("#inspScrim").classList.remove("hidden");}
function closeInspector(){$("#inspector").classList.remove("open");$("#inspScrim").classList.add("hidden");}
$("#inspectorToggle").onclick=openInspector;$("#inspClose").onclick=closeInspector;$("#inspScrim").onclick=closeInspector;
async function openSettings(){$("#setLang").value=getLang();$("#setPanic").value=S.settings.panicFade;$("#setSpace").checked=S.settings.spaceGo;$("#setConfirm").checked=S.settings.confirmDelete;$("#setMotion").checked=S.settings.motion;$("#setAutoLock").value=S.settings.autoLockMin;$("#settings").classList.remove("hidden");await fillDevices();}
function closeSettings(){$("#settings").classList.add("hidden");}
$("#settingsBtn").onclick=openSettings;$("#closeSettings").onclick=closeSettings;$("#closeSettings2").onclick=closeSettings;
$("#settings").addEventListener("click",function(e){if(e.target.id==="settings")closeSettings();});
async function fillDevices(){var sel=$("#setOutput"),devs=[];try{devs=(await navigator.mediaDevices.enumerateDevices()).filter(function(d){return d.kind==="audiooutput";});}catch(e){}sel.innerHTML='<option value="default">'+esc(t("set.default"))+'</option>'+devs.filter(function(d){return d.deviceId!=="default";}).map(function(d){return'<option value="'+esc(d.deviceId)+'">'+esc(d.label||d.deviceId.slice(0,10))+'</option>';}).join("");sel.value=S.settings.output;}
$("#refreshDev").onclick=async function(){try{var s=await navigator.mediaDevices.getUserMedia({audio:true});s.getTracks().forEach(function(x){x.stop();});}catch(e){}fillDevices();};
$("#setOutput").onchange=async function(e){try{await engine.setOutput(e.target.value);S.settings.output=e.target.value;saveSettings();}catch(err){toast(t("toast.deviceFail"),"error");e.target.value=S.settings.output;}};
$("#setLang").onchange=function(e){S.settings.lang=e.target.value;setLang(e.target.value);saveSettings();applyI18n();applyStaticI18n();fillLangs();renderAll();fillDevices();renderMute();$("#syncText").textContent=S.store&&S.store.mode==="cloud"?t("rail.sync.cloud"):t("rail.sync.local");$("#accountInfo").textContent=S.store&&S.store.mode==="cloud"?(S.store.user.email||""):t("lock.local");$("#sourceNote").textContent=ST.storageEnabled()?t("src.cloudNote"):t("src.repoNote");};
$("#setPanic").onchange=function(e){S.settings.panicFade=clamp(parseFloat(e.target.value)||0,0,30);saveSettings();};
$("#setSpace").onchange=function(e){S.settings.spaceGo=e.target.checked;saveSettings();};
$("#setConfirm").onchange=function(e){S.settings.confirmDelete=e.target.checked;saveSettings();};
$("#setMotion").onchange=function(e){S.settings.motion=e.target.checked;document.body.classList.toggle("no-motion",!e.target.checked);saveSettings();};
$("#setAutoLock").onchange=function(e){S.settings.autoLockMin=Math.max(0,parseInt(e.target.value)||0);saveSettings();};
$("#changePass").onclick=async function(){var p=$("#newPass").value;if(p.length<4){toast(t("lock.err.passShort"),"warn");return;}try{if(S.store.mode==="cloud"){if(p.length<6)throw new Error("short");await S.store.fb.auth.currentUser.updatePassword(p);}else await ST.localSetPasscode(p);$("#newPass").value="";toast(t("set.passOk"),"ok");}catch(e){toast(t("toast.passFail"),"error");}};
$("#signOut").onclick=async function(){closeSettings();await endSession();toast(t("toast.locked"),"ok");};
$("#lockBtn").onclick=async function(){if(!await askConfirm(t("dlg.lock"),t("dlg.lockBody")))return;await endSession();toast(t("toast.locked"),"ok");};
$("#masterFader").addEventListener("input",function(e){var v=parseInt(e.target.value);engine.setMasterDb(v);$("#masterVal").textContent=v+" dB";S.settings.masterDb=v;saveSettings();});
$("#muteBtn").onclick=function(){S.settings.muted=!S.settings.muted;engine.setMuted(S.settings.muted);renderMute();saveSettings();};

/* ---------- export / import ---------- */
$("#exportBtn").onclick=function(){if(!S.show)return;var blob=new Blob([JSON.stringify({app:"drama-cue",version:4,name:S.show.name,cues:S.show.cues},null,2)],{type:"application/json"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=S.show.name+".dramacue.json";a.click();setTimeout(function(){URL.revokeObjectURL(a.href);},1000);toast(t("toast.exported"),"ok");};
$("#importBtn").onclick=function(){$("#importInput").click();};
$("#importInput").onchange=async function(e){var f=e.target.files[0];e.target.value="";if(!f)return;try{var d=JSON.parse(await f.text()),list=(d.cues||[]).map(function(c){return Object.assign(mk(c.type||"memo"),c,{id:uid()});}),map=new Map((d.cues||[]).map(function(c,i){return[c.id,list[i].id];}));list.forEach(function(c){if(c.target&&c.target!=="all")c.target=map.get(c.target)||"all";});var id=await S.store.create(d.name||f.name.replace(/\.json$/i,""),list);openShow(id);toast(t("toast.imported"),"ok");}catch(err){toast(t("toast.loadFail"),"error");}};

/* ---------- keyboard ---------- */
document.addEventListener("keydown",function(e){
S.lastActivity=Date.now();
if(!S.store||!S.show)return;
if(!$("#dialog").classList.contains("hidden"))return;
if(!$("#picker").classList.contains("hidden")){if(e.key==="Escape")closePicker();return;}
if(!$("#settings").classList.contains("hidden")){if(e.key==="Escape")closeSettings();return;}
if(!$("#setup").classList.contains("hidden")){if(e.key==="Escape")$("#setup").classList.add("hidden");return;}
if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="z"){if(S.undo){e.preventDefault();var f=S.undo;S.undo=null;$("#toast").classList.remove("show");f();}return;}
if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="f"){e.preventDefault();$("#search").focus();$("#search").select();return;}
if(e.key==="Escape"){e.preventDefault();panic();return;}
var tag=(e.target.tagName||"").toLowerCase();
if(["input","textarea","select"].includes(tag)||e.target.isContentEditable)return;
if(e.code==="Space"){e.preventDefault();if(S.settings.spaceGo)go();return;}
if(e.key==="ArrowDown"){e.preventDefault();stepStandby(1);return;}
if(e.key==="ArrowUp"){e.preventDefault();stepStandby(-1);return;}
if(e.key==="Delete"||e.key==="Backspace"){e.preventDefault();deleteStandby();return;}
if(e.ctrlKey||e.metaKey||e.altKey)return;
var k=(e.key||"").toUpperCase();if(k.length!==1)return;
var c=cues().find(function(x){return(x.hotkey||"").toUpperCase()===k;});
if(c){e.preventDefault();runCue(c);}
});
document.addEventListener("pointerdown",function(){S.lastActivity=Date.now();if(S.store)engine.unlock();},{passive:true});
setInterval(function(){if(!S.store||!S.settings.autoLockMin)return;if(Date.now()-S.lastActivity>S.settings.autoLockMin*60000){endSession();toast(t("toast.locked"),"warn");}},20000);
window.addEventListener("beforeunload",function(){if(S.dirty)commit(true);});

/* ---------- lock screen ---------- */
function refreshLocalGate(){var exists=ST.localGateExists();$("#lNewWrap").classList.toggle("hidden",exists);$("#lPass2").required=!exists;$("#lSubmitLabel").textContent=exists?t("lock.enter"):t("lock.create");$("#lHint").textContent=exists?t("lock.existingHint"):t("lock.newHint");$("#lPass").value="";$("#lPass2").value="";$("#lErr").textContent="";}
function setTab(which){var cloud=which==="cloud";$("#tabCloud").classList.toggle("on",cloud);$("#tabLocal").classList.toggle("on",!cloud);$("#cloudForm").classList.toggle("hidden",!cloud);$("#localForm").classList.toggle("hidden",cloud);if(!cloud)refreshLocalGate();}
function wireLock(){
var ok=ST.cloudConfigured();
$("#tabCloud").disabled=!ok;
$("#cErr").textContent=ok?"":t("lock.noCloud");
$("#tabCloud").onclick=function(){setTab("cloud");};
$("#tabLocal").onclick=function(){setTab("local");};
setTab(ok?"cloud":"local");
$("#lockLang").onchange=function(e){setLang(e.target.value);applyI18n();applyStaticI18n();fillLangs();refreshLocalGate();};
$("#cloudForm").onsubmit=async function(e){
e.preventDefault();var err=$("#cErr");err.textContent="";
if(!ok){err.textContent=t("lock.noCloud");return;}
var btn=$("#cSubmit");btn.disabled=true;
try{var store=new ST.CloudStore(null);var user=await store.signIn($("#cEmail").value.trim(),$("#cPass").value,$("#cRemember").checked);store.user=user;await engine.unlock();localStorage.setItem("dc.cloud.persist","1");await startSession(store);}
catch(ex){var c=ex.code||"";err.textContent=/network/.test(c)?t("lock.err.net"):/too-many/.test(c)?t("lock.err.many"):/load/.test(ex.message||"")?t("toast.cloudFail"):t("lock.err.auth");}
finally{btn.disabled=false;}
};
$("#localForm").onsubmit=async function(e){
e.preventDefault();var err=$("#lErr");err.textContent="";
var p=$("#lPass").value;
if(p.length<4){err.textContent=t("lock.err.passShort");return;}
if(ST.localGateExists()){if(!await ST.localVerify(p)){err.textContent=t("lock.err.pass");return;}}
else{if(p!==$("#lPass2").value){err.textContent=t("lock.err.pass2");return;}await ST.localSetPasscode(p);}
ST.localSession(true,$("#lKeep").checked);
await engine.unlock();
await startSession(new ST.LocalStore());
};
}
function copyText(text){if(navigator.clipboard&&navigator.clipboard.writeText)return navigator.clipboard.writeText(text);return new Promise(function(res){var ta=document.createElement("textarea");ta.value=text;document.body.appendChild(ta);ta.select();document.execCommand("copy");ta.remove();res();});}
function wireSetup(){
$("#setupBtn").onclick=function(){$("#setup").classList.remove("hidden");};
$("#closeSetup").onclick=function(){$("#setup").classList.add("hidden");};
$("#closeSetup2").onclick=function(){$("#setup").classList.add("hidden");};
$("#setup").addEventListener("click",function(e){if(e.target.id==="setup")$("#setup").classList.add("hidden");});
$("#fsRules").textContent=FS_RULES;
$("#copyFs").onclick=function(){copyText(FS_RULES).then(function(){toast(t("toast.copied"),"ok");});};
}
function applyStaticI18n(){
applyI18n();
$("#search").placeholder=t("sheet.search");
var tf=$("#typeFilter"),tfKeys=["filter.all","type.audio","type.fade","type.stop","type.wait","type.memo"];
Array.from(tf.options).forEach(function(o,i){o.textContent=t(tfKeys[i]);});
var ff=$("#flagFilter"),ffKeys=["flag.any","flag.hotkey","flag.loop","flag.error"];
Array.from(ff.options).forEach(function(o,i){o.textContent=t(ffKeys[i]);});
var sb=$("#sortBy"),sbKeys=["sort.order","sort.name","sort.type","sort.len"];
Array.from(sb.options).forEach(function(o,i){o.textContent=t(sbKeys[i]);});
var at=$("#addType"),atKeys=["type.audio","type.fade","type.stop","type.wait","type.memo"];
Array.from(at.options).forEach(function(o,i){o.textContent=t(atKeys[i]);});
}
function boot(){
setLang(getLang());applyStaticI18n();fillLangs();wireLock();wireSetup();renderMute();renderRack();
requestAnimationFrame(loop);
if(ST.localSessionActive())startSession(new ST.LocalStore());
else if(ST.cloudConfigured()&&localStorage.getItem("dc.cloud.persist")==="1"){
ST.loadFirebase().then(function(fb){fb.auth.onAuthStateChanged(function(user){if(user&&!S.store&&!ST.localSessionActive())startSession(new ST.CloudStore(user));});}).catch(function(){$("#cErr").textContent=t("toast.cloudFail");});
}
}
try{boot();}catch(e){document.body.insertAdjacentHTML("beforeend",'<div class="fatal-note">Drama Cue failed to start: '+esc(e.message)+'</div>');}
})();
