import { useState } from 'react';
import { ArrowLeft, Info } from 'lucide-react';
import { calculateAgeGroup } from '@/lib/ageUtils';
import { writeBatch, collection, query, where, doc, Timestamp } from 'firebase/firestore';
import { getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

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
  // Default questions for all age groups
  const defaultQuestions: Question[] = [
    {
      id: 'pl-1',
      domain: 'practical_life',
      text: 'Does your child show interest in self-care activities?',
      examples: [
        'Tries to feed themselves',
        'Participates in dressing',
        'Shows interest in hygiene routines'
      ],
      relatedSkills: ['prl-self-care', 'soc-independence']
    },
    {
      id: 'sen-1',
      domain: 'sensorial',
      text: 'Does your child explore objects using their senses?',
      examples: [
        'Touches different textures',
        'Responds to sounds',
        'Shows interest in visual patterns'
      ],
      relatedSkills: ['sen-sensory-awareness', 'sen-visual']
    },
    {
      id: 'lan-1',
      domain: 'language',
      text: 'Does your child communicate their needs?',
      examples: [
        'Uses gestures or sounds to communicate',
        'Responds to simple questions',
        'Shows understanding of basic words'
      ],
      relatedSkills: ['lan-vocabulary', 'lan-comprehension']
    },
    {
      id: 'mat-1',
      domain: 'mathematics',
      text: 'Does your child show interest in patterns and sorting?',
      examples: [
        'Groups similar objects together',
        'Shows interest in counting songs',
        'Notices differences in sizes'
      ],
      relatedSkills: ['mat-operations', 'tod-sorting']
    },
    {
      id: 'cul-1',
      domain: 'cultural',
      text: 'Does your child show curiosity about their environment?',
      examples: [
        'Explores nature elements',
        'Shows interest in music and movement',
        'Notices changes in surroundings'
      ],
      relatedSkills: ['cul-botany', 'cul-art']
    },
    {
      id: 'soc-1',
      domain: 'social_emotional',
      text: 'Does your child engage in social interactions?',
      examples: [
        'Shows interest in other people',
        'Expresses basic emotions',
        'Responds to others\' emotions'
      ],
      relatedSkills: ['soc-relationships', 'soc-emotion-reg']
    }
  ];

  // Age-specific questions
  const ageSpecificQuestions: Record<string, Question[]> = {
    '0-12m': [
      // Add age-specific questions for 0-12 months
    ],
    '1-2': [
      // Add age-specific questions for 1-2 years
    ],
    '2-3': [
      // Add age-specific questions for 2-3 years
    ],
    '3-4': [
      {
        id: 'pl-2',
        domain: 'practical_life',
        text: 'Does your child attempt to dress themselves?',
        examples: [
          'Puts on shoes (may need help with laces)',
          'Can put on a coat',
          'Attempts to button large buttons'
        ],
        relatedSkills: ['prl-dressing', 'prl-coordination']
      },
      // ... rest of the 3-4 specific questions ...
    ]
  };

  // Combine default questions with age-specific questions
  return [...defaultQuestions, ...(ageSpecificQuestions[ageGroup] || [])];
};

interface InitialAssessmentProps {
  childName: string;
  childId: string;
  birthDate: Date;
  onComplete: (results: { skillId: string; status: 'emerging' | 'developing' | 'mastered' }[]) => void;
  onBack: () => void;
}

export default function InitialAssessment({ 
  childName, 
  childId,
  birthDate, 
  onComplete,
  onBack 
}: InitialAssessmentProps) {
  const [currentDomainIndex, setCurrentDomainIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, 'yes' | 'sometimes' | 'not_yet'>>({});
  const [showExamples, setShowExamples] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const ageGroup = calculateAgeGroup(birthDate);
  const questions = getQuestionsForAge(ageGroup);
  const currentDomain = domains[currentDomainIndex];
  const domainQuestions = questions.filter(q => q.domain === currentDomain.id);

  // Calculate total questions and answered questions for accurate progress
  const totalQuestions = questions.length;
  const answeredQuestions = Object.keys(answers).length;
  const progress = (answeredQuestions / totalQuestions) * 100;

  const handleAnswer = (questionId: string, answer: 'yes' | 'sometimes' | 'not_yet') => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const toggleExamples = (questionId: string) => {
    setShowExamples(prev => ({ ...prev, [questionId]: !prev[questionId] }));
  };

  const handleNext = async () => {
    if (currentDomainIndex < domains.length - 1) {
      setCurrentDomainIndex(prev => prev + 1);
    } else {
      try {
        setIsSubmitting(true);
        // Convert answers to skill assessments
        const results = questions.flatMap(question => {
          const answer = answers[question.id];
          if (!answer) return [];
          
          const status: 'emerging' | 'developing' | 'mastered' = 
            answer === 'yes' ? 'mastered' :
            answer === 'sometimes' ? 'developing' : 'emerging';
          
          return question.relatedSkills.map(skillId => ({
            skillId,
            status,
            childId: childId,
            lastAssessed: Timestamp.now(),
            notes: `Initial assessment: ${answer}`,
            updatedAt: Timestamp.now()
          }));
        });
        
        // Save each skill assessment to Firestore
        const batch = writeBatch(db);
        
        for (const result of results) {
          // Check if skill already exists
          const skillQuery = query(
            collection(db, 'childSkills'),
            where('childId', '==', result.childId),
            where('skillId', '==', result.skillId)
          );
          
          const skillSnapshot = await getDocs(skillQuery);
          
          if (skillSnapshot.empty) {
            // Create new skill record
            const newSkillRef = doc(collection(db, 'childSkills'));
            batch.set(newSkillRef, result);
          } else {
            // Update existing skill record
            const skillDoc = skillSnapshot.docs[0];
            batch.update(skillDoc.ref, {
              status: result.status,
              lastAssessed: result.lastAssessed,
              notes: result.notes,
              updatedAt: result.updatedAt
            });
          }
        }
        
        // Commit all changes
        await batch.commit();
        
        // Call onComplete with the results
        await onComplete(results);
      } catch (error) {
        console.error('Error completing assessment:', error);
        // Show error to user
        alert('There was an error saving the assessment. Please try again.');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const isCurrentDomainComplete = domainQuestions.every(q => answers[q.id]);

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
          <p className="text-sm text-gray-500">
            {answeredQuestions} of {totalQuestions} questions completed
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
            disabled={!isCurrentDomainComplete || isSubmitting}
            className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-md hover:bg-emerald-700 disabled:opacity-50"
          >
            {isSubmitting ? 'Saving...' : currentDomainIndex === domains.length - 1 ? 'Complete' : 'Next Section'}
          </button>
        </div>
      </div>
    </div>
  );
} 