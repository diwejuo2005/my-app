import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCES2-GoOz6jdAjdJh-tboW6WZYXzue-ek",
  authDomain: "ensemble-7e6bd.firebaseapp.com",
  projectId: "ensemble-7e6bd",
  storageBucket: "ensemble-7e6bd.firebasestorage.app",
  messagingSenderId: "473004223053",
  appId: "1:473004223053:web:2d442861e2deb45d1e8a04",
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
