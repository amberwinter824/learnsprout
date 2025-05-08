import { useState, useEffect } from 'react';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { calculateAgeGroup } from '@/lib/ageUtils';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, setDoc, updateDoc } from 'firebase/firestore';
import { DevelopmentalSkill } from '@/lib/types/enhancedSchema';

// Keep the local AssessmentResult interface
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
  onComplete,
  childId
}: { 
  childName: string;
  birthDate: Date;
  parentInput: ParentInput;
  onComplete: (results: AssessmentResult[]) => void;
  childId?: string;
}) {
  const [assessmentData, setAssessmentData] = useState<AssessmentResult[]>([]);
  const [skills, setSkills] = useState<DevelopmentalSkill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentSkillIndex, setCurrentSkillIndex] = useState(0);
  const [selectedArea, setSelectedArea] = useState<string>('all');
  const [showPrioritized, setShowPrioritized] = useState(true);
  const [filteredSkills, setFilteredSkills] = useState<DevelopmentalSkill[]>([]);
  const [skillsByArea, setSkillsByArea] = useState<Record<string, DevelopmentalSkill[]>>({});
  const [areas, setAreas] = useState<string[]>([]);

  // Define helper functions first
  const isSkillPrioritized = (skill: DevelopmentalSkill, parentInput: ParentInput) => {
    if (!skill || !parentInput) return false;
    const text = `${skill.name} ${skill.description} ${skill.area}`.toLowerCase();
    const concernKeywords = parentInput.concerns?.flatMap(concern => concern.toLowerCase().split(' ')) || [];
    const goalKeywords = parentInput.goals?.flatMap(goal => goal.toLowerCase().split(' ')) || [];
    
    return concernKeywords.some(keyword => text.includes(keyword)) ||
           goalKeywords.some(keyword => text.includes(keyword));
  };

  const sortSkillsByPriority = (skillsToSort: DevelopmentalSkill[], input: ParentInput) => {
    const concernKeywords = input.concerns?.flatMap(concern => concern.toLowerCase().split(' ')) || [];
    const goalKeywords = input.goals?.flatMap(goal => goal.toLowerCase().split(' ')) || [];

    return [...skillsToSort].sort((a, b) => {
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
      
      return a.area.localeCompare(b.area);
    });
  };

  const getAreaProgress = (area: string) => {
    if (!skills.length) return 0;
    const areaSkills = area === 'all' ? skills : skills.filter(s => s.area === area);
    return areaSkills.filter(skill => 
      assessmentData.some(result => result.skillId === skill.id)
    ).length;
  };

  useEffect(() => {
    const fetchSkills = async () => {
      try {
        // Fetch age-appropriate skills
        const ageInMonths = Math.floor((new Date().getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44));
        console.log('[Assessment Debug] Child age in months:', ageInMonths);
        // Query for skills where any ageRange includes the child's age in months
        const allSkillsSnapshot = await getDocs(collection(db, 'developmentalSkills'));
        const allSkillsData = allSkillsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as DevelopmentalSkill[];
        console.log('[Assessment Debug] All skills loaded:', allSkillsData.length, allSkillsData.map(s => ({id: s.id, name: s.name, ageRanges: s.ageRanges})));
        // Filter skills by age
        const skillsData = allSkillsData.filter(skill => {
          if (!Array.isArray(skill.ageRanges)) return false;
          // Only include if ageRanges is an array of objects with min and max
          return skill.ageRanges.some((range: any) => {
            return typeof range === 'object' && range !== null &&
              typeof range.min === 'number' && typeof range.max === 'number' &&
              ageInMonths >= range.min && ageInMonths < range.max;
          });
        });
        console.log('[Assessment Debug] Filtered skills for age:', skillsData.length, skillsData.map(s => ({id: s.id, name: s.name, ageRanges: s.ageRanges})));

        setSkills(skillsData);

        // Group skills by area
        const areaMap: Record<string, DevelopmentalSkill[]> = {};
        skillsData.forEach(skill => {
          if (!areaMap[skill.area]) {
            areaMap[skill.area] = [];
          }
          areaMap[skill.area].push(skill);
        });
        setSkillsByArea(areaMap);
        setAreas(Object.keys(areaMap));

        // If childId is provided, fetch previous assessment results
        if (childId) {
          const skillsQuery = query(
            collection(db, 'childSkills'),
            where('childId', '==', childId)
          );
          const skillsSnapshot = await getDocs(skillsQuery);
          const previousResults = skillsSnapshot.docs.map(doc => ({
            skillId: doc.data().skillId,
            status: doc.data().status,
            notes: doc.data().notes
          })) as AssessmentResult[];
          
          setAssessmentData(previousResults);

          // Find the first unassessed skill
          const firstUnassessedIndex = skillsData.findIndex(skill => 
            !previousResults.some(result => result.skillId === skill.id)
          );
          
          // If all skills are assessed, start from the beginning
          setCurrentSkillIndex(firstUnassessedIndex >= 0 ? firstUnassessedIndex : 0);
        }
      } catch (err) {
        console.error('Error fetching skills:', err);
        setError('Failed to load assessment data');
      } finally {
        setLoading(false);
      }
    };

    fetchSkills();
  }, [birthDate, childId]);

  // Update skillsByArea and areas when skills change
  useEffect(() => {
    const newSkillsByArea = skills.reduce((acc, skill) => {
      if (!acc[skill.area]) {
        acc[skill.area] = [];
      }
      acc[skill.area].push(skill);
      return acc;
    }, {} as Record<string, DevelopmentalSkill[]>);
    
    setSkillsByArea(newSkillsByArea);
    setAreas(Object.keys(newSkillsByArea));
  }, [skills]);

  // Update filtered skills when area or prioritization changes
  useEffect(() => {
    const newFilteredSkills = skills.filter(skill => {
      if (!skill || !skill.area) return false;
      return (selectedArea === 'all' || skill.area === selectedArea) &&
             (!showPrioritized || isSkillPrioritized(skill, parentInput));
    });
    setFilteredSkills(newFilteredSkills);
    setCurrentSkillIndex(0);
  }, [selectedArea, showPrioritized, skills, parentInput]);

  const currentSkill = filteredSkills[currentSkillIndex] || null;
  const totalSkills = filteredSkills.length;
  const completedSkills = assessmentData.length;

  const handleAnswer = async (skillId: string, status: 'emerging' | 'developing' | 'mastered') => {
    try {
      // Update the assessment data
      setAssessmentData(prev => {
        const existingIndex = prev.findIndex(r => r.skillId === skillId);
        if (existingIndex >= 0) {
          const updated = [...prev];
          updated[existingIndex] = { skillId, status };
          return updated;
        }
        return [...prev, { skillId, status }];
      });

      // Save to Firestore immediately
      if (childId) {
        const skillQuery = query(
          collection(db, 'childSkills'),
          where('childId', '==', childId),
          where('skillId', '==', skillId)
        );
        
        const skillSnapshot = await getDocs(skillQuery);
        
        if (skillSnapshot.empty) {
          // Create new skill record
          const newSkillRef = doc(collection(db, 'childSkills'));
          await setDoc(newSkillRef, {
            skillId,
            status,
            childId,
            lastAssessed: new Date(),
            updatedAt: new Date()
          });
        } else {
          // Update existing skill record
          const skillDoc = skillSnapshot.docs[0];
          await updateDoc(skillDoc.ref, {
            status,
            lastAssessed: new Date(),
            updatedAt: new Date()
          });
        }
      }

      // Auto-advance to next section if not on the last skill
      if (currentSkillIndex < filteredSkills.length - 1) {
        setCurrentSkillIndex(prev => prev + 1);
      } else {
        // If on the last skill, automatically submit the assessment
        handleSubmit();
      }
    } catch (err) {
      console.error('Error saving answer:', err);
      // Show error to user
      alert('There was an error saving your answer. Please try again.');
    }
  };

  const handleSubmit = async () => {
    if (assessmentData.length === 0) {
      if (!confirm('No skills have been assessed. Are you sure you want to skip the assessment?')) {
        return;
      }
    }
    
    try {
      // Update child's last assessment date
      if (childId) {
        const childRef = doc(db, 'children', childId);
        await updateDoc(childRef, {
          lastAssessmentDate: new Date(),
          assessmentStatus: 'completed'
        });
      }
      
      onComplete(assessmentData);
    } catch (err) {
      console.error('Error completing assessment:', err);
      alert('There was an error completing the assessment. Please try again.');
    }
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

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Development Assessment for {childName}
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Assess your child's developmental progress in different areas
          </p>
        </div>
        <button
          onClick={handleBack}
          className="text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
      </div>

      {/* Area selection and filters */}
      {!loading && !error && skills.length > 0 && (
        <div className="mb-6">
          <div className="flex flex-wrap gap-2 mb-4">
            <button
              onClick={() => setSelectedArea('all')}
              className={`px-3 py-1 rounded-full text-sm ${
                selectedArea === 'all'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All Areas ({getAreaProgress('all')}/{skills.length})
            </button>
            {areas.map(area => (
              <button
                key={area}
                onClick={() => setSelectedArea(area)}
                className={`px-3 py-1 rounded-full text-sm ${
                  selectedArea === area
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {area} ({getAreaProgress(area)}/{skillsByArea[area].length})
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowPrioritized(!showPrioritized)}
            className={`px-3 py-1 rounded-full text-sm ${
              showPrioritized
                ? 'bg-amber-100 text-amber-800'
                : 'bg-gray-100 text-gray-700'
            }`}
          >
            {showPrioritized ? '✓ Showing Priority Skills' : 'Show All Skills'}
          </button>
        </div>
      )}

      {/* Progress bar */}
      {!loading && !error && filteredSkills.length > 0 && (
        <div className="mb-6">
          <div className="bg-gray-100 rounded-full h-2">
            <div
              className="bg-emerald-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(completedSkills / totalSkills) * 100}%` }}
            />
          </div>
          <p className="text-sm text-gray-600 mt-2">
            Progress: {completedSkills} of {totalSkills} skills assessed
          </p>
        </div>
      )}

      {/* Current skill assessment */}
      {!loading && !error && currentSkill && (
        <div className="space-y-6">
          <div key={currentSkill.id} className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 bg-gray-100 rounded text-sm text-gray-600">
                {currentSkill.area}
              </span>
              <h3 className="text-lg font-medium text-gray-900">
                {currentSkill.name}
              </h3>
            </div>
            <p className="text-sm text-gray-600">
              {currentSkill.description}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={() => handleAnswer(currentSkill.id, 'emerging')}
                className={`p-4 rounded-lg border ${
                  assessmentData.find(r => r.skillId === currentSkill.id)?.status === 'emerging'
                    ? 'border-emerald-500 bg-emerald-50'
                    : 'border-gray-200 hover:border-emerald-300'
                }`}
              >
                <div className="text-left">
                  <div className="font-medium mb-1">Starting to Show</div>
                  <div className="text-sm text-gray-600">
                    Beginning to demonstrate this skill with support
                  </div>
                </div>
              </button>
              <button
                onClick={() => handleAnswer(currentSkill.id, 'developing')}
                className={`p-4 rounded-lg border ${
                  assessmentData.find(r => r.skillId === currentSkill.id)?.status === 'developing'
                    ? 'border-emerald-500 bg-emerald-50'
                    : 'border-gray-200 hover:border-emerald-300'
                }`}
              >
                <div className="text-left">
                  <div className="font-medium mb-1">Developing Well</div>
                  <div className="text-sm text-gray-600">
                    Shows this skill regularly with occasional support
                  </div>
                </div>
              </button>
              <button
                onClick={() => handleAnswer(currentSkill.id, 'mastered')}
                className={`p-4 rounded-lg border ${
                  assessmentData.find(r => r.skillId === currentSkill.id)?.status === 'mastered'
                    ? 'border-emerald-500 bg-emerald-50'
                    : 'border-gray-200 hover:border-emerald-300'
                }`}
              >
                <div className="text-left">
                  <div className="font-medium mb-1">Mastered</div>
                  <div className="text-sm text-gray-600">
                    Consistently demonstrates this skill independently
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Navigation buttons */}
      {!loading && !error && currentSkill && (
        <div className="mt-8 flex justify-between">
          <button
            onClick={() => setCurrentSkillIndex(prev => Math.max(0, prev - 1))}
            disabled={currentSkillIndex === 0}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50"
          >
            Previous
          </button>
          <div className="flex gap-2">
            {currentSkillIndex === filteredSkills.length - 1 ? (
              <button
                onClick={handleSubmit}
                className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-md hover:bg-emerald-700"
              >
                Complete Assessment
              </button>
            ) : (
              <>
                <button
                  onClick={() => setCurrentSkillIndex(prev => Math.min(filteredSkills.length - 1, prev + 1))}
                  className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Skip This Skill
                </button>
                <button
                  onClick={() => setCurrentSkillIndex(prev => Math.min(filteredSkills.length - 1, prev + 1))}
                  className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-md hover:bg-emerald-700"
                >
                  Save & Continue
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 