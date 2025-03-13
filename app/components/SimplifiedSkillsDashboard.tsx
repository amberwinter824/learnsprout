// app/components/SimplifiedSkillsDashboard.tsx
'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, getDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { 
  Loader2, 
  ChevronDown, 
  ChevronUp, 
  CheckCircle2, 
  Circle, 
  ArrowRight,
  Filter,
  HelpCircle,
  X
} from 'lucide-react';

// Define skill area colors with index signature
const AREA_COLORS: {
  [key: string]: { bg: string; text: string; border: string; light: string }
} = {
  practical_life: { bg: 'bg-pink-100', text: 'text-pink-800', border: 'border-pink-200', light: 'bg-pink-50' },
  sensorial: { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-200', light: 'bg-purple-50' },
  language: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-200', light: 'bg-blue-50' },
  mathematics: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200', light: 'bg-green-50' },
  cultural: { bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-200', light: 'bg-amber-50' },
  physical: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-200', light: 'bg-red-50' },
  social_emotional: { bg: 'bg-indigo-100', text: 'text-indigo-800', border: 'border-indigo-200', light: 'bg-indigo-50' }
};

interface Skill {
  id: string;
  name: string;
  description: string;
  area: string;
  ageRanges?: string[];
  status?: 'not_started' | 'emerging' | 'developing' | 'mastered';
  lastAssessed?: any;
  notes?: string;
}

interface SkillsByArea {
  [area: string]: Skill[];
}

interface SimplifiedSkillsDashboardProps {
  childId: string;
  ageGroup?: string;
}

interface AreaSummary {
  totalSkills: number;
  mastered: number;
  developing: number;
  emerging: number;
  notStarted: number;
  percentComplete: number;
}

export default function SimplifiedSkillsDashboard({ childId, ageGroup }: SimplifiedSkillsDashboardProps) {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [skillsByArea, setSkillsByArea] = useState<SkillsByArea>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedAreas, setExpandedAreas] = useState<string[]>([]);
  const [showAllSkills, setShowAllSkills] = useState(false);
  const [expandedSkill, setExpandedSkill] = useState<string | null>(null);
  const [showAgeFilter, setShowAgeFilter] = useState(false);
  const [selectedAgeFilter, setSelectedAgeFilter] = useState<string | null>(ageGroup || null);
  const [areaStats, setAreaStats] = useState<Record<string, AreaSummary>>({});
  const [showHelpModal, setShowHelpModal] = useState(false);
  
  // Reference for color translations and area names
  const areaTranslations: Record<string, string> = {
    practical_life: 'Practical Life',
    sensorial: 'Sensorial',
    language: 'Language',
    mathematics: 'Mathematics',
    cultural: 'Cultural',
    physical: 'Physical Development',
    social_emotional: 'Social & Emotional'
  };
  
  // Fetch skills data from Firebase
  useEffect(() => {
    const fetchChildSkills = async () => {
      try {
        setLoading(true);
        
        // Get all skills for this child
        const skillsQuery = query(
          collection(db, 'childSkills'),
          where('childId', '==', childId)
        );
        
        const skillsSnapshot = await getDocs(skillsQuery);
        const childSkillsData: Record<string, Skill> = {};
        
        skillsSnapshot.forEach(doc => {
          const data = doc.data();
          childSkillsData[data.skillId] = {
            id: data.skillId,
            status: data.status,
            lastAssessed: data.lastAssessed,
            notes: data.notes,
            // These will be filled in later
            name: '',
            description: '',
            area: ''
          };
        });
        
        // Get all possible developmental skills
        const allDevelopmentalSkills: Skill[] = [];
        
        const developmentalSkillsQuery = query(collection(db, 'developmentalSkills'));
        const developmentalSkillsSnapshot = await getDocs(developmentalSkillsQuery);
        
        developmentalSkillsSnapshot.forEach(doc => {
          const skillData = doc.data();
          
          // If we have child data for this skill, merge it
          const existingChildSkill = childSkillsData[doc.id];
          let status: Skill['status'] = 'not_started';
          let lastAssessed = null;
          let notes = '';
          
          if (existingChildSkill) {
            status = existingChildSkill.status;
            lastAssessed = existingChildSkill.lastAssessed;
            notes = existingChildSkill.notes || '';
          }
          
          // Apply age filter if selected
          if (selectedAgeFilter && skillData.ageRanges && 
              !skillData.ageRanges.includes(selectedAgeFilter)) {
            return;
          }
          
          allDevelopmentalSkills.push({
            id: doc.id,
            name: skillData.name || 'Unnamed Skill',
            description: skillData.description || '',
            area: skillData.area || 'other',
            ageRanges: skillData.ageRanges || [],
            status,
            lastAssessed,
            notes
          });
        });
        
        // Group skills by area
        const byArea: SkillsByArea = {};
        
        allDevelopmentalSkills.forEach(skill => {
          if (!byArea[skill.area]) {
            byArea[skill.area] = [];
          }
          byArea[skill.area].push(skill);
        });
        
        // Sort skills by area and name
        Object.keys(byArea).forEach(area => {
          byArea[area].sort((a, b) => a.name.localeCompare(b.name));
        });
        
        // Calculate statistics for each area
        const areaStatistics: Record<string, AreaSummary> = {};
        
        Object.entries(byArea).forEach(([area, areaSkills]) => {
          const totalSkills = areaSkills.length;
          const mastered = areaSkills.filter(s => s.status === 'mastered').length;
          const developing = areaSkills.filter(s => s.status === 'developing').length;
          const emerging = areaSkills.filter(s => s.status === 'emerging').length;
          const notStarted = areaSkills.filter(s => s.status === 'not_started').length;
          
          areaStatistics[area] = {
            totalSkills,
            mastered,
            developing,
            emerging,
            notStarted,
            percentComplete: totalSkills > 0 
              ? Math.round(((mastered + developing * 0.7 + emerging * 0.3) / totalSkills) * 100) 
              : 0
          };
        });
        
        setAreaStats(areaStatistics);
        setSkillsByArea(byArea);
        setSkills(allDevelopmentalSkills);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching skills data:', error);
        setError('Failed to load developmental skills');
        setLoading(false);
      }
    };
    
    if (childId) {
      fetchChildSkills();
    }
  }, [childId, selectedAgeFilter]);
  
  // Toggle expanded state for an area
  const toggleAreaExpanded = (area: string) => {
    setExpandedAreas(prevState => 
      prevState.includes(area)
        ? prevState.filter(a => a !== area)
        : [...prevState, area]
    );
  };
  
  // Toggle expanded state for a specific skill
  const toggleSkillExpanded = (skillId: string) => {
    setExpandedSkill(prevState => 
      prevState === skillId ? null : skillId
    );
  };
  
  // Helper to get status icon
  const getStatusIcon = (status: Skill['status']) => {
    switch(status) {
      case 'mastered':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'developing':
        return <ArrowRight className="h-4 w-4 text-blue-600" />;
      case 'emerging':
        return <Circle className="h-4 w-4 text-amber-600 fill-amber-200" />;
      default:
        return <Circle className="h-4 w-4 text-gray-400" />;
    }
  };
  
  // Format date for display
  const formatDate = (timestamp: any): string => {
    if (!timestamp) return 'Not assessed yet';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };
  
  // Get appropriate area styling
  const getAreaStyles = (area: string) => {
    return AREA_COLORS[area] || { 
      bg: 'bg-gray-100', 
      text: 'text-gray-800', 
      border: 'border-gray-200',
      light: 'bg-gray-50'
    };
  };
  
  // Handle age filter change
  const handleAgeFilterChange = (age: string | null) => {
    setSelectedAgeFilter(age);
    setShowAgeFilter(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8 min-h-[200px]">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-700 p-4 rounded-lg">
        <p>{error}</p>
      </div>
    );
  }
  
  // Help modal content
  const renderHelpModal = () => {
    if (!showHelpModal) return null;
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
          <div className="p-5 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-lg font-medium">Understanding Skill Progress</h3>
            <button onClick={() => setShowHelpModal(false)} className="text-gray-500 hover:text-gray-700">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="p-5 space-y-4">
            <div>
              <h4 className="font-medium mb-2">Skill Status Levels</h4>
              <ul className="space-y-2">
                <li className="flex items-center">
                  <Circle className="h-4 w-4 text-gray-400 mr-2" />
                  <span><strong>Not Started</strong>: Skill has not yet been observed or attempted</span>
                </li>
                <li className="flex items-center">
                  <Circle className="h-4 w-4 text-amber-600 fill-amber-200 mr-2" />
                  <span><strong>Emerging</strong>: Beginning to show interest or initial signs of the skill</span>
                </li>
                <li className="flex items-center">
                  <ArrowRight className="h-4 w-4 text-blue-600 mr-2" />
                  <span><strong>Developing</strong>: Practicing the skill with some success but not yet consistent</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle2 className="h-4 w-4 text-green-600 mr-2" />
                  <span><strong>Mastered</strong>: Skill is consistently demonstrated with confidence</span>
                </li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">Age Range Filter</h4>
              <p>The age filter shows skills that are typically developed during that age range. This helps focus on age-appropriate expectations for your child.</p>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">Skill Areas</h4>
              <p>Skills are grouped by developmental areas:</p>
              <ul className="space-y-2 mt-2">
                <li className={`${AREA_COLORS.practical_life.bg} ${AREA_COLORS.practical_life.text} px-2 py-1 rounded`}>
                  Practical Life: Self-care, coordination, and independence
                </li>
                <li className={`${AREA_COLORS.sensorial.bg} ${AREA_COLORS.sensorial.text} px-2 py-1 rounded`}>
                  Sensorial: Refinement of the senses and perception
                </li>
                <li className={`${AREA_COLORS.language.bg} ${AREA_COLORS.language.text} px-2 py-1 rounded`}>
                  Language: Communication, reading, and writing skills
                </li>
                <li className={`${AREA_COLORS.mathematics.bg} ${AREA_COLORS.mathematics.text} px-2 py-1 rounded`}>
                  Mathematics: Number sense, patterns, and logical thinking
                </li>
                <li className={`${AREA_COLORS.cultural.bg} ${AREA_COLORS.cultural.text} px-2 py-1 rounded`}>
                  Cultural: Understanding of the world, science, and geography
                </li>
                <li className={`${AREA_COLORS.physical.bg} ${AREA_COLORS.physical.text} px-2 py-1 rounded`}>
                  Physical: Gross and fine motor development
                </li>
                <li className={`${AREA_COLORS.social_emotional.bg} ${AREA_COLORS.social_emotional.text} px-2 py-1 rounded`}>
                  Social & Emotional: Relationship skills and emotional regulation
                </li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">How to Use This Dashboard</h4>
              <p>This dashboard gives you a visual overview of your child's development across different skill areas. You can:</p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>Click on any area to expand it and see specific skills</li>
                <li>Filter by age range to focus on age-appropriate skills</li>
                <li>Click on an individual skill to see more details</li>
                <li>Use the progress visualization to identify strengths and areas for growth</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  };
}