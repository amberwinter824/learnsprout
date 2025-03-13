// app/components/ProgressiveSkillPath.tsx
'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, getDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { 
  Loader2, 
  ChevronDown, 
  ChevronUp, 
  ChevronRight,
  HelpCircle,
  Search,
  Filter,
  ArrowUpRight,
  X
} from 'lucide-react';

interface Skill {
  id: string;
  name: string;
  description: string;
  area: string;
  ageRanges?: string[];
  status?: 'not_started' | 'emerging' | 'developing' | 'mastered';
  progressLevel?: number; // 0-10 scale for continuous progress
  lastAssessed?: any;
  notes?: string;
  indicators?: string[];
  nextSteps?: string[];
}

interface ProgressiveSkillPathProps {
  childId: string;
  ageGroup?: string;
  initialExpandedArea?: string;
}

// Define areas with descriptions and progression indicators
const skillAreas = {
  practical_life: {
    name: 'Practical Life',
    color: '#EC4899', // Pink-500
    lightColor: '#FCE7F3', // Pink-100
    description: 'Self-care, independence, and fine motor coordination',
    progressIndicators: {
      emerging: 'Shows interest in the activity with guidance',
      developing: 'Attempts the activity with occasional assistance',
      progressing: 'Performs the activity independently with concentration',
      strength: 'Demonstrates mastery and helps others'
    }
  },
  sensorial: {
    name: 'Sensorial',
    color: '#8B5CF6', // Violet-500
    lightColor: '#EDE9FE', // Violet-100
    description: 'Refinement of the senses and perception',
    progressIndicators: {
      emerging: 'Notices sensory distinctions with prompting',
      developing: 'Recognizes differences and similarities independently',
      progressing: 'Categorizes and orders sensory information',
      strength: 'Uses refined sensory discrimination in complex tasks'
    }
  },
  language: {
    name: 'Language',
    color: '#3B82F6', // Blue-500
    lightColor: '#DBEAFE', // Blue-100
    description: 'Communication, vocabulary, and literacy development',
    progressIndicators: {
      emerging: 'Begins to use language tools with support',
      developing: 'Uses language concepts with growing vocabulary',
      progressing: 'Communicates clearly and engages with literacy materials',
      strength: 'Expresses complex ideas and reads/writes with confidence'
    }
  },
  mathematics: {
    name: 'Mathematics',
    color: '#10B981', // Emerald-500
    lightColor: '#D1FAE5', // Emerald-100
    description: 'Numerical understanding, patterns, and logical reasoning',
    progressIndicators: {
      emerging: 'Recognizes basic math concepts with guidance',
      developing: 'Works with mathematical materials independently',
      progressing: 'Demonstrates understanding of abstract concepts',
      strength: 'Applies mathematical thinking across different contexts'
    }
  },
  cultural: {
    name: 'Cultural',
    color: '#F59E0B', // Amber-500
    lightColor: '#FEF3C7', // Amber-100
    description: 'Understanding of the world, geography, and sciences',
    progressIndicators: {
      emerging: 'Shows curiosity about the world with prompting',
      developing: 'Engages with cultural materials independently',
      progressing: 'Makes connections between cultural concepts',
      strength: 'Demonstrates deep understanding of cultural elements'
    }
  },
  social_emotional: {
    name: 'Social & Emotional',
    color: '#6366F1', // Indigo-500
    lightColor: '#E0E7FF', // Indigo-100
    description: 'Relationship skills, emotional regulation, and self-awareness',
    progressIndicators: {
      emerging: 'Recognizes emotions with support',
      developing: 'Manages emotions and interacts positively',
      progressing: 'Navigates social situations and resolves conflicts',
      strength: 'Shows empathy and leadership in group settings'
    }
  },
  physical: {
    name: 'Physical',
    color: '#EF4444', // Red-500
    lightColor: '#FEE2E2', // Red-100
    description: 'Gross motor skills, coordination, and body awareness',
    progressIndicators: {
      emerging: 'Attempts physical activities with assistance',
      developing: 'Performs physical movements with growing control',
      progressing: 'Coordinates complex movements independently',
      strength: 'Demonstrates refined physical skills and helps others'
    }
  }
};

export default function ProgressiveSkillPath({ 
  childId, 
  ageGroup,
  initialExpandedArea 
}: ProgressiveSkillPathProps) {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [skillsByArea, setSkillsByArea] = useState<{[area: string]: Skill[]}>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedAreas, setExpandedAreas] = useState<string[]>(initialExpandedArea ? [initialExpandedArea] : []);
  const [searchQuery, setSearchQuery] = useState('');
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [currentAgeFilter, setCurrentAgeFilter] = useState<string | null>(ageGroup || null);
  
  // Fetch skills data
  useEffect(() => {
    async function fetchSkillsData() {
      setLoading(true);
      try {
        // Get developmental skills
        const skillsQuery = query(collection(db, 'developmentalSkills'));
        const skillsSnapshot = await getDocs(skillsQuery);
        
        const allDevSkills: Skill[] = [];
        skillsSnapshot.forEach(doc => {
          const data = doc.data();
          // Apply age filter if provided
          if (currentAgeFilter && data.ageRanges && !data.ageRanges.includes(currentAgeFilter)) {
            return;
          }
          
          allDevSkills.push({
            id: doc.id,
            name: data.name || 'Unnamed Skill',
            description: data.description || '',
            area: data.area || 'other',
            ageRanges: data.ageRanges || [],
            status: 'not_started',
            progressLevel: 0,
            indicators: data.indicators || [],
            nextSteps: data.nextSteps || []
          });
        });
        
        // Get child's progress data
        const childSkillsQuery = query(
          collection(db, 'childSkills'),
          where('childId', '==', childId)
        );
        
        const childSkillsSnapshot = await getDocs(childSkillsQuery);
        
        // Create a map for quick lookup
        const childSkillsMap = new Map();
        childSkillsSnapshot.forEach(doc => {
          const data = doc.data();
          childSkillsMap.set(data.skillId, {
            status: data.status,
            progressLevel: data.progressLevel || getProgressLevelFromStatus(data.status),
            lastAssessed: data.lastAssessed,
            notes: data.notes
          });
        });
        
        // Merge the child's progress with the skills data
        const mergedSkills = allDevSkills.map(skill => {
          const childSkill = childSkillsMap.get(skill.id);
          if (childSkill) {
            return {
              ...skill,
              status: childSkill.status,
              progressLevel: childSkill.progressLevel,
              lastAssessed: childSkill.lastAssessed,
              notes: childSkill.notes
            };
          }
          return skill;
        });
        
        // Sort skills by name
        mergedSkills.sort((a, b) => a.name.localeCompare(b.name));
        
        // Group by area
        const byArea: {[area: string]: Skill[]} = {};
        mergedSkills.forEach(skill => {
          if (!byArea[skill.area]) {
            byArea[skill.area] = [];
          }
          byArea[skill.area].push(skill);
        });
        
        setSkills(mergedSkills);
        setSkillsByArea(byArea);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching skills data:', err);
        setError('Failed to load skills data. Please try again later.');
        setLoading(false);
      }
    }
    
    if (childId) {
      fetchSkillsData();
    }
  }, [childId, currentAgeFilter]);
  
  // Helper function to convert status to progress level if not provided
  function getProgressLevelFromStatus(status: string): number {
    switch(status) {
      case 'mastered': return 10;
      case 'developing': return 6;
      case 'emerging': return 3;
      case 'not_started': 
      default: return 0;
    }
  }
  
  // Convert progress level to user-friendly term
  function getProgressTerm(progressLevel: number): string {
    if (progressLevel >= 9) return 'strength';
    if (progressLevel >= 6) return 'progressing';
    if (progressLevel >= 3) return 'developing';
    if (progressLevel > 0) return 'emerging';
    return 'not-started';
  }
  
  // Format date for UI
  function formatDate(timestamp: any): string {
    if (!timestamp) return 'Not yet assessed';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }
  
  // Toggle expanded area
  function toggleAreaExpanded(area: string) {
    setExpandedAreas(prev => 
      prev.includes(area) 
        ? prev.filter(a => a !== area) 
        : [...prev, area]
    );
  }
  
  // Filter skills by search query
  const filteredSkillsByArea = searchQuery 
    ? Object.fromEntries(
        Object.entries(skillsByArea).map(([area, areaSkills]) => [
          area,
          areaSkills.filter(skill => 
            skill.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            skill.description.toLowerCase().includes(searchQuery.toLowerCase())
          )
        ]).filter(([_, skills]) => skills.length > 0)
      )
    : skillsByArea;
  
  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="bg-red-50 p-4 rounded-lg text-red-700">
        <p>{error}</p>
      </div>
    );
  }
  
  // Render help modal
  const renderHelpModal = () => {
    if (!showHelpModal) return null;
    
    return (
      <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center p-6 border-b border-gray-200">
            <h3 className="text-lg font-medium">Understanding Skill Progression</h3>
            <button
              onClick={() => setShowHelpModal(false)}
              className="text-gray-400 hover:text-gray-500"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          
          <div className="p-6 space-y-6">
            <div>
              <h4 className="font-medium mb-2">About Continuous Development</h4>
              <p className="text-gray-600">
                Children don't simply "master" and complete skills. Instead, they continuously develop and refine abilities as they grow.
                Each skill evolves and becomes more sophisticated over time, with activities becoming more challenging as children progress.
              </p>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">Progress Stages</h4>
              <div className="space-y-3">
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-gray-200 mr-2"></div>
                  <div>
                    <span className="font-medium">Not Started</span>
                    <p className="text-sm text-gray-600">Not yet showing interest or engagement with this skill area</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-yellow-400 mr-2"></div>
                  <div>
                    <span className="font-medium">Emerging</span>
                    <p className="text-sm text-gray-600">Beginning to show interest and initial engagement with support</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-blue-400 mr-2"></div>
                  <div>
                    <span className="font-medium">Developing</span>
                    <p className="text-sm text-gray-600">Working on the skill with growing independence</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-green-400 mr-2"></div>
                  <div>
                    <span className="font-medium">Progressing</span>
                    <p className="text-sm text-gray-600">Confidently demonstrating the skill in various contexts</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-purple-500 mr-2"></div>
                  <div>
                    <span className="font-medium">Strength</span>
                    <p className="text-sm text-gray-600">An area of excellence where the child shows advanced capabilities</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">Supporting Your Child</h4>
              <p className="text-gray-600">
                Each skill includes "What to Look For" guidance to help you recognize progress,
                and "Next Steps" suggestions for further development. Activities in the app are designed 
                to support skills at their current developmental stage.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  return (
    <div>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center">
          <h2 className="text-lg font-medium text-gray-900">Developmental Skills Progression</h2>
          <button
            onClick={() => setShowHelpModal(true)}
            className="ml-2 text-gray-400 hover:text-gray-600"
          >
            <HelpCircle className="h-4 w-4" />
          </button>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              className="pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500 block w-full sm:text-sm"
              placeholder="Search skills..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <select
            className="border border-gray-300 rounded-md py-2 pl-3 pr-10 text-sm focus:ring-emerald-500 focus:border-emerald-500"
            value={currentAgeFilter || ''}
            onChange={(e) => setCurrentAgeFilter(e.target.value || null)}
          >
            <option value="">All Ages</option>
            <option value="0-1">0-1 years</option>
            <option value="1-2">1-2 years</option>
            <option value="2-3">2-3 years</option>
            <option value="3-4">3-4 years</option>
            <option value="4-5">4-5 years</option>
            <option value="5-6">5-6 years</option>
          </select>
        </div>
      </div>
      
      <div className="space-y-6">
        {Object.keys(filteredSkillsByArea).length > 0 ? (
          Object.entries(filteredSkillsByArea).map(([area, areaSkills]) => {
            // Skip if no skills after filtering
            if (!Array.isArray(areaSkills) || areaSkills.length === 0) return null;
            
            const areaInfo = skillAreas[area as keyof typeof skillAreas];
            const isExpanded = expandedAreas.includes(area);
            
            return (
              <div 
                key={area} 
                className="bg-white rounded-lg shadow overflow-hidden border border-gray-200"
              >
                <div 
                  className="flex items-center justify-between px-6 py-4 cursor-pointer"
                  onClick={() => toggleAreaExpanded(area)}
                  style={{ backgroundColor: areaInfo?.lightColor || '#F3F4F6' }}
                >
                  <div className="flex items-center">
                    <div 
                      className="w-4 h-4 rounded-full mr-3"
                      style={{ backgroundColor: areaInfo?.color || '#6B7280' }}
                    ></div>
                    <h3 className="font-medium" style={{ color: areaInfo?.color || '#374151' }}>
                      {areaInfo?.name || area}
                    </h3>
                  </div>
                  
                  <div className="flex items-center">
                    <span className="text-sm text-gray-500 mr-3">
                      {Array.isArray(areaSkills) ? areaSkills.length : 0} skill{Array.isArray(areaSkills) && areaSkills.length !== 1 ? 's' : ''}
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="h-5 w-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                </div>
                
                {isExpanded && (
                  <div className="p-5 border-t border-gray-200">
                    <p className="text-sm text-gray-600 mb-4">
                      {areaInfo?.description || ''}
                    </p>
                    
                    <div className="mb-6 p-4 rounded-lg border border-gray-200">
                      <h4 className="font-medium text-sm mb-2">What to Look For</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {Object.entries(areaInfo?.progressIndicators || {}).map(([level, description]) => (
                          <div key={level} className="flex items-start">
                            <div className={`h-5 w-5 rounded-full flex-shrink-0 mt-0.5 mr-2 flex items-center justify-center
                              ${level === 'strength' ? 'bg-purple-100 text-purple-600' :
                                level === 'progressing' ? 'bg-green-100 text-green-600' :
                                level === 'developing' ? 'bg-blue-100 text-blue-600' :
                                'bg-yellow-100 text-yellow-600'}`}
                            >
                              <div className={`h-2 w-2 rounded-full 
                                ${level === 'strength' ? 'bg-purple-500' :
                                  level === 'progressing' ? 'bg-green-500' :
                                  level === 'developing' ? 'bg-blue-500' :
                                  'bg-yellow-500'}`}
                              ></div>
                            </div>
                            <div>
                              <span className="text-sm font-medium capitalize">{level}</span>
                              <p className="text-xs text-gray-600">{description}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      {Array.isArray(areaSkills) && areaSkills.map((skill: Skill) => {
                        const progressTerm = getProgressTerm(skill.progressLevel || 0);
                        const progressWidth = (skill.progressLevel || 0) * 10;
                        
                        return (
                          <div key={skill.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                            <h4 className="font-medium text-gray-900 mb-2">{skill.name}</h4>
                            <p className="text-sm text-gray-600 mb-4">{skill.description}</p>
                            
                            {/* Progress Path Visualization */}
                            <div className="mb-4">
                              <div className="flex justify-between text-xs text-gray-500 mb-1">
                                <span>Not Started</span>
                                <span>Emerging</span>
                                <span>Developing</span>
                                <span>Progressing</span>
                                <span>Strength</span>
                              </div>
                              <div className="h-4 bg-gray-100 rounded-full overflow-hidden relative">
                                <div 
                                  className={`h-full rounded-full absolute left-0 top-0
                                    ${progressTerm === 'strength' ? 'bg-purple-500' :
                                      progressTerm === 'progressing' ? 'bg-green-500' :
                                      progressTerm === 'developing' ? 'bg-blue-500' :
                                      progressTerm === 'emerging' ? 'bg-yellow-500' :
                                      'bg-gray-200'}`}
                                  style={{ width: `${progressWidth}%` }}
                                ></div>
                                
                                {/* Progress Markers */}
                                <div className="absolute inset-0 flex">
                                  <div className="w-1/5 h-full border-r border-white"></div>
                                  <div className="w-1/5 h-full border-r border-white"></div>
                                  <div className="w-1/5 h-full border-r border-white"></div>
                                  <div className="w-1/5 h-full border-r border-white"></div>
                                  <div className="w-1/5 h-full"></div>
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-start mt-3">
                              <div className={`h-5 w-5 rounded-full flex-shrink-0 mt-0.5 mr-2 flex items-center justify-center
                                ${progressTerm === 'strength' ? 'bg-purple-100 text-purple-600' :
                                  progressTerm === 'progressing' ? 'bg-green-100 text-green-600' :
                                  progressTerm === 'developing' ? 'bg-blue-100 text-blue-600' :
                                  progressTerm === 'emerging' ? 'bg-yellow-100 text-yellow-600' :
                                  'bg-gray-100 text-gray-600'}`}
                              >
                                <div className={`h-2 w-2 rounded-full 
                                  ${progressTerm === 'strength' ? 'bg-purple-500' :
                                    progressTerm === 'progressing' ? 'bg-green-500' :
                                    progressTerm === 'developing' ? 'bg-blue-500' :
                                    progressTerm === 'emerging' ? 'bg-yellow-500' :
                                    'bg-gray-400'}`}
                                ></div>
                              </div>
                              <div>
                                <div className="flex items-center">
                                  <span className="text-sm font-medium capitalize">{progressTerm !== 'not-started' ? progressTerm : 'Not Yet Started'}</span>
                                  {skill.lastAssessed && (
                                    <span className="text-xs text-gray-500 ml-2">
                                      Last assessed: {formatDate(skill.lastAssessed)}
                                    </span>
                                  )}
                                </div>
                                {skill.notes && (
                                  <p className="text-xs text-gray-600 mt-1 italic">{skill.notes}</p>
                                )}
                              </div>
                            </div>
                            
                            {/* Specific indicators for this skill */}
                            {skill.indicators && skill.indicators.length > 0 && (
                              <div className="mt-4 bg-gray-50 p-3 rounded-md">
                                <h5 className="text-xs font-medium text-gray-700 mb-2">What to Look For:</h5>
                                <ul className="text-xs text-gray-600 space-y-1 ml-4 list-disc">
                                  {skill.indicators.map((indicator: string, idx: number) => (
                                    <li key={idx}>{indicator}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            
                            {/* Next steps for this skill */}
                            {skill.nextSteps && skill.nextSteps.length > 0 && (
                              <div className="mt-3 bg-blue-50 p-3 rounded-md">
                                <h5 className="text-xs font-medium text-blue-700 mb-2 flex items-center">
                                  <ArrowUpRight className="h-3 w-3 mr-1" />
                                  Next Steps:
                                </h5>
                                <ul className="text-xs text-blue-700 space-y-1 ml-4 list-disc">
                                  {skill.nextSteps.map((step: string, idx: number) => (
                                    <li key={idx}>{step}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Filter className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No skills match your criteria</h3>
            <p className="text-gray-500 mb-4">
              Try adjusting your search or filter settings to see more skills.
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setCurrentAgeFilter(ageGroup || null);
              }}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
            >
              Reset filters
            </button>
          </div>
        )}
      </div>
      
      {renderHelpModal()}
    </div>
  );
}