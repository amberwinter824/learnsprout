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
  weekStarting: Date | Timestamp;
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

/**
 * Generate a weekly plan for a child based on their profile, skills, and activity history
 */
export async function generateWeeklyPlan(childId: string, userId: string): Promise<WeeklyPlan> {
  try {
    console.log(`Generating plan for child ${childId}`);
    
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
    const activities: Activity[] = [];
    
    activitiesSnapshot.forEach(doc => {
      const data = doc.data();
      activities.push({
        id: doc.id,
        title: data.title,
        ...data
      } as Activity);
    });
    
    console.log(`Got ${activities.length} potential activities for age group ${ageGroup}`);
    
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
    
    // Create the weekly plan
    const today = new Date();
    const weekStartDate = startOfWeek(today, { weekStartsOn: 1 }); // Monday as start of week
    
    // Build plan with different activities for each day
    // with higher-scored activities appearing earlier in the week
    const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const weeklyPlan: WeeklyPlan = {
      childId,
      userId,
      weekStarting: weekStartDate,
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
    
    // Assign activities to days
    // Add 1-2 activities per day (more on weekends)
    let activityIndex = 0;
    
    for (let dayIndex = 0; dayIndex < daysOfWeek.length; dayIndex++) {
      const day = daysOfWeek[dayIndex];
      const isWeekend = day === 'saturday' || day === 'sunday';
      const activitiesForDay = isWeekend ? 2 : 1;
      
      for (let i = 0; i < activitiesForDay; i++) {
        if (activityIndex < scoredActivities.length) {
          const activity = scoredActivities[activityIndex];
          
          weeklyPlan[day as keyof WeeklyPlan].push({
            activityId: activity.id,
            timeSlot: i === 0 ? 'morning' : 'afternoon',
            status: 'suggested',
            order: i + 1,
            notes: activity.reasons.join('. ')
          });
          
          activityIndex++;
        }
      }
    }
    
    // Create the weekly plan document
    const planId = `${childId}_${format(weekStartDate, 'yyyy-MM-dd')}`;
    const planRef = doc(db, 'weeklyPlans', planId);
    await setDoc(planRef, weeklyPlan);
    
    console.log(`Created weekly plan with ID: ${planId}`);
    
    return { id: planId, ...weeklyPlan };
  } catch (error) {
    console.error('Error generating weekly plan:', error);
    throw error;
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