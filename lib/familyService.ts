// lib/familyService.ts
import { 
    doc, 
    collection, 
    setDoc, 
    getDoc, 
    updateDoc, 
    arrayUnion, 
    arrayRemove, 
    query, 
    where, 
    getDocs,
    serverTimestamp, 
    Timestamp 
  } from 'firebase/firestore';
  import { db } from './firebase';
  import { Family } from './dataTypes'; // Import your data types
  import { UserData } from '../contexts/AuthContext';
  import { nanoid } from 'nanoid'; // For generating invite codes
  import { sendFamilyInvitationEmail } from './emailService';
  
  // Create a new family
  export const createFamily = async (
    userId: string, 
    familyName: string
  ): Promise<string> => {
    // Create a new family document with the user as the owner
    const familyRef = doc(collection(db, 'families'));
    
    await setDoc(familyRef, {
      name: familyName,
      ownerId: userId,
      memberIds: [userId], // Owner is also a member
      childrenIds: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    // Update the user document to include family information
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      familyId: familyRef.id,
      familyRole: 'owner',
      familyName: familyName,
      updatedAt: serverTimestamp()
    });
    
    return familyRef.id;
  };
  
  // Function to get a family by ID
  export const getFamily = async (familyId: string): Promise<Family | null> => {
    try {
      const familyDoc = await getDoc(doc(db, 'families', familyId));
      if (!familyDoc.exists()) return null;
      
      return { id: familyDoc.id, ...familyDoc.data() } as Family;
    } catch (error) {
      console.error('Error getting family:', error);
      return null;
    }
  };
  
  // Function to add a child to a family
  export const addChildToFamily = async (
    familyId: string, 
    childId: string
  ): Promise<boolean> => {
    try {
      const familyRef = doc(db, 'families', familyId);
      const familyDoc = await getDoc(familyRef);
      
      if (!familyDoc.exists()) {
        throw new Error('Family not found');
      }
      
      // Update the family document
      await updateDoc(familyRef, {
        childrenIds: arrayUnion(childId),
        updatedAt: serverTimestamp()
      });
      
      return true;
    } catch (error) {
      console.error('Error adding child to family:', error);
      return false;
    }
  };
  
  // Create an invitation to a family
  export const createFamilyInvitation = async (
    userId: string, 
    familyId: string,
    recipientEmail: string
  ): Promise<string> => {
    // Generate a unique invite code
    const inviteCode = nanoid(10);
    
    // Get family name and inviter name
    const familyDoc = await getDoc(doc(db, 'families', familyId));
    const userDoc = await getDoc(doc(db, 'users', userId));
    
    if (!familyDoc.exists() || !userDoc.exists()) {
      throw new Error('Family or user not found');
    }
    
    const familyName = familyDoc.data().name;
    const inviterName = userDoc.data().displayName || userDoc.data().email;
    
    // Store the invitation in a new collection
    const inviteRef = doc(collection(db, 'familyInvitations'));
    await setDoc(inviteRef, {
      inviteCode,
      familyId,
      inviterUserId: userId,
      recipientEmail,
      status: 'pending',
      createdAt: serverTimestamp(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
    });
    
    // Generate the invitation URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (typeof window !== 'undefined' ? window.location.origin : '');
    const inviteUrl = `${baseUrl}/signup?invite=${inviteCode}&email=${encodeURIComponent(recipientEmail)}`;
    
    // Send the invitation email using the API endpoint
    try {
      const response = await fetch('/api/family/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipientEmail,
          inviteUrl,
          familyName,
          inviterName
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send invitation email');
      }
    } catch (error) {
      console.error('Error sending invitation email:', error);
      // Still return the URL even if email fails
      throw { message: 'Failed to send invitation email. Please try again or use the invitation link below.', url: inviteUrl };
    }
    
    return inviteUrl;
  };
  
  // Accept a family invitation
  export const acceptFamilyInvitation = async (
    userId: string, 
    inviteCode: string
  ): Promise<boolean> => {
    try {
      // Find the invitation
      const invitesQuery = query(
        collection(db, 'familyInvitations'), 
        where('inviteCode', '==', inviteCode),
        where('status', '==', 'pending')
      );
      
      const querySnapshot = await getDocs(invitesQuery);
      if (querySnapshot.empty) {
        throw new Error('Invitation not found or already used');
      }
      
      const inviteDoc = querySnapshot.docs[0];
      const inviteData = inviteDoc.data();
      
      // Check if invitation has expired
      const expiresAt = inviteData.expiresAt instanceof Timestamp 
        ? inviteData.expiresAt.toDate() 
        : new Date(inviteData.expiresAt);
        
      if (expiresAt < new Date()) {
        throw new Error('Invitation has expired');
      }
      
      const familyId = inviteData.familyId;
      
      // Get the family
      const familyDoc = await getDoc(doc(db, 'families', familyId));
      if (!familyDoc.exists()) {
        throw new Error('Family not found');
      }
      
      // Add user to family
      await updateDoc(doc(db, 'families', familyId), {
        memberIds: arrayUnion(userId),
        updatedAt: serverTimestamp()
      });
      
      // Update user's document
      await updateDoc(doc(db, 'users', userId), {
        familyId: familyId,
        familyRole: 'member',
        updatedAt: serverTimestamp()
      });

      // Get all children in the family
      const childrenQuery = query(
        collection(db, 'children'),
        where('familyId', '==', familyId)
      );
      const childrenSnapshot = await getDocs(childrenQuery);
      
      // Update each child's document to include the new user in their access list
      const updatePromises = childrenSnapshot.docs.map(async (childDoc) => {
        const childData = childDoc.data();
        const accessList = childData.accessList || [];
        if (!accessList.includes(userId)) {
          await updateDoc(doc(db, 'children', childDoc.id), {
            accessList: arrayUnion(userId),
            updatedAt: serverTimestamp()
          });
        }
      });
      
      // Wait for all child updates to complete
      await Promise.all(updatePromises);
      
      // Mark invitation as accepted
      await updateDoc(doc(db, 'familyInvitations', inviteDoc.id), {
        status: 'accepted',
        acceptedAt: serverTimestamp(),
        acceptedByUserId: userId
      });
      
      return true;
    } catch (error) {
      console.error('Error accepting invitation:', error);
      return false;
    }
  };
  
  // Get all family members
  export const getFamilyMembers = async (familyId: string): Promise<UserData[]> => {
    try {
      const family = await getFamily(familyId);
      if (!family) {
        throw new Error('Family not found');
      }
      
      const memberIds = family.memberIds || [];
      const members: UserData[] = [];
      
      // Get each member's data
      for (const memberId of memberIds) {
        const memberDoc = await getDoc(doc(db, 'users', memberId));
        if (memberDoc.exists()) {
          members.push({
            ...memberDoc.data() as UserData,
            uid: memberDoc.id
          });
        }
      }
      
      return members;
    } catch (error) {
      console.error('Error getting family members:', error);
      return [];
    }
  };
  
  // Remove a member from a family (can be used for leaving or removing)
  export const removeFromFamily = async (
    familyId: string, 
    userId: string, 
    isOwner: boolean
  ): Promise<boolean> => {
    try {
      // Start with removing user from members list
      await updateDoc(doc(db, 'families', familyId), {
        memberIds: arrayRemove(userId),
        updatedAt: serverTimestamp()
      });
      
      // Update user document
      await updateDoc(doc(db, 'users', userId), {
        familyId: null,
        familyRole: null,
        familyName: null,
        updatedAt: serverTimestamp()
      });
      
      // If this was the owner, and they're leaving, we need to either
      // transfer ownership or delete the family (or make it inactive)
      if (isOwner) {
        const family = await getFamily(familyId);
        
        if (family && family.memberIds.length > 0) {
          // Transfer ownership to the first remaining member
          const newOwnerId = family.memberIds[0];
          await updateDoc(doc(db, 'families', familyId), {
            ownerId: newOwnerId,
            updatedAt: serverTimestamp()
          });
          
          // Update the new owner's role
          await updateDoc(doc(db, 'users', newOwnerId), {
            familyRole: 'owner',
            updatedAt: serverTimestamp()
          });
        } else {
          // No members left, mark as inactive or delete
          await updateDoc(doc(db, 'families', familyId), {
            status: 'inactive',
            updatedAt: serverTimestamp()
          });
        }
      }
      
      return true;
    } catch (error) {
      console.error('Error removing from family:', error);
      return false;
    }
  };
  
  // Check if a user has access to a specific child
  export const hasChildAccess = async (
    userId: string, 
    childId: string
  ): Promise<boolean> => {
    try {
      // First check if the user is the direct parent of the child
      const childDoc = await getDoc(doc(db, 'children', childId));
      if (!childDoc.exists()) return false;
      
      const childData = childDoc.data();
      
      // If the user is the direct parent, they have access
      if (childData.userId === userId) return true;
      
      // If not, check if they're part of a family that has access
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (!userDoc.exists()) return false;
      
      const userData = userDoc.data();
      
      // If user has no family, they don't have access
      if (!userData.familyId) return false;
      
      // Check if the child is part of the family
      const familyDoc = await getDoc(doc(db, 'families', userData.familyId));
      if (!familyDoc.exists()) return false;
      
      const familyData = familyDoc.data();
      return familyData.childrenIds.includes(childId);
    } catch (error) {
      console.error('Error checking child access:', error);
      return false;
    }
  };
  
  export interface InvitationDetails {
    id: string;
    familyId: string;
    familyName: string;
    recipientEmail: string;
    status: string;
    createdAt: any;
    expiresAt: any;
  }

  // Get invitation details by code
  export const getInvitationByCode = async (inviteCode: string): Promise<any | null> => {
    try {
      const invitesQuery = query(
        collection(db, 'familyInvitations'),
        where('inviteCode', '==', inviteCode),
        where('status', '==', 'pending')
      );
      
      const querySnapshot = await getDocs(invitesQuery);
      if (querySnapshot.empty) {
        return null;
      }
      
      const inviteDoc = querySnapshot.docs[0];
      return { id: inviteDoc.id, ...inviteDoc.data() };
    } catch (error) {
      console.error('Error getting invitation:', error);
      return null;
    }
  };