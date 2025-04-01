import React, { useState } from 'react';
import { 
  Sprout, 
  Flower2, 
  Leaf, 
  CircleDot,
  ChevronDown, 
  ChevronUp, 
  Info 
} from 'lucide-react';

interface Skill {
  id: string;
  skillId: string;
  name: string;
  description?: string;
  area: string;
  status: 'not_started' | 'emerging' | 'developing' | 'mastered';
  prerequisites?: string[];
  nextSteps?: string[];
  lastAssessed?: Date;
  ageRanges?: string[];
  indicators?: string[];
}

interface SkillsJourneyMapProps {
  skills: Skill[];
  area: string;
  onUpdateSkill?: (skillId: string) => void;
}

export default function SkillsJourneyMap({ skills, area, onUpdateSkill }: SkillsJourneyMapProps) {
  const [expandedSkills, setExpandedSkills] = useState<Set<string>>(new Set());
  const [showHelp, setShowHelp] = useState(false);

  // Group skills by status
  const skillsByStatus = skills.reduce((acc, skill) => {
    const status = skill.status || 'not_started';
    if (!acc[status]) {
      acc[status] = [];
    }
    acc[status].push(skill);
    return acc;
  }, {} as Record<string, Skill[]>);

  // Get color for status
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'mastered':
        return 'text-green-500';
      case 'developing':
        return 'text-blue-500';
      case 'emerging':
        return 'text-amber-500';
      case 'not_started':
        return 'text-gray-400';
      default:
        return 'text-gray-400';
    }
  };

  // Get background color for status
  const getStatusBgColor = (status: string) => {
    switch (status) {
      case 'mastered':
        return 'bg-green-50';
      case 'developing':
        return 'bg-blue-50';
      case 'emerging':
        return 'bg-amber-50';
      case 'not_started':
        return 'bg-gray-50';
      default:
        return 'bg-gray-50';
    }
  };

  // Get text color for status
  const getStatusTextColor = (status: string) => {
    switch (status) {
      case 'mastered':
        return 'text-green-700';
      case 'developing':
        return 'text-blue-700';
      case 'emerging':
        return 'text-amber-700';
      case 'not_started':
        return 'text-gray-600';
      default:
        return 'text-gray-600';
    }
  };

  // Get icon for status
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'mastered': 
        return <Flower2 className="h-4 w-4" />;
      case 'developing': 
        return <Sprout className="h-4 w-4" />;
      case 'emerging': 
        return <Leaf className="h-4 w-4" />;
      case 'not_started':
        return <CircleDot className="h-4 w-4" />;
      default: 
        return <CircleDot className="h-4 w-4" />;
    }
  };

  // Get area label and description
  const getAreaInfo = (area: string): { label: string; description: string } => {
    const info: Record<string, { label: string; description: string }> = {
      'cognitive': {
        label: 'Cognitive Development',
        description: 'Thinking, problem-solving, and understanding concepts. This area includes skills like memory, attention, and reasoning.'
      },
      'physical': {
        label: 'Physical Development',
        description: 'Large and small muscle movements, coordination, and physical abilities. This includes both gross motor and fine motor skills.'
      },
      'social_emotional': {
        label: 'Social-Emotional Development',
        description: 'Understanding and managing emotions, building relationships, and developing social awareness.'
      },
      'language': {
        label: 'Language Development',
        description: 'Communication, vocabulary, and understanding of language. This includes both expressive and receptive language skills.'
      },
      'adaptive': {
        label: 'Adaptive Development',
        description: 'Self-care skills and daily living activities. This includes skills needed for independence in daily routines.'
      },
      'sensory': {
        label: 'Sensory Development',
        description: 'Processing and responding to different sensory inputs. This includes visual, auditory, tactile, and other sensory experiences.'
      },
      'play': {
        label: 'Play Development',
        description: 'Imagination, creativity, and social play. This includes both independent and interactive play skills.'
      }
    };
    return info[area] || { label: area, description: 'Development in this area' };
  };

  // Toggle skill expansion
  const toggleSkill = (skillId: string) => {
    const newExpanded = new Set(expandedSkills);
    if (newExpanded.has(skillId)) {
      newExpanded.delete(skillId);
    } else {
      newExpanded.add(skillId);
    }
    setExpandedSkills(newExpanded);
  };

  const areaInfo = getAreaInfo(area);

  return (
    <div className="bg-white rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-medium text-gray-900">{areaInfo.label}</h3>
            <button
              onClick={() => setShowHelp(!showHelp)}
              className="text-gray-400 hover:text-gray-500"
            >
              <Info className="h-4 w-4" />
            </button>
          </div>
          <p className="text-sm text-gray-500 mt-1">{areaInfo.description}</p>
        </div>
      </div>

      {/* Help Section */}
      {showHelp && (
        <div className="mb-4 p-3 bg-blue-50 rounded-lg text-sm">
          <h4 className="font-medium text-blue-800 mb-2">Understanding Growth Stages</h4>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="text-green-500">
                <Flower2 className="h-4 w-4" />
              </div>
              <span className="text-blue-800">Mastered - Fully bloomed and thriving independently</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-blue-500">
                <Sprout className="h-4 w-4" />
              </div>
              <span className="text-blue-800">Developing - Growing steadily with support</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-amber-500">
                <Leaf className="h-4 w-4" />
              </div>
              <span className="text-blue-800">Emerging - First leaves appearing</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-gray-400">
                <CircleDot className="h-4 w-4" />
              </div>
              <span className="text-blue-800">Not Started - Seed ready to be planted</span>
            </div>
          </div>
        </div>
      )}

      {/* Skills List */}
      <div className="space-y-2">
        {skills.map((skill) => {
          const skillId = skill.id || `skill-${skill.skillId}`;
          return (
            <div 
              key={skillId}
              className={`${getStatusBgColor(skill.status)} rounded-lg transition-all duration-200`}
            >
              <div className="p-3">
                <div className="flex items-start justify-between gap-4">
                  <div 
                    className="flex-1 cursor-pointer"
                    onClick={() => toggleSkill(skillId)}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`${getStatusColor(skill.status)} rounded-full p-1`}>
                        {getStatusIcon(skill.status)}
                      </div>
                      <h4 className={`text-sm font-medium ${getStatusTextColor(skill.status)}`}>
                        {skill.name}
                      </h4>
                    </div>
                    {expandedSkills.has(skillId) && (
                      <p className="text-sm text-gray-600 mt-2 pl-7">
                        {skill.description || 'No description available'}
                      </p>
                    )}
                  </div>
                  {onUpdateSkill && (
                    <button
                      onClick={() => onUpdateSkill(skillId)}
                      className="shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <ChevronDown className="h-5 w-5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
} 