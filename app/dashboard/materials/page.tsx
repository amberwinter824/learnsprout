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
          Manage your materials and track what you have available for activities.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-md mb-6">
          {error}
        </div>
      )}

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search materials..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Household Items Section */}
      <div className="mb-12">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-emerald-600">Household Items</h2>
          <span className="text-sm text-gray-500">
            {groupedMaterials.household?.filter(m => m.isOwned).length || 0} of {groupedMaterials.household?.length || 0} owned
          </span>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          These are common items you likely already have at home. Check off what you have available.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {groupedMaterials.household?.map(material => (
            <div 
              key={material.id} 
              className={`bg-white border rounded-lg p-4 ${
                material.isNeededForUpcoming 
                  ? 'border-amber-300 bg-amber-50' 
                  : 'border-gray-200'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-gray-900">
                      {material.name}
                      {material.quantity > 1 && ` (${material.quantity} ${material.unit}s)`}
                    </h3>
                    {material.isNeededForUpcoming && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
                        Needed Soon
                      </span>
                    )}
                  </div>
                  {material.description && (
                    <p className="text-sm text-gray-600 mt-1">{material.description}</p>
                  )}
                </div>
                <button
                  onClick={() => toggleMaterialOwnership(material.id, material.isOwned)}
                  className={`p-2 rounded-full ${
                    material.isOwned
                      ? 'text-green-600 bg-green-50 hover:bg-green-100'
                      : 'text-gray-400 bg-gray-50 hover:bg-gray-100'
                  }`}
                  disabled={updatingMaterial === material.id}
                >
                  {material.isOwned ? (
                    <CheckCircle className="h-5 w-5" />
                  ) : (
                    <XCircle className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Basic Materials Section */}
      <div className="mb-12">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-blue-600">Basic Montessori Materials</h2>
          <span className="text-sm text-gray-500">
            {groupedMaterials.basic?.filter(m => m.isOwned).length || 0} of {groupedMaterials.basic?.length || 0} owned
          </span>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          These are the core materials that will help you get started with Montessori activities.
          Many have household alternatives you can use while you build your collection.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {groupedMaterials.basic?.map(material => (
            <div 
              key={material.id} 
              className={`bg-white border rounded-lg p-4 ${
                material.isNeededForUpcoming 
                  ? 'border-amber-300 bg-amber-50' 
                  : 'border-gray-200'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-gray-900">
                      {material.name}
                      {material.quantity > 1 && ` (${material.quantity} ${material.unit}s)`}
                    </h3>
                    {material.isNeededForUpcoming && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
                        Needed Soon
                      </span>
                    )}
                  </div>
                  {material.householdAlternative && (
                    <p className="text-sm text-gray-500 mt-1">
                      Alternative: {material.householdAlternative}
                    </p>
                  )}
                  {material.description && (
                    <p className="text-sm text-gray-600 mt-1">{material.description}</p>
                  )}
                  {(material.amazonLink || material.affiliateLink) && (
                    <a
                      href={material.affiliateLink || material.amazonLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center text-sm text-emerald-600 hover:text-emerald-700"
                    >
                      <ExternalLink className="h-4 w-4 mr-1" />
                      Buy on Amazon
                    </a>
                  )}
                </div>
                <button
                  onClick={() => toggleMaterialOwnership(material.id, material.isOwned)}
                  className={`p-2 rounded-full ${
                    material.isOwned
                      ? 'text-green-600 bg-green-50 hover:bg-green-100'
                      : 'text-gray-400 bg-gray-50 hover:bg-gray-100'
                  }`}
                  disabled={updatingMaterial === material.id}
                >
                  {material.isOwned ? (
                    <CheckCircle className="h-5 w-5" />
                  ) : (
                    <XCircle className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Advanced Materials Section */}
      <div className="mb-12">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-purple-600">Advanced Materials</h2>
          <span className="text-sm text-gray-500">
            {groupedMaterials.advanced?.filter(m => m.isOwned).length || 0} of {groupedMaterials.advanced?.length || 0} owned
          </span>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          These are specialized materials that can be added as your child progresses.
          Focus on the basic materials first.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {groupedMaterials.advanced?.map(material => (
            <div 
              key={material.id} 
              className={`bg-white border rounded-lg p-4 ${
                material.isNeededForUpcoming 
                  ? 'border-amber-300 bg-amber-50' 
                  : 'border-gray-200'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-gray-900">
                      {material.name}
                      {material.quantity > 1 && ` (${material.quantity} ${material.unit}s)`}
                    </h3>
                    {material.isNeededForUpcoming && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
                        Needed Soon
                      </span>
                    )}
                  </div>
                  {material.description && (
                    <p className="text-sm text-gray-600 mt-1">{material.description}</p>
                  )}
                  {(material.amazonLink || material.affiliateLink) && (
                    <a
                      href={material.affiliateLink || material.amazonLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center text-sm text-emerald-600 hover:text-emerald-700"
                    >
                      <ExternalLink className="h-4 w-4 mr-1" />
                      Buy on Amazon
                    </a>
                  )}
                </div>
                <button
                  onClick={() => toggleMaterialOwnership(material.id, material.isOwned)}
                  className={`p-2 rounded-full ${
                    material.isOwned
                      ? 'text-green-600 bg-green-50 hover:bg-green-100'
                      : 'text-gray-400 bg-gray-50 hover:bg-gray-100'
                  }`}
                  disabled={updatingMaterial === material.id}
                >
                  {material.isOwned ? (
                    <CheckCircle className="h-5 w-5" />
                  ) : (
                    <XCircle className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 