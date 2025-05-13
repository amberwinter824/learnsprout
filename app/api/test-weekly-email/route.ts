import { NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { Resend } from 'resend';
import { generateWeeklyPlanEmailHtml } from '@/lib/emailService';
import { generateWeeklyPlan } from '@/lib/planGenerator';

// Debug environment variables
const envDebug = {
  hasFirebaseKey: !!process.env.FIREBASE_SERVICE_ACCOUNT_KEY,
  firebaseKeyLength: process.env.FIREBASE_SERVICE_ACCOUNT_KEY?.length || 0,
  hasResendKey: !!process.env.RESEND_API_KEY,
  resendKeyLength: process.env.RESEND_API_KEY?.length || 0,
  environment: process.env.NODE_ENV,
  // Add first few characters of keys for debugging (safely)
  firebaseKeyPreview: process.env.FIREBASE_SERVICE_ACCOUNT_KEY?.substring(0, 10) + '...',
  resendKeyPreview: process.env.RESEND_API_KEY?.substring(0, 10) + '...'
};

console.log('Environment Debug:', envDebug);

// Initialize Firebase Admin
let adminDb: any = null;
let initializationError: string | null = null;

try {
  console.log('Starting Firebase initialization...');
  if (!getApps().length) {
    console.log('No existing Firebase apps, initializing new app...');
    // Check if Firebase service account key exists
    if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      initializationError = 'Missing FIREBASE_SERVICE_ACCOUNT_KEY environment variable';
      console.error(initializationError);
    } else {
      try {
        console.log('Attempting to decode Firebase service account key...');
        // Try to decode and parse the service account
        const decoded = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_KEY, 'base64').toString();
        console.log('Successfully decoded Firebase key, length:', decoded.length);
        
        console.log('Attempting to parse service account JSON...');
        const serviceAccount = JSON.parse(decoded);
        console.log('Successfully parsed service account, keys:', Object.keys(serviceAccount));
        
        console.log('Initializing Firebase app...');
        // Initialize Firebase with the service account
        initializeApp({
          credential: cert(serviceAccount)
        });
        console.log('Firebase app initialized successfully');
        
        console.log('Getting Firestore instance...');
        adminDb = getFirestore();
        console.log('Firestore instance obtained successfully');
      } catch (error: any) {
        initializationError = `Error initializing Firebase: ${error.message}`;
        console.error('Firebase initialization error:', error);
        console.error('Error stack:', error.stack);
      }
    }
  } else {
    console.log('Firebase app already exists, getting Firestore instance...');
    adminDb = getFirestore();
    console.log('Firestore instance obtained successfully');
  }
} catch (error: any) {
  initializationError = `Unexpected initialization error: ${error.message}`;
  console.error('Unexpected error during initialization:', error);
  console.error('Error stack:', error.stack);
}

// Initialize Resend
console.log('Initializing Resend...');
const resend = new Resend(process.env.RESEND_API_KEY);
console.log('Resend initialized successfully');

export async function GET() {
  console.log('GET request received, checking initialization status...');
  // Return detailed initialization status if there's an error
  if (initializationError || !adminDb) {
    console.log('Initialization error detected:', initializationError);
    console.log('Admin DB status:', !!adminDb);
    return NextResponse.json({ 
      error: 'Services not properly initialized',
      details: {
        message: initializationError || 'Unknown initialization error',
        firebaseInitialized: !!adminDb,
        resendInitialized: !!resend,
        environment: process.env.NODE_ENV,
        hasFirebaseKey: !!process.env.FIREBASE_SERVICE_ACCOUNT_KEY,
        hasResendKey: !!process.env.RESEND_API_KEY,
        envDebug
      }
    }, { status: 500 });
  }

  try {
    // Get all users with email notifications and weekly digest enabled
    console.log('Fetching users with email notifications enabled...');
    const usersSnapshot = await adminDb
      .collection('users')
      .where('preferences.emailNotifications', '==', true)
      .where('preferences.weeklyDigest', '==', true)
      .limit(5) // Process only 5 users at a time
      .get();

    if (usersSnapshot.empty) {
      console.log('No users found with email notifications and weekly digest enabled');
      return NextResponse.json({ message: 'No users found with email notifications and weekly digest enabled' });
    }

    console.log(`Found ${usersSnapshot.size} users with email notifications enabled`);
    const results = {
      totalUsers: usersSnapshot.size,
      emailsSent: 0,
      errors: [] as string[],
      permissionsErrors: [] as string[],
      collectionAccess: {
        users: true,
        children: false,
        activities: false,
        weeklyPlans: false,
        childSkills: false,
        progressRecords: false
      } as Record<string, boolean>
    };

    // Test collection access
    try {
      // Get a sample of children documents to inspect their structure
      const sampleChildren = await adminDb.collection('children').limit(5).get();
      console.log('Sample children documents:');
      sampleChildren.forEach((doc: FirebaseFirestore.QueryDocumentSnapshot) => {
        const data = doc.data();
        console.log(`Child ${doc.id}:`, {
          id: doc.id,
          userId: data.userId,
          parentId: data.parentId,
          active: data.active,
          status: data.status,
          name: data.name,
          allFields: Object.keys(data)
        });
      });
      
      // Test access to all required collections
      const collectionsToTest = [
        'children',
        'childSkills',
        'progressRecords',
        'activities',
        'weeklyPlans'
      ] as const;

      for (const collectionName of collectionsToTest) {
        try {
          console.log(`Testing access to ${collectionName} collection...`);
          const testQuery = await adminDb.collection(collectionName).limit(1).get();
          console.log(`Successfully accessed ${collectionName} collection`);
          results.collectionAccess[collectionName] = true;
        } catch (error: any) {
          console.error(`Error accessing ${collectionName} collection:`, error);
          results.permissionsErrors.push(`Cannot access ${collectionName} collection: ${error.message}`);
          results.collectionAccess[collectionName] = false;
        }
      }

      // Test specific queries used in generateWeeklyPlan
      try {
        console.log('Testing childSkills query...');
        const childSkillsQuery = await adminDb
          .collection('childSkills')
          .where('childId', '==', 'test')
          .limit(1)
          .get();
        console.log('Successfully tested childSkills query');
      } catch (error: any) {
        console.error('Error testing childSkills query:', error);
        results.permissionsErrors.push(`Cannot query childSkills: ${error.message}`);
      }

      try {
        console.log('Testing progressRecords query...');
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const progressRecordsQuery = await adminDb
          .collection('progressRecords')
          .where('childId', '==', 'test')
          .where('date', '>=', thirtyDaysAgo)
          .limit(1)
          .get();
        console.log('Successfully tested progressRecords query');
      } catch (error: any) {
        console.error('Error testing progressRecords query:', error);
        results.permissionsErrors.push(`Cannot query progressRecords: ${error.message}`);
      }

      try {
        console.log('Testing activities query...');
        const activitiesQuery = await adminDb
          .collection('activities')
          .where('ageRanges', 'array-contains', 'preschool')
          .where('status', '==', 'active')
          .limit(1)
          .get();
        console.log('Successfully tested activities query');
      } catch (error: any) {
        console.error('Error testing activities query:', error);
        results.permissionsErrors.push(`Cannot query activities: ${error.message}`);
      }

      // If we can't access any required collections or queries, return early
      if (results.permissionsErrors.length > 0) {
        return NextResponse.json({
          error: 'Missing required collection access',
          details: {
            collectionAccess: results.collectionAccess,
            permissionsErrors: results.permissionsErrors
          }
        }, { status: 403 });
      }
    } catch (error: any) {
      console.error('Error testing collection access:', error);
      results.permissionsErrors.push(`Error testing collection access: ${error.message}`);
      return NextResponse.json({
        error: 'Error testing collection access',
        details: {
          message: error.message,
          collectionAccess: results.collectionAccess,
          permissionsErrors: results.permissionsErrors
        }
      }, { status: 500 });
    }

    // Process each user with a timeout
    const processUser = async (userDoc: any) => {
      const userData = userDoc.data();
      const userEmail = userData.email;
      const userName = userData.displayName || userData.name || 'Parent';

      console.log(`Processing user ${userEmail}...`);

      // Get children for this user
      console.log(`Querying children for user ${userDoc.id}...`);
      
      // Query children with optional active filter
      const childrenSnapshot = await adminDb
        .collection('children')
        .where('userId', '==', userDoc.id)
        .get();
      
      console.log(`Found ${childrenSnapshot.size} children for user ${userEmail}`);
      
      if (childrenSnapshot.empty) {
        results.errors.push(`No children found for user ${userEmail}`);
        return;
      }

      try {
        // Process each child
        for (const childDoc of childrenSnapshot.docs) {
          const childData = childDoc.data();
          const childName = childData.name;

          // Skip if child is explicitly marked as inactive
          if (childData.active === false) {
            console.log(`Skipping ${childName} - marked as inactive`);
            continue;
          }

          try {
            // Check if we've already generated a plan for this week
            const lastPlanGenerated = childData.lastPlanGenerated?.toDate();
            const today = new Date();
            const nextMonday = new Date(today);
            nextMonday.setDate(today.getDate() + (8 - today.getDay()) % 7);
            nextMonday.setHours(0, 0, 0, 0);

            if (lastPlanGenerated && lastPlanGenerated >= nextMonday) {
              console.log(`Skipping ${childName} - plan already generated for this week`);
              continue;
            }

            console.log(`Generating plan for child ${childName} (${childDoc.id})...`);
            
            // Generate a weekly plan for the child
            console.log(`Calling generateWeeklyPlan for child ${childName}...`);
            try {
              const initialChildData = childDoc.data();
              console.log('Child data before plan generation:', {
                id: childDoc.id,
                name: childName,
                ageGroup: initialChildData.ageGroup,
                userId: initialChildData.userId,
                parentId: initialChildData.parentId,
                active: initialChildData.active,
                lastPlanGenerated: initialChildData.lastPlanGenerated?.toDate()
              });

              console.log('Starting plan generation...');
              
              // Get child data
              const childRef = adminDb.collection('children').doc(childDoc.id);
              const childDocSnapshot = await childRef.get();
              
              if (!childDocSnapshot.exists) {
                throw new Error('Child not found');
              }
              
              const childData = childDocSnapshot.data();
              if (!childData) {
                throw new Error('Child data is null');
              }
              
              const ageGroup = childData.ageGroup;
              const interests = childData.interests || [];
              
              console.log(`Child age group: ${ageGroup}, interests: ${interests.join(', ')}`);
              
              // Get user activity preferences
              const preferencesRef = adminDb.collection('users').doc(userDoc.id);
              const preferencesDoc = await preferencesRef.get();
              const preferences = preferencesDoc.data()?.preferences?.activityPreferences || {};
              
              // Get current skill levels
              const skillsQuery = adminDb
                .collection('childSkills')
                .where('childId', '==', childDoc.id);
              
              const skillsSnapshot = await skillsQuery.get();
              
              const childSkills: Record<string, string> = {};
              skillsSnapshot.forEach((doc: FirebaseFirestore.QueryDocumentSnapshot) => {
                const data = doc.data();
                childSkills[data.skillId] = data.status; // emerging, developing, mastered
              });
              
              console.log(`Got ${Object.keys(childSkills).length} skills for child`);
              
              // Get recent activities (completed in the last 30 days)
              const thirtyDaysAgo = new Date();
              thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
              
              const recentActivitiesQuery = adminDb
                .collection('progressRecords')
                .where('childId', '==', childDoc.id)
                .where('date', '>=', thirtyDaysAgo);
              
              const recentActivitiesSnapshot = await recentActivitiesQuery.get();
              
              // Track which activities were completed and their engagement level
              const recentActivities: Record<string, any> = {};
              recentActivitiesSnapshot.forEach((doc: FirebaseFirestore.QueryDocumentSnapshot) => {
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
              const activitiesQuery = adminDb
                .collection('activities')
                .where('ageRanges', 'array-contains', ageGroup)
                .where('status', '==', 'active');
              
              const activitiesSnapshot = await activitiesQuery.get();
              let activities: any[] = [];
              
              activitiesSnapshot.forEach((doc: FirebaseFirestore.QueryDocumentSnapshot) => {
                const data = doc.data();
                activities.push({
                  id: doc.id,
                  title: data.title,
                  ...data
                });
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
              const scoredActivities = activities.map(activity => {
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
              
              // Build plan with different activities for each day
              const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
              type DayOfWeek = typeof days[number];
              
              interface WeeklyPlan {
                childId: string;
                userId: string;
                weekStarting: Date;
                createdBy: string;
                createdAt: any;
                updatedAt: any;
                monday: any[];
                tuesday: any[];
                wednesday: any[];
                thursday: any[];
                friday: any[];
                saturday: any[];
                sunday: any[];
                [key: string]: any;
              }
              
              const weeklyPlan: WeeklyPlan = {
                childId: childDoc.id,
                userId: userDoc.id,
                weekStarting: nextMonday,
                createdBy: 'system',
                createdAt: adminDb.FieldValue.serverTimestamp(),
                updatedAt: adminDb.FieldValue.serverTimestamp(),
                monday: [] as any[],
                tuesday: [] as any[],
                wednesday: [] as any[],
                thursday: [] as any[],
                friday: [] as any[],
                saturday: [] as any[],
                sunday: [] as any[]
              };
              
              // Check if a plan already exists for this week
              const planId = `${childDoc.id}_${nextMonday.toISOString().split('T')[0]}`;
              const existingPlanRef = adminDb.collection('weeklyPlans').doc(planId);
              const existingPlanDoc = await existingPlanRef.get();
              
              // If plan exists and we're doing an evolving update, merge with existing plan
              // preserving any completed activities or user modifications
              if (existingPlanDoc.exists) {
                const existingPlan = existingPlanDoc.data();
                
                // For each day, retain any activities that have been completed or modified by the user
                days.forEach((day: DayOfWeek) => {
                  const existingActivities = existingPlan[day] || [];
                  
                  // Filter activities that should be preserved (completed or user-modified)
                  const preservedActivities = existingActivities.filter((activity: any) => 
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
                const existingActivities = weeklyPlan[day];
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
              await existingPlanRef.set(weeklyPlan);
              
              // Update child profile with last plan generation timestamp
              await childRef.update({
                lastPlanGenerated: adminDb.FieldValue.serverTimestamp()
              });
              
              console.log(`Created/updated weekly plan with ID: ${planId}`);
              
              interface WeeklyPlanWithId extends WeeklyPlan {
                id: string;
              }
              
              const weeklyPlanWithId: WeeklyPlanWithId = { id: planId, ...weeklyPlan };
              console.log('Plan generation completed successfully');
              console.log('Generated plan structure:', {
                hasMonday: !!weeklyPlanWithId.monday?.length,
                hasTuesday: !!weeklyPlanWithId.tuesday?.length,
                hasWednesday: !!weeklyPlanWithId.wednesday?.length,
                hasThursday: !!weeklyPlanWithId.thursday?.length,
                hasFriday: !!weeklyPlanWithId.friday?.length,
                totalActivities: Object.values(weeklyPlanWithId).reduce((sum, day) => sum + (Array.isArray(day) ? day.length : 0), 0)
              });
              
              // Get activity details for all activities in the plan
              const activitiesDetails: Record<string, any> = {};
              const activityIds = new Set<string>();
              
              const weekdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] as const;
              weekdays.forEach(day => {
                weeklyPlanWithId[day].forEach((activity: any) => {
                  activityIds.add(activity.activityId);
                });
              });

              console.log(`Fetching details for ${activityIds.size} activities...`);
              // Fetch activity details
              for (const activityId of activityIds) {
                try {
                  console.log(`Fetching activity ${activityId}...`);
                  const activityDoc = await adminDb.collection('activities').doc(activityId).get();
                  if (activityDoc.exists) {
                    activitiesDetails[activityId] = activityDoc.data();
                    console.log(`Successfully fetched activity ${activityId}`);
                  } else {
                    console.log(`Activity ${activityId} not found`);
                  }
                } catch (error: any) {
                  console.error(`Error fetching activity ${activityId}:`, error);
                  throw new Error(`Failed to fetch activity ${activityId}: ${error.message}`);
                }
              }

              console.log(`Generating email HTML for ${childName}...`);
              // Send email
              const emailHtml = generateWeeklyPlanEmailHtml(
                userName,
                childName,
                nextMonday,
                weeklyPlan,
                activitiesDetails
              );

              console.log(`Sending email to ${userEmail}...`);
              const { data, error } = await resend.emails.send({
                from: 'Learn Sprout <weekly@updates.learn-sprout.com>',
                to: userEmail,
                subject: `${childName}'s Weekly Plan: ${nextMonday.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} - ${new Date(nextMonday.getTime() + 4 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}`,
                html: emailHtml,
              });

              if (error) {
                throw error;
              }

              results.emailsSent++;
              console.log(`Generated email for ${childName} and sent to ${userEmail}`);
            } catch (error: any) {
              console.error('Error generating plan:', error);
              results.errors.push(`Error generating plan for ${childName}: ${error.message}`);
            }
          } catch (error: any) {
            console.error(`Error processing child ${childName}:`, error);
            results.errors.push(`Error processing child ${childName}: ${error.message}`);
          }
        }
      } catch (error: any) {
        console.error('Error processing user:', error);
        results.errors.push(`Error processing user: ${error.message}`);
      }
    }

    // Return results
    return NextResponse.json({
      message: 'Email generation completed',
      results: results
    }, { status: 200 });
  } catch (error: any) {
    console.error('Unexpected error in GET handler:', error);
    return NextResponse.json({ error: 'Unexpected error', details: error.message }, { status: 500 });
  }
}