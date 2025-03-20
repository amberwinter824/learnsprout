import React, { useState } from 'react';
import { ArrowRight, CheckCircle, Circle, Clock, ChevronDown, ChevronUp, Info } from 'lucide-react';

interface Skill {
  id: string;
  name: string;
  description: string;
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
}

export default function SkillsJourneyMap({ skills, area }: SkillsJourneyMapProps) {
  const [expandedSkills, setExpandedSkills] = useState<Set<string>>(new Set());
  const [showHelp, setShowHelp] = useState(false);

  // Group skills by status
  const skillsByStatus = skills.reduce((acc, skill) => {
    if (!acc[skill.status]) {
      acc[skill.status] = [];
    }
    acc[skill.status].push(skill);
    return acc;
  }, {} as Record<string, Skill[]>);

  // Get color for status
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'mastered': return 'bg-green-500';
      case 'developing': return 'bg-blue-500';
      case 'emerging': return 'bg-amber-500';
      default: return 'bg-gray-400';
    }
  };

  // Get background color for status
  const getStatusBgColor = (status: string): string => {
    switch (status) {
      case 'mastered': return 'bg-green-50';
      case 'developing': return 'bg-blue-50';
      case 'emerging': return 'bg-amber-50';
      default: return 'bg-gray-50';
    }
  };

  // Get text color for status
  const getStatusTextColor = (status: string): string => {
    switch (status) {
      case 'mastered': return 'text-green-700';
      case 'developing': return 'text-blue-700';
      case 'emerging': return 'text-amber-700';
      default: return 'text-gray-700';
    }
  };

  // Get icon for status
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'mastered': return <CheckCircle className="h-4 w-4" />;
      case 'developing': return <Clock className="h-4 w-4" />;
      case 'emerging': return <Circle className="h-4 w-4" />;
      default: return <Circle className="h-4 w-4" />;
    }
  };

  // Get area label
  const getAreaLabel = (area: string): string => {
    const labels: Record<string, string> = {
      'cognitive': 'Cognitive Development',
      'physical': 'Physical Development',
      'social_emotional': 'Social-Emotional Development',
      'language': 'Language Development',
      'adaptive': 'Adaptive Development',
      'sensory': 'Sensory Development',
      'play': 'Play Development'
    };
    return labels[area] || area;
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

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-medium text-gray-900">
          {getAreaLabel(area)} Journey
        </h2>
        <button
          onClick={() => setShowHelp(!showHelp)}
          className="text-gray-400 hover:text-gray-500"
        >
          <Info className="h-5 w-5" />
        </button>
      </div>

      {/* Help Modal */}
      {showHelp && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <h3 className="text-sm font-medium text-blue-800 mb-2">Understanding Skill Progression</h3>
          <div className="space-y-3">
            <div className="flex items-start">
              <div className="w-3 h-3 rounded-full bg-green-500 mt-1 mr-2"></div>
              <div>
                <span className="text-sm font-medium text-blue-800">Mastered</span>
                <p className="text-xs text-blue-700">Consistently demonstrates the skill independently</p>
              </div>
            </div>
            <div className="flex items-start">
              <div className="w-3 h-3 rounded-full bg-blue-500 mt-1 mr-2"></div>
              <div>
                <span className="text-sm font-medium text-blue-800">Developing</span>
                <p className="text-xs text-blue-700">Shows growing competence with some support</p>
              </div>
            </div>
            <div className="flex items-start">
              <div className="w-3 h-3 rounded-full bg-amber-500 mt-1 mr-2"></div>
              <div>
                <span className="text-sm font-medium text-blue-800">Emerging</span>
                <p className="text-xs text-blue-700">Beginning to show interest and initial attempts</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Skills Progress Overview */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-gray-900">{skills.length}</div>
          <div className="text-sm text-gray-500">Total Skills</div>
        </div>
        <div className="bg-green-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-green-600">
            {skillsByStatus.mastered?.length || 0}
          </div>
          <div className="text-sm text-gray-500">Mastered</div>
        </div>
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-blue-600">
            {skillsByStatus.developing?.length || 0}
          </div>
          <div className="text-sm text-gray-500">Developing</div>
        </div>
        <div className="bg-amber-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-amber-600">
            {skillsByStatus.emerging?.length || 0}
          </div>
          <div className="text-sm text-gray-500">Emerging</div>
        </div>
      </div>

      {/* Skills Journey Visualization */}
      <div className="space-y-6">
        {['not_started', 'emerging', 'developing', 'mastered'].map((status, index) => {
          const statusSkills = skillsByStatus[status] || [];
          if (statusSkills.length === 0) return null;

          return (
            <div key={status} className="relative">
              {/* Status Label */}
              <div className="flex items-center mb-3">
                <div className={`${getStatusColor(status)} rounded-full p-1 mr-2`}>
                  {getStatusIcon(status)}
                </div>
                <h3 className="text-sm font-medium text-gray-900 capitalize">
                  {status.replace('_', ' ')}
                </h3>
              </div>

              {/* Skills List */}
              <div className="space-y-3">
                {statusSkills.map(skill => (
                  <div 
                    key={skill.id} 
                    className={`${getStatusBgColor(status)} rounded-lg p-4 cursor-pointer hover:bg-opacity-75 transition-colors`}
                    onClick={() => toggleSkill(skill.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className={`text-sm font-medium ${getStatusTextColor(status)}`}>
                          {skill.name}
                        </h4>
                        <p className="text-sm text-gray-600 mt-1">{skill.description}</p>
                      </div>
                      {expandedSkills.has(skill.id) ? (
                        <ChevronUp className="h-5 w-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-gray-400" />
                      )}
                    </div>

                    {/* Expanded Content */}
                    {expandedSkills.has(skill.id) && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        {/* Prerequisites */}
                        {skill.prerequisites && skill.prerequisites.length > 0 && (
                          <div className="mb-4">
                            <h5 className="text-xs font-medium text-gray-500 mb-2">Prerequisites</h5>
                            <div className="flex flex-wrap gap-2">
                              {skill.prerequisites.map(prereq => (
                                <span
                                  key={prereq}
                                  className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full"
                                >
                                  {prereq}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Next Steps */}
                        {skill.nextSteps && skill.nextSteps.length > 0 && (
                          <div className="mb-4">
                            <h5 className="text-xs font-medium text-gray-500 mb-2">Next Steps</h5>
                            <div className="flex flex-wrap gap-2">
                              {skill.nextSteps.map(step => (
                                <span
                                  key={step}
                                  className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full"
                                >
                                  {step}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Indicators */}
                        {skill.indicators && skill.indicators.length > 0 && (
                          <div>
                            <h5 className="text-xs font-medium text-gray-500 mb-2">What to Look For</h5>
                            <ul className="text-xs text-gray-600 space-y-1 ml-4 list-disc">
                              {skill.indicators.map((indicator, idx) => (
                                <li key={idx}>{indicator}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Connection Line */}
              {index < 3 && (
                <div className="absolute left-4 top-full w-0.5 h-6 bg-gray-200" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
} 