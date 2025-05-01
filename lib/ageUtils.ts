/**
 * Calculate a child's age group based on birthdate
 */
export function calculateAgeGroup(birthDate: Date | null): string {
  if (!birthDate) return '0-1';
  
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  
  // Adjust age if birthday hasn't occurred yet this year
  if (
    today.getMonth() < birthDate.getMonth() || 
    (today.getMonth() === birthDate.getMonth() && today.getDate() < birthDate.getDate())
  ) {
    age--;
  }
  
  if (age < 1) return '0-1';
  if (age < 2) return '1-2';
  if (age < 3) return '2-3';
  if (age < 4) return '3-4';
  if (age < 5) return '4-5';
  if (age < 6) return '5-6';
  return '6+';
}

/**
 * Calculate a child's age in months based on birthdate
 */
export function calculateAgeInMonths(birthDate: Date): number {
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

/**
 * Convert age range string to age range in months
 */
export function ageRangeToMonths(ageRange: string): { min: number; max: number } {
  const [min, max] = ageRange.split('-').map(Number);
  return {
    min: min * 12,
    max: max * 12
  };
} 