// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCaRX9EhV129kkjY9vKERZ4JHipo2R6MzM",
  authDomain: "drama-cue.firebaseapp.com",
  projectId: "drama-cue",
  storageBucket: "drama-cue.firebasestorage.app",
  messagingSenderId: "781940956760",
  appId: "1:781940956760:web:d31c7981d1369fe981f42d",
  measurementId: "G-TR664GV1VH"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
