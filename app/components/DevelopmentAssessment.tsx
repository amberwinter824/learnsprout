import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { calculateAgeGroup } from '@/lib/ageUtils';
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

interface ParentInput {
  concerns: string[];
  goals: string[];
  notes: string;
}

export default function DevelopmentAssessment({ 
  childName, 
  birthDate,
  parentInput,
  onComplete 
}: { 
  childName: string;
  birthDate: Date;
  parentInput: ParentInput;
  onComplete: (results: AssessmentResult[]) => void;
}) {
  const [assessmentData, setAssessmentData] = useState<AssessmentResult[]>([]);
  const [skills, setSkills] = useState<DevelopmentalSkill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDevelopmentalSkills = async () => {
      try {
        const ageGroup = calculateAgeGroup(birthDate);
        
        // Fetch developmental skills for this age group
        const skillsQuery = query(
          collection(db, 'developmentalSkills'),
          where('ageGroups', 'array-contains', ageGroup)
        );
        
        const skillsSnapshot = await getDocs(skillsQuery);
        const fetchedSkills = skillsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as DevelopmentalSkill[];

        // Prioritize skills that match parent concerns and goals
        const concernKeywords = parentInput.concerns.flatMap(concern => concern.toLowerCase().split(' '));
        const goalKeywords = parentInput.goals.flatMap(goal => goal.toLowerCase().split(' '));

        const sortedSkills = fetchedSkills.sort((a, b) => {
          const aText = `${a.name} ${a.description}`.toLowerCase();
          const bText = `${b.name} ${b.description}`.toLowerCase();
          
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

        setSkills(sortedSkills);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching developmental skills:', err);
        setError('Failed to load assessment questions');
        setLoading(false);
      }
    };

    fetchDevelopmentalSkills();
  }, [birthDate, parentInput]);

  const handleAnswer = (skillId: string, status: 'emerging' | 'developing' | 'mastered') => {
    const newResult: AssessmentResult = {
      skillId,
      status,
      notes: ''
    };

    setAssessmentData(prev => {
      const existingIndex = prev.findIndex(r => r.skillId === skillId);
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = newResult;
        return updated;
      }
      return [...prev, newResult];
    });
  };

  const handleSubmit = () => {
    onComplete(assessmentData);
  };

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

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <button
            onClick={() => onComplete([])}
            className="inline-flex items-center text-emerald-600 hover:text-emerald-500"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </button>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            Developmental Assessment for {childName}
          </h1>

          <div className="space-y-6">
            {skills.map((skill) => (
              <div key={skill.id} className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {skill.name}
                </h3>
                <p className="text-sm text-gray-600">
                  {skill.description}
                </p>
                <div className="grid grid-cols-3 gap-4">
                  <button
                    onClick={() => handleAnswer(skill.id, 'emerging')}
                    className={`p-4 rounded-lg border ${
                      assessmentData.find(r => r.skillId === skill.id)?.status === 'emerging'
                        ? 'border-emerald-500 bg-emerald-50'
                        : 'border-gray-200 hover:border-emerald-300'
                    }`}
                  >
                    Starting to Show
                  </button>
                  <button
                    onClick={() => handleAnswer(skill.id, 'developing')}
                    className={`p-4 rounded-lg border ${
                      assessmentData.find(r => r.skillId === skill.id)?.status === 'developing'
                        ? 'border-emerald-500 bg-emerald-50'
                        : 'border-gray-200 hover:border-emerald-300'
                    }`}
                  >
                    Developing Well
                  </button>
                  <button
                    onClick={() => handleAnswer(skill.id, 'mastered')}
                    className={`p-4 rounded-lg border ${
                      assessmentData.find(r => r.skillId === skill.id)?.status === 'mastered'
                        ? 'border-emerald-500 bg-emerald-50'
                        : 'border-gray-200 hover:border-emerald-300'
                    }`}
                  >
                    Mastered
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 flex justify-end">
            <button
              onClick={handleSubmit}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
            >
              Complete Assessment
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 