"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
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
import { collection, query, where, getDocs, doc, getDoc, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { ChildSkill, ProgressRecord } from '@/lib/dataService';

interface Child {
  id: string;
  name: string;
  ageGroup?: string;
  [key: string]: any;
}

interface Activity {
  id: string;
  title: string;
  description?: string;
  skillsAddressed?: string[];
  [key: string]: any;
}

interface DevelopmentalSkill {
  id: string;
  name: string;
  area?: string;
  description?: string;
  status: 'not_started' | 'emerging' | 'developing' | 'mastered';
  lastAssessed?: Timestamp | null;
  [key: string]: any;
}

interface FormData {
  activityId: string;
  notes: string;
  completionStatus: string;
  engagementLevel: string;
  date: string;
}

interface PageParams {
  params: {
    id: string;
  };
}

export default function ProgressTrackingPage({ params }: PageParams) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { id: childId } = params;
  const [child, setChild] = useState<Child | null>(null);
  const [progressRecords, setProgressRecords] = useState<ProgressRecord[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [developmentalSkills, setDevelopmentalSkills] = useState<DevelopmentalSkill[]>([]);
  const [showAddRecord, setShowAddRecord] = useState(false);
  const [skillView, setSkillView] = useState('visual');
  const [selectedSkillArea, setSelectedSkillArea] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [formData, setFormData] = useState<FormData>({
    activityId: '',
    notes: '',
    completionStatus: 'completed',
    engagementLevel: 'high',
    date: new Date().toISOString().slice(0, 10)
  });

  // Get the record ID from the query parameter
  const recordId = searchParams.get('record');
  
  // Get the showAddRecord parameter from the URL
  const showAddRecordParam = searchParams.get('showAddRecord');
  
  // State to track if we should show record details
  const [showRecordDetails, setShowRecordDetails] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<ProgressRecord | null>(null);
  
  // If recordId is present, fetch and display that specific record
  useEffect(() => {
    if (recordId) {
      // Fetch the specific record
      fetchRecordDetails(recordId);
      setShowRecordDetails(true);
    } else {
      setShowRecordDetails(false);
      setSelectedRecord(null);
    }
  }, [recordId]);
  
  // Show the add record modal if the URL parameter is set
  useEffect(() => {
    if (showAddRecordParam === 'true') {
      setShowAddRecord(true);
    }
  }, [showAddRecordParam]);
  
  // Function to fetch record details
  const fetchRecordDetails = async (id: string) => {
    try {
      const recordDoc = await getDoc(doc(db, 'progressRecords', id));
      if (recordDoc.exists()) {
        const recordData = { id: recordDoc.id, ...recordDoc.data() } as ProgressRecord;
        setSelectedRecord(recordData);
      }
    } catch (error) {
      console.error('Error fetching record details:', error);
    }
  };

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
        
        const childData = { id: childDocSnap.id, ...childDocSnap.data() } as Child;
        setChild(childData);

        // Fetch progress records
        const progressQuery = query(
          collection(db, 'progressRecords'),
          where('childId', '==', childId)
        );
        const progressSnapshot = await getDocs(progressQuery);
        const progressData: ProgressRecord[] = [];
        progressSnapshot.forEach(doc => {
          progressData.push({ id: doc.id, ...doc.data() } as ProgressRecord);
        });
        
        // Sort by date descending
        progressData.sort((a, b) => {
          const dateA = a.date?.seconds ? new Date(a.date.seconds * 1000) : new Date(a.date);
          const dateB = b.date?.seconds ? new Date(b.date.seconds * 1000) : new Date(b.date);
          return dateB.getTime() - dateA.getTime();
        });
        
        setProgressRecords(progressData);

        // Fetch all activities
        const activitiesQuery = query(collection(db, 'activities'));
        const activitiesSnapshot = await getDocs(activitiesQuery);
        const activitiesData: Activity[] = [];
        activitiesSnapshot.forEach(doc => {
          activitiesData.push({ id: doc.id, ...doc.data() } as Activity);
        });
        setActivities(activitiesData);
        
        // Fetch developmental skills
        const skillsQuery = query(collection(db, 'developmentalSkills'));
        const skillsSnapshot = await getDocs(skillsQuery);
        const skillsData: Partial<DevelopmentalSkill>[] = [];
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
        const childSkillsData: Record<string, { status: DevelopmentalSkill['status'], lastAssessed: Timestamp | null }> = {};
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
          status: childSkillsData[skill.id as string]?.status || 'not_started',
          lastAssessed: childSkillsData[skill.id as string]?.lastAssessed || null
        })) as DevelopmentalSkill[];
        
        setDevelopmentalSkills(mergedSkills);
      } catch (error) {
        console.error('Error fetching data:', error);
        setError(`Error fetching data: ${error instanceof Error ? error.message : String(error)}`);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [childId]);

  // Group skills by area
  const skillsByArea = developmentalSkills.reduce<Record<string, DevelopmentalSkill[]>>((acc, skill) => {
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
      let recordDate: Date;
      if (record.date?.seconds) {
        // Handle Firestore Timestamp
        recordDate = new Date(record.date.seconds * 1000);
      } else if (record.date instanceof Date) {
        // Handle JavaScript Date object
        recordDate = record.date;
      } else {
        // Handle string or other format
        recordDate = new Date(record.date);
      }
      
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
  const formatDate = (timestamp: any): string => {
    if (!timestamp) return 'Never';
    
    let date: Date;
    if (timestamp.seconds) {
      // Handle Firestore Timestamp
      date = new Date(timestamp.seconds * 1000);
    } else if (timestamp instanceof Date) {
      // Handle JavaScript Date object
      date = timestamp;
    } else {
      // Handle string or other format
      date = new Date(timestamp);
    }
    
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getCompletionStatusLabel = (status: string) => {
    switch(status) {
      case 'completed': return 'Completed';
      case 'in_progress': return 'In Progress';
      case 'started': return 'Started';
      default: return status;
    }
  };

  const getEngagementLevelLabel = (level: string) => {
    switch(level) {
      case 'high': return 'High';
      case 'medium': return 'Medium';
      case 'low': return 'Low';
      default: return level;
    }
  };

  const getStatusLabel = (status: string) => {
    switch(status) {
      case 'emerging': return 'Emerging';
      case 'developing': return 'Developing';
      case 'mastered': return 'Mastered';
      case 'not_started': return 'Not Started';
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
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

  const getStatusIcon = (status: string) => {
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

  const getAreaLabel = (area: string) => {
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

  const getAreaColor = (area: string) => {
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

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
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
        date: new Date(formData.date), // Convert string date to Date object
        createdAt: serverTimestamp()
      };
      
      const docRef = await addDoc(collection(db, 'progressRecords'), newRecord);
      
      // Add the new record to the state with proper typing
      setProgressRecords(prev => [{
        id: docRef.id,
        ...newRecord
      } as ProgressRecord, ...prev]);
      
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
      setError(`Failed to add record: ${error instanceof Error ? error.message : String(error)}`);
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
      {/* Rest of your component remains the same */}
      {/* ... */}
    </div>
  );
}

// Helper functions
function formatDate(timestamp: any) {
  if (!timestamp) return 'N/A';
  
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return format(date, 'MMM d, yyyy');
}

function getCompletionStatusLabel(status: string) {
  switch (status) {
    case 'completed': return 'Completed';
    case 'in_progress': return 'In Progress';
    case 'started': return 'Started';
    default: return 'Unknown';
  }
}

function getEngagementLevelLabel(level: string) {
  switch (level) {
    case 'high': return 'High';
    case 'medium': return 'Medium';
    case 'low': return 'Low';
    default: return 'Unknown';
  }
}

function getStatusLabel(status: string) {
  switch (status) {
    case 'mastered': return 'Mastered';
    case 'emerging': return 'Emerging';
    case 'developing': return 'Developing';
    case 'not_started': return 'Not Started';
    default: return 'Unknown';
  }
}

function getStatusIcon(status: string) {
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

function getStatusColor(status: string) {
  switch (status) {
    case 'mastered': return 'bg-green-100 text-green-800';
    case 'emerging': return 'bg-blue-100 text-blue-800';
    case 'developing': return 'bg-amber-100 text-amber-800';
    case 'not_started': return 'bg-gray-100 text-gray-800';
    default: return 'bg-gray-100 text-gray-800';
  }
}

function getAreaLabel(area: string) {
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

function getAreaColor(area: string) {
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
function getAgeAppropriateGuidance(ageGroup: string) {
  const guidanceByAge: Record<string, { expectations: string, milestones: string[] }> = {
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