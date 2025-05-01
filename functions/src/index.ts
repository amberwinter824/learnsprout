import * as functions from "firebase-functions/v2";
import * as functionsV1 from "firebase-functions/v1";
import * as admin from "firebase-admin";
import * as dateFns from "date-fns";
import { UserRecord } from "firebase-functions/v1/auth";
import { Resend } from "resend";

admin.initializeApp();
const db = admin.firestore();
const resend = new Resend(process.env.RESEND_API_KEY);

// Type definitions
interface UserData {
  email: string;
  displayName: string;
  createdAt: admin.firestore.Timestamp;
  lastLogin: admin.firestore.Timestamp;
  role: string;
  preferences: {
    emailNotifications: boolean;
    weeklyDigest: boolean;
    theme: string;
  };
}

interface ChildData {
  name: string;
  userId: string;
  ageGroup: string;
  active: boolean;
  interests: string[];
  [key: string]: any;
}

interface ChildSkillData {
  childId: string;
  skillId: string;
  status: "emerging" | "developing" | "mastered";
  lastAssessed: admin.firestore.Timestamp;
  notes?: string;
  updatedAt: admin.firestore.Timestamp;
}

interface ActivityData {
  id: string;
  title: string;
  description?: string;
  area: string;
  ageRanges: string[];
  difficulty: "beginner" | "intermediate" | "advanced";
  status: string;
  skillsAddressed: string[];
  duration?: number;
  [key: string]: any;
}

interface ActivitySuggestion {
  id: string;
  activityId: string;
  priority: number;
  status: "pending" | "accepted" | "rejected";
  weeklyPlanId?: string;
  reason?: string;
  [key: string]: any;
}

interface WeeklyPlanActivity {
  activityId: string;
  timeSlot: "morning" | "afternoon";
  status: "suggested" | "confirmed" | "completed";
  order: number;
  suggestionId?: string;
}

interface WeeklyPlanData {
  childId: string;
  userId: string;
  weekStarting: admin.firestore.Timestamp;
  createdBy: string;
  createdAt: admin.firestore.Timestamp;
  updatedAt: admin.firestore.Timestamp;
  monday: WeeklyPlanActivity[];
  tuesday: WeeklyPlanActivity[];
  wednesday: WeeklyPlanActivity[];
  thursday: WeeklyPlanActivity[];
  friday: WeeklyPlanActivity[];
  saturday: WeeklyPlanActivity[];
  sunday: WeeklyPlanActivity[];
  [key: string]: any;
}

interface ProgressRecordData {
  childId: string;
  activityId: string;
  date: admin.firestore.Timestamp;
  completionStatus: "started" | "in_progress" | "completed";
  engagementLevel?: "high" | "medium" | "low";
  interestLevel?: "high" | "medium" | "low";
  skillsDemonstrated: string[];
  [key: string]: any;
}

interface ActivityRecommendation {
  activityId: string;
  score: number;
  reasonCodes: string[];
  reason: string;
}

interface UserAnalytics {
  userId: string;
  period: {
    startDate: admin.firestore.Timestamp;
    endDate: admin.firestore.Timestamp;
  };
  summary: {
    totalActivitiesCompleted: number;
    totalTimeSpent: number;
    skillsProgressed: number;
  };
  children: Array<{
    childId: string;
    childName: string;
    activitiesCompleted: number;
    skillsProgressed: number;
    areaBreakdown: Record<string, number>;
  }>;
}

// Firebase V2 functions

/**
 * Automatically generate weekly plans for children
 * Runs every Sunday at midnight to create plans for the upcoming week
 */
export const generateWeeklyPlans = functions.scheduler.onSchedule({
  schedule: "0 0 * * 0",
  timeZone: "America/New_York"
}, async () => {
  const now = admin.firestore.Timestamp.now();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  
  // Get all active children
  const childrenSnapshot = await db.collection("children")
    .where("active", "==", true)
    .get();
  
  if (childrenSnapshot.empty) {
    console.log("No active children found");
    return;
  }
  
  const batch = db.batch();
  const weekStartTimestamp = admin.firestore.Timestamp.fromDate(tomorrow);
  
  for (const childDoc of childrenSnapshot.docs) {
    const childData = childDoc.data() as ChildData;
    const childId = childDoc.id;
    const userId = childData.userId;
    const ageGroup = childData.ageGroup;
    
    // Check if a plan already exists for this child and week
    const existingPlanQuery = await db.collection("weeklyPlans")
      .where("childId", "==", childId)
      .where("weekStarting", "==", weekStartTimestamp)
      .limit(1)
      .get();
    
    if (!existingPlanQuery.empty) {
      console.log(`Weekly plan already exists for child ${childId}`);
      continue;
    }
    
    // Get skill levels for this child
    const childSkillsSnapshot = await db.collection("childSkills")
      .where("childId", "==", childId)
      .get();
    
    const skillLevels: Record<string, string> = {};
    childSkillsSnapshot.forEach(doc => {
      const data = doc.data() as ChildSkillData;
      skillLevels[data.skillId] = data.status;
    });
    
    // Get recent activity history
    const recentActivitiesSnapshot = await db.collection("progressRecords")
      .where("childId", "==", childId)
      .orderBy("date", "desc")
      .limit(20)
      .get();
    
    const recentActivityIds = new Set<string>();
    recentActivitiesSnapshot.forEach(doc => {
      const data = doc.data() as ProgressRecordData;
      if (data.activityId) {
        recentActivityIds.add(data.activityId);
      }
    });
    
    // Get suggested activities
    const suggestionsSnapshot = await db.collection("activitySuggestions")
      .where("childId", "==", childId)
      .where("status", "==", "pending")
      .orderBy("priority", "desc")
      .limit(7)
      .get();
    
    const suggestedActivities: ActivitySuggestion[] = [];
    suggestionsSnapshot.forEach(doc => {
      suggestedActivities.push({
        id: doc.id,
        activityId: doc.data().activityId,
        priority: doc.data().priority,
        status: doc.data().status || "pending",
        ...doc.data()
      });
    });
    
    // Get appropriate activities for this age group
    const activitiesSnapshot = await db.collection("activities")
      .where("ageRanges", "array-contains", ageGroup)
      .where("status", "==", "active")
      .limit(50)
      .get();
    
    const eligibleActivities: ActivityData[] = [];
    activitiesSnapshot.forEach(doc => {
      // Skip recently completed activities
      if (!recentActivityIds.has(doc.id)) {
        eligibleActivities.push({
          id: doc.id,
          ...doc.data()
        } as ActivityData);
      }
    });
    
    // Create a balanced plan with suggested and new activities
    const weeklyPlanRef = db.collection("weeklyPlans").doc();
    const daysOfWeek = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
    
    const weeklyPlan: WeeklyPlanData = {
      childId,
      userId,
      weekStarting: weekStartTimestamp,
      createdBy: "system",
      createdAt: now,
      updatedAt: now,
      monday: [],
      tuesday: [],
      wednesday: [],
      thursday: [],
      friday: [],
      saturday: [],
      sunday: []
    };
    
    // Add suggested activities first (max 1 per day)
    let suggestionsAdded = 0;
    for (let i = 0; i < Math.min(suggestedActivities.length, 7); i++) {
      const day = daysOfWeek[i];
      const suggestion = suggestedActivities[i];
      
      weeklyPlan[day].push({
        activityId: suggestion.activityId,
        timeSlot: i < 5 ? "afternoon" : "morning", // weekdays afternoon, weekend morning
        status: "suggested",
        order: 1,
        suggestionId: suggestion.id
      });
      suggestionsAdded++;
    }
    
    // Add randomized activities to fill gaps (1-2 per day)
    let activitiesAdded = 0;
    
    // Shuffle the eligible activities
    const shuffledActivities = [...eligibleActivities].sort(() => 0.5 - Math.random());
    
    daysOfWeek.forEach((day, index) => {
      // Skip if we've used all activities or already added a suggestion
      if (activitiesAdded >= shuffledActivities.length || weeklyPlan[day].length >= 2) {
        return;
      }
      
      // Add 1-2 activities per day
      const activitiesToAdd = day === "saturday" || day === "sunday" ? 2 : 1;
      
      for (let i = weeklyPlan[day].length; i < activitiesToAdd; i++) {
        if (activitiesAdded < shuffledActivities.length) {
          const activity = shuffledActivities[activitiesAdded];
          
          weeklyPlan[day].push({
            activityId: activity.id,
            timeSlot: i === 0 ? "morning" : "afternoon",
            status: "suggested",
            order: weeklyPlan[day].length + 1
          });
          
          activitiesAdded++;
        }
      }
    });
    
    batch.set(weeklyPlanRef, weeklyPlan);
    
    // Update the status of used suggestions to 'accepted'
    for (let i = 0; i < suggestionsAdded; i++) {
      const suggestion = suggestedActivities[i];
      const suggestionRef = db.collection("activitySuggestions").doc(suggestion.id);
      
      batch.update(suggestionRef, {
        status: "accepted",
        weeklyPlanId: weeklyPlanRef.id,
        updatedAt: now
      });
    }
  }
  
  // Commit all changes in a single batch
  await batch.commit();
  
  console.log("Weekly plans generated successfully");
});

/**
 * Generate monthly analytics report for each user
 * Runs on the 1st of each month
 */
export const generateMonthlyAnalytics = functions.scheduler.onSchedule({
  schedule: "0 0 1 * *",
  timeZone: "America/New_York"
}, async () => {
  // Get all users
  const usersSnapshot = await db.collection("users").get();
  
  if (usersSnapshot.empty) {
    console.log("No users found");
    return;
  }
  
  // Calculate date range for previous month
  const now = new Date();
  const firstDayPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastDayPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0);
  
  const startTimestamp = admin.firestore.Timestamp.fromDate(firstDayPrevMonth);
  const endTimestamp = admin.firestore.Timestamp.fromDate(lastDayPrevMonth);
  
  console.log(`Generating analytics for ${firstDayPrevMonth.toISOString()} to ${lastDayPrevMonth.toISOString()}`);
  
  // Process each user
  for (const userDoc of usersSnapshot.docs) {
    const userId = userDoc.id;
    const userData = userDoc.data() as UserData;
    
    // Skip users who don't want weekly digest
    if (userData.preferences && userData.preferences.weeklyDigest === false) {
      continue;
    }
    
    // Get all children for this user
    const childrenSnapshot = await db.collection("children")
      .where("userId", "==", userId)
      .get();
    
    if (childrenSnapshot.empty) {
      console.log(`No children found for user ${userId}`);
      continue;
    }
    
    // Analytics container for this user
    const userAnalytics: UserAnalytics = {
      userId,
      period: {
        startDate: startTimestamp,
        endDate: endTimestamp
      },
      summary: {
        totalActivitiesCompleted: 0,
        totalTimeSpent: 0,
        skillsProgressed: 0
      },
      children: []
    };
    
    // Process each child
    for (const childDoc of childrenSnapshot.docs) {
      const childId = childDoc.id;
      const childData = childDoc.data() as ChildData;
      
      // Get completed activities for this child in the date range
      const activitiesSnapshot = await db.collection("progressRecords")
        .where("childId", "==", childId)
        .where("completionStatus", "==", "completed")
        .where("date", ">=", startTimestamp)
        .where("date", "<=", endTimestamp)
        .get();
      
      // Get skill progress for this child
      const skillsSnapshot = await db.collection("childSkills")
        .where("childId", "==", childId)
        .where("updatedAt", ">=", startTimestamp)
        .where("updatedAt", "<=", endTimestamp)
        .get();
      
      // Count skills that progressed
      let skillsProgressed = 0;
      skillsSnapshot.forEach(doc => {
        const data = doc.data() as ChildSkillData;
        if (data.status === "developing" || data.status === "mastered") {
          skillsProgressed++;
        }
      });
      
      // Count activities by area
      const areaBreakdown: Record<string, number> = {};
      activitiesSnapshot.forEach(doc => {
        const data = doc.data() as ProgressRecordData;
        const area = data.area || "unknown";
        
        areaBreakdown[area] = (areaBreakdown[area] || 0) + 1;
      });
      
      // Child analytics summary
      const childSummary = {
        childId,
        childName: childData.name,
        activitiesCompleted: activitiesSnapshot.size,
        skillsProgressed,
        areaBreakdown
      };
      
      userAnalytics.children.push(childSummary);
      
      // Update user totals
      userAnalytics.summary.totalActivitiesCompleted += activitiesSnapshot.size;
      userAnalytics.summary.skillsProgressed += skillsProgressed;
      
      // Estimate time spent (using activity durations where available)
      let timeSpent = 0;
      for (const activityDoc of activitiesSnapshot.docs) {
        const activityData = activityDoc.data() as ProgressRecordData;
        const activityId = activityData.activityId;
        
        if (activityId) {
          const activityDetails = await db.collection("activities").doc(activityId).get();
          if (activityDetails.exists) {
            const duration = activityDetails.data()?.duration || 15; // Default to 15 minutes
            timeSpent += duration;
          }
        }
      }
      
      userAnalytics.summary.totalTimeSpent += timeSpent;
    }
    
    // Store the analytics document
    const analyticsRef = db.collection("monthlyAnalytics").doc();
    await analyticsRef.set({
      ...userAnalytics,
      createdAt: admin.firestore.Timestamp.now()
    });
    
    console.log(`Generated monthly analytics for user ${userId} with ${userAnalytics.children.length} children`);
  }
  
  console.log("Monthly analytics generation complete");
});

/**
 * Update child skill levels based on completed activities
 * Triggered when a progress record is created or updated
 */
export const updateChildSkills = functions.firestore
  .onDocumentCreated("progressRecords/{recordId}", async (event) => {
    const snapshot = event.data;
    if (!snapshot) {
      return;
    }
    
    const data = snapshot.data() as ProgressRecordData;
    
    // Skip if not completed
    if (data.completionStatus !== "completed") {
      return;
    }
    
    const childId = data.childId;
    const activityId = data.activityId;
    const skillsDemonstrated = data.skillsDemonstrated || [];
    
    if (!skillsDemonstrated.length) {
      console.log("No skills demonstrated in this record");
      return;
    }
    
    // Get details about the activity
    const activityDoc = await db.collection("activities").doc(activityId).get();
    if (!activityDoc.exists) {
      console.log(`Activity ${activityId} not found`);
      return;
    }
    
    const activity = activityDoc.data() as ActivityData;
    
    // Get current child skill levels
    const batch = db.batch();
    const now = admin.firestore.Timestamp.now();
    
    // Process each skill demonstrated
    for (const skillId of skillsDemonstrated) {
      // Find existing skill record
      const skillQuery = await db.collection("childSkills")
        .where("childId", "==", childId)
        .where("skillId", "==", skillId)
        .limit(1)
        .get();
      
      if (skillQuery.empty) {
        // Create new skill record if it doesn't exist
        const newSkillRef = db.collection("childSkills").doc();
        batch.set(newSkillRef, {
          childId,
          skillId,
          status: "emerging",
          lastAssessed: now,
          notes: `First demonstration in activity: ${activity.title}`,
          updatedAt: now
        });
      } else {
        // Update existing skill record
        const skillDoc = skillQuery.docs[0];
        const skillData = skillDoc.data() as ChildSkillData;
        let newStatus = skillData.status;
        
        // Progress the skill status based on current level
        if (skillData.status === "emerging") {
          newStatus = "developing";
        } else if (skillData.status === "developing") {
          // Check number of times demonstrated for potential mastery
          const demonstrationsQuery = await db.collection("progressRecords")
            .where("childId", "==", childId)
            .where("completionStatus", "==", "completed")
            .where("skillsDemonstrated", "array-contains", skillId)
            .get();
          
          if (demonstrationsQuery.size >= 3) {
            newStatus = "mastered";
          }
        }
        
        batch.update(skillDoc.ref, {
          status: newStatus,
          lastAssessed: now,
          updatedAt: now
        });
      }
    }
    
    await batch.commit();
    console.log(`Updated skills for child ${childId}`);
  });

// Firebase V1 functions - these need to be separate since auth triggers aren't in V2 yet
/**
 * Create initial user profile when a new user signs up
 */
export const createUserProfile = functionsV1.auth.user().onCreate(async (user: UserRecord) => {
  const { uid, email, displayName } = user;
  
  // Create user document in Firestore
  try {
    const userData: UserData = {
      email: email || "",
      displayName: displayName || (email ? email.split("@")[0] : ""),
      createdAt: admin.firestore.Timestamp.now(),
      lastLogin: admin.firestore.Timestamp.now(),
      role: "parent",
      preferences: {
        emailNotifications: true,
        weeklyDigest: true,
        theme: "light"
      }
    };
    
    await db.collection("users").doc(uid).set(userData);
    
    console.log(`Created user profile for ${uid}`);
  } catch (error) {
    console.error("Error creating user profile:", error);
  }
});

/**
 * Update user's last login timestamp
 */
export const updateLastLogin = functionsV1.auth.user().beforeSignIn(async (user) => {
  const { uid } = user;
  
  try {
    await db.collection("users").doc(uid).update({
      lastLogin: admin.firestore.Timestamp.now()
    });
    
    console.log(`Updated last login timestamp for ${uid}`);
    return { sessionClaims: {} };  // Required return for beforeSignIn
  } catch (error) {
    console.error("Error updating last login timestamp:", error);
    return { sessionClaims: {} };  // Return even on error
  }
});

/**
 * Generate personalized activity recommendations
 * Runs daily to update recommendations based on child progress
 */
export const generateRecommendations = functions.scheduler.onSchedule({
  schedule: "0 1 * * *",
  timeZone: "America/New_York"
}, async () => {
  try {
    // Get all active children
    const childrenSnapshot = await db.collection("children")
      .where("active", "==", true)
      .get();
    
    if (childrenSnapshot.empty) {
      console.log("No active children found");
      return;
    }
    
    // Get all skills and activities (cached for multiple children)
    const [skillsSnapshot, activitiesSnapshot] = await Promise.all([
      db.collection("developmentalSkills").get(),
      db.collection("activities").where("status", "==", "active").get()
    ]);
    
    const skills: Record<string, any> = {};
    skillsSnapshot.forEach(doc => {
      skills[doc.id] = doc.data();
    });
    
    const activities: ActivityData[] = [];
    activitiesSnapshot.forEach(doc => {
      activities.push({
        id: doc.id,
        ...doc.data()
      } as ActivityData);
    });
    
    const currentTime = admin.firestore.Timestamp.now();
    let writeBatch = db.batch();
    let batchCount = 0;
    const MAX_BATCH_COUNT = 500; // Firestore batch limit
    
    for (const childDoc of childrenSnapshot.docs) {
      const childId = childDoc.id;
      const childData = childDoc.data() as ChildData;
      const ageGroup = childData.ageGroup;
      const interests = childData.interests || [];
      
      // Get current skill levels for this child
      const childSkillsSnapshot = await db.collection("childSkills")
        .where("childId", "==", childId)
        .get();
      
      const skillLevels: Record<string, string> = {};
      childSkillsSnapshot.forEach(doc => {
        const data = doc.data() as ChildSkillData;
        skillLevels[data.skillId] = data.status;
      });
      
      // Get recent activities
      const recentActivitiesSnapshot = await db.collection("progressRecords")
        .where("childId", "==", childId)
        .orderBy("date", "desc")
        .limit(30)
        .get();
      
      const recentActivityMap: Record<string, ProgressRecordData> = {};
      recentActivitiesSnapshot.forEach(doc => {
        const data = doc.data() as ProgressRecordData;
        recentActivityMap[data.activityId] = data;
      });
      
      // Get existing pending suggestions
      const existingSuggestionsSnapshot = await db.collection("activitySuggestions")
        .where("childId", "==", childId)
        .where("status", "==", "pending")
        .get();
      
      // Delete existing suggestions that are more than 2 weeks old
      const twoWeeksAgo = new Date();
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
      const twoWeeksAgoTimestamp = admin.firestore.Timestamp.fromDate(twoWeeksAgo);
      
      existingSuggestionsSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.suggestedAt && data.suggestedAt.toMillis() < twoWeeksAgoTimestamp.toMillis()) {
          writeBatch.delete(doc.ref);
          batchCount++;
        }
      });
      
      // Calculate scores for each activity
      const activityScoreList: ActivityRecommendation[] = [];
      
      for (const activity of activities) {
        // Skip activities not appropriate for this age group
        if (!activity.ageRanges.includes(ageGroup)) {
          continue;
        }
        
        // Skip recently completed activities
        if (recentActivityMap[activity.id] && 
            recentActivityMap[activity.id].completionStatus === "completed") {
          continue;
        }
        
        // Calculate base score
        let score = 5; // Base score
        const reasonCodes: string[] = [];
        
        // Age match
        score += 2;
        reasonCodes.push("age_match");
        
        // Interest match
        const interestMatches = interests.filter(interest => 
          activity.area.toLowerCase().includes(interest.toLowerCase()));
        if (interestMatches.length > 0) {
          score += interestMatches.length * 2;
          reasonCodes.push("interests_match");
        }
        
        // Skills development - prioritize activities that target skills at appropriate level
        let skillsBoost = 0;
        for (const skillId of activity.skillsAddressed || []) {
          const currentLevel = skillLevels[skillId] || "none";
          
          if (currentLevel === "none" || currentLevel === "emerging") {
            skillsBoost += 3; // Highest priority to develop new/emerging skills
            reasonCodes.push("skill_development");
          } else if (currentLevel === "developing") {
            skillsBoost += 2; // Medium priority to strengthen developing skills
            reasonCodes.push("skill_reinforcement");
          } else if (currentLevel === "mastered") {
            skillsBoost += 0.5; // Low priority for mastered skills
            reasonCodes.push("skill_maintenance");
          }
        }
        
        // Cap the skills boost
        score += Math.min(skillsBoost, 5);
        
        // Difficulty adjustment
        if (activity.difficulty === "beginner") {
          // Prioritize beginner activities for skills that are 'none' or 'emerging'
          const beginnerSkills = (activity.skillsAddressed || []).filter(skillId => 
            !skillLevels[skillId] || skillLevels[skillId] === "emerging");
          
          if (beginnerSkills.length > 0) {
            score += 1;
            reasonCodes.push("appropriate_difficulty");
          }
        } else if (activity.difficulty === "intermediate") {
          // Prioritize intermediate activities for 'developing' skills
          const intermediateSkills = (activity.skillsAddressed || []).filter(skillId => 
            skillLevels[skillId] === "developing");
          
          if (intermediateSkills.length > 0) {
            score += 1;
            reasonCodes.push("appropriate_difficulty");
          }
        } else if (activity.difficulty === "advanced") {
          // Prioritize advanced activities for 'mastered' skills
          const advancedSkills = (activity.skillsAddressed || []).filter(skillId => 
            skillLevels[skillId] === "mastered");
          
          if (advancedSkills.length > 0) {
            score += 1;
            reasonCodes.push("appropriate_challenge");
          }
        }
        
        // Check for previous engagement, if we have prior records for this activity
        if (recentActivityMap[activity.id]) {
          const engagement = recentActivityMap[activity.id].engagementLevel;
          const interest = recentActivityMap[activity.id].interestLevel;
          
          if ((engagement === "high" || interest === "high")) {
            score += 2;
            reasonCodes.push("high_previous_engagement");
          } else if ((engagement === "medium" || interest === "medium")) {
            score += 1;
            reasonCodes.push("medium_previous_engagement");
          }
        }
        
        // Store the scored activity
        if (score > 5) { // Only suggest activities with above-baseline scores
          activityScoreList.push({
            activityId: activity.id,
            score,
            reasonCodes: [...new Set(reasonCodes)], // Remove duplicates
            reason: reasonCodes.join(", ")
          });
        }
      }
      
      // Sort activities by score (highest first)
      activityScoreList.sort((a, b) => b.score - a.score);
      
      // Create new suggestions (up to 10)
      const topRecommendations = activityScoreList.slice(0, 10);
      
      for (const recommendation of topRecommendations) {
        // Check if this recommendation already exists
        const existingQuery = await db.collection("activitySuggestions")
          .where("childId", "==", childId)
          .where("activityId", "==", recommendation.activityId)
          .where("status", "==", "pending")
          .limit(1)
          .get();
        
        if (!existingQuery.empty) {
          // Update existing suggestion with new score
          const existingSuggestion = existingQuery.docs[0];
          writeBatch.update(existingSuggestion.ref, {
            priority: recommendation.score,
            reason: recommendation.reason,
            updatedAt: currentTime
          });
        } else {
          // Create new suggestion
          const newSuggestionRef = db.collection("activitySuggestions").doc();
          writeBatch.set(newSuggestionRef, {
            childId,
            activityId: recommendation.activityId,
            reason: recommendation.reason,
            priority: recommendation.score,
            suggestedAt: currentTime,
            status: "pending",
            weeklyPlanId: ""
          });
        }
        
        // Create a log entry for algorithm improvement
        const logRef = db.collection("recommendationLogs").doc();
        writeBatch.set(logRef, {
          childId,
          activityId: recommendation.activityId,
          suggestedAt: currentTime,
          reasonCodes: recommendation.reasonCodes,
          score: recommendation.score,
          outcome: "pending"
        });
        
        batchCount += 2;
        
        // If batch is getting too large, commit and start a new one
        if (batchCount >= MAX_BATCH_COUNT) {
          await writeBatch.commit();
          writeBatch = db.batch();
          batchCount = 0;
        }
    } 
  }  

// Commit any remaining operations
if (batchCount > 0) {
    await writeBatch.commit();
  }
  
  console.log("Recommendations generated successfully");
} catch (error) {
  console.error("Error generating recommendations:", error);
  throw error; // Retries the function
}
});

/**
* Helper function to update weekly plan when activities are completed
*/
export const updateWeeklyPlanOnCompletion = functions.firestore
.onDocumentCreated("progressRecords/{recordId}", async (event) => {
const snapshot = event.data;
if (!snapshot) {
  return;
}

const data = snapshot.data() as ProgressRecordData;

// Skip if not completed
if (data.completionStatus !== "completed") {
  return;
}
const childId = data.childId;
const activityId = data.activityId;
const completionDate = data.date;

// Find the current weekly plan
const weekStart = dateFns.startOfWeek(completionDate.toDate(), { weekStartsOn: 1 }); // Monday as week start
const weekStartTimestamp = admin.firestore.Timestamp.fromDate(weekStart);

const plansQuery = await db.collection("weeklyPlans")
  .where("childId", "==", childId)
  .where("weekStarting", "==", weekStartTimestamp)
  .limit(1)
  .get();

if (plansQuery.empty) {
  console.log(`No weekly plan found for child ${childId} for the current week`);
  return;
}

const planDoc = plansQuery.docs[0];
const planData = planDoc.data() as WeeklyPlanData;
const planId = planDoc.id;

// Check if this activity is in the weekly plan
let activityUpdated = false;
const daysOfWeek = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const updatedPlan = { ...planData };

for (const day of daysOfWeek) {
  const activities = planData[day] || [];
  
  for (let i = 0; i < activities.length; i++) {
    if (activities[i].activityId === activityId) {
      // Update the status to completed
      updatedPlan[day][i] = {
        ...activities[i],
        status: "completed"
      };
      activityUpdated = true;
    }
  }
}

if (activityUpdated) {
  // Update the plan
  await db.collection("weeklyPlans").doc(planId).update({
    ...updatedPlan,
    updatedAt: admin.firestore.Timestamp.now()
  });
  
  console.log(`Updated activity ${activityId} to completed in weekly plan ${planId}`);
}

// If this came from a suggestion, update the suggestion status
const suggestionsQuery = await db.collection("activitySuggestions")
  .where("childId", "==", childId)
  .where("activityId", "==", activityId)
  .where("status", "==", "accepted")
  .limit(1)
  .get();

if (!suggestionsQuery.empty) {
  const suggestionDoc = suggestionsQuery.docs[0];
  
  await db.collection("activitySuggestions").doc(suggestionDoc.id).update({
    status: "completed",
    updatedAt: admin.firestore.Timestamp.now()
  });
  
  // Also update the recommendation log
  const logsQuery = await db.collection("recommendationLogs")
    .where("childId", "==", childId)
    .where("activityId", "==", activityId)
    .where("outcome", "==", "pending")
    .limit(1)
    .get();
  
  if (!logsQuery.empty) {
    await db.collection("recommendationLogs").doc(logsQuery.docs[0].id).update({
      outcome: "completed"
    });
  }
  
  console.log(`Updated suggestion status for activity ${activityId}`);
}
});

/**
 * Sends weekly plan emails to users every Friday at noon
 * Emails include activities for the upcoming week (starting next Monday)
 */
export const sendWeeklyPlanEmails = functions.scheduler.onSchedule({
  schedule: "0 12 * * 5", // Every Friday at 12:00 PM
  timeZone: "America/New_York"
}, async (context) => {
  console.log('Starting weekly plan email job');
  
  // Calculate the date for next Monday (start of next week)
  const today = new Date();
  const nextMonday = new Date(today);
  nextMonday.setDate(today.getDate() + (8 - today.getDay()) % 7);
  nextMonday.setHours(0, 0, 0, 0);
  
  const nextMondayTimestamp = admin.firestore.Timestamp.fromDate(nextMonday);
  console.log(`Preparing weekly plans for week starting ${nextMonday.toISOString()}`);
  
  try {
    // Get all users with emailNotifications and weeklyDigest preferences enabled
    const usersSnapshot = await db.collection("users")
      .where("preferences.emailNotifications", "==", true)
      .where("preferences.weeklyDigest", "==", true)
      .get();
    
    if (usersSnapshot.empty) {
      console.log("No users with email notifications enabled");
      return;
    }
    
    console.log(`Found ${usersSnapshot.size} users with email notifications enabled`);
    
    // Process each user
    const emailPromises = [];
    
    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data() as UserData;
      const userId = userDoc.id;
      
      // Get all active children for this user
      const childrenSnapshot = await db.collection("children")
        .where("userId", "==", userId)
        .where("active", "==", true)
        .get();
      
      if (childrenSnapshot.empty) {
        console.log(`No active children found for user ${userId}`);
        continue;
      }
      
      // Process each child's weekly plan
      for (const childDoc of childrenSnapshot.docs) {
        const childData = childDoc.data() as ChildData;
        const childId = childDoc.id;
        
        console.log(`Processing weekly plan for child: ${childData.name} (${childId})`);
        
        // Get the child's weekly plan for next week
        const weeklyPlanQuery = await db.collection("weeklyPlans")
          .where("childId", "==", childId)
          .where("weekStarting", "==", nextMondayTimestamp)
          .limit(1)
          .get();
        
        // If no plan exists yet, generate one
        let weeklyPlanData: WeeklyPlanData;
        
        if (weeklyPlanQuery.empty) {
          console.log(`No weekly plan found for child ${childId}, generating one`);
          
          // Generate a plan similar to the generateWeeklyPlans function
          // This is a simplified version - in production, you might want to call your existing function
          const newPlanRef = db.collection("weeklyPlans").doc();
          
          weeklyPlanData = {
            childId,
            userId,
            weekStarting: nextMondayTimestamp,
            createdBy: "system",
            createdAt: admin.firestore.Timestamp.now(),
            updatedAt: admin.firestore.Timestamp.now(),
            monday: [],
            tuesday: [],
            wednesday: [],
            thursday: [],
            friday: [],
            saturday: [],
            sunday: []
          };
          
          // Get suggested activities for this child
          const suggestionsSnapshot = await db.collection("activitySuggestions")
            .where("childId", "==", childId)
            .where("status", "==", "pending")
            .orderBy("priority", "desc")
            .limit(15)
            .get();
          
          if (!suggestionsSnapshot.empty) {
            // Distribute activities throughout the week
            const daysOfWeek = ["monday", "tuesday", "wednesday", "thursday", "friday"];
            const timeSlots = ["morning", "afternoon"];
            
            let activityIndex = 0;
            suggestionsSnapshot.forEach(doc => {
              const suggestion = doc.data() as ActivitySuggestion;
              
              if (activityIndex < 10) { // Limit to 10 activities per week
                const dayIndex = activityIndex % 5;
                const day = daysOfWeek[dayIndex];
                const timeSlot = timeSlots[Math.floor(activityIndex / 5) % 2];
                
                const activity: WeeklyPlanActivity = {
                  activityId: suggestion.activityId,
                  timeSlot: timeSlot as "morning" | "afternoon",
                  status: "suggested",
                  order: Math.floor(activityIndex / 5),
                  suggestionId: doc.id
                };
                
                weeklyPlanData[day].push(activity);
                activityIndex++;
              }
            });
          }
          
          // Save the new plan
          await newPlanRef.set(weeklyPlanData);
        } else {
          weeklyPlanData = weeklyPlanQuery.docs[0].data() as WeeklyPlanData;
        }
        
        // Gather all activity IDs from the weekly plan
        const activityIds = new Set<string>();
        ["monday", "tuesday", "wednesday", "thursday", "friday"].forEach(day => {
          weeklyPlanData[day].forEach((activity: WeeklyPlanActivity) => {
            activityIds.add(activity.activityId);
          });
        });
        
        // Fetch activity details for all activities in the plan
        const activitiesDetails: Record<string, any> = {};
        
        if (activityIds.size > 0) {
          const activitiesPromises = Array.from(activityIds).map(async (activityId) => {
            const activityDoc = await db.collection("activities").doc(activityId).get();
            if (activityDoc.exists) {
              activitiesDetails[activityId] = activityDoc.data();
            }
          });
          
          await Promise.all(activitiesPromises);
        }
        
        // Send the email
        try {
          const { data, error } = await resend.emails.send({
            from: 'Learn Sprout <weekly@updates.learn-sprout.com>',
            to: userData.email,
            subject: `${childData.name}'s Weekly Plan: ${dateFns.format(nextMonday, 'MMMM d')} - ${dateFns.format(dateFns.addDays(nextMonday, 4), 'MMMM d')}`,
            html: generateWeeklyPlanEmailHtml(
              userData.displayName,
              childData.name,
              nextMonday,
              weeklyPlanData,
              activitiesDetails
            )
          });
          
          if (error) {
            console.error(`Error sending email to ${userData.email}:`, error);
          } else {
            console.log(`Successfully sent weekly plan email to ${userData.email} for child ${childData.name}`);
          }
        } catch (error) {
          console.error(`Error sending email to ${userData.email}:`, error);
        }
      }
    }
    
    console.log('Weekly plan email job completed');
  } catch (error) {
    console.error('Error in sendWeeklyPlanEmails function:', error);
  }
});

/**
 * Generates HTML content for the weekly plan email
 */
function generateWeeklyPlanEmailHtml(
  userName: string,
  childName: string,
  weekStartingDate: Date,
  weeklyPlanData: any,
  activitiesDetails: Record<string, any>
): string {
  // Format the week dates
  const weekStart = new Date(weekStartingDate);
  const weekEnd = new Date(weekStartingDate);
  weekEnd.setDate(weekEnd.getDate() + 4); // Monday to Friday
  
  const dateOptions: Intl.DateTimeFormatOptions = { month: 'long', day: 'numeric' };
  const weekRangeText = `${weekStart.toLocaleDateString('en-US', dateOptions)} - ${weekEnd.toLocaleDateString('en-US', dateOptions)}`;

  // Generate the activities HTML for each day
  const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
  
  let activitiesHtml = '';
  
  daysOfWeek.forEach(day => {
    const dayDate = new Date(weekStartingDate);
    dayDate.setDate(dayDate.getDate() + daysOfWeek.indexOf(day));
    const formattedDay = dateFns.format(dayDate, 'EEEE, MMM d');
    
    activitiesHtml += `
      <div style="margin-bottom: 25px;">
        <h3 style="color: #059669; margin: 0 0 10px 0; font-size: 18px; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px;">
          ${formattedDay}
        </h3>
    `;
    
    const dayActivities = weeklyPlanData[day] || [];
    
    if (dayActivities.length === 0) {
      activitiesHtml += `<p style="color: #6b7280; font-style: italic; margin: 0;">No activities scheduled</p>`;
    } else {
      dayActivities.forEach((activity: WeeklyPlanActivity) => {
        const activityDetails = activitiesDetails[activity.activityId] || {};
        const timeSlot = activity.timeSlot === 'morning' ? 'Morning' : 'Afternoon';
        
        activitiesHtml += `
          <div style="background-color: #f9fafb; border-left: 3px solid #059669; padding: 12px; margin-bottom: 12px; border-radius: 4px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
              <span style="font-weight: 500; color: #111827;">${activityDetails.title || 'Activity'}</span>
              <span style="color: #6b7280; font-size: 14px;">${timeSlot}</span>
            </div>
            <p style="margin: 5px 0; color: #4b5563; font-size: 14px;">${activityDetails.description || ''}</p>
            <div style="margin-top: 8px;">
              <span style="background-color: #d1fae5; color: #065f46; font-size: 12px; padding: 3px 8px; border-radius: 12px;">${activityDetails.area || 'General'}</span>
              ${activityDetails.difficulty ? `<span style="background-color: #e0f2fe; color: #0369a1; font-size: 12px; padding: 3px 8px; border-radius: 12px; margin-left: 5px;">${activityDetails.difficulty}</span>` : ''}
            </div>
          </div>
        `;
      });
    }
    
    activitiesHtml += `</div>`;
  });

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
      <div style="text-align: center; margin-bottom: 30px;">
        <img src="https://learnsprout.vercel.app/icons/icon-192x192.png" alt="Learn Sprout Logo" style="height: 40px; margin-bottom: 20px;">
        <h1 style="color: #059669; margin: 0; font-size: 24px;">${childName}'s Weekly Plan</h1>
        <p style="color: #4b5563; margin: 10px 0 0 0;">Week of ${weekRangeText}</p>
      </div>
      
      <div style="background-color: #f3f4f6; padding: 20px; border-radius: 6px; margin-bottom: 30px;">
        <p style="margin: 0 0 15px 0; font-size: 16px; line-height: 1.5;">Hi ${userName},</p>
        <p style="margin: 0 0 15px 0; font-size: 16px; line-height: 1.5;">
          Here is ${childName}'s learning plan for next week. These activities have been selected based on ${childName}'s
          current skills and interests.
        </p>
        <p style="margin: 0; font-size: 16px; line-height: 1.5;">
          You can modify this plan anytime on the Learn Sprout platform.
        </p>
      </div>
      
      <div style="margin: 30px 0;">
        ${activitiesHtml}
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="https://learnsprout.vercel.app/dashboard/weekly-plans" 
           style="background-color: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 500; font-size: 16px;">
          View Full Plan
        </a>
      </div>
      
      <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px;">
        <p style="color: #6b7280; font-size: 14px; margin: 0;">
          If you'd like to adjust your email preferences, please visit your <a href="https://learnsprout.vercel.app/settings" style="color: #059669; text-decoration: none;">account settings</a>.
        </p>
      </div>
      
      <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
        <p style="color: #9ca3af; font-size: 12px;">
          Sent by Learn Sprout • <a href="https://learnsprout.vercel.app" style="color: #059669; text-decoration: none;">Visit Website</a>
        </p>
      </div>
    </div>
  `;
}