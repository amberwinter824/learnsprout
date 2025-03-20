import React from 'react';
import { ArrowRight, CheckCircle, Circle, Clock } from 'lucide-react';

interface Skill {
  id: string;
  name: string;
  description: string;
  area: string;
  status: 'not_started' | 'emerging' | 'developing' | 'mastered';
  prerequisites?: string[];
  nextSteps?: string[];
  lastAssessed?: Date;
}

interface SkillsJourneyMapProps {
  skills: Skill[];
  area: string;
}

export default function SkillsJourneyMap({ skills, area }: SkillsJourneyMapProps) {
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
      case 'mastered': return 'text-green-500';
      case 'developing': return 'text-amber-500';
      case 'emerging': return 'text-blue-500';
      default: return 'text-gray-400';
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

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-lg font-medium text-gray-900 mb-4">
        {getAreaLabel(area)} Journey
      </h2>

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
                <div className={`${getStatusColor(status)} mr-2`}>
                  {getStatusIcon(status)}
                </div>
                <h3 className="text-sm font-medium text-gray-900 capitalize">
                  {status.replace('_', ' ')}
                </h3>
              </div>

              {/* Skills List */}
              <div className="space-y-3">
                {statusSkills.map(skill => (
                  <div key={skill.id} className="flex items-start">
                    <div className={`w-2 h-2 rounded-full mt-2 mr-2 ${getStatusColor(status)}`} />
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-gray-900">{skill.name}</h4>
                      <p className="text-sm text-gray-600 mt-1">{skill.description}</p>
                      
                      {/* Prerequisites */}
                      {skill.prerequisites && skill.prerequisites.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs text-gray-500">Prerequisites:</p>
                          <div className="flex flex-wrap gap-2 mt-1">
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
                        <div className="mt-2">
                          <p className="text-xs text-gray-500">Next Steps:</p>
                          <div className="flex flex-wrap gap-2 mt-1">
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
                    </div>
                  </div>
                ))}
              </div>

              {/* Connection Line */}
              {index < 3 && (
                <div className="absolute left-1 top-full w-0.5 h-6 bg-gray-200" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
} 