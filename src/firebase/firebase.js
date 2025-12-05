import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage"; 


const firebaseConfig = {
  apiKey: "AIzaSyAXdM6Fh-e7Gy68JS1JkT9L7ulX-HfaMZE",
  authDomain: "myiitspeakup.firebaseapp.com",
  projectId: "myiitspeakup",
  storageBucket: "myiitspeakup.firebasestorage.app",
  messagingSenderId: "35615024224",
  appId: "1:35615024224:web:7c915c724262fff887cf05",
  measurementId: "G-2XNKXLH7C7"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db , storage, firebaseConfig};

