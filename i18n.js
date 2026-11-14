window.DC = window.DC || {};
(function(DC){
"use strict";
var lang = localStorage.getItem("dc.lang") || "en";

var en = {
"close":"Close","ok":"OK","cancel":"Cancel","confirm":"Confirm","undo":"Undo","delete":"Delete","duplicate":"Duplicate",

"lock.lede":"A sound cue desk for theatre. Standby, GO, fade, and stop from one keyboard.",
"lock.p1":"Audio, fade, stop, wait and memo cues",
"lock.p2":"Per-cue level, pan, trim and live fades",
"lock.p3":"Firestore sync, audio served from the repository",
"lock.p4":"Password locked for internal use",
"lock.foot":"Internal use only. Sound plays only when you press GO.",
"lock.cloud":"Cloud","lock.local":"Offline","lock.email":"Email","lock.password":"Password",
"lock.remember":"Keep me signed in","lock.signin":"Unlock desk",
"lock.passcode":"Local passcode","lock.passcode2":"Confirm passcode",
"lock.create":"Create passcode and enter","lock.enter":"Enter desk","lock.keep":"Stay unlocked on this device",
"lock.newHint":"No local passcode yet. Create one to protect the offline desk.",
"lock.existingHint":"The offline desk stores cue sheets in this browser and audio files locally.",
"lock.noCloud":"Firebase is not configured. Edit firebase-config.js to enable cloud accounts.",
"lock.cloudHint":"Accounts are created in Firebase by the administrator.","lock.setup":"Setup",
"lock.err.auth":"Wrong email or password.","lock.err.net":"Network error.",
"lock.err.many":"Too many attempts. Try again later.","lock.err.pass":"Passcode is not correct.",
"lock.err.pass2":"Passcodes do not match.","lock.err.passShort":"Use at least 4 characters.",

"rail.master":"Master","rail.mute":"Mute","rail.unmute":"Muted","rail.preload":"Preload",
"rail.settings":"Settings","rail.lock":"Lock","rail.sync.cloud":"Cloud","rail.sync.local":"Offline",
"rail.newShow":"New show","rail.renameShow":"Rename show","rail.deleteShow":"Delete show",

"sheet.search":"Search cues","sheet.addCue":"Add cue","sheet.import":"Import",
"sheet.drop":"Drop audio files to create cues","sheet.views":"Views","sheet.saveView":"Save view",
"sheet.clearFilters":"Clear filters","sheet.orderHint":"Switch to Cue order and clear filters to reorder",
"sheet.empty":"No cues yet. Link audio or add a cue.","sheet.noMatch":"No cues match this view.",
"sheet.rows":"{shown} of {total} cues","sheet.inspector":"Inspector",

"filter.all":"All types","flag.any":"Any flag","flag.hotkey":"Has hotkey","flag.loop":"Looping","flag.error":"Load error",
"sort.order":"Cue order","sort.name":"Name","sort.type":"Type","sort.len":"Length",
"view.all":"All cues","view.audio":"Audio","view.hotkeys":"Hotkeys","view.loops":"Loops",
"bulk.count":"{n} selected","bulk.clear":"Clear",

"col.num":"Cue","col.key":"Key","col.type":"Type","col.name":"Name","col.len":"Length","col.cont":"Continue",
"type.audio":"Audio","type.fade":"Fade","type.stop":"Stop","type.wait":"Wait","type.memo":"Memo",
"cont.manual":"Manual — wait for GO","cont.follow":"Auto-follow — run next when finished",
"cont.continue":"Auto-continue — run next immediately",
"cont.manual.s":"Manual","cont.follow.s":"Follow","cont.continue.s":"Continue",
"cue.untitled":"Untitled cue","cue.copySuffix":" (copy)","cue.preview":"Audition","cue.stop":"Stop",
"cue.error":"Load failed","cue.ready":"Preloaded","cue.loading":"Loading","cue.idle":"Not loaded",

"insp.title":"Cue inspector","insp.none":"Select a cue to edit.","insp.type":"Cue type","insp.name":"Cue name",
"insp.hotkey":"Hotkey","insp.hotkeyHint":"one key; Space, Esc and arrows are reserved","insp.notes":"Notes",
"insp.source":"Source","insp.upload":"Upload audio","insp.synth":"Built-in sound","insp.synthPick":"Choose a built-in sound",
"insp.waveHint":"Drag markers to trim. Click the waveform to audition from that point.",
"insp.noBuffer":"Load the sound to see its waveform.",
"insp.volume":"Level","insp.pan":"Pan","insp.fadeIn":"Fade in (s)","insp.fadeOut":"Fade out on stop (s)",
"insp.loop":"Loop","insp.rate":"Rate","insp.trimIn":"Trim in (s)","insp.trimOut":"Trim out (s, 0 = end)",
"insp.stopOthers":"Stop all other sounds when this cue runs","insp.cont":"Continue","insp.delay":"Delay (s)",
"insp.target":"Target","insp.targetAll":"All playing sounds","insp.fadeTo":"Fade to level",
"insp.fadeTime":"Fade time (s)","insp.stopAtEnd":"Stop target when fade ends","insp.wait":"Wait time (s)",
"insp.levels":"Level and pan","insp.trim":"Trim and playback",

"src.title":"Audio source","src.link":"Link audio","src.pickerTitle":"Link audio file",
"src.repoFiles":"Repository files","src.byPath":"By path","src.byUrl":"External URL","src.use":"Use",
"src.chooseFile":"Choose file","src.localFile":"Local file (offline desk only)",
"src.repo":"Repository file","src.url":"External URL","src.local":"Local file","src.cloud":"Firebase Storage",
"src.pathHint":"Relative to this page, or a full https URL.",
"src.corsHint":"The host must allow cross-origin requests (CORS).",
"src.repoNote":"Cue sheets are stored in Firestore. Audio files are served from the repository audio folder. Firebase Storage is not used.",
"src.cloudNote":"Firebase Storage is enabled for uploads.",
"src.manifestEmpty":"No file list yet. Add filenames to DC_AUDIO.manifest in firebase-config.js, or type a path below.",
"src.localOnly":"Local file upload is available on the offline desk only. Use a repository path instead.",
"src.dropRepo":"Add the file to the repository audio folder, then link it here.",

"tx.standby":"Standby","tx.end":"End of cue sheet","tx.panic":"Panic","tx.pauseAll":"Pause all",
"tx.resumeAll":"Resume all","tx.stopAll":"Stop all","tx.rack":"Live channels","tx.rackEmpty":"No sound running",
"tx.top":"Back to top","tx.prev":"Previous cue","tx.next":"Next cue",

"set.title":"Settings","set.language":"Language","set.audio":"Audio","set.output":"Output device",
"set.default":"System default","set.refresh":"Refresh devices",
"set.devHint":"Output switching requires a Chromium browser.","set.panic":"Panic fade time (s)",
"set.behaviour":"Behaviour","set.space":"Space bar fires GO","set.confirm":"Confirm before deleting",
"set.motion":"Interface animation","set.autolock":"Auto-lock after idle (minutes, 0 = off)",
"set.account":"Account","set.newPass":"New password","set.changePass":"Update","set.passOk":"Password updated.",
"set.signout":"Lock desk","set.exportAll":"Export","set.shortcuts":"Keyboard",
"help.go":"Fire the standby cue","help.panic":"Fade out and stop everything","help.nav":"Move the standby pointer",
"help.hotkey":"Fire that cue without moving standby","help.delete":"Delete the standby cue",
"help.undo":"Undo the last deletion","help.search":"Jump to search",

"dlg.delCue":"Delete this cue?","dlg.delCueBody":"You can undo this afterwards.",
"dlg.delBulk":"Delete {n} cues?","dlg.delBulkBody":"You can undo this afterwards.",
"dlg.delShow":"Delete this show?","dlg.delShowBody":"The cue sheet is removed. Audio files remain in the repository.",
"dlg.newShow":"New show","dlg.renameShow":"Rename show","dlg.defaultShow":"Show 1",
"dlg.lock":"Lock the desk?","dlg.lockBody":"All running sounds will stop.",
"dlg.saveView":"Save this view","dlg.viewName":"View name",
"dlg.delView":"Delete this view?","dlg.delViewBody":"Cues are not affected.",

"toast.uploaded":"{name} attached","toast.panic":"All sounds stopped","toast.preloading":"Preloading audio…",
"toast.preloadDone":"Preloaded {ok} of {total} sounds","toast.preloadFail":"Some sounds failed to preload",
"toast.imported":"Show imported","toast.exported":"Show exported","toast.deleted":"{n} cues deleted",
"toast.restored":"Cues restored","toast.viewSaved":"View saved","toast.viewDeleted":"View deleted",
"toast.hotkeyReserved":"That key is reserved","toast.locked":"Desk locked","toast.end":"End of cue sheet",
"toast.noFile":"This cue has no sound attached","toast.loadFail":"Could not load audio",
"toast.saveFail":"Save failed","toast.deviceFail":"Cannot switch output device",
"toast.passFail":"Could not update password","toast.added":"Cue added","toast.copied":"Copied",
"toast.cloudFail":"Firebase could not be loaded. Offline mode is available.",

"seed.show1":"The Storm — Act I","seed.show2":"Curtain Call",
"seed.c1":"House open — check monitors","seed.c2":"Rain bed (loop)","seed.c3":"Thunder — far",
"seed.c4":"Hold","seed.c5":"Thunder — near","seed.c6":"Door knock, three times","seed.c7":"Wind gust",
"seed.c8":"Rain down under dialogue","seed.c9":"Telephone bell","seed.c10":"Kill telephone",
"seed.c11":"Clock ticking","seed.c12":"Heartbeat — tension","seed.c13":"Transition whoosh",
"seed.c14":"Fade everything out","seed.c15":"Curtain call applause","seed.c16":"End of Act I — standby LX 42",
"seed.d1":"Pre-show chime","seed.d2":"Applause bed","seed.d3":"Fade room out","seed.d4":"House lights up",

"setup.title":"Firebase setup",
"setup.s1":"Create a Firebase project and add a Web app.",
"setup.s2":"Paste the config into firebase-config.js.",
"setup.s3":"Create Firestore: Standard edition, database ID (default), region asia-east2, production mode.",
"setup.s4":"Enable Email/Password sign-in and disable sign-up.",
"setup.s5":"Add a crew user in Authentication.",
"setup.s6":"Add your GitHub Pages domain to Authorized domains.",
"setup.s7":"Skip Storage. Put audio files in the repository audio folder.",
"setup.fs":"Firestore rules","setup.copy":"Copy"
};

var zh = {
"close":"關閉","ok":"確定","cancel":"取消","confirm":"確認","undo":"復原","delete":"刪除","duplicate":"複製",

"lock.lede":"舞台專用的音效 Cue 控制台。以一個鍵盤控制待命、執行、淡變及停止。",
"lock.p1":"音效、淡變、停止、等待及備註 Cue",
"lock.p2":"每個 Cue 獨立音量、聲道、剪輯及即時淡變",
"lock.p3":"Cue 表經 Firestore 同步，音效由 repo 提供",
"lock.p4":"以密碼鎖定，只供內部使用",
"lock.foot":"內部使用。只有按下 GO 才會播放聲音。",
"lock.cloud":"雲端","lock.local":"離線","lock.email":"電郵","lock.password":"密碼",
"lock.remember":"保持登入","lock.signin":"解鎖控制台",
"lock.passcode":"本機通行碼","lock.passcode2":"再次輸入通行碼",
"lock.create":"建立通行碼並進入","lock.enter":"進入控制台","lock.keep":"在此裝置保持解鎖",
"lock.newHint":"尚未設定本機通行碼。請建立一組以保護離線控制台。",
"lock.existingHint":"離線控制台的 Cue 表儲存於此瀏覽器，音效檔案儲存於本機。",
"lock.noCloud":"尚未設定 Firebase。請修改 firebase-config.js 以啟用雲端帳號。",
"lock.cloudHint":"帳號由管理員在 Firebase 建立。","lock.setup":"設定指南",
"lock.err.auth":"電郵或密碼不正確。","lock.err.net":"網絡錯誤。",
"lock.err.many":"嘗試次數過多，請稍後再試。","lock.err.pass":"通行碼不正確。",
"lock.err.pass2":"兩次輸入的通行碼不一致。","lock.err.passShort":"至少需要 4 個字元。",

"rail.master":"總音量","rail.mute":"靜音","rail.unmute":"已靜音","rail.preload":"預載",
"rail.settings":"設定","rail.lock":"鎖定","rail.sync.cloud":"雲端","rail.sync.local":"離線",
"rail.newShow":"新增演出","rail.renameShow":"重新命名演出","rail.deleteShow":"刪除演出",

"sheet.search":"搜尋 Cue","sheet.addCue":"新增 Cue","sheet.import":"匯入",
"sheet.drop":"放下音效檔案即可建立 Cue","sheet.views":"檢視","sheet.saveView":"儲存檢視",
"sheet.clearFilters":"清除篩選","sheet.orderHint":"請切換至 Cue 次序並清除篩選方可排序",
"sheet.empty":"暫時未有 Cue。請連結音效或新增 Cue。","sheet.noMatch":"沒有符合此檢視的 Cue。",
"sheet.rows":"顯示 {shown} / {total} 個 Cue","sheet.inspector":"Cue 設定",

"filter.all":"所有類型","flag.any":"不限標記","flag.hotkey":"已設快捷鍵","flag.loop":"循環播放","flag.error":"載入錯誤",
"sort.order":"Cue 次序","sort.name":"名稱","sort.type":"類型","sort.len":"長度",
"view.all":"全部 Cue","view.audio":"音效","view.hotkeys":"快捷鍵","view.loops":"循環",
"bulk.count":"已選取 {n} 個","bulk.clear":"取消選取",

"col.num":"Cue","col.key":"快捷鍵","col.type":"類型","col.name":"名稱","col.len":"長度","col.cont":"接續",
"type.audio":"音效","type.fade":"淡變","type.stop":"停止","type.wait":"等待","type.memo":"備註",
"cont.manual":"手動 — 等待 GO","cont.follow":"自動跟隨 — 完成後執行下一個",
"cont.continue":"自動同時 — 立即執行下一個",
"cont.manual.s":"手動","cont.follow.s":"跟隨","cont.continue.s":"同時",
"cue.untitled":"未命名 Cue","cue.copySuffix":"（副本）","cue.preview":"試聽","cue.stop":"停止",
"cue.error":"載入失敗","cue.ready":"已預載","cue.loading":"載入中","cue.idle":"未載入",

"insp.title":"Cue 設定","insp.none":"請選擇一個 Cue 進行編輯。","insp.type":"Cue 類型","insp.name":"Cue 名稱",
"insp.hotkey":"快捷鍵","insp.hotkeyHint":"單一按鍵；Space、Esc 及方向鍵為系統保留","insp.notes":"備註",
"insp.source":"音效來源","insp.upload":"上載音效","insp.synth":"內建音效","insp.synthPick":"選擇內建音效",
"insp.waveHint":"拖曳標記可剪輯；按波形任何位置即可由該處試聽。",
"insp.noBuffer":"載入音效後即可顯示波形。",
"insp.volume":"音量","insp.pan":"左右聲道","insp.fadeIn":"淡入（秒）","insp.fadeOut":"停止時淡出（秒）",
"insp.loop":"循環播放","insp.rate":"播放速度","insp.trimIn":"開始位置（秒）","insp.trimOut":"結束位置（秒，0 = 全長）",
"insp.stopOthers":"執行此 Cue 時停止其他音效","insp.cont":"接續方式","insp.delay":"延遲（秒）",
"insp.target":"目標","insp.targetAll":"所有播放中的音效","insp.fadeTo":"淡變至音量",
"insp.fadeTime":"淡變時間（秒）","insp.stopAtEnd":"淡變完成後停止目標","insp.wait":"等待時間（秒）",
"insp.levels":"音量及聲道","insp.trim":"剪輯及播放",

"src.title":"音效來源","src.link":"連結音效","src.pickerTitle":"連結音效檔案",
"src.repoFiles":"Repo 檔案","src.byPath":"依路徑","src.byUrl":"外部網址","src.use":"使用",
"src.chooseFile":"選擇檔案","src.localFile":"本機檔案（只限離線控制台）",
"src.repo":"Repo 檔案","src.url":"外部網址","src.local":"本機檔案","src.cloud":"Firebase Storage",
"src.pathHint":"相對於本頁的路徑，或完整 https 網址。",
"src.corsHint":"對方主機必須允許跨來源請求（CORS）。",
"src.repoNote":"Cue 表儲存於 Firestore，音效檔案由 repo 的 audio 資料夾提供，不使用 Firebase Storage。",
"src.cloudNote":"已啟用 Firebase Storage 上載。",
"src.manifestEmpty":"尚未有檔案清單。請在 firebase-config.js 的 DC_AUDIO.manifest 加入檔名，或直接於下面輸入路徑。",
"src.localOnly":"本機上載只適用於離線控制台。請改用 repo 路徑。",
"src.dropRepo":"請先將檔案放入 repo 的 audio 資料夾，然後在此連結。",

"tx.standby":"待命","tx.end":"已到 Cue 表末端","tx.panic":"緊急停止","tx.pauseAll":"全部暫停",
"tx.resumeAll":"全部繼續","tx.stopAll":"全部停止","tx.rack":"即時聲道","tx.rackEmpty":"現時沒有音效播放",
"tx.top":"返回最頂","tx.prev":"上一個 Cue","tx.next":"下一個 Cue",

"set.title":"設定","set.language":"語言","set.audio":"音訊","set.output":"輸出裝置",
"set.default":"系統預設","set.refresh":"重新整理裝置",
"set.devHint":"切換輸出裝置需要使用 Chromium 瀏覽器。","set.panic":"緊急停止淡出時間（秒）",
"set.behaviour":"操作選項","set.space":"以 Space 鍵執行 GO","set.confirm":"刪除前先確認",
"set.motion":"介面動畫","set.autolock":"閒置自動鎖定（分鐘，0 = 關閉）",
"set.account":"帳號","set.newPass":"新密碼","set.changePass":"更新","set.passOk":"密碼已更新。",
"set.signout":"鎖定控制台","set.exportAll":"匯出","set.shortcuts":"鍵盤快捷鍵",
"help.go":"執行待命中的 Cue","help.panic":"淡出並停止所有音效","help.nav":"移動待命指標",
"help.hotkey":"執行設有該快捷鍵的 Cue，待命指標不會移動","help.delete":"刪除待命中的 Cue",
"help.undo":"復原上一次刪除","help.search":"跳到搜尋欄",

"dlg.delCue":"確定刪除此 Cue？","dlg.delCueBody":"刪除後可以復原。",
"dlg.delBulk":"確定刪除 {n} 個 Cue？","dlg.delBulkBody":"刪除後可以復原。",
"dlg.delShow":"確定刪除此演出？","dlg.delShowBody":"Cue 表會被移除，音效檔案仍保留於 repo。",
"dlg.newShow":"新增演出","dlg.renameShow":"重新命名演出","dlg.defaultShow":"演出 1",
"dlg.lock":"鎖定控制台？","dlg.lockBody":"所有播放中的音效將會停止。",
"dlg.saveView":"儲存此檢視","dlg.viewName":"檢視名稱",
"dlg.delView":"確定刪除此檢視？","dlg.delViewBody":"Cue 本身不會受影響。",

"toast.uploaded":"已附加 {name}","toast.panic":"已停止所有音效","toast.preloading":"正在預載音效……",
"toast.preloadDone":"已預載 {ok} / {total} 個音效","toast.preloadFail":"部分音效預載失敗",
"toast.imported":"已匯入演出","toast.exported":"已匯出演出","toast.deleted":"已刪除 {n} 個 Cue",
"toast.restored":"已復原 Cue","toast.viewSaved":"已儲存檢視","toast.viewDeleted":"已刪除檢視",
"toast.hotkeyReserved":"此按鍵為系統保留","toast.locked":"控制台已鎖定","toast.end":"已到 Cue 表末端",
"toast.noFile":"此 Cue 未附加音效","toast.loadFail":"音效載入失敗",
"toast.saveFail":"儲存失敗","toast.deviceFail":"無法切換輸出裝置",
"toast.passFail":"無法更新密碼","toast.added":"已新增 Cue","toast.copied":"已複製",
"toast.cloudFail":"Firebase 載入失敗，仍可使用離線模式。",

"seed.show1":"暴風雨 — 第一幕","seed.show2":"謝幕",
"seed.c1":"觀眾入場 — 檢查監聽","seed.c2":"雨聲底（循環）","seed.c3":"雷聲 · 遠",
"seed.c4":"停頓","seed.c5":"雷聲 · 近","seed.c6":"敲門三下","seed.c7":"一陣風",
"seed.c8":"對白時雨聲收細","seed.c9":"電話鈴聲","seed.c10":"切斷電話",
"seed.c11":"時鐘滴答","seed.c12":"心跳 — 緊張","seed.c13":"轉場呼聲",
"seed.c14":"全部淡出","seed.c15":"謝幕掌聲","seed.c16":"第一幕完 — 準備 LX 42",
"seed.d1":"開場前鐘聲","seed.d2":"掌聲底","seed.d3":"全場淡出","seed.d4":"觀眾席燈亮",

"setup.title":"Firebase 設定",
"setup.s1":"建立 Firebase 專案並新增 Web 應用程式。",
"setup.s2":"將設定貼到 firebase-config.js。",
"setup.s3":"建立 Firestore：Standard 版、資料庫 ID 保留 (default)、區域 asia-east2、正式環境模式。",
"setup.s4":"啟用 Email/Password 登入並關閉自行註冊。",
"setup.s5":"在 Authentication 新增一個劇團帳號。",
"setup.s6":"在 Authorized domains 加入 GitHub Pages 網域。",
"setup.s7":"跳過 Storage，將音效檔案放入 repo 的 audio 資料夾。",
"setup.fs":"Firestore 規則","setup.copy":"複製"
};

var dict = { en: en, "zh-HK": zh };
function t(k, v){
  var s = (dict[lang] && dict[lang][k]) || en[k] || k;
  if(v) Object.keys(v).forEach(function(a){ s = s.split("{"+a+"}").join(v[a]); });
  return s;
}
function setLang(l){
  lang = dict[l] ? l : "en";
  localStorage.setItem("dc.lang", lang);
  document.documentElement.lang = lang === "zh-HK" ? "zh-Hant-HK" : "en";
}
function applyI18n(root){
  root = root || document;
  root.querySelectorAll("[data-i18n]").forEach(function(el){ el.textContent = t(el.getAttribute("data-i18n")); });
  root.querySelectorAll("[data-i18n-ph]").forEach(function(el){ el.placeholder = t(el.getAttribute("data-i18n-ph")); });
  root.querySelectorAll("[data-i18n-title]").forEach(function(el){ el.title = t(el.getAttribute("data-i18n-title")); });
}
DC.i18n = { t:t, setLang:setLang, getLang:function(){ return lang; }, applyI18n:applyI18n };
})(window.DC);
