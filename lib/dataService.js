// lib/dataService.js
import { 
    collection, 
    doc, 
    getDoc, 
    getDocs, 
    setDoc, 
    updateDoc, 
    deleteDoc, 
    addDoc, 
    query, 
    where, 
    orderBy, 
    serverTimestamp 
  } from 'firebase/firestore';
  import { db } from './firebase';
  
  // ---------- User Functions ----------
  export async function getUserData(userId) {
    const docRef = doc(db, "users", userId);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
  }
  
  export async function updateUserData(userId, data) {
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, {
      ...data,
      updatedAt: serverTimestamp()
    });
  }
  
  // ---------- Child Functions ----------
  export async function createChild(userId, childData) {
    const childRef = await addDoc(collection(db, "children"), {
      ...childData,
      userId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    return childRef.id;
  }
  
  export async function getChild(childId) {
    const docRef = doc(db, "children", childId);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
  }
  
  export async function updateChild(childId, data) {
    const childRef = doc(db, "children", childId);
    await updateDoc(childRef, {
      ...data,
      updatedAt: serverTimestamp()
    });
  }
  
  export async function deleteChild(childId) {
    await deleteDoc(doc(db, "children", childId));
  }
  
  export async function getUserChildren(userId) {
    const q = query(
      collection(db, "children"), 
      where("userId", "==", userId),
      orderBy("createdAt", "desc")
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }
  
  // ---------- Activity Functions ----------
  export async function createActivity(activityData) {
    const activityRef = await addDoc(collection(db, "activities"), {
      ...activityData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    return activityRef.id;
  }
  
  export async function getActivity(activityId) {
    const docRef = doc(db, "activities", activityId);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
  }
  
  export async function updateActivity(activityId, data) {
    const activityRef = doc(db, "activities", activityId);
    await updateDoc(activityRef, {
      ...data,
      updatedAt: serverTimestamp()
    });
  }
  
  export async function deleteActivity(activityId) {
    await deleteDoc(doc(db, "activities", activityId));
  }
  
  export async function getAllActivities() {
    const querySnapshot = await getDocs(collection(db, "activities"));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }
  
  export async function getActivitiesByAgeGroup(ageGroup) {
    const q = query(
      collection(db, "activities"), 
      where("ageGroups", "array-contains", ageGroup)
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }
  
  export async function getActivitiesByArea(area) {
    const q = query(
      collection(db, "activities"), 
      where("area", "==", area)
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }
  
  // ---------- Progress Functions ----------
  export async function createProgressRecord(progressData) {
    const progressRef = await addDoc(collection(db, "progress"), {
      ...progressData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    return progressRef.id;
  }
  
  export async function getProgressRecord(progressId) {
    const docRef = doc(db, "progress", progressId);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
  }
  
  export async function updateProgressRecord(progressId, data) {
    const progressRef = doc(db, "progress", progressId);
    await updateDoc(progressRef, {
      ...data,
      updatedAt: serverTimestamp()
    });
  }
  
  export async function deleteProgressRecord(progressId) {
    await deleteDoc(doc(db, "progress", progressId));
  }
  
  export async function getChildProgress(childId) {
    const q = query(
      collection(db, "progress"), 
      where("childId", "==", childId),
      orderBy("createdAt", "desc")
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }
  
  // ---------- Weekly Plan Functions ----------
  export async function createWeeklyPlan(planData) {
    const planRef = await addDoc(collection(db, "weeklyPlans"), {
      ...planData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    return planRef.id;
  }
  
  export async function getWeeklyPlan(planId) {
    const docRef = doc(db, "weeklyPlans", planId);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
  }
  
  export async function updateWeeklyPlan(planId, data) {
    const planRef = doc(db, "weeklyPlans", planId);
    await updateDoc(planRef, {
      ...data,
      updatedAt: serverTimestamp()
    });
  }
  
  export async function deleteWeeklyPlan(planId) {
    await deleteDoc(doc(db, "weeklyPlans", planId));
  }
  
  export async function getChildWeeklyPlans(childId) {
    const q = query(
      collection(db, "weeklyPlans"), 
      where("childId", "==", childId),
      orderBy("weekStarting", "desc")
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }
  
  export async function getCurrentWeeklyPlan(childId, weekStarting) {
    const q = query(
      collection(db, "weeklyPlans"),
      where("childId", "==", childId),
      where("weekStarting", "==", weekStarting)
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))[0] || null;
  }