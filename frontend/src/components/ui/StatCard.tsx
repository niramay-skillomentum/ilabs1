import React from 'react';

export interface StatCardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  accentColor?: 'blue' | 'purple' | 'green' | 'amber' | 'cyan';
  trend?: {
    value: string;
    isPositive: boolean;
  };
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  icon,
  accentColor = 'blue',
  trend,
}) => {
  const accentColors = {
    blue: 'bg-blue-50 text-blue-600',
    purple: 'bg-purple-50 text-purple-600',
    green: 'bg-green-50 text-green-600',
    amber: 'bg-amber-50 text-amber-600',
    cyan: 'bg-cyan-50 text-cyan-600',
  };

  return (
    <div className="bg-[var(--color-card)] rounded-[20px] p-6 border border-[var(--color-border)] shadow-sm hover:-translate-y-1 hover:shadow-float transition-all duration-300">
      <div className="flex items-start justify-between mb-4">
        <h3 className="text-caption text-[var(--color-text-secondary)] uppercase tracking-wider">{label}</h3>
        {icon && (
          <div className={`p-2 rounded-lg ${accentColors[accentColor]}`}>
            {icon}
          </div>
        )}
      </div>
      <div className="flex items-baseline gap-3">
        <div className="text-[36px] font-bold text-[var(--color-text-primary)]">{value}</div>
        {trend && (
          <span className={`text-sm font-medium ${trend.isPositive ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'}`}>
            {trend.isPositive ? '+' : '-'}{trend.value}
          </span>
        )}
      </div>
    </div>
  );
};
