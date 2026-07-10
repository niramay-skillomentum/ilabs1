import React, { ButtonHTMLAttributes } from 'react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'icon';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  children: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'primary', size = 'md', children, ...props }, ref) => {
    
    const baseStyles = 'inline-flex items-center justify-center rounded-lg transition-all duration-200 text-btn focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary disabled:opacity-50 disabled:pointer-events-none';
    
    const variants = {
      primary: 'bg-[var(--color-secondary)] text-[var(--color-primary)] hover:-translate-y-0.5 shadow-sm hover:shadow-soft active:translate-y-0',
      secondary: 'bg-white border border-[var(--color-border)] text-[var(--color-primary)] hover:bg-slate-50 hover:-translate-y-0.5 hover:shadow-soft active:translate-y-0',
      ghost: 'text-[var(--color-text-secondary)] hover:bg-slate-100 hover:text-[var(--color-primary)]',
      icon: 'rounded-full hover:bg-slate-100 hover:text-[var(--color-primary)]',
    };

    const sizes = {
      sm: 'h-8 px-3 text-sm',
      md: 'h-10 px-4 py-2',
      lg: 'h-12 px-8',
      icon: 'h-10 w-10',
    };

    const classes = `${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`;

    return (
      <button ref={ref} className={classes} {...props}>
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
