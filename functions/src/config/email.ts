import { Resend } from 'resend';

// Email configuration
export const emailConfig = {
  from: 'LearnSprout <noreply@learnsprout.com>',
  apiKey: process.env.RESEND_API_KEY
};

// Initialize Resend client
export const resend = new Resend(emailConfig.apiKey);

// Email templates
export const emailTemplates = {
  weeklyPlan: {
    subject: (childName: string, startDate: Date, endDate: Date) => 
      `Weekly Learning Plan for ${childName} (${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()})`
  }
}; 