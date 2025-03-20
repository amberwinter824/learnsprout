import { useState, useEffect } from 'react';
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
  [key: string]: any;
}

export default function AllChildrenMaterialsForecast() {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [materialsNeeded, setMaterialsNeeded] = useState<{
    material: string;
    count: number;
    activities: string[];
  }[]>([]);

  useEffect(() => {
    async function fetchMaterialsNeeded() {
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

        console.log(`Found ${children.length} children for user`);

        // Calculate date range for forecast (next 90 days)
        const today = startOfDay(new Date());
        const forecastEndDate = addDays(today, 90);

        // Get all weekly plans for all children in this period
        const plansSnapshot = await getDocs(
          query(
            collection(db, 'weeklyPlans'),
            where('userId', '==', currentUser.uid),
            where('weekStarting', '>=', format(today, 'yyyy-MM-dd')),
            where('weekStarting', '<=', format(forecastEndDate, 'yyyy-MM-dd'))
          )
        );

        console.log(`Found ${plansSnapshot.size} weekly plans`);

        // Extract all activities from all plans
        const activityIds = new Set<string>();
        const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

        plansSnapshot.forEach(doc => {
          const plan = doc.data();
          days.forEach(day => {
            if (plan[day] && Array.isArray(plan[day])) {
              plan[day].forEach((item: { activityId?: string }) => {
                if (item.activityId) {
                  activityIds.add(item.activityId);
                }
              });
            }
          });
        });

        console.log(`Found ${activityIds.size} unique activities`);

        // Get all activities with their materials
        const activities: Activity[] = [];
        for (const activityId of activityIds) {
          const activityDoc = await getDoc(doc(db, 'activities', activityId));
          if (activityDoc.exists()) {
            const data = activityDoc.data();
            if (data.materialsNeeded && Array.isArray(data.materialsNeeded)) {
              activities.push({
                id: activityDoc.id,
                title: data.title || 'Untitled Activity',
                materialsNeeded: data.materialsNeeded
              });
            }
          }
        }

        console.log(`Found ${activities.length} activities with materials`);

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
        const materialsArray = Array.from(materialsCount.entries()).map(([material, data]) => ({
          material,
          count: data.count,
          activities: Array.from(data.activities)
        })).sort((a, b) => b.count - a.count);

        console.log(`Found ${materialsArray.length} materials needed for activities`);
        setMaterialsNeeded(materialsArray);
      } catch (err) {
        console.error('Error fetching materials forecast:', err);
        setError('Failed to load materials forecast');
      } finally {
        setLoading(false);
      }
    }

    fetchMaterialsNeeded();
  }, [currentUser]);

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
              <div className="mt-2">
                <p className="text-sm text-gray-600">Activities:</p>
                <ul className="mt-1 text-sm text-gray-500 list-disc list-inside">
                  {item.activities.slice(0, 3).map((activity, idx) => (
                    <li key={idx}>{activity}</li>
                  ))}
                  {item.activities.length > 3 && (
                    <li>...and {item.activities.length - 3} more</li>
                  )}
                </ul>
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