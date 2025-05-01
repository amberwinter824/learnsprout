// lib/ageUtils.js
import { differenceInMonths, differenceInYears } from 'date-fns';

/**
 * Calculate age group based on birthdate
 * @param {Date|Object|string} birthDate - Child's birth date (Date object, Firestore Timestamp, or string)
 * @returns {string} - Age group (e.g., "0-1", "1-2", "2-3", "3-4", etc.)
 */
export function calculateAgeGroup(birthDate) {
  if (!birthDate) return null;
  
  // Handle different date formats
  let birthDateObj;
  
  if (typeof birthDate === 'string') {
    // Handle string format (YYYY-MM-DD)
    birthDateObj = new Date(birthDate + 'T12:00:00'); // Add noon time to avoid timezone issues
  } else if (birthDate instanceof Date) {
    // Handle Date object
    birthDateObj = birthDate;
  } else if (birthDate.toDate) {
    // Handle Firestore Timestamp
    birthDateObj = birthDate.toDate();
  } else {
    return null;
  }
  
  const today = new Date();
  
  // Calculate age in months
  const ageInMonths = differenceInMonths(today, birthDateObj);
  
  // Determine age group
  if (ageInMonths < 12) {
    return "0-1";
  } else if (ageInMonths < 24) {
    return "1-2";
  } else if (ageInMonths < 36) {
    return "2-3";
  } else if (ageInMonths < 48) {
    return "3-4";
  } else if (ageInMonths < 60) {
    return "4-5";
  } else if (ageInMonths < 72) {
    return "5-6";
  } else {
    return "6+"; // For children older than 6
  }
}

/**
 * Calculate a child's age in months
 * @param {Date|Object|string} birthDate - Child's birth date (Date object, Firestore Timestamp, or string)
 * @returns {number} Age in months
 */
export function calculateAgeInMonths(birthDate) {
  if (!birthDate) return 0;
  
  // Handle different date formats
  let birthDateObj;
  
  if (typeof birthDate === 'string') {
    // Handle string format (YYYY-MM-DD)
    birthDateObj = new Date(birthDate + 'T12:00:00'); // Add noon time to avoid timezone issues
  } else if (birthDate instanceof Date) {
    // Handle Date object
    birthDateObj = birthDate;
  } else if (birthDate.toDate) {
    // Handle Firestore Timestamp
    birthDateObj = birthDate.toDate();
  } else {
    return 0;
  }
  
  const today = new Date();
  
  // Calculate full months
  return differenceInMonths(today, birthDateObj);
}

/**
 * Get a human-readable description of an age group
 * @param {string} ageGroup - Age group code (e.g., "0-1")
 * @returns {string} Human-readable description
 */
export function getAgeGroupDescription(ageGroup) {
  const descriptions = {
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
 * Calculate child's age in years and months
 * @param {Date|Object|string} birthDate - Child's birth date (Date object, Firestore Timestamp, or string)
 * @returns {Object} - Object with years and months properties
 */
export function calculateAge(birthDate) {
  if (!birthDate) return { years: 0, months: 0 };
  
  // Handle different date formats
  let birthDateObj;
  
  if (typeof birthDate === 'string') {
    // Handle string format (YYYY-MM-DD)
    birthDateObj = new Date(birthDate + 'T12:00:00'); // Add noon time to avoid timezone issues
  } else if (birthDate instanceof Date) {
    // Handle Date object
    birthDateObj = birthDate;
  } else if (birthDate.toDate) {
    // Handle Firestore Timestamp
    birthDateObj = birthDate.toDate();
  } else {
    return { years: 0, months: 0 };
  }
  
  const today = new Date();
  
  // Calculate full years
  const years = differenceInYears(today, birthDateObj);
  
  // Calculate remaining months
  const yearAnniversary = new Date(birthDateObj);
  yearAnniversary.setFullYear(yearAnniversary.getFullYear() + years);
  const months = differenceInMonths(today, yearAnniversary);
  
  return { years, months };
}

/**
 * Format age for display (e.g., "2 years, 3 months")
 * @param {Date|Object|string} birthDate - Child's birth date (Date object, Firestore Timestamp, or string)
 * @returns {string} Formatted age string
 */
export function formatAge(birthDate) {
  if (!birthDate) return "Unknown age";
  
  const { years, months } = calculateAge(birthDate);
  
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
 * Get a list of all supported age groups
 * @returns {string[]} Array of age groups
 */
export function getAllAgeGroups() {
  return ["0-1", "1-2", "2-3", "3-4", "4-5", "5-6", "6+"];
}

/**
 * Check if birthdate is valid for platform support (0-7 years)
 * @param {Date|Object|string} birthDate - Child's birth date (Date object, Firestore Timestamp, or string)
 * @returns {boolean} True if valid, false if outside supported range
 */
export function isValidBirthdate(birthDate) {
  if (!birthDate) return false;
  
  // Handle different date formats
  let birthDateObj;
  
  if (typeof birthDate === 'string') {
    // Handle string format (YYYY-MM-DD)
    birthDateObj = new Date(birthDate + 'T12:00:00');
  } else if (birthDate instanceof Date) {
    // Handle Date object
    birthDateObj = birthDate;
  } else if (birthDate.toDate) {
    // Handle Firestore Timestamp
    birthDateObj = birthDate.toDate();
  } else {
    return false;
  }
  
  const today = new Date();
  
  // Check if birthdate is in the future
  if (birthDateObj > today) return false;
  
  // Calculate age in years
  const years = differenceInYears(today, birthDateObj);
  
  // Check if age is within supported range (0-7 years)
  return years >= 0 && years <= 7;
}

/**
 * Get age-appropriate interests for a specific age group
 * @param {string} ageGroup - Age group code (e.g., "0-1")
 * @returns {Array} Array of interest options
 */
export function getAgeAppropriateInterests(ageGroup) {
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

  // If no age group is provided, return all interests
  if (!ageGroup) {
    return ALL_INTERESTS;
  }

  // Filter interests based on the age group
  return ALL_INTERESTS.filter(interest => 
    interest.ageGroups.includes(ageGroup)
  );
}