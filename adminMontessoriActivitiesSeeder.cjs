// adminMontessoriActivitiesSeeder.cjs
const admin = require('firebase-admin');
const { seedDevelopmentalSkills, developmentalSkills } = require('./adminDevelopmentalSkillsSeeder.cjs');

// Service account is already initialized in the skills seeder
const db = admin.firestore();

/**
 * Helper function to generate a unique ID for activities
 * Format: area-descriptiveName
 */
function generateActivityId(area, title) {
  // Convert title to kebab case and remove special characters
  const baseId = title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 30);
    
  return `${area.substring(0, 3)}-${baseId}`;
}

/**
 * Comprehensive Montessori activities data organized by area with enhanced skill references
 */
const montessoriActivities = [
  // PRACTICAL LIFE ACTIVITIES
  {
    title: "Pouring Dry Ingredients",
    description: "Practice pouring dry materials (beans, rice) from one container to another",
    instructions: "Set up a tray with two small containers and a small container of dried beans or rice. Show the child how to hold the container with both hands and carefully pour the dry ingredients from one container to the other. Demonstrate how to clean up any spills with a small brush and dustpan.",
    ageRanges: ["3-4", "4-5"],
    area: "practical_life",
    materialsNeeded: ["Two small containers", "Dried beans or rice", "Small tray", "Small brush and dustpan"],
    duration: 15,
    difficulty: "beginner",
    skillsAddressed: ["prl-pouring", "prl-coordination"],
    imageUrl: "",
    prerequisites: []
  },
  {
    title: "Pouring Liquids",
    description: "Practice pouring water from a small pitcher into a cup",
    instructions: "Place a small pitcher partially filled with water, a small cup, and a sponge on a tray. Show the child how to grasp the pitcher handle and slowly pour water into the cup. Demonstrate how to wipe up any spills with the sponge.",
    ageRanges: ["3-4", "4-5"],
    area: "practical_life",
    materialsNeeded: ["Small pitcher", "Small cup", "Water", "Tray", "Sponge"],
    duration: 15,
    difficulty: "beginner",
    skillsAddressed: ["prl-pouring", "prl-coordination", "prl-cleaning"],
    imageUrl: "",
    prerequisites: []
  },
  {
    title: "Button Frame",
    description: "Practice buttoning and unbuttoning using a special frame",
    instructions: "Present the button frame to the child. Demonstrate slowly how to unbutton each button from top to bottom, and then button them again from bottom to top. Encourage the child to try, offering assistance only when needed.",
    ageRanges: ["3-4", "4-5"],
    area: "practical_life",
    materialsNeeded: ["Button frame (or fabric pieces with buttons attached)"],
    duration: 20,
    difficulty: "intermediate",
    skillsAddressed: ["prl-dressing", "prl-coordination"],
    imageUrl: "",
    prerequisites: []
  },
  {
    title: "Zipper Frame",
    description: "Practice zipping and unzipping using a special frame",
    instructions: "Present the zipper frame to the child. Demonstrate how to connect the zipper pieces and slowly pull the zipper up. Then demonstrate unzipping. Allow the child to practice while offering minimal assistance.",
    ageRanges: ["3-4", "4-5"],
    area: "practical_life",
    materialsNeeded: ["Zipper frame (or fabric pieces with zipper attached)"],
    duration: 15,
    difficulty: "intermediate",
    skillsAddressed: ["prl-dressing", "prl-coordination"],
    imageUrl: "",
    prerequisites: []
  },
  {
    title: "Table Washing",
    description: "Learn to wash and dry a small table",
    instructions: "Set up a station with a small basin of water, soap, sponge, cloth, and apron. Show the child how to put on the apron, wet and squeeze the sponge, apply soap, wash the table in a systematic way, rinse the sponge, wipe the table clean, and finally dry with the cloth.",
    ageRanges: ["4-5", "5-6"],
    area: "practical_life",
    materialsNeeded: ["Small basin", "Mild soap", "Sponge", "Drying cloth", "Apron", "Small table or tray"],
    duration: 25,
    difficulty: "intermediate",
    skillsAddressed: ["prl-cleaning", "prl-coordination", "prl-self-care"],
    imageUrl: "",
    prerequisites: []
  },
  {
    title: "Hand Washing",
    description: "Learn proper hand washing technique and sequence",
    instructions: "Set up a hand washing station with soap, nail brush, and towel. Demonstrate the sequence: wetting hands, applying soap, washing thoroughly including between fingers and around nails, rinsing, and drying with a towel. Encourage the child to follow the complete sequence.",
    ageRanges: ["3-4", "4-5"],
    area: "practical_life",
    materialsNeeded: ["Soap", "Nail brush", "Towel", "Water basin or sink access"],
    duration: 10,
    difficulty: "beginner",
    skillsAddressed: ["prl-self-care", "prl-cleaning"],
    imageUrl: "",
    prerequisites: []
  },
  {
    title: "Flower Arranging",
    description: "Create a simple flower arrangement for the home",
    instructions: "Prepare a tray with a small vase, pitcher of water, scissors (child-safe), and a few flowers. Show the child how to fill the vase with water, trim the stems, and arrange the flowers. Demonstrate how to clean up and where to place the finished arrangement.",
    ageRanges: ["4-5", "5-6"],
    area: "practical_life",
    materialsNeeded: ["Small vase", "Pitcher with water", "Child-safe scissors", "Fresh flowers", "Small tray", "Cloth for spills"],
    duration: 20,
    difficulty: "intermediate",
    skillsAddressed: ["prl-coordination", "prl-pouring", "cul-art"],
    imageUrl: "",
    prerequisites: ["prl-pouring"]
  },
  {
    title: "Food Preparation - Spreading",
    description: "Practice spreading butter, jam, or cream cheese on bread or crackers",
    instructions: "Set up a tray with a small dish of spreadable food, a spreading knife, and bread or crackers. Show the child how to hold the knife, scoop a small amount of spread, and apply it evenly across the surface. Demonstrate cleaning up afterward.",
    ageRanges: ["3-4", "4-5"],
    area: "practical_life",
    materialsNeeded: ["Spreader or dull knife", "Small dish with spread", "Bread or crackers", "Tray"],
    duration: 15,
    difficulty: "beginner",
    skillsAddressed: ["prl-food-prep", "prl-coordination"],
    imageUrl: "",
    prerequisites: []
  },
  
  // SENSORIAL ACTIVITIES
  {
    title: "Color Tablets Matching",
    description: "Match identical color tablets to develop visual discrimination",
    instructions: "Present two sets of color tablets on a mat. Demonstrate how to find matching pairs by carefully comparing the colors. Show the child how to place matched pairs side by side at the top of the mat. Encourage them to continue matching the remaining tablets.",
    ageRanges: ["3-4", "4-5"],
    area: "sensorial",
    materialsNeeded: ["Color tablets (primary colors)", "Work mat"],
    duration: 15,
    difficulty: "beginner",
    skillsAddressed: ["sen-color", "sen-visual"],
    imageUrl: "",
    prerequisites: []
  },
  {
    title: "Color Tablets Grading",
    description: "Arrange color tablets from lightest to darkest shades",
    instructions: "Present a set of color tablets with varying shades of the same color. Demonstrate how to compare tablets to find the lightest, then the next lightest, and so on, placing them in order from left to right. Invite the child to try with another color series.",
    ageRanges: ["4-5", "5-6"],
    area: "sensorial",
    materialsNeeded: ["Graded color tablets", "Work mat"],
    duration: 20,
    difficulty: "intermediate",
    skillsAddressed: ["sen-color", "sen-visual"],
    imageUrl: "",
    prerequisites: ["sen-color"]
  },
  {
    title: "Sound Cylinders",
    description: "Match cylinders with identical sounds to develop auditory discrimination",
    instructions: "Place the sound cylinders on a mat. Demonstrate how to pick up a cylinder, shake it gently near your ear, and find its matching pair by listening carefully. Show how to place matched pairs together. Invite the child to continue matching the remaining cylinders.",
    ageRanges: ["3-4", "4-5"],
    area: "sensorial",
    materialsNeeded: ["Sound cylinders (or small containers filled with different materials)", "Work mat"],
    duration: 15,
    difficulty: "intermediate",
    skillsAddressed: ["sen-auditory", "prl-coordination"],
    imageUrl: "",
    prerequisites: []
  },
  {
    title: "Fabric Matching",
    description: "Match fabric pieces by touch to develop tactile sense",
    instructions: "Present pairs of fabric swatches on a mat. Show the child how to feel each fabric with fingertips, identifying its texture. Demonstrate finding matching pairs by touch alone (can be done blindfolded for older children). Place matched pairs together.",
    ageRanges: ["3-4", "4-5", "5-6"],
    area: "sensorial",
    materialsNeeded: ["Pairs of fabric swatches (different textures)", "Work mat", "Optional: blindfold"],
    duration: 15,
    difficulty: "intermediate",
    skillsAddressed: ["sen-tactile", "prl-coordination"],
    imageUrl: "",
    prerequisites: []
  },
  {
    title: "Knobbed Cylinders",
    description: "Place cylinders of varying dimensions in their correct holes",
    instructions: "Present the wooden cylinder block. Demonstrate how to remove each cylinder by its knob, mix them on the mat, and then find the correct hole for each cylinder by visual size discrimination and trial and error. Show how to hold cylinders by the knob throughout the activity.",
    ageRanges: ["3-4", "4-5"],
    area: "sensorial",
    materialsNeeded: ["Knobbed cylinder block (or DIY version with different sized containers)"],
    duration: 15,
    difficulty: "beginner",
    skillsAddressed: ["sen-visual", "prl-coordination", "sen-spatial"],
    imageUrl: "",
    prerequisites: []
  },
  {
    title: "Binomial Cube",
    description: "Construct a 3D puzzle that represents the algebraic formula (a+b)³",
    instructions: "Present the binomial cube in its box. Demonstrate carefully removing each piece and placing it on the mat. Show how to rebuild the cube outside of the box by following the color pattern, starting with the corner piece. Once complete, show how to return it to the box.",
    ageRanges: ["5-6"],
    area: "sensorial",
    materialsNeeded: ["Binomial cube (or simplified 3D puzzle with color patterns)"],
    duration: 25,
    difficulty: "advanced",
    skillsAddressed: ["sen-visual", "sen-spatial", "prl-coordination", "mat-quantity"],
    imageUrl: "",
    prerequisites: ["sen-visual", "prl-coordination"]
  },
  {
    title: "Geometric Cabinet",
    description: "Match geometric shapes to their corresponding insets",
    instructions: "Present one drawer from the geometric cabinet. Demonstrate removing each shape by its knob, identifying it verbally, and finding its matching inset in the drawer. Return shape to inset. For older children, introduce terminology like circle, square, triangle.",
    ageRanges: ["3-4", "4-5"],
    area: "sensorial",
    materialsNeeded: ["Geometric cabinet drawer (or DIY shape templates and insets)"],
    duration: 15,
    difficulty: "beginner",
    skillsAddressed: ["sen-visual", "sen-spatial", "prl-coordination", "lan-vocabulary"],
    imageUrl: "",
    prerequisites: []
  },
  
  // LANGUAGE ACTIVITIES
  {
    title: "Sandpaper Letters",
    description: "Trace letters while learning their sounds",
    instructions: "Present a few sandpaper letters on a mat. Demonstrate how to trace each letter with two fingers while saying its sound (not name). Guide the child to trace the letter and repeat the sound. Focus on a few letters at a time, starting with those in the child's name.",
    ageRanges: ["3-4", "4-5"],
    area: "language",
    materialsNeeded: ["Sandpaper letters (or letters made with glue and sand on cardstock)", "Work mat"],
    duration: 15,
    difficulty: "beginner",
    skillsAddressed: ["lan-letter", "lan-phonics", "prl-coordination", "lan-writing"],
    imageUrl: "",
    prerequisites: []
  },
  {
    title: "Object Beginning Sound Matching",
    description: "Match objects to cards showing their beginning sounds",
    instructions: "Place sound cards and a basket of small objects on a mat. Demonstrate saying the name of an object, emphasizing its first sound, then matching it to the corresponding sound card. Invite the child to continue matching the remaining objects.",
    ageRanges: ["4-5", "5-6"],
    area: "language",
    materialsNeeded: ["Cards with letters or pictures representing different sounds", "Small objects beginning with those sounds", "Basket", "Work mat"],
    duration: 20,
    difficulty: "intermediate",
    skillsAddressed: ["lan-letter", "lan-phonics", "lan-vocabulary"],
    imageUrl: "",
    prerequisites: ["lan-letter"]
  },
  {
    title: "Metal Insets",
    description: "Trace shapes to develop pencil control and writing preparation",
    instructions: "Present the metal insets with paper and colored pencils. Demonstrate how to hold the inset steady with one hand while tracing around it with the other. Then show how to trace the shape cutout. Finally, demonstrate simple designs by filling in the shapes with different line patterns.",
    ageRanges: ["4-5", "5-6"],
    area: "language",
    materialsNeeded: ["Metal insets (or DIY shape stencils)", "Paper", "Colored pencils"],
    duration: 20,
    difficulty: "intermediate",
    skillsAddressed: ["lan-writing", "prl-coordination", "sen-visual"],
    imageUrl: "",
    prerequisites: ["prl-coordination"]
  },
  {
    title: "Moveable Alphabet - Simple Words",
    description: "Build simple words using individual letter pieces",
    instructions: "Set up the moveable alphabet and a few picture cards of simple objects with phonetic names (cat, dog, pen). Show the child how to select a picture, say its name slowly to identify each sound, then find and place the corresponding letters. Demonstrate sounding out the completed word.",
    ageRanges: ["4-5", "5-6"],
    area: "language",
    materialsNeeded: ["Moveable alphabet (or letter cards)", "Picture cards of simple objects", "Work mat"],
    duration: 25,
    difficulty: "intermediate",
    skillsAddressed: ["lan-letter", "lan-phonics", "lan-reading", "lan-writing"],
    imageUrl: "",
    prerequisites: ["lan-letter", "lan-phonics"]
  },
  {
    title: "Three-Part Cards",
    description: "Match pictures and labels to develop vocabulary and reading skills",
    instructions: "Present the three-part cards (picture, label, and control card). Demonstrate the three-period lesson: first match pictures to control cards, then place labels under corresponding pictures, and finally read labels independently. Start with a small set focused on one category (animals, food, etc.).",
    ageRanges: ["4-5", "5-6"],
    area: "language",
    materialsNeeded: ["Three-part cards (picture cards, label cards, and control cards showing both)", "Work mat"],
    duration: 20,
    difficulty: "intermediate",
    skillsAddressed: ["lan-letter", "lan-reading", "lan-vocabulary"],
    imageUrl: "",
    prerequisites: ["lan-letter"]
  },
  {
    title: "Story Sequencing Cards",
    description: "Arrange picture cards to tell a story in the correct sequence",
    instructions: "Present a set of sequencing cards showing steps of a simple story or process. Demonstrate examining each card carefully, thinking about what happens first, next, and last, then arranging them in order from left to right. Invite the child to tell the story using the arranged cards.",
    ageRanges: ["4-5", "5-6"],
    area: "language",
    materialsNeeded: ["Set of sequencing cards (4-6 cards showing a story or process)", "Work mat"],
    duration: 15,
    difficulty: "intermediate",
    skillsAddressed: ["lan-comprehension", "lan-vocabulary", "cul-time"],
    imageUrl: "",
    prerequisites: []
  },
  {
    title: "Simple Phonetic Reading Books",
    description: "Read books with simple phonetic words to develop reading skills",
    instructions: "Present a phonetic reading book. Guide the child to look at the pictures and read the simple words using their phonetic knowledge. Offer support as needed, encouraging them to sound out each letter and blend the sounds together.",
    ageRanges: ["5-6"],
    area: "language",
    materialsNeeded: ["Simple phonetic reading books"],
    duration: 15,
    difficulty: "intermediate",
    skillsAddressed: ["lan-reading", "lan-comprehension", "lan-phonics"],
    imageUrl: "",
    prerequisites: ["lan-letter", "lan-phonics"]
  },
  
  // MATHEMATICS ACTIVITIES
  {
    title: "Number Rods",
    description: "Use rods of increasing length to learn quantity and number symbols",
    instructions: "Present the number rods and number cards on a large mat. Demonstrate arranging the rods in order from shortest to longest (1-10). Show how to count the sections of each rod and match it with its corresponding number card. Invite the child to mix up the rods and rebuild the sequence.",
    ageRanges: ["3-4", "4-5"],
    area: "mathematics",
    materialsNeeded: ["Number rods (or painted craft sticks bundled in increasing quantities)", "Number cards 1-10", "Large work mat"],
    duration: 20,
    difficulty: "beginner",
    skillsAddressed: ["mat-counting", "mat-numeral", "mat-quantity"],
    imageUrl: "",
    prerequisites: []
  },
  {
    title: "Sandpaper Numerals",
    description: "Trace numeral shapes while learning their names",
    instructions: "Present the sandpaper numerals one at a time. Demonstrate tracing each numeral with two fingers while saying its name. Guide the child to trace the numeral and repeat its name. Focus on a few numerals at a time (usually 1-5, then 6-10).",
    ageRanges: ["3-4", "4-5"],
    area: "mathematics",
    materialsNeeded: ["Sandpaper numerals 0-9 (or numerals made with glue and sand on cardstock)", "Work mat"],
    duration: 15,
    difficulty: "beginner",
    skillsAddressed: ["mat-numeral", "prl-coordination"],
    imageUrl: "",
    prerequisites: []
  },
  {
    title: "Spindle Box",
    description: "Place the correct number of spindles in numbered compartments",
    instructions: "Present the spindle box and loose spindles. Demonstrate counting the correct number of spindles for each compartment, starting with '0' to emphasize the concept of zero (no spindles). Show how to hold the spindles together and carefully place them in each section, counting again to verify.",
    ageRanges: ["4-5"],
    area: "mathematics",
    materialsNeeded: ["Spindle box with compartments labeled 0-9 (or a divided container)", "45 wooden spindles (or craft sticks)"],
    duration: 20,
    difficulty: "intermediate",
    skillsAddressed: ["mat-counting", "mat-numeral", "mat-quantity"],
    imageUrl: "",
    prerequisites: ["mat-counting", "mat-numeral"]
  },
  {
    title: "Golden Bead Material - Introduction",
    description: "Explore place value with concrete representations of units, tens, hundreds, and thousands",
    instructions: "Present the golden bead material on a mat. Introduce each category one at a time: unit (single bead), ten bar, hundred square, and thousand cube. Demonstrate how to count each, emphasizing how 10 units make a ten bar, 10 ten bars make a hundred square, etc. Invite the child to explore and count each category.",
    ageRanges: ["4-5", "5-6"],
    area: "mathematics",
    materialsNeeded: ["Golden bead materials (or DIY versions using beads, craft sticks, paper squares)", "Work mat"],
    duration: 25,
    difficulty: "intermediate",
    skillsAddressed: ["mat-decimal", "mat-quantity", "mat-counting"],
    imageUrl: "",
    prerequisites: ["mat-counting", "mat-quantity"]
  },
  {
    title: "Addition with Number Rods",
    description: "Use number rods to visualize and solve simple addition problems",
    instructions: "Place the number rods on a mat. Demonstrate simple addition by selecting two rods (e.g., 2 and 3), placing them end to end, then finding the rod that equals their combined length (5). Show how this represents the equation 2+3=5. Provide several examples before inviting the child to create their own addition problems.",
    ageRanges: ["4-5", "5-6"],
    area: "mathematics",
    materialsNeeded: ["Number rods", "Work mat"],
    duration: 20,
    difficulty: "intermediate",
    skillsAddressed: ["mat-counting", "mat-operations", "mat-quantity"],
    imageUrl: "",
    prerequisites: ["mat-counting", "mat-quantity"]
  },
  {
    title: "Counting Objects 1-10",
    description: "Count sets of objects and match to corresponding numerals",
    instructions: "Arrange number cards 1-10 in order on a mat. Place a basket of small objects nearby. Demonstrate counting out the correct number of objects to match each numeral, placing them in a row or group below the card. Emphasize counting each object once and touching it while counting.",
    ageRanges: ["3-4", "4-5"],
    area: "mathematics",
    materialsNeeded: ["Number cards 1-10", "Small objects for counting (buttons, shells, etc.)", "Basket", "Work mat"],
    duration: 15,
    difficulty: "beginner",
    skillsAddressed: ["mat-counting", "mat-numeral", "mat-quantity"],
    imageUrl: "",
    prerequisites: []
  },
  {
    title: "Measurement Activities",
    description: "Explore concepts of length, weight, and volume through hands-on measuring",
    instructions: "Set up different measurement stations: length (rulers, measuring tapes), weight (balance scale), volume (measuring cups). Demonstrate using each tool to measure various objects. Encourage the child to predict, measure, and compare different items.",
    ageRanges: ["4-5", "5-6"],
    area: "mathematics",
    materialsNeeded: ["Rulers", "Balance scale", "Measuring cups", "Various objects to measure"],
    duration: 25,
    difficulty: "intermediate",
    skillsAddressed: ["mat-measurement", "mat-quantity", "cul-science"],
    imageUrl: "",
    prerequisites: ["mat-counting", "mat-quantity"]
  },
  
  // CULTURAL ACTIVITIES
  {
    title: "Land, Air, and Water Sorting",
    description: "Sort objects or pictures by their environment",
    instructions: "Set up three labeled containers or areas on a mat: land, air, and water. Present a basket of small objects or picture cards representing things found in these environments. Demonstrate examining each item and placing it in the appropriate category, explaining your reasoning. Invite the child to continue sorting.",
    ageRanges: ["3-4", "4-5"],
    area: "cultural",
    materialsNeeded: ["Three containers or defined areas on a mat", "Labels for land, air, and water", "Pictures or small objects representing items from each environment"],
    duration: 20,
    difficulty: "beginner",
    skillsAddressed: ["cul-science", "cul-geography", "lan-vocabulary", "cul-zoology"],
    imageUrl: "",
    prerequisites: []
  },
  {
    title: "Continent Globe Exploration",
    description: "Explore the continents using a globe or puzzle map",
    instructions: "Present the globe or continent puzzle map. Introduce the concept of land and water. Show how to identify and name each continent by color, touching each one gently. For older children, demonstrate removing puzzle pieces and replacing them. Encourage exploration and questions about different places.",
    ageRanges: ["4-5", "5-6"],
    area: "cultural",
    materialsNeeded: ["Globe with colored continents", "Optional: continent puzzle map"],
    duration: 20,
    difficulty: "intermediate",
    skillsAddressed: ["cul-geography", "sen-visual", "lan-vocabulary"],
    imageUrl: "",
    prerequisites: []
  },
  {
    title: "Parts of a Plant",
    description: "Learn the basic parts of a plant through hands-on exploration",
    instructions: "Present a real plant and the parts of a plant cards or puzzle. Identify each part of the plant (root, stem, leaf, flower) on both the real plant and the cards. For older children, introduce the three-part cards with labels. Encourage careful observation and questions about how each part helps the plant.",
    ageRanges: ["4-5", "5-6"],
    area: "cultural",
    materialsNeeded: ["Small potted plant", "Parts of a plant cards or puzzle", "Optional: three-part cards with labels"],
    duration: 25,
    difficulty: "intermediate",
    skillsAddressed: ["cul-botany", "cul-science", "lan-vocabulary"],
    imageUrl: "",
    prerequisites: []
  },
  {
    title: "Weather Calendar",
    description: "Observe and record daily weather patterns",
    instructions: "Set up a simple calendar with weather symbols. Each day, guide the child to observe the weather outside, describe what they see, and select the appropriate symbol to place on the calendar. Over time, discuss patterns they notice and seasonal changes. This can become part of a daily routine.",
    ageRanges: ["3-4", "4-5", "5-6"],
    area: "cultural",
    materialsNeeded: ["Calendar grid", "Weather symbols (sunny, cloudy, rainy, etc.)", "Storage container for symbols"],
    duration: 10,
    difficulty: "beginner",
    skillsAddressed: ["cul-time", "cul-science", "lan-vocabulary"],
    imageUrl: "",
    prerequisites: []
  },
  {
    title: "Animal Classification",
    description: "Sort animals by their characteristics (mammals, birds, fish, etc.)",
    instructions: "Present labeled sorting mats and a basket of animal figurines or cards. Discuss the basic characteristics of each animal group. Demonstrate selecting an animal, identifying its group based on characteristics, and placing it on the appropriate mat. Encourage the child to continue classifying the remaining animals.",
    ageRanges: ["4-5", "5-6"],
    area: "cultural",
    materialsNeeded: ["Sorting mats labeled with animal groups", "Animal figurines or picture cards", "Basket"],
    duration: 25,
    difficulty: "intermediate",
    skillsAddressed: ["cul-zoology", "cul-science", "lan-vocabulary", "sen-visual"],
    imageUrl: "",
    prerequisites: []
  },
  {
    title: "Seasons Exploration",
    description: "Learn about the four seasons and their characteristics",
    instructions: "Present cards or a book showing the four seasons. Discuss the unique features of each season (weather, clothing, activities, changes in nature). For older children, create a sorting activity with images representing each season. Encourage the child to share personal experiences with different seasons.",
    ageRanges: ["3-4", "4-5", "5-6"],
    area: "cultural",
    materialsNeeded: ["Season cards or book", "Optional: sorting cards with seasonal images"],
    duration: 20,
    difficulty: "beginner",
    skillsAddressed: ["cul-time", "cul-science", "lan-vocabulary", "cul-botany"],
    imageUrl: "",
    prerequisites: []
  },
  {
    title: "Simple Musical Instruments Exploration",
    description: "Explore sounds made by different instruments",
    instructions: "Present a collection of simple instruments (drum, bells, shaker, etc.). Demonstrate how to play each one carefully and listen to its sound. Discuss the different qualities of sounds (loud/soft, high/low). Invite the child to explore each instrument and create simple patterns or rhythms.",
    ageRanges: ["3-4", "4-5"],
    area: "cultural",
    materialsNeeded: ["Simple musical instruments (drum, bells, shaker, triangle, etc.)"],
    duration: 20,
    difficulty: "beginner",
    skillsAddressed: ["cul-music", "sen-auditory", "prl-coordination"],
    imageUrl: "",
    prerequisites: []
  }
];

/**
 * Seed the activities collection in Firestore
 */
async function seedMontessoriActivities() {
  console.log('Starting to seed Montessori activities...');
  
  try {
    // Check if activities already exist
    const activitiesCollection = db.collection('activities');
    const snapshot = await activitiesCollection.get();
    
    if (!snapshot.empty) {
      console.log(`Found ${snapshot.size} existing activities. Checking for new activities to add...`);
      
      // Get existing activity titles
      const existingTitles = new Set();
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        existingTitles.add(data.title);
      });
      
      // Add only new activities
      for (const activity of montessoriActivities) {
        if (!existingTitles.has(activity.title)) {
          const activityId = generateActivityId(activity.area, activity.title);
          
          await db.collection('activities').doc(activityId).set({
            ...activity,
            status: 'active',
            nextSteps: [],
            relatedActivities: [],
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });
          
          console.log(`Added new activity: ${activity.title} (${activityId})`);
        }
      }
      
    } else {
      console.log('No existing activities found. Adding all activities...');
      
      // Add all activities
      for (const activity of montessoriActivities) {
        const activityId = generateActivityId(activity.area, activity.title);
        
        await db.collection('activities').doc(activityId).set({
          ...activity,
          status: 'active',
          nextSteps: [],
          relatedActivities: [],
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        console.log(`Added activity: ${activity.title} (${activityId})`);
      }
    }
    
    console.log('Montessori activities seeding completed successfully!');
    return true;
    
  } catch (error) {
    console.error('Error seeding Montessori activities:', error);
    return false;
  }
}

/**
 * Process to seed both developmental skills and activities
 */
async function seedAllData() {
  try {
    // First seed the developmental skills
    console.log("Step 1: Seeding developmental skills");
    const skillsResult = await seedDevelopmentalSkills();
    
    if (!skillsResult) {
      throw new Error("Failed to seed developmental skills");
    }
    
    console.log("Step 2: Seeding Montessori activities");
    const activitiesResult = await seedMontessoriActivities();
    
    if (!activitiesResult) {
      throw new Error("Failed to seed Montessori activities");
    }
    
    console.log("All data seeded successfully!");
    return true;
  } catch (error) {
    console.error("Error in seeding process:", error);
    return false;
  }
}

// Execute the seeding function
seedAllData().then(() => {
  console.log('Complete seeding process finished!');
  process.exit(0);
}).catch(error => {
  console.error('Fatal error during seeding process:', error);
  process.exit(1);
});