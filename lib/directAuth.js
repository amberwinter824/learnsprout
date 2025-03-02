// lib/directAuth.js
import { 
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword 
  } from 'firebase/auth';
  import { auth } from './firebase';
  
  export async function createAccount(email, password) {
    try {
      console.log("Creating account for:", email);
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      return userCredential.user;
    } catch (error) {
      console.error("Direct auth error:", error);
      throw error;
    }
  }