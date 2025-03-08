// lib/progressTracking.ts - Enhanced version
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy, 
  getDocs,
  getDoc,
  serverTimestamp,
  Timestamp,
  limit
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase';

// Type definitions
export interface ProgressRecordData {
  childId: string;
  userId: string;
  activityId: string;
  date: Date | Timestamp;
  completionStatus: 'started' | 'in_progress' | 'completed';
  engagementLevel: 'low' | 'medium' | 'high';
  interestLevel: 'low' | 'medium' | 'high';
  completionDifficulty: 'easy' | 'appropriate' | 'challenging';
  notes: string;
  photoUrls?: string[];
  skillsDemonstrated: string[];
  skillObservations?: Record<string, string>;
  // New fields for environment context
  environmentContext?: "home" | "school" | "other";
  observationType?: "milestone" | "interest" | "challenge" | "general";
  visibility?: string[]; // Users allowed to view this observation
  weeklyPlanId?: string;
  dayOfWeek?: string;
  createdAt?: any;
  updatedAt?: any;
  // Optional fields that might be added during processing
  activityTitle?: string;
}

export interface ProgressRecord extends ProgressRecordData {
  id: string;
}

export interface ChildSkillData {
  childId: string;
  skillId: string;
  status: 'emerging' | 'developing' | 'mastered';
  lastAssessed: Date | Timestamp;
  notes: string;
  updatedAt?: any;
}

/**
 * Add a progress record with detailed observations
 */
export async function addProgressRecord(
  childId: string, 
  userId: string, 
  data: Partial<ProgressRecordData>,
  photoFile?: File | null
): Promise<string> {
  try {
    console.log('Adding progress record:', {
      childId, 
      userId,
      activityId: data.activityId,
      weeklyPlanId: data.weeklyPlanId,
      dayOfWeek: data.dayOfWeek
    });
    
    // Upload photo if provided
    let photoUrl: string | undefined;
    if (photoFile) {
      photoUrl = await uploadProgressPhoto(childId, photoFile);
    }
    
    // Create progress record data
    const progressData: any = {
      childId,
      userId,
      activityId: data.activityId,
      date: data.date || new Date(),
      completionStatus: data.completionStatus || 'completed',
      engagementLevel: data.engagementLevel || 'medium',
      interestLevel: data.interestLevel || 'medium',
      completionDifficulty: data.completionDifficulty || 'appropriate',
      notes: data.notes || '',
      photoUrls: photoUrl ? [photoUrl] : [],
      skillsDemonstrated: data.skillsDemonstrated || [],
      skillObservations: data.skillObservations || {}, // Map of skillId -> observation text
      weeklyPlanId: data.weeklyPlanId || null, // Store the weekly plan ID
      dayOfWeek: data.dayOfWeek || null, // Store the day of week
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    // Add new environment context fields if present
    if (data.environmentContext) {
      progressData.environmentContext = data.environmentContext;
    }
    
    if (data.observationType) {
      progressData.observationType = data.observationType;
    }
    
    if (data.visibility) {
      progressData.visibility = data.visibility;
    }
    
    // Create the progress record
    const progressRef = await addDoc(collection(db, 'progressRecords'), progressData);
    
    console.log('Progress record created with ID:', progressRef.id);
    
    // Update child skills based on observations
    if (data.skillsDemonstrated && data.skillsDemonstrated.length > 0) {
      await updateChildSkills(childId, data.skillsDemonstrated, data.skillObservations || {});
    }
    
    // Update weekly plan if this activity was from a plan
    if (data.weeklyPlanId && data.dayOfWeek && data.activityId) {
      console.log('Updating weekly plan status:', {
        planId: data.weeklyPlanId,
        day: data.dayOfWeek,
        activityId: data.activityId
      });
      
      await updateWeeklyPlanStatus(
        data.weeklyPlanId, 
        data.dayOfWeek, 
        data.activityId, 
        'completed'
      );
    }
    
    return progressRef.id;
  } catch (error) {
    console.error('Error adding progress record:', error);
    throw error;
  }
}

/**
 * Upload a photo for a progress record
 */
async function uploadProgressPhoto(childId: string, file: File): Promise<string> {
  try {
    // Create a reference to the file location in Firebase Storage
    const timestamp = Date.now();
    const fileName = `${childId}_${timestamp}_${file.name}`;
    const photoRef = ref(storage, `progress/${childId}/${fileName}`);
    
    // Upload the file
    await uploadBytes(photoRef, file);
    
    // Get download URL
    const photoUrl = await getDownloadURL(photoRef);
    
    return photoUrl;
  } catch (error) {
    console.error('Error uploading photo:', error);
    throw error;
  }
}

/**
 * Update child skill levels based on observations
 */
async function updateChildSkills(
  childId: string, 
  skillsDemonstrated: string[], 
  skillObservations: Record<string, string> = {}
): Promise<void> {
  try {
    for (const skillId of skillsDemonstrated) {
      // Check if skill record exists
      const skillQuery = query(
        collection(db, 'childSkills'),
        where('childId', '==', childId),
        where('skillId', '==', skillId)
      );
      
      const skillSnapshot = await getDocs(skillQuery);
      
      if (skillSnapshot.empty) {
        // Create new skill record
        await addDoc(collection(db, 'childSkills'), {
          childId,
          skillId,
          status: 'emerging',
          lastAssessed: new Date(),
          notes: skillObservations[skillId] || 'Skill first demonstrated',
          updatedAt: serverTimestamp()
        });
      } else {
        // Update existing skill record
        const skillDoc = skillSnapshot.docs[0];
        const skillData = skillDoc.data() as ChildSkillData;
        let newStatus = skillData.status;
        
        // Check how many times this skill has been demonstrated
        const demonstrationsQuery = query(
          collection(db, 'progressRecords'),
          where('childId', '==', childId),
          where('skillsDemonstrated', 'array-contains', skillId)
        );
        
        const demonstrationsSnapshot = await getDocs(demonstrationsQuery);
        const demonstrationCount = demonstrationsSnapshot.size;
        
        // Update status based on number of demonstrations
        if (skillData.status === 'emerging' && demonstrationCount >= 3) {
          newStatus = 'developing';
        } else if (skillData.status === 'developing' && demonstrationCount >= 5) {
          newStatus = 'mastered';
        }
        
        await updateDoc(doc(db, 'childSkills', skillDoc.id), {
          status: newStatus,
          lastAssessed: new Date(),
          notes: skillObservations[skillId] || skillData.notes,
          updatedAt: serverTimestamp()
        });
      }
    }
  } catch (error) {
    console.error('Error updating child skills:', error);
  }
}

/**
 * Update activity status in weekly plan
 */
async function updateWeeklyPlanStatus(
  planId: string, 
  dayOfWeek: string, 
  activityId: string, 
  status: 'suggested' | 'confirmed' | 'completed'
): Promise<void> {
  try {
    const planRef = doc(db, 'weeklyPlans', planId);
    const planSnapshot = await getDoc(planRef);
    
    if (!planSnapshot.exists()) {
      console.error(`Weekly plan ${planId} not found`);
      return;
    }
    
    const planData = planSnapshot.data();
    const dayActivities = planData[dayOfWeek] || [];
    
    console.log('Current activities for day:', dayOfWeek, dayActivities);
    
    let activityFound = false;
    
    // Find the activity and update its status
    const updatedActivities = dayActivities.map((activity: any) => {
      if (activity.activityId === activityId) {
        activityFound = true;
        console.log(`Updating activity ${activityId} status to ${status}`);
        return { ...activity, status };
      }
      return activity;
    });
    
    if (!activityFound) {
      console.warn(`Activity ${activityId} not found in day ${dayOfWeek} of plan ${planId}`);
      return;
    }
    
    console.log('Updating weekly plan with:', {
      [dayOfWeek]: updatedActivities
    });
    
    await updateDoc(planRef, {
      [dayOfWeek]: updatedActivities,
      updatedAt: serverTimestamp()
    });
    
    console.log(`Successfully updated weekly plan ${planId}`);
  } catch (error) {
    console.error('Error updating weekly plan status:', error);
  }
}

/**
 * Get progress records for an activity and child
 */
export async function getActivityProgress(
  childId: string, 
  activityId: string
): Promise<ProgressRecord[]> {
  try {
    const progressQuery = query(
      collection(db, 'progressRecords'),
      where('childId', '==', childId),
      where('activityId', '==', activityId),
      orderBy('date', 'desc')
    );
    
    const progressSnapshot = await getDocs(progressQuery);
    return progressSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as ProgressRecord));
  } catch (error) {
    console.error('Error getting activity progress:', error);
    throw error;
  }
}

/**
 * Get all progress records for a child
 */
export async function getChildProgress(
  childId: string
): Promise<ProgressRecord[]> {
  try {
    const progressQuery = query(
      collection(db, 'progressRecords'),
      where('childId', '==', childId),
      orderBy('date', 'desc')
    );
    
    const progressSnapshot = await getDocs(progressQuery);
    return progressSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as ProgressRecord));
  } catch (error) {
    console.error('Error getting child progress records:', error);
    throw error;
  }
}

/**
 * Get all progress records with environment context
 */
export async function getProgressRecordsByEnvironment(
  childId: string, 
  environment: "home" | "school" | "other"
): Promise<ProgressRecord[]> {
  try {
    const progressQuery = query(
      collection(db, 'progressRecords'),
      where('childId', '==', childId),
      where('environmentContext', '==', environment),
      orderBy('date', 'desc')
    );
    
    const progressSnapshot = await getDocs(progressQuery);
    return progressSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as ProgressRecord));
  } catch (error) {
    console.error('Error getting environment-specific progress records:', error);
    throw error;
  }
}

/**
 * Get progress records visible to a specific user
 * This handles the visibility field
 */
export async function getVisibleProgressRecords(
  childId: string, 
  userId: string,
  userRole: string = 'parent'
): Promise<ProgressRecord[]> {
  try {
    // Get all progress records for the child
    const progressQuery = query(
      collection(db, 'progressRecords'),
      where('childId', '==', childId),
      orderBy('date', 'desc')
    );
    
    const progressSnapshot = await getDocs(progressQuery);
    
    // Filter records based on visibility
    const records = progressSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as ProgressRecord));
    
    // Apply visibility filters
    return records.filter(record => {
      // If no visibility field, default to visible to all
      if (!record.visibility || record.visibility.length === 0) {
        return true;
      }
      
      // Check if this user is specifically allowed
      if (record.visibility.includes(userId)) {
        return true;
      }
      
      // Check if all users are allowed
      if (record.visibility.includes('all')) {
        return true;
      }
      
      // Check if educators are allowed and user is an educator
      if (record.visibility.includes('educators') && 
          (userRole === 'educator' || userRole === 'admin')) {
        return true;
      }
      
      // Default: not visible
      return false;
    });
  } catch (error) {
    console.error('Error getting visible progress records:', error);
    throw error;
  }
}

/**
 * Get recent progress records for multiple children
 */
export async function getRecentProgressForChildren(
  childIds: string[], 
  limitCount: number = 5
): Promise<ProgressRecord[]> {
  try {
    if (childIds.length === 0) {
      return [];
    }
    
    // Firebase doesn't support array-contains-any and in together,
    // so we'll query for each child separately and combine results
    const allRecords: ProgressRecord[] = [];
    
    for (const childId of childIds) {
      const childQuery = query(
        collection(db, 'progressRecords'),
        where('childId', '==', childId),
        orderBy('date', 'desc'),
        limit(limitCount)
      );
      
      const snapshot = await getDocs(childQuery);
      const childRecords = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as ProgressRecord));
      
      allRecords.push(...childRecords);
    }
    
    // Sort combined results by date
    allRecords.sort((a, b) => {
      const dateA = a.date instanceof Timestamp ? a.date.toMillis() : new Date(a.date).getTime();
      const dateB = b.date instanceof Timestamp ? b.date.toMillis() : new Date(b.date).getTime();
      return dateB - dateA;
    });
    
    console.log(`Found ${allRecords.length} recent progress records for children`);
    
    // Return only the most recent records up to the limit
    return allRecords.slice(0, limitCount);
  } catch (error) {
    console.error('Error getting recent progress:', error);
    throw error;
  }
}

/**
 * Add a photo to a progress record
 */
export async function addPhotoToProgressRecord(
  progressId: string, 
  photoFile: File
): Promise<void> {
  try {
    const progressRef = doc(db, 'progressRecords', progressId);
    const progressDoc = await getDoc(progressRef);
    
    if (!progressDoc.exists()) {
      throw new Error('Progress record not found');
    }
    
    const progressData = progressDoc.data();
    const childId = progressData.childId;
    
    // Upload the photo
    const photoUrl = await uploadProgressPhoto(childId, photoFile);
    
    // Update the progress record
    const photoUrls = progressData.photoUrls || [];
    
    await updateDoc(progressRef, {
      photoUrls: [...photoUrls, photoUrl],
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error adding photo to progress record:', error);
    throw error;
  }
}