import admin from 'firebase-admin';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../.env.local') });

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, '\n')
  })
});

const db = admin.firestore();

// Area-specific guidance templates
const areaGuidance = {
  practical_life: {
    setupSteps: [
      "Ensure all materials are clean and in good condition",
      "Set up the activity on a child-sized table or floor mat",
      "Arrange materials from left to right in order of use",
      "Place a tray or mat to define the work area"
    ],
    demonstrationSteps: [
      "Show how to carry the materials carefully to the workspace",
      "Demonstrate each step slowly and precisely",
      "Use minimal words, focusing on the movements",
      "Show how to clean up and return materials to their place"
    ],
    observationPoints: [
      "Watch how the child handles the materials",
      "Notice their level of concentration and focus",
      "Observe their hand-eye coordination",
      "Pay attention to their sense of order and sequence",
      "Watch for signs of developing independence"
    ],
    successIndicators: [
      "Child can complete the activity independently",
      "Child shows care and respect for materials",
      "Child maintains order in their workspace",
      "Child demonstrates increasing precision in movements",
      "Child shows satisfaction in completing the task"
    ],
    commonChallenges: [
      "Child may need help with initial setup",
      "Child might need reminders about proper handling",
      "Child may need guidance on maintaining order",
      "Child might need encouragement to complete the full sequence",
      "Child may need help with cleanup"
    ],
    extensions: [
      "Increase difficulty by adding time constraints",
      "Use different materials for sensory variation",
      "Have the child teach the activity to a sibling or friend"
    ]
  },
  sensorial: {
    setupSteps: [
      "Ensure materials are clean and complete",
      "Set up the activity on a quiet, well-lit space",
      "Arrange materials in a logical sequence",
      "Prepare a mat or tray for the work area"
    ],
    demonstrationSteps: [
      "Introduce the materials by name",
      "Demonstrate how to handle each piece carefully",
      "Show how to explore the materials with all senses",
      "Demonstrate how to compare and contrast different pieces",
      "Show how to return materials to their proper place"
    ],
    observationPoints: [
      "Watch how the child explores the materials",
      "Notice their level of sensory awareness",
      "Observe their ability to discriminate between differences",
      "Pay attention to their vocabulary development",
      "Watch for signs of concentration and focus"
    ],
    successIndicators: [
      "Child can identify and name the materials",
      "Child shows ability to discriminate between differences",
      "Child demonstrates increasing vocabulary",
      "Child shows interest in exploring variations",
      "Child can complete self-correcting activities"
    ],
    commonChallenges: [
      "Child may need help with initial exploration",
      "Child might need guidance on proper handling",
      "Child may need vocabulary support",
      "Child might need help with discrimination tasks",
      "Child may need encouragement to explore variations"
    ],
    extensions: [
      "Increase difficulty by adding time constraints",
      "Use different materials for sensory variation",
      "Have the child teach the activity to a sibling or friend"
    ]
  },
  language: {
    setupSteps: [
      "Prepare a quiet, comfortable reading space",
      "Ensure materials are at child's eye level",
      "Arrange materials in a logical sequence",
      "Prepare a writing surface if needed"
    ],
    demonstrationSteps: [
      "Introduce the activity with clear, simple language",
      "Demonstrate proper handling of materials",
      "Show how to explore the materials",
      "Model correct pronunciation and enunciation",
      "Demonstrate how to return materials properly"
    ],
    observationPoints: [
      "Watch the child's language development",
      "Notice their interest in the materials",
      "Observe their ability to follow directions",
      "Pay attention to their vocabulary growth",
      "Watch for signs of emerging literacy"
    ],
    successIndicators: [
      "Child shows interest in language activities",
      "Child demonstrates increasing vocabulary",
      "Child can follow simple directions",
      "Child shows emerging literacy skills",
      "Child demonstrates proper handling of materials"
    ],
    commonChallenges: [
      "Child may need help with pronunciation",
      "Child might need vocabulary support",
      "Child may need guidance on proper handling",
      "Child might need encouragement to participate",
      "Child may need help with sequencing"
    ],
    extensions: [
      "Increase difficulty by adding time constraints",
      "Use different materials for sensory variation",
      "Have the child teach the activity to a sibling or friend"
    ]
  },
  mathematics: {
    setupSteps: [
      "Ensure all materials are complete and in good condition",
      "Set up the activity on a clean, flat surface",
      "Arrange materials in a logical sequence",
      "Prepare a mat or tray for the work area"
    ],
    demonstrationSteps: [
      "Introduce the materials by name",
      "Demonstrate proper handling of materials",
      "Show how to explore the materials",
      "Model mathematical language and concepts",
      "Demonstrate how to return materials properly"
    ],
    observationPoints: [
      "Watch the child's understanding of mathematical concepts",
      "Notice their ability to sequence and order",
      "Observe their problem-solving skills",
      "Pay attention to their mathematical language",
      "Watch for signs of abstract thinking"
    ],
    successIndicators: [
      "Child shows understanding of mathematical concepts",
      "Child can sequence and order materials",
      "Child demonstrates problem-solving skills",
      "Child uses mathematical language",
      "Child shows interest in mathematical activities"
    ],
    commonChallenges: [
      "Child may need help with sequencing",
      "Child might need support with mathematical language",
      "Child may need guidance on proper handling",
      "Child might need encouragement to explore concepts",
      "Child may need help with abstract thinking"
    ],
    extensions: [
      "Increase difficulty by adding time constraints",
      "Use different materials for sensory variation",
      "Have the child teach the activity to a sibling or friend"
    ]
  },
  cultural: {
    setupSteps: [
      "Prepare a space that represents the cultural context",
      "Ensure materials are authentic and respectful",
      "Arrange materials to tell a cultural story",
      "Prepare any additional resources (books, images, etc.)"
    ],
    demonstrationSteps: [
      "Introduce the cultural context with respect",
      "Demonstrate how to handle cultural materials",
      "Share relevant cultural information",
      "Show how to explore and appreciate cultural differences",
      "Demonstrate proper care and storage of materials"
    ],
    observationPoints: [
      "Watch the child's interest in cultural materials",
      "Notice their respect for different cultures",
      "Observe their curiosity about cultural differences",
      "Pay attention to their questions and observations",
      "Watch for signs of cultural appreciation"
    ],
    successIndicators: [
      "Child shows respect for cultural materials",
      "Child demonstrates curiosity about different cultures",
      "Child can identify cultural elements",
      "Child shows appreciation for cultural diversity",
      "Child handles cultural materials with care"
    ],
    commonChallenges: [
      "Child may need help understanding cultural context",
      "Child might need guidance on respectful handling",
      "Child may need support with cultural concepts",
      "Child might need encouragement to explore differences",
      "Child may need help with cultural vocabulary"
    ],
    extensions: [
      "Increase difficulty by adding time constraints",
      "Use different materials for sensory variation",
      "Have the child teach the activity to a sibling or friend"
    ]
  },
  social_emotional: {
    setupSteps: [
      "Create a safe and comfortable environment",
      "Prepare materials that encourage social interaction",
      "Arrange space for group or individual work",
      "Ensure materials support emotional expression"
    ],
    demonstrationSteps: [
      "Model appropriate social interactions",
      "Demonstrate emotional expression and regulation",
      "Show how to handle social situations",
      "Guide through problem-solving steps",
      "Demonstrate empathy and understanding"
    ],
    observationPoints: [
      "Watch the child's social interactions",
      "Notice their emotional responses",
      "Observe their problem-solving approaches",
      "Pay attention to their empathy development",
      "Watch for signs of self-regulation"
    ],
    successIndicators: [
      "Child shows appropriate social skills",
      "Child demonstrates emotional awareness",
      "Child can express feelings appropriately",
      "Child shows empathy towards others",
      "Child can resolve conflicts constructively"
    ],
    commonChallenges: [
      "Child may need help with emotional regulation",
      "Child might need guidance on social interactions",
      "Child may need support with conflict resolution",
      "Child might need encouragement to express feelings",
      "Child may need help with perspective-taking"
    ],
    extensions: [
      "Increase difficulty by adding time constraints",
      "Use different materials for sensory variation",
      "Have the child teach the activity to a sibling or friend"
    ]
  }
};

// Template for parent guidance fields
const getParentGuidanceFields = (activity) => {
  // Get area-specific guidance or use defaults
  const areaSpecificGuidance = areaGuidance[activity.area] || {
    setupSteps: [
      "Gather all materials needed for the activity",
      "Find a quiet, well-lit space with a flat surface",
      "Set up the materials in an organized and inviting way",
      "Ensure the child can comfortably reach and interact with the materials"
    ],
    demonstrationSteps: [
      "Invite the child to join you at the activity space",
      "Show the child how to handle the materials with care and precision",
      "Demonstrate the activity slowly and clearly, with minimal talking",
      "Allow the child to observe your demonstration",
      "Invite the child to try the activity themselves"
    ],
    observationPoints: [
      "Watch how the child approaches the materials",
      "Notice their level of focus and concentration",
      "Observe their hand movements and coordination",
      "Pay attention to their problem-solving approach",
      "Watch for signs of frustration or need for assistance"
    ],
    successIndicators: [
      "Child shows interest and engagement with the activity",
      "Child demonstrates increasing independence in completing the activity",
      "Child shows improved coordination and control over time",
      "Child can complete the activity with minimal assistance",
      "Child shows satisfaction in their work"
    ],
    commonChallenges: [
      "Child may need help getting started",
      "Child might get frustrated if the activity is too difficult",
      "Child may need reminders to handle materials carefully",
      "Child might need encouragement to complete the activity",
      "Child may need help staying focused"
    ],
    extensions: [
      "Increase difficulty by adding time constraints",
      "Use different materials for sensory variation",
      "Have the child teach the activity to a sibling or friend"
    ]
  };

  // Age-specific guidance adjustments
  const ageSpecificAdjustments = {
    '0-1': {
      setupSteps: [
        "Ensure the environment is completely safe for exploration",
        "Remove any small or potentially hazardous items",
        "Use soft, washable materials",
        "Create a comfortable, padded space for floor activities"
      ],
      demonstrationSteps: [
        "Use simple, clear language and gestures",
        "Demonstrate with exaggerated movements",
        "Maintain eye contact and use facial expressions",
        "Keep demonstrations brief (1-2 minutes)"
      ],
      observationPoints: [
        "Watch for signs of overstimulation",
        "Notice the child's level of engagement",
        "Observe their physical responses",
        "Pay attention to their focus duration"
      ],
      successIndicators: [
        "Child shows interest in the materials",
        "Child attempts to interact with the activity",
        "Child maintains focus for short periods",
        "Child shows enjoyment through facial expressions"
      ],
      commonChallenges: [
        "Child may have very short attention span",
        "Child might need frequent breaks",
        "Child may need help with physical coordination",
        "Child might need encouragement to explore"
      ],
      extensions: [
        "Increase difficulty by adding time constraints",
        "Use different materials for sensory variation",
        "Have the child teach the activity to a sibling or friend"
      ]
    },
    '1-2': {
      setupSteps: [
        "Ensure materials are safe and age-appropriate",
        "Create a defined work space",
        "Use simple, sturdy materials",
        "Prepare for frequent repetition"
      ],
      demonstrationSteps: [
        "Use simple, clear instructions",
        "Break down steps into very small parts",
        "Allow for hands-on exploration",
        "Model proper handling of materials"
      ],
      observationPoints: [
        "Watch for emerging independence",
        "Notice developing motor skills",
        "Observe language development",
        "Pay attention to problem-solving attempts"
      ],
      successIndicators: [
        "Child shows increasing independence",
        "Child attempts to complete simple tasks",
        "Child demonstrates emerging language skills",
        "Child shows interest in repetition"
      ],
      commonChallenges: [
        "Child may need help with coordination",
        "Child might need frequent redirection",
        "Child may need help with sequencing",
        "Child might need encouragement to persist"
      ],
      extensions: [
        "Increase difficulty by adding time constraints",
        "Use different materials for sensory variation",
        "Have the child teach the activity to a sibling or friend"
      ]
    },
    '2-3': {
      setupSteps: [
        "Prepare for more complex activities",
        "Include materials for self-correction",
        "Create opportunities for choice",
        "Prepare for longer engagement"
      ],
      demonstrationSteps: [
        "Use clear, sequential instructions",
        "Allow for independent exploration",
        "Model problem-solving strategies",
        "Encourage self-correction"
      ],
      observationPoints: [
        "Watch for developing concentration",
        "Notice emerging independence",
        "Observe problem-solving approaches",
        "Pay attention to language development"
      ],
      successIndicators: [
        "Child can follow simple sequences",
        "Child shows increasing concentration",
        "Child demonstrates problem-solving skills",
        "Child shows pride in accomplishments"
      ],
      commonChallenges: [
        "Child may need help with complex tasks",
        "Child might need reminders about sequence",
        "Child may need encouragement to persist",
        "Child might need help with frustration"
      ],
      extensions: [
        "Increase difficulty by adding time constraints",
        "Use different materials for sensory variation",
        "Have the child teach the activity to a sibling or friend"
      ]
    },
    '3-4': {
      setupSteps: [
        "Prepare for more complex activities",
        "Include materials for self-correction",
        "Create opportunities for choice",
        "Prepare for longer engagement"
      ],
      demonstrationSteps: [
        "Use clear, sequential instructions",
        "Allow for independent exploration",
        "Model problem-solving strategies",
        "Encourage self-correction"
      ],
      observationPoints: [
        "Watch for developing concentration",
        "Notice emerging independence",
        "Observe problem-solving approaches",
        "Pay attention to language development"
      ],
      successIndicators: [
        "Child can follow simple sequences",
        "Child shows increasing concentration",
        "Child demonstrates problem-solving skills",
        "Child shows pride in accomplishments"
      ],
      commonChallenges: [
        "Child may need help with complex tasks",
        "Child might need reminders about sequence",
        "Child may need encouragement to persist",
        "Child might need help with frustration"
      ],
      extensions: [
        "Increase difficulty by adding time constraints",
        "Use different materials for sensory variation",
        "Have the child teach the activity to a sibling or friend"
      ]
    },
    '4-5': {
      setupSteps: [
        "Prepare for more complex activities",
        "Include materials for self-correction",
        "Create opportunities for choice",
        "Prepare for longer engagement"
      ],
      demonstrationSteps: [
        "Use clear, sequential instructions",
        "Allow for independent exploration",
        "Model problem-solving strategies",
        "Encourage self-correction"
      ],
      observationPoints: [
        "Watch for developing concentration",
        "Notice emerging independence",
        "Observe problem-solving approaches",
        "Pay attention to language development"
      ],
      successIndicators: [
        "Child can follow simple sequences",
        "Child shows increasing concentration",
        "Child demonstrates problem-solving skills",
        "Child shows pride in accomplishments"
      ],
      commonChallenges: [
        "Child may need help with complex tasks",
        "Child might need reminders about sequence",
        "Child may need encouragement to persist",
        "Child might need help with frustration"
      ],
      extensions: [
        "Increase difficulty by adding time constraints",
        "Use different materials for sensory variation",
        "Have the child teach the activity to a sibling or friend"
      ]
    },
    '5-6': {
      setupSteps: [
        "Prepare for complex, multi-step activities",
        "Include materials for advanced exploration",
        "Create opportunities for independent work",
        "Prepare for extended concentration"
      ],
      demonstrationSteps: [
        "Use clear, sequential instructions",
        "Allow for independent exploration",
        "Model problem-solving strategies",
        "Encourage self-correction"
      ],
      observationPoints: [
        "Watch for developing concentration",
        "Notice emerging independence",
        "Observe problem-solving approaches",
        "Pay attention to language development"
      ],
      successIndicators: [
        "Child can follow simple sequences",
        "Child shows increasing concentration",
        "Child demonstrates problem-solving skills",
        "Child shows pride in accomplishments"
      ],
      commonChallenges: [
        "Child may need help with complex tasks",
        "Child might need reminders about sequence",
        "Child may need encouragement to persist",
        "Child might need help with frustration"
      ],
      extensions: [
        "Increase difficulty by adding time constraints",
        "Use different materials for sensory variation",
        "Have the child teach the activity to a sibling or friend"
      ]
    }
  };

  // Create activity-specific guidance
  const activitySpecificGuidance = {
    setupSteps: [
      // Start with activity-specific setup
      `Gather the following materials: ${activity.materialsNeeded?.join(', ') || 'as listed in the activity'}`,
      `Find a suitable space for ${activity.title.toLowerCase()}`,
      // Add area-specific setup steps
      ...areaSpecificGuidance.setupSteps
    ],
    demonstrationSteps: [
      // Start with activity-specific demonstration
      `Introduce ${activity.title.toLowerCase()} to the child`,
      `Explain that we will be ${activity.description?.toLowerCase() || 'working on this activity'}`,
      // Add area-specific demonstration steps
      ...areaSpecificGuidance.demonstrationSteps
    ],
    observationPoints: [
      // Start with activity-specific observations
      `Watch how the child approaches ${activity.title.toLowerCase()}`,
      `Notice their interest in ${activity.description?.toLowerCase() || 'the activity'}`,
      // Add area-specific observation points
      ...areaSpecificGuidance.observationPoints
    ],
    successIndicators: [
      // Start with activity-specific success indicators
      `Child shows understanding of ${activity.title.toLowerCase()}`,
      `Child can complete ${activity.title.toLowerCase()} independently`,
      // Add area-specific success indicators
      ...areaSpecificGuidance.successIndicators
    ],
    commonChallenges: [
      // Start with activity-specific challenges
      `Child may need help understanding ${activity.title.toLowerCase()}`,
      `Child might need guidance with ${activity.description?.toLowerCase() || 'the activity'}`,
      // Add area-specific common challenges
      ...areaSpecificGuidance.commonChallenges
    ],
    extensions: [
      // Start with activity-specific extensions
      `Try ${activity.title.toLowerCase()} with different materials`,
      `Increase the complexity of ${activity.title.toLowerCase()}`,
      `Have the child create their own variation of ${activity.title.toLowerCase()}`,
      // Add area-specific extensions
      ...areaSpecificGuidance.extensions
    ]
  };

  // Apply age-specific adjustments
  activity.ageRanges?.forEach(ageRange => {
    const ageAdjustments = ageSpecificAdjustments[ageRange];
    if (ageAdjustments) {
      // Add age-specific steps to the beginning of each list
      activitySpecificGuidance.setupSteps = [
        ...ageAdjustments.setupSteps,
        ...activitySpecificGuidance.setupSteps
      ];
      activitySpecificGuidance.demonstrationSteps = [
        ...ageAdjustments.demonstrationSteps,
        ...activitySpecificGuidance.demonstrationSteps
      ];
      activitySpecificGuidance.observationPoints = [
        ...ageAdjustments.observationPoints,
        ...activitySpecificGuidance.observationPoints
      ];
      activitySpecificGuidance.successIndicators = [
        ...ageAdjustments.successIndicators,
        ...activitySpecificGuidance.successIndicators
      ];
      activitySpecificGuidance.commonChallenges = [
        ...ageAdjustments.commonChallenges,
        ...activitySpecificGuidance.commonChallenges
      ];
      activitySpecificGuidance.extensions = [
        ...ageAdjustments.extensions,
        ...activitySpecificGuidance.extensions
      ];
    }
  });

  // Customize guidance based on activity difficulty
  if (activity.difficulty === 'beginner') {
    activitySpecificGuidance.setupSteps.unshift("Choose a time when the child is well-rested and alert");
    activitySpecificGuidance.demonstrationSteps.unshift(`Start with a simple introduction to ${activity.title.toLowerCase()}`);
    activitySpecificGuidance.commonChallenges.push("Child may need more frequent breaks");
    activitySpecificGuidance.extensions.push(`Start with simpler variations of ${activity.title.toLowerCase()}`);
  } else if (activity.difficulty === 'advanced') {
    activitySpecificGuidance.setupSteps.unshift("Ensure the child has mastered prerequisite skills");
    activitySpecificGuidance.demonstrationSteps.unshift(`Review prerequisite skills for ${activity.title.toLowerCase()}`);
    activitySpecificGuidance.commonChallenges.push("Child may need help with complex sequencing");
    activitySpecificGuidance.extensions.push(`Create more complex variations of ${activity.title.toLowerCase()}`);
  }

  return activitySpecificGuidance;
};

async function updateActivitiesWithParentGuidance() {
  console.log('Starting to update activities with parent guidance fields...');
  
  try {
    // Get all activities
    const activitiesRef = db.collection('activities');
    const snapshot = await activitiesRef.get();
    
    if (snapshot.empty) {
      console.log('No activities found in the database');
      return;
    }
    
    console.log(`Found ${snapshot.size} activities to update`);
    let updatedCount = 0;
    let missingDataCount = 0;
    
    for (const doc of snapshot.docs) {
      try {
        const activity = doc.data();
        
        // Validate required fields
        const missingFields = [];
        if (!activity.area) missingFields.push('area');
        if (!activity.ageRanges || activity.ageRanges.length === 0) missingFields.push('ageRanges');
        if (!activity.difficulty) missingFields.push('difficulty');
        
        if (missingFields.length > 0) {
          console.log(`⚠️ Activity "${activity.title}" is missing fields: ${missingFields.join(', ')}`);
          missingDataCount++;
        }
        
        // Get parent guidance fields based on activity type
        const parentGuidance = getParentGuidanceFields(activity);
        
        // Validate all guidance fields are present
        const missingGuidance = [];
        if (!parentGuidance.setupSteps || parentGuidance.setupSteps.length === 0) missingGuidance.push('setupSteps');
        if (!parentGuidance.demonstrationSteps || parentGuidance.demonstrationSteps.length === 0) missingGuidance.push('demonstrationSteps');
        if (!parentGuidance.observationPoints || parentGuidance.observationPoints.length === 0) missingGuidance.push('observationPoints');
        if (!parentGuidance.successIndicators || parentGuidance.successIndicators.length === 0) missingGuidance.push('successIndicators');
        if (!parentGuidance.commonChallenges || parentGuidance.commonChallenges.length === 0) missingGuidance.push('commonChallenges');
        
        if (missingGuidance.length > 0) {
          console.log(`⚠️ Activity "${activity.title}" has missing guidance fields: ${missingGuidance.join(', ')}`);
          missingDataCount++;
        }
        
        // Update the activity with new fields
        await doc.ref.update({
          ...parentGuidance,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        console.log(`✓ Updated activity: ${activity.title}`);
        updatedCount++;
      } catch (error) {
        console.error(`✗ Failed to update activity ${doc.id}:`, error);
      }
    }
    
    console.log('\nUpdate complete!');
    console.log(`Successfully updated: ${updatedCount} activities`);
    if (missingDataCount > 0) {
      console.log(`⚠️ Found ${missingDataCount} activities with missing data`);
      console.log('Please check the logs above for details on missing fields');
    }
    
  } catch (error) {
    console.error('Update failed:', error);
    throw error;
  }
}

// Run the update if this script is called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  updateActivitiesWithParentGuidance()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

export { updateActivitiesWithParentGuidance }; 