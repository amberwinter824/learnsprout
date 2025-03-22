const { initializeApp } = require('firebase/app');
const { getFirestore, doc, updateDoc, setDoc, getDoc } = require('firebase/firestore');
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

async function setupTestFamily(email, password) {
  try {
    // Sign in with the test account
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const userId = userCredential.user.uid;

    // Create a test family
    const familyId = `test_family_${Date.now()}`;
    await setDoc(doc(db, 'families', familyId), {
      name: 'Test Family',
      createdBy: userId,
      memberIds: [userId],
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Update user with family ID
    await updateDoc(doc(db, 'users', userId), {
      familyId: familyId,
      role: 'parent',
      updatedAt: new Date()
    });

    console.log('Test family created successfully!');
    console.log('Family ID:', familyId);
    console.log('User ID:', userId);

    return { familyId, userId };
  } catch (error) {
    console.error('Error setting up test family:', error);
    throw error;
  }
}

async function addTestMember(familyId, email, password, role = 'member') {
  try {
    // Sign in with the test account
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const userId = userCredential.user.uid;

    // Add user to family
    const familyRef = doc(db, 'families', familyId);
    const familyDoc = await getDoc(familyRef);
    
    if (familyDoc.exists()) {
      const familyData = familyDoc.data();
      const memberIds = [...(familyData.memberIds || []), userId];
      
      await updateDoc(familyRef, {
        memberIds,
        updatedAt: new Date()
      });

      // Update user with family ID and role
      await updateDoc(doc(db, 'users', userId), {
        familyId: familyId,
        role: role,
        updatedAt: new Date()
      });

      console.log(`Successfully added user ${userId} to family ${familyId} as ${role}`);
    } else {
      throw new Error('Family not found');
    }
  } catch (error) {
    console.error('Error adding test member:', error);
    throw error;
  }
}

// Example usage:
// setupTestFamily('test@example.com', 'password123')
//   .then(({ familyId }) => addTestMember(familyId, 'member@example.com', 'password123'))
//   .catch(console.error);

module.exports = { setupTestFamily, addTestMember }; 