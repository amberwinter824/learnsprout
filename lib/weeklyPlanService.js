// lib/weeklyPlanService.js
import { doc, updateDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

/**
 * Update the last generated timestamp for a child's profile
 * This function should be called whenever a new weekly plan is created
 */
export async function updateLastGeneratedTimestamp(childId) {
  try {
    if (!childId) {
      console.error("No childId provided to updateLastGeneratedTimestamp");
      return false;
    }
    
    // Get the child document
    const childRef = doc(db, 'children', childId);
    const childDoc = await getDoc(childRef);
    
    if (!childDoc.exists()) {
      console.error(`Child document with ID ${childId} not found`);
      return false;
    }
    
    // Update the lastPlanGenerated field
    await updateDoc(childRef, {
      lastPlanGenerated: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    console.log(`Updated lastPlanGenerated timestamp for child ${childId}`);
    return true;
  } catch (error) {
    console.error("Error updating lastPlanGenerated timestamp:", error);
    return false;
  }
}

/**
 * Get or create a weekly plan for a child
 * This function checks if a plan exists for the specified week
 * and creates one if it doesn't
 */
export async function getOrCreateWeeklyPlan(childId, userId, weekStarting) {
  try {
    if (!childId || !userId) {
      console.error("Missing required parameters in getOrCreateWeeklyPlan");
      return null;
    }
    
    // Convert weekStarting to Date if it's a string
    const weekStartDate = typeof weekStarting === 'string' 
      ? new Date(weekStarting) 
      : weekStarting || new Date();
    
    // Normalize to start of week (Monday)
    const startOfWeek = new Date(weekStartDate);
    startOfWeek.setHours(0, 0, 0, 0);
    // Adjust to Monday (0 = Sunday, 1 = Monday, etc.)
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
    startOfWeek.setDate(diff);
    
    // Query for existing plan
    const { query, where, collection, getDocs, Timestamp } = await import('firebase/firestore');
    
    const weekStartTimestamp = Timestamp.fromDate(startOfWeek);
    
    const plansQuery = query(
      collection(db, 'weeklyPlans'),
      where('childId', '==', childId),
      where('weekStarting', '==', weekStartTimestamp)
    );
    
    const querySnapshot = await getDocs(plansQuery);
    
    // If plan exists, return it
    if (!querySnapshot.empty) {
      const planDoc = querySnapshot.docs[0];
      return {
        id: planDoc.id,
        ...planDoc.data()
      };
    }
    
    // Otherwise, create a new plan
    const { createWeeklyPlan } = await import('./dataService');
    const planId = await createWeeklyPlan({
      childId,
      userId,
      weekStarting: weekStartTimestamp,
      createdBy: userId,
      monday: [],
      tuesday: [],
      wednesday: [],
      thursday: [],
      friday: [],
      saturday: [],
      sunday: []
    });
    
    if (planId) {
      // Update the lastPlanGenerated timestamp on the child profile
      await updateLastGeneratedTimestamp(childId);
      
      // Get the newly created plan
      const { getWeeklyPlan } = await import('./dataService');
      const newPlan = await getWeeklyPlan(planId);
      return newPlan;
    }
    
    return null;
  } catch (error) {
    console.error("Error in getOrCreateWeeklyPlan:", error);
    return null;
  }
}