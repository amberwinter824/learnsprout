/**
 * Maps Tailwind gray text classes to our custom theme colors
 * @param {string} className - Original Tailwind class name string
 * @returns {string} - Updated class name string with theme colors
 */
export function applyThemeColors(className = '') {
    if (!className) return '';
    
    // Create a mapping of Tailwind gray classes to our custom theme colors
    const textColorMap = {
      'text-gray-300': 'text-muted',
      'text-gray-400': 'text-muted',
      'text-gray-500': 'text-muted',
      'text-gray-600': 'text-secondary',
      'text-gray-700': 'text-primary',
      'text-gray-800': 'text-primary',
      'text-gray-900': 'text-primary'
    };
    
    // Create a mapping for border colors
    const borderColorMap = {
      'border-gray-300': 'border-gray-400', // Slightly darker border
      'border-gray-200': 'border-gray-300'
    };
    
    // Split the class string into individual classes
    let classNames = className.split(' ');
    
    // Replace each gray class with our theme class
    classNames = classNames.map(cls => {
      // Replace text colors
      if (textColorMap[cls]) {
        return textColorMap[cls];
      }
      
      // Replace border colors
      if (borderColorMap[cls]) {
        return borderColorMap[cls];
      }
      
      return cls;
    });
    
    // Join the classes back into a string
    return classNames.join(' ');
  }
  
  /**
   * Enhanced component props function to apply theme colors to className prop
   * @param {Object} props - Component props
   * @returns {Object} - Props with updated className
   */
  export function withThemeColors(props) {
    if (!props.className) return props;
    
    return {
      ...props,
      className: applyThemeColors(props.className)
    };
  }