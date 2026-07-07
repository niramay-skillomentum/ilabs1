import React, { HTMLAttributes } from 'react';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  accentColor?: 'blue' | 'purple' | 'green' | 'cyan' | 'amber' | 'none';
  children: React.ReactNode;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className = '', accentColor = 'none', children, ...props }, ref) => {
    
    const baseStyles = 'bg-[var(--color-card)] rounded-[20px] p-[28px] border border-[var(--color-border)] shadow-sm hover:shadow-float transition-all duration-300 relative overflow-hidden group';
    
    // Top colored accent
    const accentColors = {
      blue: 'bg-blue-500',
      purple: 'bg-purple-500',
      green: 'bg-green-500',
      cyan: 'bg-cyan-500',
      amber: 'bg-amber-500',
      none: 'hidden'
    };

    return (
      <div ref={ref} className={`${baseStyles} ${className}`} {...props}>
        {accentColor !== 'none' && (
          <div className={`absolute top-0 left-0 w-full h-1 ${accentColors[accentColor]} transition-transform duration-300 transform scale-x-100 group-hover:scale-x-105`} />
        )}
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';
