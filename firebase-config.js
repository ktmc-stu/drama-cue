/* Public web identifiers — not secrets. Access is enforced by Auth + the rules files.
   Firebase console → Project settings → General → Your apps → Web app → SDK setup.
   Leave the placeholders to run the fully working Offline desk instead. */
export const firebaseConfig = {
  apiKey:            "YOUR_API_KEY",
  authDomain:        "YOUR_PROJECT.firebaseapp.com",
  projectId:         "YOUR_PROJECT",
  storageBucket:     "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId:             "YOUR_APP_ID"
};
