import React, { useState, useEffect } from 'react';
import { Calendar, CheckCircle, AlertCircle, ArrowRight, Activity, MessageSquare, Info, X } from 'lucide-react';
import { DevelopmentalSkill, EnhancedChildSkill } from '../../../lib/types/enhancedSchema';
import { ASQDomain, formatASQDomain, getSkillASQDomain, PediatricVisitMonth, PEDIATRIC_VISIT_MONTHS } from '../../../lib/types/asqTypes';
import { db } from '../../../lib/firebase';
import { doc, getDoc, collection, query, where, getDocs, Timestamp, limit } from 'firebase/firestore';
import { differenceInMonths } from 'date-fns';
import ActivityDetailsPopup from './ActivityDetailsPopup';

interface PediatricVisitPrepProps {
  childId: string;
  childAge: number; // Age in months
  onActivitySelect?: (activityId: string) => void;
}

interface DomainProgress {
  domain: ASQDomain;
  status: 'not_started' | 'in_progress' | 'ready';
  progress: number;
  observations: number;
  activities: number;
}

// ASQ domain colors and icons (same as in ActivityObservationCard)
const domainColors: Record<ASQDomain, string> = {
  'communication': 'bg-blue-100 text-blue-800 border-blue-300',
  'gross_motor': 'bg-green-100 text-green-800 border-green-300',
  'fine_motor': 'bg-purple-100 text-purple-800 border-purple-300',
  'problem_solving': 'bg-amber-100 text-amber-800 border-amber-300',
  'personal_social': 'bg-pink-100 text-pink-800 border-pink-300'
};

const domainIcons: Record<ASQDomain, React.ReactNode> = {
  'communication': '🗣️',
  'gross_motor': '🏃',
  'fine_motor': '✋',
  'problem_solving': '🧩',
  'personal_social': '👪'
};

// Sample ASQ questionnaire data for different ages
const asqQuestionnaires: Record<string, {title: string, description: string, questions: Record<ASQDomain, string[]>}> = {
  '2m': {
    title: 'ASQ-3 2 Month Questionnaire',
    description: 'For infants 1 month 0 days through 2 months 30 days',
    questions: {
      'communication': [
        'Does your baby sometimes make throaty or gurgling sounds?',
        'Does your baby react to loud sounds?'
      ],
      'gross_motor': [
        'When your baby is on their back, do they move their legs?',
        'When your baby is on their tummy, do they turn their head to the side?'
      ],
      'fine_motor': [
        'Does your baby keep their hands open or partly open most of the time?',
        'Does your baby grasp or hold onto your finger if you touch their palm?'
      ],
      'problem_solving': [
        'Does your baby look at objects that are 8–10 inches away?',
        'When you move around, does your baby follow you with their eyes?'
      ],
      'personal_social': [
        'Does your baby calm down when you talk to them?',
        'Does your baby enjoy being held and cuddled?'
      ]
    }
  },
  '12m': {
    title: 'ASQ-3 12 Month Questionnaire',
    description: 'For infants 11 months 0 days through 12 months 30 days',
    questions: {
      'communication': [
        'Does your baby make two similar sounds like "ba-ba," "da-da," or "ga-ga"?',
        'Does your baby follow one simple command, such as "Come here," "Give it to me," or "Put it back," without your using gestures?'
      ],
      'gross_motor': [
        'When you hold one hand just to balance your baby, does he take several steps without tripping or falling?',
        'Does your baby stand up in the middle of the floor by herself and take several steps forward?'
      ],
      'fine_motor': [
        'Does your baby pick up a small toy with only his thumb and first finger?',
        'Does your baby put a small toy down, without dropping it, and then take her hands off the toy?'
      ],
      'problem_solving': [
        'After watching you hide a small toy under a piece of paper or cloth, does your baby find it?',
        'Does your baby drop two small toys, one after the other, into a container like a bowl or cup?'
      ],
      'personal_social': [
        'Does your baby feed himself with his fingers?',
        'When you hold out your hand and ask for her toy, does your baby offer it to you even if she doesn\'t let go of it?'
      ]
    }
  },
  '24m': {
    title: 'ASQ-3 24 Month Questionnaire',
    description: 'For children 23 months 0 days through 25 months 15 days',
    questions: {
      'communication': [
        'Does your child name at least three items from a common category? For example, if you say to your child, "Tell me some things that you can eat," does your child answer with something like "Cookies, eggs, and cereal"?',
        'Does your child use the word "my" or "mine" when talking?'
      ],
      'gross_motor': [
        'Does your child run fairly well, stopping himself without bumping into things or falling?',
        'Does your child walk down stairs if you hold onto one of her hands?'
      ],
      'fine_motor': [
        'Does your child make a line with a crayon or pencil?',
        'Does your child turn pages in a book, one page at a time?'
      ],
      'problem_solving': [
        'If your child wants something they cannot reach, does she find a chair or box to stand on to reach it?',
        'Does your child successfully use a spoon, fork, and cup all by himself?'
      ],
      'personal_social': [
        'Does your child copy activities you do, such as wipe up a spill, sweep, shave, or comb hair?',
        'Does your child drink from a cup or glass, putting it down again with little spilling?'
      ]
    }
  }
};

// Helper to get ASQ questionnaire for a visit type
const getAsqQuestionnaire = (visitType: string) => {
  const exactMatch = asqQuestionnaires[visitType];
  if (exactMatch) return exactMatch;
  const visitMonth = parseInt(visitType.replace('m', ''));
  const availableMonths = Object.keys(asqQuestionnaires).map(m => parseInt(m.replace('m', '')));
  const closestMonth = availableMonths.reduce((prev, curr) =>
    Math.abs(curr - visitMonth) < Math.abs(prev - visitMonth) ? curr : prev
  );
  return asqQuestionnaires[`${closestMonth}m`] || asqQuestionnaires['24m'];
};

export default function PediatricVisitPrep({ childId, childAge, onActivitySelect }: PediatricVisitPrepProps) {
  const [loading, setLoading] = useState(true);
  const [nextVisit, setNextVisit] = useState<{ childId: string; visitType: string; scheduledDate: Timestamp } | null>(null);
  const [recommendedActivities, setRecommendedActivities] = useState<any[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);
  const [childName, setChildName] = useState<string>('your child');
  const [showAsqPopup, setShowAsqPopup] = useState(false);
  
  // Ensure childAge is a valid number
  const safeChildAge = typeof childAge === 'number' && !isNaN(childAge) ? childAge : 0;
  
  useEffect(() => {
    async function fetchVisitPreparation() {
      try {
        setLoading(true);
        setErrorMessage(null);

        // 1. Get child information from Firestore to double-check age
        const childDoc = await getDoc(doc(db, 'children', childId));
        if (childDoc.exists()) {
          const childData = childDoc.data();
          if (childData.name) setChildName(childData.name);
        }

        // 2. Calculate next visit type based on age
        const nextVisitMonth = PEDIATRIC_VISIT_MONTHS.find(month => month > safeChildAge) || 60;
        const visitType = `${nextVisitMonth}m`;
        setNextVisit({
          childId: childId,
          visitType: visitType as any,
          scheduledDate: Timestamp.fromDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)), // Dummy date 30 days in future
        });

        // 3. Fetch all activities for the child's age group
        const activitiesQuery = query(
          collection(db, 'activities'),
          where('ageRanges', 'array-contains', childDoc.exists() ? childDoc.data().ageGroup : '2-3'),
          where('status', '==', 'active'),
          limit(50)
        );
        const activitiesSnapshot = await getDocs(activitiesQuery);
        const activityData = activitiesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setRecommendedActivities(activityData);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching preparation data:", err);
        setErrorMessage("Failed to load preparation data");
        setLoading(false);
      }
    }
    fetchVisitPreparation();
  }, [childId, safeChildAge]);
  
  // Helper to safely access domain colors
  const getDomainColor = (domain: any): string => {
    if (domain && typeof domain === 'string' && Object.keys(domainColors).includes(domain)) {
      return domainColors[domain as ASQDomain];
    }
    return 'bg-gray-100 text-gray-800 border-gray-300';
  };

  // Get activities for a domain (up to 2)
  const getActivitiesForDomain = (domain: ASQDomain) => {
    return recommendedActivities.filter((activity: any) =>
      activity.skillsAddressed && activity.skillsAddressed.some((skillId: string) => {
        // Try to infer the domain from the skillId format or from activity.asqDomain if present
        // If you have a more direct mapping, update this logic
        if (activity.asqDomain) return activity.asqDomain === domain;
        return skillId.toLowerCase().includes(domain.replace('_', ''));
      })
    ).slice(0, 2);
  };
  
  // Handle activity selection
  const handleActivitySelect = (activityId: string) => {
    if (onActivitySelect) {
      onActivitySelect(activityId);
    }
  };
  
  // Helper functions for UI
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ready':
        return <CheckCircle className="h-5 w-5 text-green-500 mr-1" />;
      case 'in_progress':
        return <Activity className="h-5 w-5 text-blue-500 mr-1" />;
      case 'not_started':
      default:
        return <AlertCircle className="h-5 w-5 text-amber-500 mr-1" />;
    }
  };
  
  // Handle safely converting a Timestamp to a Date for display
  const safeTimestampToDate = (timestamp: any): string => {
    if (!timestamp) return 'Not scheduled';
    
    try {
      if (typeof timestamp === 'object' && timestamp !== null && 'toDate' in timestamp && typeof timestamp.toDate === 'function') {
        return timestamp.toDate().toLocaleDateString();
      } else if (timestamp instanceof Date) {
        return timestamp.toLocaleDateString();
      } else if (typeof timestamp === 'string' || typeof timestamp === 'number') {
        return new Date(timestamp).toLocaleDateString();
      }
    } catch (e) {
      console.error('Error formatting date:', e);
    }
    
    return 'Soon';
  };
  
  return (
    <div className="space-y-6">
      {errorMessage && (
        <div className="p-4 bg-red-50 rounded-md flex items-start">
          <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 mr-2" />
          <div>
            <h3 className="text-sm font-medium text-red-800">Error</h3>
            <p className="text-sm text-red-700 mt-1">{errorMessage}</p>
          </div>
        </div>
      )}
      
      {loading ? (
        <div className="py-8 flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
        </div>
      ) : (
        <>
          {/* Next Checkup */}
          <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-3 flex items-center">
              <Calendar className="h-6 w-6 text-emerald-500 mr-2" />
              Preparing for {nextVisit?.visitType} Checkup
            </h2>
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between mb-4">
              <div>
                <p className="text-base text-gray-700">
                  Child's age: <span className="font-semibold">{safeChildAge} months</span>
                </p>
                {nextVisit?.scheduledDate && (
                  <p className="text-base text-gray-700 mt-1">
                    Scheduled for: <span className="font-semibold">{safeTimestampToDate(nextVisit.scheduledDate)}</span>
                  </p>
                )}
              </div>
              <button
                onClick={() => setShowAsqPopup(true)}
                className="inline-flex items-center px-4 py-2 text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow"
              >
                <Info className="h-5 w-5 mr-2" />
                Preview ASQ
              </button>
            </div>
            <div className="mt-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Checkup Domains & Activities</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {(['communication', 'gross_motor', 'fine_motor', 'problem_solving', 'personal_social'] as ASQDomain[]).map(domain => {
                  const asqQuestions = getAsqQuestionnaire(nextVisit?.visitType || '24m').questions[domain] || [];
                  const domainActivities = getActivitiesForDomain(domain);
                  return (
                    <div
                      key={domain}
                      className={`rounded-xl border-2 p-6 shadow-sm bg-white flex flex-col h-full ${getDomainColor(domain)}`}
                      style={{ borderLeftWidth: '8px' }}
                    >
                      <div className="flex items-center mb-2">
                        <span className="text-2xl mr-2">{domainIcons[domain]}</span>
                        <h3 className="text-xl font-bold">{formatASQDomain(domain)}</h3>
                      </div>
                      {/* ASQ Questions Callout */}
                      <div className="bg-blue-50 border-l-4 border-blue-400 rounded-md p-4 mb-4 flex items-start">
                        <MessageSquare className="h-5 w-5 text-blue-400 mr-2 mt-0.5" />
                        <div>
                          <h4 className="font-semibold text-blue-800 mb-1">Sample ASQ Questions</h4>
                          <ul className="list-disc list-inside text-blue-900">
                            {asqQuestions.map((q: string, idx: number) => (
                              <li key={idx} className="text-sm">Q{idx + 1}: {q}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                      {/* Activities as clickable cards */}
                      <div className="grid grid-cols-1 gap-3">
                        {domainActivities.length > 0 ? (
                          domainActivities.map((activity: any) => (
                            <button
                              key={activity.id}
                              type="button"
                              onClick={() => setSelectedActivityId(activity.id)}
                              className="block w-full text-left bg-white border border-gray-200 rounded-lg shadow hover:shadow-md transition p-4 group cursor-pointer hover:bg-emerald-50"
                            >
                              <div className="flex items-center">
                                <Activity className="h-5 w-5 text-emerald-500 mr-2" />
                                <span className="font-semibold text-emerald-900 group-hover:underline">{activity.title}</span>
                              </div>
                              {activity.description && (
                                <p className="text-xs text-gray-600 mt-1 line-clamp-2">{activity.description}</p>
                              )}
                            </button>
                          ))
                        ) : (
                          <span className="text-gray-500 text-sm">No activities found for this domain.</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          {selectedActivityId && (
            <ActivityDetailsPopup
              activityId={selectedActivityId}
              onClose={() => setSelectedActivityId(null)}
              childId={childId}
            />
          )}
        </>
      )}
    </div>
  );
}