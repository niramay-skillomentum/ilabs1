import React, { HTMLAttributes } from 'react';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'pending' | 'active' | 'rejected' | 'draft' | 'applied' | 'interview' | 'offer';
  children: React.ReactNode;
}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className = '', variant = 'draft', children, ...props }, ref) => {
    
    const baseStyles = 'inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider border';
    
    const variants = {
      pending: 'bg-orange-50 text-orange-600 border-orange-200',
      active: 'bg-green-50 text-green-600 border-green-200',
      rejected: 'bg-red-50 text-red-600 border-red-200',
      draft: 'bg-gray-50 text-gray-600 border-gray-200',
      applied: 'bg-blue-50 text-blue-600 border-blue-200',
      interview: 'bg-purple-50 text-purple-600 border-purple-200',
      offer: 'bg-green-50 text-green-700 border-green-300', // Success green for offer
    };

    const classes = `${baseStyles} ${variants[variant]} ${className}`;

    return (
      <span ref={ref} className={classes} {...props}>
        {children}
      </span>
    );
  }
);

Badge.displayName = 'Badge';
