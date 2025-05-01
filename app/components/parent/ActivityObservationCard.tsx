import React, { useState } from 'react';
import { 
  Eye, 
  ChevronDown, 
  ChevronUp, 
  CheckCircle2, 
  Camera, 
  MessageSquare 
} from 'lucide-react';
import { DevelopmentalSkill } from '../../../lib/types/enhancedSchema';
import { ASQDomain, formatASQDomain } from '../../../lib/types/asqTypes';

interface ActivityObservationCardProps {
  skillId: string;
  skillName: string;
  asqDomain: ASQDomain;
  observationPrompts: string[];
  indicators: string[];
  onObservationRecorded?: (observation: string, skillId: string) => void;
}

const domainColors: Record<ASQDomain, string> = {
  'communication': 'bg-blue-100 text-blue-800',
  'gross_motor': 'bg-green-100 text-green-800',
  'fine_motor': 'bg-purple-100 text-purple-800',
  'problem_solving': 'bg-amber-100 text-amber-800',
  'personal_social': 'bg-pink-100 text-pink-800'
};

const domainIcons: Record<ASQDomain, React.ReactNode> = {
  'communication': '🗣️',
  'gross_motor': '🏃',
  'fine_motor': '✋',
  'problem_solving': '🧩',
  'personal_social': '👪'
};

export default function ActivityObservationCard({
  skillId,
  skillName,
  asqDomain = 'problem_solving',
  observationPrompts = [],
  indicators = [],
  onObservationRecorded
}: ActivityObservationCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedObservation, setSelectedObservation] = useState<string | null>(null);
  const [customObservation, setCustomObservation] = useState('');
  const [isRecording, setIsRecording] = useState(false);

  const handleToggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  const handleObservationSelect = (observation: string) => {
    setSelectedObservation(observation);
  };

  const handleSaveObservation = () => {
    if (onObservationRecorded) {
      const observation = selectedObservation || customObservation;
      if (observation) {
        onObservationRecorded(observation, skillId);
        setSelectedObservation(null);
        setCustomObservation('');
        setIsRecording(false);
      }
    }
  };

  const domainColorClass = domainColors[asqDomain] || 'bg-gray-100 text-gray-800';
  const domainIcon = domainIcons[asqDomain] || '👶';

  return (
    <div className="rounded-lg border border-gray-200 shadow-sm overflow-hidden mb-4">
      <div className="flex items-center p-4 cursor-pointer" onClick={handleToggleExpand}>
        <div className={`flex items-center justify-center h-8 w-8 rounded-full mr-3 ${domainColorClass.split(' ')[0]}`}>
          <span className="text-lg">{domainIcon}</span>
        </div>
        <div className="flex-1">
          <div className="font-medium">{skillName}</div>
          <div className="text-sm text-gray-500 flex items-center">
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${domainColorClass}`}>
              {formatASQDomain(asqDomain)}
            </span>
            <span className="ml-2 flex items-center text-gray-500">
              <Eye size={14} className="mr-1" /> Observation Opportunities
            </span>
          </div>
        </div>
        <div>
          {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </div>
      </div>

      {isExpanded && (
        <div className="px-4 pb-4">
          {/* What To Look For Section */}
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-900 mb-2">What to look for:</h4>
            <ul className="space-y-2">
              {indicators.map((indicator, idx) => (
                <li key={idx} className="flex items-start">
                  <CheckCircle2 size={16} className="text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">{indicator}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Observation Prompts Section */}
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Questions to consider:</h4>
            <ul className="space-y-2">
              {observationPrompts.map((prompt, idx) => (
                <li key={idx} className="flex items-start">
                  <div
                    className={`p-1 rounded-md cursor-pointer transition-colors hover:bg-gray-100 ${
                      selectedObservation === prompt ? 'bg-gray-100 border border-gray-300' : ''
                    }`}
                    onClick={() => handleObservationSelect(prompt)}
                  >
                    <span className="text-sm">{prompt}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Record Observation Section */}
          {!isRecording ? (
            <button 
              className="flex items-center text-sm text-gray-600 mt-2 hover:text-gray-900"
              onClick={() => setIsRecording(true)}
            >
              <MessageSquare size={16} className="mr-1" /> 
              Record an observation
            </button>
          ) : (
            <div className="mt-3 space-y-3">
              <textarea
                className="w-full p-2 border border-gray-300 rounded-md text-sm"
                placeholder="Describe what you observed..."
                rows={3}
                value={customObservation}
                onChange={(e) => setCustomObservation(e.target.value)}
              />
              <div className="flex space-x-2">
                <button 
                  className="flex items-center justify-center px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
                  onClick={handleSaveObservation}
                >
                  Save Observation
                </button>
                <button 
                  className="flex items-center justify-center px-3 py-1.5 bg-gray-200 text-gray-800 text-sm rounded-md hover:bg-gray-300"
                  onClick={() => {
                    setIsRecording(false);
                    setCustomObservation('');
                    setSelectedObservation(null);
                  }}
                >
                  Cancel
                </button>
                <button 
                  className="flex items-center justify-center px-3 py-1.5 bg-gray-200 text-gray-800 text-sm rounded-md hover:bg-gray-300"
                >
                  <Camera size={16} className="mr-1" /> Add Photo
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 