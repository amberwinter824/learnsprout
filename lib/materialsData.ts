import { db } from './firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';

export interface EssentialMaterial {
  id: string;
  name: string;
  description: string;
  materialType: 'household' | 'basic' | 'advanced';
  isEssential: boolean;
  householdAlternative: string;
  amazonLink?: string;
  affiliateLink?: string;
  category: string;
  priority: number; // For sorting
  imageUrl?: string;
  activityCount?: number; // How many activities use this
  activities?: string[]; // IDs of activities using this material
}

// Full essential starter kit definition with detailed information
export const essentialStarterKit: EssentialMaterial[] = [
  {
    id: 'work-mat',
    name: 'Work Mat',
    description: 'Defines the child\'s workspace and helps them understand boundaries while working on activities.',
    materialType: 'basic',
    isEssential: true,
    householdAlternative: 'A clean placemat, small rug, or towel',
    amazonLink: 'https://amzn.to/4izC16E',
    category: 'Practical Life',
    priority: 1,
    activityCount: 13
  },
  {
    id: 'small-tray',
    name: 'Small Tray',
    description: 'Used for organizing materials and defining activities. Teaches order and sequence.',
    materialType: 'basic',
    isEssential: true,
    householdAlternative: 'Small baking trays or plastic serving trays',
    amazonLink: 'https://amzn.to/4bSuE7W',
    category: 'Practical Life',
    priority: 2,
    activityCount: 6
  },
  {
    id: 'animal-cards',
    name: 'Animal Picture Cards',
    description: 'Used for language development, classification, and matching activities.',
    materialType: 'basic',
    isEssential: true,
    householdAlternative: 'Pictures of animals from magazines or printed photos, or small animal figurines',
    category: 'Language',
    priority: 3,
    activityCount: 2
  },
  {
    id: 'color-tablets',
    name: 'Color Tablets',
    description: 'Used for color recognition, matching, and grading activities.',
    materialType: 'basic',
    isEssential: true,
    householdAlternative: 'Paint color swatches or colored paper squares',
    amazonLink: 'https://amzn.to/41CZ9u3',
    category: 'Sensorial',
    priority: 4,
    activityCount: 2
  },
  {
    id: 'object-permanence-box',
    name: 'Object Permanence Box',
    description: 'Helps develop understanding that objects continue to exist even when they cannot be seen.',
    materialType: 'basic',
    isEssential: true,
    householdAlternative: 'Small box with a hole in the top and small balls or objects that fit through',
    category: 'Sensorial',
    priority: 5,
    activityCount: 1
  },
  {
    id: 'simple-knobbed-puzzles',
    name: 'Simple Knobbed Puzzles',
    description: 'Develops fine motor skills, hand-eye coordination, and shape recognition.',
    materialType: 'basic',
    isEssential: true,
    householdAlternative: 'Simple puzzles made from cardboard with bottle caps as knobs',
    amazonLink: 'https://amzn.to/3ReHF2a',
    category: 'Sensorial',
    priority: 6,
    activityCount: 1
  },
  {
    id: 'three-part-cards',
    name: 'Three-Part Cards',
    description: 'Used for vocabulary development, reading preparation, and classification.',
    materialType: 'basic',
    isEssential: true,
    householdAlternative: 'Handmade cards with pictures and labels using cardstock',
    category: 'Language',
    priority: 7,
    activityCount: 2
  },
  {
    id: 'season-cards',
    name: 'Season Cards',
    description: 'Used for learning about seasons, weather, and time concepts.',
    materialType: 'basic',
    isEssential: true,
    householdAlternative: 'Pictures from magazines or handmade cards showing seasonal changes',
    category: 'Culture',
    priority: 8,
    activityCount: 1
  },
  {
    id: 'plant-cards',
    name: 'Parts of a Plant Cards',
    description: 'Used for learning plant anatomy and classification.',
    materialType: 'basic',
    isEssential: true,
    householdAlternative: 'Handmade cards with plant parts labeled, or real plants for observation',
    category: 'Biology',
    priority: 9,
    activityCount: 1
  },
  {
    id: 'number-cards',
    name: 'Number Cards 1-10',
    description: 'Cards for learning number recognition, sequence, and quantity association.',
    materialType: 'basic',
    isEssential: true,
    householdAlternative: 'Hand-drawn number cards on index cards',
    amazonLink: 'https://amzn.to/41ziT1J',
    category: 'Mathematics',
    priority: 10,
    activityCount: 3
  },
  {
    id: 'continent-map',
    name: 'Continent Puzzle Map',
    description: 'Introduces geography and develops spatial awareness.',
    materialType: 'basic',
    isEssential: false,
    householdAlternative: 'Printed or drawn continent shapes that can be cut out and used as puzzles',
    category: 'Geography',
    priority: 11,
    activityCount: 1
  },
  {
    id: 'shape-sorter',
    name: 'Shape Sorter',
    description: 'Develops shape recognition and fine motor skills.',
    materialType: 'basic',
    isEssential: true,
    householdAlternative: 'Box with cut-out shapes and corresponding wooden or cardboard shapes',
    category: 'Sensorial',
    priority: 12,
    activityCount: 1
  },
  {
    id: 'matching-pairs',
    name: 'Matching Pairs',
    description: 'Used for visual discrimination and memory development.',
    materialType: 'basic',
    isEssential: true,
    householdAlternative: 'Pairs of identical small objects or picture cards',
    category: 'Sensorial',
    priority: 13,
    activityCount: 2
  },
  {
    id: 'coin-box',
    name: 'Coin Slot Box',
    description: 'Develops fine motor skills and hand-eye coordination.',
    materialType: 'basic',
    isEssential: true,
    householdAlternative: 'Container with a slot cut in the lid and flat objects to insert',
    category: 'Practical Life',
    priority: 14,
    activityCount: 1
  }
];

// Household items that most people already have
export const commonHouseholdItems = [
  // Kitchen and Dining
  'spoon', 'fork', 'knife', 'plate', 'bowl', 'cup', 'mug', 'napkin', 'dish towel',
  'measuring cup', 'measuring spoon', 'small pitcher', 'tray', 'container',
  
  // Cleaning Supplies
  'sponge', 'spray bottle', 'broom', 'dustpan', 'mop', 'bucket', 'cleaning cloth',
  'paper towels', 'soap', 'small brush',
  
  // Art and Craft Supplies
  'paper', 'pencil', 'pen', 'marker', 'crayon', 'scissors', 'glue', 'tape',
  'paint', 'paintbrush', 'construction paper', 'cardboard', 'string', 'yarn',
  
  // Storage and Organization
  'basket', 'box', 'bag', 'jar', 'container with lid',
  
  // Personal Care
  'tissue', 'cotton ball', 'cotton swab', 'small towel',
  
  // Natural Materials
  'water', 'sand', 'soil', 'rock', 'stone', 'leaf', 'stick', 'shell',
  'seed', 'flower', 'grass', 'pinecone', 'acorn', 'feather',
  
  // Food Items
  'rice', 'dried beans', 'pasta', 'cereal', 'flour', 'salt',
  'dried herbs', 'dried spices',
  
  // Tools
  'child-safe scissors', 'tongs', 'eyedropper', 'funnel', 'scoop'
];

/**
 * Check if material is a common household item
 */
export function isCommonHouseholdItem(materialName: string): boolean {
  const normalizedName = materialName.trim().toLowerCase();
  return commonHouseholdItems.some(item => normalizedName.includes(item.toLowerCase()));
}

/**
 * Get household alternative for a Montessori material
 */
export function getHouseholdAlternative(materialName: string): string {
  // Check starter kit first
  const material = essentialStarterKit.find(m => 
    materialName.toLowerCase().includes(m.name.toLowerCase())
  );
  
  if (material && material.householdAlternative) {
    return material.householdAlternative;
  }
  
  // More comprehensive list of alternatives
  const alternatives: Record<string, string> = {
    'golden bead': 'Groups of beans or other small objects arranged in units, tens, hundreds',
    'number rods': 'Painted craft sticks bundled together in increasing quantities',
    'spindle box': 'A divided container with small sticks or dowels for counting',
    'pink tower': 'Stacking cubes of decreasing size (can use blocks or boxes)',
    'brown stair': 'Rectangles of decreasing width (can use cardboard)',
    'red rods': 'Rods of increasing length (can use painted craft sticks)',
    'geometric cabinet': 'Cardboard shape templates and insets',
    'binomial cube': 'A 3D puzzle made from blocks with colored paper',
    'trinomial cube': 'A more complex 3D puzzle made from blocks with colored paper',
    'cylinder blocks': 'Containers of different sizes',
    'geometric solids': 'Household objects of various 3D shapes',
    'baric tablets': 'Wood pieces of different weights',
    'thermic tablets': 'Materials with different thermal conductivity',
    'dressing frames': 'Fabric pieces with various fastenings attached',
    'metal insets': 'Simple shape stencils'
  };
  
  const normalizedName = materialName.toLowerCase();
  for (const [key, value] of Object.entries(alternatives)) {
    if (normalizedName.includes(key.toLowerCase())) {
      return value;
    }
  }
  
  return 'Can be made with common household items';
}

/**
 * Fetch essential starter kit from Firestore 
 */
export async function getEssentialStarterKit(): Promise<EssentialMaterial[]> {
  try {
    // First try to get from materials collection
    const materialsRef = collection(db, 'materials');
    const materialsSnapshot = await getDocs(materialsRef);
    const allMaterials = materialsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as EssentialMaterial));
    
    // Convert to EssentialMaterial format
    const dbEssentialMaterials = allMaterials
      .filter(material => material.isEssential === true)
      .map(material => ({
        id: material.id,
        name: material.name,
        description: material.description || '',
        materialType: material.materialType || 'basic',
        isEssential: true,
        householdAlternative: material.householdAlternative || getHouseholdAlternative(material.name),
        amazonLink: material.amazonLink || '',
        affiliateLink: material.affiliateLink || '',
        category: material.category || 'Other',
        priority: material.priority || 999,
        imageUrl: material.imageUrl || '',
        activityCount: material.activityCount || 0,
        activities: material.activities || []
      }));
    
    // If we have DB materials, return them sorted by priority
    if (dbEssentialMaterials.length > 0) {
      return dbEssentialMaterials.sort((a, b) => a.priority - b.priority);
    }
    
    // Otherwise return our hardcoded list
    return essentialStarterKit;
  } catch (error) {
    console.error('Error getting essential starter kit:', error);
    return essentialStarterKit; // Fallback to hardcoded list
  }
}

/**
 * Check if user has Montessori kit (either purchased or marked several essential materials as owned)
 */
export async function userHasMontessoriKit(userId: string): Promise<boolean> {
  try {
    // Check if the user has already purchased a kit or marked themselves as having one
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (userDoc.exists() && userDoc.data().hasMontessoriKit) {
      return true;
    }
    
    // Get the essential materials
    const essentialMaterials = essentialStarterKit.map(m => m.id);
    
    // Check if they've marked essential Montessori materials as owned
    const userMaterialsQuery = query(
      collection(db, 'userMaterials'),
      where('userId', '==', userId),
      where('isOwned', '==', true)
    );
    
    const materialSnapshot = await getDocs(userMaterialsQuery);
    let ownedEssentialCount = 0;
    
    materialSnapshot.forEach(doc => {
      const materialId = doc.data().materialId;
      if (essentialMaterials.includes(materialId)) {
        ownedEssentialCount++;
      }
    });
    
    // If they own more than 30% of essential materials, consider them to have a kit
    return ownedEssentialCount >= Math.ceil(essentialMaterials.length * 0.3);
  } catch (error) {
    console.error('Error checking if user has Montessori kit:', error);
    return false; // Default to false on error
  }
}

/**
 * Get activities that can be completed with only household items
 */
export async function getHouseholdOnlyActivities(): Promise<string[]> {
  try {
    const activitiesRef = collection(db, 'activities');
    const activitiesSnapshot = await getDocs(activitiesRef);
    
    const householdActivityIds: string[] = [];
    
    activitiesSnapshot.forEach(doc => {
      const activity = doc.data();
      
      // If no materials needed or all are household items
      if (!activity.materialsNeeded || !Array.isArray(activity.materialsNeeded) || 
          activity.materialsNeeded.length === 0 ||
          activity.materialsNeeded.every(material => isCommonHouseholdItem(material))) {
        householdActivityIds.push(doc.id);
      }
    });
    
    return householdActivityIds;
  } catch (error) {
    console.error('Error getting household-only activities:', error);
    return [];
  }
}

/**
 * Get suggested materials for upgrade based on activities completed
 */
export async function getSuggestedUpgradeMaterials(
  userId: string,
  childId: string,
  activitiesCompleted: number
): Promise<EssentialMaterial[]> {
  try {
    // If they already have the kit, no need for suggestions
    const hasKit = await userHasMontessoriKit(userId);
    if (hasKit) {
      return [];
    }
    
    // Get essential kit materials
    const kitMaterials = await getEssentialStarterKit();
    
    // Get user's owned materials
    const userMaterialsQuery = query(
      collection(db, 'userMaterials'),
      where('userId', '==', userId),
      where('isOwned', '==', true)
    );
    
    const userMaterialsSnapshot = await getDocs(userMaterialsQuery);
    const ownedMaterialIds = new Set<string>();
    userMaterialsSnapshot.forEach(doc => {
      ownedMaterialIds.add(doc.data().materialId);
    });
    
    // Filter out already owned materials
    const neededMaterials = kitMaterials.filter(material => 
      !ownedMaterialIds.has(material.id)
    );
    
    // Based on activities completed, recommend a subset
    if (activitiesCompleted >= 5 && activitiesCompleted < 15) {
      // Basic starter - first 4-5 items
      return neededMaterials.slice(0, 5);
    } else if (activitiesCompleted >= 15) {
      // Complete kit recommendation
      return neededMaterials;
    }
    
    // Not enough activities completed yet
    return [];
  } catch (error) {
    console.error('Error getting suggested materials:', error);
    return [];
  }
} 