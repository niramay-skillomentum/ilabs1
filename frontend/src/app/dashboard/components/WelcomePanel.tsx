import React from 'react';
import { Card } from '../../../components/ui/Card';
import { SectionHeader } from '../../../components/ui/SectionHeader';

export const WelcomePanel = () => {
  return (
    <Card accentColor="blue" className="mb-8">
      <SectionHeader 
        title="Post Trade Operations"
        description="Operations Analyst Dashboard"
        isPageTitle={true}
      />
      <div className="text-body text-[var(--color-text-secondary)] leading-relaxed space-y-2 max-w-3xl">
        <p>
          Every trade executed by traders must pass through Operations before reaching settlement.
        </p>
        <p>
          Your responsibility is to validate, investigate, communicate and ensure trades successfully complete the post-trade lifecycle.
        </p>
      </div>
    </Card>
  );
};
