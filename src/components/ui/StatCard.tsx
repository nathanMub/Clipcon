import React from 'react';

interface StatCardProps {
  label: string;
  value: number;
  helper: string;
}

export const StatCard: React.FC<StatCardProps> = ({ label, value, helper }) => {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#141816] p-5">
      <p className="text-sm font-medium text-[#94A39B]">{label}</p>
      <p className="mt-2 font-display text-3xl font-semibold tracking-tight text-[#F8FAFC] tabular-nums">
        {value}
      </p>
      <p className="mt-1.5 text-xs text-[#94A39B]">{helper}</p>
    </div>
  );
};
