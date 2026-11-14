window.DC = window.DC || {};
(function(DC){
"use strict";
var SYNTHS=[
{id:"rain",sec:9,en:"Rain ambience",zh:"雨聲環境"},
{id:"thunder",sec:5,en:"Thunder clap",zh:"雷聲"},
{id:"wind",sec:7,en:"Wind gust",zh:"風聲"},
{id:"knock",sec:2,en:"Door knocks",zh:"敲門聲"},
{id:"phone",sec:3.4,en:"Telephone bell",zh:"電話鈴聲"},
{id:"ticks",sec:8,en:"Clock ticking",zh:"時鐘滴答"},
{id:"heart",sec:4.4,en:"Heartbeat",zh:"心跳"},
{id:"applause",sec:8,en:"Applause",zh:"掌聲"},
{id:"chime",sec:5,en:"Stage chime",zh:"鐘聲"},
{id:"whoosh",sec:2.6,en:"Transition whoosh",zh:"轉場呼聲"}
];
function synthLabel(id){var s=SYNTHS.find(function(x){return x.id===id;});return s?(DC.i18n.getLang()==="zh-HK"?s.zh:s.en):id;}
function rng(seed){var s=seed>>>0||1;return function(){s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296;};}
function noise(ctx,sec,seed){var b=ctx.createBuffer(1,Math.max(1,Math.ceil(sec*44100)),44100),d=b.getChannelData(0),r=rng(seed);for(var i=0;i<d.length;i++)d[i]=r()*2-1;return b;}
function srcN(ctx,buf,loop){var s=ctx.createBufferSource();s.buffer=buf;s.loop=!!loop;return s;}
function filt(ctx,type,f,q){var b=ctx.createBiquadFilter();b.type=type;b.frequency.value=f;b.Q.value=q||1;return b;}
function gainN(ctx,v){var g=ctx.createGain();g.gain.value=v||0;return g;}
function env(g,pts){g.gain.setValueAtTime(Math.max(.0001,pts[0][1]),pts[0][0]);for(var i=1;i<pts.length;i++)g.gain.linearRampToValueAtTime(Math.max(.0001,pts[i][1]),pts[i][0]);}
function chain(){for(var i=0;i<arguments.length-1;i++)arguments[i].connect(arguments[i+1]);return arguments[arguments.length-1];}
function renderSynth(id,seconds){
var def=SYNTHS.find(function(s){return s.id===id;})||SYNTHS[0],dur=Math.max(.4,Math.min(30,seconds||def.sec)),OAC=window.OfflineAudioContext||window.webkitOfflineAudioContext,ctx=new OAC(2,Math.ceil(dur*44100),44100),out=gainN(ctx,.9),N=noise(ctx,Math.max(dur,3),1337);out.connect(ctx.destination);
if(id==="rain"){var s=srcN(ctx,N,true),lp=filt(ctx,"lowpass",2100,.6),hp=filt(ctx,"highpass",260,.7),g=gainN(ctx);chain(s,hp,lp,g,out);env(g,[[0,0],[.5,.5],[dur-.6,.5],[dur,0]]);var s2=srcN(ctx,N,true),bp=filt(ctx,"bandpass",5200,.9),g2=gainN(ctx);chain(s2,bp,g2,out);env(g2,[[0,0],[.7,.14],[dur-.6,.14],[dur,0]]);s.start(0);s2.start(0);}
else if(id==="thunder"){var s=srcN(ctx,N),lp=filt(ctx,"lowpass",900,.9),g=gainN(ctx);chain(s,lp,g,out);lp.frequency.setValueAtTime(1100,0);lp.frequency.exponentialRampToValueAtTime(110,dur);env(g,[[0,0],[.03,.95],[.35,.55],[dur*.55,.3],[dur,0]]);var c=srcN(ctx,N),chp=filt(ctx,"highpass",1800,.8),cg=gainN(ctx);chain(c,chp,cg,out);env(cg,[[0,0],[.008,.55],[.22,.05],[.4,0]]);var sub=ctx.createOscillator(),sg=gainN(ctx);sub.type="sine";sub.frequency.setValueAtTime(58,0);sub.frequency.exponentialRampToValueAtTime(34,dur);chain(sub,sg,out);env(sg,[[0,0],[.05,.6],[dur,0]]);s.start(0);c.start(0);sub.start(0);sub.stop(dur);}
else if(id==="wind"){var s=srcN(ctx,N,true),bp=filt(ctx,"bandpass",520,1.4),g=gainN(ctx);chain(s,bp,g,out);bp.frequency.setValueAtTime(300,0);bp.frequency.linearRampToValueAtTime(1150,dur*.42);bp.frequency.linearRampToValueAtTime(340,dur);env(g,[[0,0],[dur*.4,.72],[dur*.72,.4],[dur,0]]);s.start(0);}
else if(id==="knock"){[0,.32,.64].forEach(function(tt,i){var s=srcN(ctx,N),bp=filt(ctx,"bandpass",1500,1.1),g=gainN(ctx);chain(s,bp,g,out);env(g,[[tt,0],[tt+.004,.7-i*.06],[tt+.07,0]]);s.start(tt);s.stop(tt+.12);var o=ctx.createOscillator(),og=gainN(ctx);o.type="sine";o.frequency.setValueAtTime(180,tt);o.frequency.exponentialRampToValueAtTime(72,tt+.14);chain(o,og,out);env(og,[[tt,0],[tt+.005,.85],[tt+.2,0]]);o.start(tt);o.stop(tt+.25);});}
else if(id==="phone"){[[0,1],[1.45,2.45]].forEach(function(pair){var a=pair[0],b=pair[1];[1040,1390].forEach(function(f,k){var o=ctx.createOscillator(),g=gainN(ctx);o.type="triangle";o.frequency.value=f;chain(o,g,out);env(g,[[a,0],[a+.02,k?.2:.3],[b-.03,k?.2:.3],[b,0]]);var tr=ctx.createOscillator(),tg=gainN(ctx,k?.1:.15);tr.type="sine";tr.frequency.value=23;chain(tr,tg);tg.connect(g.gain);tr.start(a);tr.stop(b);o.start(a);o.stop(b);});});}
else if(id==="ticks"){for(var tt=0;tt<dur-.05;tt+=1){var s=srcN(ctx,N),hp=filt(ctx,"highpass",2600,.8),g=gainN(ctx);chain(s,hp,g,out);env(g,[[tt,0],[tt+.002,.5],[tt+.03,0]]);s.start(tt);s.stop(tt+.05);var o=ctx.createOscillator(),og=gainN(ctx);o.type="square";o.frequency.value=2300;chain(o,og,out);env(og,[[tt,0],[tt+.001,.16],[tt+.014,0]]);o.start(tt);o.stop(tt+.03);}}
else if(id==="heart"){for(var c=0;c<dur;c+=1.1){[[c,.9],[c+.29,.6]].forEach(function(p){var tt=p[0],a=p[1];if(tt>dur-.25)return;var o=ctx.createOscillator(),g=gainN(ctx),lp=filt(ctx,"lowpass",180,.7);o.type="sine";o.frequency.setValueAtTime(72,tt);o.frequency.exponentialRampToValueAtTime(38,tt+.2);chain(o,lp,g,out);env(g,[[tt,0],[tt+.012,a],[tt+.24,0]]);o.start(tt);o.stop(tt+.3);});}}
else if(id==="applause"){var len=Math.ceil(dur*44100),b=ctx.createBuffer(2,len,44100),r=rng(90210);for(var ch=0;ch<2;ch++){var d=b.getChannelData(ch);for(var k=0;k<1500;k++){var at=Math.floor(r()*len),amp=.18+r()*.5,decay=220+Math.floor(r()*700);for(var j=0;j<decay&&at+j<len;j++)d[at+j]+=(r()*2-1)*amp*Math.exp(-j/(decay*.28));}}var s=ctx.createBufferSource();s.buffer=b;var bp=filt(ctx,"bandpass",2400,.55),g=gainN(ctx);chain(s,bp,g,out);env(g,[[0,0],[1.1,.5],[dur-1.8,.45],[dur,0]]);s.start(0);}
else if(id==="chime"){var base=330;[[1,.5,4.2],[2.76,.28,2.6],[5.4,.16,1.6],[8.9,.09,1]].forEach(function(p){var o=ctx.createOscillator(),g=gainN(ctx);o.type="sine";o.frequency.value=base*p[0];chain(o,g,out);g.gain.setValueAtTime(.0001,0);g.gain.linearRampToValueAtTime(p[1],.006);g.gain.exponentialRampToValueAtTime(.0001,Math.min(dur,p[2]));o.start(0);o.stop(dur);});}
else{var s=srcN(ctx,N),bp=filt(ctx,"bandpass",300,1.1),g=gainN(ctx);chain(s,bp,g,out);bp.frequency.setValueAtTime(260,0);bp.frequency.exponentialRampToValueAtTime(6200,dur*.62);bp.frequency.exponentialRampToValueAtTime(420,dur);env(g,[[0,0],[dur*.55,.8],[dur,0]]);s.start(0);}
return ctx.startRendering();
}
DC.synth={SYNTHS:SYNTHS,synthLabel:synthLabel,renderSynth:renderSynth};
})(window.DC);
