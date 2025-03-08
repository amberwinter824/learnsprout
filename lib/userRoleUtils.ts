// lib/userRoleUtils.ts
import { doc, updateDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { getIdToken } from 'firebase/auth';

/**
 * Updates a user's role in Firestore and sets custom claims through Firebase Auth
 * @param userId The Firebase Auth user ID
 * @param role The new role to set ('parent', 'educator', 'admin', or 'specialist')
 * @param currentUser The currently authenticated Firebase Auth user object
 * @returns Promise resolving to success message
 */
export async function updateUserRole(userId: string, role: string, currentUser: any) {
  try {
    if (!userId || !role) {
      throw new Error('User ID and role are required');
    }
    
    // Validate role
    const validRoles = ['parent', 'educator', 'admin', 'specialist'];
    if (!validRoles.includes(role)) {
      throw new Error(`Invalid role: ${role}. Must be one of: ${validRoles.join(', ')}`);
    }
    
    // Check if the user exists in Firestore
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      throw new Error(`User with ID ${userId} not found in Firestore`);
    }
    
    // Update the user's role in Firestore
    await updateDoc(userRef, {
      role,
      updatedAt: serverTimestamp()
    });
    
    // Get an ID token for the current user (for authentication)
    const idToken = await getIdToken(currentUser, true);
    
    // Call our API to update Firebase Auth custom claims
    const response = await fetch('/api/auth/set-role', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`
      },
      body: JSON.stringify({
        userId,
        role,
        // In production, use a more secure method than hardcoding this
        adminKey: process.env.NEXT_PUBLIC_ADMIN_API_KEY
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Failed to update custom claims: ${errorData.error || response.statusText}`);
    }
    
    // Force token refresh to include the new custom claims
    await getIdToken(currentUser, true);
    
    return {
      success: true,
      message: `User role updated to ${role} for user ${userId}`
    };
  } catch (error: any) {
    console.error('Error updating user role:', error);
    throw error;
  }
}

/**
 * Gets a user's current role from Firestore
 * @param userId The Firebase Auth user ID
 * @returns Promise resolving to the user's role
 */
export async function getUserRole(userId: string): Promise<string> {
  try {
    if (!userId) {
      throw new Error('User ID is required');
    }
    
    // Get the user from Firestore
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      throw new Error(`User with ID ${userId} not found in Firestore`);
    }
    
    // Return the role field or default to 'parent' if not set
    return userDoc.data().role || 'parent';
  } catch (error: any) {
    console.error('Error getting user role:', error);
    throw error;
  }
}

/**
 * Assigns a user to an institution (for educators and admins)
 * @param userId The Firebase Auth user ID
 * @param institutionId The ID of the institution
 * @returns Promise resolving to success message
 */
export async function assignUserToInstitution(userId: string, institutionId: string) {
  try {
    if (!userId || !institutionId) {
      throw new Error('User ID and institution ID are required');
    }
    
    // Check if the user exists
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      throw new Error(`User with ID ${userId} not found`);
    }
    
    // Check if the institution exists
    const institutionRef = doc(db, 'institutions', institutionId);
    const institutionDoc = await getDoc(institutionRef);
    
    if (!institutionDoc.exists()) {
      throw new Error(`Institution with ID ${institutionId} not found`);
    }
    
    // Get current associations or initialize empty array
    const userData = userDoc.data();
    const currentInstitutions = userData.associatedInstitutions || [];
    
    // Add the institution if not already associated
    if (!currentInstitutions.includes(institutionId)) {
      await updateDoc(userRef, {
        associatedInstitutions: [...currentInstitutions, institutionId],
        updatedAt: serverTimestamp()
      });
    }
    
    return {
      success: true,
      message: `User ${userId} assigned to institution ${institutionId}`
    };
  } catch (error: any) {
    console.error('Error assigning user to institution:', error);
    throw error;
  }
}

/**
 * Removes a user from an institution
 * @param userId The Firebase Auth user ID
 * @param institutionId The ID of the institution
 * @returns Promise resolving to success message
 */
export async function removeUserFromInstitution(userId: string, institutionId: string) {
  try {
    if (!userId || !institutionId) {
      throw new Error('User ID and institution ID are required');
    }
    
    // Get the user document
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      throw new Error(`User with ID ${userId} not found`);
    }
    
    // Get current associations
    const userData = userDoc.data();
    const currentInstitutions = userData.associatedInstitutions || [];
    
    // Remove the institution
    if (currentInstitutions.includes(institutionId)) {
      await updateDoc(userRef, {
        associatedInstitutions: currentInstitutions.filter(
          (id: string) => id !== institutionId
        ),
        updatedAt: serverTimestamp()
      });
    }
    
    return {
      success: true,
      message: `User ${userId} removed from institution ${institutionId}`
    };
  } catch (error: any) {
    console.error('Error removing user from institution:', error);
    throw error;
  }
}