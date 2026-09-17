import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import { getAnalytics, isSupported } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-analytics.js";
import { getAuth, GoogleAuthProvider, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import { getFunctions } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-functions.js";

const firebaseConfig = {
  apiKey: "AIzaSyB5I6RG-FicgOThwhl-1LLWySo3JRjK1YI",
  authDomain: "bompre-8a7c0.firebaseapp.com",
  databaseURL: "https://bompre-8a7c0-default-rtdb.firebaseio.com",
  projectId: "bompre-8a7c0",
  storageBucket: "bompre-8a7c0.firebasestorage.app",
  messagingSenderId: "390830730249",
  appId: "1:390830730249:web:106a313c6d2bae02ec5cd8",
  measurementId: "G-1YMHNC0Z31"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app, "southamerica-east1");
export const googleProvider = new GoogleAuthProvider();

googleProvider.setCustomParameters({ prompt: "select_account" });
setPersistence(auth, browserLocalPersistence).catch(console.error);

isSupported().then((ok) => {
  if (ok) getAnalytics(app);
}).catch(() => {});
