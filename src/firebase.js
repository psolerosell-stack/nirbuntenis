import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCqksdU-AEczixmlJrzcs_lF4tBDmWfNQo",
  authDomain: "nirbuntenis.firebaseapp.com",
  projectId: "nirbuntenis",
  storageBucket: "nirbuntenis.firebasestorage.app",
  messagingSenderId: "501241543866",
  appId: "1:501241543866:web:72290e92611c7c88195683"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
