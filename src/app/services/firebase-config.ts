// Import the functions you need from the SDKs you need
import { getAnalytics } from "firebase/analytics";
import { getApp, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { CACHE_SIZE_UNLIMITED, initializeFirestore, persistentLocalCache } from "firebase/firestore";
import { getFunctions } from "firebase/functions";
import { getStorage } from "firebase/storage";
import { environment } from "src/environments/environment";

const firebaseConfig = environment.firebaseConfig;

const app = initializeApp(firebaseConfig);
export const analytics = getAnalytics(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
export const firebaseApp = getApp();
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ cacheSizeBytes: CACHE_SIZE_UNLIMITED })
});
// Cloud Functions are deployed in asia-southeast1 (see Naikit-Sticker-BE).
// httpsCallable picks the region from this instance.
export const functions = getFunctions(app, 'asia-southeast1');