// app/dashboard/children/[id]/progress/page.tsx
"use client";

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { format, parseISO, subMonths } from 'date-fns';
import { collection, query, where, getDocs, getDoc, doc, Timestamp, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { 
  ArrowLeft, 
  BarChart2, 
  Calendar, 
  Loader2,
  Search,
  Filter,
  CheckCircle2,
  TrendingUp,
  Activity,
  Clock,
  Award,
  Info
} from 'lucide-react';
import SkillsJourneyMap from '@/app/components/parent/SkillsJourneyMap';

// Define interfaces
interface ChildData {
  id: string;
  name: string;
  birthDate?: any;
  ageGroup?: string;
  interests?: string[];
}

interface SkillData {
  id: string;
  skillId: string;
  name: string;
  description?: string;
  area: string;
  status: 'not_started' | 'emerging' | 'developing' | 'mastered';
  progressLevel?: number;
  lastAssessed?: Timestamp;
  notes?: string;
}

interface ProgressRecord {
  id: string;
  childId: string;
  activityId: string;
  activityTitle?: string;
  date: Timestamp;
  notes?: string;
  completionStatus: 'started' | 'in_progress' | 'completed';
  engagementLevel?: 'low' | 'medium' | 'high';
  skillsDemonstrated?: string[];
  photoUrls?: string[];
}

export default function ChildProgressPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const childId = params.id;
  
  // State
  const [child, setChild] = useState<ChildData | null>(null);
  const [skills, setSkills] = useState<SkillData[]>([]);
  const [progressRecords, setProgressRecords] = useState<ProgressRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedArea, setSelectedArea] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'skills' | 'activities'>('overview');
  const [timeRange, setTimeRange] = useState<'all' | 'month' | 'quarter'>('all');
  
  // Fetch child and progress data
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        
        // Fetch child data
        const childDoc = await getDoc(doc(db, 'children', childId));
        if (!childDoc.exists()) {
          setError('Child not found');
          setLoading(false);
          return;
        }
        
        setChild({ id: childDoc.id, ...childDoc.data() } as ChildData);
        
        // Fetch developmental skills data
        const devSkillsQuery = query(collection(db, 'developmentalSkills'));
        const devSkillsSnapshot = await getDocs(devSkillsQuery);
        const devSkillsMap = new Map();
        
        devSkillsSnapshot.forEach(doc => {
          devSkillsMap.set(doc.id, { id: doc.id, ...doc.data() });
        });
        
        // Fetch child's skills progress
        const childSkillsQuery = query(
          collection(db, 'childSkills'),
          where('childId', '==', childId)
        );
        
        const childSkillsSnapshot = await getDocs(childSkillsQuery);
        const childSkillsData: SkillData[] = [];
        
        childSkillsSnapshot.forEach(doc => {
          const data = doc.data();
          const devSkill = devSkillsMap.get(data.skillId);
          
          if (devSkill) {
            childSkillsData.push({
              id: doc.id,
              skillId: data.skillId,
              name: devSkill.name || 'Unnamed Skill',
              description: devSkill.description,
              area: devSkill.area || 'unknown',
              status: data.status || 'not_started',
              progressLevel: data.progressLevel,
              lastAssessed: data.lastAssessed,
              notes: data.notes
            });
          }
        });
        
        // For skills not yet tracked, add them with not_started status
        devSkillsMap.forEach((devSkill, skillId) => {
          const exists = childSkillsData.some(s => s.skillId === skillId);
          if (!exists) {
            childSkillsData.push({
              id: '',
              skillId,
              name: devSkill.name || 'Unnamed Skill',
              description: devSkill.description,
              area: devSkill.area || 'unknown',
              status: 'not_started'
            });
          }
        });
        
        // Sort skills by area and then by name
        const sortedSkills = childSkillsData.sort((a, b) => {
          if (a.area !== b.area) {
            return a.area.localeCompare(b.area);
          }
          return a.name.localeCompare(b.name);
        });
        
        setSkills(sortedSkills);
        
        // Fetch progress records
        const progressQuery = query(
          collection(db, 'progressRecords'),
          where('childId', '==', childId),
          orderBy('date', 'desc')
        );
        
        const progressSnapshot = await getDocs(progressQuery);
        const progressData: ProgressRecord[] = [];
        
        progressSnapshot.forEach(doc => {
          progressData.push({ id: doc.id, ...doc.data() } as ProgressRecord);
        });
        
        // Fetch activity titles
        const activityIds = progressData
          .map(record => record.activityId)
          .filter((id, index, self) => id && self.indexOf(id) === index);
        
        const activityTitles: Record<string, string> = {};
        
        for (const activityId of activityIds) {
          try {
            const activityDoc = await getDoc(doc(db, 'activities', activityId));
            if (activityDoc.exists()) {
              activityTitles[activityId] = activityDoc.data().title || 'Unknown Activity';
            }
          } catch (err) {
            console.error(`Error fetching activity ${activityId}:`, err);
          }
        }
        
        // Add activity titles to progress records
        progressData.forEach(record => {
          if (record.activityId && activityTitles[record.activityId]) {
            record.activityTitle = activityTitles[record.activityId];
          }
        });
        
        setProgressRecords(progressData);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching child progress data:', err);
        setError(`Error loading progress data: ${err instanceof Error ? err.message : String(err)}`);
        setLoading(false);
      }
    }
    
    if (childId) {
      fetchData();
    }
  }, [childId]);
  
  // Filtered skills based on search and area selection
  const filteredSkills = useMemo(() => {
    return skills.filter(skill => {
      const matchesSearch = searchQuery === '' || 
        skill.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (skill.description && skill.description.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesArea = selectedArea === null || skill.area === selectedArea;
      
      return matchesSearch && matchesArea;
    });
  }, [skills, searchQuery, selectedArea]);
  
  // Filtered progress records based on time range
  const filteredProgressRecords = useMemo(() => {
    if (timeRange === 'all') {
      return progressRecords;
    }
    
    const compareDate = timeRange === 'month' 
      ? subMonths(new Date(), 1) 
      : subMonths(new Date(), 3);
    
    return progressRecords.filter(record => {
      const recordDate = record.date.toDate();
      return recordDate >= compareDate;
    });
  }, [progressRecords, timeRange]);
  
  // Skill statistics
  const skillStats = useMemo(() => {
    const total = skills.length;
    const mastered = skills.filter(s => s.status === 'mastered').length;
    const developing = skills.filter(s => s.status === 'developing').length;
    const emerging = skills.filter(s => s.status === 'emerging').length;
    const notStarted = skills.filter(s => s.status === 'not_started').length;
    
    return { total, mastered, developing, emerging, notStarted };
  }, [skills]);
  
  // Activity statistics
  const activityStats = useMemo(() => {
    const total = progressRecords.length;
    const completed = progressRecords.filter(r => r.completionStatus === 'completed').length;
    const inProgress = progressRecords.filter(r => r.completionStatus === 'in_progress').length;
    const started = progressRecords.filter(r => r.completionStatus === 'started').length;
    
    // Recent activity - last 30 days
    const recentDate = subMonths(new Date(), 1);
    const recent = progressRecords.filter(r => {
      const recordDate = r.date.toDate();
      return recordDate >= recentDate;
    }).length;
    
    return { total, completed, inProgress, started, recent };
  }, [progressRecords]);
  
  // Unique skill areas
  const uniqueAreas = useMemo(() => {
    const areas = new Set(skills.map(skill => skill.area));
    return Array.from(areas);
  }, [skills]);
  
  // Helper functions
  const formatDate = (timestamp?: Timestamp) => {
    if (!timestamp) return '';
    
    const date = timestamp.toDate();
    return format(date, 'MMM d, yyyy');
  };
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'mastered': 
        return 'bg-green-100 text-green-800 border-green-200';
      case 'developing': 
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'emerging': 
        return 'bg-amber-100 text-amber-800 border-amber-200';
      default: 
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };
  
  const getAreaLabel = (area: string) => {
    const areaMap: Record<string, string> = {
      'practical_life': 'Practical Life',
      'sensorial': 'Sensorial',
      'language': 'Language',
      'mathematics': 'Mathematics',
      'cultural': 'Cultural',
      'social_emotional': 'Social & Emotional',
      'physical': 'Physical',
      'cognitive': 'Cognitive',
      'motor': 'Motor',
    };
    
    return areaMap[area] || area.charAt(0).toUpperCase() + area.slice(1).replace(/_/g, ' ');
  };
  
  const getAreaColor = (area: string) => {
    const areaColorMap: Record<string, string> = {
      'practical_life': 'bg-blue-100 text-blue-800',
      'sensorial': 'bg-purple-100 text-purple-800',
      'language': 'bg-green-100 text-green-800',
      'mathematics': 'bg-red-100 text-red-800',
      'cultural': 'bg-amber-100 text-amber-800',
      'social_emotional': 'bg-pink-100 text-pink-800',
      'physical': 'bg-indigo-100 text-indigo-800'
    };
    
    return areaColorMap[area] || 'bg-gray-100 text-gray-800';
  };
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'mastered': 
        return <CheckCircle2 className="h-4 w-4 mr-1" />;
      case 'developing': 
        return <Activity className="h-4 w-4 mr-1" />;
      case 'emerging': 
        return <TrendingUp className="h-4 w-4 mr-1" />;
      default: 
        return null;
    }
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="bg-red-50 text-red-700 p-6 rounded-lg">
        <h2 className="text-lg font-medium mb-2">Error</h2>
        <p>{error}</p>
        <Link
          href="/dashboard/children"
          className="mt-4 inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Children
        </Link>
      </div>
    );
  }
  
  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <Link href={`/dashboard/children/${childId}`} className="inline-flex items-center text-emerald-600 hover:text-emerald-700">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to {child?.name}'s Profile
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">{child?.name}'s Progress Tracking</h1>
      </div>
      
      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'overview' 
                ? 'border-emerald-500 text-emerald-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'skills' 
                ? 'border-emerald-500 text-emerald-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => setActiveTab('skills')}
          >
            Skills
          </button>
          <button
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'activities' 
                ? 'border-emerald-500 text-emerald-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => setActiveTab('activities')}
          >
            Activities
          </button>
        </nav>
      </div>
      
      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div>
          {/* Progress Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <div className="px-4 py-5 sm:p-6">
                <h2 className="text-lg font-medium text-gray-900 flex items-center mb-4">
                  <Award className="h-5 w-5 mr-2 text-emerald-500" />
                  Skills Progress
                </h2>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-gray-900">{skillStats.total}</div>
                    <div className="text-sm text-gray-500">Total Skills</div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-green-600">{skillStats.mastered}</div>
                    <div className="text-sm text-gray-500">Mastered</div>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-blue-600">{skillStats.developing}</div>
                    <div className="text-sm text-gray-500">Developing</div>
                  </div>
                  <div className="bg-amber-50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-amber-600">{skillStats.emerging}</div>
                    <div className="text-sm text-gray-500">Emerging</div>
                  </div>
                </div>
                
                {/* Simple progress bar */}
                <div className="mt-6">
                  <div className="flex justify-between text-sm text-gray-500 mb-1">
                    <span>Progress</span>
                    <span>
                      {skillStats.total > 0 
                        ? Math.round(((skillStats.mastered + skillStats.developing + skillStats.emerging) / skillStats.total) * 100) 
                        : 0}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div className="bg-emerald-500 h-2.5 rounded-full" style={{ 
                      width: `${skillStats.total > 0 
                        ? ((skillStats.mastered + skillStats.developing + skillStats.emerging) / skillStats.total) * 100 
                        : 0}%` 
                    }}></div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <div className="px-4 py-5 sm:p-6">
                <h2 className="text-lg font-medium text-gray-900 flex items-center mb-4">
                  <Activity className="h-5 w-5 mr-2 text-emerald-500" />
                  Activity Completion
                </h2>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-gray-900">{activityStats.total}</div>
                    <div className="text-sm text-gray-500">Total Records</div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-green-600">{activityStats.completed}</div>
                    <div className="text-sm text-gray-500">Completed</div>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-blue-600">{activityStats.recent}</div>
                    <div className="text-sm text-gray-500">Last 30 Days</div>
                  </div>
                </div>
                
                {/* Activity trend - simple visualization */}
                <div className="mt-6">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Recent Activity</h3>
                  <div className="flex space-x-2">
                    {Array.from({ length: 10 }).map((_, i) => {
                      // Get last 10 completed activities, newest to oldest
                      const hasActivity = i < Math.min(activityStats.recent, 10);
                      
                      return (
                        <div
                          key={i}
                          className={`h-8 w-4 rounded-sm ${hasActivity ? 'bg-emerald-500' : 'bg-gray-200'}`}
                        ></div>
                      );
                    })}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Last 10 activities (most recent on left)
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Recent Activity and Skills */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Recent Activities */}
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <div className="px-4 py-5 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">Recent Activities</h2>
              </div>
              
              <div className="px-4 py-5 sm:p-6">
                {progressRecords.length > 0 ? (
                  <div className="space-y-4">
                    {progressRecords.slice(0, 5).map(record => (
                      <div key={record.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                        <div className="flex justify-between">
                          <h3 className="font-medium text-gray-900">{record.activityTitle || 'Activity'}</h3>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            record.completionStatus === 'completed' ? 'bg-green-100 text-green-800' :
                            record.completionStatus === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {record.completionStatus.replace('_', ' ').charAt(0).toUpperCase() + record.completionStatus.replace('_', ' ').slice(1)}
                          </span>
                        </div>
                        
                        <div className="mt-2 flex items-center text-xs text-gray-500">
                          <Calendar className="h-3 w-3 mr-1" />
                          {formatDate(record.date)}
                          
                          {record.engagementLevel && (
                            <span className="ml-3 capitalize">
                              Engagement: {record.engagementLevel}
                            </span>
                          )}
                        </div>
                        
                        {record.notes && (
                          <p className="mt-2 text-sm text-gray-600 line-clamp-2">{record.notes}</p>
                        )}
                        
                        <Link 
                          href={`/dashboard/children/${childId}?record=${record.id}`}
                          className="mt-2 text-xs text-emerald-600 hover:text-emerald-700 inline-block"
                        >
                          View details
                        </Link>
                      </div>
                    ))}
                    
                    {progressRecords.length > 5 && (
                      <div className="text-center">
                        <button
                          onClick={() => setActiveTab('activities')}
                          className="text-sm text-emerald-600 hover:text-emerald-700"
                        >
                          View all {progressRecords.length} activities
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-gray-500">No activity records yet</p>
                  </div>
                )}
              </div>
            </div>
            
            {/* Recently Updated Skills */}
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <div className="px-4 py-5 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">Recently Updated Skills</h2>
              </div>
              
              <div className="px-4 py-5 sm:p-6">
                {skills.filter(s => s.lastAssessed).length > 0 ? (
                  <div className="space-y-4">
                    {skills
                      .filter(s => s.lastAssessed)
                      .sort((a, b) => {
                        if (!a.lastAssessed) return 1;
                        if (!b.lastAssessed) return -1;
                        return b.lastAssessed.seconds - a.lastAssessed.seconds;
                      })
                      .slice(0, 5)
                      .map(skill => (
                        <div key={skill.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                          <div className="flex justify-between">
                            <h3 className="font-medium text-gray-900">{skill.name}</h3>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(skill.status)}`}>
                              {skill.status.charAt(0).toUpperCase() + skill.status.slice(1)}
                            </span>
                          </div>
                          
                          <div className="mt-1">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${getAreaColor(skill.area)}`}>
                              {getAreaLabel(skill.area)}
                            </span>
                          </div>
                          
                          <div className="mt-2 flex items-center text-xs text-gray-500">
                            <Clock className="h-3 w-3 mr-1" />
                            Last assessed: {formatDate(skill.lastAssessed)}
                          </div>
                          
                          {skill.notes && (
                            <p className="mt-2 text-sm text-gray-600 line-clamp-2">{skill.notes}</p>
                          )}
                        </div>
                      ))
                    }
                    
                    <div className="text-center">
                      <button
                        onClick={() => setActiveTab('skills')}
                        className="text-sm text-emerald-600 hover:text-emerald-700"
                      >
                        View all skills
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-gray-500">No skills have been assessed yet</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Skills Tab */}
      {activeTab === 'skills' && (
        <div className="space-y-6">
          {/* Skills Journey Map */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {['cognitive', 'physical', 'social_emotional', 'language', 'adaptive', 'sensory', 'play'].map((area) => {
              const areaSkills = skills
                .filter(skill => skill.area === area)
                .map(skill => ({
                  id: skill.id,
                  name: skill.name,
                  description: skill.description || 'No description available',
                  area: skill.area,
                  status: skill.status,
                  lastAssessed: skill.lastAssessed?.toDate()
                }));
              if (areaSkills.length === 0) return null;
              
              return (
                <SkillsJourneyMap
                  key={area}
                  skills={areaSkills}
                  area={area}
                />
              );
            })}
          </div>

          {/* Skills Search and Filter */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search skills..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={selectedArea || ''}
                onChange={(e) => setSelectedArea(e.target.value || null)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Areas</option>
                {['cognitive', 'physical', 'social_emotional', 'language', 'adaptive', 'sensory', 'play'].map((area) => (
                  <option key={area} value={area}>
                    {getAreaLabel(area)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Skills List */}
          <div className="bg-white rounded-lg shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Skill</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Area</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Assessed</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredSkills.map((skill) => (
                    <tr key={skill.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{skill.name}</div>
                        {skill.description && (
                          <div className="text-sm text-gray-500">{skill.description}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getAreaColor(skill.area)}`}>
                          {getAreaLabel(skill.area)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <span className={`${getStatusColor(skill.status)} mr-2`}>
                            {getStatusIcon(skill.status)}
                          </span>
                          <span className="text-sm text-gray-900 capitalize">
                            {skill.status.replace('_', ' ')}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(skill.lastAssessed)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      
      {/* Activities Tab */}
      {activeTab === 'activities' && (
        <div>
          <div className="bg-white shadow rounded-lg overflow-hidden mb-6">
            <div className="px-4 py-5 border-b border-gray-200 flex flex-wrap gap-4 items-center justify-between">
              <h2 className="text-lg font-medium text-gray-900">Activity History</h2>
              
              <div className="flex space-x-2">
                <button
                  className={`px-3 py-1 text-sm rounded-md ${
                    timeRange === 'all' 
                      ? 'bg-emerald-100 text-emerald-800' 
                      : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                  }`}
                  onClick={() => setTimeRange('all')}
                >
                  All Time
                </button>
                <button
                  className={`px-3 py-1 text-sm rounded-md ${
                    timeRange === 'quarter' 
                      ? 'bg-emerald-100 text-emerald-800' 
                      : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                  }`}
                  onClick={() => setTimeRange('quarter')}
                >
                  Last 3 Months
                </button>
                <button
                  className={`px-3 py-1 text-sm rounded-md ${
                    timeRange === 'month' 
                      ? 'bg-emerald-100 text-emerald-800' 
                      : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                  }`}
                  onClick={() => setTimeRange('month')}
                >
                  Last Month
                </button>
              </div>
            </div>
            
            <div className="px-4 py-5 sm:p-6">
              {filteredProgressRecords.length > 0 ? (
                <div className="space-y-6">
                  {filteredProgressRecords.map(record => (
                    <div key={record.id} className={`border rounded-lg p-4 ${
                      record.completionStatus === 'completed' 
                        ? 'border-green-200 bg-green-50' 
                        : record.completionStatus === 'in_progress' 
                          ? 'border-blue-200 bg-blue-50' 
                          : 'border-gray-200 bg-gray-50'
                    }`}>
                      <div className="flex flex-wrap justify-between items-start">
                        <div>
                          <h3 className="font-medium text-lg text-gray-900">{record.activityTitle || 'Activity'}</h3>
                          <div className="flex items-center mt-1">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              record.completionStatus === 'completed' ? 'bg-green-100 text-green-800' :
                              record.completionStatus === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {record.completionStatus.replace('_', ' ').charAt(0).toUpperCase() + record.completionStatus.replace('_', ' ').slice(1)}
                            </span>
                            
                            <span className="text-xs text-gray-500 ml-2 flex items-center">
                              <Calendar className="h-3 w-3 mr-1" />
                              {formatDate(record.date)}
                            </span>
                          </div>
                        </div>
                        
                        {record.engagementLevel && (
                          <div className={`text-sm px-3 py-1 rounded-md ${
                            record.engagementLevel === 'high' ? 'bg-green-100 text-green-800' :
                            record.engagementLevel === 'medium' ? 'bg-amber-100 text-amber-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {record.engagementLevel.charAt(0).toUpperCase() + record.engagementLevel.slice(1)} Engagement
                          </div>
                        )}
                      </div>
                      
                      {record.notes && (
                        <div className="mt-4">
                          <h4 className="text-sm font-medium text-gray-700">Notes:</h4>
                          <p className="mt-1 text-gray-600">{record.notes}</p>
                        </div>
                      )}
                      
                      {record.skillsDemonstrated && record.skillsDemonstrated.length > 0 && (
                        <div className="mt-4">
                          <h4 className="text-sm font-medium text-gray-700">Skills Demonstrated:</h4>
                          <div className="mt-1 flex flex-wrap gap-2">
                            {record.skillsDemonstrated.map(skillId => {
                              const skillName = skills.find(s => s.skillId === skillId)?.name || skillId;
                              return (
                                <span key={skillId} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                  {skillName}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      )}
                      
                      {record.photoUrls && record.photoUrls.length > 0 && (
                        <div className="mt-4">
                          <h4 className="text-sm font-medium text-gray-700">Photos:</h4>
                          <div className="mt-1 flex space-x-2 overflow-x-auto pb-2">
                            {record.photoUrls.map((url, idx) => (
                              <div key={idx} className="h-20 w-20 flex-shrink-0 rounded-md bg-gray-100 flex items-center justify-center">
                                <img src={url} alt={`Activity photo ${idx + 1}`} className="h-full w-full object-cover rounded-md" />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      <div className="mt-4 flex justify-end">
                        <Link 
                          href={`/dashboard/children/${childId}?record=${record.id}`}
                          className="text-sm text-emerald-600 hover:text-emerald-700"
                        >
                          View details
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Clock className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900">No activity records</h3>
                  <p className="text-gray-500 mt-2">
                    {timeRange !== 'all' 
                      ? `No activities found in the selected time period. Try changing the time filter.` 
                      : `No activities have been recorded yet. Complete activities to track progress.`
                    }
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}