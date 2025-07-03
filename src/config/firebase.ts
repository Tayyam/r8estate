import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";
import { getStorage } from "firebase/storage";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyBlmkBNHlAdBp6GdBpO59iycbeMGTi8OaU",
  authDomain: "r8estate-2a516.firebaseapp.com",
  projectId: "r8estate-2a516",
  storageBucket: "r8estate-2a516.firebasestorage.app",
  messagingSenderId: "966003063761",
  appId: "1:966003063761:web:1e908057c14c9d0f4b3ef0",
  measurementId: "G-LMHJDTP9NF"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app);
export const storage = getStorage(app);
export const analytics = getAnalytics(app);

export default app;