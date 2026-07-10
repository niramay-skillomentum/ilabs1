import React from 'react';
import { Button } from './Button';

export interface EmptyStateProps {
  title: string;
  description: string;
  illustration?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  illustration,
  actionLabel,
  onAction,
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center max-w-md mx-auto">
      {illustration && (
        <div className="mb-6 text-[var(--color-text-muted)]">
          {illustration}
        </div>
      )}
      <h3 className="text-card-title text-[var(--color-text-primary)] mb-2">{title}</h3>
      <p className="text-body text-[var(--color-text-secondary)] mb-8">{description}</p>
      
      {actionLabel && onAction && (
        <Button variant="primary" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
};
