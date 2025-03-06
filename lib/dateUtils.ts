// lib/dateUtils.ts

/**
 * Format a birthdate string (YYYY-MM-DD) for display, avoiding timezone issues
 * @param dateStr The date string in YYYY-MM-DD format
 * @returns Formatted date string (e.g., "January 15, 2020")
 */
export function formatBirthDateString(dateStr: string): string {
    if (!dateStr) return '';
    
    try {
      // Extract date parts from the string (which is in YYYY-MM-DD format)
      const parts = dateStr.split('-');
      if (parts.length !== 3) return 'Invalid date';
      
      // Create a date object in the local timezone
      // Month is 0-indexed in JavaScript Date, so subtract 1
      const dateObj = new Date(
        parseInt(parts[0], 10),
        parseInt(parts[1], 10) - 1,
        parseInt(parts[2], 10)
      );
      
      // Format the date
      return dateObj.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      console.error('Error formatting birth date:', error);
      return 'Invalid date';
    }
  }
  
  /**
   * Get display date from either birthDateString or legacy birthDate
   * @param child The child data object
   * @returns Formatted date string
   */
  export function getDisplayBirthDate(child: any): string {
    // Try birthDateString first (new format)
    if (child.birthDateString) {
      return formatBirthDateString(child.birthDateString);
    }
    
    // Fall back to legacy birthDate
    if (child.birthDate) {
      try {
        if (typeof child.birthDate === 'string') {
          return formatBirthDateString(child.birthDate);
        }
        
        // Handle Timestamp
        const date = child.birthDate.toDate 
          ? child.birthDate.toDate() 
          : new Date(child.birthDate);
          
        return date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      } catch (error) {
        console.error('Error formatting legacy birth date:', error);
        return 'Invalid date';
      }
    }
    
    return '';
  }