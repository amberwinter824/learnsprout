// lib/dataService.ts
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
    serverTimestamp,
    DocumentData,
    Timestamp 
  } from 'firebase/firestore';
  import { db } from './firebase';
  
  interface UserData extends DocumentData {
    id?: string;
    email?: string;
    name?: string;
    updatedAt?: Timestamp;
  }
  
  export interface ChildData extends DocumentData {
    id?: string;
    name: string;
    birthDate?: Timestamp | Date;
    parentId?: string;
    userId: string;
    ageGroup?: string;
    active?: boolean;
    interests?: string[];
    notes?: string;
    createdAt?: Timestamp;
    updatedAt?: Timestamp;
  }
  
  interface ActivityData extends DocumentData {
    id?: string;
    title: string;
    description?: string;
    area?: string;
    ageGroups?: string[];
    duration?: number;
    difficulty?: string;
    materialsNeeded?: string[];
    skillsAddressed?: string[];
    createdAt?: Timestamp;
    updatedAt?: Timestamp;
  }
  
  // Add ProgressData and WeeklyPlanData interfaces
  interface ProgressData extends DocumentData {
    id?: string;
    childId: string;
    activityId: string;
    date: Timestamp;
    completionStatus: 'started' | 'in_progress' | 'completed';
    notes?: string;
    createdAt?: Timestamp;
    updatedAt?: Timestamp;
  }
  
  interface WeeklyPlanData extends DocumentData {
    id?: string;
    childId: string;
    userId: string;
    weekStarting: Timestamp;
    createdBy: string;
    createdAt?: Timestamp;
    updatedAt?: Timestamp;
  }
  
  // ---------- User Functions ----------
  export async function getUserData(userId: string): Promise<UserData | null> {
    const docRef = doc(db, "users", userId);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
  }
  
  export async function updateUserData(userId: string, data: Partial<UserData>) {
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, {
      ...data,
      updatedAt: serverTimestamp()
    });
  }
  
  // ---------- Child Functions ----------
  export async function createChild(userId: string, childData: ChildData): Promise<string> {
    // Add debugging logs
    console.log("Creating child with user ID:", userId);
    console.log("Child data:", childData);
    
    if (!userId) {
      console.error("No userId provided to createChild function");
      throw new Error("User ID is required to create a child profile");
    }
    
    try {
      const childRef = await addDoc(collection(db, "children"), {
        ...childData,
        parentId: userId, // Ensure we're using a consistent field name (parentId vs userId)
        userId: userId,   // Keep both fields for backward compatibility
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      console.log("Child created with ID:", childRef.id);
      return childRef.id;
    } catch (error) {
      console.error("Error in createChild:", error);
      throw error;
    }
  }
  
  export async function getChild(childId: string): Promise<ChildData | null> {
    const docRef = doc(db, "children", childId);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? { id: docSnap.id, ...(docSnap.data() as ChildData) } : null;
  }
  
  export async function updateChild(childId: string, data: Partial<ChildData>) {
    const childRef = doc(db, "children", childId);
    await updateDoc(childRef, {
      ...data,
      updatedAt: serverTimestamp()
    });
  }
  
  export async function deleteChild(childId: string) {
    await deleteDoc(doc(db, "children", childId));
  }
  
  export async function getUserChildren(userId: string): Promise<ChildData[]> {
    const q = query(
      collection(db, "children"), 
      where("userId", "==", userId),
      orderBy("createdAt", "desc")
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChildData));
  }
  
  // ---------- Activity Functions ----------
  export async function createActivity(activityData: ActivityData): Promise<string> {
    const activityRef = await addDoc(collection(db, "activities"), {
      ...activityData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    return activityRef.id;
  }
  
  export async function getActivity(activityId: string): Promise<ActivityData | null> {
    const docRef = doc(db, "activities", activityId);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? { id: docSnap.id, ...(docSnap.data() as ActivityData) } : null;
  }
  
  export async function updateActivity(activityId: string, data: Partial<ActivityData>) {
    const activityRef = doc(db, "activities", activityId);
    await updateDoc(activityRef, {
      ...data,
      updatedAt: serverTimestamp()
    });
  }
  
  export async function deleteActivity(activityId: string) {
    await deleteDoc(doc(db, "activities", activityId));
  }
  
  export async function getAllActivities(): Promise<ActivityData[]> {
    const querySnapshot = await getDocs(collection(db, "activities"));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ActivityData));
  }
  
  export async function getActivitiesByAgeGroup(ageGroup: string): Promise<ActivityData[]> {
    const q = query(
      collection(db, "activities"), 
      where("ageGroups", "array-contains", ageGroup)
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ActivityData));
  }
  
  export async function getActivitiesByArea(area: string): Promise<ActivityData[]> {
    const q = query(
      collection(db, "activities"), 
      where("area", "==", area)
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ActivityData));
  }
  
  // ---------- Progress Functions ----------
  export async function createProgressRecord(progressData: ProgressData): Promise<string> {
    const progressRef = await addDoc(collection(db, "progress"), {
      ...progressData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    return progressRef.id;
  }
  
  export async function getProgressRecord(progressId: string): Promise<ProgressData | null> {
    const docRef = doc(db, "progress", progressId);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } as ProgressData : null;
  }
  
  export async function updateProgressRecord(progressId: string, data: Partial<ProgressData>) {
    const progressRef = doc(db, "progress", progressId);
    await updateDoc(progressRef, {
      ...data,
      updatedAt: serverTimestamp()
    });
  }
  
  export async function deleteProgressRecord(progressId: string) {
    await deleteDoc(doc(db, "progress", progressId));
  }
  
  export async function getChildProgress(childId: string): Promise<ProgressData[]> {
    const q = query(
      collection(db, "progress"), 
      where("childId", "==", childId),
      orderBy("createdAt", "desc")
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ProgressData));
  }
  
  // ---------- Weekly Plan Functions ----------
  export async function createWeeklyPlan(planData: WeeklyPlanData): Promise<string> {
    const planRef = await addDoc(collection(db, "weeklyPlans"), {
      ...planData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    return planRef.id;
  }
  
  export async function getWeeklyPlan(planId: string): Promise<WeeklyPlanData | null> {
    const docRef = doc(db, "weeklyPlans", planId);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } as WeeklyPlanData : null;
  }
  
  export async function updateWeeklyPlan(planId: string, data: Partial<WeeklyPlanData>) {
    const planRef = doc(db, "weeklyPlans", planId);
    await updateDoc(planRef, {
      ...data,
      updatedAt: serverTimestamp()
    });
  }
  
  export async function deleteWeeklyPlan(planId: string) {
    await deleteDoc(doc(db, "weeklyPlans", planId));
  }
  
  export async function getChildWeeklyPlans(childId: string): Promise<WeeklyPlanData[]> {
    const q = query(
      collection(db, "weeklyPlans"), 
      where("childId", "==", childId),
      orderBy("weekStarting", "desc")
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WeeklyPlanData));
  }
  
  export async function getCurrentWeeklyPlan(childId: string, weekStarting: Timestamp): Promise<WeeklyPlanData | null> {
    const q = query(
      collection(db, "weeklyPlans"),
      where("childId", "==", childId),
      where("weekStarting", "==", weekStarting)
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WeeklyPlanData))[0] || null;
  }