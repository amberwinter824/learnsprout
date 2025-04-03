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
  category?: string;
  description?: string;
  amazonLink?: string;
  affiliateLink?: string;
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
  const [selectedChild, setSelectedChild] = useState<{ id: string; name: string; age: number } | null>(null);

  const fetchMaterials = async () => {
    try {
      setLoading(true);
      const materialsRef = collection(db, 'materials');
      const q = query(materialsRef, where('userId', '==', currentUser?.uid));
      const querySnapshot = await getDocs(q);
      
      const materialsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Material[];
      
      setMaterials(materialsData);
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
          onClick={() => setShowAssessment(true)}
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
                <h3 className="font-medium text-gray-900">{material.name}</h3>
                {material.category && (
                  <p className="text-sm text-gray-500 mt-1">{material.category}</p>
                )}
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
      {showAssessment && selectedChild && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-lg bg-white">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                Materials Assessment for {selectedChild.name}
              </h2>
              <button 
                onClick={() => {
                  setShowAssessment(false);
                  setSelectedChild(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <MaterialsAssessment
              childId={selectedChild.id}
              childAge={selectedChild.age}
              childName={selectedChild.name}
              onComplete={() => {
                setShowAssessment(false);
                setSelectedChild(null);
                // Optionally refresh materials list
                fetchMaterials();
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
} 