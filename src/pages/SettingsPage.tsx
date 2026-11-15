import React, { useEffect, useState } from 'react';
import { Check, CreditCard, LogIn, LogOut, Sliders, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import {
  AspectRatioOption,
  CaptionStyleOption,
  ClipDurationPreset,
  WorkspacePreferences,
  WorkspaceProfile,
} from '../types/video';

interface SettingsPageProps {
  profile: WorkspaceProfile;
  preferences: WorkspacePreferences;
  onSaveProfile: (profile: WorkspaceProfile) => Promise<void> | void;
  onSavePreferences: (preferences: WorkspacePreferences) => Promise<void> | void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  profile,
  preferences,
  onSaveProfile,
  onSavePreferences,
}) => {
  const { user, signInWithGoogle, signOutUser } = useAuth();
  const [profileForm, setProfileForm] = useState<WorkspaceProfile>(profile);
  const [prefForm, setPrefForm] = useState<WorkspacePreferences>(preferences);
  const [profileSaved, setProfileSaved] = useState(false);
  const [prefsSaved, setPrefsSaved] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPrefs, setSavingPrefs] = useState(false);

  useEffect(() => {
    setProfileForm(profile);
  }, [profile]);

  useEffect(() => {
    setPrefForm(preferences);
  }, [preferences]);

  const handleProfileSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSavingProfile(true);
    try {
      await onSaveProfile(profileForm);
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 2500);
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePreferencesSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSavingPrefs(true);
    try {
      await onSavePreferences(prefForm);
      setPrefsSaved(true);
      setTimeout(() => setPrefsSaved(false), 2500);
    } finally {
      setSavingPrefs(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div className="space-y-1">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-[#F8FAFC]">
          Settings
        </h1>
        <p className="text-sm text-[#94A39B]">
          Configure your workspace profile, default clipping preferences, and billing placeholder.
        </p>
      </div>

      {/* Profile Information */}
      <form
        onSubmit={handleProfileSubmit}
        className="rounded-xl border border-white/[0.08] bg-[#141816] p-6 space-y-5"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-white/[0.07] pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.08] bg-[#0E1110] text-[#2CE66D]">
              <User className="h-4 w-4" />
            </div>
            <div>
              <h2 className="font-display text-base font-semibold text-[#F8FAFC]">
                Profile Information
              </h2>
              <p className="text-xs text-[#94A39B]">
                {user
                  ? `Signed in as ${user.email || user.displayName}`
                  : 'Sign in with Google to save your workspace profile and projects.'}
              </p>
            </div>
          </div>

          {user ? (
            <button
              type="button"
              onClick={() => void signOutUser()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.1] bg-[#0E1110] px-3.5 py-2 min-h-[38px] text-xs font-medium text-[#F8FAFC] hover:bg-white/[0.06] transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2CE66D]"
            >
              <LogOut className="h-3.5 w-3.5 shrink-0" />
              <span>Sign Out</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void signInWithGoogle()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#2CE66D] px-3.5 py-2 min-h-[38px] text-xs font-semibold text-[#06130B] hover:bg-[#22C55E] transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2CE66D]"
            >
              <LogIn className="h-3.5 w-3.5 shrink-0" />
              <span>Sign in with Google</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="display-name" className="block text-xs font-medium text-[#F8FAFC]">
              Display Name
            </label>
            <input
              id="display-name"
              type="text"
              value={profileForm.displayName}
              onChange={(e) =>
                setProfileForm({ ...profileForm, displayName: e.target.value })
              }
              className="w-full rounded-lg border border-white/[0.1] bg-[#0E1110] px-3.5 py-2.5 min-h-[42px] text-sm text-[#F8FAFC] focus:border-[#2CE66D] focus:outline-none focus:ring-1 focus:ring-[#2CE66D]"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="profile-email" className="block text-xs font-medium text-[#F8FAFC]">
              Contact Email
            </label>
            <input
              id="profile-email"
              type="email"
              value={profileForm.email}
              onChange={(e) =>
                setProfileForm({ ...profileForm, email: e.target.value })
              }
              placeholder="creator@example.com"
              className="w-full rounded-lg border border-white/[0.1] bg-[#0E1110] px-3.5 py-2.5 min-h-[42px] text-sm text-[#F8FAFC] placeholder-[#94A39B]/60 focus:border-[#2CE66D] focus:outline-none focus:ring-1 focus:ring-[#2CE66D]"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="workspace-name" className="block text-xs font-medium text-[#F8FAFC]">
              Workspace Name
            </label>
            <input
              id="workspace-name"
              type="text"
              value={profileForm.workspaceName}
              onChange={(e) =>
                setProfileForm({ ...profileForm, workspaceName: e.target.value })
              }
              className="w-full rounded-lg border border-white/[0.1] bg-[#0E1110] px-3.5 py-2.5 min-h-[42px] text-sm text-[#F8FAFC] focus:border-[#2CE66D] focus:outline-none focus:ring-1 focus:ring-[#2CE66D]"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="creator-focus" className="block text-xs font-medium text-[#F8FAFC]">
              Primary Content Focus
            </label>
            <input
              id="creator-focus"
              type="text"
              value={profileForm.creatorFocus}
              onChange={(e) =>
                setProfileForm({ ...profileForm, creatorFocus: e.target.value })
              }
              placeholder="Podcasts, Tutorials, Gaming..."
              className="w-full rounded-lg border border-white/[0.1] bg-[#0E1110] px-3.5 py-2.5 min-h-[42px] text-sm text-[#F8FAFC] placeholder-[#94A39B]/60 focus:border-[#2CE66D] focus:outline-none focus:ring-1 focus:ring-[#2CE66D]"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          {profileSaved && (
            <span className="inline-flex items-center gap-1.5 text-xs text-[#2CE66D]">
              <Check className="h-3.5 w-3.5" />
              Profile updated
            </span>
          )}
          <button
            type="submit"
            disabled={savingProfile}
            className="rounded-lg bg-[#2CE66D] px-4 py-2.5 min-h-[42px] text-sm font-semibold text-[#06130B] hover:bg-[#22C55E] disabled:opacity-50 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2CE66D]"
          >
            {savingProfile ? 'Saving...' : 'Save Profile'}
          </button>
        </div>
      </form>

      {/* Account Preferences */}
      <form
        onSubmit={handlePreferencesSubmit}
        className="rounded-xl border border-white/[0.08] bg-[#141816] p-6 space-y-5"
      >
        <div className="flex items-center gap-3 border-b border-white/[0.07] pb-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.08] bg-[#0E1110] text-[#2CE66D]">
            <Sliders className="h-4 w-4" />
          </div>
          <div>
            <h2 className="font-display text-base font-semibold text-[#F8FAFC]">
              Account Preferences
            </h2>
            <p className="text-xs text-[#94A39B]">
              Default presets applied when opening Create Clips.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <label htmlFor="pref-aspect" className="block text-xs font-medium text-[#F8FAFC]">
              Default Aspect Ratio
            </label>
            <select
              id="pref-aspect"
              value={prefForm.defaultAspectRatio}
              onChange={(e) =>
                setPrefForm({
                  ...prefForm,
                  defaultAspectRatio: e.target.value as AspectRatioOption,
                })
              }
              className="w-full rounded-lg border border-white/[0.1] bg-[#0E1110] px-3 py-2.5 min-h-[42px] text-sm text-[#F8FAFC] focus:border-[#2CE66D] focus:outline-none focus:ring-1 focus:ring-[#2CE66D]"
            >
              <option value="9:16">9:16 Vertical</option>
              <option value="1:1">1:1 Square</option>
              <option value="16:9">16:9 Wide</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="pref-duration" className="block text-xs font-medium text-[#F8FAFC]">
              Default Clip Length
            </label>
            <select
              id="pref-duration"
              value={prefForm.defaultDuration}
              onChange={(e) =>
                setPrefForm({
                  ...prefForm,
                  defaultDuration: e.target.value as ClipDurationPreset,
                })
              }
              className="w-full rounded-lg border border-white/[0.1] bg-[#0E1110] px-3 py-2.5 min-h-[42px] text-sm text-[#F8FAFC] focus:border-[#2CE66D] focus:outline-none focus:ring-1 focus:ring-[#2CE66D]"
            >
              <option value="auto">Auto (AI)</option>
              <option value="15-30">15–30 seconds</option>
              <option value="30-60">30–60 seconds</option>
              <option value="60-90">60–90 seconds</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="pref-caption" className="block text-xs font-medium text-[#F8FAFC]">
              Default Caption Style
            </label>
            <select
              id="pref-caption"
              value={prefForm.defaultCaptionStyle}
              onChange={(e) =>
                setPrefForm({
                  ...prefForm,
                  defaultCaptionStyle: e.target.value as CaptionStyleOption,
                })
              }
              className="w-full rounded-lg border border-white/[0.1] bg-[#0E1110] px-3 py-2.5 min-h-[42px] text-sm text-[#F8FAFC] focus:border-[#2CE66D] focus:outline-none focus:ring-1 focus:ring-[#2CE66D]"
            >
              <option value="bold-dynamic">Bold Dynamic</option>
              <option value="minimal-clean">Minimal Clean</option>
              <option value="karaoke-highlight">Word Highlight</option>
              <option value="none">No Captions</option>
            </select>
          </div>
        </div>

        <div className="space-y-3 pt-1">
          <label className="flex items-center justify-between gap-4 rounded-lg border border-white/[0.07] bg-[#0E1110] px-4 py-3 cursor-pointer">
            <div>
              <p className="text-sm font-medium text-[#F8FAFC]">
                Auto-enable captions on new uploads
              </p>
              <p className="text-xs text-[#94A39B]">
                Pre-selects caption styling when transcription is available.
              </p>
            </div>
            <input
              type="checkbox"
              checked={prefForm.autoIncludeCaptions}
              onChange={(e) =>
                setPrefForm({
                  ...prefForm,
                  autoIncludeCaptions: e.target.checked,
                })
              }
              className="h-4 w-4 accent-[#2CE66D] rounded"
            />
          </label>

          <label className="flex items-center justify-between gap-4 rounded-lg border border-white/[0.07] bg-[#0E1110] px-4 py-3 cursor-pointer">
            <div>
              <p className="text-sm font-medium text-[#F8FAFC]">
                Email notification when clip jobs finish
              </p>
              <p className="text-xs text-[#94A39B]">
                Will activate once backend processing queues are connected.
              </p>
            </div>
            <input
              type="checkbox"
              checked={prefForm.emailAlertsOnCompletion}
              onChange={(e) =>
                setPrefForm({
                  ...prefForm,
                  emailAlertsOnCompletion: e.target.checked,
                })
              }
              className="h-4 w-4 accent-[#2CE66D] rounded"
            />
          </label>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          {prefsSaved && (
            <span className="inline-flex items-center gap-1.5 text-xs text-[#2CE66D]">
              <Check className="h-3.5 w-3.5" />
              Preferences saved
            </span>
          )}
          <button
            type="submit"
            disabled={savingPrefs}
            className="rounded-lg border border-white/[0.12] bg-[#0E1110] px-4 py-2.5 min-h-[42px] text-sm font-medium text-[#F8FAFC] hover:bg-white/[0.06] disabled:opacity-50 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2CE66D]"
          >
            {savingPrefs ? 'Saving...' : 'Save Preferences'}
          </button>
        </div>
      </form>

      {/* Subscription Placeholder */}
      <section className="rounded-xl border border-white/[0.08] bg-[#141816] p-6 space-y-4">
        <div className="flex items-center gap-3 border-b border-white/[0.07] pb-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.08] bg-[#0E1110] text-[#2CE66D]">
            <CreditCard className="h-4 w-4" />
          </div>
          <div>
            <h2 className="font-display text-base font-semibold text-[#F8FAFC]">
              Subscription
            </h2>
            <p className="text-xs text-[#94A39B]">
              Billing and render minute quotas placeholder.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-[#F8FAFC]">
              Development Workspace
            </p>
            <p className="text-xs leading-relaxed text-[#94A39B] max-w-md">
              Subscription tiers, usage tracking, and payment checkout are
              currently unassigned while billing integration is pending.
            </p>
          </div>
          <button
            type="button"
            disabled
            className="rounded-lg border border-white/[0.1] bg-[#0E1110] px-4 py-2.5 min-h-[42px] text-xs font-medium text-[#94A39B] cursor-not-allowed whitespace-nowrap shrink-0"
          >
            Billing Not Connected
          </button>
        </div>
      </section>
    </div>
  );
};
