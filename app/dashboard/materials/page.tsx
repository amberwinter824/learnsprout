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
}

export default function MaterialsInventory() {
  const { currentUser } = useAuth();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'owned' | 'needed'>('all');
  const [showAssessment, setShowAssessment] = useState(false);
  const [selectedChild, setSelectedChild] = useState<{ id: string; name: string; age: number; ageGroup: string } | null>(null);
  const [children, setChildren] = useState<{ id: string; name: string; age: number; ageGroup: string }[]>([]);

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

      // Combine materials with ownership status
      const materialsWithOwnership = allMaterials.map(material => ({
        ...material,
        isOwned: ownedMaterialIds.has(material.id) || false
      }));
      
      setMaterials(materialsWithOwnership);
    } catch (error) {
      console.error('Error fetching materials:', error);
      setError('Failed to load materials');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchMaterials();
    }
  }, [currentUser]);

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
    }
  };

  const filteredMaterials = materials.filter(material => {
    const matchesSearch = material.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = 
      filter === 'all' ||
      (filter === 'owned' && material.isOwned) ||
      (filter === 'needed' && !material.isOwned);
    
    return matchesSearch && matchesFilter;
  });

  const handleAssessmentClick = () => {
    if (children.length === 0) {
      setError('Please add a child before assessing materials');
      return;
    }
    if (children.length === 1) {
      setSelectedChild(children[0]);
      setShowAssessment(true);
    } else {
      // If multiple children, show child selection
      setShowAssessment(true);
    }
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
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Materials Inventory</h1>
          <p className="mt-2 text-gray-600">
            Manage your materials and track what you have available for activities.
          </p>
        </div>
        <button
          onClick={handleAssessmentClick}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-emerald-600 hover:bg-emerald-700"
        >
          <Package className="h-4 w-4 mr-2" />
          Update Materials Assessment
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-md mb-6">
          {error}
        </div>
      )}

      {/* Filters and Search */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
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
        
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-md ${
              filter === 'all'
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All Materials
          </button>
          <button
            onClick={() => setFilter('owned')}
            className={`px-4 py-2 rounded-md ${
              filter === 'owned'
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Owned
          </button>
          <button
            onClick={() => setFilter('needed')}
            className={`px-4 py-2 rounded-md ${
              filter === 'needed'
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Needed
          </button>
        </div>
      </div>

      {/* Materials Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredMaterials.map(material => (
          <div
            key={material.id}
            className="bg-white border border-gray-200 rounded-lg p-4 hover:border-emerald-300 transition-colors"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-medium text-gray-900">
                  {material.name}
                  {material.quantity > 1 && ` (${material.quantity} ${material.unit}s)`}
                  {material.isOptional && <span className="ml-2 text-sm text-gray-500">(Optional)</span>}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm text-gray-500">{material.category}</span>
                  {material.isReusable && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                      Reusable
                    </span>
                  )}
                </div>
                {material.description && (
                  <p className="text-sm text-gray-600 mt-2">{material.description}</p>
                )}
                {(material.amazonLink || material.affiliateLink) && (
                  <div className="mt-2">
                    {material.affiliateLink && (
                      <a
                        href={material.affiliateLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 text-sm flex items-center mr-3 mb-1"
                      >
                        Buy (Affiliate Link)
                        <ExternalLink className="h-3 w-3 ml-1" />
                      </a>
                    )}
                    {material.amazonLink && !material.affiliateLink && (
                      <a
                        href={material.amazonLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
                      >
                        Buy on Amazon
                        <ExternalLink className="h-3 w-3 ml-1" />
                      </a>
                    )}
                  </div>
                )}
              </div>
              <button
                onClick={() => toggleMaterialOwnership(material.id, material.isOwned)}
                className={`p-2 rounded-full ${
                  material.isOwned
                    ? 'text-green-600 bg-green-50 hover:bg-green-100'
                    : 'text-gray-400 bg-gray-50 hover:bg-gray-100'
                }`}
                title={material.isOwned ? 'Mark as not owned' : 'Mark as owned'}
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

      {filteredMaterials.length === 0 && (
        <div className="text-center py-12">
          <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No materials found</h3>
          <p className="text-gray-500">
            {searchTerm
              ? 'Try adjusting your search terms'
              : filter === 'owned'
              ? 'You haven\'t marked any materials as owned yet'
              : filter === 'needed'
              ? 'You have all the materials you need'
              : 'No materials available'}
          </p>
        </div>
      )}

      {/* Materials Assessment Modal */}
      {showAssessment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Materials Assessment</h2>
                <button
                  onClick={() => {
                    setShowAssessment(false);
                    setSelectedChild(null);
                  }}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              {!selectedChild && children.length > 1 ? (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900">Select a Child</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {children.map(child => (
                      <button
                        key={child.id}
                        onClick={() => setSelectedChild(child)}
                        className="p-4 border border-gray-200 rounded-lg hover:border-emerald-300 hover:bg-emerald-50 transition-colors text-left"
                      >
                        <h4 className="font-medium text-gray-900">{child.name}</h4>
                        <p className="text-sm text-gray-500">{child.ageGroup || 'Age not set'}</p>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <MaterialsAssessment
                  childId={selectedChild?.id || ''}
                  childName={selectedChild?.name || ''}
                  onComplete={() => {
                    setShowAssessment(false);
                    setSelectedChild(null);
                    fetchMaterials(); // Refresh materials list
                  }}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 