import { type ReactNode } from 'react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {icon && (
        <div className="w-16 h-16 mb-4 rounded-full bg-primary-50 flex items-center justify-center text-primary-400">
          {icon}
        </div>
      )}

      <h3 className="text-lg font-semibold text-neutral-700 mb-1">
        {title}
      </h3>

      {description && (
        <p className="text-sm text-neutral-500 max-w-xs">{description}</p>
      )}

      {action && (
        <button
          onClick={action.onClick}
          className="mt-5 inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-primary-500 text-white text-sm font-medium hover:bg-primary-600 active:bg-primary-700 transition-colors shadow-sage-sm"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
