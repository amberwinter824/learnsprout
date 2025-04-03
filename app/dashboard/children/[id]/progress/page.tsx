// app/dashboard/children/[id]/progress/page.tsx
"use client";

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { format, parseISO, subMonths } from 'date-fns';
import { collection, query, where, getDocs, getDoc, doc, Timestamp, orderBy, limit, updateDoc, setDoc } from 'firebase/firestore';
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
  Info,
  BookOpen,
  Flower2,
  Sprout,
  Leaf,
  CircleDot,
  CheckCircle,
  ArrowUp,
  Sprout as Seedling,
  ArrowUpRight
} from 'lucide-react';
import SkillsJourneyMap from '@/app/components/parent/SkillsJourneyMap';
import ProgressCelebration from '@/components/parent/ProgressCelebration';

// Define interfaces
interface ChildData {
  id: string;
  name: string;
  birthDate?: any;
  ageGroup?: string;
  interests?: string[];
}

interface Skill {
  id: string;
  skillId: string;
  name: string;
  description?: string;
  area: string;
  status: 'not_started' | 'emerging' | 'developing' | 'mastered';
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
  const [skills, setSkills] = useState<Skill[]>([]);
  const [progressRecords, setProgressRecords] = useState<ProgressRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedArea, setSelectedArea] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'details'>('overview');
  const [timeRange, setTimeRange] = useState<'all' | 'month' | 'quarter'>('all');
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<'emerging' | 'developing' | 'mastered'>('emerging');
  const [updateNotes, setUpdateNotes] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  
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
        const childSkillsData: Skill[] = [];
        
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
              id: `new-${skillId}`,
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
        
        console.log('Fetching progress records for childId:', childId);
        const progressSnapshot = await getDocs(progressQuery);
        console.log('Progress records found:', progressSnapshot.size);
        
        const progressData: ProgressRecord[] = [];
        
        progressSnapshot.forEach(doc => {
          const data = doc.data();
          console.log('Progress record data:', data);
          progressData.push({ 
            id: doc.id, 
            childId: data.childId,
            activityId: data.activityId,
            activityTitle: data.activityTitle || 'Untitled Activity',
            date: data.date,
            notes: data.notes || '',
            completionStatus: data.completionStatus || 'started',
            engagementLevel: data.engagementLevel,
            skillsDemonstrated: data.skillsDemonstrated || [],
            photoUrls: data.photoUrls || []
          });
        });
        
        console.log('Processed progress data:', progressData);
        
        // Fetch activity titles
        const activityIds = progressData
          .map(record => record.activityId)
          .filter((id, index, self) => id && self.indexOf(id) === index);
        
        console.log('Activity IDs to fetch:', activityIds);
        
        const activityTitles: Record<string, string> = {};
        
        for (const activityId of activityIds) {
          if (!activityId) continue;
          try {
            console.log('Fetching activity:', activityId);
            const activityDoc = await getDoc(doc(db, 'activities', activityId));
            if (activityDoc.exists()) {
              activityTitles[activityId] = activityDoc.data().title || 'Unknown Activity';
              console.log('Activity title found:', activityTitles[activityId]);
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
        
        console.log('Final progress records:', progressData);
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
        return <Flower2 className="h-4 w-4 mr-1" />;
      case 'developing': 
        return <Sprout className="h-4 w-4 mr-1" />;
      case 'emerging': 
        return <Leaf className="h-4 w-4 mr-1" />;
      case 'not_started':
        return <CircleDot className="h-4 w-4 mr-1" />;
      default: 
        return <CircleDot className="h-4 w-4 mr-1" />;
    }
  };
  
  const handleUpdateSkillStatus = async (skillId: string) => {
    const skill = skills.find(s => s.id === skillId);
    if (skill) {
      setSelectedSkill(skill);
      setUpdateStatus(skill.status as 'emerging' | 'developing' | 'mastered');
      setUpdateNotes(skill.notes || '');
      setIsUpdateModalOpen(true);
    }
  };

  const handleSubmitStatusUpdate = async () => {
    if (!selectedSkill) return;

    try {
      setIsUpdating(true);
      
      // Find the existing skill document
      const skillQuery = query(
        collection(db, 'childSkills'),
        where('childId', '==', childId),
        where('skillId', '==', selectedSkill.skillId)
      );
      
      const skillSnapshot = await getDocs(skillQuery);
      
      let skillRef;
      if (skillSnapshot.empty) {
        // Create new document if it doesn't exist
        skillRef = doc(collection(db, 'childSkills'));
      } else {
        // Use existing document
        skillRef = skillSnapshot.docs[0].ref;
      }

      const updateData = {
        childId,
        skillId: selectedSkill.skillId,
        status: updateStatus,
        notes: updateNotes,
        lastAssessed: Timestamp.now(),
        updatedAt: Timestamp.now()
      };

      await setDoc(skillRef, updateData);

      // Update local state - only update the specific skill
      setSkills(prevSkills => 
        prevSkills.map(skill => 
          skill.skillId === selectedSkill.skillId
            ? { 
                ...skill, 
                id: skillRef.id,
                status: updateStatus,
                notes: updateNotes,
                lastAssessed: Timestamp.now(),
                updatedAt: Timestamp.now()
              }
            : skill
        )
      );

      // Close modal and reset state
      setIsUpdateModalOpen(false);
      setSelectedSkill(null);
      setUpdateStatus('emerging');
      setUpdateNotes('');
    } catch (error) {
      console.error('Error updating skill status:', error);
      // You might want to show an error message to the user here
    } finally {
      setIsUpdating(false);
    }
  };
  
  // Map skill areas to their corresponding domains
  const mapAreaToDomain = (area: string) => {
    const domainMap: Record<string, string> = {
      // Physical Development
      'motor': 'physical',
      'fine_motor': 'physical',
      'gross_motor': 'physical',
      'hand_eye_coordination': 'physical',
      'coordination': 'physical',
      
      // Social-Emotional Development
      'social': 'social_emotional',
      'emotional': 'social_emotional',
      'social_emotional': 'social_emotional',
      'social_awareness': 'social_emotional',
      'emotional_regulation': 'social_emotional',
      'relationship_building': 'social_emotional',
      
      // Adaptive Development
      'adaptive': 'adaptive',
      'self_care': 'adaptive',
      'daily_living': 'adaptive',
      'independence': 'adaptive',
      'practical_life': 'adaptive', // Many practical life skills are adaptive
      
      // Other Domains
      'sensorial': 'sensory',
      'language': 'language',
      'cognitive': 'cognitive'
    };
    return domainMap[area] || area;
  };

  // Filter and transform skills for each domain
  const getSkillsByDomain = (domain: string) => {
    return skills.filter(skill => {
      const mappedDomain = mapAreaToDomain(skill.area);
      return mappedDomain === domain;
    });
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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Child Info */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="mb-6">
            <Link href={`/dashboard/children/${childId}`} className="inline-flex items-center text-emerald-600 hover:text-emerald-700">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to {child?.name}'s Profile
            </Link>
            <h1 className="mt-2 text-2xl font-bold text-gray-900">{child?.name}'s Progress Tracking</h1>
          </div>

          {/* Main content */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Understanding Growth Stages */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Understanding Growth Stages</h2>
              <div className="space-y-6">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                      <Flower2 className="h-4 w-4 text-emerald-600" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">Mastered</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Your child has fully developed this skill and can perform it independently.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                      <Sprout className="h-4 w-4 text-blue-600" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">Developing</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Your child is making steady progress and can perform this skill with some support.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
                      <Leaf className="h-4 w-4 text-amber-600" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">Emerging</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Your child is beginning to show interest and initial attempts at this skill.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Understanding Skill Development */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Understanding Skill Development</h2>
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  Child development is organized into key developmental domains that work together to support your child's growth. Each domain focuses on specific aspects of development while maintaining connections with other areas.
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-3 rounded-md">
                    <h3 className="text-sm font-medium text-gray-900">Physical Development</h3>
                    <p className="text-xs text-gray-500 mt-1">
                      Gross and fine motor skills, coordination, and physical health
                    </p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-md">
                    <h3 className="text-sm font-medium text-gray-900">Cognitive Development</h3>
                    <p className="text-xs text-gray-500 mt-1">
                      Thinking, problem-solving, memory, and learning abilities
                    </p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-md">
                    <h3 className="text-sm font-medium text-gray-900">Social Development</h3>
                    <p className="text-xs text-gray-500 mt-1">
                      Interactions with others, relationships, and social understanding
                    </p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-md">
                    <h3 className="text-sm font-medium text-gray-900">Emotional Development</h3>
                    <p className="text-xs text-gray-500 mt-1">
                      Feelings, self-awareness, and emotional regulation
                    </p>
                  </div>
                </div>
                <div className="pt-4">
                  <Link
                    href="/parent/developmental-domains"
                    className="inline-flex items-center text-sm text-emerald-600 hover:text-emerald-700 hover:underline"
                  >
                    Learn more about developmental domains
                    <ArrowUpRight className="ml-1 h-4 w-4" />
                  </Link>
                </div>
              </div>
            </div>
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
                Progress Overview
              </button>
              <button
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'details' 
                    ? 'border-emerald-500 text-emerald-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
                onClick={() => setActiveTab('details')}
              >
                Detailed Records
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
                              onClick={() => setActiveTab('details')}
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
                              <div className="flex justify-between items-start">
                                <div>
                                  <h3 className="font-medium text-gray-900">{skill.name}</h3>
                                  <div className="mt-1">
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${getAreaColor(skill.area)}`}>
                                      {getAreaLabel(skill.area)}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(skill.status)}`}>
                                    {skill.status.charAt(0).toUpperCase() + skill.status.slice(1)}
                                  </span>
                                  <button
                                    onClick={() => handleUpdateSkillStatus(skill.id)}
                                    className="text-emerald-600 hover:text-emerald-700"
                                  >
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                  </button>
                                </div>
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
                            onClick={() => setActiveTab('details')}
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
          
          {/* Details Tab */}
          {activeTab === 'details' && (
            <div className="space-y-6">
              {/* Developmental Domains Link */}
              <div className="bg-white shadow rounded-lg overflow-hidden">
                <div className="px-4 py-5 sm:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-medium text-gray-900">Understanding Skill Development</h2>
                      <p className="mt-1 text-sm text-gray-500">
                        Learn more about developmental domains and how they relate to your child's progress
                      </p>
                    </div>
                    <Link 
                      href="/dashboard/developmental-domains"
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-emerald-600 hover:bg-emerald-700"
                    >
                      <BookOpen className="h-4 w-4 mr-2" />
                      View Developmental Domains
                    </Link>
                  </div>
                </div>
              </div>

              {/* Skills Journey Map */}
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {['cognitive', 'physical', 'social_emotional', 'language', 'adaptive', 'sensory'].map((domain) => {
                  const domainSkills = getSkillsByDomain(domain)
                    .map(skill => ({
                      id: skill.id,
                      skillId: skill.id,
                      name: skill.name,
                      description: skill.description || 'No description available',
                      area: skill.area,
                      status: skill.status,
                      lastAssessed: skill.lastAssessed?.toDate()
                    }));
                  
                  return (
                    <div key={domain} className="bg-white rounded-lg shadow-sm overflow-hidden">
                      <div className="px-4 py-3 border-b border-gray-200">
                        <h3 className="text-lg font-medium text-gray-900">{getAreaLabel(domain)}</h3>
                      </div>
                      <div className="p-4">
                        <SkillsJourneyMap
                          skills={domainSkills}
                          area={domain}
                          onUpdateSkill={handleUpdateSkillStatus}
                        />
                      </div>
                    </div>
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
                    {['cognitive', 'physical', 'social_emotional', 'language', 'adaptive', 'sensory'].map((area) => (
                      <option key={area} value={area}>
                        {getAreaLabel(area)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Skills List */}
              <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Skill</th>
                        <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Area</th>
                        <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Assessed</th>
                        <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredSkills.map((skill) => (
                        <tr key={skill.id || `skill-${skill.skillId}`} className="hover:bg-gray-50">
                          <td className="px-4 sm:px-6 py-4">
                            <div className="text-sm font-medium text-gray-900">{skill.name}</div>
                            {skill.description && (
                              <div className="text-sm text-gray-500 mt-1">{skill.description}</div>
                            )}
                          </td>
                          <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getAreaColor(skill.area)}`}>
                              {getAreaLabel(skill.area)}
                            </span>
                          </td>
                          <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <span className={`${getStatusColor(skill.status)} mr-2`}>
                                {getStatusIcon(skill.status)}
                              </span>
                              <span className="text-sm text-gray-900 capitalize">
                                {skill.status.replace('_', ' ')}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(skill.lastAssessed)}
                          </td>
                          <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm">
                            <button
                              onClick={() => handleUpdateSkillStatus(skill.id || `skill-${skill.skillId}`)}
                              className="text-emerald-600 hover:text-emerald-700"
                            >
                              Update Status
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Activity History */}
              <div className="bg-white shadow rounded-lg overflow-hidden">
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
                  {loading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
                    </div>
                  ) : filteredProgressRecords.length > 0 ? (
                    <div className="space-y-6">
                      {filteredProgressRecords.map(record => {
                        // Ensure we have valid data before rendering
                        const activityTitle = typeof record.activityTitle === 'string' ? record.activityTitle : 'Activity';
                        const completionStatus = typeof record.completionStatus === 'string' ? record.completionStatus : 'not_started';
                        const engagementLevel = typeof record.engagementLevel === 'string' ? record.engagementLevel : '';
                        const notes = typeof record.notes === 'string' ? record.notes : '';
                        const skillsDemonstrated = Array.isArray(record.skillsDemonstrated) ? record.skillsDemonstrated : [];
                        const photoUrls = Array.isArray(record.photoUrls) ? record.photoUrls : [];
                        
                        return (
                          <div key={record.id} className={`border rounded-lg p-4 ${
                            completionStatus === 'completed' 
                              ? 'border-green-200 bg-green-50' 
                              : completionStatus === 'in_progress' 
                                ? 'border-blue-200 bg-blue-50' 
                                : 'border-gray-200 bg-gray-50'
                          }`}>
                            <div className="flex flex-wrap justify-between items-start">
                              <div>
                                <h3 className="font-medium text-lg text-gray-900">{activityTitle}</h3>
                                <div className="flex items-center mt-1">
                                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                                    completionStatus === 'completed' ? 'bg-green-100 text-green-800' :
                                    completionStatus === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                                    'bg-gray-100 text-gray-800'
                                  }`}>
                                    {completionStatus.replace('_', ' ').charAt(0).toUpperCase() + completionStatus.replace('_', ' ').slice(1)}
                                  </span>
                                  
                                  <span className="text-xs text-gray-500 ml-2 flex items-center">
                                    <Calendar className="h-3 w-3 mr-1" />
                                    {formatDate(record.date)}
                                  </span>
                                </div>
                              </div>
                              
                              {engagementLevel && (
                                <div className={`text-sm px-3 py-1 rounded-md ${
                                  engagementLevel === 'high' ? 'bg-green-100 text-green-800' :
                                  engagementLevel === 'medium' ? 'bg-amber-100 text-amber-800' :
                                  'bg-red-100 text-red-800'
                                }`}>
                                  {engagementLevel.charAt(0).toUpperCase() + engagementLevel.slice(1)} Engagement
                                </div>
                              )}
                            </div>
                            
                            {notes && (
                              <div className="mt-4">
                                <h4 className="text-sm font-medium text-gray-700">Notes:</h4>
                                <p className="mt-1 text-gray-600">{notes}</p>
                              </div>
                            )}
                            
                            {skillsDemonstrated.length > 0 && (
                              <div className="mt-4">
                                <h4 className="text-sm font-medium text-gray-700">Skills Demonstrated:</h4>
                                <div className="mt-1 flex flex-wrap gap-2">
                                  {skillsDemonstrated.map(skillId => {
                                    const skill = skills.find(s => s.skillId === skillId);
                                    const skillName = skill ? skill.name : String(skillId);
                                    return (
                                      <span key={skillId} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                        {skillName}
                                      </span>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                            
                            {photoUrls.length > 0 && (
                              <div className="mt-4">
                                <h4 className="text-sm font-medium text-gray-700">Photos:</h4>
                                <div className="mt-1 flex space-x-2 overflow-x-auto pb-2">
                                  {photoUrls.map((url, idx) => (
                                    <div key={idx} className="h-20 w-20 flex-shrink-0 rounded-md bg-gray-100 flex items-center justify-center">
                                      <img src={url} alt={`Activity photo ${idx + 1}`} className="h-full w-full object-cover rounded-md" />
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
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
      </div>

      {/* Status Update Modal */}
      {isUpdateModalOpen && selectedSkill && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Update Skill Status: {selectedSkill.name}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={updateStatus}
                  onChange={(e) => setUpdateStatus(e.target.value as 'emerging' | 'developing' | 'mastered')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500"
                >
                  <option value="emerging">Emerging</option>
                  <option value="developing">Developing</option>
                  <option value="mastered">Mastered</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={updateNotes}
                  onChange={(e) => setUpdateNotes(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="Add any observations or notes about this skill..."
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setIsUpdateModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitStatusUpdate}
                disabled={isUpdating}
                className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-md hover:bg-emerald-700 disabled:opacity-50"
              >
                {isUpdating ? 'Updating...' : 'Update Status'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}