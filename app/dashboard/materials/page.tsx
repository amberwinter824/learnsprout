'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, updateDoc, setDoc } from 'firebase/firestore';
import { Loader2, Package, Plus, Search, CheckCircle, XCircle, ExternalLink, X } from 'lucide-react';
import MaterialsAssessment from '@/components/parent/MaterialsAssessment';

interface Material {
  id: string;
  name: string;
  normalizedName: string;
  category: string;
  description: string;
  quantity: number;
  unit: string;
  isReusable: boolean;
  isOptional: boolean;
  amazonLink: string;
  affiliateLink: string;
  activities: string[];
  alternativeNames: string[];
  isOwned: boolean;
  materialType?: string;
  householdAlternative?: string;
  isNeededForUpcoming?: boolean;
}

interface Activity {
  id: string;
  title: string;
  materialsNeeded: string[];
  scheduledDate?: Date;
}

export default function MaterialsInventory() {
  const { currentUser } = useAuth();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [updatingMaterial, setUpdatingMaterial] = useState<string | null>(null);
  const [children, setChildren] = useState<{ id: string; name: string; age: number; ageGroup: string }[]>([]);
  const [upcomingActivities, setUpcomingActivities] = useState<Activity[]>([]);

  const fetchUpcomingActivities = async () => {
    if (!currentUser?.uid) return;

    try {
      // Get all children
      const childrenQuery = query(
        collection(db, 'children'),
        where('userId', '==', currentUser.uid)
      );
      const childrenSnapshot = await getDocs(childrenQuery);
      const childrenIds = childrenSnapshot.docs.map(doc => doc.id);

      // Get upcoming activities for all children
      const activitiesQuery = query(
        collection(db, 'activities'),
        where('childId', 'in', childrenIds),
        where('scheduledDate', '>=', new Date())
      );
      const activitiesSnapshot = await getDocs(activitiesQuery);
      const activities = activitiesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Activity[];

      setUpcomingActivities(activities);
    } catch (error) {
      console.error('Error fetching upcoming activities:', error);
    }
  };

  const fetchMaterials = async () => {
    if (!currentUser?.uid) return;

    try {
      setLoading(true);
      
      // Get all materials
      const materialsRef = collection(db, 'materials');
      const materialsSnapshot = await getDocs(materialsRef);
      const allMaterials = materialsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Material[];

      // Get user's owned materials
      const userMaterialsRef = collection(db, 'userMaterials');
      const userMaterialsQuery = query(
        userMaterialsRef,
        where('userId', '==', currentUser.uid),
        where('isOwned', '==', true)
      );
      const userMaterialsSnapshot = await getDocs(userMaterialsQuery);
      const ownedMaterialIds = new Set(userMaterialsSnapshot.docs.map(doc => doc.data().materialId));

      // Get materials needed for upcoming activities
      const neededMaterialIds = new Set(
        upcomingActivities.flatMap(activity => activity.materialsNeeded)
      );

      // Combine materials with ownership and needed status
      const materialsWithStatus = allMaterials.map(material => ({
        ...material,
        isOwned: ownedMaterialIds.has(material.id) || false,
        isNeededForUpcoming: neededMaterialIds.has(material.id) && !ownedMaterialIds.has(material.id)
      }));
      
      setMaterials(materialsWithStatus);
    } catch (error) {
      console.error('Error fetching materials:', error);
      setError('Failed to load materials');
    } finally {
      setLoading(false);
    }
  };

  // Fetch both materials and upcoming activities when the component mounts
  useEffect(() => {
    if (currentUser) {
      Promise.all([
        fetchUpcomingActivities(),
        fetchMaterials()
      ]).catch(error => {
        console.error('Error in initial data fetch:', error);
        setError('Failed to load data');
      });
    }
  }, [currentUser]);

  // Update materials when upcoming activities change
  useEffect(() => {
    if (materials.length > 0 && upcomingActivities.length > 0) {
      const neededMaterialIds = new Set(
        upcomingActivities.flatMap(activity => activity.materialsNeeded)
      );

      setMaterials(prevMaterials => 
        prevMaterials.map(material => ({
          ...material,
          isNeededForUpcoming: neededMaterialIds.has(material.id) && !material.isOwned
        }))
      );
    }
  }, [upcomingActivities]);

  useEffect(() => {
    const fetchChildren = async () => {
      if (!currentUser?.uid) return;

      try {
        const childrenQuery = query(
          collection(db, 'children'),
          where('userId', '==', currentUser.uid)
        );
        const childrenSnapshot = await getDocs(childrenQuery);
        const childrenData = childrenSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            name: data.name,
            age: data.age || 0,
            ageGroup: data.ageGroup || ''
          };
        });
        setChildren(childrenData);
      } catch (error) {
        console.error('Error fetching children:', error);
      }
    };

    fetchChildren();
  }, [currentUser]);

  const toggleMaterialOwnership = async (materialId: string, currentStatus: boolean) => {
    if (!currentUser) return;

    try {
      setUpdatingMaterial(materialId);
      const userMaterialRef = doc(db, 'userMaterials', `${currentUser.uid}_${materialId}`);
      
      if (currentStatus) {
        // Remove ownership
        await updateDoc(userMaterialRef, { isOwned: false });
      } else {
        // Add ownership
        await setDoc(userMaterialRef, {
          userId: currentUser.uid,
          materialId: materialId,
          isOwned: true,
          addedAt: new Date()
        });
      }

      // Update local state
      setMaterials(prevMaterials =>
        prevMaterials.map(material =>
          material.id === materialId
            ? { ...material, isOwned: !currentStatus }
            : material
        )
      );
    } catch (error) {
      console.error('Error updating material ownership:', error);
      setError('Failed to update material status');
    } finally {
      setUpdatingMaterial(null);
    }
  };

  const filteredMaterials = materials.filter(material => {
    return material.name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const groupedMaterials = filteredMaterials.reduce((acc, material) => {
    const type = material.materialType || 'other';
    if (!acc[type]) {
      acc[type] = [];
    }
    acc[type].push(material);
    return acc;
  }, {} as Record<string, Material[]>);

  // Sort materials within each group
  Object.keys(groupedMaterials).forEach(type => {
    groupedMaterials[type].sort((a, b) => {
      // Sort by whether they're needed for upcoming activities
      if (a.isNeededForUpcoming && !b.isNeededForUpcoming) return -1;
      if (!a.isNeededForUpcoming && b.isNeededForUpcoming) return 1;
      // Then by ownership status
      if (a.isOwned && !b.isOwned) return -1;
      if (!a.isOwned && b.isOwned) return 1;
      // Then alphabetically
      return a.name.localeCompare(b.name);
    });
  });

  const materialTypeLabels: Record<string, string> = {
    'household': 'Common Household Items',
    'basic': 'Basic Montessori Materials',
    'advanced': 'Advanced Montessori Materials',
    'other': 'Other Materials'
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500 mx-auto mb-4" />
          <p className="text-gray-500">Loading materials...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Materials Inventory</h1>
        <p className="mt-2 text-gray-600">
          Track what materials you have available and see alternatives using common household items.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-md mb-6">
          {error}
          <button onClick={() => setError(null)} className="float-right">
            <X className="h-5 w-5" />
          </button>
        </div>
      )}

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search materials..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-md w-full focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
        </div>
      </div>

      {Object.entries(groupedMaterials).map(([type, materials]) => (
        <div key={type} className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            {materialTypeLabels[type]}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {materials.map((material) => (
              <div
                key={material.id}
                className={`bg-white rounded-lg shadow-sm overflow-hidden border ${
                  material.isNeededForUpcoming ? 'border-amber-200' : 'border-gray-200'
                }`}
              >
                <div className="px-4 py-5 sm:p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-medium text-gray-900">
                        {material.name}
                        {material.isNeededForUpcoming && (
                          <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                            Needed Soon
                          </span>
                        )}
                      </h3>
                      <p className="mt-1 text-sm text-gray-500">{material.description}</p>
                    </div>
                    <button
                      onClick={() => toggleMaterialOwnership(material.id, material.isOwned)}
                      disabled={!!updatingMaterial}
                      className={`ml-4 flex-shrink-0 ${
                        updatingMaterial === material.id ? 'opacity-50 cursor-wait' : ''
                      }`}
                    >
                      {material.isOwned ? (
                        <CheckCircle className="h-6 w-6 text-emerald-500" />
                      ) : (
                        <XCircle className="h-6 w-6 text-gray-300" />
                      )}
                    </button>
                  </div>
                  
                  {material.householdAlternative && (
                    <div className="mt-3 text-sm">
                      <p className="text-gray-600">
                        <span className="font-medium">Household Alternative:</span>{' '}
                        {material.householdAlternative}
                      </p>
                    </div>
                  )}

                  {material.amazonLink && (
                    <div className="mt-3">
                      <a
                        href={material.amazonLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-sm text-emerald-600 hover:text-emerald-700"
                      >
                        View on Amazon
                        <ExternalLink className="ml-1 h-4 w-4" />
                      </a>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
} 