/* Drama Cue — Firebase web config
   Public identifiers, not secrets. Access is controlled by
   Firestore rules + disabled sign-up + authorized domains.
   Plan B: Firestore + Auth only. No Storage, no Analytics. */
window.DC_CONFIG = {
  apiKey:            "AIzaSyCaRX9EhV129kkjY9vKERZ4JHipo2R6MzM",
  authDomain:        "drama-cue.firebaseapp.com",
  projectId:         "drama-cue",
  messagingSenderId: "781940956760",
  appId:             "1:781940956760:web:d31c7981d1369fe981f42d"
};

/* Audio lives in the repository, not Firebase Storage.
   folder   = repo folder holding the files
   manifest = filenames shown in the Link audio picker */
window.DC_AUDIO = {
  useStorage: false,
  folder: "audio",
  manifest: [
    "rain.mp3",
    "thunder.mp3",
    "wind.mp3",
    "door-knock.mp3",
    "telephone.mp3",
    "clock-tick.mp3",
    "heartbeat.mp3",
    "applause.mp3",
    "chime.mp3",
    "whoosh.mp3"
  ]
};
