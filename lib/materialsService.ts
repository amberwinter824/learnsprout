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
    imageUrl?: string;      // Optional product image
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
  inInventory: boolean
): Promise<void> {
  try {
    const docId = `${userId}_${materialId}`;
    const userMaterialRef = doc(db, 'userMaterials', docId);
    
    await setDoc(userMaterialRef, {
      userId,
      materialId,
      inInventory,
      updatedAt: serverTimestamp(),
      ...(inInventory ? { addedAt: serverTimestamp() } : {})
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
      where('inInventory', '==', true)
    );
    
    const snapshot = await getDocs(userMaterialsQuery);
    return snapshot.docs.map(doc => doc.data().materialId);
  } catch (error) {
    console.error('Error getting user materials:', error);
    return [];
  }
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
        where('inInventory', '==', true)
      )
    );
    
    const ownedMaterialIds = userMaterialsSnapshot.docs.map(doc => doc.data().materialId);
    
    // If the user doesn't have any materials, return empty array
    if (ownedMaterialIds.length === 0) {
      return [];
    }
    
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
      
      // Check if all required materials are owned
      const allMaterialsOwned = activity.materialsNeeded.every((materialName: string) => {
        // Normalize the material name
        const normalizedName = materialName.trim().toLowerCase();
        
        // Look up the material in our map
        const material = materialsByName.get(normalizedName);
        
        // If the material isn't in our database, we can't check if it's owned
        if (!material) return false;
        
        // Check if the user owns this material
        return ownedMaterialIds.includes(material.id!);
      });
      
      if (allMaterialsOwned) {
        doableActivityIds.push(activity.id);
      }
    }
    
    return doableActivityIds;
  } catch (error) {
    console.error('Error finding activities with available materials:', error);
    return [];
  }
}

