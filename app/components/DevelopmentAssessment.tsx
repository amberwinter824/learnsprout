import { useState, useEffect } from 'react';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { calculateAgeGroup } from '@/lib/ageUtils';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

interface DevelopmentalSkill {
  id: string;
  name: string;
  description: string;
  area: string;
  ageRanges: string[];
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
  const [currentSkillIndex, setCurrentSkillIndex] = useState(0);

  useEffect(() => {
    const fetchDevelopmentalSkills = async () => {
      try {
        setLoading(true);
        const ageGroup = calculateAgeGroup(birthDate);
        console.log('Calculated age group:', ageGroup);
        
        // Fetch developmental skills for this age group
        const skillsQuery = query(
          collection(db, 'developmentalSkills'),
          where('ageRanges', 'array-contains', ageGroup)
        );
        
        console.log('Fetching skills for age group:', ageGroup);
        const skillsSnapshot = await getDocs(skillsQuery);
        console.log('Query results:', {
          empty: skillsSnapshot.empty,
          size: skillsSnapshot.size,
          docs: skillsSnapshot.docs.map(doc => ({
            id: doc.id,
            ageRanges: doc.data().ageRanges,
            name: doc.data().name
          }))
        });

        if (skillsSnapshot.empty) {
          throw new Error(`No developmental skills found for age group: ${ageGroup}`);
        }

        const fetchedSkills = skillsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as DevelopmentalSkill[];

        // Sort skills by area and prioritize based on parent input
        const sortedSkills = sortSkillsByPriority(fetchedSkills, parentInput);
        setSkills(sortedSkills);
        setLoading(false);
      } catch (err) {
        console.error('Error details:', err);
        setError(err instanceof Error ? err.message : 'Failed to load assessment questions');
        setLoading(false);
      }
    };

    fetchDevelopmentalSkills();
  }, [birthDate, parentInput]);

  const sortSkillsByPriority = (skills: DevelopmentalSkill[], parentInput: ParentInput) => {
    const concernKeywords = parentInput.concerns.flatMap(concern => concern.toLowerCase().split(' '));
    const goalKeywords = parentInput.goals.flatMap(goal => goal.toLowerCase().split(' '));

    return skills.sort((a, b) => {
      const aText = `${a.name} ${a.description} ${a.area}`.toLowerCase();
      const bText = `${b.name} ${b.description} ${b.area}`.toLowerCase();
      
      const aMatchesConcerns = concernKeywords.some(keyword => aText.includes(keyword));
      const bMatchesConcerns = concernKeywords.some(keyword => bText.includes(keyword));
      const aMatchesGoals = goalKeywords.some(keyword => aText.includes(keyword));
      const bMatchesGoals = goalKeywords.some(keyword => bText.includes(keyword));
      
      if (aMatchesConcerns && !bMatchesConcerns) return -1;
      if (!aMatchesConcerns && bMatchesConcerns) return 1;
      if (aMatchesGoals && !bMatchesGoals) return -1;
      if (!aMatchesGoals && bMatchesGoals) return 1;
      
      // If no matches, sort by area
      return a.area.localeCompare(b.area);
    });
  };

  const handleAnswer = (skillId: string, status: 'emerging' | 'developing' | 'mastered') => {
    setAssessmentData(prev => {
      const existingIndex = prev.findIndex(r => r.skillId === skillId);
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = { skillId, status };
        return updated;
      }
      return [...prev, { skillId, status }];
    });

    // Move to next skill if not at the end
    if (currentSkillIndex < skills.length - 1) {
      setCurrentSkillIndex(prev => prev + 1);
    }
  };

  const handleSubmit = () => {
    if (assessmentData.length === 0) {
      if (!confirm('No skills have been assessed. Are you sure you want to skip the assessment?')) {
        return;
      }
    }
    onComplete(assessmentData);
  };

  const handleBack = () => {
    if (assessmentData.length > 0) {
      if (confirm('Going back will lose your assessment progress. Are you sure?')) {
        onComplete([]);
      }
    } else {
      onComplete([]);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 rounded-lg p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error Loading Assessment</h3>
              <p className="mt-2 text-sm text-red-700">{error}</p>
              <button
                onClick={handleBack}
                className="mt-4 text-sm font-medium text-red-700 hover:text-red-600"
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (skills.length === 0) {
    return (
      <div className="p-8">
        <div className="bg-yellow-50 rounded-lg p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-yellow-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">No Skills Found</h3>
              <p className="mt-2 text-sm text-yellow-700">
                No developmental skills were found for this age group. Please try again later.
              </p>
              <button
                onClick={handleBack}
                className="mt-4 text-sm font-medium text-yellow-700 hover:text-yellow-600"
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const currentSkill = skills[currentSkillIndex];

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Development Assessment for {childName}
        </h1>
        <button
          onClick={handleBack}
          className="text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
      </div>

      <div className="mb-6">
        <div className="bg-gray-100 rounded-full h-2">
          <div
            className="bg-emerald-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${(currentSkillIndex / skills.length) * 100}%` }}
          />
        </div>
        <p className="text-sm text-gray-600 mt-2">
          Question {currentSkillIndex + 1} of {skills.length}
        </p>
      </div>

      <div className="space-y-6">
        <div key={currentSkill.id} className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">
            {currentSkill.name}
          </h3>
          <p className="text-sm text-gray-600">
            {currentSkill.description}
          </p>
          <div className="grid grid-cols-3 gap-4">
            <button
              onClick={() => handleAnswer(currentSkill.id, 'emerging')}
              className={`p-4 rounded-lg border ${
                assessmentData.find(r => r.skillId === currentSkill.id)?.status === 'emerging'
                  ? 'border-emerald-500 bg-emerald-50'
                  : 'border-gray-200 hover:border-emerald-300'
              }`}
            >
              Starting to Show
            </button>
            <button
              onClick={() => handleAnswer(currentSkill.id, 'developing')}
              className={`p-4 rounded-lg border ${
                assessmentData.find(r => r.skillId === currentSkill.id)?.status === 'developing'
                  ? 'border-emerald-500 bg-emerald-50'
                  : 'border-gray-200 hover:border-emerald-300'
              }`}
            >
              Developing Well
            </button>
            <button
              onClick={() => handleAnswer(currentSkill.id, 'mastered')}
              className={`p-4 rounded-lg border ${
                assessmentData.find(r => r.skillId === currentSkill.id)?.status === 'mastered'
                  ? 'border-emerald-500 bg-emerald-50'
                  : 'border-gray-200 hover:border-emerald-300'
              }`}
            >
              Mastered
            </button>
          </div>
        </div>
      </div>

      <div className="mt-8 flex justify-between">
        <button
          onClick={() => setCurrentSkillIndex(prev => Math.max(0, prev - 1))}
          disabled={currentSkillIndex === 0}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50"
        >
          Previous
        </button>
        {currentSkillIndex === skills.length - 1 ? (
          <button
            onClick={handleSubmit}
            className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-md hover:bg-emerald-700"
          >
            Complete Assessment
          </button>
        ) : (
          <button
            onClick={() => setCurrentSkillIndex(prev => Math.min(skills.length - 1, prev + 1))}
            className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-md hover:bg-emerald-700"
          >
            Next
          </button>
        )}
      </div>
    </div>
  );
} 