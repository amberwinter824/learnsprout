"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Plus, 
  BarChart2, 
  Calendar, 
  BookOpen, 
  Camera, 
  Loader2,
  Brain,
  TrendingUp,
  Award,
  Lightbulb,
  CheckCircle,
  Eye,
  Clock,
  Star,
  Info,
  ArrowRight
} from 'lucide-react';
import { format, parseISO, isAfter, subMonths, addDays, startOfWeek, isToday } from 'date-fns';
import ProgressiveSkillPath from '@/components/ProgressiveSkillPath';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, getDoc, addDoc, serverTimestamp } from 'firebase/firestore';

export default function ProgressTrackingPage({ params }) {
  const router = useRouter();
  const { id: childId } = params;
  const [child, setChild] = useState(null);
  const [progressRecords, setProgressRecords] = useState([]);
  const [activities, setActivities] = useState([]);
  const [developmentalSkills, setDevelopmentalSkills] = useState([]);
  const [showAddRecord, setShowAddRecord] = useState(false);
  const [skillView, setSkillView] = useState('visual');
  const [selectedSkillArea, setSelectedSkillArea] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
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
        const childDocRef = doc(db, 'children', childId);
        const childDocSnap = await getDoc(childDocRef);
        
        if (!childDocSnap.exists()) {
          setError('Child not found');
          setLoading(false);
          return;
        }
        
        const childData = { id: childDocSnap.id, ...childDocSnap.data() };
        setChild(childData);

        // Fetch progress records
        const progressQuery = query(
          collection(db, 'progressRecords'),
          where('childId', '==', childId)
        );
        const progressSnapshot = await getDocs(progressQuery);
        const progressData = [];
        progressSnapshot.forEach(doc => {
          progressData.push({ id: doc.id, ...doc.data() });
        });
        
        // Sort by date descending
        progressData.sort((a, b) => {
          const dateA = a.date?.seconds ? new Date(a.date.seconds * 1000) : new Date(a.date);
          const dateB = b.date?.seconds ? new Date(b.date.seconds * 1000) : new Date(b.date);
          return dateB - dateA;
        });
        
        setProgressRecords(progressData);

        // Fetch all activities
        const activitiesQuery = query(collection(db, 'activities'));
        const activitiesSnapshot = await getDocs(activitiesQuery);
        const activitiesData = [];
        activitiesSnapshot.forEach(doc => {
          activitiesData.push({ id: doc.id, ...doc.data() });
        });
        setActivities(activitiesData);
        
        // Fetch developmental skills
        const skillsQuery = query(collection(db, 'developmentalSkills'));
        const skillsSnapshot = await getDocs(skillsQuery);
        const skillsData = [];
        skillsSnapshot.forEach(doc => {
          skillsData.push({
            id: doc.id,
            ...doc.data()
          });
        });
        
        // Fetch child skills progress
        const childSkillsQuery = query(
          collection(db, 'childSkills'),
          where('childId', '==', childId)
        );
        const childSkillsSnapshot = await getDocs(childSkillsQuery);
        const childSkillsData = {};
        childSkillsSnapshot.forEach(doc => {
          const data = doc.data();
          childSkillsData[data.skillId] = {
            status: data.status,
            lastAssessed: data.lastAssessed
          };
        });
        
        // Merge skills data with child progress
        const mergedSkills = skillsData.map(skill => ({
          ...skill,
          status: childSkillsData[skill.id]?.status || 'not_started',
          lastAssessed: childSkillsData[skill.id]?.lastAssessed || null
        }));
        
        setDevelopmentalSkills(mergedSkills);
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Error fetching data: ' + error.message);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [childId]);

  // Group skills by area
  const skillsByArea = developmentalSkills.reduce((acc, skill) => {
    const area = skill.area || 'unknown';
    if (!acc[area]) {
      acc[area] = [];
    }
    acc[area].push(skill);
    return acc;
  }, {});

  const getProgressSummary = () => {
    if (!progressRecords) return { total: 0, completed: 0, inProgress: 0, started: 0 };
    
    const total = progressRecords.length;
    const completed = progressRecords.filter(r => r.completionStatus === 'completed').length;
    const inProgress = progressRecords.filter(r => r.completionStatus === 'in_progress').length;
    const started = progressRecords.filter(r => r.completionStatus === 'started').length;
    
    return { total, completed, inProgress, started };
  };
  
  const getRecentProgress = () => {
    // Get records from the last 30 days
    const thirtyDaysAgo = subMonths(new Date(), 1);
    const recentRecords = progressRecords.filter(record => {
      const recordDate = record.date?.seconds 
        ? new Date(record.date.seconds * 1000) 
        : new Date(record.date);
      return isAfter(recordDate, thirtyDaysAgo);
    });
    
    return recentRecords.length;
  };

  const getCompletedActivitiesCount = () => {
    return progressRecords.filter(r => r.completionStatus === 'completed').length;
  };

  const getSkillsInProgressCount = () => {
    return developmentalSkills.filter(s => s.status === 'emerging' || s.status === 'developing').length;
  };

  const getMasteredSkillsCount = () => {
    return developmentalSkills.filter(s => s.status === 'mastered').length;
  };

  // Helper functions for UI
  const formatDate = (timestamp) => {
    if (!timestamp) return 'Never';
    
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
    switch(status) {
      case 'completed': return 'Completed';
      case 'in_progress': return 'In Progress';
      case 'started': return 'Started';
      default: return status;
    }
  };

  const getEngagementLevelLabel = (level) => {
    switch(level) {
      case 'high': return 'High';
      case 'medium': return 'Medium';
      case 'low': return 'Low';
      default: return level;
    }
  };

  const getStatusLabel = (status) => {
    switch(status) {
      case 'emerging': return 'Emerging';
      case 'developing': return 'Developing';
      case 'mastered': return 'Mastered';
      case 'not_started': return 'Not Started';
      default: return status;
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'emerging': 
        return 'bg-amber-100 text-amber-800';
      case 'developing': 
        return 'bg-blue-100 text-blue-800';
      case 'mastered': 
        return 'bg-green-100 text-green-800';
      case 'not_started': 
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'emerging': 
        return <TrendingUp className="h-3 w-3 mr-1" />;
      case 'developing': 
        return <ArrowRight className="h-3 w-3 mr-1" />;
      case 'mastered': 
        return <CheckCircle className="h-3 w-3 mr-1" />;
      case 'not_started': 
      default:
        return null;
    }
  };

  const getAreaLabel = (area) => {
    switch(area) {
      case 'practical_life': return 'Practical Life';
      case 'sensorial': return 'Sensorial';
      case 'language': return 'Language';
      case 'mathematics': return 'Mathematics';
      case 'cultural': return 'Cultural';
      case 'social_emotional': return 'Social & Emotional';
      case 'physical': return 'Physical';
      case 'cognitive': return 'Cognitive';
      default: return area.replace('_', ' ');
    }
  };

  const getAreaColor = (area) => {
    switch(area) {
      case 'practical_life': 
        return 'bg-blue-100 text-blue-800';
      case 'sensorial': 
        return 'bg-purple-100 text-purple-800';
      case 'language': 
        return 'bg-green-100 text-green-800';
      case 'mathematics': 
        return 'bg-red-100 text-red-800';
      case 'cultural': 
        return 'bg-amber-100 text-amber-800';
      case 'social_emotional': 
        return 'bg-pink-100 text-pink-800';
      case 'physical': 
        return 'bg-indigo-100 text-indigo-800';
      case 'cognitive': 
        return 'bg-cyan-100 text-cyan-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    
    try {
      // Create new progress record
      const newRecord = {
        childId,
        activityId: formData.activityId,
        activityTitle: activities.find(a => a.id === formData.activityId)?.title || '',
        notes: formData.notes,
        completionStatus: formData.completionStatus,
        engagementLevel: formData.engagementLevel,
        date: new Date(formData.date),
        createdAt: serverTimestamp()
      };
      
      const docRef = await addDoc(collection(db, 'progressRecords'), newRecord);
      
      // Add the new record to the state
      setProgressRecords(prev => [{
        id: docRef.id,
        ...newRecord,
        date: new Date(formData.date) // Use the JavaScript Date object for the UI
      }, ...prev]);
      
      // Reset form
      setFormData({
        activityId: '',
        notes: '',
        completionStatus: 'completed',
        engagementLevel: 'high',
        date: new Date().toISOString().slice(0, 10)
      });
      
      setShowAddRecord(false);
    } catch (error) {
      console.error('Error adding record:', error);
      setError('Failed to add record: ' + error.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (error && !child) {
    return (
      <div className="bg-red-50 text-red-700 p-6 rounded-lg">
        <h2 className="text-lg font-medium mb-2">Error</h2>
        <p>{error}</p>
        <button
          onClick={() => router.push('/dashboard/children')}
          className="mt-4 inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Children
        </button>
      </div>
    );
  }

  const summary = getProgressSummary();

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center">
            <button
              onClick={() => router.push('/dashboard/children')}
              className="mr-2 text-gray-400 hover:text-gray-500"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-2xl font-bold text-gray-900">{child.name}'s Progress</h1>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Track development, milestones, and learning journey
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <button
            onClick={() => setShowAddRecord(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
          >
            <Plus className="-ml-1 mr-2 h-5 w-5" />
            Add Progress Record
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('overview')}
            className={`${
              activeTab === 'overview'
                ? 'border-emerald-500 text-emerald-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('skills')}
            className={`${
              activeTab === 'skills'
                ? 'border-emerald-500 text-emerald-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Skills
          </button>
          <button
            onClick={() => setActiveTab('records')}
            className={`${
              activeTab === 'records'
                ? 'border-emerald-500 text-emerald-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Activity Records
          </button>
        </nav>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Completed Activities Card */}
            <div className="bg-white shadow rounded-lg p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-emerald-100 rounded-md p-3">
                  <CheckCircle className="h-6 w-6 text-emerald-600" />
                </div>
                <div className="ml-5">
                  <p className="text-sm font-medium text-gray-500">Completed Activities</p>
                  <h3 className="text-lg font-semibold text-gray-900">{getCompletedActivitiesCount()}</h3>
                </div>
              </div>
            </div>
            
            {/* Skills In Progress Card */}
            <div className="bg-white shadow rounded-lg p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-blue-100 rounded-md p-3">
                  <TrendingUp className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-5">
                  <p className="text-sm font-medium text-gray-500">Skills In Progress</p>
                  <h3 className="text-lg font-semibold text-gray-900">{getSkillsInProgressCount()}</h3>
                </div>
              </div>
            </div>
            
            {/* Skills To Start Card - New */}
            <div className="bg-white shadow rounded-lg p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-gray-100 rounded-md p-3">
                  <Lightbulb className="h-6 w-6 text-gray-600" />
                </div>
                <div className="ml-5">
                  <p className="text-sm font-medium text-gray-500">Skills To Start</p>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {developmentalSkills.filter(s => s.status === 'not_started').length}
                  </h3>
                </div>
              </div>
            </div>
            
            {/* Recent Progress Card */}
            <div className="bg-white shadow rounded-lg p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-purple-100 rounded-md p-3">
                  <Calendar className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-5">
                  <p className="text-sm font-medium text-gray-500">Recent Progress</p>
                  <h3 className="text-lg font-semibold text-gray-900">{getRecentProgress()} records</h3>
                </div>
              </div>
            </div>
          </div>
          
          {/* Parent Guidance Section - Moved from separate tab */}
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Parent Guidance</h2>
              <p className="text-sm text-gray-500 mt-1">
                Age-appropriate expectations and milestones for {child.name}
              </p>
            </div>
            
            <div className="p-6">
              {child.ageGroup ? (
                <div>
                  <div className="mb-6">
                    <h3 className="text-md font-medium text-gray-900 mb-2">What to Expect</h3>
                    <p className="text-gray-600">
                      {getAgeAppropriateGuidance(child.ageGroup).expectations}
                    </p>
                  </div>
                  
                  <div>
                    <h3 className="text-md font-medium text-gray-900 mb-2">Common Milestones</h3>
                    <ul className="space-y-2 text-gray-600">
                      {getAgeAppropriateGuidance(child.ageGroup).milestones.map((milestone, index) => (
                        <li key={index} className="flex items-start">
                          <CheckCircle className="h-5 w-5 text-emerald-500 mr-2 flex-shrink-0 mt-0.5" />
                          <span>{milestone}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6">
                  <Info className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Age Group Not Set</h3>
                  <p className="text-gray-500 mb-4">
                    Add {child.name}'s age group to see personalized guidance.
                  </p>
                  <Link
                    href={`/dashboard/children/${childId}/edit`}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-500 hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
                  >
                    Update Profile
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Skills Tab */}
      {activeTab === 'skills' && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-5 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Developmental Skills Progress</h2>
            <p className="text-sm text-gray-500 mt-1">
              Track {child.name}'s continuous learning journey across key developmental areas
            </p>
          </div>
          
          <div className="p-4">
            {/* New Skill Progression Component */}
            <ProgressiveSkillPath 
              childId={childId} 
              ageGroup={child.ageGroup}
            />
          </div>
        </div>
      )}

      {/* Records Tab */}
      {activeTab === 'records' && (
        <div className="bg-white shadow rounded-lg overflow-hidden">
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
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          record.completionStatus === 'completed' ? 'bg-green-100 text-green-800' : 
                          record.completionStatus === 'in_progress' ? 'bg-yellow-100 text-yellow-800' : 
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {getCompletionStatusLabel(record.completionStatus)}
                        </span>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          record.engagementLevel === 'high' ? 'bg-emerald-100 text-emerald-800' : 
                          record.engagementLevel === 'medium' ? 'bg-blue-100 text-blue-800' : 
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {getEngagementLevelLabel(record.engagementLevel)} Engagement
                        </span>
                      </div>
                    </div>
                    
                    {record.notes && (
                      <div className="mt-4 bg-gray-50 p-3 rounded-md">
                        <h5 className="text-sm font-medium text-gray-700 mb-2">Observations & Notes</h5>
                        <p className="text-sm text-gray-600 whitespace-pre-line">{record.notes}</p>
                      </div>
                    )}
                    
                    {/* Skills addressed by this activity */}
                    {activities.find(a => a.id === record.activityId)?.skillsAddressed?.length > 0 && (
                      <div className="mt-4">
                        <h5 className="text-sm font-medium text-gray-700 mb-2">Skills Addressed</h5>
                        <div className="flex flex-wrap gap-2">
                          {activities.find(a => a.id === record.activityId)?.skillsAddressed.map(skillId => {
                            const skill = developmentalSkills.find(s => s.id === skillId);
                            return skill ? (
                              <span key={skillId} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-50 text-purple-700">
                                {skill.name}
                              </span>
                            ) : null;
                          })}
                        </div>
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
                  Start tracking {child?.name}'s progress by adding your first record.
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
      )}

      {/* Add Record Modal */}
      {showAddRecord && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <form onSubmit={handleFormSubmit}>
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
                          onChange={handleFormChange}
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
                          onChange={handleFormChange}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
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
                          onChange={handleFormChange}
                          className="mt-1 block w-full bg-white border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                        >
                          <option value="completed">Completed</option>
                          <option value="in_progress">In Progress</option>
                          <option value="started">Started</option>
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
                          onChange={handleFormChange}
                          className="mt-1 block w-full bg-white border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                        >
                          <option value="high">High</option>
                          <option value="medium">Medium</option>
                          <option value="low">Low</option>
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
                          onChange={handleFormChange}
                          placeholder="Describe what you observed during the activity..."
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
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

// Helper functions
function formatDate(timestamp) {
  if (!timestamp) return 'N/A';
  
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return format(date, 'MMM d, yyyy');
}

function getCompletionStatusLabel(status) {
  switch (status) {
    case 'completed': return 'Completed';
    case 'in_progress': return 'In Progress';
    case 'started': return 'Started';
    default: return 'Unknown';
  }
}

function getEngagementLevelLabel(level) {
  switch (level) {
    case 'high': return 'High';
    case 'medium': return 'Medium';
    case 'low': return 'Low';
    default: return 'Unknown';
  }
}

function getStatusLabel(status) {
  switch (status) {
    case 'mastered': return 'Mastered';
    case 'emerging': return 'Emerging';
    case 'developing': return 'Developing';
    case 'not_started': return 'Not Started';
    default: return 'Unknown';
  }
}

function getStatusIcon(status) {
  switch (status) {
    case 'mastered':
      return <CheckCircle className="h-3 w-3 mr-1 text-green-500" />;
    case 'emerging':
      return <TrendingUp className="h-3 w-3 mr-1 text-blue-500" />;
    case 'developing':
      return <Award className="h-3 w-3 mr-1 text-amber-500" />;
    case 'not_started':
      return null;
    default:
      return null;
  }
}

function getStatusColor(status) {
  switch (status) {
    case 'mastered': return 'bg-green-100 text-green-800';
    case 'emerging': return 'bg-blue-100 text-blue-800';
    case 'developing': return 'bg-amber-100 text-amber-800';
    case 'not_started': return 'bg-gray-100 text-gray-800';
    default: return 'bg-gray-100 text-gray-800';
  }
}

function getAreaLabel(area) {
  switch (area) {
    case 'cognitive': return 'Cognitive Development';
    case 'language': return 'Language Development';
    case 'physical': return 'Physical Development';
    case 'social': return 'Social-Emotional Development';
    case 'practical_life': return 'Practical Life Skills';
    case 'sensorial': return 'Sensorial Development';
    default: return area.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  }
}

function getAreaColor(area) {
  switch (area) {
    case 'cognitive': return 'bg-purple-100 text-purple-800';
    case 'language': return 'bg-green-100 text-green-800';
    case 'physical': return 'bg-blue-100 text-blue-800';
    case 'social': return 'bg-amber-100 text-amber-800';
    case 'practical_life': return 'bg-emerald-100 text-emerald-800';
    case 'sensorial': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
}

// Helper function to get age-appropriate guidance
function getAgeAppropriateGuidance(ageGroup) {
  const guidanceByAge = {
    'infant': {
      expectations: 'Infants are rapidly developing their senses, motor skills, and beginning to understand cause and effect. They learn primarily through sensory experiences and interactions with caregivers.',
      milestones: [
        'Tracking objects with eyes and turning head toward sounds',
        'Reaching for and grasping objects',
        'Responding to facial expressions and voices',
        'Beginning to sit without support',
        'Babbling and making different sounds'
      ]
    },
    'toddler': {
      expectations: 'Toddlers are developing independence, language skills, and physical coordination. They are curious explorers who learn through hands-on experiences and repetition.',
      milestones: [
        'Walking independently and beginning to run',
        'Using simple words and short phrases',
        'Following simple instructions',
        'Showing interest in pretend play',
        'Sorting objects by shape and color'
      ]
    },
    'preschool': {
      expectations: 'Preschoolers are developing more complex language, social skills, and beginning to understand concepts like numbers, letters, and categories. They learn through play, stories, and guided activities.',
      milestones: [
        'Speaking in complete sentences and asking questions',
        'Counting objects and recognizing some letters',
        'Engaging in cooperative play with peers',
        'Drawing recognizable shapes and figures',
        'Following multi-step instructions'
      ]
    },
    'kindergarten': {
      expectations: 'Kindergarteners are refining their social skills, developing early literacy and numeracy, and building independence. They learn through structured activities, creative play, and peer interactions.',
      milestones: [
        'Recognizing most letters and their sounds',
        'Counting to 20 and understanding basic addition/subtraction',
        'Writing their name and simple words',
        'Taking turns and sharing with minimal prompting',
        'Completing multi-step tasks independently'
      ]
    },
    'elementary': {
      expectations: 'Elementary-aged children are developing reading fluency, mathematical thinking, and more complex social skills. They learn through a combination of direct instruction, collaborative work, and independent exploration.',
      milestones: [
        'Reading and comprehending age-appropriate texts',
        'Understanding mathematical concepts beyond basic arithmetic',
        'Writing structured paragraphs with proper grammar',
        'Working collaboratively on group projects',
        'Developing critical thinking and problem-solving skills'
      ]
    }
  };
  
  return guidanceByAge[ageGroup] || {
    expectations: 'Children develop at their own pace across various domains including physical, cognitive, social, and emotional areas. Regular engagement with appropriate activities supports this development.',
    milestones: [
      'Showing increasing independence in daily tasks',
      'Developing communication and language skills',
      'Building relationships with peers and adults',
      'Demonstrating curiosity and problem-solving abilities',
      'Refining fine and gross motor skills'
    ]
  };
}