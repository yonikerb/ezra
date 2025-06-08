// firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyACrXL122Kj6d9X8TdFNYGWibCrocDvZOQ",
  authDomain: "ezra-5e403.firebaseapp.com",
  projectId: "ezra-5e403",
  storageBucket: "ezra-5e403.appspot.com",
  messagingSenderId: "1012298266788",
  appId: "1:1012298266788:web:5c393e407922aa8dd8ce31"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };
