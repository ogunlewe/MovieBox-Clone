import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore/lite";
import { getAuth } from "firebase/auth/dist/esm/index.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBC-WShPlg24RmiCySB1meVCsN1ur9EDjI",
  authDomain: "moviebox-ced7f.firebaseapp.com",
  projectId: "moviebox-ced7f",
  storageBucket: "moviebox-ced7f.firebasestorage.app",
  messagingSenderId: "640602090923",
  appId: "1:640602090923:web:ef6e343de4b6d7d39ab6ee",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export { db, auth };
