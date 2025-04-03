require('dotenv').config({ path: '.env.local' });

const admin = require('firebase-admin');

// Initialize Firebase Admin with environment variables
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, '\n')
  })
});

const db = admin.firestore();

/**
 * Social Emotional Activities for all age groups (0-6 years)
 */
const socialEmotionalActivities = [
  // INFANT ACTIVITIES (0-1 YEARS)
  {
    title: "Mirror Play with Emotions",
    description: "Using a mirror to help infants recognize facial expressions and emotions",
    instructions: "Sit with the infant in front of a mirror. Make different facial expressions (happy, surprised) and name the emotions. Point to your face and the baby's reflection. Observe their reactions and mirror their expressions back to them.",
    ageRanges: ["0-1"],
    area: "social_emotional",
    materialsNeeded: ["Unbreakable mirror", "Comfortable seating area"],
    duration: 10,
    difficulty: "beginner",
    environmentType: "home",
    classroomExtension: true,
    homeReinforcement: true,
    skillsAddressed: ["soc-self-awareness"],
    status: "active"
  },
  {
    title: "Peek-a-Boo Social Game",
    description: "Interactive game to develop object permanence and social engagement",
    instructions: "Start with traditional peek-a-boo using your hands. Progress to using a light scarf or cloth. Name emotions as you play ('I see you! You're happy!'). Observe the baby's reactions and pause when they show signs of overstimulation.",
    ageRanges: ["0-1"],
    area: "social_emotional",
    materialsNeeded: ["Light scarf or cloth (optional)"],
    duration: 5,
    difficulty: "beginner",
    environmentType: "bridge",
    classroomExtension: true,
    homeReinforcement: true,
    skillsAddressed: ["soc-self-awareness", "soc-relationships"],
    status: "active"
  },

  // YOUNG TODDLER ACTIVITIES (1-2 YEARS)
  {
    title: "Emotion Songs and Gestures",
    description: "Simple songs with gestures to express different emotions",
    instructions: "Use simple songs that incorporate emotions and gestures (e.g., 'If You're Happy and You Know It'). Add verses for different emotions. Demonstrate the gestures and encourage toddlers to join in. Name the emotions as they're expressed.",
    ageRanges: ["1-2"],
    area: "social_emotional",
    materialsNeeded: ["Optional: emotion pictures or cards"],
    duration: 10,
    difficulty: "beginner",
    environmentType: "bridge",
    classroomExtension: true,
    homeReinforcement: true,
    skillsAddressed: ["soc-self-awareness", "soc-emotion-reg"],
    status: "active"
  },
  {
    title: "Taking Turns with a Ball",
    description: "Simple turn-taking activity with a ball",
    instructions: "Sit facing the toddler. Roll a ball back and forth, saying 'my turn' and 'your turn'. Use simple phrases to encourage sharing and waiting. Celebrate successful exchanges with positive reinforcement.",
    ageRanges: ["1-2", "2-3"],
    area: "social_emotional",
    materialsNeeded: ["Soft ball", "Clear space for rolling"],
    duration: 10,
    difficulty: "beginner",
    environmentType: "bridge",
    classroomExtension: true,
    homeReinforcement: true,
    skillsAddressed: ["soc-relationships", "soc-cooperation"],
    status: "active"
  },

  // OLDER TODDLER ACTIVITIES (2-3 YEARS)
  {
    title: "Emotion Face Matching",
    description: "Matching game with emotion face cards",
    instructions: "Present pairs of simple emotion face cards (happy, sad, angry, surprised). Demonstrate matching identical emotions. Name the emotions as they're matched. For advanced toddlers, ask them to make the facial expression they see.",
    ageRanges: ["2-3"],
    area: "social_emotional",
    materialsNeeded: ["Emotion face cards (pairs)", "Small tray or mat"],
    duration: 15,
    difficulty: "beginner",
    environmentType: "bridge",
    classroomExtension: true,
    homeReinforcement: true,
    skillsAddressed: ["soc-self-awareness", "soc-empathy"],
    status: "active"
  },
  {
    title: "Simple Sharing Work",
    description: "Structured activity to practice sharing and turn-taking",
    instructions: "Set up an activity with two children and limited materials (e.g., one crayon and two papers). Guide them in taking turns and using phrases like 'May I have a turn?' Model positive sharing language and celebrate cooperative moments.",
    ageRanges: ["2-3"],
    area: "social_emotional",
    materialsNeeded: ["Limited materials for sharing (e.g., crayons, blocks)", "Timer (optional)"],
    duration: 15,
    difficulty: "intermediate",
    environmentType: "bridge",
    classroomExtension: true,
    homeReinforcement: true,
    skillsAddressed: ["soc-cooperation", "soc-relationships", "soc-boundaries"],
    status: "active"
  },

  // PRIMARY/CASA ACTIVITIES (3-6 YEARS)
  {
    title: "Emotion Cards Sorting Work",
    description: "Sorting and discussing emotion cards by intensity and type",
    instructions: "Present emotion cards showing various facial expressions and body language. Guide the child in sorting them by emotion type (happy, sad, etc.) and intensity (slightly happy to very happy). Discuss what might cause these feelings and appropriate responses.",
    ageRanges: ["3-4", "4-5"],
    area: "social_emotional",
    materialsNeeded: ["Emotion cards with varying intensities", "Sorting mat or tray", "Labels for emotions"],
    duration: 20,
    difficulty: "beginner",
    environmentType: "classroom",
    classroomExtension: true,
    homeReinforcement: true,
    skillsAddressed: ["soc-self-awareness", "soc-empathy", "soc-emotion-reg"],
    status: "active"
  },
  {
    title: "Peace Rose Protocol",
    description: "Using the peace rose to practice conflict resolution",
    instructions: "Introduce the peace rose as a tool for conflict resolution. Demonstrate how to pass it back and forth while taking turns speaking about feelings and needs. Practice with role-play scenarios before real conflicts arise.",
    ageRanges: ["3-4", "4-5", "5-6"],
    area: "social_emotional",
    materialsNeeded: ["Peace rose or similar object", "Comfortable peace corner setup"],
    duration: 15,
    difficulty: "intermediate",
    environmentType: "classroom",
    classroomExtension: true,
    homeReinforcement: true,
    skillsAddressed: ["soc-conflict", "soc-emotion-reg", "soc-empathy"],
    status: "active"
  },
  {
    title: "Feelings Journal",
    description: "Creating and maintaining a personal feelings journal",
    instructions: "Provide a special journal for recording daily feelings. Children can draw faces, use emotion stickers, or dictate their feelings. Include a morning check-in and afternoon reflection. Discuss strategies for handling different emotions.",
    ageRanges: ["4-5", "5-6"],
    area: "social_emotional",
    materialsNeeded: ["Journal", "Drawing materials", "Emotion stickers", "Writing tools"],
    duration: 15,
    difficulty: "intermediate",
    environmentType: "bridge",
    classroomExtension: true,
    homeReinforcement: true,
    skillsAddressed: ["soc-self-awareness", "soc-emotion-reg"],
    status: "active"
  },
  {
    title: "Community Helper Role Play",
    description: "Dramatic play focusing on community roles and relationships",
    instructions: "Set up scenarios for different community helper roles (doctor, teacher, etc.). Provide appropriate props and guide children in taking turns in different roles. Emphasize helpful phrases and respectful interactions.",
    ageRanges: ["3-4", "4-5", "5-6"],
    area: "social_emotional",
    materialsNeeded: ["Role-play props", "Community helper costumes or symbols"],
    duration: 30,
    difficulty: "intermediate",
    environmentType: "classroom",
    classroomExtension: true,
    homeReinforcement: true,
    skillsAddressed: ["soc-relationships", "soc-cooperation", "soc-empathy"],
    status: "active"
  },
  {
    title: "Grace and Courtesy: Personal Space",
    description: "Lessons in respecting personal space and boundaries",
    instructions: "Use hula hoops or rope circles to demonstrate personal space bubbles. Practice moving around the room while maintaining appropriate space. Role-play asking for space and respecting others' boundaries.",
    ageRanges: ["3-4", "4-5", "5-6"],
    area: "social_emotional",
    materialsNeeded: ["Hula hoops or rope circles", "Open space for movement"],
    duration: 20,
    difficulty: "beginner",
    environmentType: "bridge",
    classroomExtension: true,
    homeReinforcement: true,
    skillsAddressed: ["soc-boundaries", "soc-relationships"],
    status: "active"
  },
  {
    title: "Emotion Management Toolbox",
    description: "Creating and using personal emotion management tools",
    instructions: "Help each child create a personal toolbox with calming items (stress ball, glitter jar, breathing cards). Practice using different tools for different emotions. Include a quiet space where children can use their toolbox.",
    ageRanges: ["4-5", "5-6"],
    area: "social_emotional",
    materialsNeeded: ["Small boxes or containers", "Calming items (stress balls, pictures)", "Emotion cards"],
    duration: 25,
    difficulty: "advanced",
    environmentType: "bridge",
    classroomExtension: true,
    homeReinforcement: true,
    skillsAddressed: ["soc-emotion-reg", "soc-independence", "soc-self-awareness"],
    status: "active"
  },
  {
    title: "Friendship Garden Project",
    description: "Collaborative project to nurture plants and relationships",
    instructions: "Create a small garden where children work in pairs or small groups. Assign shared responsibilities and teach cooperative care for plants. Use the garden as a metaphor for growing friendships.",
    ageRanges: ["4-5", "5-6"],
    area: "social_emotional",
    materialsNeeded: ["Planting materials", "Simple plants or seeds", "Garden tools", "Care charts"],
    duration: 30,
    difficulty: "advanced",
    environmentType: "bridge",
    classroomExtension: true,
    homeReinforcement: true,
    skillsAddressed: ["soc-cooperation", "soc-relationships", "soc-independence"],
    status: "active"
  }
];

/**
 * Seed the social emotional activities
 */
async function seedSocialEmotionalActivities() {
  console.log('Starting to seed social emotional activities...');
  
  try {
    // Check if activities already exist
    const activitiesCollection = db.collection('activities');
    const snapshot = await activitiesCollection.where('area', '==', 'social_emotional').get();
    
    if (!snapshot.empty) {
      console.log(`Found ${snapshot.size} existing social emotional activities. Updating...`);
      
      // Update existing activities
      for (const activity of socialEmotionalActivities) {
        const existingActivity = snapshot.docs.find(doc => 
          doc.data().title === activity.title
        );
        
        if (existingActivity) {
          await activitiesCollection.doc(existingActivity.id).update({
            ...activity,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });
          console.log(`Updated activity: ${activity.title}`);
        } else {
          await activitiesCollection.add({
            ...activity,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });
          console.log(`Added new activity: ${activity.title}`);
        }
      }
    } else {
      console.log('No existing social emotional activities found. Adding all activities...');
      
      // Add all activities
      for (const activity of socialEmotionalActivities) {
        await activitiesCollection.add({
          ...activity,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log(`Added activity: ${activity.title}`);
      }
    }
    
    console.log('Social emotional activities seeding completed successfully!');
    return true;
  } catch (error) {
    console.error('Error seeding social emotional activities:', error);
    return false;
  }
}

// Export for use in other seeders
module.exports = {
  seedSocialEmotionalActivities,
  socialEmotionalActivities
};

// If running this script directly
if (require.main === module) {
  seedSocialEmotionalActivities().then(() => {
    console.log('Social emotional activities seeding process completed!');
    process.exit(0);
  }).catch(error => {
    console.error('Fatal error during seeding process:', error);
    process.exit(1);
  });
} 