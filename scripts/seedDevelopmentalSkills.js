import { db } from '../lib/firebase';
import { collection, getDocs, writeBatch, doc } from 'firebase/firestore';

const developmentalSkills = [
  // Motor Skills
  {
    id: 'gross_motor_walking',
    name: 'Walking Independently',
    description: 'Walks steadily and confidently without support',
    area: 'motor',
    category: 'gross_motor',
    ageGroups: ['1-2', '2-3']
  },
  {
    id: 'gross_motor_running',
    name: 'Running and Stopping',
    description: 'Runs with control and can stop when needed',
    area: 'motor',
    category: 'gross_motor',
    ageGroups: ['2-3', '3-4']
  },
  {
    id: 'fine_motor_grasp',
    name: 'Pincer Grasp',
    description: 'Uses thumb and index finger to pick up small objects',
    area: 'motor',
    category: 'fine_motor',
    ageGroups: ['1-2', '2-3']
  },

  // Language Skills
  {
    id: 'language_words',
    name: 'First Words',
    description: 'Uses single words meaningfully',
    area: 'language',
    category: 'expressive_language',
    ageGroups: ['1-2']
  },
  {
    id: 'language_sentences',
    name: 'Simple Sentences',
    description: 'Combines words to form simple sentences',
    area: 'language',
    category: 'expressive_language',
    ageGroups: ['2-3', '3-4']
  },

  // Cognitive Skills
  {
    id: 'cognitive_object_permanence',
    name: 'Object Permanence',
    description: 'Understands objects exist even when hidden',
    area: 'cognitive',
    category: 'problem_solving',
    ageGroups: ['0-1', '1-2']
  },
  {
    id: 'cognitive_sorting',
    name: 'Basic Sorting',
    description: 'Sorts objects by simple characteristics (e.g., color)',
    area: 'cognitive',
    category: 'problem_solving',
    ageGroups: ['2-3', '3-4']
  },

  // Social-Emotional Skills
  {
    id: 'social_parallel_play',
    name: 'Parallel Play',
    description: 'Plays alongside other children',
    area: 'social',
    category: 'peer_interaction',
    ageGroups: ['2-3']
  },
  {
    id: 'social_cooperative_play',
    name: 'Cooperative Play',
    description: 'Engages in play with other children',
    area: 'social',
    category: 'peer_interaction',
    ageGroups: ['3-4', '4-5']
  },

  // Self-Help Skills
  {
    id: 'self_help_feeding',
    name: 'Self-Feeding',
    description: 'Uses utensils to feed self',
    area: 'self_help',
    category: 'feeding',
    ageGroups: ['1-2', '2-3']
  },
  {
    id: 'self_help_dressing',
    name: 'Independent Dressing',
    description: 'Puts on simple clothing items',
    area: 'self_help',
    category: 'dressing',
    ageGroups: ['2-3', '3-4']
  }
];

async function seedDevelopmentalSkills() {
  try {
    // Check if skills already exist
    const skillsSnapshot = await getDocs(collection(db, 'developmentalSkills'));
    if (!skillsSnapshot.empty) {
      console.log(`Found ${skillsSnapshot.size} existing skills. Skipping seed.`);
      return;
    }

    // Create skills in batches
    const batch = writeBatch(db);
    
    developmentalSkills.forEach(skill => {
      const skillRef = doc(collection(db, 'developmentalSkills'), skill.id);
      batch.set(skillRef, {
        ...skill,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    });

    await batch.commit();
    console.log(`Successfully seeded ${developmentalSkills.length} developmental skills.`);
  } catch (error) {
    console.error('Error seeding developmental skills:', error);
  }
}

// Run the seed function
seedDevelopmentalSkills(); 