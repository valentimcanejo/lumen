import { getApp, getApps, initializeApp } from "firebase/app";
// Optionally import the services that you want to use
import {
  getAuth,
  initializeAuth,
  getReactNativePersistence,
} from "firebase/auth";
import { initializeFirestore, persistentLocalCache } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getFunctions } from "firebase/functions";
import ReactNativeAsyncStorage from "@react-native-async-storage/async-storage";
// import {...} from 'firebase/database';
// import {...} from 'firebase/firestore';
// import {...} from 'firebase/functions';
// import {...} from 'firebase/storage';

// Initialize Firebase
const firebaseConfig = {
  apiKey: "AIzaSyARMNi1K_FHOa-X_xc-5Sv0p2lz_xbxIpg",
  authDomain: "lumen-13d0d.firebaseapp.com",
  projectId: "lumen-13d0d",
  storageBucket: "lumen-13d0d.firebasestorage.app",
  messagingSenderId: "304073115831",
  appId: "1:304073115831:web:868b3ac0601801ac2e2532",
  measurementId: "G-SQ06LBMECX",
};
export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage),
});
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache(),
});
export const storage = getStorage(app);
export const functions = getFunctions(app);

// For more information on how to access Firebase in your project,
// see the Firebase documentation: https://firebase.google.com/docs/web/setup#access-firebase
