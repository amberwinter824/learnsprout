// app/dashboard/children/[id]/progress/page.js
"use client"
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  getChild, 
  getAllActivities, 
  createProgressRecord, 
  getChildProgress 
} from '@/lib/dataService';
import { ArrowLeft, Plus, Calendar, BookOpen, Camera, BarChart2 } from 'lucide-react';

export default function ProgressTrackingPage({ params }) {
  const router = useRouter();
  const { id } = params;
  const [child, setChild] = useState(null);
  const [progressRecords, setProgressRecords] = useState([]);
  const [activities, setActivities] = useState([]);
  const [showAddRecord, setShowAddRecord] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    activityId: '',
    notes: '',
    completionStatus: 'completed',
    engagementLevel: 'high',
    date: new Date().toISOString().slice(0, 10)
  });

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch child data
        const childData = await getChild(id);
        if (!childData) {
          setError('Child not found');
          setLoading(false);
          return;
        }
        setChild(childData);

        // Fetch progress records
        const progressData = await getChildProgress(id);
        setProgressRecords(progressData);

        // Fetch all activities
        const activitiesData = await getAllActivities();
        setActivities(activitiesData);
      } catch (error) {
        setError('Error fetching data: ' + error.message);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [id]);

  const getProgressSummary = (records) => {
    if (!records) return { total: 0, completed: 0, inProgress: 0, started: 0 };
    
    const total = records.length;
    const completed = records.filter(r => r.completionStatus === 'completed').length;
    const inProgress = records.filter(r => r.completionStatus === 'in_progress').length;
    const started = records.filter(r => r.completionStatus === 'started').length;
    
    return { total, completed, inProgress, started };
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const newRecord = {
        childId: id,
        ...formData,
        date: new Date(formData.date)
      };
      
      const recordId = await createProgressRecord(newRecord);
      
      // Add the new record to the state
      const selectedActivity = activities.find(a => a.id === formData.activityId);
      setProgressRecords([
        {
          id: recordId,
          ...newRecord,
          activity: selectedActivity
        },
        ...progressRecords
      ]);
      
      // Reset form and close modal
      setFormData({
        activityId: '',
        notes: '',
        completionStatus: 'completed',
        engagementLevel: 'high',
        date: new Date().toISOString().slice(0, 10)
      });
      setShowAddRecord(false);
    } catch (error) {
      setError('Failed to add progress record: ' + error.message);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.seconds 
      ? new Date(timestamp.seconds * 1000) 
      : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getCompletionStatusLabel = (status) => {
    switch (status) {
      case 'started': return 'Started';
      case 'in_progress': return 'In Progress';
      case 'completed': return 'Completed';
      default: return status;
    }
  };

  const getCompletionStatusClass = (status) => {
    switch (status) {
      case 'started': return 'bg-blue-100 text-blue-800';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getEngagementLevelLabel = (level) => {
    switch (level) {
      case 'low': return 'Low';
      case 'medium': return 'Medium';
      case 'high': return 'High';
      default: return level;
    }
  };

  const getEngagementLevelClass = (level) => {
    switch (level) {
      case 'low': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-700 p-4 rounded-md">
        <p>{error}</p>
        <Link href={`/dashboard/children/${id}`} className="mt-4 inline-block text-red-700 underline">
          Back to Child Profile
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <Link href={`/dashboard/children/${id}`} className="inline-flex items-center text-emerald-500 hover:text-emerald-600">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to {child.name}'s Profile
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">Progress Tracking</h1>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden mb-6">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Progress Records</h3>
            <p className="text-sm text-gray-500 mt-1">
              Document observations and completed activities
            </p>
          </div>
          <button
            onClick={() => setShowAddRecord(true)}
            className="inline-flex items-center px-3 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-500 hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
          >
            <Plus className="-ml-1 mr-2 h-5 w-5" />
            Add Record
          </button>
        </div>
        <div className="bg-gray-50 px-4 py-5 sm:p-6">
          {progressRecords.length > 0 ? (
            <div className="space-y-6">
              {progressRecords.map(record => (
                <div key={record.id} className="bg-white p-4 rounded-lg shadow-sm">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm text-gray-500">{formatDate(record.date)}</p>
                      <h4 className="text-lg font-medium text-gray-900 mt-1">
                        {activities.find(a => a.id === record.activityId)?.title || 'Unknown Activity'}
                      </h4>
                    </div>
                    <div className="flex space-x-2">
                      <span className={`px-2 py-1 text-xs rounded-full ${getCompletionStatusClass(record.completionStatus)}`}>
                        {getCompletionStatusLabel(record.completionStatus)}
                      </span>
                      <span className={`px-2 py-1 text-xs rounded-full ${getEngagementLevelClass(record.engagementLevel)}`}>
                        {getEngagementLevelLabel(record.engagementLevel)} Engagement
                      </span>
                    </div>
                  </div>
                  {record.notes && (
                    <div className="mt-3">
                      <p className="text-sm text-gray-700 whitespace-pre-line">{record.notes}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <BarChart2 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Progress Records Yet</h3>
              <p className="text-gray-500 mb-4">
                Start tracking {child.name}'s progress by adding your first record.
              </p>
              <button
                onClick={() => setShowAddRecord(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-500 hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
              >
                <Plus className="-ml-1 mr-2 h-5 w-5" />
                Add First Record
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Progress Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 shadow rounded-lg">
          <div className="flex items-center">
            <div className="p-2 rounded-lg bg-blue-100 text-blue-500">
              <Calendar className="h-5 w-5" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-gray-900">Weekly Plan</h3>
              <Link
                href={`/dashboard/children/${id}/weekly-plan`}
                className="text-xs text-emerald-500 hover:text-emerald-600"
              >
                View Plan →
              </Link>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 shadow rounded-lg">
          <div className="flex items-center">
            <div className="p-2 rounded-lg bg-green-100 text-green-500">
              <BookOpen className="h-5 w-5" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-gray-900">Activities</h3>
              <Link
                href={`/dashboard/children/${id}/activities`}
                className="text-xs text-emerald-500 hover:text-emerald-600"
              >
                View Activities →
              </Link>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 shadow rounded-lg">
          <div className="flex items-center">
            <div className="p-2 rounded-lg bg-amber-100 text-amber-500">
              <Camera className="h-5 w-5" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-gray-900">Photo Gallery</h3>
              <p className="text-xs text-gray-500">Coming Soon</p>
            </div>
          </div>
        </div>
      </div>

      {/* Add Record Modal */}
      {showAddRecord && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <form onSubmit={handleSubmit}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="sm:flex sm:items-start">
                    <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-emerald-100 sm:mx-0 sm:h-10 sm:w-10">
                      <BarChart2 className="h-6 w-6 text-emerald-600" />
                    </div>
                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                      <h3 className="text-lg leading-6 font-medium text-gray-900">Add Progress Record</h3>
                      
                      <div className="mt-4">
                        <label htmlFor="activityId" className="block text-sm font-medium text-gray-700">
                          Activity
                        </label>
                        <select
                          id="activityId"
                          name="activityId"
                          value={formData.activityId}
                          onChange={handleChange}
                          className="mt-1 block w-full bg-white border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                          required
                        >
                          <option value="">Select an activity</option>
                          {activities.map(activity => (
                            <option key={activity.id} value={activity.id}>
                              {activity.title}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="mt-4">
                        <label htmlFor="date" className="block text-sm font-medium text-gray-700">
                          Date
                        </label>
                        <input
                          type="date"
                          id="date"
                          name="date"
                          value={formData.date}
                          onChange={handleChange}
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                          required
                        />
                      </div>

                      <div className="mt-4">
                        <label htmlFor="completionStatus" className="block text-sm font-medium text-gray-700">
                          Completion Status
                        </label>
                        <select
                          id="completionStatus"
                          name="completionStatus"
                          value={formData.completionStatus}
                          onChange={handleChange}
                          className="mt-1 block w-full bg-white border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                        >
                          <option value="started">Started</option>
                          <option value="in_progress">In Progress</option>
                          <option value="completed">Completed</option>
                        </select>
                      </div>

                      <div className="mt-4">
                        <label htmlFor="engagementLevel" className="block text-sm font-medium text-gray-700">
                          Engagement Level
                        </label>
                        <select
                          id="engagementLevel"
                          name="engagementLevel"
                          value={formData.engagementLevel}
                          onChange={handleChange}
                          className="mt-1 block w-full bg-white border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                        >
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                        </select>
                      </div>

                      <div className="mt-4">
                        <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                          Observations & Notes
                        </label>
                        <textarea
                          id="notes"
                          name="notes"
                          rows={4}
                          value={formData.notes}
                          onChange={handleChange}
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                          placeholder="Note any observations, achievements, or challenges..."
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="submit"
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-emerald-600 text-base font-medium text-white hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Save Record
                  </button>
                  <button
                    type="button"
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                    onClick={() => setShowAddRecord(false)}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}