// utilities/firebaseInit.js - using same approach as your working test
const { initializeApp } = require('firebase/app');
const { 
  getFirestore, 
  collection, 
  doc, 
  setDoc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  serverTimestamp,
  Timestamp
} = require('firebase/firestore');

// Load environment variables in Node.js context
require('dotenv').config({ path: '.env.local' });

// Use environment variables for configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Add connection test
console.log("Firebase app initialized with config:", {
  projectId: firebaseConfig.projectId,
  authDomain: firebaseConfig.authDomain
});

try {
  const testDoc = doc(db, 'test', 'test');
  console.log("Firestore instance created successfully");
} catch (error) {
  console.error("Error creating Firestore instance:", error);
}

/**
 * Initialize the database structure
 */
async function initializeDatabase() {
  try {
    console.log("initializeDatabase function is running");
    console.log("Starting database initialization...");

   // Check if sample functions are returning data
   const skillsSample = getSampleDevelopmentalSkills();
   console.log(`Got ${skillsSample.length} sample skills`);
   
   const activitiesSample = getSampleActivities();
   console.log(`Got ${activitiesSample.length} sample activities`);
   
   // Check and initialize developmental skills
   console.log("Starting to ensure developmental skills collection...");
   const skillsResult = await ensureCollectionWithData(
     "developmentalSkills", 
     skillsSample,
     "skill"
   );
   console.log(`Skills collection result: ${skillsResult ? 'success' : 'failed'}`);
   
   // Check and initialize activities
   console.log("Starting to ensure activities collection...");
   const activitiesResult = await ensureCollectionWithData(
     "activities", 
     activitiesSample,
     "act"
   );
   console.log(`Activities collection result: ${activitiesResult ? 'success' : 'failed'}`);
   
    
    // Ensure other collections have at least their structure set up
    console.log("Ensuring collection structures...");
    const structuresResult = await ensureCollectionStructures();
    console.log(`Collection structures result: ${structuresResult ? 'success' : 'failed'}`);
    
    console.log("Database initialization complete!");
    return true;
  } catch (error) {
    console.error("Error initializing database:", error);
    return false;
  }
}

/**
 * Check if a collection has data, and populate it with samples if empty
 */
async function ensureCollectionWithData(collectionName, sampleDataArray, idPrefix) {
    try {
      console.log(`----------`);
      console.log(`Checking collection ${collectionName}...`);
      
      // Explicitly log the sample data count
      console.log(`Sample data array for ${collectionName} has ${sampleDataArray.length} items`);
      
      const collectionRef = collection(db, collectionName);
      console.log(`Created collection reference for ${collectionName}`);
      
      try {
        console.log(`Attempting to get documents from ${collectionName}...`);
        const snapshot = await getDocs(collectionRef);
        console.log(`Successfully retrieved documents. Collection ${collectionName} has ${snapshot.size} documents`);
        
        if (snapshot.empty) {
          console.log(`Collection ${collectionName} is empty. Will add sample data...`);
          
          // Add sample data
          for (const [index, data] of sampleDataArray.entries()) {
            const id = data.id || `${idPrefix}${index + 1}`;
            console.log(`Preparing to add document ${id} to ${collectionName}...`);
            
            const { id: _, ...dataWithoutId } = data;
            console.log(`Document data prepared for ${id}`);
            
            try {
              console.log(`Setting document ${id} in ${collectionName}...`);
              await setDoc(doc(db, collectionName, id), {
                ...dataWithoutId,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
              });
              console.log(`Successfully added document ${id} to ${collectionName}`);
            } catch (docError) {
              console.error(`Error adding document ${id} to ${collectionName}:`, docError);
            }
          }
          
          console.log(`Finished adding ${sampleDataArray.length} sample documents to ${collectionName}`);
        } else {
          console.log(`Collection ${collectionName} already has ${snapshot.size} documents. Skipping initialization.`);
        }
      } catch (queryError) {
        console.error(`Error querying collection ${collectionName}:`, queryError);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error(`Error ensuring collection ${collectionName}:`, error);
      return false;
    }
  }
/**
 * Make sure a specific document exists in a collection
 */
async function ensureDocumentExists(collectionName, documentId, sampleData) {
  try {
    const docRef = doc(db, collectionName, documentId);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      console.log(`Creating document ${documentId} in ${collectionName}...`);
      await setDoc(docRef, sampleData);
      return true;
    } else {
      console.log(`Document ${documentId} in ${collectionName} already exists. Skipping.`);
      return false;
    }
  } catch (error) {
    console.error(`Error ensuring document ${documentId} in ${collectionName}:`, error);
    return false;
  }
}

/**
 * Sample data for developmental skills
 */
function getSampleDevelopmentalSkills() {
  return [
    {
      id: "skill1",
      name: "Pouring",
      description: "Ability to pour liquids from one container to another with control",
      area: "practical_life",
      ageRanges: ["3-4", "4-5"],
      prerequisites: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    },
    {
      id: "skill2",
      name: "Color Matching",
      description: "Ability to match identical colors",
      area: "sensorial",
      ageRanges: ["3-4"],
      prerequisites: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    },
    {
      id: "skill3",
      name: "Letter Recognition",
      description: "Ability to identify and name letters of the alphabet",
      area: "language",
      ageRanges: ["4-5", "5-6"],
      prerequisites: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    },
    {
      id: "skill4",
      name: "Counting to 10",
      description: "Ability to count objects from 1 to 10",
      area: "mathematics",
      ageRanges: ["3-4", "4-5"],
      prerequisites: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }
  ];
}

/**
 * Sample data for activities
 */
function getSampleActivities() {
  return [
    {
      id: "act1",
      title: "Water Pouring Exercise",
      description: "Practice pouring water between containers",
      instructions: "Set up two small pitchers, one filled with water. The child pours water from one pitcher to the other with focus on control and precision.",
      ageRanges: ["3-4", "4-5"],
      area: "practical_life",
      materialsNeeded: ["Two small pitchers", "Water", "Tray", "Sponge for spills"],
      duration: 15,
      difficulty: "beginner",
      status: "active",
      imageUrl: "",
      prerequisites: [],
      nextSteps: ["act2"],
      relatedActivities: [],
      skillsAddressed: ["skill1"],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    },
    {
      id: "act2",
      title: "Advanced Pouring with Funnel",
      description: "Practice pouring water using a funnel",
      instructions: "Using a funnel and small containers, the child focuses on eye-hand coordination and precision.",
      ageRanges: ["4-5", "5-6"],
      area: "practical_life",
      materialsNeeded: ["Small pitcher", "Funnel", "Small bottles", "Water", "Tray", "Sponge"],
      duration: 20,
      difficulty: "intermediate",
      status: "active",
      imageUrl: "",
      prerequisites: ["act1"],
      nextSteps: [],
      relatedActivities: [],
      skillsAddressed: ["skill1"],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    },
    {
      id: "act3",
      title: "Color Matching Cards",
      description: "Match color cards to identical pairs",
      instructions: "Provide a basket of color cards and ask the child to find the matching pairs.",
      ageRanges: ["3-4"],
      area: "sensorial",
      materialsNeeded: ["Color matching cards"],
      duration: 15,
      difficulty: "beginner",
      status: "active",
      imageUrl: "",
      prerequisites: [],
      nextSteps: [],
      relatedActivities: [],
      skillsAddressed: ["skill2"],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    },
    {
      id: "act4",
      title: "Counting Objects",
      description: "Count collections of small objects",
      instructions: "Provide sets of objects and number cards. The child counts each set and places the corresponding number card.",
      ageRanges: ["3-4", "4-5"],
      area: "mathematics",
      materialsNeeded: ["Small objects (beads, buttons)", "Number cards 1-10"],
      duration: 15,
      difficulty: "beginner",
      status: "active",
      imageUrl: "",
      prerequisites: [],
      nextSteps: [],
      relatedActivities: [],
      skillsAddressed: ["skill4"],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }
  ];
}

/**
 * Ensure all collections have their structures set up correctly
 */
async function ensureCollectionStructures() {
  console.log("Ensuring collection structures...");
  
  // Sample user
  await ensureDocumentExists("users", "sampleUser1", {
    email: "parent@example.com",
    displayName: "Sample Parent",
    createdAt: serverTimestamp(),
    lastLogin: serverTimestamp(),
    role: "parent",
    preferences: {
      emailNotifications: true,
      weeklyDigest: true,
      theme: "light"
    }
  });
  
  // Sample child
  await ensureDocumentExists("children", "sampleChild1", {
    name: "Alex",
    birthDate: Timestamp.fromDate(new Date("2020-05-15")),
    parentId: "sampleUser1",
    ageGroup: "3-4",
    active: true,
    interests: ["animals", "building"],
    notes: "Enjoys hands-on activities",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  
  // Sample child skill
  await ensureDocumentExists("childSkills", "sampleChildSkill1", {
    childId: "sampleChild1",
    skillId: "skill1",
    status: "emerging",
    lastAssessed: Timestamp.fromDate(new Date()),
    notes: "Beginning to show interest in pouring activities",
    updatedAt: serverTimestamp()
  });
  
  // Sample weekly plan - this is the most important one for your immediate needs
  await ensureDocumentExists("weeklyPlans", "samplePlan1", {
    childId: "sampleChild1",
    weekStarting: Timestamp.fromDate(new Date()),
    createdBy: "system",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    userId: "sampleUser1",
    monday: [
      {
        activityId: "act1",
        timeSlot: "morning",
        status: "suggested",
        order: 1
      },
      {
        activityId: "act3",
        timeSlot: "afternoon",
        status: "confirmed",
        order: 2
      }
    ],
    tuesday: [
      {
        activityId: "act4",
        timeSlot: "morning",
        status: "suggested",
        order: 1
      }
    ],
    wednesday: [],
    thursday: [],
    friday: [],
    saturday: [],
    sunday: []
  });
  
  // Sample progress record
  await ensureDocumentExists("progressRecords", "sampleProgress1", {
    childId: "sampleChild1",
    activityId: "act1",
    date: Timestamp.fromDate(new Date(Date.now() - 86400000)), // Yesterday
    completionStatus: "completed",
    engagementLevel: "high",
    completionDifficulty: "appropriate",
    interestLevel: "high",
    notes: "Really enjoyed this activity, asked to do it again",
    photoUrls: [],
    skillsDemonstrated: ["skill1"],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  
  // Sample activity suggestion
  await ensureDocumentExists("activitySuggestions", "sampleSuggestion1", {
    childId: "sampleChild1",
    activityId: "act2",
    reason: "Follow-up to previous activity with high engagement",
    priority: 8,
    suggestedAt: serverTimestamp(),
    status: "pending",
    weeklyPlanId: ""
  });
  
  // Sample recommendation log
  await ensureDocumentExists("recommendationLogs", "sampleLog1", {
    childId: "sampleChild1",
    activityId: "act1",
    suggestedAt: Timestamp.fromDate(new Date(Date.now() - 172800000)), // 2 days ago
    reasonCodes: ["age_match", "skill_development"],
    score: 7.5,
    outcome: "completed",
    parentFeedback: "Good suggestion"
  });
  
  console.log("Collection structures verified");
}

// UTILITY FUNCTIONS FOR WORKING WITH WEEKLY PLANS

/**
 * Add a new activity to a specific day in a weekly plan
 */
async function addActivityToWeeklyPlan(planId, day, activity) {
  try {
    // Reference to the weekly plan document
    const planRef = doc(db, "weeklyPlans", planId);
    
    // Get current plan data
    const planDoc = await getDoc(planRef);
    
    if (!planDoc.exists()) {
      throw new Error(`Plan with ID ${planId} does not exist`);
    }
    
    const planData = planDoc.data();
    
    // Clone the current day's activities or create empty array if none exist
    const dayActivities = planData[day] ? [...planData[day]] : [];
    
    // Add the new activity to the array
    dayActivities.push(activity);
    
    // Update the document
    await updateDoc(planRef, {
      [day]: dayActivities,
      updatedAt: serverTimestamp()
    });
    
    console.log(`Activity added to ${day} in plan ${planId}`);
    return true;
  } catch (error) {
    console.error("Error adding activity to weekly plan:", error);
    return false;
  }
}

/**
 * Update a specific activity in a weekly plan
 */
async function updateWeeklyPlanActivity(planId, day, activityIndex, updatedData) {
  try {
    // Reference to the weekly plan document
    const planRef = doc(db, "weeklyPlans", planId);
    
    // Get current plan data
    const planDoc = await getDoc(planRef);
    
    if (!planDoc.exists()) {
      throw new Error(`Plan with ID ${planId} does not exist`);
    }
    
    const planData = planDoc.data();
    
    // Ensure the day and activity index exist
    if (!planData[day] || !planData[day][activityIndex]) {
      throw new Error(`Activity at index ${activityIndex} for ${day} does not exist`);
    }
    
    // Clone the current day's activities
    const dayActivities = [...planData[day]];
    
    // Update the specific activity
    dayActivities[activityIndex] = {
      ...dayActivities[activityIndex],
      ...updatedData
    };
    
    // Update the document
    await updateDoc(planRef, {
      [day]: dayActivities,
      updatedAt: serverTimestamp()
    });
    
    console.log(`Activity updated in ${day} at index ${activityIndex}`);
    return true;
  } catch (error) {
    console.error("Error updating activity in weekly plan:", error);
    return false;
  }
}

/**
 * Create a new weekly plan for a child
 */
async function createWeeklyPlan(childId, userId, weekStarting = new Date()) {
  try {
    const newPlanRef = doc(collection(db, "weeklyPlans"));
    
    const newPlan = {
      childId: childId,
      userId: userId,
      weekStarting: Timestamp.fromDate(weekStarting),
      createdBy: userId,
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
    
    await setDoc(newPlanRef, newPlan);
    console.log(`Created new weekly plan with ID: ${newPlanRef.id}`);
    return newPlanRef.id;
  } catch (error) {
    console.error("Error creating weekly plan:", error);
    return null;
  }
}

// You can run this function to initialize your database
// initializeDatabase();

// Export functions for use in your application
module.exports = {
    initializeDatabase,
    addActivityToWeeklyPlan,
    updateWeeklyPlanActivity,
    createWeeklyPlan
  };