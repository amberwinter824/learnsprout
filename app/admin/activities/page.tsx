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
  orderBy,
  serverTimestamp
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
  title: string;
  description?: string;
  instructions?: string;
  ageRanges: string[];
  area: string;
  materialsNeeded?: string[];
  duration?: number;
  difficulty: string;
  status: string;
  imageUrl?: string;
  environmentType: "home" | "classroom" | "bridge";
  classroomExtension: boolean;
  homeReinforcement: boolean;
  prerequisites?: string[];
  nextSteps?: string[];
  relatedActivities?: string[];
  skillsAddressed: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

const AREAS = [
  { id: 'practical_life', name: 'Practical Life' },
  { id: 'sensorial', name: 'Sensorial' },
  { id: 'language', name: 'Language' },
  { id: 'mathematics', name: 'Mathematics' },
  { id: 'cultural', name: 'Cultural' },
  { id: 'social_emotional', name: 'Social & Emotional' },
  { id: 'physical', name: 'Physical' }
];

const AGE_RANGES = [
  '0-1',
  '1-2',
  '2-3',
  '3-4',
  '4-5',
  '5-6'
];

const DIFFICULTIES = [
  'beginner',
  'intermediate',
  'advanced'
];

const ENVIRONMENT_TYPES = [
  { id: 'home', name: 'Home' },
  { id: 'classroom', name: 'Classroom' },
  { id: 'bridge', name: 'Bridge' }
];

export default function ActivitiesAdminPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<Activity>({
    title: '',
    description: '',
    instructions: '',
    ageRanges: [],
    area: '',
    materialsNeeded: [],
    duration: 15,
    difficulty: 'beginner',
    status: 'active',
    imageUrl: '',
    environmentType: 'classroom',
    classroomExtension: false,
    homeReinforcement: true,
    prerequisites: [],
    nextSteps: [],
    relatedActivities: [],
    skillsAddressed: []
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
      }));
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
        orderBy('title', 'asc')
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
      if (editingActivity) {
        await updateDoc(doc(db, 'activities', editingActivity.id!), {
          ...formData,
          updatedAt: serverTimestamp()
        });
      } else {
        await addDoc(collection(db, 'activities'), {
          ...formData,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }
      
      setFormData({
        title: '',
        description: '',
        instructions: '',
        ageRanges: [],
        area: '',
        materialsNeeded: [],
        duration: 15,
        difficulty: 'beginner',
        status: 'active',
        imageUrl: '',
        environmentType: 'classroom',
        classroomExtension: false,
        homeReinforcement: true,
        prerequisites: [],
        nextSteps: [],
        relatedActivities: [],
        skillsAddressed: []
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
    setFormData(activity);
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
      title: '',
      description: '',
      instructions: '',
      ageRanges: [],
      area: '',
      materialsNeeded: [],
      duration: 15,
      difficulty: 'beginner',
      status: 'active',
      imageUrl: '',
      environmentType: 'classroom',
      classroomExtension: false,
      homeReinforcement: true,
      prerequisites: [],
      nextSteps: [],
      relatedActivities: [],
      skillsAddressed: []
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-red-500">
        {error}
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
                  <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                    Activity Title
                  </label>
                  <input
                    type="text"
                    id="title"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
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

                <div>
                  <label htmlFor="instructions" className="block text-sm font-medium text-gray-700">
                    Instructions
                  </label>
                  <textarea
                    id="instructions"
                    rows={3}
                    value={formData.instructions}
                    onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                    className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="area" className="block text-sm font-medium text-gray-700">
                      Area
                    </label>
                    <select
                      id="area"
                      required
                      value={formData.area}
                      onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                      className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    >
                      <option value="">Select an area</option>
                      {AREAS.map(area => (
                        <option key={area.id} value={area.id}>
                          {area.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="difficulty" className="block text-sm font-medium text-gray-700">
                      Difficulty
                    </label>
                    <select
                      id="difficulty"
                      required
                      value={formData.difficulty}
                      onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                      className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    >
                      {DIFFICULTIES.map(difficulty => (
                        <option key={difficulty} value={difficulty}>
                          {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Age Ranges
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {AGE_RANGES.map(range => (
                      <label key={range} className="inline-flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.ageRanges.includes(range)}
                          onChange={(e) => {
                            const newRanges = e.target.checked
                              ? [...formData.ageRanges, range]
                              : formData.ageRanges.filter(r => r !== range);
                            setFormData({ ...formData, ageRanges: newRanges });
                          }}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-600">{range} years</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="duration" className="block text-sm font-medium text-gray-700">
                      Duration (minutes)
                    </label>
                    <input
                      type="number"
                      id="duration"
                      min="5"
                      step="5"
                      value={formData.duration}
                      onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
                      className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label htmlFor="environmentType" className="block text-sm font-medium text-gray-700">
                      Environment Type
                    </label>
                    <select
                      id="environmentType"
                      required
                      value={formData.environmentType}
                      onChange={(e) => setFormData({ ...formData, environmentType: e.target.value as "home" | "classroom" | "bridge" })}
                      className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    >
                      {ENVIRONMENT_TYPES.map(type => (
                        <option key={type.id} value={type.id}>
                          {type.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.classroomExtension}
                        onChange={(e) => setFormData({ ...formData, classroomExtension: e.target.checked })}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-600">Classroom Extension</span>
                    </label>
                  </div>

                  <div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.homeReinforcement}
                        onChange={(e) => setFormData({ ...formData, homeReinforcement: e.target.checked })}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-600">Home Reinforcement</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label htmlFor="materials" className="block text-sm font-medium text-gray-700">
                    Required Materials
                  </label>
                  <select
                    id="materials"
                    multiple
                    value={formData.materialsNeeded}
                    onChange={(e) => {
                      const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
                      setFormData({ ...formData, materialsNeeded: selectedOptions });
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
                    <h3 className="text-lg font-medium text-gray-900">{activity.title}</h3>
                    <p className="mt-1 text-sm text-gray-500">{activity.description}</p>
                    
                    <div className="mt-4 flex flex-wrap gap-2">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        <Tag className="h-3 w-3 mr-1" />
                        {AREAS.find(a => a.id === activity.area)?.name}
                      </span>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        {activity.ageRanges.join(', ')} years
                      </span>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                        <Clock className="h-3 w-3 mr-1" />
                        {activity.duration} minutes
                      </span>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        {activity.difficulty}
                      </span>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                        {ENVIRONMENT_TYPES.find(t => t.id === activity.environmentType)?.name}
                      </span>
                    </div>

                    {activity.instructions && (
                      <div className="mt-4">
                        <h4 className="text-sm font-medium text-gray-700">Instructions:</h4>
                        <p className="mt-1 text-sm text-gray-600">{activity.instructions}</p>
                      </div>
                    )}

                    {activity.materialsNeeded && activity.materialsNeeded.length > 0 && (
                      <div className="mt-4">
                        <h4 className="text-sm font-medium text-gray-700">Required Materials:</h4>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {activity.materialsNeeded.map(materialId => {
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