import React, { InputHTMLAttributes } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', icon, ...props }, ref) => {
    
    return (
      <div className="relative">
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[var(--color-text-muted)]">
            {icon}
          </div>
        )}
        <input
          ref={ref}
          className={`block w-full rounded-[14px] border border-[var(--color-border)] bg-white px-4 py-2 text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] shadow-sm focus:border-[var(--color-secondary)] focus:ring focus:ring-[var(--color-secondary)] focus:ring-opacity-50 transition-all duration-200 ${icon ? 'pl-10' : ''} ${className}`}
          {...props}
        />
      </div>
    );
  }
);

Input.displayName = 'Input';
