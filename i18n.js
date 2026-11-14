export const LANGS = [{ id:'en', label:'English' }, { id:'zh-HK', label:'繁體中文（香港）' }];

const en = {
  'app.name':'Drama Cue',
  'ok':'OK','cancel':'Cancel','confirm':'Confirm','close':'Close','undo':'Undo','delete':'Delete',
  'duplicate':'Duplicate','save':'Save','reset':'Reset','none':'None','all':'All',

  'lock.lede':'A cue-based sound desk built for the stage. Standby, GO, fade, panic — the whole show on one keyboard.',
  'lock.p1':'Audio, fade, stop, wait and memo cues with auto-follow chains',
  'lock.p2':'Waveform trim, per-cue level and pan, live fades on every channel',
  'lock.p3':'Cue sheets sync through Firebase; audio preloads before the house opens',
  'lock.p4':'Locked for company use — cloud account or local passcode',
  'lock.foot':'Internal use only. Nothing plays until you press GO.',
  'lock.cloud':'Cloud account','lock.local':'Offline desk',
  'lock.email':'Email','lock.password':'Password','lock.remember':'Keep me signed in on this device',
  'lock.signin':'Unlock the desk','lock.signing':'Unlocking…',
  'lock.passcode':'Local passcode','lock.passcode2':'Confirm passcode','lock.create':'Create passcode & enter',
  'lock.enter':'Enter desk','lock.keep':'Stay unlocked on this device',
  'lock.newHint':'No local passcode on this device yet. Create one — it guards the offline desk and its cue sheets.',
  'lock.existingHint':'Offline desk: cue sheets live in this browser, audio files in local storage. Nothing is uploaded.',
  'lock.noCloud':'Firebase is not configured. Fill in firebase-config.js to enable cloud accounts.',
  'lock.cloudHint':'Accounts are created by the administrator in Firebase. Ask them to reset a forgotten password.',
  'lock.err.auth':'Wrong email or password.','lock.err.net':'Network error — check the connection.',
  'lock.err.many':'Too many attempts. Try again later.','lock.err.pass':'That passcode is not correct.',
  'lock.err.pass2':'The two passcodes do not match.','lock.err.passShort':'Use at least 4 characters.',

  'rail.newShow':'New show','rail.renameShow':'Rename show','rail.deleteShow':'Delete show',
  'rail.master':'Master','rail.mute':'Mute','rail.unmute':'Muted','rail.preload':'Preload',
  'rail.settings':'Settings','rail.lock':'Lock the desk','rail.sync.cloud':'Cloud sync','rail.sync.local':'Offline desk',
  'rail.showTime':'Show time',

  'sheet.search':'Search cues, notes, files…','sheet.type':'Type','sheet.flag':'Flag','sheet.sort':'Sort',
  'sheet.views':'Views','sheet.saveView':'Save view','sheet.inspector':'Inspector','sheet.addCue':'Add cue',
  'sheet.import':'Import','sheet.drop':'Drop audio files to build cues',
  'sheet.orderHint':'Reordering is available in Cue order with no filters',
  'sheet.clearFilters':'Clear filters','sheet.empty':'No cues yet. Upload audio, or drop files straight onto this sheet.',
  'sheet.noMatch':'No cues match this view.','sheet.rows':'{shown} of {total} cues',
  'filter.all':'All types','flag.any':'Any','flag.hotkey':'Has hotkey','flag.loop':'Looping','flag.error':'Load error',
  'sort.order':'Cue order','sort.name':'Name','sort.type':'Type','sort.len':'Length',
  'view.all':'All cues','view.audio':'Audio','view.hotkeys':'Hotkeys','view.loops':'Loops',
  'bulk.count':'{n} selected','bulk.clear':'Clear selection',

  'col.num':'Cue','col.key':'Key','col.type':'Type','col.name':'Name','col.len':'Length','col.cont':'Continue',
  'type.audio':'AUDIO','type.fade':'FADE','type.stop':'STOP','type.wait':'WAIT','type.memo':'MEMO',
  'cont.manual':'Manual — wait for GO','cont.follow':'Auto-follow — run the next cue when this one finishes',
  'cont.continue':'Auto-continue — run the next cue immediately',
  'cont.manual.s':'MAN','cont.follow.s':'FOLLOW','cont.continue.s':'CONT',
  'cue.untitled':'Untitled cue','cue.copySuffix':' (copy)','cue.preview':'Audition','cue.stop':'Stop',
  'cue.error':'Load failed','cue.ready':'Preloaded','cue.loading':'Loading','cue.idle':'Not loaded',

  'insp.title':'Cue inspector','insp.none':'Select a cue on the sheet to edit it.',
  'insp.type':'Cue type','insp.name':'Cue name','insp.hotkey':'Hotkey',
  'insp.hotkeyHint':'one key; Space, Esc and arrows are reserved','insp.notes':'Notes',
  'insp.source':'Source','insp.upload':'Upload audio','insp.url':'URL or repo path',
  'insp.urlPh':'audio/rain.mp3 or https://…','insp.synth':'Built-in sound','insp.synthPick':'Choose a built-in sound',
  'insp.duration':'Length','insp.waveHint':'Drag the amber markers to trim. Click the waveform to audition from that point.',
  'insp.volume':'Level','insp.pan':'Pan','insp.fadeIn':'Fade in (s)','insp.fadeOut':'Fade out on stop (s)',
  'insp.loop':'Loop','insp.rate':'Rate','insp.trimIn':'Trim in (s)','insp.trimOut':'Trim out (s, 0 = end)',
  'insp.stopOthers':'Stop all other sounds when this cue runs','insp.cont':'Continue','insp.delay':'Delay (s)',
  'insp.target':'Target','insp.targetAll':'All playing sounds','insp.fadeTo':'Fade to level',
  'insp.fadeTime':'Fade time (s)','insp.stopAtEnd':'Stop the target when the fade ends','insp.wait':'Wait time (s)',
  'insp.levels':'Level & movement','insp.trim':'Trim & playback','insp.noBuffer':'Load the sound to see its waveform.',

  'tx.standby':'Standby','tx.end':'End of cue sheet','tx.panic':'PANIC','tx.pauseAll':'Pause all',
  'tx.resumeAll':'Resume all','tx.stopAll':'Stop all','tx.top':'Back to top','tx.prev':'Previous cue',
  'tx.next':'Next cue','tx.rack':'Live channels','tx.rackEmpty':'No sound running',

  'set.title':'Settings','set.language':'Language','set.audio':'Audio','set.output':'Output device',
  'set.default':'System default','set.refresh':'Refresh devices',
  'set.devHint':'If names are blank, press Refresh devices and allow the permission prompt. Output switching needs a Chromium browser.',
  'set.panic':'Panic fade-out (s)','set.behaviour':'Behaviour','set.space':'Space bar fires GO',
  'set.confirm':'Confirm before deleting','set.motion':'Interface animation',
  'set.autolock':'Auto-lock after idle (minutes, 0 = off)',
  'set.autolockHint':'Leave at 0 during a performance so the desk never locks itself.',
  'set.account':'Account','set.newPass':'New password or passcode','set.changePass':'Update',
  'set.passOk':'Updated.','set.signout':'Lock the desk','set.shortcuts':'Keyboard','set.exportAll':'Export show',
  'set.about':'Drama Cue — internal theatre sound playback. Audio is preloaded into memory; keep this tab in the foreground during a show.',
  'help.go':'Fire the standby cue','help.panic':'Fade out and stop everything',
  'help.nav':'Move the standby pointer','help.hotkey':'Fire that cue without moving standby',
  'help.delete':'Delete the standby cue','help.undo':'Undo the last deletion','help.search':'Jump to search',

  'dlg.delCue':'Delete this cue?','dlg.delCueBody':'You can undo this straight after.',
  'dlg.delBulk':'Delete {n} cues?','dlg.delBulkBody':'You can undo this straight after.',
  'dlg.delShow':'Delete this show?','dlg.delShowBody':'The whole cue sheet is removed. Uploaded audio files stay in storage.',
  'dlg.newShow':'New show','dlg.renameShow':'Rename show','dlg.showName':'Show name','dlg.defaultShow':'Show 1',
  'dlg.lock':'Lock the desk?','dlg.lockBody':'Every running sound will stop.',
  'dlg.saveView':'Save this view','dlg.viewName':'View name','dlg.delView':'Delete this view?',
  'dlg.delViewBody':'The cues themselves are not affected.',

  'toast.uploading':'Uploading {name}…','toast.uploaded':'{name} uploaded',
  'toast.panic':'Panic — all sounds stopped','toast.preloading':'Preloading audio…',
  'toast.preloadDone':'Preloaded {ok} of {total} sounds','toast.preloadFail':'Some sounds failed to preload',
  'toast.imported':'Show imported','toast.exported':'Show exported','toast.deleted':'{n} cues deleted',
  'toast.restored':'Cues restored','toast.viewSaved':'View saved','toast.viewDeleted':'View deleted',
  'toast.hotkeyReserved':'That key is reserved by the desk','toast.locked':'Desk locked',
  'toast.end':'End of cue sheet','toast.noFile':'This cue has no sound attached',
  'toast.loadFail':'Could not load the audio','toast.saveFail':'Save failed — check the connection',
  'toast.uploadFail':'Upload failed','toast.deviceFail':'This browser cannot switch output device',
  'toast.passFail':'Could not update — sign in again first','toast.reorderOff':'Switch to Cue order with no filters to reorder',
  'toast.added':'Cue added','toast.passShort':'Use at least 4 characters',

  'seed.show1':'The Storm — Act I','seed.show2':'Curtain Call',
  'seed.c1':'House open — check monitors','seed.c2':'Rain bed (loop)','seed.c3':'Thunder — far',
  'seed.c4':'Hold','seed.c5':'Thunder — near','seed.c6':'Door knock, three times','seed.c7':'Wind gust',
  'seed.c8':'Rain down under dialogue','seed.c9':'Telephone bell','seed.c10':'Kill the telephone',
  'seed.c11':'Clock ticking','seed.c12':'Heartbeat — tension','seed.c13':'Transition whoosh',
  'seed.c14':'Fade everything out','seed.c15':'Curtain call applause','seed.c16':'End of Act I — standby LX 42',
  'seed.d1':'Pre-show chime','seed.d2':'Applause bed','seed.d3':'Fade the room out','seed.d4':'House lights up'
};

const zhHK = {
  'app.name':'Drama Cue 音效控制台',
  'ok':'確定','cancel':'取消','confirm':'確認','close':'關閉','undo':'復原','delete':'刪除',
  'duplicate':'複製','save':'儲存','reset':'重設','none':'沒有','all':'全部',

  'lock.lede':'專為舞台而設的 Cue 表音效控制台。待命、執行、淡變、緊急停止，整套演出只用一個鍵盤操作。',
  'lock.p1':'音效、淡變、停止、等待及備註 Cue，支援自動跟隨連鎖執行',
  'lock.p2':'波形剪輯、每個 Cue 獨立音量及左右聲道，每條聲道即時淡變',
  'lock.p3':'Cue 表經 Firebase 同步；觀眾入場前已完成音效預載',
  'lock.p4':'只供劇團內部使用 — 以雲端帳號或本機通行碼上鎖',
  'lock.foot':'內部使用。未按下 GO 之前，系統不會發出任何聲音。',
  'lock.cloud':'雲端帳號','lock.local':'離線控制台',
  'lock.email':'電郵','lock.password':'密碼','lock.remember':'在此裝置保持登入',
  'lock.signin':'解鎖控制台','lock.signing':'正在解鎖……',
  'lock.passcode':'本機通行碼','lock.passcode2':'再次輸入通行碼','lock.create':'建立通行碼並進入',
  'lock.enter':'進入控制台','lock.keep':'在此裝置保持解鎖',
  'lock.newHint':'此裝置尚未設定本機通行碼。請先建立一組，用以保護離線控制台及其 Cue 表。',
  'lock.existingHint':'離線控制台：Cue 表儲存於此瀏覽器，音效檔案儲存於本機，不會上載任何資料。',
  'lock.noCloud':'尚未設定 Firebase。請填寫 firebase-config.js 以啟用雲端帳號。',
  'lock.cloudHint':'帳號由管理員在 Firebase 建立。如忘記密碼，請聯絡管理員重設。',
  'lock.err.auth':'電郵或密碼不正確。','lock.err.net':'網絡連線失敗，請檢查網絡。',
  'lock.err.many':'嘗試次數過多，請稍後再試。','lock.err.pass':'通行碼不正確。',
  'lock.err.pass2':'兩次輸入的通行碼不一致。','lock.err.passShort':'通行碼至少需要 4 個字元。',

  'rail.newShow':'新增演出','rail.renameShow':'重新命名演出','rail.deleteShow':'刪除演出',
  'rail.master':'總音量','rail.mute':'靜音','rail.unmute':'已靜音','rail.preload':'預載',
  'rail.settings':'設定','rail.lock':'鎖定控制台','rail.sync.cloud':'雲端同步','rail.sync.local':'離線控制台',
  'rail.showTime':'演出時間',

  'sheet.search':'搜尋 Cue、備註或檔案……','sheet.type':'類型','sheet.flag':'標記','sheet.sort':'排序',
  'sheet.views':'檢視','sheet.saveView':'儲存檢視','sheet.inspector':'Cue 設定','sheet.addCue':'新增 Cue',
  'sheet.import':'匯入','sheet.drop':'放下音效檔案即可建立 Cue',
  'sheet.orderHint':'只有在「Cue 次序」及沒有篩選時才可重新排序',
  'sheet.clearFilters':'清除篩選','sheet.empty':'暫時未有 Cue。請上載音效，或直接將檔案拖放到 Cue 表。',
  'sheet.noMatch':'沒有符合此檢視的 Cue。','sheet.rows':'顯示 {shown} / {total} 個 Cue',
  'filter.all':'所有類型','flag.any':'不限','flag.hotkey':'已設快捷鍵','flag.loop':'循環播放','flag.error':'載入錯誤',
  'sort.order':'Cue 次序','sort.name':'名稱','sort.type':'類型','sort.len':'長度',
  'view.all':'全部 Cue','view.audio':'音效','view.hotkeys':'快捷鍵','view.loops':'循環',
  'bulk.count':'已選取 {n} 個','bulk.clear':'取消選取',

  'col.num':'Cue','col.key':'快捷鍵','col.type':'類型','col.name':'名稱','col.len':'長度','col.cont':'接續',
  'type.audio':'音效','type.fade':'淡變','type.stop':'停止','type.wait':'等待','type.memo':'備註',
  'cont.manual':'手動 — 等待 GO','cont.follow':'自動跟隨 — 本 Cue 完成後執行下一個',
  'cont.continue':'自動同時 — 立即執行下一個 Cue',
  'cont.manual.s':'手動','cont.follow.s':'跟隨','cont.continue.s':'同時',
  'cue.untitled':'未命名 Cue','cue.copySuffix':'（副本）','cue.preview':'試聽','cue.stop':'停止',
  'cue.error':'載入失敗','cue.ready':'已預載','cue.loading':'載入中','cue.idle':'未載入',

  'insp.title':'Cue 設定','insp.none':'請在 Cue 表選擇一個 Cue 進行編輯。',
  'insp.type':'Cue 類型','insp.name':'Cue 名稱','insp.hotkey':'快捷鍵',
  'insp.hotkeyHint':'單一按鍵；Space、Esc 及方向鍵為系統保留','insp.notes':'備註',
  'insp.source':'音效來源','insp.upload':'上載音效','insp.url':'網址或 repo 路徑',
  'insp.urlPh':'例如 audio/rain.mp3 或 https://…','insp.synth':'內建音效','insp.synthPick':'選擇內建音效',
  'insp.duration':'長度','insp.waveHint':'拖曳琥珀色標記可剪輯起訖；按波形任何位置即可由該處試聽。',
  'insp.volume':'音量','insp.pan':'左右聲道','insp.fadeIn':'淡入（秒）','insp.fadeOut':'停止時淡出（秒）',
  'insp.loop':'循環播放','insp.rate':'播放速度','insp.trimIn':'開始位置（秒）','insp.trimOut':'結束位置（秒，0 = 全長）',
  'insp.stopOthers':'執行此 Cue 時停止其他所有音效','insp.cont':'接續方式','insp.delay':'延遲（秒）',
  'insp.target':'目標','insp.targetAll':'所有播放中的音效','insp.fadeTo':'淡變至音量',
  'insp.fadeTime':'淡變時間（秒）','insp.stopAtEnd':'淡變完成後停止目標','insp.wait':'等待時間（秒）',
  'insp.levels':'音量及聲道','insp.trim':'剪輯及播放','insp.noBuffer':'載入音效後即可顯示波形。',

  'tx.standby':'待命','tx.end':'已到 Cue 表末端','tx.panic':'緊急停止','tx.pauseAll':'全部暫停',
  'tx.resumeAll':'全部繼續','tx.stopAll':'全部停止','tx.top':'返回最頂','tx.prev':'上一個 Cue',
  'tx.next':'下一個 Cue','tx.rack':'即時聲道','tx.rackEmpty':'現時沒有音效播放',

  'set.title':'設定','set.language':'語言','set.audio':'音訊','set.output':'輸出裝置',
  'set.default':'系統預設','set.refresh':'重新整理裝置',
  'set.devHint':'如裝置名稱顯示為空白，請按「重新整理裝置」並允許權限提示。切換輸出裝置需要使用 Chromium 瀏覽器。',
  'set.panic':'緊急停止的淡出時間（秒）','set.behaviour':'操作選項','set.space':'以 Space 鍵執行 GO',
  'set.confirm':'刪除前先確認','set.motion':'介面動畫',
  'set.autolock':'閒置自動鎖定（分鐘，0 = 關閉）',
  'set.autolockHint':'演出期間建議設為 0，避免控制台自行鎖定。',
  'set.account':'帳號','set.newPass':'新密碼或通行碼','set.changePass':'更新',
  'set.passOk':'已更新。','set.signout':'鎖定控制台','set.shortcuts':'鍵盤快捷鍵','set.exportAll':'匯出演出',
  'set.about':'Drama Cue — 內部戲劇音效播放系統。音效會預載到記憶體；演出期間請保持此分頁在前台。',
  'help.go':'執行待命中的 Cue','help.panic':'淡出並停止所有音效',
  'help.nav':'移動待命指標','help.hotkey':'執行設有該快捷鍵的 Cue，待命指標不會移動',
  'help.delete':'刪除待命中的 Cue','help.undo':'復原上一次刪除','help.search':'跳到搜尋欄',

  'dlg.delCue':'確定刪除此 Cue？','dlg.delCueBody':'刪除後可即時復原。',
  'dlg.delBulk':'確定刪除 {n} 個 Cue？','dlg.delBulkBody':'刪除後可即時復原。',
  'dlg.delShow':'確定刪除此演出？','dlg.delShowBody':'整個 Cue 表會被移除，已上載的音效檔案仍保留在儲存空間。',
  'dlg.newShow':'新增演出','dlg.renameShow':'重新命名演出','dlg.showName':'演出名稱','dlg.defaultShow':'演出 1',
  'dlg.lock':'鎖定控制台？','dlg.lockBody':'所有播放中的音效將會停止。',
  'dlg.saveView':'儲存此檢視','dlg.viewName':'檢視名稱','dlg.delView':'確定刪除此檢視？',
  'dlg.delViewBody':'Cue 本身不會受影響。',

  'toast.uploading':'正在上載 {name}……','toast.uploaded':'已上載 {name}',
  'toast.panic':'已緊急停止所有音效','toast.preloading':'正在預載音效……',
  'toast.preloadDone':'已預載 {ok} / {total} 個音效','toast.preloadFail':'部分音效預載失敗',
  'toast.imported':'已匯入演出','toast.exported':'已匯出演出','toast.deleted':'已刪除 {n} 個 Cue',
  'toast.restored':'已復原 Cue','toast.viewSaved':'已儲存檢視','toast.viewDeleted':'已刪除檢視',
  'toast.hotkeyReserved':'此按鍵為系統保留','toast.locked':'控制台已鎖定',
  'toast.end':'已到 Cue 表末端','toast.noFile':'此 Cue 未附加音效',
  'toast.loadFail':'音效載入失敗','toast.saveFail':'儲存失敗，請檢查連線',
  'toast.uploadFail':'上載失敗','toast.deviceFail':'此瀏覽器不支援切換輸出裝置',
  'toast.passFail':'更新失敗，請先重新登入','toast.reorderOff':'請切換至「Cue 次序」並清除篩選，方可重新排序',
  'toast.added':'已新增 Cue','toast.passShort':'至少需要 4 個字元',

  'seed.show1':'暴風雨 — 第一幕','seed.show2':'謝幕',
  'seed.c1':'觀眾入場 — 檢查監聽','seed.c2':'雨聲底（循環）','seed.c3':'雷聲 · 遠',
  'seed.c4':'停頓','seed.c5':'雷聲 · 近','seed.c6':'敲門三下','seed.c7':'一陣風',
  'seed.c8':'對白時雨聲收細','seed.c9':'電話鈴聲','seed.c10':'切斷電話',
  'seed.c11':'時鐘滴答','seed.c12':'心跳 — 緊張','seed.c13':'轉場呼聲',
  'seed.c14':'全部淡出','seed.c15':'謝幕掌聲','seed.c16':'第一幕完 — 準備 LX 42',
  'seed.d1':'開場前鐘聲','seed.d2':'掌聲底','seed.d3':'全場淡出','seed.d4':'觀眾席燈亮'
};

const DICT = { en, 'zh-HK': zhHK };
let lang = localStorage.getItem('dc.lang') || 'en';

export function setLang(l){
  lang = DICT[l] ? l : 'en';
  localStorage.setItem('dc.lang', lang);
  document.documentElement.lang = lang === 'zh-HK' ? 'zh-Hant-HK' : 'en';
}
export const getLang = () => lang;
export function t(key, vars){
  let s = DICT[lang][key] ?? DICT.en[key] ?? key;
  if(vars) for(const [k,v] of Object.entries(vars)) s = s.split('{'+k+'}').join(v);
  return s;
}
export function applyI18n(root = document){
  root.querySelectorAll('[data-i18n]').forEach(el => el.textContent = t(el.dataset.i18n));
  root.querySelectorAll('[data-i18n-ph]').forEach(el => el.placeholder = t(el.dataset.i18nPh));
  root.querySelectorAll('[data-i18n-title]').forEach(el => { el.title = t(el.dataset.i18nTitle); el.setAttribute('aria-label', t(el.dataset.i18nTitle)); });
}
