import React from 'react';

export interface SectionHeaderProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  breadcrumbs?: React.ReactNode;
  primaryAction?: React.ReactNode;
  secondaryAction?: React.ReactNode;
  isPageTitle?: boolean;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  description,
  breadcrumbs,
  primaryAction,
  secondaryAction,
  isPageTitle = false,
}) => {
  return (
    <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-8 w-full">
      <div className="flex-1 max-w-2xl">
        {breadcrumbs && <div className="mb-4 text-sm text-[var(--color-text-muted)]">{breadcrumbs}</div>}
        <h1 className={`${isPageTitle ? 'text-page-title' : 'text-section-title'} text-[var(--color-text-primary)] mb-2`}>
          {title}
        </h1>
        {description && (
          <p className="text-body text-[var(--color-text-secondary)] leading-relaxed">
            {description}
          </p>
        )}
      </div>
      {(primaryAction || secondaryAction) && (
        <div className="flex items-center gap-3 mt-2 md:mt-0">
          {secondaryAction}
          {primaryAction}
        </div>
      )}
    </div>
  );
};
