// Firebase Web config. These values are PUBLIC identifiers (not secrets).
// Security comes from firestore.rules / storage.rules + Firebase Auth.
// Firebase console → Project settings → General → Your apps → Web app → SDK setup.
export const firebaseConfig = {
  apiKey:            "YOUR_API_KEY",
  authDomain:        "YOUR_PROJECT.firebaseapp.com",
  projectId:         "YOUR_PROJECT",
  storageBucket:     "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId:             "YOUR_APP_ID"
};
