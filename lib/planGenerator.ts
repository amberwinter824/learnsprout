// lib/planGenerator.ts
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  getDocs, 
  doc,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  limit,
  serverTimestamp,
  Timestamp,
  DocumentData
} from 'firebase/firestore';
import { db } from './firebase';
import { startOfWeek, format, addDays } from 'date-fns';

// Type definitions
interface ChildSkill {
  skillId: string;
  status: 'emerging' | 'developing' | 'mastered' | 'unknown';
  [key: string]: any;
}

interface RecentActivity {
  lastCompleted: Timestamp;
  completionCount: number;
  engagement: 'low' | 'medium' | 'high';
  interest: 'low' | 'medium' | 'high';
}

interface Activity {
  id: string;
  title: string;
  description?: string;
  area?: string;
  skillsAddressed?: string[];
  ageRanges?: string[];
  status?: string;
  duration?: number;
  tags?: string[];
  keywords?: string[];
  [key: string]: any;
}

interface ScoredActivity extends Activity {
  score: number;
  reasons: string[];
}

interface PlanActivity {
  activityId: string;
  timeSlot: 'morning' | 'afternoon' | 'evening';
  status: 'suggested' | 'confirmed' | 'completed';
  order: number;
  notes?: string;
  suggestionId?: string;
  [key: string]: any;
}

interface WeeklyPlan {
  id?: string;
  childId: string;
  userId: string;
  weekStarting: Date | Timestamp | string;
  createdBy: string;
  createdAt?: any;
  updatedAt?: any;
  monday: PlanActivity[];
  tuesday: PlanActivity[];
  wednesday: PlanActivity[];
  thursday: PlanActivity[];
  friday: PlanActivity[];
  saturday: PlanActivity[];
  sunday: PlanActivity[];
  [key: string]: any;
}

interface Recommendation {
  id: string;
  activityId: string;
  activity: DocumentData;
  priority: number;
  reason: string;
}

interface ActivityPreferences {
  daysPerWeek?: string[];
  activitiesPerDay?: number;
  useCustomSchedule?: boolean;
  scheduleByDay?: {[key: string]: number};
}

/**
 * Get user preferences for activity schedule
 */
async function getUserActivityPreferences(userId: string): Promise<ActivityPreferences> {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    
    if (!userDoc.exists()) {
      throw new Error("User not found");
    }
    
    const userData = userDoc.data();
    const activityPreferences = userData?.preferences?.activityPreferences;
    
    if (!activityPreferences) {
      // Return default preferences if none exist
      return {
        daysPerWeek: ['monday', 'wednesday', 'friday'],
        activitiesPerDay: 2,
        useCustomSchedule: false
      };
    }
    
    // Check if using custom schedule by day
    if (activityPreferences.scheduleByDay) {
      return {
        scheduleByDay: activityPreferences.scheduleByDay,
        useCustomSchedule: true
      };
    }
    
    // Using simple schedule
    return {
      daysPerWeek: activityPreferences.daysPerWeek || ['monday', 'wednesday', 'friday'],
      activitiesPerDay: activityPreferences.activitiesPerDay || 2,
      useCustomSchedule: false
    };
  } catch (error) {
    console.error("Error getting user preferences:", error);
    // Return default preferences if error
    return {
      daysPerWeek: ['monday', 'wednesday', 'friday'],
      activitiesPerDay: 2,
      useCustomSchedule: false
    };
  }
}

/**
 * Generate a weekly plan for a child based on their profile, skills, and activity history
 */
export async function generateWeeklyPlan(childId: string, userId: string, weekStartDate?: Date): Promise<WeeklyPlan> {
  try {
    console.log(`Generating plan for child ${childId}${weekStartDate ? ' for specific week' : ''}`);
    
    // Get child data
    const childRef = doc(db, 'children', childId);
    const childDoc = await getDoc(childRef);
    
    if (!childDoc.exists()) {
      throw new Error('Child not found');
    }
    
    const childData = childDoc.data();
    const ageGroup = childData.ageGroup;
    const interests = childData.interests || [];
    
    console.log(`Child age group: ${ageGroup}, interests: ${interests.join(', ')}`);
    
    // Get user activity preferences
    const preferences = await getUserActivityPreferences(userId);
    
    // Get current skill levels
    const skillsQuery = query(
      collection(db, 'childSkills'),
      where('childId', '==', childId)
    );
    
    const skillsSnapshot = await getDocs(skillsQuery);
    
    const childSkills: Record<string, string> = {};
    skillsSnapshot.forEach(doc => {
      const data = doc.data();
      childSkills[data.skillId] = data.status; // emerging, developing, mastered
    });
    
    console.log(`Got ${Object.keys(childSkills).length} skills for child`);
    
    // Get recent activities (completed in the last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentActivitiesQuery = query(
      collection(db, 'progressRecords'),
      where('childId', '==', childId),
      where('date', '>=', thirtyDaysAgo)
    );
    
    const recentActivitiesSnapshot = await getDocs(recentActivitiesQuery);
    
    // Track which activities were completed and their engagement level
    const recentActivities: Record<string, RecentActivity> = {};
    recentActivitiesSnapshot.forEach(doc => {
      const data = doc.data();
      if (!recentActivities[data.activityId]) {
        recentActivities[data.activityId] = {
          lastCompleted: data.date,
          completionCount: 0,
          engagement: data.engagementLevel || 'medium',
          interest: data.interestLevel || 'medium'
        };
      }
      recentActivities[data.activityId].completionCount++;
    });
    
    console.log(`Got ${Object.keys(recentActivities).length} recent activities`);
    
    // Get suitable activities for this age group
    const activitiesQuery = query(
      collection(db, 'activities'),
      where('ageRanges', 'array-contains', ageGroup),
      where('status', '==', 'active')
    );
    
    const activitiesSnapshot = await getDocs(activitiesQuery);
    let activities: Activity[] = [];
    
    activitiesSnapshot.forEach(doc => {
      const data = doc.data();
      activities.push({
        id: doc.id,
        title: data.title,
        ...data
      } as Activity);
    });
    
    console.log(`Got ${activities.length} potential activities for age group ${ageGroup}`);
    
    // Prioritize activities matching interests
    activities = activities.sort((a, b) => {
      const aMatchesInterests = interests.some((interest: string) => 
        a.tags?.includes(interest) || a.keywords?.includes(interest) || 
        (a.area && a.area.toLowerCase().includes(interest.toLowerCase()))
      );
      
      const bMatchesInterests = interests.some((interest: string) => 
        b.tags?.includes(interest) || b.keywords?.includes(interest) ||
        (b.area && b.area.toLowerCase().includes(interest.toLowerCase()))
      );
      
      if (aMatchesInterests && !bMatchesInterests) return -1;
      if (!aMatchesInterests && bMatchesInterests) return 1;
      return 0;
    });
    
    // Score and rank activities based on child's needs
    const scoredActivities: ScoredActivity[] = activities.map(activity => {
      let score = 5; // Base score
      const reasons: string[] = [];
      
      // Factor 1: Skills addressed - prioritize emerging and developing skills
      const activitySkills = activity.skillsAddressed || [];
      
      for (const skillId of activitySkills) {
        const skillStatus = childSkills[skillId] || 'unknown';
        
        if (skillStatus === 'emerging') {
          score += 3;
          reasons.push(`Helps develop emerging skill`);
        } else if (skillStatus === 'developing') {
          score += 2;
          reasons.push(`Reinforces developing skill`);
        } else if (skillStatus === 'mastered') {
          score += 0.5;
          reasons.push(`Maintains mastered skill`);
        } else {
          score += 2;
          reasons.push(`Introduces new skill`);
        }
      }
      
      // Factor 2: Child's interests
      for (const interest of interests) {
        if (activity.area && activity.area.toLowerCase().includes(interest.toLowerCase())) {
          score += 2;
          reasons.push(`Matches child's interest in ${interest}`);
        }
        
        if (activity.tags?.includes(interest) || activity.keywords?.includes(interest)) {
          score += 2;
          reasons.push(`Tagged with child's interest: ${interest}`);
        }
      }
      
      // Factor 3: Recent completion and engagement
      const recent = recentActivities[activity.id];
      if (recent) {
        // Reduce score slightly for very recently completed activities
        const daysSinceCompletion = Math.floor((Date.now() - recent.lastCompleted.toMillis()) / (24 * 60 * 60 * 1000));
        
        if (daysSinceCompletion < 7) {
          score -= 2;
          reasons.push(`Completed recently (${daysSinceCompletion} days ago)`);
        } else {
          // For activities done 1-4 weeks ago, boost score if engagement was high
          if (recent.engagement === 'high' || recent.interest === 'high') {
            score += 2;
            reasons.push(`Child showed high engagement previously`);
          }
        }
        
        // Limit repetition for activities done many times already
        if (recent.completionCount > 3) {
          score -= 1;
          reasons.push(`Already completed ${recent.completionCount} times recently`);
        }
      } else {
        // Small boost for new activities
        score += 1;
        reasons.push(`New activity`);
      }
      
      return {
        ...activity,
        score,
        reasons
      };
    });
    
    // Sort by score (highest first)
    scoredActivities.sort((a, b) => b.score - a.score);
    
    console.log(`Scored and ranked ${scoredActivities.length} activities`);
    
    // Use the provided week start date or default to current week
    const today = new Date();
    const weekStart = weekStartDate ? 
      startOfWeek(weekStartDate, { weekStartsOn: 1 }) : // Use provided date
      startOfWeek(today, { weekStartsOn: 1 }); // Default to current week
    
    // Build plan with different activities for each day
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
    type DayOfWeek = typeof days[number];
    
    const weeklyPlan: WeeklyPlan = {
      childId,
      userId,
      weekStarting: Timestamp.fromDate(weekStart),
      createdBy: 'system',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      monday: [],
      tuesday: [],
      wednesday: [],
      thursday: [],
      friday: [],
      saturday: [],
      sunday: []
    };
    
    // Check if a plan already exists for this week
    const planId = `${childId}_${format(weekStart, 'yyyy-MM-dd')}`;
    const existingPlanRef = doc(db, 'weeklyPlans', planId);
    const existingPlanDoc = await getDoc(existingPlanRef);
    
    // If plan exists and we're doing an evolving update, merge with existing plan
    // preserving any completed activities or user modifications
    if (existingPlanDoc.exists()) {
      const existingPlan = existingPlanDoc.data() as WeeklyPlan;
      
      // For each day, retain any activities that have been completed or modified by the user
      days.forEach((day: DayOfWeek) => {
        const existingActivities = existingPlan[day] as PlanActivity[];
        
        // Filter activities that should be preserved (completed or user-modified)
        const preservedActivities = existingActivities.filter(activity => 
          activity.status === 'completed' || 
          activity.createdBy === 'user' ||
          activity.userModified === true
        );
        
        // Store these activities to keep them in the new plan
        weeklyPlan[day] = preservedActivities;
      });
      
      console.log('Found existing plan - preserving completed activities and user modifications');
    }
    
    // Determine number of activities for each day based on preferences
    const activityCountByDay: {[key: string]: number} = {};
    
    if (preferences.useCustomSchedule && preferences.scheduleByDay) {
      // Use custom schedule
      days.forEach((day: DayOfWeek) => {
        activityCountByDay[day] = preferences.scheduleByDay?.[day] || 0;
      });
    } else {
      // Use simple schedule
      days.forEach((day: DayOfWeek) => {
        activityCountByDay[day] = preferences.daysPerWeek?.includes(day) 
          ? preferences.activitiesPerDay || 2
          : 0;
      });
    }
    
    // Assign activities to each day
    let activityIndex = 0;
    
    for (const day of days) {
      // Get the existing activities for this day
      const existingActivities = weeklyPlan[day] as PlanActivity[];
      const activityCount = activityCountByDay[day];
      
      // Calculate how many more activities we need to add
      const additionalActivitiesNeeded = Math.max(0, activityCount - existingActivities.length);
      
      for (let i = 0; i < additionalActivitiesNeeded; i++) {
        if (activityIndex < scoredActivities.length) {
          const activity = scoredActivities[activityIndex];
          
          // Assign morning/afternoon based on position
          const timeSlot = i < Math.ceil(additionalActivitiesNeeded / 2) ? 'morning' : 'afternoon';
          
          existingActivities.push({
            activityId: activity.id,
            timeSlot,
            status: 'suggested',
            order: existingActivities.length + i,
            notes: activity.reasons.join('. ')
          });
          
          activityIndex++;
        }
      }
      
      // Update the day's activities in the plan
      weeklyPlan[day] = existingActivities;
    }
    
    // Create or update the weekly plan document
    const planRef = doc(db, 'weeklyPlans', planId);
    await setDoc(planRef, weeklyPlan);
    
    // Update child profile with last plan generation timestamp
    await updateLastGeneratedTimestamp(childId);
    
    console.log(`Created/updated weekly plan with ID: ${planId}`);
    
    return { id: planId, ...weeklyPlan };
  } catch (error) {
    console.error('Error generating weekly plan:', error);
    throw error;
  }
}

/**
 * Automatically generate plans for a child for the current week and next week
 */
export async function autoGeneratePlans(childId: string, userId: string): Promise<string[]> {
  try {
    console.log(`Auto-generating plans for child ${childId}`);
    const planIds: string[] = [];
    
    // Generate a plan for the current week
    const currentWeekPlan = await generateWeeklyPlan(childId, userId);
    planIds.push(currentWeekPlan.id || '');
    
    // Generate a plan for next week
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    const nextWeekPlan = await generateWeeklyPlan(childId, userId, nextWeek);
    planIds.push(nextWeekPlan.id || '');
    
    console.log(`Auto-generated ${planIds.length} plans for child ${childId}`);
    return planIds;
  } catch (error) {
    console.error('Error auto-generating plans:', error);
    throw error;
  }
}

/**
 * Check if any new observations should trigger plan evolution
 * and update plans accordingly
 */
export async function evolvePlansBasedOnObservations(childId: string, userId: string): Promise<void> {
  try {
    // Check for significant observations since last plan update
    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);
    
    // Get the child's profile
    const childRef = doc(db, 'children', childId);
    const childSnap = await getDoc(childRef);
    
    if (!childSnap.exists()) {
      throw new Error('Child not found');
    }
    
    const childData = childSnap.data();
    const lastPlanUpdated = childData.lastPlanEvolved || new Date(0);
    
    // Query for new observations since last plan update
    const recentObservationsQuery = query(
      collection(db, 'progressRecords'),
      where('childId', '==', childId),
      where('date', '>', lastPlanUpdated)
    );
    
    const recentObsSnapshot = await getDocs(recentObservationsQuery);
    
    // If we have significant new observations, evolve the plans
    if (recentObsSnapshot.size >= 3) {
      console.log(`Found ${recentObsSnapshot.size} new observations, evolving plans`);
      
      // Get current and next week plans
      const today = new Date();
      const currentWeekStart = startOfWeek(today, { weekStartsOn: 1 });
      
      // Evolve current week plan
      await generateWeeklyPlan(childId, userId, currentWeekStart);
      
      // Evolve next week plan
      const nextWeek = new Date(currentWeekStart);
      nextWeek.setDate(nextWeek.getDate() + 7);
      await generateWeeklyPlan(childId, userId, nextWeek);
      
      // Update the last evolved timestamp
      await updateDoc(childRef, {
        lastPlanEvolved: serverTimestamp()
      });
      
      console.log('Plans evolved based on new observations');
    } else {
      console.log('Not enough new observations to warrant plan evolution');
    }
  } catch (error) {
    console.error('Error evolving plans:', error);
    // Don't throw - this should fail silently
  }
}

/**
 * Update the last generated timestamp on the child profile
 */
export async function updateLastGeneratedTimestamp(childId: string) {
  try {
    const childRef = doc(db, 'children', childId);
    await updateDoc(childRef, {
      lastPlanGenerated: serverTimestamp()
    });
  } catch (error) {
    console.error("Error updating last generated timestamp:", error);
    // Continue even if this fails
  }
}

/**
 * Get the most recent recommended activities for a child
 */
export async function getRecommendedActivities(childId: string, maxResults: number = 5): Promise<Recommendation[]> {
  try {
    // Query for suggested activities with high priority
    const suggestionsQuery = query(
      collection(db, 'activitySuggestions'),
      where('childId', '==', childId),
      where('status', '==', 'pending'),
      orderBy('priority', 'desc'),
      limit(maxResults)
    );
    
    const suggestionsSnapshot = await getDocs(suggestionsQuery);
    
    const recommendations: Recommendation[] = [];
    const activityPromises: Promise<void>[] = [];
    
    // Get details for each recommended activity
    suggestionsSnapshot.forEach(docSnapshot => {
      const data = docSnapshot.data();
      activityPromises.push(
        getDoc(doc(db, 'activities', data.activityId)).then(activityDoc => {
          if (activityDoc.exists()) {
            recommendations.push({
              id: docSnapshot.id,
              activityId: data.activityId,
              activity: activityDoc.data() as DocumentData,
              priority: data.priority,
              reason: data.reason
            });
          }
        })
      );
    });
    
    await Promise.all(activityPromises);
    
    return recommendations;
  } catch (error) {
    console.error('Error getting recommended activities:', error);
    throw error;
  }
}

/**
 * Accept a recommendation and add it to the weekly plan
 */
export async function acceptRecommendation(
  recommendationId: string, 
  childId: string, 
  userId: string, 
  day: string, 
  timeSlot: 'morning' | 'afternoon' | 'evening'
): Promise<{ planId: string, day: string }> {
  try {
    // Get the recommendation
    const recommendationRef = doc(db, 'activitySuggestions', recommendationId);
    const recommendationDoc = await getDoc(recommendationRef);
    
    if (!recommendationDoc.exists()) {
      throw new Error('Recommendation not found');
    }
    
    const recommendation = recommendationDoc.data();
    
    // Get the current weekly plan or create a new one
    const today = new Date();
    const weekStartDate = startOfWeek(today, { weekStartsOn: 1 });
    
    const planQuery = query(
      collection(db, 'weeklyPlans'),
      where('childId', '==', childId),
      where('weekStarting', '==', weekStartDate),
      limit(1)
    );
    
    const planSnapshot = await getDocs(planQuery);
    
    let weeklyPlan: WeeklyPlan;
    let planId: string;
    
    if (planSnapshot.empty) {
      // Create a new weekly plan
      const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      weeklyPlan = {
        childId,
        userId,
        weekStarting: weekStartDate,
        createdBy: 'user',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        monday: [],
        tuesday: [],
        wednesday: [],
        thursday: [],
        friday: [],
        saturday: [],
        sunday: []
      };
      
      planId = `${childId}_${format(weekStartDate, 'yyyy-MM-dd')}`;
    } else {
      // Use existing plan
      const planDoc = planSnapshot.docs[0];
      weeklyPlan = planDoc.data() as WeeklyPlan;
      planId = planDoc.id;
      
      // Initialize any missing day arrays
      const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      daysOfWeek.forEach(dayKey => {
        if (!weeklyPlan[dayKey as keyof WeeklyPlan]) {
          weeklyPlan[dayKey as keyof WeeklyPlan] = [];
        }
      });
    }
    
    // Add the activity to the plan
    const dayActivities = weeklyPlan[day as keyof WeeklyPlan] as PlanActivity[];
    dayActivities.push({
      activityId: recommendation.activityId,
      timeSlot,
      status: 'suggested',
      order: dayActivities.length + 1,
      suggestionId: recommendationId
    });
    
    // Update the plan
    const planRef = doc(db, 'weeklyPlans', planId);
    await setDoc(planRef, weeklyPlan);
    
    // Update the recommendation status
    await setDoc(recommendationRef, {
      ...recommendation,
      status: 'accepted',
      weeklyPlanId: planId,
      updatedAt: serverTimestamp()
    });
    
    return { planId, day };
  } catch (error) {
    console.error('Error accepting recommendation:', error);
    throw error;
  }
}