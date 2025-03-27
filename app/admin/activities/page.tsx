'use client';

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
  X, 
  BookOpen,
  Package,
  Tag,
  Clock
} from 'lucide-react';

interface Activity {
  id?: string;
  name: string;
  description: string;
  category: string;
  ageRange: string;
  duration: string;
  objectives: string[];
  materials?: string[]; // Array of material IDs needed for this activity
  createdAt?: Date;
  updatedAt?: Date;
}

interface Material {
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

const AGE_RANGES = [
  '0-12 months',
  '1-2 years',
  '2-3 years',
  '3-4 years',
  '4-5 years',
  '5-6 years'
];

const DURATIONS = [
  '5-10 minutes',
  '10-15 minutes',
  '15-20 minutes',
  '20-30 minutes',
  '30+ minutes'
];

export default function ActivitiesAdminPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<Activity>({
    name: '',
    description: '',
    category: '',
    ageRange: '',
    duration: '',
    objectives: [''],
    materials: []
  });

  useEffect(() => {
    fetchActivities();
    fetchMaterials();
  }, []);

  const fetchMaterials = async () => {
    try {
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
    }
  };

  const fetchActivities = async () => {
    try {
      setLoading(true);
      const activitiesQuery = query(
        collection(db, 'activities'),
        orderBy('name', 'asc')
      );
      const snapshot = await getDocs(activitiesQuery);
      const activitiesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate()
      })) as Activity[];
      setActivities(activitiesData);
    } catch (err) {
      console.error('Error fetching activities:', err);
      setError('Failed to load activities');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Filter out empty objectives
      const cleanedFormData = {
        ...formData,
        objectives: formData.objectives.filter(obj => obj.trim() !== '')
      };

      if (editingActivity) {
        await updateDoc(doc(db, 'activities', editingActivity.id!), {
          ...cleanedFormData,
          updatedAt: new Date()
        });
      } else {
        await addDoc(collection(db, 'activities'), {
          ...cleanedFormData,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
      
      setFormData({
        name: '',
        description: '',
        category: '',
        ageRange: '',
        duration: '',
        objectives: [''],
        materials: []
      });
      setEditingActivity(null);
      setShowForm(false);
      fetchActivities();
    } catch (err) {
      console.error('Error saving activity:', err);
      setError('Failed to save activity');
    }
  };

  const handleEdit = (activity: Activity) => {
    setEditingActivity(activity);
    setFormData({
      ...activity,
      objectives: activity.objectives || [''],
      materials: activity.materials || []
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this activity?')) return;
    
    try {
      await deleteDoc(doc(db, 'activities', id));
      fetchActivities();
    } catch (err) {
      console.error('Error deleting activity:', err);
      setError('Failed to delete activity');
    }
  };

  const handleCancel = () => {
    setEditingActivity(null);
    setShowForm(false);
    setFormData({
      name: '',
      description: '',
      category: '',
      ageRange: '',
      duration: '',
      objectives: [''],
      materials: []
    });
  };

  const addObjective = () => {
    setFormData(prev => ({
      ...prev,
      objectives: [...prev.objectives, '']
    }));
  };

  const removeObjective = (index: number) => {
    setFormData(prev => ({
      ...prev,
      objectives: prev.objectives.filter((_, i) => i !== index)
    }));
  };

  const updateObjective = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      objectives: prev.objectives.map((obj, i) => i === index ? value : obj)
    }));
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
            <BookOpen className="h-6 w-6 text-blue-600 mr-2" />
            <h1 className="text-2xl font-bold text-gray-900">Activities Management</h1>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add New Activity
          </button>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center">
            <X className="h-5 w-5 mr-2" />
            {error}
          </div>
        )}

        {/* Activity Form */}
        {showForm && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-lg bg-white">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900">
                  {editingActivity ? 'Edit Activity' : 'Add New Activity'}
                </h2>
                <button onClick={handleCancel} className="text-gray-500 hover:text-gray-700">
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                    Activity Name
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
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                    Description
                  </label>
                  <textarea
                    id="description"
                    required
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
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
                    <label htmlFor="ageRange" className="block text-sm font-medium text-gray-700">
                      Age Range
                    </label>
                    <select
                      id="ageRange"
                      required
                      value={formData.ageRange}
                      onChange={(e) => setFormData({ ...formData, ageRange: e.target.value })}
                      className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    >
                      <option value="">Select age range</option>
                      {AGE_RANGES.map(range => (
                        <option key={range} value={range}>
                          {range}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor="duration" className="block text-sm font-medium text-gray-700">
                    Duration
                  </label>
                  <select
                    id="duration"
                    required
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                    className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="">Select duration</option>
                    {DURATIONS.map(duration => (
                      <option key={duration} value={duration}>
                        {duration}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Learning Objectives
                  </label>
                  {formData.objectives.map((objective, index) => (
                    <div key={index} className="flex mb-2">
                      <input
                        type="text"
                        value={objective}
                        onChange={(e) => updateObjective(index, e.target.value)}
                        placeholder="Enter a learning objective"
                        className="flex-1 rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                      <button
                        type="button"
                        onClick={() => removeObjective(index)}
                        className="ml-2 text-red-600 hover:text-red-800"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addObjective}
                    className="mt-2 text-sm text-blue-600 hover:text-blue-800"
                  >
                    + Add Objective
                  </button>
                </div>

                <div>
                  <label htmlFor="materials" className="block text-sm font-medium text-gray-700">
                    Required Materials
                  </label>
                  <select
                    id="materials"
                    multiple
                    value={formData.materials}
                    onChange={(e) => {
                      const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
                      setFormData({ ...formData, materials: selectedOptions });
                    }}
                    className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    size={4}
                  >
                    {materials.map(material => (
                      <option key={material.id} value={material.id}>
                        {material.name}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-sm text-gray-500">
                    Hold Ctrl/Cmd to select multiple materials
                  </p>
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
                    {editingActivity ? 'Update Activity' : 'Add Activity'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Activities List */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="min-w-full divide-y divide-gray-200">
            {activities.map((activity) => (
              <div key={activity.id} className="p-6 hover:bg-gray-50">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="text-lg font-medium text-gray-900">{activity.name}</h3>
                    <p className="mt-1 text-sm text-gray-500">{activity.description}</p>
                    
                    <div className="mt-4 flex flex-wrap gap-2">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        <Tag className="h-3 w-3 mr-1" />
                        {CATEGORIES.find(c => c.id === activity.category)?.name}
                      </span>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        {activity.ageRange}
                      </span>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                        <Clock className="h-3 w-3 mr-1" />
                        {activity.duration}
                      </span>
                    </div>

                    {activity.objectives && activity.objectives.length > 0 && (
                      <div className="mt-4">
                        <h4 className="text-sm font-medium text-gray-700">Learning Objectives:</h4>
                        <ul className="mt-2 list-disc list-inside text-sm text-gray-600">
                          {activity.objectives.map((objective, index) => (
                            <li key={index}>{objective}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {activity.materials && activity.materials.length > 0 && (
                      <div className="mt-4">
                        <h4 className="text-sm font-medium text-gray-700">Required Materials:</h4>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {activity.materials.map(materialId => {
                            const material = materials.find(m => m.id === materialId);
                            return material ? (
                              <span key={materialId} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                <Package className="h-3 w-3 mr-1" />
                                {material.name}
                              </span>
                            ) : null;
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="ml-4 flex-shrink-0 space-x-2">
                    <button
                      onClick={() => handleEdit(activity)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(activity.id!)}
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
  );
} 