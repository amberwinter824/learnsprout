// app/admin/materials/page.tsx

// Add form fields for:
// - Material name
// - Amazon product link
// - Your affiliate link
// - Category
// - Optional image URL

"use client";

import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { 
  collection, 
  addDoc, 
  getDocs, 
  deleteDoc, 
  doc, 
  updateDoc,
  query,
  orderBy
} from 'firebase/firestore';
import { 
  Plus, 
  Trash2, 
  Edit2, 
  Loader2, 
  Save, 
  X, 
  Package,
  Link as LinkIcon,
  Image,
  Tag
} from 'lucide-react';

interface Material {
  id?: string;
  name: string;
  amazonLink: string;
  affiliateLink?: string;
  category: string;
  imageUrl?: string;
  createdAt?: Date;
  updatedAt?: Date;
  activities?: string[]; // Array of activity IDs that use this material
}

interface Activity {
  id: string;
  name: string;
  category: string;
}

const CATEGORIES = [
  { id: 'practical_life', name: 'Practical Life' },
  { id: 'sensorial', name: 'Sensorial' },
  { id: 'language', name: 'Language' },
  { id: 'mathematics', name: 'Mathematics' },
  { id: 'cultural', name: 'Cultural' },
  { id: 'social_emotional', name: 'Social & Emotional' },
  { id: 'physical', name: 'Physical' }
];

export default function MaterialsAdminPage() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<Material>({
    name: '',
    amazonLink: '',
    affiliateLink: '',
    category: '',
    imageUrl: '',
    activities: []
  });

  // Fetch materials and activities
  useEffect(() => {
    fetchMaterials();
    fetchActivities();
  }, []);

  const fetchActivities = async () => {
    try {
      const activitiesQuery = query(
        collection(db, 'activities'),
        orderBy('name', 'asc')
      );
      const snapshot = await getDocs(activitiesQuery);
      const activitiesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Activity[];
      setActivities(activitiesData);
    } catch (err) {
      console.error('Error fetching activities:', err);
      setError('Failed to load activities');
    }
  };

  const fetchMaterials = async () => {
    try {
      setLoading(true);
      const materialsQuery = query(
        collection(db, 'materials'),
        orderBy('name', 'asc')
      );
      const snapshot = await getDocs(materialsQuery);
      const materialsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate()
      })) as Material[];
      setMaterials(materialsData);
    } catch (err) {
      console.error('Error fetching materials:', err);
      setError('Failed to load materials');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingMaterial) {
        // Update existing material
        await updateDoc(doc(db, 'materials', editingMaterial.id!), {
          ...formData,
          updatedAt: new Date()
        });
      } else {
        // Add new material
        await addDoc(collection(db, 'materials'), {
          ...formData,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
      
      // Reset form and refresh materials
      setFormData({
        name: '',
        amazonLink: '',
        affiliateLink: '',
        category: '',
        imageUrl: '',
        activities: []
      });
      setEditingMaterial(null);
      setShowForm(false);
      fetchMaterials();
    } catch (err) {
      console.error('Error saving material:', err);
      setError('Failed to save material');
    }
  };

  const handleEdit = (material: Material) => {
    setEditingMaterial(material);
    setFormData(material);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this material?')) return;
    
    try {
      await deleteDoc(doc(db, 'materials', id));
      fetchMaterials();
    } catch (err) {
      console.error('Error deleting material:', err);
      setError('Failed to delete material');
    }
  };

  const handleCancel = () => {
    setEditingMaterial(null);
    setShowForm(false);
    setFormData({
      name: '',
      amazonLink: '',
      affiliateLink: '',
      category: '',
      imageUrl: '',
      activities: []
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center">
            <Package className="h-6 w-6 text-blue-600 mr-2" />
            <h1 className="text-2xl font-bold text-gray-900">Materials Management</h1>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add New Material
          </button>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center">
            <X className="h-5 w-5 mr-2" />
            {error}
          </div>
        )}

        {/* Material Form */}
        {showForm && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-lg bg-white">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900">
                  {editingMaterial ? 'Edit Material' : 'Add New Material'}
                </h2>
                <button onClick={handleCancel} className="text-gray-500 hover:text-gray-700">
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                    Material Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="amazonLink" className="block text-sm font-medium text-gray-700">
                    Amazon Product Link
                  </label>
                  <input
                    type="url"
                    id="amazonLink"
                    required
                    value={formData.amazonLink}
                    onChange={(e) => setFormData({ ...formData, amazonLink: e.target.value })}
                    className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="affiliateLink" className="block text-sm font-medium text-gray-700">
                    Affiliate Link (Optional)
                  </label>
                  <input
                    type="url"
                    id="affiliateLink"
                    value={formData.affiliateLink}
                    onChange={(e) => setFormData({ ...formData, affiliateLink: e.target.value })}
                    className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="category" className="block text-sm font-medium text-gray-700">
                    Category
                  </label>
                  <select
                    id="category"
                    required
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="">Select a category</option>
                    {CATEGORIES.map(category => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="imageUrl" className="block text-sm font-medium text-gray-700">
                    Image URL (Optional)
                  </label>
                  <input
                    type="url"
                    id="imageUrl"
                    value={formData.imageUrl}
                    onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                    className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    {editingMaterial ? 'Update Material' : 'Add Material'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Materials List */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="min-w-full divide-y divide-gray-200">
            <div className="bg-gray-50 px-6 py-3">
              <div className="grid grid-cols-6 gap-4">
                <div className="col-span-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Material</div>
                <div className="col-span-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</div>
                <div className="col-span-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Links</div>
                <div className="col-span-1 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</div>
              </div>
            </div>
            <div className="bg-white divide-y divide-gray-200">
              {materials.map((material) => (
                <div key={material.id} className="px-6 py-4">
                  <div className="grid grid-cols-6 gap-4">
                    <div className="col-span-2">
                      <div className="flex items-center">
                        {material.imageUrl ? (
                          <img 
                            src={material.imageUrl} 
                            alt={material.name}
                            className="h-10 w-10 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center">
                            <Package className="h-5 w-5 text-gray-400" />
                          </div>
                        )}
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{material.name}</div>
                          <div className="text-sm text-gray-500">
                            Added {material.createdAt?.toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="col-span-1">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {CATEGORIES.find(c => c.id === material.category)?.name || material.category}
                      </span>
                    </div>
                    <div className="col-span-2">
                      <div className="flex flex-col space-y-1">
                        <a 
                          href={material.amazonLink} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800"
                        >
                          <LinkIcon className="h-4 w-4 mr-1" />
                          Amazon Link
                        </a>
                        {material.affiliateLink && (
                          <a 
                            href={material.affiliateLink} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-sm text-green-600 hover:text-green-800"
                          >
                            <LinkIcon className="h-4 w-4 mr-1" />
                            Affiliate Link
                          </a>
                        )}
                      </div>
                    </div>
                    <div className="col-span-1 text-right space-x-3">
                      <button
                        onClick={() => handleEdit(material)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(material.id!)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}