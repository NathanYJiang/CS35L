import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAAP_qgm_C1bQEOyThlkR0AgYN0DPsnrlE",
  authDomain: "cs35l-6f8a8.firebaseapp.com",
  projectId: "cs35l-6f8a8",
  storageBucket: "cs35l-6f8a8.firebasestorage.app",
  messagingSenderId: "771352808664",
  appId: "1:771352808664:web:5f0bddac0497bfe290dbad",
  measurementId: "G-73NDVT7M2F"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
