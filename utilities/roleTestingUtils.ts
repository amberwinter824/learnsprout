// utilities/roleTestingUtils.js
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase.js';

/**
 * Utility to test role-based access during development
 * Warning: Only use in development environments!
 */
export async function testUserWithRole(
  email: string, 
  password: string, 
  role: 'parent' | 'educator' | 'admin' | 'specialist'
) {
  if (process.env.NODE_ENV !== 'development') {
    console.error('This function should only be used in development!');
    return null;
  }
  
  try {
    // Sign in the user
    const auth = getAuth();
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Update role in Firestore
    const userRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      await updateDoc(userRef, { role });
      console.log(`Updated user ${user.uid} role to ${role} in Firestore`);
      
      // Call the API to update custom claims
      const idToken = await user.getIdToken();
      await fetch('/api/auth/set-role', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          userId: user.uid,
          role,
          adminKey: process.env.NEXT_PUBLIC_ADMIN_API_KEY
        })
      });
      
      // Refresh token to get updated claims
      await user.getIdToken(true);
      
      return {
        uid: user.uid,
        email: user.email,
        role
      };
    } else {
      console.error('User document not found in Firestore');
      return null;
    }
  } catch (error) {
    console.error('Error testing user with role:', error);
    return null;
  }
}