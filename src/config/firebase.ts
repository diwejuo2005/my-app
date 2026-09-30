import ReactNativeAsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
// firebase/auth's own package.json exports map has no "react-native" condition,
// so it never resolves to the build containing getReactNativePersistence.
// @firebase/auth does have that build, and Metro picks it correctly at runtime,
// but its exports map lists a generic "types" key before "react-native", so tsc
// always resolves the non-RN .d.ts here — a known upstream packaging ordering bug.
// @ts-expect-error — getReactNativePersistence exists in the RN build Metro resolves at runtime
import { getAuth, getReactNativePersistence, initializeAuth } from "@firebase/auth";
import { getApp, getApps, initializeApp } from "firebase/app";
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

// getReactNativePersistence only exists in @firebase/auth's react-native build —
// the web build (used when this runs in a browser, e.g. `expo start --web`) has
// no such thing and falls back to its own default browser persistence via
// plain getAuth().
export const auth = Platform.OS === "web"
  ? getAuth(app)
  : initializeAuth(app, { persistence: getReactNativePersistence(ReactNativeAsyncStorage) });
export const db = getFirestore(app);
export const storage = getStorage(app);
