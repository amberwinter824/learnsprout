import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { collection, query, where, getDocs, doc, getDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { startOfDay, addDays, format } from 'date-fns';
import { Loader2, Package } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface Activity {
  id: string;
  title: string;
  materialsNeeded?: string[];
  [key: string]: any;
}

interface Material {
  id: string;
  name: string;
  normalizedName: string;
  amazonLink?: string;
  [key: string]: any;
}

interface AllChildrenMaterialsForecastProps {
  onMarkMaterialOwned: (materialId: string) => Promise<void>;
  selectedChildId?: string;
}

const AllChildrenMaterialsForecast = forwardRef<{ fetchMaterialsNeeded: () => void }, AllChildrenMaterialsForecastProps>(
  ({ onMarkMaterialOwned, selectedChildId }, ref) => {
    const { currentUser } = useAuth();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [materialsNeeded, setMaterialsNeeded] = useState<{
      material: string;
      materialId: string;
      count: number;
      activities: string[];
      amazonLink?: string;
    }[]>([]);
    const [ownedMaterials, setOwnedMaterials] = useState<string[]>([]);

    // Helper function to check if a material is a common household item
    function isCommonHouseholdItem(materialName: string): boolean {
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

    // Function to fetch materials needed
    const fetchMaterialsNeeded = async () => {
      if (!currentUser) return;

      try {
        setLoading(true);
        setError(null);

        // Get all children for the current user
        const childrenSnapshot = await getDocs(
          query(collection(db, 'children'), where('userId', '==', currentUser.uid))
        );

        const children = childrenSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        if (children.length === 0) {
          console.log('No children found for user');
          setMaterialsNeeded([]);
          setLoading(false);
          return;
        }

        // Filter children by selectedChildId if provided
        const targetChildren = selectedChildId 
          ? children.filter(child => child.id === selectedChildId)
          : children;

        if (targetChildren.length === 0) {
          console.log('No matching children found');
          setMaterialsNeeded([]);
          setLoading(false);
          return;
        }

        // Get user's owned materials
        const userMaterialsRef = collection(db, 'userMaterials');
        const userMaterialsQuery = query(
          userMaterialsRef,
          where('userId', '==', currentUser.uid),
          where('inInventory', '==', true)
        );
        
        const userMaterialsSnapshot = await getDocs(userMaterialsQuery);
        const ownedMaterialIds = userMaterialsSnapshot.docs.map(doc => doc.data().materialId);
        setOwnedMaterials(ownedMaterialIds);

        // Calculate date range for forecast (next 90 days)
        const today = startOfDay(new Date());
        const forecastEndDate = addDays(today, 90);

        console.log('Debug - Query parameters:', {
          userId: currentUser.uid,
          childIds: targetChildren.map(child => child.id),
          dateRange: {
            start: today.toISOString(),
            end: forecastEndDate.toISOString()
          }
        });

        // First, let's try to get all plans for the user without date filtering
        const plansSnapshot = await getDocs(
          query(
            collection(db, 'weeklyPlans'),
            where('userId', '==', currentUser.uid),
            where('childId', 'in', targetChildren.map(child => child.id))
          )
        );

        console.log(`Found ${plansSnapshot.size} weekly plans total`);
        plansSnapshot.forEach(doc => {
          const plan = doc.data();
          console.log('Plan details:', {
            id: doc.id,
            weekStarting: plan.weekStarting?.toDate?.()?.toISOString(),
            childId: plan.childId,
            userId: plan.userId
          });
        });

        // Filter plans in memory to ensure we're not missing any due to timestamp comparison issues
        const filteredPlans = plansSnapshot.docs.filter(doc => {
          const plan = doc.data();
          const weekStarting = plan.weekStarting?.toDate?.();
          if (!weekStarting) return false;
          
          // Convert both dates to start of day for accurate comparison
          const planStart = startOfDay(weekStarting);
          const todayStart = startOfDay(today);
          const endDateStart = startOfDay(forecastEndDate);
          
          return planStart >= todayStart && planStart <= endDateStart;
        });

        console.log(`Filtered to ${filteredPlans.length} plans within date range`);

        // Extract all activities from all plans
        const activityIds = new Set<string>();
        const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

        filteredPlans.forEach(doc => {
          const plan = doc.data();
          console.log('Processing plan:', {
            id: doc.id,
            weekStarting: plan.weekStarting?.toDate?.()?.toISOString()
          });
          
          days.forEach(day => {
            const dayActivities = plan[day] || [];
            dayActivities.forEach((activity: any) => {
              if (activity.activityId) {
                activityIds.add(activity.activityId);
              }
            });
          });
        });

        console.log(`Found ${activityIds.size} unique activities`);

        // Get all activities with their materials
        const activities: Activity[] = [];
        for (const activityId of activityIds) {
          const activityDoc = await getDoc(doc(db, 'activities', activityId));
          if (activityDoc.exists()) {
            const data = activityDoc.data();
            console.log(`Activity ${activityId} materials:`, data.materialsNeeded);
            if (data.materialsNeeded && Array.isArray(data.materialsNeeded) && data.materialsNeeded.length > 0) {
              activities.push({
                id: activityId,
                title: data.title || 'Untitled Activity',
                materialsNeeded: data.materialsNeeded
              });
            }
          }
        }

        console.log(`Found ${activities.length} activities with materials:`, activities);

        // Get all materials to create a lookup table
        const materialsSnapshot = await getDocs(collection(db, 'materials'));
        const materialsByName = new Map<string, Material>();

        materialsSnapshot.forEach(doc => {
          const data = doc.data() as Material;
          materialsByName.set(data.name.toLowerCase(), {
            ...data,
            id: doc.id
          });
        });

        console.log(`Found ${materialsByName.size} materials in database`);

        // Count materials needed
        const materialsCount = new Map<string, { count: number; activities: Set<string> }>();

        activities.forEach(activity => {
          if (!activity.materialsNeeded || !Array.isArray(activity.materialsNeeded)) return;

          activity.materialsNeeded.forEach(materialName => {
            const normalizedName = materialName.trim().toLowerCase();
            
            // Skip common household items
            if (isCommonHouseholdItem(normalizedName)) return;

            if (!materialsCount.has(normalizedName)) {
              materialsCount.set(normalizedName, { count: 0, activities: new Set() });
            }

            const material = materialsCount.get(normalizedName)!;
            material.count++;
            material.activities.add(activity.title || 'Unknown Activity');
          });
        });

        // Convert to array and sort by count
        const materialsArray = Array.from(materialsCount.entries()).map(([material, data]) => {
          const materialDoc = materialsByName.get(material.toLowerCase());
          return {
            material,
            materialId: materialDoc?.id || '',
            count: data.count,
            activities: Array.from(data.activities),
            amazonLink: materialDoc?.amazonLink || ''
          };
        })
        .filter(item => !ownedMaterialIds.includes(item.materialId))
        .sort((a, b) => b.count - a.count);

        console.log(`Found ${materialsArray.length} materials needed for activities`);
        setMaterialsNeeded(materialsArray);
      } catch (err) {
        console.error('Error fetching materials forecast:', err);
        setError('Failed to load materials forecast');
      } finally {
        setLoading(false);
      }
    };

    // Expose fetchMaterialsNeeded to parent
    useImperativeHandle(ref, () => ({
      fetchMaterialsNeeded
    }));

    // Initial fetch of materials needed
    useEffect(() => {
      fetchMaterialsNeeded();
    }, [currentUser]);

    if (loading) {
      return (
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="bg-white shadow rounded-lg p-6">
          <div className="text-red-600">{error}</div>
        </div>
      );
    }

    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center mb-4">
          <Package className="h-5 w-5 text-emerald-500 mr-2" />
          <h3 className="text-lg font-medium text-gray-900">Materials Needed</h3>
        </div>

        {materialsNeeded.length > 0 ? (
          <div className="space-y-4">
            {materialsNeeded.map((item, index) => (
              <div key={index} className="border-b border-gray-100 last:border-0 pb-4 last:pb-0">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-medium text-gray-900 capitalize">{item.material}</h4>
                    <p className="text-sm text-gray-500">
                      Needed for {item.count} {item.count === 1 ? 'activity' : 'activities'}
                    </p>
                  </div>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                    {item.count}
                  </span>
                </div>
                <div className="mt-2 flex items-center space-x-2">
                  <button
                    onClick={() => onMarkMaterialOwned(item.materialId)}
                    className="px-2 py-1 text-xs bg-emerald-100 text-emerald-700 rounded-md hover:bg-emerald-200"
                  >
                    Mark as Owned
                  </button>
                  {item.amazonLink && (
                    <a
                      href={item.amazonLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200"
                    >
                      Buy on Amazon
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-sm">No materials needed for upcoming activities.</p>
        )}
      </div>
    );
  }
);

AllChildrenMaterialsForecast.displayName = 'AllChildrenMaterialsForecast';

export default AllChildrenMaterialsForecast; 