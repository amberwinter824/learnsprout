import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// Initialize admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

interface UpdateMaterialData {
  materialId: string;
  isCommonHouseholdItem: boolean;
}

export const updateMaterialStatus = functions.https.onCall(async (data: UpdateMaterialData, context: functions.https.CallableContext) => {
  // Ensure user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Must be authenticated to update materials.'
    );
  }

  const { materialId, isCommonHouseholdItem } = data;
  
  try {
    await admin.firestore()
      .collection('materials')
      .doc(materialId)
      .update({
        isCommonHouseholdItem: isCommonHouseholdItem
      });
    
    return { success: true };
  } catch (error) {
    console.error('Error updating material:', error);
    throw new functions.https.HttpsError(
      'internal',
      'Error updating material status'
    );
  }
}); 