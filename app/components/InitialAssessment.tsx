import { useState } from 'react';
import { ArrowLeft, Info } from 'lucide-react';
import { calculateAgeGroup } from '@/lib/ageUtils';

interface Question {
  id: string;
  text: string;
  examples: string[];
  relatedSkills: string[];
  domain: 'practical_life' | 'sensorial' | 'language' | 'mathematics' | 'cultural' | 'social_emotional';
}

interface Domain {
  id: 'practical_life' | 'sensorial' | 'language' | 'mathematics' | 'cultural' | 'social_emotional';
  name: string;
  description: string;
  color: {
    bg: string;
    text: string;
    border: string;
  };
}

const domains: Domain[] = [
  {
    id: 'practical_life',
    name: 'Daily Living Skills',
    description: 'Self-care, independence, and coordination',
    color: { bg: 'bg-blue-50', text: 'text-blue-800', border: 'border-blue-200' }
  },
  {
    id: 'sensorial',
    name: 'Sensory & Motor',
    description: 'Physical movement and sensory exploration',
    color: { bg: 'bg-purple-50', text: 'text-purple-800', border: 'border-purple-200' }
  },
  {
    id: 'language',
    name: 'Communication',
    description: 'Speaking, listening, and early literacy',
    color: { bg: 'bg-yellow-50', text: 'text-yellow-800', border: 'border-yellow-200' }
  },
  {
    id: 'mathematics',
    name: 'Problem Solving',
    description: 'Numbers, patterns, and logical thinking',
    color: { bg: 'bg-green-50', text: 'text-green-800', border: 'border-green-200' }
  },
  {
    id: 'cultural',
    name: 'Discovery & Creativity',
    description: 'Exploring the world through art, music, and nature',
    color: { bg: 'bg-orange-50', text: 'text-orange-800', border: 'border-orange-200' }
  },
  {
    id: 'social_emotional',
    name: 'Social & Emotional',
    description: 'Feelings, relationships, and self-regulation',
    color: { bg: 'bg-pink-50', text: 'text-pink-800', border: 'border-pink-200' }
  }
];

// Questions are age-specific and map to multiple skills
const getQuestionsForAge = (ageGroup: string): Question[] => {
  // Example for age group 3-4
  if (ageGroup === '3-4') {
    return [
      {
        id: 'pl-1',
        domain: 'practical_life',
        text: 'Does your child attempt to dress themselves?',
        examples: [
          'Puts on shoes (may need help with laces)',
          'Can put on a coat',
          'Attempts to button large buttons'
        ],
        relatedSkills: ['prl-dressing', 'prl-coordination']
      },
      {
        id: 'pl-2',
        domain: 'practical_life',
        text: 'Does your child help with simple tasks?',
        examples: [
          'Helps set the table',
          'Puts toys away',
          'Helps with simple cleaning tasks'
        ],
        relatedSkills: ['prl-care', 'prl-organization']
      },
      {
        id: 'sen-1',
        domain: 'sensorial',
        text: 'Does your child show interest in exploring different textures and materials?',
        examples: [
          'Notices different surfaces while touching',
          'Comments on how things feel',
          'Enjoys sensory activities like playdough'
        ],
        relatedSkills: ['sen-tactile', 'sen-visual']
      },
      {
        id: 'lan-1',
        domain: 'language',
        text: 'Does your child engage in conversations?',
        examples: [
          'Answers simple questions',
          'Shares experiences from their day',
          'Uses 3-4 word sentences'
        ],
        relatedSkills: ['lan-vocabulary', 'lan-comprehension']
      },
      {
        id: 'mat-1',
        domain: 'mathematics',
        text: 'Does your child show understanding of numbers and counting?',
        examples: [
          'Counts objects while pointing to them',
          'Shows interest in counting songs',
          'Recognizes when there are more or less items'
        ],
        relatedSkills: ['mat-counting', 'mat-quantity']
      },
      {
        id: 'soc-1',
        domain: 'social_emotional',
        text: 'Does your child express their emotions?',
        examples: [
          'Names basic feelings (happy, sad, angry)',
          'Seeks comfort when upset',
          'Shows empathy when others are upset'
        ],
        relatedSkills: ['soc-self-awareness', 'soc-emotion-reg']
      }
    ];
  }
  // Add more age groups...
  return [];
};

interface InitialAssessmentProps {
  childName: string;
  birthDate: Date;
  onComplete: (results: { skillId: string; status: 'emerging' | 'developing' | 'mastered' }[]) => void;
  onBack: () => void;
}

export default function InitialAssessment({ 
  childName, 
  birthDate, 
  onComplete,
  onBack 
}: InitialAssessmentProps) {
  const [currentDomainIndex, setCurrentDomainIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, 'yes' | 'sometimes' | 'not_yet'>>({});
  const [showExamples, setShowExamples] = useState<Record<string, boolean>>({});

  const ageGroup = calculateAgeGroup(birthDate);
  const questions = getQuestionsForAge(ageGroup);
  const currentDomain = domains[currentDomainIndex];
  const domainQuestions = questions.filter(q => q.domain === currentDomain.id);

  const handleAnswer = (questionId: string, answer: 'yes' | 'sometimes' | 'not_yet') => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const toggleExamples = (questionId: string) => {
    setShowExamples(prev => ({ ...prev, [questionId]: !prev[questionId] }));
  };

  const handleNext = () => {
    if (currentDomainIndex < domains.length - 1) {
      setCurrentDomainIndex(prev => prev + 1);
    } else {
      // Convert answers to skill assessments
      const results = questions.flatMap(question => {
        const answer = answers[question.id];
        if (!answer) return [];
        
        const status: 'emerging' | 'developing' | 'mastered' = 
          answer === 'yes' ? 'developing' : 'emerging';
        
        return question.relatedSkills.map(skillId => ({
          skillId,
          status
        }));
      });
      
      onComplete(results);
    }
  };

  const isCurrentDomainComplete = domainQuestions.every(q => answers[q.id]);
  const progress = (currentDomainIndex / domains.length) * 100;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-6">
        <button
          onClick={onBack}
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </button>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Let's Learn About {childName}
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Help us understand {childName}'s current interests and abilities by answering a few questions.
            This will help us create a personalized learning journey.
          </p>
        </div>

        {/* Progress bar */}
        <div className="mb-8">
          <div className="h-2 bg-gray-100 rounded-full">
            <div
              className="h-2 bg-emerald-500 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-2 text-sm text-gray-600">
            Section {currentDomainIndex + 1} of {domains.length}: {currentDomain.name}
          </p>
        </div>

        {/* Domain description */}
        <div className={`mb-8 p-4 rounded-lg ${currentDomain.color.bg} ${currentDomain.color.text}`}>
          <h2 className="font-medium mb-2">{currentDomain.name}</h2>
          <p className="text-sm">{currentDomain.description}</p>
        </div>

        {/* Questions */}
        <div className="space-y-8">
          {domainQuestions.map(question => (
            <div key={question.id} className="space-y-4">
              <div className="flex items-start gap-2">
                <div className="flex-grow">
                  <p className="text-gray-900 font-medium">{question.text}</p>
                  {showExamples[question.id] && (
                    <ul className="mt-2 ml-4 text-sm text-gray-600 list-disc">
                      {question.examples.map((example, i) => (
                        <li key={i}>{example}</li>
                      ))}
                    </ul>
                  )}
                </div>
                <button
                  onClick={() => toggleExamples(question.id)}
                  className="flex-shrink-0 text-gray-400 hover:text-gray-600"
                >
                  <Info className="h-5 w-5" />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => handleAnswer(question.id, 'yes')}
                  className={`p-3 text-sm rounded-lg border transition-colors ${
                    answers[question.id] === 'yes'
                      ? 'bg-green-50 border-green-500 text-green-700'
                      : 'border-gray-200 hover:border-green-300'
                  }`}
                >
                  <div className="font-medium">Yes</div>
                  <div className="text-xs text-gray-500">
                    Does this regularly
                  </div>
                </button>
                <button
                  onClick={() => handleAnswer(question.id, 'sometimes')}
                  className={`p-3 text-sm rounded-lg border transition-colors ${
                    answers[question.id] === 'sometimes'
                      ? 'bg-yellow-50 border-yellow-500 text-yellow-700'
                      : 'border-gray-200 hover:border-yellow-300'
                  }`}
                >
                  <div className="font-medium">Sometimes</div>
                  <div className="text-xs text-gray-500">
                    Starting to show this
                  </div>
                </button>
                <button
                  onClick={() => handleAnswer(question.id, 'not_yet')}
                  className={`p-3 text-sm rounded-lg border transition-colors ${
                    answers[question.id] === 'not_yet'
                      ? 'bg-gray-50 border-gray-500 text-gray-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-medium">Not Yet</div>
                  <div className="text-xs text-gray-500">
                    Will explore this soon
                  </div>
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Navigation */}
        <div className="mt-8 flex justify-between">
          <button
            onClick={() => setCurrentDomainIndex(prev => Math.max(0, prev - 1))}
            disabled={currentDomainIndex === 0}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50"
          >
            Previous Section
          </button>
          <button
            onClick={handleNext}
            disabled={!isCurrentDomainComplete}
            className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-md hover:bg-emerald-700 disabled:opacity-50"
          >
            {currentDomainIndex === domains.length - 1 ? 'Complete' : 'Next Section'}
          </button>
        </div>
      </div>
    </div>
  );
} 