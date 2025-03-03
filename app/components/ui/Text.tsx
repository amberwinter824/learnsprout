import React from 'react';

interface TextProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'muted';
  as?: 'p' | 'span' | 'div' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  className?: string;
}

export default function Text({
  children,
  variant = 'primary',
  as: Component = 'p',
  className = '',
}: TextProps) {
  const variantClasses = {
    primary: 'text-primary',
    secondary: 'text-secondary',
    muted: 'text-muted',
  };

  return (
    <Component className={`${variantClasses[variant]} ${className}`}>
      {children}
    </Component>
  );
}