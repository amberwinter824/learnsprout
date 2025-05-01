import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../components/ui/tabs";
import { 
  BarChart,
  Calendar,
  Lightbulb,
  MapPin
} from 'lucide-react';
import PediatricVisitPrep from './PediatricVisitPrep';
import EnhancedActivityDetail from './EnhancedActivityDetail';
import { DevelopmentalSkill } from '../../../lib/types/enhancedSchema';
import * as ageUtils from '../../../lib/ageUtils';

// Fallback function in case import fails
function calculateChildAgeInMonths(birthDate: Date): number {
  const today = new Date();
  
  let months = (today.getFullYear() - birthDate.getFullYear()) * 12;
  months -= birthDate.getMonth();
  months += today.getMonth();
  
  // Adjust for day of month
  if (today.getDate() < birthDate.getDate()) {
    months--;
  }
  
  return Math.max(0, months);
}

interface Child {
  id: string;
  name: string;
  birthDate: Date;
  ageGroup: string;
}

interface DevelopmentJourneyDashboardProps {
  child: Child;
}

export default function DevelopmentJourneyDashboard({ child }: DevelopmentJourneyDashboardProps) {
  const [selectedTab, setSelectedTab] = useState('journey');
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);
  
  // Use imported function if available, otherwise use fallback
  const calculateAgeInMonths = ageUtils.calculateAgeInMonths || calculateChildAgeInMonths;
  const childAgeMonths = calculateAgeInMonths(child.birthDate);
  
  const handleActivitySelect = (activityId: string) => {
    setSelectedActivityId(activityId);
    setSelectedTab('activity');
  };
  
  const handleBackToJourney = () => {
    setSelectedActivityId(null);
    setSelectedTab('journey');
  };
  
  return (
    <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">
        {child.name}'s Development Journey
      </h1>
      
      <Tabs defaultValue={selectedTab} className="w-full">
        <TabsList className="grid grid-cols-3 mb-6">
          <TabsTrigger value="journey" className="flex items-center">
            <MapPin size={16} className="mr-2" />
            <span>Journey</span>
          </TabsTrigger>
          <TabsTrigger value="checkup" className="flex items-center">
            <Calendar size={16} className="mr-2" />
            <span>Checkup Prep</span>
          </TabsTrigger>
          {selectedActivityId ? (
            <TabsTrigger value="activity" className="flex items-center">
              <Lightbulb size={16} className="mr-2" />
              <span>Activity</span>
            </TabsTrigger>
          ) : (
            <TabsTrigger value="progress" className="flex items-center">
              <BarChart size={16} className="mr-2" />
              <span>Progress</span>
            </TabsTrigger>
          )}
        </TabsList>
        
        <TabsContent value="journey" className="mt-2">
          <div className="p-6 bg-white rounded-lg shadow">
            <h2 className="text-xl font-medium text-gray-900 mb-4">
              Development Through Play
            </h2>
            <p className="text-gray-600 mb-6">
              Your child is currently {childAgeMonths} months old. 
              Explore play-based activities that support their natural development.
            </p>
            
            {/* Sample activities - in real app, these would come from the database */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {['act1', 'act2', 'act3', 'act4', 'act5', 'act6'].map(actId => (
                <div 
                  key={actId}
                  className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => handleActivitySelect(actId)}
                >
                  <div className="h-32 bg-blue-100 flex items-center justify-center">
                    <Lightbulb size={32} className="text-blue-600" />
                  </div>
                  <div className="p-4">
                    <h3 className="font-medium">Sample Activity {actId}</h3>
                    <p className="text-sm text-gray-500">Supports multiple development areas</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="checkup" className="mt-2">
          <PediatricVisitPrep
            childId={child.id}
            childAge={childAgeMonths}
            onActivitySelect={handleActivitySelect}
          />
        </TabsContent>
        
        <TabsContent value="progress" className="mt-2">
          <div className="p-6 bg-white rounded-lg shadow">
            <h2 className="text-xl font-medium text-gray-900 mb-4">
              Development Progress
            </h2>
            <p className="text-gray-600 mb-6">
              Track your child's development journey across all domains.
            </p>
            
            {/* Placeholder for progress visualization component */}
            <div className="h-64 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center text-gray-400">
              <div className="text-center">
                <BarChart size={48} className="mx-auto mb-2" />
                <p>Progress visualization would appear here</p>
              </div>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="activity" className="mt-2">
          {selectedActivityId && (
            <EnhancedActivityDetail 
              activityId={selectedActivityId}
              childId={child.id}
              onBack={handleBackToJourney}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
} 