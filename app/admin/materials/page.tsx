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
import { Plus, Trash2, Edit2, Loader2, Save, X } from 'lucide-react';

interface Material {
  id?: string;
  name: string;
  amazonLink: string;
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

export default function MaterialsAdminPage() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [formData, setFormData] = useState<Material>({
    name: '',
    amazonLink: '',
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
        ...doc.data()
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
        category: '',
        imageUrl: '',
        activities: []
      });
      setEditingMaterial(null);
      fetchMaterials();
    } catch (err) {
      console.error('Error saving material:', err);
      setError('Failed to save material');
    }
  };

  const handleEdit = (material: Material) => {
    setEditingMaterial(material);
    setFormData(material);
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
    setFormData({
      name: '',
      amazonLink: '',
      category: '',
      imageUrl: '',
      activities: []
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Materials Management</h1>
        <button
          onClick={() => setEditingMaterial(null)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-emerald-600 hover:bg-emerald-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add New Material
        </button>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Material Form */}
      {(editingMaterial || !editingMaterial) && (
        <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6 mb-8">
          <div className="grid grid-cols-1 gap-6">
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
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
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
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
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
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
              >
                <option value="">Select a category</option>
                <option value="practical_life">Practical Life</option>
                <option value="sensorial">Sensorial</option>
                <option value="language">Language</option>
                <option value="mathematics">Mathematics</option>
                <option value="cultural">Cultural</option>
                <option value="social_emotional">Social & Emotional</option>
                <option value="physical">Physical</option>
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
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label htmlFor="activities" className="block text-sm font-medium text-gray-700">
                Associated Activities
              </label>
              <select
                id="activities"
                multiple
                value={formData.activities || []}
                onChange={(e) => {
                  const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
                  setFormData({ ...formData, activities: selectedOptions });
                }}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
              >
                {activities.map(activity => (
                  <option key={activity.id} value={activity.id}>
                    {activity.name}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-sm text-gray-500">
                Hold Ctrl/Cmd to select multiple activities
              </p>
            </div>

            <div className="flex justify-end space-x-3">
              {editingMaterial && (
                <button
                  type="button"
                  onClick={handleCancel}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </button>
              )}
              <button
                type="submit"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-emerald-600 hover:bg-emerald-700"
              >
                {editingMaterial ? (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Update Material
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Material
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Materials List */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Material
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Category
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Purchase Links
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Used In Activities
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {materials.map((material) => (
              <tr key={material.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    {material.imageUrl && (
                      <img
                        src={material.imageUrl}
                        alt={material.name}
                        className="h-10 w-10 rounded-full object-cover mr-3"
                      />
                    )}
                    <div className="text-sm font-medium text-gray-900">{material.name}</div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900 capitalize">
                    {material.category.replace('_', ' ')}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="space-y-1">
                    <a
                      href={material.amazonLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-emerald-600 hover:text-emerald-900 block truncate max-w-xs"
                    >
                      Amazon
                    </a>
                    {/* Add more purchase links here if needed */}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-900">
                    {material.activities?.length ? (
                      <ul className="list-disc list-inside space-y-1">
                        {material.activities.map(activityId => {
                          const activity = activities.find(a => a.id === activityId);
                          return (
                            <li key={activityId} className="text-emerald-600 hover:text-emerald-900">
                              {activity?.name || 'Unknown Activity'}
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <span className="text-gray-500 italic">Not used in any activities</span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => handleEdit(material)}
                    className="text-emerald-600 hover:text-emerald-900 mr-4"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => material.id && handleDelete(material.id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}