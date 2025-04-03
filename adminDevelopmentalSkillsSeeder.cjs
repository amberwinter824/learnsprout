// adminDevelopmentalSkillsSeeder.cjs
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
 * Comprehensive list of Montessori developmental skills
 */
const developmentalSkills = [
  // PRACTICAL LIFE SKILLS
  {
    id: "prl-pouring",  // Formerly skill1
    name: "Pouring",
    description: "Ability to pour liquids from one container to another with control",
    area: "practical_life",
    ageRanges: ["3-4", "4-5"],
    prerequisites: []
  },
  {
    id: "prl-dressing",
    name: "Dressing Skills",
    description: "Ability to use buttons, zippers, snaps, and laces independently",
    area: "practical_life",
    ageRanges: ["3-4", "4-5", "5-6"],
    prerequisites: []
  },
  {
    id: "prl-food-prep",
    name: "Food Preparation",
    description: "Ability to prepare simple food items like spreading, cutting soft fruits, and serving",
    area: "practical_life",
    ageRanges: ["3-4", "4-5", "5-6"],
    prerequisites: []
  },
  {
    id: "prl-cleaning",
    name: "Cleaning and Maintenance",
    description: "Ability to wash, polish, sweep, and maintain the environment",
    area: "practical_life",
    ageRanges: ["3-4", "4-5", "5-6"],
    prerequisites: []
  },
  {
    id: "prl-coordination",
    name: "Fine Motor Coordination",
    description: "Refined hand movements and eye-hand coordination for precise tasks",
    area: "practical_life",
    ageRanges: ["3-4", "4-5", "5-6"],
    prerequisites: []
  },
  {
    id: "prl-self-care",
    name: "Self-Care",
    description: "Ability to manage personal hygiene and care independently",
    area: "practical_life",
    ageRanges: ["3-4", "4-5", "5-6"],
    prerequisites: []
  },
  
  // SENSORIAL SKILLS
  {
    id: "sen-color",  // Formerly skill2
    name: "Color Discrimination",
    description: "Ability to match, grade, and name colors",
    area: "sensorial",
    ageRanges: ["3-4", "4-5"],
    prerequisites: []
  },
  {
    id: "sen-visual",
    name: "Visual Discrimination",
    description: "Ability to distinguish differences in size, shape, and pattern",
    area: "sensorial",
    ageRanges: ["3-4", "4-5", "5-6"],
    prerequisites: []
  },
  {
    id: "sen-tactile",
    name: "Tactile Discrimination",
    description: "Ability to distinguish textures and forms through touch",
    area: "sensorial",
    ageRanges: ["3-4", "4-5"],
    prerequisites: []
  },
  {
    id: "sen-auditory",
    name: "Auditory Discrimination",
    description: "Ability to distinguish sounds, tones, and volumes",
    area: "sensorial",
    ageRanges: ["3-4", "4-5", "5-6"],
    prerequisites: []
  },
  {
    id: "sen-spatial",
    name: "Spatial Awareness",
    description: "Understanding of dimension, form, and spatial relationships",
    area: "sensorial",
    ageRanges: ["4-5", "5-6"],
    prerequisites: []
  },
  
  // LANGUAGE SKILLS
  {
    id: "lan-letter",  // Formerly skill3
    name: "Letter Recognition",
    description: "Ability to identify and name letters of the alphabet",
    area: "language",
    ageRanges: ["4-5", "5-6"],
    prerequisites: []
  },
  {
    id: "lan-phonics",
    name: "Phonetic Awareness",
    description: "Understanding the relationship between sounds and letters",
    area: "language",
    ageRanges: ["4-5", "5-6"],
    prerequisites: ["lan-letter"]
  },
  {
    id: "lan-vocabulary",
    name: "Vocabulary Development",
    description: "Ability to name and understand a wide range of words and concepts",
    area: "language",
    ageRanges: ["3-4", "4-5", "5-6"],
    prerequisites: []
  },
  {
    id: "lan-writing",
    name: "Pre-Writing Skills",
    description: "Hand strength and control in preparation for writing",
    area: "language",
    ageRanges: ["4-5", "5-6"],
    prerequisites: ["prl-coordination"]
  },
  {
    id: "lan-reading",
    name: "Pre-Reading Skills",
    description: "Sound-symbol connection and word building",
    area: "language",
    ageRanges: ["4-5", "5-6"],
    prerequisites: ["lan-letter", "lan-phonics"]
  },
  {
    id: "lan-comprehension",
    name: "Reading Comprehension",
    description: "Understanding and processing written information",
    area: "language",
    ageRanges: ["5-6"],
    prerequisites: ["lan-reading"]
  },
  
  // MATHEMATICS SKILLS
  {
    id: "mat-counting",  // Formerly skill4
    name: "Counting to 10",
    description: "Ability to count objects from 1 to 10",
    area: "mathematics",
    ageRanges: ["3-4", "4-5"],
    prerequisites: []
  },
  {
    id: "mat-numeral",
    name: "Numeral Recognition",
    description: "Ability to identify and name written numerals",
    area: "mathematics",
    ageRanges: ["3-4", "4-5"],
    prerequisites: []
  },
  {
    id: "mat-quantity",
    name: "Quantity Association",
    description: "Understanding the relationship between numbers and quantities",
    area: "mathematics",
    ageRanges: ["3-4", "4-5", "5-6"],
    prerequisites: ["mat-counting", "mat-numeral"]
  },
  {
    id: "mat-operations",
    name: "Basic Operations",
    description: "Understanding addition, subtraction, multiplication, and division concepts",
    area: "mathematics",
    ageRanges: ["4-5", "5-6"],
    prerequisites: ["mat-quantity"]
  },
  {
    id: "mat-decimal",
    name: "Decimal System",
    description: "Understanding place value (units, tens, hundreds, thousands)",
    area: "mathematics",
    ageRanges: ["5-6"],
    prerequisites: ["mat-quantity"]
  },
  {
    id: "mat-measurement",
    name: "Measurement Concepts",
    description: "Understanding units of measurement for length, weight, volume, and time",
    area: "mathematics",
    ageRanges: ["4-5", "5-6"],
    prerequisites: ["mat-quantity"]
  },
  
  // CULTURAL SKILLS
  {
    id: "cul-geography",
    name: "Geographic Awareness",
    description: "Recognition of land, water, continents, and countries",
    area: "cultural",
    ageRanges: ["4-5", "5-6"],
    prerequisites: []
  },
  {
    id: "cul-science",
    name: "Scientific Observation",
    description: "Ability to observe, classify, and experiment with natural phenomena",
    area: "cultural",
    ageRanges: ["3-4", "4-5", "5-6"],
    prerequisites: []
  },
  {
    id: "cul-botany",
    name: "Botany Knowledge",
    description: "Understanding of plants, their parts, and basic needs",
    area: "cultural",
    ageRanges: ["3-4", "4-5", "5-6"],
    prerequisites: []
  },
  {
    id: "cul-zoology",
    name: "Zoology Knowledge",
    description: "Understanding of animals, their classification, and habitats",
    area: "cultural",
    ageRanges: ["3-4", "4-5", "5-6"],
    prerequisites: []
  },
  {
    id: "cul-time",
    name: "Time Awareness",
    description: "Understanding of time concepts (day/night, seasons, calendar)",
    area: "cultural",
    ageRanges: ["4-5", "5-6"],
    prerequisites: []
  },
  {
    id: "cul-art",
    name: "Artistic Expression",
    description: "Using various media for creative expression",
    area: "cultural",
    ageRanges: ["3-4", "4-5", "5-6"],
    prerequisites: []
  },
  {
    id: "cul-music",
    name: "Musical Awareness",
    description: "Recognition of rhythm, melody, and musical instruments",
    area: "cultural",
    ageRanges: ["3-4", "4-5", "5-6"],
    prerequisites: []
  },

  // SOCIAL-EMOTIONAL SKILLS
  {
    id: "soc-self-awareness",
    name: "Self-Awareness",
    description: "Recognition and understanding of one's own emotions, thoughts, and values",
    area: "social_emotional",
    ageRanges: ["3-4", "4-5", "5-6"],
    prerequisites: []
  },
  {
    id: "soc-emotion-reg",
    name: "Emotional Regulation",
    description: "Ability to manage emotions and respond to situations appropriately",
    area: "social_emotional",
    ageRanges: ["3-4", "4-5", "5-6"],
    prerequisites: ["soc-self-awareness"]
  },
  {
    id: "soc-empathy",
    name: "Empathy",
    description: "Understanding and sharing the feelings of others",
    area: "social_emotional",
    ageRanges: ["3-4", "4-5", "5-6"],
    prerequisites: ["soc-self-awareness"]
  },
  {
    id: "soc-relationships",
    name: "Building Relationships",
    description: "Forming and maintaining positive relationships with peers and adults",
    area: "social_emotional",
    ageRanges: ["3-4", "4-5", "5-6"],
    prerequisites: []
  },
  {
    id: "soc-cooperation",
    name: "Cooperation",
    description: "Working together with others and participating in group activities",
    area: "social_emotional",
    ageRanges: ["3-4", "4-5", "5-6"],
    prerequisites: ["soc-relationships"]
  },
  {
    id: "soc-conflict",
    name: "Conflict Resolution",
    description: "Ability to resolve disagreements and problems peacefully",
    area: "social_emotional",
    ageRanges: ["4-5", "5-6"],
    prerequisites: ["soc-empathy", "soc-emotion-reg"]
  },
  {
    id: "soc-independence",
    name: "Independence",
    description: "Confidence in making choices and completing tasks independently",
    area: "social_emotional",
    ageRanges: ["3-4", "4-5", "5-6"],
    prerequisites: ["soc-self-awareness"]
  },
  {
    id: "soc-boundaries",
    name: "Personal Boundaries",
    description: "Understanding and respecting personal space and boundaries",
    area: "social_emotional",
    ageRanges: ["3-4", "4-5", "5-6"],
    prerequisites: ["soc-relationships"]
  }
];

/**
 * Seed the developmental skills collection in Firestore
 */
async function seedDevelopmentalSkills() {
  console.log('Starting to seed developmental skills...');
  
  try {
    // Check if skills already exist
    const skillsCollection = db.collection('developmentalSkills');
    const snapshot = await skillsCollection.get();
    
    // Map to store existing skill IDs and their data for reference
    const existingSkills = new Map();
    
    if (!snapshot.empty) {
      console.log(`Found ${snapshot.size} existing skills. Checking for new skills to add...`);
      
      // Get existing skill IDs
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        existingSkills.set(doc.id, data);
      });
      
      // Add only new skills
      for (const skill of developmentalSkills) {
        if (!existingSkills.has(skill.id)) {
          await db.collection('developmentalSkills').doc(skill.id).set({
            ...skill,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });
          
          console.log(`Added new skill: ${skill.name} (${skill.id})`);
        } else {
          // Optionally update existing skills
          console.log(`Skill already exists: ${skill.name} (${skill.id})`);
        }
      }
      
    } else {
      console.log('No existing skills found. Adding all skills...');
      
      // Add all skills
      for (const skill of developmentalSkills) {
        await db.collection('developmentalSkills').doc(skill.id).set({
          ...skill,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        console.log(`Added skill: ${skill.name} (${skill.id})`);
      }
    }
    
    console.log('Developmental skills seeding completed successfully!');
    return true;
    
  } catch (error) {
    console.error('Error seeding developmental skills:', error);
    return false;
  }
}

// Export for use in activity seeder
module.exports = {
  seedDevelopmentalSkills,
  developmentalSkills
};

// If running this script directly
if (require.main === module) {
  console.log("Service account check:");
  try {
    // Log basic information about the service account to confirm it's loaded
    console.log(`Project ID: ${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}`);
    console.log(`Client Email: ${process.env.FIREBASE_ADMIN_CLIENT_EMAIL}`);
    console.log(`Service account loaded successfully`);
    
    seedDevelopmentalSkills().then(() => {
      console.log('Developmental skills seeding process completed!');
      process.exit(0);
    }).catch(error => {
      console.error('Fatal error during seeding process:', error);
      process.exit(1);
    });
  } catch (error) {
    console.error("Error accessing service account:", error);
    console.error("Make sure environment variables are set correctly");
    process.exit(1);
  }
}