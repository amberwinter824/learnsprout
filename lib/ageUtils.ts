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

/**
 * Get a human-readable description of an age group
 */
export function getAgeGroupDescription(ageGroup: string): string {
  const descriptions: Record<string, string> = {
    "0-1": "Infant (0-12 months)",
    "1-2": "Young toddler (1-2 years)",
    "2-3": "Older toddler (2-3 years)",
    "3-4": "Young preschooler (3-4 years)",
    "4-5": "Older preschooler (4-5 years)",
    "5-6": "Kindergarten age (5-6 years)",
    "6+": "School age (6+ years)"
  };
  
  return descriptions[ageGroup] || ageGroup;
}

/**
 * Format age for display (e.g., "2 years, 3 months")
 */
export function formatAge(birthDate: Date | null): string {
  if (!birthDate) return "Unknown age";
  
  const today = new Date();
  
  // Calculate years
  let years = today.getFullYear() - birthDate.getFullYear();
  
  // Adjust years if birthday hasn't occurred yet this year
  if (
    today.getMonth() < birthDate.getMonth() || 
    (today.getMonth() === birthDate.getMonth() && today.getDate() < birthDate.getDate())
  ) {
    years--;
  }
  
  // Calculate months
  let months = today.getMonth() - birthDate.getMonth();
  if (months < 0) months += 12;
  
  // Adjust for day of month
  if (today.getDate() < birthDate.getDate()) {
    months = (months - 1 + 12) % 12;
  }
  
  if (years === 0) {
    return months === 1 ? "1 month" : `${months} months`;
  } else if (months === 0) {
    return years === 1 ? "1 year" : `${years} years`;
  } else {
    const yearText = years === 1 ? "1 year" : `${years} years`;
    const monthText = months === 1 ? "1 month" : `${months} months`;
    return `${yearText}, ${monthText}`;
  }
}

/**
 * Check if birthdate is valid for platform support (0-7 years)
 */
export function isValidBirthdate(birthDate: Date): boolean {
  if (!birthDate) return false;
  
  const today = new Date();
  
  // Check if birthdate is in the future
  if (birthDate > today) return false;
  
  // Calculate age in years
  let years = today.getFullYear() - birthDate.getFullYear();
  
  // Adjust years if birthday hasn't occurred yet this year
  if (
    today.getMonth() < birthDate.getMonth() || 
    (today.getMonth() === birthDate.getMonth() && today.getDate() < birthDate.getDate())
  ) {
    years--;
  }
  
  // Check if age is within supported range (0-7 years)
  return years >= 0 && years <= 7;
}

/**
 * Get age-appropriate interests for a specific age group
 */
export function getAgeAppropriateInterests(ageGroup: string): {value: string; label: string}[] {
  // Define interests appropriate for all age ranges
  const ALL_INTERESTS = [
    // Infant interests (0-1)
    { value: "music", label: "Music & Sounds", ageGroups: ["0-1", "1-2", "2-3", "3-4", "4-5", "5-6"] },
    { value: "visual", label: "Visual Stimulation", ageGroups: ["0-1", "1-2"] },
    { value: "touch", label: "Tactile Exploration", ageGroups: ["0-1", "1-2", "2-3"] },
    
    // Toddler interests (1-3)
    { value: "movement", label: "Movement & Motion", ageGroups: ["0-1", "1-2", "2-3", "3-4"] },
    { value: "objects", label: "Object Permanence", ageGroups: ["0-1", "1-2"] },
    { value: "stacking", label: "Stacking & Nesting", ageGroups: ["1-2", "2-3"] },
    { value: "water", label: "Water Play", ageGroups: ["1-2", "2-3", "3-4", "4-5"] },
    { value: "practical_life", label: "Practical Life Activities", ageGroups: ["1-2", "2-3", "3-4", "4-5", "5-6"] },
    
    // Preschool interests (3-6)
    { value: "art", label: "Art & Creating", ageGroups: ["2-3", "3-4", "4-5", "5-6"] },
    { value: "nature", label: "Nature & Animals", ageGroups: ["1-2", "2-3", "3-4", "4-5", "5-6"] },
    { value: "numbers", label: "Numbers & Counting", ageGroups: ["2-3", "3-4", "4-5", "5-6"] },
    { value: "letters", label: "Letters & Words", ageGroups: ["2-3", "3-4", "4-5", "5-6"] },
    { value: "building", label: "Building & Construction", ageGroups: ["1-2", "2-3", "3-4", "4-5", "5-6"] },
    { value: "pretend", label: "Pretend Play", ageGroups: ["2-3", "3-4", "4-5", "5-6"] },
    { value: "sensory", label: "Sensory Exploration", ageGroups: ["0-1", "1-2", "2-3", "3-4", "4-5"] }
  ];
  
  // Filter interests based on the provided age group
  return ALL_INTERESTS
    .filter(interest => interest.ageGroups.includes(ageGroup))
    .map(({ value, label }) => ({ value, label }));
} 