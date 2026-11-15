import React from 'react';

interface EmptyStateProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryLabel?: string;
  onSecondaryAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryLabel,
  onSecondaryAction,
}) => {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-white/[0.08] bg-[#141816] px-6 py-14 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/[0.08] bg-[#0E1110] text-[#94A39B]">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="mt-4 font-display text-base font-semibold text-[#F8FAFC]">
        {title}
      </h3>
      <p className="mt-1.5 max-w-md text-sm leading-relaxed text-[#94A39B]">
        {description}
      </p>

      {(actionLabel || secondaryLabel) && (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {actionLabel && onAction && (
            <button
              type="button"
              onClick={onAction}
              className="inline-flex items-center justify-center rounded-lg bg-[#2CE66D] px-4 py-2.5 min-h-[42px] text-sm font-semibold text-[#06130B] hover:bg-[#22C55E] transition-colors duration-150 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2CE66D]"
            >
              {actionLabel}
            </button>
          )}
          {secondaryLabel && onSecondaryAction && (
            <button
              type="button"
              onClick={onSecondaryAction}
              className="inline-flex items-center justify-center rounded-lg border border-white/[0.1] bg-[#0E1110] px-4 py-2.5 min-h-[42px] text-sm font-medium text-[#F8FAFC] hover:bg-white/[0.06] transition-colors duration-150 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2CE66D]"
            >
              {secondaryLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
};
