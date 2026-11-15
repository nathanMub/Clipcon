import React, { useState } from 'react';
import { Bookmark, Download, Lock, LogIn, X } from 'lucide-react';
import { PendingSignInAction } from '../../types/video';

interface SignInWallModalProps {
  open: boolean;
  pendingAction: PendingSignInAction | null;
  authError: string | null;
  onConfirmGoogleSignIn: () => Promise<void>;
  onClose: () => void;
}

export const SignInWallModal: React.FC<SignInWallModalProps> = ({
  open,
  pendingAction,
  authError,
  onConfirmGoogleSignIn,
  onClose,
}) => {
  const [signingIn, setSigningIn] = useState(false);

  if (!open) return null;

  const isDownload = pendingAction?.type === 'download';
  const actionLabel = isDownload
    ? `Download "${pendingAction.clipTitle}"`
    : pendingAction?.type === 'save-clip'
      ? `Save "${pendingAction.clipTitle}" to My Clips`
      : 'Save generated clips to My Clips';

  const handleSignIn = async () => {
    if (signingIn) return;
    setSigningIn(true);
    try {
      await onConfirmGoogleSignIn();
    } finally {
      setSigningIn(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="signin-wall-title"
    >
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-xs"
        onClick={onClose}
      />

      <div className="relative z-10 w-full max-w-md rounded-xl border border-white/[0.12] bg-[#141816] p-6 shadow-2xl space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#2CE66D]/30 bg-[#2CE66D]/12 text-[#2CE66D]">
            <Lock className="h-5 w-5" />
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close sign-in dialog"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-[#94A39B] hover:bg-white/[0.06] hover:text-[#F8FAFC] transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-2">
          <h2
            id="signin-wall-title"
            className="font-display text-xl font-semibold text-[#F8FAFC]"
          >
            Sign in to download or save your clips
          </h2>
          <p className="text-sm leading-relaxed text-[#94A39B]">
            A ClipCon account is needed to download rendered MP4 exports or save
            clips to My Clips. Your generated clips and settings will be preserved
            automatically.
          </p>
        </div>

        {pendingAction && (
          <div className="flex items-center gap-2.5 rounded-lg border border-white/[0.08] bg-[#0E1110] px-3.5 py-3 text-xs text-[#F8FAFC]">
            {isDownload ? (
              <Download className="h-4 w-4 shrink-0 text-[#2CE66D]" />
            ) : (
              <Bookmark className="h-4 w-4 shrink-0 text-[#2CE66D]" />
            )}
            <span className="truncate">
              Requested action: <strong className="font-medium">{actionLabel}</strong>
            </span>
          </div>
        )}

        {authError && (
          <div
            role="alert"
            className="rounded-lg border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-xs text-red-200"
          >
            {authError}
          </div>
        )}

        <div className="space-y-2.5 pt-1">
          <button
            type="button"
            disabled={signingIn}
            onClick={() => void handleSignIn()}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#2CE66D] px-4 py-3 min-h-[44px] text-sm font-semibold text-[#06130B] hover:bg-[#22C55E] disabled:opacity-50 transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2CE66D]"
          >
            <LogIn className="h-4 w-4 shrink-0" />
            <span>{signingIn ? 'Opening Google Sign-In...' : 'Continue with Google'}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex w-full items-center justify-center rounded-lg border border-white/[0.1] bg-[#0E1110] px-4 py-2.5 min-h-[40px] text-xs font-medium text-[#94A39B] hover:text-[#F8FAFC] hover:bg-white/[0.05] transition-colors whitespace-nowrap"
          >
            Continue previewing as guest
          </button>
        </div>
      </div>
    </div>
  );
};
