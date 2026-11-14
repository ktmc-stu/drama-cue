/* Firebase web config. Public identifiers, not secrets.
   Plan B: Firestore + Auth only. Cloud Storage is NOT used. */
window.DC_CONFIG = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

/* Audio source configuration.
   useStorage:false  -> audio comes from the repo folder or an external URL (no Blaze needed)
   folder            -> repository folder holding your audio files
   manifest          -> filenames shown in the "Link audio" picker; keep this in sync with the folder */
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
