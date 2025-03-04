// lib/progressTracking.ts
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
    DocumentReference,
    Timestamp,
    limit
  } from 'firebase/firestore';
  import { db } from '@/lib/firebase';
  
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
    weeklyPlanId?: string;
    dayOfWeek?: string;
    createdAt?: any;
    updatedAt?: any;
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
    data: Partial<ProgressRecordData>
  ): Promise<string> {
    try {
      const progressRef = await addDoc(collection(db, 'progressRecords'), {
        childId,
        userId,
        activityId: data.activityId,
        date: data.date || new Date(),
        completionStatus: data.completionStatus || 'completed',
        engagementLevel: data.engagementLevel || 'medium',
        interestLevel: data.interestLevel || 'medium',
        completionDifficulty: data.completionDifficulty || 'appropriate',
        notes: data.notes || '',
        photoUrls: data.photoUrls || [],
        skillsDemonstrated: data.skillsDemonstrated || [],
        skillObservations: data.skillObservations || {}, // Map of skillId -> observation text
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      // Update child skills based on observations
      if (data.skillsDemonstrated && data.skillsDemonstrated.length > 0) {
        await updateChildSkills(childId, data.skillsDemonstrated, data.skillObservations || {});
      }
      
      // Update weekly plan if this activity was from a plan
      if (data.weeklyPlanId && data.dayOfWeek) {
        await updateWeeklyPlanStatus(data.weeklyPlanId, data.dayOfWeek, data.activityId || '', 'completed');
      }
      
      return progressRef.id;
    } catch (error) {
      console.error('Error adding progress record:', error);
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
        return;
      }
      
      const planData = planSnapshot.data();
      const dayActivities = planData[dayOfWeek] || [];
      
      // Find the activity and update its status
      const updatedActivities = dayActivities.map((activity: any) => {
        if (activity.activityId === activityId) {
          return { ...activity, status };
        }
        return activity;
      });
      
      await updateDoc(planRef, {
        [dayOfWeek]: updatedActivities,
        updatedAt: serverTimestamp()
      });
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
    photoUrl: string
  ): Promise<void> {
    try {
      const progressRef = doc(db, 'progressRecords', progressId);
      const progressDoc = await getDoc(progressRef);
      
      if (!progressDoc.exists()) {
        throw new Error('Progress record not found');
      }
      
      const progressData = progressDoc.data();
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