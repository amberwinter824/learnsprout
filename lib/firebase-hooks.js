import { useState, useEffect } from 'react';
import { 
  collection, 
  doc, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  serverTimestamp 
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from './firebase';
import { useAuth } from '@/contexts/AuthContext';

// Child Profile Hooks
export const useChildProfiles = () => {
    const [children, setChildren] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { currentUser } = useAuth();
  
    useEffect(() => {
      const fetchChildren = async () => {
        if (!currentUser) {
          setLoading(false);
          return;
        }
  
        try {
          const q = query(
            collection(db, 'children'),
            where('userId', '==', currentUser.uid),
            orderBy('createdAt', 'desc')
          );
  
          const querySnapshot = await getDocs(q);
          const childrenData = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          
          setChildren(childrenData);
          setError(null);
        } catch (err) {
          console.error('Error fetching children:', err);
          setError('Failed to load children profiles');
        } finally {
          setLoading(false);
        }
      };
  
      fetchChildren();
    }, [currentUser]);
  
    const addChild = async (childData) => {
      try {
        const docRef = await addDoc(collection(db, 'children'), {
          ...childData,
          userId: currentUser.uid,
          createdAt: serverTimestamp(),
        });
        
        return docRef.id;
      } catch (err) {
        console.error('Error adding child:', err);
        throw new Error('Failed to add child profile');
      }
    };
  
    const updateChild = async (childId, childData) => {
      try {
        const childRef = doc(db, 'children', childId);
        await updateDoc(childRef, {
          ...childData,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        console.error('Error updating child:', err);
        throw new Error('Failed to update child profile');
      }
    };
  
    const deleteChild = async (childId) => {
      try {
        await deleteDoc(doc(db, 'children', childId));
      } catch (err) {
        console.error('Error deleting child:', err);
        throw new Error('Failed to delete child profile');
      }
    };
  
    return {
      children,
      loading,
      error,
      addChild,
      updateChild,
      deleteChild
    };
  };
  
  // Activities Hooks
  export const useActivities = (childId = null) => {
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { currentUser } = useAuth();
  
    useEffect(() => {
      const fetchActivities = async () => {
        if (!currentUser) {
          setLoading(false);
          return;
        }
  
        try {
          let q;
          
          if (childId) {
            // Get activities for a specific child
            q = query(
              collection(db, 'activities'),
              where('userId', '==', currentUser.uid),
              where('childId', '==', childId),
              orderBy('createdAt', 'desc')
            );
          } else {
            // Get all activities for the user
            q = query(
              collection(db, 'activities'),
              where('userId', '==', currentUser.uid),
              orderBy('createdAt', 'desc')
            );
          }
  
          const querySnapshot = await getDocs(q);
          const activitiesData = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          
          setActivities(activitiesData);
          setError(null);
        } catch (err) {
          console.error('Error fetching activities:', err);
          setError('Failed to load activities');
        } finally {
          setLoading(false);
        }
      };
  
      fetchActivities();
    }, [currentUser, childId]);
  
    const addActivity = async (activityData) => {
      try {
        const docRef = await addDoc(collection(db, 'activities'), {
          ...activityData,
          userId: currentUser.uid,
          createdAt: serverTimestamp(),
        });
        
        return docRef.id;
      } catch (err) {
        console.error('Error adding activity:', err);
        throw new Error('Failed to add activity');
      }
    };
  
    const updateActivity = async (activityId, activityData) => {
      try {
        const activityRef = doc(db, 'activities', activityId);
        await updateDoc(activityRef, {
          ...activityData,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        console.error('Error updating activity:', err);
        throw new Error('Failed to update activity');
      }
    };
  
    const deleteActivity = async (activityId) => {
      try {
        await deleteDoc(doc(db, 'activities', activityId));
      } catch (err) {
        console.error('Error deleting activity:', err);
        throw new Error('Failed to delete activity');
      }
    };
  
    return {
      activities,
      loading,
      error,
      addActivity,
      updateActivity,
      deleteActivity
    };
  };
  
  // Progress Tracking Hooks
  export const useProgress = (childId) => {
    const [progressRecords, setProgressRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { currentUser } = useAuth();
  
    useEffect(() => {
      const fetchProgress = async () => {
        if (!currentUser || !childId) {
          setLoading(false);
          return;
        }
  
        try {
          const q = query(
            collection(db, 'progress'),
            where('userId', '==', currentUser.uid),
            where('childId', '==', childId),
            orderBy('createdAt', 'desc')
          );
  
          const querySnapshot = await getDocs(q);
          const progressData = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          
          setProgressRecords(progressData);
          setError(null);
        } catch (err) {
          console.error('Error fetching progress:', err);
          setError('Failed to load progress records');
        } finally {
          setLoading(false);
        }
      };
  
      fetchProgress();
    }, [currentUser, childId]);
  
    const addProgressRecord = async (progressData, photoFile = null) => {
      try {
        let photoURL = null;
        
        if (photoFile) {
          // Upload photo to Firebase Storage
          const fileRef = ref(storage, `progress/${currentUser.uid}/${Date.now()}_${photoFile.name}`);
          await uploadBytes(fileRef, photoFile);
          photoURL = await getDownloadURL(fileRef);
        }
        
        const docRef = await addDoc(collection(db, 'progress'), {
          ...progressData,
          photoURL,
          userId: currentUser.uid,
          childId,
          createdAt: serverTimestamp(),
        });
        
        return docRef.id;
      } catch (err) {
        console.error('Error adding progress record:', err);
        throw new Error('Failed to add progress record');
      }
    };
  
    const updateProgressRecord = async (progressId, progressData, photoFile = null) => {
      try {
        let updateData = {
          ...progressData,
          updatedAt: serverTimestamp(),
        };
        
        if (photoFile) {
          // Upload new photo
          const fileRef = ref(storage, `progress/${currentUser.uid}/${Date.now()}_${photoFile.name}`);
          await uploadBytes(fileRef, photoFile);
          updateData.photoURL = await getDownloadURL(fileRef);
        }
        
        const progressRef = doc(db, 'progress', progressId);
        await updateDoc(progressRef, updateData);
      } catch (err) {
        console.error('Error updating progress record:', err);
        throw new Error('Failed to update progress record');
      }
    };
  
    const deleteProgressRecord = async (progressId) => {
      try {
        await deleteDoc(doc(db, 'progress', progressId));
      } catch (err) {
        console.error('Error deleting progress record:', err);
        throw new Error('Failed to delete progress record');
      }
    };
  
    return {
      progressRecords,
      loading,
      error,
      addProgressRecord,
      updateProgressRecord,
      deleteProgressRecord
    };
  };
  
  // Weekly Planning Hooks
  export const useWeeklyPlans = (childId) => {
    const [weeklyPlans, setWeeklyPlans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { currentUser } = useAuth();
  
    useEffect(() => {
      const fetchWeeklyPlans = async () => {
        if (!currentUser || !childId) {
          setLoading(false);
          return;
        }
  
        try {
          const q = query(
            collection(db, 'weeklyPlans'),
            where('userId', '==', currentUser.uid),
            where('childId', '==', childId),
            orderBy('weekStarting', 'desc')
          );
  
          const querySnapshot = await getDocs(q);
          const plansData = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          
          setWeeklyPlans(plansData);
          setError(null);
        } catch (err) {
          console.error('Error fetching weekly plans:', err);
          setError('Failed to load weekly plans');
        } finally {
          setLoading(false);
        }
      };
  
      fetchWeeklyPlans();
    }, [currentUser, childId]);
  
    const addWeeklyPlan = async (planData) => {
      try {
        const docRef = await addDoc(collection(db, 'weeklyPlans'), {
          ...planData,
          userId: currentUser.uid,
          childId,
          createdAt: serverTimestamp(),
        });
        
        return docRef.id;
      } catch (err) {
        console.error('Error adding weekly plan:', err);
        throw new Error('Failed to add weekly plan');
      }
    };
  
    const updateWeeklyPlan = async (planId, planData) => {
      try {
        const planRef = doc(db, 'weeklyPlans', planId);
        await updateDoc(planRef, {
          ...planData,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        console.error('Error updating weekly plan:', err);
        throw new Error('Failed to update weekly plan');
      }
    };
  
    const deleteWeeklyPlan = async (planId) => {
      try {
        await deleteDoc(doc(db, 'weeklyPlans', planId));
      } catch (err) {
        console.error('Error deleting weekly plan:', err);
        throw new Error('Failed to delete weekly plan');
      }
    };
  
    return {
      weeklyPlans,
      loading,
      error,
      addWeeklyPlan,
      updateWeeklyPlan,
      deleteWeeklyPlan
    };
  };
  