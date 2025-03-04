'use client';

import { useEffect } from 'react';

export default function GlobalStyles() {
  useEffect(() => {
    // Apply global CSS changes that can't be done with Tailwind
    const style = document.createElement('style');
    style.innerHTML = `
      /* Override default text colors */
      body {
        color: var(--text-primary);
      }
      
      /* Target common text elements */
      p, span, div, li {
        color: var(--text-primary);
      }
      
      /* Override specific Tailwind text classes */
      .text-gray-500, .text-gray-600, .text-gray-700, .text-gray-400, .text-gray-300 {
        color: var(--text-secondary) !important;
      }
      
      /* Form elements */
      input, select, textarea {
        color: var(--text-primary) !important;
      }
      
      /* Form labels */
      label {
        color: var(--text-primary) !important;
      }
      
      /* Placeholder text */
      ::placeholder {
        color: var(--text-muted) !important;
        opacity: 1 !important;
      }
      
      /* Subheadings */
      h3, h4, h5, h6, .subheading {
        color: var(--text-primary) !important;
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);
  
  return null;
}