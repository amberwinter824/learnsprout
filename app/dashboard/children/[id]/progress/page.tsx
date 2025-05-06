// app/dashboard/children/[id]/development/page.tsx
"use client";

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { format, parseISO, subMonths, differenceInMonths } from 'date-fns';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PediatricVisitPrep from '@/components/parent/PediatricVisitPrep';

// Define interfaces
interface ChildData {
  id: string;
  name: string;
  birthDate?: any;
  age?: string;
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

interface AssessmentResult {
  skillId: string;
  status: 'emerging' | 'developing' | 'mastered';
  notes?: string;
}

export default function ChildDevelopmentPage({ params }: { params: { id: string } }) {
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
  const [activeTab, setActiveTab] = useState<'overview' | 'details' | 'checkup'>('overview');
  const [timeRange, setTimeRange] = useState<'all' | 'month' | 'quarter'>('all');
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<'emerging' | 'developing' | 'mastered'>('emerging');
  const [updateNotes, setUpdateNotes] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [currentAssessmentResults, setCurrentAssessmentResults] = useState<AssessmentResult[]>([]);
  
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
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Failed to load data');
        setLoading(false);
      }
    }
    
    if (childId) {
      fetchData();
    }
  }, [childId]);

  useEffect(() => {
    async function fetchAssessmentResults() {
      try {
        const skillsQuery = query(
          collection(db, 'childSkills'),
          where('childId', '==', params.id)
        );
        const skillsSnapshot = await getDocs(skillsQuery);
        const results: AssessmentResult[] = [];
        
        skillsSnapshot.forEach(doc => {
          const data = doc.data();
          results.push({
            skillId: data.skillId,
            status: data.status,
            notes: data.notes
          });
        });
        
        setCurrentAssessmentResults(results);
      } catch (err) {
        console.error('Error fetching assessment results:', err);
      }
    }
    
    fetchAssessmentResults();
  }, [params.id]);
  
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
      // Practical Life
      'motor': 'practical_life',
      'fine_motor': 'practical_life',
      'gross_motor': 'practical_life',
      'hand_eye_coordination': 'practical_life',
      'coordination': 'practical_life',
      'self_care': 'practical_life',
      'daily_living': 'practical_life',
      'independence': 'practical_life',
      'adaptive': 'practical_life',
      
      // Sensorial
      'sensory': 'sensorial',
      'sensorial': 'sensorial',
      'visual': 'sensorial',
      'auditory': 'sensorial',
      'tactile': 'sensorial',
      
      // Language
      'language': 'language',
      'communication': 'language',
      'vocabulary': 'language',
      'literacy': 'language',
      
      // Mathematics
      'mathematics': 'mathematics',
      'counting': 'mathematics',
      'number': 'mathematics',
      'quantity': 'mathematics',
      
      // Cultural
      'cultural': 'cultural',
      'science': 'cultural',
      'geography': 'cultural',
      'art': 'cultural',
      'music': 'cultural',
      
      // Social & Emotional
      'social': 'social_emotional',
      'emotional': 'social_emotional',
      'social_emotional': 'social_emotional',
      'social_awareness': 'social_emotional',
      'emotional_regulation': 'social_emotional',
      'relationship_building': 'social_emotional'
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
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Child Info */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="mb-6">
            <Link href={`/dashboard/children/${childId}`} className="inline-flex items-center text-emerald-600 hover:text-emerald-700">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to {child?.name}'s Profile
            </Link>
            <h1 className="mt-2 text-2xl font-bold text-gray-900">{child?.name}'s Development Tracking</h1>
          </div>
        </div>

        {/* Tabs */}
        <Tabs 
          defaultValue={activeTab}
          className="mb-6"
        >
          <TabsList className="mb-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="details">Skill Details</TabsTrigger>
            <TabsTrigger value="checkup">Checkup Prep</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="bg-white rounded-lg shadow-sm p-6">
            {/* Overview content (existing) */}
            <div className="mb-4">
              <h2 className="text-lg font-medium text-gray-900 mb-2">Development Progress</h2>
              <p className="text-sm text-gray-600 mb-4">
                Track {child?.name}'s development across key learning areas
              </p>
            </div>

            {/* Area Selection */}
            <div className="mb-6">
              {/* Existing area selection code */}
              {/* ... */}
            </div>

            {/* Skill Progress Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Existing skill progress cards */}
              {/* ... */}
            </div>
          </TabsContent>

          <TabsContent value="details" className="bg-white rounded-lg shadow-sm p-6">
            {/* Details content (existing) */}
            <div className="mb-4">
              <h2 className="text-lg font-medium text-gray-900 mb-2">Skill Details</h2>
              <p className="text-sm text-gray-600 mb-4">
                View and update detailed progress for each developmental skill
              </p>
            </div>

            {/* Existing skill details UI */}
            {/* ... */}
          </TabsContent>

          <TabsContent value="checkup" className="bg-white rounded-lg shadow-sm p-6">
            <div className="mb-4">
              <h2 className="text-lg font-medium text-gray-900 mb-2">Pediatric Checkup Preparation</h2>
              <p className="text-sm text-gray-600 mb-4">
                Prepare for your child's upcoming pediatric checkup and track progress in ASQ domains
              </p>
            </div>
            
            {/* Pediatric Visit Prep component */}
            {child && (
              <PediatricVisitPrep 
                childId={childId} 
                childAge={child.birthDate ? 
                  differenceInMonths(new Date(), child.birthDate instanceof Date ? 
                    child.birthDate : 
                    new Date((child.birthDate).seconds * 1000)
                  ) : 0} 
                onActivitySelect={(activityId) => {
                  // Handle activity selection here
                  console.log("Selected activity:", activityId);
                  // Could redirect to activity detail
                }}
              />
            )}
          </TabsContent>
        </Tabs>

        {/* Rest of existing content... */}
      </div>
    </div>
  );
}

// Helper functions
function getCurrentFocusAreas(assessmentResults: AssessmentResult[]): string {
  const emergingSkills = assessmentResults.filter(result => result.status === 'emerging');
  const developingSkills = assessmentResults.filter(result => result.status === 'developing');
  
  if (emergingSkills.length > 0) {
    return `Focus on ${emergingSkills.length} emerging skills`;
  } else if (developingSkills.length > 0) {
    return `Continue developing ${developingSkills.length} skills`;
  }
  return 'All skills are on track';
}

function getRecentActivityCount(records: ProgressRecord[]): number {
  // Get activities from the last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  return records.filter(record => {
    if (!record.date) return false;
    
    let recordDate: Date;
    try {
      // Try to use toDate() method if available (for Firestore Timestamp)
      if (typeof record.date.toDate === 'function') {
        recordDate = record.date.toDate();
      } 
      // Handle Date objects
      else if (record.date instanceof Date) {
        recordDate = record.date;
      } 
      // Handle other formats (string, number)
      else {
        recordDate = new Date(record.date as any);
      }
      
      return recordDate >= thirtyDaysAgo;
    } catch (e) {
      console.error('Error converting date:', e);
      return false;
    }
  }).length;
}

function getNextSteps(assessmentResults: AssessmentResult[]): string {
  const emergingCount = assessmentResults.filter(result => result.status === 'emerging').length;
  
  if (emergingCount > 0) {
    return `Focus on ${emergingCount} emerging skills`;
  }
  return 'Continue current activities';
}