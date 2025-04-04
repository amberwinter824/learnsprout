// lib/materialsService.ts 
import { db } from './firebase';
import { 
  collection, 
  getDocs, 
  query, 
  where, 
  doc, 
  getDoc,
  addDoc,
  setDoc,
  serverTimestamp
} from 'firebase/firestore';
import { startOfDay, addDays, format } from 'date-fns';

// Material interface
export interface Material {
    id?: string;
    name: string;
    normalizedName: string;
    amazonLink: string;
    affiliateLink: string;  // Your Amazon affiliate link
    category?: string;      // Helpful for organizing (e.g., "art", "sensory", "practical_life")
    subcategory?: string;   // More specific grouping
    imageUrl?: string;      // Optional product image
    
    // Classification fields
    materialType: 'household' | 'basic' | 'advanced';
    householdAlternative?: string;
    isEssential: boolean;
    difficulty: number; // 1-3 scale
}

/**
 * Interface for tracking user materials
 */
export interface UserMaterial {
  userId: string;
  materialId: string;
  inInventory: boolean;
  addedAt?: Date;
}

/**
 * Interface for activity data
 */
interface Activity {
  id: string;
  materialsNeeded?: string[];
  [key: string]: any;
}

/**
 * Get all materials from the database
 */
export async function getAllMaterials(): Promise<Material[]> {
  try {
    const materialsRef = collection(db, 'materials');
    const snapshot = await getDocs(materialsRef);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Material));
  } catch (error) {
    console.error('Error getting all materials:', error);
    throw error;
  }
}

/**
 * Find the best material match from the database
 */
export async function findBestMaterialMatch(name: string): Promise<Material | null> {
  try {
    const normalizedInput = name.trim().toLowerCase();
    const allMaterials = await getAllMaterials();
    
    // Try exact match first
    const exactMatch = allMaterials.find(m => 
      m.normalizedName === normalizedInput
    );
    if (exactMatch) return exactMatch;
    
    // Try partial match
    const partialMatch = allMaterials.find(m => 
      m.normalizedName.includes(normalizedInput) || 
      normalizedInput.includes(m.normalizedName)
    );
    
    return partialMatch || null;
  } catch (error) {
    console.error('Error finding best material match:', error);
    return null;
  }
}

/**
 * Add a material to the database
 */
export async function addMaterial(material: Omit<Material, 'id'>): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, 'materials'), {
      ...material,
      normalizedName: material.normalizedName.toLowerCase()
    });
    return docRef.id;
  } catch (error) {
    console.error('Error adding material:', error);
    throw error;
  }
}

/**
 * Mark a material as owned or not owned by a user
 */
export async function updateUserMaterial(
  userId: string, 
  materialId: string, 
  isOwned: boolean
): Promise<void> {
  try {
    const docId = `${userId}_${materialId}`;
    const userMaterialRef = doc(db, 'userMaterials', docId);
    
    await setDoc(userMaterialRef, {
      userId,
      materialId,
      isOwned,
      updatedAt: serverTimestamp(),
      ...(isOwned ? { addedAt: serverTimestamp() } : {})
    }, { merge: true });
  } catch (error) {
    console.error('Error updating user material:', error);
    throw error;
  }
}

/**
 * Get all materials owned by a user
 */
export async function getUserMaterials(userId: string): Promise<string[]> {
  try {
    const userMaterialsQuery = query(
      collection(db, 'userMaterials'),
      where('userId', '==', userId),
      where('isOwned', '==', true)
    );
    
    const snapshot = await getDocs(userMaterialsQuery);
    return snapshot.docs.map(doc => doc.data().materialId);
  } catch (error) {
    console.error('Error getting user materials:', error);
    return [];
  }
}

/**
 * Check if a material is a common household item that most users would have
 */
export function isCommonHouseholdItem(materialName: string): boolean {
  const commonItems = [
    // Kitchen items
    'water', 'spoon', 'fork', 'knife', 'plate', 'bowl', 'cup', 'mug', 'napkin', 'paper towel',
    'towel', 'dish soap', 'sponge', 'container', 'basket', 'tray', 'measuring cup', 'measuring spoon',
    
    // Art supplies
    'paper', 'pencil', 'pen', 'marker', 'crayon', 'scissors', 'glue', 'tape', 'paint', 'brush',
    'coloring book', 'construction paper', 'cardboard', 'box', 'string', 'yarn', 'ribbon',
    
    // Household items
    'basket', 'container', 'box', 'bag', 'bottle', 'jar', 'lid', 'cloth', 'fabric', 'tissue',
    'cotton ball', 'cotton swab', 'sponge', 'brush', 'broom', 'dustpan', 'mop', 'rag',
    
    // Natural items
    'water', 'sand', 'dirt', 'soil', 'rock', 'stone', 'leaf', 'stick', 'shell', 'seed',
    'flower', 'grass', 'pinecone', 'acorn', 'feather',
    
    // Food items
    'rice', 'bean', 'pasta', 'cereal', 'flour', 'salt', 'sugar', 'spice', 'herb', 'fruit',
    'vegetable', 'grain', 'seed', 'nut', 'raisin', 'cracker', 'cookie', 'bread',
    
    // Cleaning items
    'soap', 'sponge', 'rag', 'towel', 'broom', 'dustpan', 'mop', 'bucket', 'spray bottle',
    
    // Basic tools
    'hammer', 'screwdriver', 'pliers', 'scissors', 'knife', 'spoon', 'fork', 'tongs', 'clamp',
    
    // Educational items
    'book', 'paper', 'pencil', 'pen', 'marker', 'crayon', 'chalk', 'board', 'card', 'puzzle',
    'block', 'bead', 'button', 'coin', 'key', 'lock', 'magnet', 'mirror', 'magnifying glass'
  ];
  
  const normalizedName = materialName.trim().toLowerCase();
  return commonItems.some(item => normalizedName.includes(item));
}

/**
 * Find activities that can be done with the materials a user already has
 */
export async function findActivitiesWithAvailableMaterials(
  userId: string, 
  childId: string,
  period: number = 90
): Promise<string[]> {
  try {
    // Get materials the user already has
    const userMaterialsSnapshot = await getDocs(
      query(
        collection(db, 'userMaterials'),
        where('userId', '==', userId),
        where('isOwned', '==', true)
      )
    );
    
    const ownedMaterialIds = userMaterialsSnapshot.docs.map(doc => doc.data().materialId);
    
    // Get all materials to create a lookup table
    const materialsSnapshot = await getDocs(collection(db, 'materials'));
    const materialsByName = new Map<string, Material>();
    
    materialsSnapshot.forEach(doc => {
      const data = doc.data() as Material;
      materialsByName.set(data.normalizedName, {
        id: doc.id,
        ...data
      });
    });
    
    // Calculate date range for forecast
    const today = startOfDay(new Date());
    const forecastEndDate = addDays(today, period);
    
    // Get weekly plans for this period
    const plansSnapshot = await getDocs(
      query(
        collection(db, 'weeklyPlans'),
        where('childId', '==', childId),
        where('weekStarting', '>=', format(today, 'yyyy-MM-dd')),
        where('weekStarting', '<=', format(forecastEndDate, 'yyyy-MM-dd'))
      )
    );
    
    // Extract all activities
    const activityIds: string[] = [];
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    
    plansSnapshot.forEach(doc => {
      const plan = doc.data();
      days.forEach(day => {
        if (plan[day] && Array.isArray(plan[day])) {
          plan[day].forEach((item: { activityId?: string }) => {
            if (item.activityId) {
              activityIds.push(item.activityId);
            }
          });
        }
      });
    });
    
    // Get unique activity IDs
    const uniqueActivityIds = [...new Set(activityIds)];
    
    // Get activity details
    const activitiesWithMaterials = await Promise.all(
      uniqueActivityIds.map(async id => {
        const activityDoc = await getDoc(doc(db, 'activities', id));
        if (activityDoc.exists()) {
          return {
            id,
            ...activityDoc.data()
          } as Activity;
        }
        return null;
      })
    );
    
    // Filter out null values
    const validActivities = activitiesWithMaterials.filter((a): a is Activity => a !== null);
    
    // Filter activities that can be done with owned materials
    const doableActivityIds: string[] = [];
    
    for (const activity of validActivities) {
      // Skip activities with no materials
      if (!activity.materialsNeeded || !Array.isArray(activity.materialsNeeded) || activity.materialsNeeded.length === 0) {
        // Activities with no required materials can always be done
        doableActivityIds.push(activity.id);
        continue;
      }
      
      // Check if all required materials are either owned or common household items
      const allMaterialsAvailable = activity.materialsNeeded.every((materialName: string) => {
        // Normalize the material name
        const normalizedName = materialName.trim().toLowerCase();
        
        // First check if it's a common household item
        if (isCommonHouseholdItem(normalizedName)) {
          return true;
        }
        
        // Then check if it's in our database and owned
        const material = materialsByName.get(normalizedName);
        if (!material) return false;
        
        return ownedMaterialIds.includes(material.id!);
      });
      
      // If all materials are available (either owned or common), include the activity
      if (allMaterialsAvailable) {
        doableActivityIds.push(activity.id);
      }
    }
    
    return doableActivityIds;
  } catch (error) {
    console.error('Error finding activities with available materials:', error);
    return [];
  }
}

/**
 * Classify materials by type: household, basic, advanced
 */
export function classifyMaterials(materials: Material[]): {
  household: Material[],
  basic: Material[],
  advanced: Material[]
} {
  return {
    household: materials.filter(m => m.materialType === 'household'),
    basic: materials.filter(m => m.materialType === 'basic'),
    advanced: materials.filter(m => m.materialType === 'advanced')
  };
}

/**
 * Get suggested materials for upgrade based on activities completed
 */
export async function getSuggestedMaterialsForUpgrade(
  userId: string,
  childId: string,
  activitiesCompleted: number
): Promise<Material[]> {
  // Get all planned activities for next 30 days
  const nextActivities = await getUpcomingActivities(childId, 30);
  
  // Get all materials needed for these activities
  const materialIds = new Set<string>();
  for (const activity of nextActivities) {
    for (const name of activity.materialsNeeded || []) {
      const material = await findMaterialByName(name);
      if (material && !isCommonHouseholdItem(name)) {
        materialIds.add(material.id!);
      }
    }
  }
  
  // Get material details
  const materials = await Promise.all(
    Array.from(materialIds).map(id => getMaterial(id))
  );
  
  // Basic kit for beginners (5+ activities)
  if (activitiesCompleted >= 5 && activitiesCompleted < 20) {
    return materials.filter((m: Material) => 
      m.materialType === 'basic' && 
      m.isEssential === true
    );
  }
  
  // Advanced materials for experienced users (20+ activities)
  if (activitiesCompleted >= 20) {
    return materials.filter((m: Material) => 
      (m.materialType === 'basic' || m.materialType === 'advanced') &&
      m.isEssential === true
    );
  }
  
  return [];
}

// Add missing function declarations
async function getUpcomingActivities(childId: string, days: number): Promise<Activity[]> {
  // Implementation would go here
  return [];
}

/**
 * Find material by name
 */
export async function findMaterialByName(name: string): Promise<Material | null> {
  try {
    const normalizedName = name.trim().toLowerCase();
    const materialsRef = collection(db, 'materials');
    const q = query(materialsRef, where('normalizedName', '==', normalizedName));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      return null;
    }
    
    const doc = snapshot.docs[0];
    return {
      id: doc.id,
      ...doc.data()
    } as Material;
  } catch (error) {
    console.error('Error finding material by name:', error);
    return null;
  }
}

async function getMaterial(id: string): Promise<Material> {
  // Implementation would go here
  return {} as Material;
}

