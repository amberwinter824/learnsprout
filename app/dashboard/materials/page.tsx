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

  // Define the order of material types
  const materialTypeOrder = ['household', 'basic', 'advanced', 'other'];

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
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Materials Inventory</h1>
      
      <div className="mb-6">
        <div className="relative">
          <input
            type="text"
            placeholder="Search materials..."
            className="w-full pl-10 pr-4 py-2 border rounded-lg"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {materialTypeOrder.map(type => {
        if (!groupedMaterials[type]?.length) return null;
        
        return (
          <div key={type} className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">{materialTypeLabels[type]}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {groupedMaterials[type].map(material => (
                <div
                  key={material.id}
                  className={`p-4 rounded-lg border ${
                    material.isOwned ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-medium">{material.name}</h3>
                    <button
                      onClick={() => toggleMaterialOwnership(material.id, material.isOwned)}
                      disabled={!!updatingMaterial}
                      className="ml-2 text-sm"
                    >
                      {updatingMaterial === material.id ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : material.isOwned ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <XCircle className="h-5 w-5 text-gray-300" />
                      )}
                    </button>
                  </div>
                  
                  {material.isNeededForUpcoming && !material.isOwned && (
                    <div className="mb-2 text-sm bg-yellow-100 text-yellow-800 px-2 py-1 rounded inline-block">
                      Needed for upcoming activity
                    </div>
                  )}
                  
                  <p className="text-sm text-gray-600 mb-2">{material.description}</p>
                  
                  {material.householdAlternative && (
                    <p className="text-sm text-blue-600 mb-2">
                      Alternative: {material.householdAlternative}
                    </p>
                  )}
                  
                  {material.alternativeNames && material.alternativeNames.length > 1 && (
                    <p className="text-sm text-gray-500 mb-2">
                      Also known as: {material.alternativeNames.filter(name => name !== material.name).join(', ')}
                    </p>
                  )}
                  
                  {material.amazonLink && (
                    <a
                      href={material.amazonLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-500 hover:text-blue-700 flex items-center gap-1"
                    >
                      View on Amazon <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
} 