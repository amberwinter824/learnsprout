// components/parent/WeeklyPlanEmptyState.tsx
import { Calendar, Settings, Loader2, Brain, Sparkles, Target, Clock } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';

interface WeeklyPlanEmptyStateProps {
  childId: string;
  childName: string;
  onGeneratePlan: () => void;
  isGenerating: boolean;
}

export default function WeeklyPlanEmptyState({ 
  childId, 
  childName, 
  onGeneratePlan,
  isGenerating
}: WeeklyPlanEmptyStateProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const steps = [
    { icon: Target, text: `Analyzing ${childName}'s developmental needs and interests` },
    { icon: Sparkles, text: 'Selecting age-appropriate activities' },
    { icon: Clock, text: 'Creating a balanced weekly schedule' },
    { icon: Loader2, text: 'Finalizing your personalized plan' }
  ];

  useEffect(() => {
    if (isGenerating) {
      // Reset step when generation starts
      setCurrentStep(0);
      
      // Progress through steps with delays
      const interval = setInterval(() => {
        setCurrentStep(prev => {
          if (prev >= steps.length - 1) {
            clearInterval(interval);
            return prev;
          }
          return prev + 1;
        });
      }, 2000); // Change step every 2 seconds

      return () => clearInterval(interval);
    }
  }, [isGenerating]);

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      {isGenerating ? (
        <div className="text-center py-8">
          <div className="mb-8">
            <Brain className="h-20 w-20 text-emerald-500 mx-auto animate-pulse" />
          </div>
          <h3 className="text-xl font-semibold text-gray-800 mb-6">Generating Personalized Plan</h3>
          <div className="space-y-6 max-w-md mx-auto">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = index <= currentStep;
              const isCurrent = index === currentStep;
              
              return (
                <div 
                  key={index}
                  className={`
                    flex items-center text-gray-700 bg-gray-50 p-4 rounded-lg
                    transition-all duration-500
                    ${isActive ? 'bg-emerald-50 border border-emerald-200' : 'opacity-50'}
                    ${isCurrent ? 'scale-105 shadow-sm' : ''}
                  `}
                >
                  <Icon className={`h-6 w-6 mr-4 ${isActive ? 'text-emerald-500' : 'text-gray-400'} ${isCurrent ? 'animate-pulse' : ''}`} />
                  <span className="text-lg">{step.text}</span>
                </div>
              );
            })}
          </div>
          <div className="mt-8 text-gray-500">
            This may take a few moments...
          </div>
        </div>
      ) : (
        <div className="text-center">
          <Calendar className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-800 mb-2">No Weekly Plan Yet</h3>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            {childName} doesn't have activities planned for this week. Generate a personalized
            weekly plan based on their age, interests, and development needs.
          </p>
          
          <div className="flex flex-col sm:flex-row justify-center gap-3">
            <button
              onClick={onGeneratePlan}
              disabled={isGenerating}
              className="inline-flex items-center justify-center px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating Plan...
                </>
              ) : (
                <>
                  <Calendar className="h-4 w-4 mr-2" />
                  Generate Weekly Plan
                </>
              )}
            </button>
            
            <Link
              href={`/dashboard/settings`}
              className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 bg-white text-gray-700 rounded-md hover:bg-gray-50"
            >
              <Settings className="h-4 w-4 mr-2" />
              Adjust Activity Preferences
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}