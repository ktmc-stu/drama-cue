export const LANGS = [
  { id: 'en',    label: 'English' },
  { id: 'zh-HK', label: '繁體中文（香港）' }
];

const en = {
  'app.title':'Drama Cue','app.short':'Drama Cue',
  'login.subtitle':'Internal use — sign in to open the sound desk.',
  'login.email':'Email','login.password':'Password','login.remember':'Keep me signed in on this device',
  'login.signIn':'Sign in','login.busy':'Signing in…',
  'login.note':'Accounts are created by the administrator in Firebase. Forgot the password? Ask the admin to reset it.',
  'err.config':'Firebase is not configured yet. Fill in firebase-config.js first.',
  'err.auth':'Wrong email or password.','err.network':'Network error. Check the connection.',
  'err.tooMany':'Too many attempts. Try again later.','err.save':'Save failed — check network / permissions.',
  'err.load':'Could not load the audio file.','err.upload':'Upload failed.','err.noFile':'This cue has no audio file.',
  'err.device':'This browser cannot switch output device.','err.password':'Password change failed (min 6 characters, or sign in again first).',
  'top.newShow':'New show','top.renameShow':'Rename show','top.deleteShow':'Delete show',
  'top.master':'Master','top.preload':'Preload all','top.settings':'Settings','top.lock':'Lock',
  'cue.addAudio':'Upload audio','cue.addCue':'Add cue','cue.dup':'Duplicate','cue.del':'Delete',
  'cue.up':'Move up','cue.down':'Move down','cue.export':'Export','cue.import':'Import',
  'cue.col.num':'#','cue.col.hotkey':'Key','cue.col.type':'Type','cue.col.name':'Cue','cue.col.len':'Length','cue.col.cont':'Continue',
  'cue.type.audio':'AUDIO','cue.type.fade':'FADE','cue.type.stop':'STOP','cue.type.wait':'WAIT','cue.type.memo':'MEMO',
  'cue.untitled':'(untitled)','cue.empty':'No cues yet. Upload audio files or drag them here.',
  'cue.drop':'Drop audio files to create cues','cue.copySuffix':' (copy)',
  'cont.manual':'Manual — wait for GO','cont.follow':'Auto-follow — run next when finished',
  'cont.continue':'Auto-continue — run next immediately',
  'cont.manual.short':'MAN','cont.follow.short':'FOLLOW','cont.continue.short':'CONT',
  'insp.title':'Cue inspector','insp.none':'Select a cue to edit it.','insp.type':'Cue type','insp.name':'Cue name',
  'insp.hotkey':'Hotkey','insp.hotkeyHint':'one key; Space / Esc / arrows are reserved',
  'insp.notes':'Notes','insp.source':'Audio source','insp.upload':'Upload to Firebase','insp.url':'URL or repo path',
  'insp.urlPh':'e.g. audio/rain.mp3 or https://…','insp.file':'File','insp.duration':'Length',
  'insp.volume':'Volume','insp.pan':'Pan','insp.fadeIn':'Fade in (s)','insp.fadeOut':'Fade out on stop (s)',
  'insp.loop':'Loop','insp.rate':'Playback rate','insp.trimIn':'Start at (s)','insp.trimOut':'End at (s, 0 = full)',
  'insp.stopOthers':'Stop other sounds when this cue runs','insp.cont':'Continue mode','insp.delay':'Delay (s)',
  'insp.target':'Target','insp.targetAll':'All playing sounds','insp.fadeTo':'Fade to volume',
  'insp.fadeTime':'Fade time (s)','insp.stopAtEnd':'Stop target at end of fade','insp.wait':'Wait time (s)',
  'insp.preview':'Preview','insp.stop':'Stop','insp.sec':'s','insp.db':'dB',
  'transport.go':'GO','transport.standby':'Standby','transport.end':'End of cue list',
  'transport.panic':'PANIC','transport.pauseAll':'Pause all','transport.resumeAll':'Resume all',
  'transport.stopAll':'Stop all','transport.active':'Playing','transport.none':'Nothing playing',
  'settings.title':'Settings','settings.language':'Language','settings.audioOut':'Audio output device',
  'settings.defaultOut':'System default','settings.refreshDev':'Refresh devices',
  'settings.devHint':'If device names are blank, press “Refresh devices” and allow the permission prompt. Some browsers (Safari / Firefox) cannot switch output.',
  'settings.panicFade':'Panic fade-out time (s)','settings.behaviour':'Behaviour',
  'settings.spaceGo':'Space bar triggers GO','settings.confirmDelete':'Confirm before deleting',
  'settings.autoLock':'Auto-lock after idle (minutes, 0 = off)',
  'settings.autoLockHint':'Set to 0 during a performance so the desk never locks itself.',
  'settings.account':'Account','settings.newPassword':'New password','settings.changePassword':'Change password',
  'settings.passwordOk':'Password changed.','settings.signOut':'Sign out / lock',
  'settings.shortcuts':'Keyboard shortcuts','settings.close':'Close',
  'settings.about':'Drama Cue — internal drama sound playback. Audio is preloaded before playback; keep this tab in the foreground during a show.',
  'help.go':'GO (run standby cue)','help.panic':'Panic — fade out and stop everything',
  'help.standby':'Move the standby pointer','help.hotkey':'Run the cue with that hotkey (standby does not move)',
  'dialog.ok':'OK','dialog.cancel':'Cancel','dialog.confirm':'Confirm',
  'dialog.delCueTitle':'Delete this cue?','dialog.delCueBody':'This cannot be undone.',
  'dialog.delShowTitle':'Delete this show?','dialog.delShowBody':'The whole cue list is deleted. Uploaded audio files stay in Storage.',
  'dialog.newShow':'New show','dialog.renameShow':'Rename show','dialog.showName':'Show name','dialog.defaultShow':'Show 1',
  'dialog.lockTitle':'Lock the system?','dialog.lockBody':'All playing sounds will stop.',
  'toast.uploading':'Uploading {name}…','toast.uploaded':'Uploaded {name}',
  'toast.panic':'PANIC — all sounds stopped','toast.preloading':'Preloading audio…',
  'toast.preloadDone':'Preloaded {ok}/{total} files','toast.preloadFail':'Some files failed to preload',
  'toast.imported':'Show imported','toast.exported':'JSON exported','toast.saved':'Saved',
  'toast.hotkeyReserved':'That key is reserved by the system','toast.locked':'System locked',
  'toast.endOfList':'End of cue list'
};

const zhHK = {
  'app.title':'Drama Cue 音效系統','app.short':'Drama Cue',
  'login.subtitle':'內部使用 — 請登入以開啟音效控制台。',
  'login.email':'電郵','login.password':'密碼','login.remember':'在此裝置保持登入',
  'login.signIn':'登入','login.busy':'正在登入……',
  'login.note':'帳號由管理員在 Firebase 建立。如忘記密碼，請聯絡管理員重設。',
  'err.config':'尚未設定 Firebase，請先填寫 firebase-config.js。',
  'err.auth':'電郵或密碼不正確。','err.network':'網絡連線失敗，請檢查網絡。',
  'err.tooMany':'登入嘗試次數過多，請稍後再試。','err.save':'儲存失敗，請檢查網絡或權限。',
  'err.load':'音效檔案載入失敗。','err.upload':'上載失敗。','err.noFile':'此 cue 未設定音效檔案。',
  'err.device':'此瀏覽器不支援切換輸出裝置。','err.password':'更改密碼失敗（密碼至少 6 個字元，或請先重新登入）。',
  'top.newShow':'新增演出','top.renameShow':'重新命名演出','top.deleteShow':'刪除演出',
  'top.master':'總音量','top.preload':'全部預載','top.settings':'設定','top.lock':'鎖定',
  'cue.addAudio':'上載音效','cue.addCue':'新增 cue','cue.dup':'複製','cue.del':'刪除',
  'cue.up':'上移','cue.down':'下移','cue.export':'匯出','cue.import':'匯入',
  'cue.col.num':'編號','cue.col.hotkey':'快捷鍵','cue.col.type':'類型','cue.col.name':'提示內容','cue.col.len':'長度','cue.col.cont':'接續',
  'cue.type.audio':'音效','cue.type.fade':'淡變','cue.type.stop':'停止','cue.type.wait':'等待','cue.type.memo':'備註',
  'cue.untitled':'（未命名）','cue.empty':'暫時未有 cue。請上載音效檔案，或直接拖曳檔案到此處。',
  'cue.drop':'放下音效檔案即可建立 cue','cue.copySuffix':'（副本）',
  'cont.manual':'手動 — 等待 GO','cont.follow':'自動跟隨 — 播放完畢後執行下一個',
  'cont.continue':'自動同時 — 立即執行下一個',
  'cont.manual.short':'手動','cont.follow.short':'跟隨','cont.continue.short':'同時',
  'insp.title':'Cue 設定','insp.none':'請選擇一個 cue 進行編輯。','insp.type':'Cue 類型','insp.name':'Cue 名稱',
  'insp.hotkey':'快捷鍵','insp.hotkeyHint':'單一按鍵；Space、Esc 及方向鍵為系統保留',
  'insp.notes':'備註','insp.source':'音效來源','insp.upload':'上載至 Firebase','insp.url':'網址或 repo 路徑',
  'insp.urlPh':'例如 audio/rain.mp3 或 https://…','insp.file':'檔案','insp.duration':'長度',
  'insp.volume':'音量','insp.pan':'左右聲道','insp.fadeIn':'淡入（秒）','insp.fadeOut':'停止時淡出（秒）',
  'insp.loop':'循環播放','insp.rate':'播放速度','insp.trimIn':'開始位置（秒）','insp.trimOut':'結束位置（秒，0 = 全長）',
  'insp.stopOthers':'執行此 cue 時停止其他音效','insp.cont':'接續方式','insp.delay':'延遲（秒）',
  'insp.target':'目標','insp.targetAll':'所有播放中的音效','insp.fadeTo':'淡變至音量',
  'insp.fadeTime':'淡變時間（秒）','insp.stopAtEnd':'淡變完成後停止目標','insp.wait':'等待時間（秒）',
  'insp.preview':'試聽','insp.stop':'停止','insp.sec':'秒','insp.db':'dB',
  'transport.go':'執行','transport.standby':'待命','transport.end':'已到 cue 表末端',
  'transport.panic':'緊急停止','transport.pauseAll':'全部暫停','transport.resumeAll':'全部繼續',
  'transport.stopAll':'全部停止','transport.active':'播放中','transport.none':'現時沒有音效播放',
  'settings.title':'設定','settings.language':'語言','settings.audioOut':'音訊輸出裝置',
  'settings.defaultOut':'系統預設','settings.refreshDev':'重新整理裝置',
  'settings.devHint':'如裝置名稱顯示為空白，請按「重新整理裝置」並允許權限提示。部分瀏覽器（Safari／Firefox）不支援切換輸出裝置。',
  'settings.panicFade':'緊急停止的淡出時間（秒）','settings.behaviour':'操作選項',
  'settings.spaceGo':'以 Space 鍵執行 GO','settings.confirmDelete':'刪除前先確認',
  'settings.autoLock':'閒置自動鎖定（分鐘，0 = 關閉）',
  'settings.autoLockHint':'演出期間建議設為 0，避免控制台自行鎖定。',
  'settings.account':'帳號','settings.newPassword':'新密碼','settings.changePassword':'更改密碼',
  'settings.passwordOk':'密碼已更改。','settings.signOut':'登出／鎖定',
  'settings.shortcuts':'鍵盤快捷鍵','settings.close':'關閉',
  'settings.about':'Drama Cue — 內部戲劇音效播放系統。音效會預載後才播放；演出期間請保持此分頁在前台。',
  'help.go':'GO：執行待命中的 cue','help.panic':'緊急停止：淡出並停止所有音效',
  'help.standby':'移動待命指標','help.hotkey':'執行設有該快捷鍵的 cue（待命指標不會移動）',
  'dialog.ok':'確定','dialog.cancel':'取消','dialog.confirm':'確認',
  'dialog.delCueTitle':'確定刪除此 cue？','dialog.delCueBody':'此操作無法復原。',
  'dialog.delShowTitle':'確定刪除此演出？','dialog.delShowBody':'整個 cue 表會被刪除，已上載的音效檔案仍保留在儲存空間。',
  'dialog.newShow':'新增演出','dialog.renameShow':'重新命名演出','dialog.showName':'演出名稱','dialog.defaultShow':'演出 1',
  'dialog.lockTitle':'鎖定系統？','dialog.lockBody':'所有播放中的音效將會停止。',
  'toast.uploading':'正在上載 {name}……','toast.uploaded':'已上載 {name}',
  'toast.panic':'已緊急停止所有音效','toast.preloading':'正在預載音效……',
  'toast.preloadDone':'已預載 {ok}/{total} 個檔案','toast.preloadFail':'部分音效預載失敗',
  'toast.imported':'已匯入演出','toast.exported':'已匯出 JSON','toast.saved':'已儲存',
  'toast.hotkeyReserved':'此按鍵為系統保留','toast.locked':'系統已鎖定',
  'toast.endOfList':'已到 cue 表末端'
};

const dict = { en, 'zh-HK': zhHK };
let lang = localStorage.getItem('dc.lang') || 'en';

export function setLang(l){
  lang = dict[l] ? l : 'en';
  localStorage.setItem('dc.lang', lang);
  document.documentElement.lang = lang === 'zh-HK' ? 'zh-Hant-HK' : 'en';
}
export function getLang(){ return lang; }
export function t(key, vars){
  let s = dict[lang][key] ?? dict.en[key] ?? key;
  if (vars) for (const [k,v] of Object.entries(vars)) s = s.split('{'+k+'}').join(v);
  return s;
}
export function applyI18n(root = document){
  root.querySelectorAll('[data-i18n]').forEach(el => el.textContent = t(el.dataset.i18n));
  root.querySelectorAll('[data-i18n-ph]').forEach(el => el.placeholder = t(el.dataset.i18nPh));
  root.querySelectorAll('[data-i18n-title]').forEach(el => el.title = t(el.dataset.i18nTitle));
}
