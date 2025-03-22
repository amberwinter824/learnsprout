const { initializeApp } = require('firebase/app');
const { getFirestore, doc, updateDoc } = require('firebase/firestore');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');

// Your Firebase config
const firebaseConfig = {
  // Add your Firebase config here
  // You can get this from your Firebase Console
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

async function updateUserRole(email, password, newRole) {
  try {
    // Sign in with the test account
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const userId = userCredential.user.uid;

    // Update the user's role in Firestore
    await updateDoc(doc(db, 'users', userId), {
      role: newRole,
      updatedAt: new Date()
    });

    console.log(`Successfully updated user role to: ${newRole}`);
  } catch (error) {
    console.error('Error updating user role:', error);
  }
}

// Example usage:
// updateUserRole('test@example.com', 'password123', 'parent');
// updateUserRole('test@example.com', 'password123', 'member');

module.exports = { updateUserRole }; 