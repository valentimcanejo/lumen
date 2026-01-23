import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

// Optionally import the services that you want to use
// import {...} from 'firebase/auth';
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

export const app = initializeApp(firebaseConfig);
export const analytics = getAnalytics(app);
// For more information on how to access Firebase in your project,
// see the Firebase documentation: https://firebase.google.com/docs/web/setup#access-firebase
