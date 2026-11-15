import React from 'react';
import { LogIn } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { GuestSessionState, NavRoute } from '../../types/video';

interface GuestCreatorHeaderProps {
  guestSession: GuestSessionState | null;
  onNavigate: (route: NavRoute) => void;
}

export const GuestCreatorHeader: React.FC<GuestCreatorHeaderProps> = ({
  guestSession,
  onNavigate,
}) => {
  const { signInWithGoogle } = useAuth();

  const runsRemaining = guestSession
    ? Math.max(
        0,
        guestSession.limits.maxProcessRuns - guestSession.usage.processRunsUsed,
      )
    : null;

  return (
    <header className="sticky top-0 z-20 border-b border-white/[0.08] bg-[#080A09]/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-8 px-4 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={() => onNavigate('home')}
          className="flex items-center gap-2.5 text-left whitespace-nowrap shrink-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2CE66D]"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#2CE66D]/12 border border-[#2CE66D]/30 text-[#2CE66D]">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="h-4 w-4"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M5 13l4 4L19 7" />
              <rect x="3" y="4" width="18" height="16" rx="2" className="opacity-40" />
            </svg>
          </span>
          <span className="font-display text-[17px] font-semibold tracking-tight text-[#F8FAFC] whitespace-nowrap shrink-0">
            ClipCon
          </span>
        </button>

        <nav
          aria-label="Guest creator navigation"
          className="hidden sm:flex items-center gap-6 text-sm font-medium text-[#94A39B]"
        >
          <button
            type="button"
            onClick={() => onNavigate('home')}
            className="hover:text-[#F8FAFC] transition-colors whitespace-nowrap shrink-0"
          >
            Home
          </button>
          <button
            type="button"
            onClick={() => onNavigate('create-clips')}
            className="text-[#F8FAFC] whitespace-nowrap shrink-0"
          >
            Create Clips
          </button>
          {runsRemaining !== null && (
            <span className="font-mono text-xs tabular-nums text-[#94A39B] whitespace-nowrap shrink-0">
              {runsRemaining}/{guestSession?.limits.maxProcessRuns} guest runs left
            </span>
          )}
        </nav>

        <button
          type="button"
          onClick={() => void signInWithGoogle()}
          className="inline-flex items-center gap-2 rounded-lg border border-white/[0.12] bg-[#141816] px-4 py-2 min-h-[40px] text-xs font-semibold text-[#F8FAFC] hover:bg-white/[0.06] transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2CE66D]"
        >
          <LogIn className="h-3.5 w-3.5 text-[#2CE66D] shrink-0" />
          <span>Sign in with Google</span>
        </button>
      </div>
    </header>
  );
};
