import { useState, useEffect } from 'react';
import { ArrowLeft, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

interface DevelopmentalSkill {
  id: string;
  name: string;
  description: string;
  area: string;
  ageGroups: string[];
  category: string;
}

interface AssessmentResult {
  skillId: string;
  status: 'emerging' | 'developing' | 'mastered';
  notes?: string;
}

interface Activity {
  id: string;
  title: string;
  description: string;
  area: string;
  skillsAddressed: string[];
  duration: number;
  difficulty: string;
}

interface ParentInput {
  concerns: string[];
  goals: string[];
  notes: string;
}

interface DevelopmentPlan {
  strengths: {
    skill: DevelopmentalSkill;
    activities: Activity[];
  }[];
  growthAreas: {
    skill: DevelopmentalSkill;
    activities: Activity[];
  }[];
  maintenance: {
    skill: DevelopmentalSkill;
    activities: Activity[];
  }[];
}

export default function DevelopmentPlan({ 
  childName, 
  assessmentResults,
  parentInput,
  onBack,
  onGenerateWeeklyPlan
}: { 
  childName: string;
  assessmentResults: AssessmentResult[];
  parentInput: ParentInput;
  onBack: () => void;
  onGenerateWeeklyPlan: (plan: DevelopmentPlan) => void;
}) {
  const [plan, setPlan] = useState<DevelopmentPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const generatePlan = async () => {
      try {
        // Get all developmental skills
        const skillsQuery = query(collection(db, 'developmentalSkills'));
        const skillsSnapshot = await getDocs(skillsQuery);
        const skills = skillsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as DevelopmentalSkill[];

        // Get all activities
        const activitiesQuery = query(collection(db, 'activities'));
        const activitiesSnapshot = await getDocs(activitiesQuery);
        const activities = activitiesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Activity[];

        // Categorize skills and find relevant activities
        const strengths: DevelopmentPlan['strengths'] = [];
        const growthAreas: DevelopmentPlan['growthAreas'] = [];
        const maintenance: DevelopmentPlan['maintenance'] = [];

        // First, prioritize skills related to parent concerns and goals
        const concernKeywords = parentInput.concerns.flatMap(concern => concern.toLowerCase().split(' '));
        const goalKeywords = parentInput.goals.flatMap(goal => goal.toLowerCase().split(' '));

        assessmentResults.forEach(result => {
          const skill = skills.find(s => s.id === result.skillId);
          if (!skill) return;

          const relevantActivities = activities.filter(activity => 
            activity.skillsAddressed.includes(result.skillId)
          );

          // Prioritize activities that align with parent concerns and goals
          const sortedActivities = relevantActivities.sort((a, b) => {
            const aText = `${a.title} ${a.description}`.toLowerCase();
            const bText = `${b.title} ${b.description}`.toLowerCase();
            
            const aMatchesConcerns = concernKeywords.some(keyword => aText.includes(keyword));
            const bMatchesConcerns = concernKeywords.some(keyword => bText.includes(keyword));
            const aMatchesGoals = goalKeywords.some(keyword => aText.includes(keyword));
            const bMatchesGoals = goalKeywords.some(keyword => bText.includes(keyword));
            
            if (aMatchesConcerns && !bMatchesConcerns) return -1;
            if (!aMatchesConcerns && bMatchesConcerns) return 1;
            if (aMatchesGoals && !bMatchesGoals) return -1;
            if (!aMatchesGoals && bMatchesGoals) return 1;
            return 0;
          });

          const skillWithActivities = {
            skill,
            activities: sortedActivities
          };

          if (result.status === 'mastered') {
            maintenance.push(skillWithActivities);
          } else if (result.status === 'developing') {
            strengths.push(skillWithActivities);
          } else {
            // Prioritize growth areas that align with parent concerns and goals
            const skillText = `${skill.name} ${skill.description}`.toLowerCase();
            const matchesConcerns = concernKeywords.some(keyword => skillText.includes(keyword));
            const matchesGoals = goalKeywords.some(keyword => skillText.includes(keyword));
            
            if (matchesConcerns || matchesGoals) {
              growthAreas.unshift(skillWithActivities);
            } else {
              growthAreas.push(skillWithActivities);
            }
          }
        });

        setPlan({
          strengths,
          growthAreas,
          maintenance
        });
        setLoading(false);
      } catch (err) {
        console.error('Error generating development plan:', err);
        setError('Failed to generate development plan');
        setLoading(false);
      }
    };

    generatePlan();
  }, [assessmentResults, parentInput]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow">
          <div className="text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
            <h2 className="mt-6 text-2xl font-bold text-gray-900">Error</h2>
            <p className="mt-2 text-sm text-gray-600">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!plan) return null;

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <button
            onClick={onBack}
            className="inline-flex items-center text-emerald-600 hover:text-emerald-500"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </button>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            Development Plan for {childName}
          </h1>

          {/* Parent Input Summary */}
          {(parentInput.concerns.length > 0 || parentInput.goals.length > 0) && (
            <div className="mb-8 bg-gray-50 rounded-lg p-4">
              {parentInput.concerns.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Addressing Your Concerns
                  </h3>
                  <ul className="list-disc pl-5 space-y-1">
                    {parentInput.concerns.map((concern, index) => (
                      <li key={index} className="text-sm text-gray-700">{concern}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {parentInput.goals.length > 0 && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Working Towards Your Goals
                  </h3>
                  <ul className="list-disc pl-5 space-y-1">
                    {parentInput.goals.map((goal, index) => (
                      <li key={index} className="text-sm text-gray-700">{goal}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Growth Areas */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Areas for Growth
            </h2>
            <div className="space-y-6">
              {plan.growthAreas.map(({ skill, activities }) => (
                <div key={skill.id} className="border rounded-lg p-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    {skill.name}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {skill.description}
                  </p>
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">
                      Suggested Activities
                    </h4>
                    <div className="space-y-2">
                      {activities.map(activity => (
                        <div key={activity.id} className="flex items-start">
                          <Info className="h-5 w-5 text-emerald-500 mt-0.5 mr-2" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {activity.title}
                            </p>
                            <p className="text-sm text-gray-600">
                              {activity.description}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Strengths */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Areas of Strength
            </h2>
            <div className="space-y-6">
              {plan.strengths.map(({ skill, activities }) => (
                <div key={skill.id} className="border rounded-lg p-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    {skill.name}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {skill.description}
                  </p>
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">
                      Activities to Continue
                    </h4>
                    <div className="space-y-2">
                      {activities.map(activity => (
                        <div key={activity.id} className="flex items-start">
                          <CheckCircle className="h-5 w-5 text-emerald-500 mt-0.5 mr-2" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {activity.title}
                            </p>
                            <p className="text-sm text-gray-600">
                              {activity.description}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Maintenance */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Skills to Maintain
            </h2>
            <div className="space-y-6">
              {plan.maintenance.map(({ skill, activities }) => (
                <div key={skill.id} className="border rounded-lg p-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    {skill.name}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {skill.description}
                  </p>
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">
                      Maintenance Activities
                    </h4>
                    <div className="space-y-2">
                      {activities.map(activity => (
                        <div key={activity.id} className="flex items-start">
                          <CheckCircle className="h-5 w-5 text-emerald-500 mt-0.5 mr-2" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {activity.title}
                            </p>
                            <p className="text-sm text-gray-600">
                              {activity.description}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8 flex justify-between">
            <button
              onClick={onBack}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
            >
              Back to Assessment
            </button>
            <button
              onClick={() => onGenerateWeeklyPlan(plan)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
            >
              Generate Weekly Plan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 