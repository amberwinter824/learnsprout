'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Users, 
  Calendar, 
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Loader2
} from 'lucide-react';
import Link from 'next/link';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  action: string;
  actionLink: string;
  completed: boolean;
}

export default function OnboardingWizard() {
  const { currentUser } = useAuth();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [steps, setSteps] = useState<OnboardingStep[]>([
    {
      id: 'add-child',
      title: 'Add Your First Child',
      description: 'Create a profile for your child to start tracking their development and activities.',
      icon: <Users className="h-8 w-8 text-emerald-500" />,
      action: 'Add Child',
      actionLink: '/dashboard/children/add',
      completed: false
    },
    {
      id: 'schedule',
      title: 'Set Your Preferred Schedule',
      description: 'Choose how many activities you\'d like per day and which days of the week work best for your family.',
      icon: <Calendar className="h-8 w-8 text-emerald-500" />,
      action: 'Set Schedule',
      actionLink: '/dashboard/settings',
      completed: false
    }
  ]);

  // Check completion status of steps
  useEffect(() => {
    if (!currentUser) return;

    // Check if user has any children
    const hasChildren = Boolean(currentUser.childrenAccess && currentUser.childrenAccess.length > 0);
    
    // Check if user has set schedule preferences
    const hasSchedule = Boolean(currentUser.preferences?.activityPreferences?.scheduleByDay);

    setSteps(prev => prev.map(step => {
      switch (step.id) {
        case 'add-child':
          return { ...step, completed: hasChildren };
        case 'schedule':
          return { ...step, completed: hasSchedule };
        default:
          return step;
      }
    }));
  }, [currentUser]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  if (!currentUser) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  const currentStepData = steps[currentStep];

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full p-6">
        {/* Progress indicator */}
        <div className="flex justify-between mb-8">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                step.completed 
                  ? 'bg-emerald-100 text-emerald-600' 
                  : index === currentStep 
                    ? 'bg-emerald-500 text-white' 
                    : 'bg-gray-100 text-gray-400'
              }`}>
                {step.completed ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : (
                  <span>{index + 1}</span>
                )}
              </div>
              {index < steps.length - 1 && (
                <div className={`w-16 h-0.5 mx-2 ${
                  step.completed ? 'bg-emerald-500' : 'bg-gray-200'
                }`} />
              )}
            </div>
          ))}
        </div>

        {/* Current step content */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            {currentStepData.icon}
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {currentStepData.title}
          </h2>
          <p className="text-gray-600">
            {currentStepData.description}
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex justify-between">
          <button
            onClick={handleBack}
            disabled={currentStep === 0}
            className={`px-4 py-2 text-sm font-medium rounded-md ${
              currentStep === 0
                ? 'text-gray-400 cursor-not-allowed'
                : 'text-gray-700 hover:text-gray-900'
            }`}
          >
            <ArrowLeft className="h-4 w-4 inline-block mr-1" />
            Back
          </button>

          <div className="flex gap-2">
            {currentStepData.completed ? (
              <button
                onClick={handleNext}
                className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-md hover:bg-emerald-700"
              >
                Next
                <ArrowRight className="h-4 w-4 inline-block ml-1" />
              </button>
            ) : (
              <Link
                href={currentStepData.actionLink}
                className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-md hover:bg-emerald-700"
              >
                {currentStepData.action}
              </Link>
            )}

            {currentStep === steps.length - 1 && (
              <Link
                href="/dashboard"
                className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-md hover:bg-emerald-700"
              >
                Go to Dashboard
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 