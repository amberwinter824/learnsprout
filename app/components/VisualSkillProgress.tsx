// app/components/VisualSkillProgress.tsx
'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, getDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { InfoIcon, Loader2, HelpCircle, X } from 'lucide-react';

interface Skill {
  id: string;
  name: string;
  area: string;
  status?: 'not_started' | 'emerging' | 'developing' | 'mastered';
}

interface SkillsByArea {
  [area: string]: Skill[];
}

interface SkillsData {
  totalSkills: number;
  totalMastered: number;
  totalDeveloping: number;
  totalEmerging: number;
  totalNotStarted: number;
  byArea: {
    [area: string]: {
      mastered: number;
      developing: number;
      emerging: number;
      notStarted: number;
      total: number;
      percent: number;
    }
  }
}

interface VisualSkillProgressProps {
  childId: string;
  ageGroup?: string;
  compact?: boolean;
  onSkillAreaClick?: (area: string) => void;
}

export default function VisualSkillProgress({ 
  childId, 
  ageGroup, 
  compact = false,
  onSkillAreaClick
}: VisualSkillProgressProps) {
  const [skillsData, setSkillsData] = useState<SkillsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [selectedArea, setSelectedArea] = useState<string | null>(null);
  
  // Area definitions with colors and descriptions
  const skillAreas = {
    practical_life: {
      name: 'Practical Life',
      color: '#F472B6', // Pink
      description: 'Self-care skills, independence, and fine motor coordination',
      examples: ['Pouring liquids', 'Using utensils', 'Dressing independently']
    },
    sensorial: {
      name: 'Sensorial',
      color: '#A78BFA', // Purple
      description: 'Refinement and development of the five senses',
      examples: ['Color matching', 'Texture discrimination', 'Sound recognition']
    },
    language: {
      name: 'Language',
      color: '#60A5FA', // Blue
      description: 'Communication skills, vocabulary development, and early literacy',
      examples: ['Following directions', 'Letter recognition', 'Conversational skills']
    },
    mathematics: {
      name: 'Mathematics',
      color: '#34D399', // Green
      description: 'Number sense, patterns, and logical thinking',
      examples: ['Counting objects', 'Shape recognition', 'Simple addition concepts']
    },
    cultural: {
      name: 'Cultural',
      color: '#FBBF24', // Amber
      description: 'Understanding the world, geography, and natural sciences',
      examples: ['Animal classification', 'Map work', 'Learning about cultures']
    },
    social_emotional: {
      name: 'Social & Emotional',
      color: '#818CF8', // Indigo
      description: 'Relationship skills, emotional regulation, and self-awareness',
      examples: ['Identifying feelings', 'Taking turns', 'Conflict resolution']
    },
    physical: {
      name: 'Physical',
      color: '#F87171', // Red
      description: 'Gross motor skills, body awareness, and coordination',
      examples: ['Balancing', 'Climbing safely', 'Throwing and catching']
    }
  };
  
  // Fetch and process skills data
  useEffect(() => {
    const fetchSkillsData = async () => {
      try {
        setLoading(true);
        
        // Get all developmental skills
        const devSkillsQuery = query(collection(db, 'developmentalSkills'));
        const devSkillsSnapshot = await getDocs(devSkillsQuery);
        
        // Create a map of all developmental skills
        const allSkills = new Map<string, Skill>();
        
        devSkillsSnapshot.forEach(doc => {
          const data = doc.data();
          
          // Apply age filter if provided
          if (ageGroup && data.ageRanges && !data.ageRanges.includes(ageGroup)) {
            return;
          }
          
          allSkills.set(doc.id, {
            id: doc.id,
            name: data.name || '',
            area: data.area || 'other',
            status: 'not_started'
          });
        });
        
        // Get child's skill statuses
        const childSkillsQuery = query(
          collection(db, 'childSkills'),
          where('childId', '==', childId)
        );
        
        const childSkillsSnapshot = await getDocs(childSkillsQuery);
        
        // Update status for skills the child has progress on
        childSkillsSnapshot.forEach(doc => {
          const data = doc.data();
          if (allSkills.has(data.skillId)) {
            const skill = allSkills.get(data.skillId);
            if (skill) {
              skill.status = data.status;
              allSkills.set(data.skillId, skill);
            }
          }
        });
        
        // Convert to array and group by area
        const skillsArray = Array.from(allSkills.values());
        const skillsByArea: SkillsByArea = {};
        
        skillsArray.forEach(skill => {
          if (!skillsByArea[skill.area]) {
            skillsByArea[skill.area] = [];
          }
          skillsByArea[skill.area].push(skill);
        });
        
        // Calculate stats
        const stats: SkillsData = {
          totalSkills: skillsArray.length,
          totalMastered: skillsArray.filter(s => s.status === 'mastered').length,
          totalDeveloping: skillsArray.filter(s => s.status === 'developing').length,
          totalEmerging: skillsArray.filter(s => s.status === 'emerging').length,
          totalNotStarted: skillsArray.filter(s => s.status === 'not_started').length,
          byArea: {}
        };
        
        // Calculate stats for each area
        Object.entries(skillsByArea).forEach(([area, skills]) => {
          const mastered = skills.filter(s => s.status === 'mastered').length;
          const developing = skills.filter(s => s.status === 'developing').length;
          const emerging = skills.filter(s => s.status === 'emerging').length;
          const notStarted = skills.filter(s => s.status === 'not_started').length;
          const total = skills.length;
          
          // Calculate progress percentage (weighted)
          const percent = total === 0 ? 0 : Math.round(
            ((mastered + developing * 0.7 + emerging * 0.3) / total) * 100
          );
          
          stats.byArea[area] = {
            mastered,
            developing,
            emerging,
            notStarted,
            total,
            percent
          };
        });
        
        setSkillsData(stats);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching skills data:', err);
        setError('Failed to load developmental skills data');
        setLoading(false);
      }
    };
    
    if (childId) {
      fetchSkillsData();
    }
  }, [childId, ageGroup]);
  
  // Handle clicking on an area in the chart
  const handleAreaClick = (area: string) => {
    setSelectedArea(area);
    
    if (onSkillAreaClick) {
      onSkillAreaClick(area);
    } else {
      setShowInfoModal(true);
    }
  };
  
  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center p-6 min-h-[200px]">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }
  
  // Show error state
  if (error) {
    return (
      <div className="bg-red-50 text-red-700 p-4 rounded-md">
        <p>{error}</p>
      </div>
    );
  }
  
  // No data state
  if (!skillsData) {
    return (
      <div className="p-4 text-center text-gray-500">
        No skills data available
      </div>
    );
  }
  
  // Create the radar chart data
  const areas = Object.keys(skillAreas)
    .filter(area => skillsData.byArea[area]?.total > 0);
  
  // Render info modal for a selected area
  const renderInfoModal = () => {
    if (!showInfoModal || !selectedArea) return null;
    
    const areaInfo = skillAreas[selectedArea as keyof typeof skillAreas];
    const stats = skillsData.byArea[selectedArea];
    
    if (!areaInfo || !stats) return null;
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center p-4 border-b border-gray-200">
            <h3 className="text-lg font-medium" style={{ color: areaInfo.color }}>
              {areaInfo.name}
            </h3>
            <button 
              onClick={() => setShowInfoModal(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          
          <div className="p-4">
            <p className="mb-4">{areaInfo.description}</p>
            
            <div className="mb-4">
              <h4 className="font-medium mb-2">Examples:</h4>
              <ul className="list-disc pl-5 space-y-1">
                {areaInfo.examples.map((example, index) => (
                  <li key={index}>{example}</li>
                ))}
              </ul>
            </div>
            
            <div className="bg-gray-50 p-3 rounded-md">
              <h4 className="font-medium mb-2">Current Progress:</h4>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="text-xs text-gray-500">Mastered</div>
                  <div className="font-medium">{stats.mastered} of {stats.total}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">In Progress</div>
                  <div className="font-medium">{stats.developing + stats.emerging} of {stats.total}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Not Started</div>
                  <div className="font-medium">{stats.notStarted} of {stats.total}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Overall Progress</div>
                  <div className="font-medium">{stats.percent}%</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  // Compact view for small screens or widgets
  if (compact) {
    return (
      <div className="p-4 bg-white rounded-lg shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-medium text-gray-700">Skills Progress</h3>
          <button 
            onClick={() => setShowInfoModal(true)}
            className="text-gray-400 hover:text-gray-600"
          >
            <HelpCircle className="h-4 w-4" />
          </button>
        </div>
        
        <div className="space-y-3">
          {areas.map(area => {
            const areaInfo = skillAreas[area as keyof typeof skillAreas];
            const stats = skillsData.byArea[area];
            
            if (!stats || stats.total === 0) return null;
            
            return (
              <div key={area} className="flex items-center">
                <div
                  className="w-3 h-3 rounded-full mr-2"
                  style={{ backgroundColor: areaInfo.color }}
                />
                <div className="flex-1">
                  <div className="flex justify-between items-center text-xs mb-1">
                    <span>{areaInfo.name}</span>
                    <span>{stats.percent}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${stats.percent}%`,
                        backgroundColor: areaInfo.color
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        {renderInfoModal()}
      </div>
    );
  }
  
  // Full view with the radar chart and skill breakdown
  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-200 flex justify-between items-center">
        <h2 className="text-lg font-medium text-gray-900">Skills Development</h2>
        <button 
          onClick={() => setShowInfoModal(true)}
          className="text-gray-400 hover:text-gray-600"
        >
          <HelpCircle className="h-5 w-5" />
        </button>
      </div>
      
      <div className="p-6">
        {/* Overall progress */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-medium text-gray-700">Overall Progress</h3>
            <span className="text-sm text-gray-500">
              {skillsData.totalMastered} of {skillsData.totalSkills} skills mastered
            </span>
          </div>
          
          {/* Overall progress bar */}
          <div className="h-4 bg-gray-100 rounded-full overflow-hidden mb-2">
            <div className="flex h-full">
              <div 
                className="h-full bg-green-500"
                style={{ width: `${(skillsData.totalMastered / skillsData.totalSkills) * 100}%` }}
              />
              <div 
                className="h-full bg-blue-500"
                style={{ width: `${(skillsData.totalDeveloping / skillsData.totalSkills) * 100}%` }}
              />
              <div 
                className="h-full bg-yellow-500"
                style={{ width: `${(skillsData.totalEmerging / skillsData.totalSkills) * 100}%` }}
              />
            </div>
          </div>
          
          {/* Legend */}
          <div className="flex space-x-4 text-xs">
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-green-500 mr-1" />
              <span>Mastered</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-blue-500 mr-1" />
              <span>Developing</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-yellow-500 mr-1" />
              <span>Emerging</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-gray-100 border border-gray-300 mr-1" />
              <span>Not Started</span>
            </div>
          </div>
        </div>
        
        {/* Skill Area Visualizations */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-4">Development by Area</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {areas.map(area => {
              const areaInfo = skillAreas[area as keyof typeof skillAreas];
              const stats = skillsData.byArea[area];
              
              return (
                <div 
                  key={area}
                  className="border border-gray-200 rounded-lg p-4 cursor-pointer hover:shadow-sm transition-shadow"
                  onClick={() => handleAreaClick(area)}
                >
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-medium" style={{ color: areaInfo.color }}>
                      {areaInfo.name}
                    </h4>
                    <InfoIcon className="h-4 w-4 text-gray-400" />
                  </div>
                  
                  {/* Progress visualization */}
                  <div className="flex items-end h-12 space-x-1 mb-2">
                    <div 
                      className="w-1/4 rounded-t-sm" 
                      style={{ 
                        backgroundColor: areaInfo.color,
                        height: `${(stats.mastered / stats.total) * 100}%`,
                        opacity: 0.9
                      }}
                    />
                    <div 
                      className="w-1/4 rounded-t-sm" 
                      style={{ 
                        backgroundColor: areaInfo.color,
                        height: `${(stats.developing / stats.total) * 100}%`,
                        opacity: 0.6
                      }}
                    />
                    <div 
                      className="w-1/4 rounded-t-sm" 
                      style={{ 
                        backgroundColor: areaInfo.color,
                        height: `${(stats.emerging / stats.total) * 100}%`,
                        opacity: 0.3
                      }}
                    />
                    <div 
                      className="w-1/4 rounded-t-sm bg-gray-200" 
                      style={{ 
                        height: `${(stats.notStarted / stats.total) * 100}%`
                      }}
                    />
                  </div>
                  
                  {/* Stats */}
                  <div className="grid grid-cols-4 gap-1 text-xs text-center">
                    <div>
                      <div className="font-medium">{stats.mastered}</div>
                      <div className="text-gray-500">Mastered</div>
                    </div>
                    <div>
                      <div className="font-medium">{stats.developing}</div>
                      <div className="text-gray-500">Developing</div>
                    </div>
                    <div>
                      <div className="font-medium">{stats.emerging}</div>
                      <div className="text-gray-500">Emerging</div>
                    </div>
                    <div>
                      <div className="font-medium">{stats.notStarted}</div>
                      <div className="text-gray-500">Not Started</div>
                    </div>
                  </div>
                  
                  {/* Progress bar */}
                  <div className="mt-3 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full"
                      style={{ 
                        width: `${stats.percent}%`,
                        backgroundColor: areaInfo.color
                      }}
                    />
                  </div>
                  
                  <div className="text-right text-xs mt-1">
                    <span className="font-medium">{stats.percent}%</span> complete
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      
      {renderInfoModal()}
    </div>
  );
}

// Helper function to format dates
function formatDate(timestamp: any): string {
  if (!timestamp) return 'Not assessed';
  
  try {
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString();
  } catch (e) {
    return 'Invalid date';
  }
}