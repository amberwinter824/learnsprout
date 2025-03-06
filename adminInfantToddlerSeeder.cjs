// adminInfantToddlerSeeder.cjs

const admin = require('firebase-admin');
const serviceAccount = require('./config/service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});


const db = admin.firestore();

/**
 * Infant and Toddler Developmental Skills (0-3 years)
 */
const infantToddlerSkills = [
  // INFANT SKILLS (0-1 YEARS)
  {
    id: "inf-visual-tracking",
    name: "Visual Tracking",
    description: "Ability to follow moving objects with the eyes",
    area: "sensorial",
    ageRanges: ["0-1"],
    prerequisites: []
  },
  {
    id: "inf-sensory-exploration",
    name: "Sensory Exploration",
    description: "Using senses to explore and understand objects",
    area: "sensorial",
    ageRanges: ["0-1", "1-2"],
    prerequisites: []
  },
  {
    id: "inf-object-permanence",
    name: "Object Permanence",
    description: "Understanding that objects continue to exist even when they cannot be seen",
    area: "cognitive",
    ageRanges: ["0-1", "1-2"],
    prerequisites: []
  },
  {
    id: "inf-cause-effect",
    name: "Cause and Effect",
    description: "Recognition that actions produce predictable results",
    area: "cognitive",
    ageRanges: ["0-1", "1-2"],
    prerequisites: []
  },
  {
    id: "inf-grasp-release",
    name: "Grasping and Releasing",
    description: "Ability to hold and intentionally release objects",
    area: "motor",
    ageRanges: ["0-1", "1-2"],
    prerequisites: []
  },
  {
    id: "inf-head-control",
    name: "Head Control",
    description: "Development of neck muscles to hold head upright and steady",
    area: "motor",
    ageRanges: ["0-1"],
    prerequisites: []
  },
  {
    id: "inf-reaching",
    name: "Reaching for Objects",
    description: "Intentionally moving arms to grasp desired objects",
    area: "motor",
    ageRanges: ["0-1"],
    prerequisites: []
  },
  {
    id: "inf-social-engagement",
    name: "Social Engagement",
    description: "Responding to and initiating social interactions",
    area: "language",
    ageRanges: ["0-1", "1-2"],
    prerequisites: []
  },
  
  // YOUNG TODDLER SKILLS (1-2 YEARS)
  {
    id: "tod-pincer-grasp",
    name: "Pincer Grasp",
    description: "Using thumb and forefinger to pick up small objects",
    area: "motor",
    ageRanges: ["1-2", "2-3"],
    prerequisites: ["inf-grasp-release"]
  },
  {
    id: "tod-hand-eye",
    name: "Hand-Eye Coordination",
    description: "Coordinating visual information with hand movements",
    area: "motor",
    ageRanges: ["1-2", "2-3", "3-4"],
    prerequisites: ["inf-grasp-release"]
  },
  {
    id: "tod-shape-recognition",
    name: "Shape Recognition",
    description: "Ability to recognize and match basic shapes",
    area: "cognitive",
    ageRanges: ["1-2", "2-3"],
    prerequisites: []
  },
  {
    id: "tod-spatial",
    name: "Spatial Relationships",
    description: "Understanding how objects fit together and relate to one another",
    area: "cognitive",
    ageRanges: ["1-2", "2-3", "3-4"],
    prerequisites: []
  },
  {
    id: "tod-size-discrimination",
    name: "Size Discrimination",
    description: "Ability to recognize differences in size",
    area: "sensorial",
    ageRanges: ["1-2", "2-3", "3-4"],
    prerequisites: []
  },
  {
    id: "tod-imitation",
    name: "Imitation",
    description: "Copying actions and sounds observed in others",
    area: "language",
    ageRanges: ["1-2", "2-3"],
    prerequisites: []
  },
  {
    id: "tod-vocabulary",
    name: "Early Vocabulary",
    description: "Understanding and using simple words",
    area: "language",
    ageRanges: ["1-2", "2-3"],
    prerequisites: []
  },
  {
    id: "tod-object-function",
    name: "Object Function",
    description: "Understanding the proper use of common objects",
    area: "practical_life",
    ageRanges: ["1-2", "2-3"],
    prerequisites: ["inf-cause-effect"]
  },
  
  // OLDER TODDLER SKILLS (2-3 YEARS)
  {
    id: "tod-sequencing",
    name: "Simple Sequencing",
    description: "Arranging objects in a logical order",
    area: "cognitive",
    ageRanges: ["2-3", "3-4"],
    prerequisites: ["tod-size-discrimination"]
  },
  {
    id: "tod-basic-pouring",
    name: "Beginning Pouring",
    description: "Initial skills in pouring liquids and solids between containers",
    area: "practical_life",
    ageRanges: ["2-3", "3-4"],
    prerequisites: ["inf-grasp-release", "tod-hand-eye"]
  },
  {
    id: "tod-visual-discrimination",
    name: "Visual Discrimination",
    description: "Ability to identify similarities and differences between objects",
    area: "sensorial",
    ageRanges: ["2-3", "3-4"],
    prerequisites: []
  },
  {
    id: "tod-concentration",
    name: "Concentration",
    description: "Ability to focus attention on a task",
    area: "practical_life",
    ageRanges: ["1-2", "2-3", "3-4", "4-5"],
    prerequisites: []
  },
  {
    id: "tod-independence",
    name: "Self-Help Skills",
    description: "Beginning skills in dressing, feeding, and self-care",
    area: "practical_life",
    ageRanges: ["2-3", "3-4"],
    prerequisites: ["tod-hand-eye"]
  },
  {
    id: "tod-gross-motor",
    name: "Gross Motor Coordination",
    description: "Control and coordination of large body movements",
    area: "motor",
    ageRanges: ["2-3", "3-4"],
    prerequisites: []
  },
  {
    id: "tod-sensory-awareness",
    name: "Sensory Awareness",
    description: "Discriminating between different sensory experiences",
    area: "sensorial",
    ageRanges: ["2-3", "3-4"],
    prerequisites: ["inf-sensory-exploration"]
  },
  {
    id: "tod-sorting",
    name: "Basic Sorting",
    description: "Grouping objects based on common characteristics",
    area: "cognitive",
    ageRanges: ["2-3", "3-4"],
    prerequisites: ["tod-visual-discrimination"]
  }
];

/**
 * Infant and Toddler Activities (0-3 years)
 */
const infantToddlerActivities = [
  // INFANT ACTIVITIES (0-1 YEARS)
  {
    title: "Visual Tracking Mobile",
    description: "A high-contrast mobile for developing visual tracking skills",
    instructions: "Hang the mobile about 8-12 inches above where the baby lies. Allow them to observe and track the movement. For older infants, gently move the mobile side to side to encourage tracking.",
    ageRanges: ["0-1"],
    area: "sensorial",
    materialsNeeded: ["High-contrast mobile (black and white patterns)", "Secure hanging attachment"],
    duration: 10,
    difficulty: "beginner",
    skillsAddressed: ["inf-visual-tracking", "inf-head-control"],
    status: "active",
    imageUrl: ""
  },
  {
    title: "Object Permanence Box",
    description: "Simple box with a ball that disappears and reappears",
    instructions: "Place the ball in the hole and let it drop through. Show baby how the ball appears in the tray. For older infants, encourage them to retrieve the ball. This helps develop understanding that objects continue to exist even when out of sight.",
    ageRanges: ["0-1", "1-2"],
    area: "cognitive",
    materialsNeeded: ["Object permanence box or container with a hole in top", "Small ball"],
    duration: 10,
    difficulty: "beginner",
    skillsAddressed: ["inf-object-permanence", "inf-cause-effect", "inf-reaching"],
    status: "active",
    imageUrl: ""
  },
  {
    title: "Treasure Basket Exploration",
    description: "Collection of different textured items for tactile exploration",
    instructions: "Place baby in a comfortable seated position with the basket within reach. Include items with different textures, weights, temperatures, and sounds. Allow exploration through touch, mouthing (if safe), and manipulation. Stay nearby but avoid directing play.",
    ageRanges: ["0-1", "1-2"],
    area: "sensorial",
    materialsNeeded: ["Shallow basket", "Various safe household items of different textures (wooden spoon, metal whisk, fabric scraps, etc.)"],
    duration: 15,
    difficulty: "beginner",
    skillsAddressed: ["inf-sensory-exploration", "inf-grasp-release", "inf-reaching"],
    status: "active",
    imageUrl: ""
  },
  {
    title: "Mirror Play",
    description: "Exploring self-image in a mirror",
    instructions: "Place a non-breakable mirror where the baby can see themselves. For younger infants, hold them so they can see their reflection. For older infants, place the mirror securely at their level during tummy time or sitting. Talk about what they see.",
    ageRanges: ["0-1", "1-2"],
    area: "sensorial",
    materialsNeeded: ["Unbreakable mirror", "Secure stand or wall mounting"],
    duration: 10,
    difficulty: "beginner",
    skillsAddressed: ["inf-visual-tracking", "inf-social-engagement"],
    status: "active",
    imageUrl: ""
  },
  {
    title: "Silky Scarves Play",
    description: "Exploring lightweight scarves for sensory stimulation",
    instructions: "Offer baby lightweight, colorful scarves to hold, wave, and explore. For younger infants, wave scarves gently above them to track. For older infants, demonstrate hiding a toy under a scarf and finding it to reinforce object permanence.",
    ageRanges: ["0-1"],
    area: "sensorial",
    materialsNeeded: ["Several lightweight, colorful scarves of different textures"],
    duration: 10,
    difficulty: "beginner",
    skillsAddressed: ["inf-sensory-exploration", "inf-grasp-release", "inf-visual-tracking"],
    status: "active",
    imageUrl: ""
  },
  {
    title: "Rattle and Bell Exploration",
    description: "Exploring sound-making objects to understand cause and effect",
    instructions: "Offer one sound-making object at a time. Demonstrate how it makes sound, then allow the baby to explore. For younger infants, you might hold and use the rattle near them. For older infants, encourage self-exploration and imitation.",
    ageRanges: ["0-1", "1-2"],
    area: "sensorial",
    materialsNeeded: ["Various baby-safe rattles and bells with different sounds"],
    duration: 10,
    difficulty: "beginner",
    skillsAddressed: ["inf-cause-effect", "inf-grasp-release", "inf-sensory-exploration"],
    status: "active",
    imageUrl: ""
  },
  
  // YOUNG TODDLER ACTIVITIES (1-2 YEARS)
  {
    title: "Simple Puzzles with Knobs",
    description: "Single-piece puzzles with large knob handles",
    instructions: "Present the puzzle with just a few pieces removed. Show the toddler how to remove a puzzle piece using the knob, then place it back in its spot. Allow independent exploration and practice. For beginners, start with 1-2 pieces only.",
    ageRanges: ["1-2", "2-3"],
    area: "cognitive",
    materialsNeeded: ["Simple knobbed puzzles with 1-3 large pieces", "Small tray"],
    duration: 15,
    difficulty: "beginner",
    skillsAddressed: ["tod-pincer-grasp", "tod-hand-eye", "tod-shape-recognition"],
    status: "active",
    imageUrl: ""
  },
  {
    title: "Ball Drop Tube",
    description: "Dropping balls through a tube to see them emerge at the bottom",
    instructions: "Set up the tube securely at an angle. Demonstrate dropping a ball into the top opening and watching it roll out the bottom. Encourage the toddler to try, emphasizing the cause-effect relationship. For older toddlers, invite prediction about where the ball will exit.",
    ageRanges: ["1-2", "2-3"],
    area: "cognitive",
    materialsNeeded: ["Clear tube or paper towel roll", "Small balls that fit inside tube", "Blocks to prop tube at an angle"],
    duration: 15,
    difficulty: "beginner",
    skillsAddressed: ["inf-cause-effect", "tod-hand-eye", "inf-object-permanence"],
    status: "active",
    imageUrl: ""
  },
  {
    title: "Posting Activities",
    description: "Putting objects into containers through matching openings",
    instructions: "Demonstrate putting objects through their corresponding openings (coins in a slot, shapes in a sorter). Start with just 1-2 shapes for beginners. Allow the toddler to explore and practice this skill independently, adding more shapes as mastery develops.",
    ageRanges: ["1-2", "2-3"],
    area: "cognitive",
    materialsNeeded: ["Shape sorter or posting box", "Coin slot box", "Objects that fit through openings"],
    duration: 15,
    difficulty: "beginner",
    skillsAddressed: ["tod-shape-recognition", "tod-spatial", "tod-hand-eye"],
    status: "active",
    imageUrl: ""
  },
  {
    title: "Stacking Rings",
    description: "Placing rings on a vertical post in sequence",
    instructions: "Show how to remove the rings and then place them back on the post. For beginners, start with just a few rings. For more advanced toddlers, encourage stacking in size order. Name the colors and sizes as you work.",
    ageRanges: ["1-2", "2-3"],
    area: "cognitive",
    materialsNeeded: ["Stacking rings toy"],
    duration: 15,
    difficulty: "beginner",
    skillsAddressed: ["tod-size-discrimination", "tod-sequencing", "tod-hand-eye"],
    status: "active",
    imageUrl: ""
  },
  {
    title: "First Words Picture Books",
    description: "Looking at and naming pictures in simple books",
    instructions: "Sit with the toddler and look through the book together. Point to pictures and clearly name them. Encourage the toddler to point to named objects. For older toddlers, ask simple questions about the pictures and encourage imitation of simple words.",
    ageRanges: ["1-2", "2-3"],
    area: "language",
    materialsNeeded: ["Sturdy picture books with clear, simple images"],
    duration: 10,
    difficulty: "beginner",
    skillsAddressed: ["tod-vocabulary", "inf-social-engagement", "tod-visual-discrimination"],
    status: "active",
    imageUrl: ""
  },
  {
    title: "Object Basket Matching",
    description: "Matching miniature objects to pictures",
    instructions: "Place picture cards in a row and corresponding objects in a basket. Show the toddler how to select an object, identify what it is, and place it on the matching picture. Start with just 3-4 familiar objects for beginners.",
    ageRanges: ["1-2", "2-3"],
    area: "cognitive",
    materialsNeeded: ["Small basket", "Miniature objects (toy animals, vehicles, household items)", "Corresponding picture cards"],
    duration: 15,
    difficulty: "intermediate",
    skillsAddressed: ["tod-visual-discrimination", "tod-vocabulary", "tod-object-function"],
    status: "active",
    imageUrl: ""
  },
  
  // OLDER TODDLER ACTIVITIES (2-3 YEARS)
  {
    title: "Water Pouring with Small Containers",
    description: "Beginning pouring activities with small pitchers",
    instructions: "Set up two small pitchers on a tray, one filled with a small amount of water. Demonstrate slowly pouring from one pitcher to the other. Show how to clean up spills with the sponge. Allow the child to practice, increasing water amount as skill develops.",
    ageRanges: ["2-3", "3-4"],
    area: "practical_life",
    materialsNeeded: ["Two small pitchers", "Small amount of water", "Tray", "Sponge for spills", "Small towel"],
    duration: 15,
    difficulty: "beginner",
    skillsAddressed: ["tod-basic-pouring", "tod-hand-eye", "tod-concentration"],
    status: "active",
    imageUrl: ""
  },
  {
    title: "Simple Matching Activities",
    description: "Matching identical objects or pictures",
    instructions: "Present pairs of identical objects or pictures. Demonstrate matching one set, then allow the child to complete the matching independently. For beginners, use 3-4 pairs; increase as skills develop. Use familiar, everyday objects.",
    ageRanges: ["2-3", "3-4"],
    area: "cognitive",
    materialsNeeded: ["Pairs of identical objects or picture cards", "Small tray or mat"],
    duration: 15,
    difficulty: "beginner",
    skillsAddressed: ["tod-visual-discrimination", "tod-concentration", "tod-sorting"],
    status: "active",
    imageUrl: ""
  },
  {
    title: "Dry Pouring with Beans",
    description: "Transferring beans between containers",
    instructions: "Place a small amount of beans in one container. Demonstrate slowly pouring the beans into the empty container. Allow the child to practice this transfer activity. Show how to sweep up spilled beans with the small brush and dustpan.",
    ageRanges: ["2-3", "3-4"],
    area: "practical_life",
    materialsNeeded: ["Two small containers", "Dry beans", "Tray", "Small brush and dustpan for spills"],
    duration: 15,
    difficulty: "beginner",
    skillsAddressed: ["tod-basic-pouring", "tod-hand-eye", "tod-concentration"],
    status: "active",
    imageUrl: ""
  },
  {
    title: "Sorting by Color",
    description: "Sorting objects into groups by color",
    instructions: "Set up colored bowls or sorting trays. Demonstrate selecting an object, identifying its color, and placing it in the matching color bowl. Start with just 2-3 primary colors for beginners. Gradually add more colors as the skill develops.",
    ageRanges: ["2-3", "3-4"],
    area: "sensorial",
    materialsNeeded: ["Small bowls or trays in different colors", "Various objects in matching colors", "Small basket for mixed objects"],
    duration: 15,
    difficulty: "beginner",
    skillsAddressed: ["tod-sorting", "tod-visual-discrimination", "tod-concentration"],
    status: "active",
    imageUrl: ""
  },
  {
    title: "Dressing Frames - Velcro",
    description: "Practicing opening and closing Velcro fasteners",
    instructions: "Present the Velcro dressing frame. Demonstrate slowly how to open and close the Velcro strips. Encourage the child to practice this skill independently. This is the simplest dressing frame and prepares for more complex fasteners.",
    ageRanges: ["2-3", "3-4"],
    area: "practical_life",
    materialsNeeded: ["Velcro dressing frame (or fabric pieces with Velcro attached)"],
    duration: 15,
    difficulty: "beginner",
    skillsAddressed: ["tod-independence", "tod-hand-eye", "tod-pincer-grasp"],
    status: "active",
    imageUrl: ""
  },
  {
    title: "Sensory Bins",
    description: "Exploration of different textures and materials",
    instructions: "Fill the shallow bin with the base material (rice, beans, etc.). Add tools and objects for exploration. Show the child how to explore using hands and tools while keeping the material in the bin. Supervise closely with smaller materials.",
    ageRanges: ["2-3", "3-4"],
    area: "sensorial",
    materialsNeeded: ["Shallow bin", "Base material (rice, beans, water beads, etc.)", "Scoops, containers, funnels", "Interesting objects to find and explore"],
    duration: 20,
    difficulty: "beginner",
    skillsAddressed: ["tod-sensory-awareness", "inf-sensory-exploration", "tod-hand-eye"],
    status: "active",
    imageUrl: ""
  },
  {
    title: "Toddler Art Experiences",
    description: "First experiences with crayons, paint, and clay",
    instructions: "Prepare the art station with paper and one material at a time. Demonstrate basic use, then allow free exploration. Focus on the sensory experience rather than creating a product. Supervise closely and accept all forms of creative expression.",
    ageRanges: ["2-3", "3-4"],
    area: "practical_life",
    materialsNeeded: ["Large paper", "Chunky crayons, finger paint, or play clay", "Art smock or old shirt", "Cleaning materials"],
    duration: 15,
    difficulty: "beginner",
    skillsAddressed: ["tod-hand-eye", "tod-pincer-grasp", "tod-sensory-awareness"],
    status: "active",
    imageUrl: ""
  }
];

/**
 * Helper function to generate a unique ID for activities
 */
function generateActivityId(area, title) {
  // Extract area prefix
  const areaPrefix = area.substring(0, 3);
  
  // Age indication
  const agePrefix = title.toLowerCase().includes('infant') ? 'inf-' : 
                    title.toLowerCase().includes('toddler') ? 'tod-' : '';
  
  // Convert title to kebab case and remove special characters
  const baseId = title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 20);
    
  return `${agePrefix}${areaPrefix}-${baseId}`;
}

/**
 * Seed the infant and toddler developmental skills
 */
async function seedInfantToddlerSkills() {
  console.log('Starting to seed infant and toddler developmental skills...');
  
  try {
    // Get existing skills to avoid duplicates
    const skillsCollection = db.collection('developmentalSkills');
    const snapshot = await skillsCollection.get();
    
    // Map to store existing skill IDs
    const existingSkillIds = new Set();
    
    if (!snapshot.empty) {
      snapshot.docs.forEach(doc => {
        existingSkillIds.add(doc.id);
      });
      console.log(`Found ${existingSkillIds.size} existing skills. Adding new infant-toddler skills...`);
    }
    
    // Add only new skills
    let addedCount = 0;
    for (const skill of infantToddlerSkills) {
      if (!existingSkillIds.has(skill.id)) {
        await db.collection('developmentalSkills').doc(skill.id).set({
          ...skill,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        console.log(`Added new skill: ${skill.name} (${skill.id})`);
        addedCount++;
      }
    }
    
    console.log(`Added ${addedCount} new infant and toddler skills.`);
    return true;
  } catch (error) {
    console.error('Error seeding infant and toddler skills:', error);
    return false;
  }
}

/**
 * Seed the infant and toddler activities
 */
async function seedInfantToddlerActivities() {
  console.log('Starting to seed infant and toddler activities...');
  
  try {
    // Get existing activities to avoid duplicates
    const activitiesCollection = db.collection('activities');
    const snapshot = await activitiesCollection.get();
    
    // Map to store existing activity titles
    const existingTitles = new Set();
    
    if (!snapshot.empty) {
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        existingTitles.add(data.title);
      });
      console.log(`Found ${existingTitles.size} existing activities. Adding new infant-toddler activities...`);
    }
    
    // Add only new activities
    let addedCount = 0;
    for (const activity of infantToddlerActivities) {
      if (!existingTitles.has(activity.title)) {
        const activityId = generateActivityId(activity.area, activity.title);
        
        await db.collection('activities').doc(activityId).set({
          ...activity,
          prerequisites: [],
          nextSteps: [],
          relatedActivities: [],
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        console.log(`Added new activity: ${activity.title} (${activityId})`);
        addedCount++;
      }
    }
    
    console.log(`Added ${addedCount} new infant and toddler activities.`);
    return true;
  } catch (error) {
    console.error('Error seeding infant and toddler activities:', error);
    return false;
  }
}

/**
 * Process to seed both infant-toddler skills and activities
 */
async function seedInfantToddlerData() {
  try {
    console.log("Service account check:");
    try {
      // Log basic information about the service account to confirm it's loaded
      console.log(`Project ID: ${serviceAccount.project_id}`);
      console.log(`Client Email: ${serviceAccount.client_email}`);
      console.log(`Service account loaded successfully`);
    } catch (error) {
      console.error("Error accessing service account:", error);
      console.error("Make sure config/service-account.json exists and is properly formatted");
      return false;
    }
    
    console.log("Step 1: Seeding infant and toddler developmental skills");
    const skillsResult = await seedInfantToddlerSkills();
    
    if (!skillsResult) {
      throw new Error("Failed to seed infant and toddler skills");
    }
    
    console.log("Step 2: Seeding infant and toddler activities");
    const activitiesResult = await seedInfantToddlerActivities();
    
    if (!activitiesResult) {
      throw new Error("Failed to seed infant and toddler activities");
    }
    
    console.log("All infant and toddler data seeded successfully!");
    return true;
  } catch (error) {
    console.error("Error in seeding process:", error);
    return false;
  }
}

// Execute the seeding function if this script is run directly
if (require.main === module) {
  seedInfantToddlerData().then((result) => {
    if (result) {
      console.log('Infant and toddler seeding process finished successfully!');
      process.exit(0);
    } else {
      console.error('Seeding process failed. Check logs above for details.');
      process.exit(1);
    }
  }).catch(error => {
    console.error('Fatal error during seeding process:', error);
    process.exit(1);
  });
}

// Export for use in other scripts
module.exports = {
  seedInfantToddlerData,
  infantToddlerSkills,
  infantToddlerActivities
};