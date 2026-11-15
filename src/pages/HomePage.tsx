import React from 'react';
import {
  ArrowRight,
  Clapperboard,
  Download,
  Film,
  LogIn,
  Scissors,
  Sliders,
  Upload,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { NavRoute } from '../types/video';

interface HomePageProps {
  onNavigate: (route: NavRoute) => void;
}

const STEPS = [
  {
    number: '01',
    title: 'Upload',
    description:
      'Drop an MP4, MOV, or WebM video directly into the creator. No account or credit card is required to get started.',
    icon: Upload,
  },
  {
    number: '02',
    title: 'Generate',
    description:
      'Trim your source window, pick 9:16, 1:1, or 16:9 framing and caption presets, and preview AI-selected clips.',
    icon: Scissors,
  },
  {
    number: '03',
    title: 'Download',
    description:
      'Sign in with Google only when you are ready to download rendered MP4 clips or save them to My Clips.',
    icon: Download,
  },
];

export const HomePage: React.FC<HomePageProps> = ({ onNavigate }) => {
  const { user, signInWithGoogle } = useAuth();

  return (
    <div className="min-h-screen bg-[#080A09] text-[#F8FAFC] flex flex-col">
      {/* 3-zone top navigation bar */}
      <header className="sticky top-0 z-30 border-b border-white/[0.08] bg-[#080A09]/95 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-8 px-4 sm:px-6 lg:px-8">
          {/* Zone 1: Brand wordmark */}
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

          {/* Zone 2: Concise single-line nav links */}
          <nav
            aria-label="Homepage navigation"
            className="hidden md:flex items-center gap-7 text-sm font-medium text-[#94A39B]"
          >
            <a
              href="#how-it-works"
              className="hover:text-[#F8FAFC] transition-colors whitespace-nowrap shrink-0"
            >
              How It Works
            </a>
            <a
              href="#product-preview"
              className="hover:text-[#F8FAFC] transition-colors whitespace-nowrap shrink-0"
            >
              Studio Preview
            </a>
            <button
              type="button"
              onClick={() => onNavigate('create-clips')}
              className="hover:text-[#F8FAFC] transition-colors whitespace-nowrap shrink-0"
            >
              Create Clips
            </button>
            {user ? (
              <button
                type="button"
                onClick={() => onNavigate('dashboard')}
                className="hover:text-[#F8FAFC] transition-colors whitespace-nowrap shrink-0"
              >
                Dashboard
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void signInWithGoogle()}
                className="hover:text-[#F8FAFC] transition-colors whitespace-nowrap shrink-0"
              >
                Sign In
              </button>
            )}
          </nav>

          {/* Zone 3: Single primary CTA */}
          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={() => onNavigate('create-clips')}
              className="inline-flex items-center gap-2 rounded-lg bg-[#2CE66D] px-4 py-2 min-h-[40px] text-sm font-semibold text-[#06130B] hover:bg-[#22C55E] transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2CE66D]"
            >
              <span>Try ClipCon Free</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="mx-auto max-w-6xl px-4 pt-16 pb-14 sm:px-6 sm:pt-24 sm:pb-20 lg:px-8">
          <div className="max-w-3xl space-y-6">
            <p className="text-sm font-medium text-[#2CE66D]">
              Short-form video clipping studio
            </p>

            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-[#F8FAFC] text-balance leading-[1.08]">
              Turn long videos into short-form clips.
            </h1>

            <p className="max-w-2xl text-base sm:text-lg leading-relaxed text-[#94A39B]">
              Upload podcasts, interviews, or tutorials to select your window,
              choose vertical framing and caption styles, and preview ready-to-share
              clips for TikTok, Instagram Reels, and YouTube Shorts before signing in.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <button
                type="button"
                onClick={() => onNavigate('create-clips')}
                className="inline-flex items-center gap-2 rounded-lg bg-[#2CE66D] px-6 py-3.5 min-h-[48px] text-sm font-semibold text-[#06130B] hover:bg-[#22C55E] transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2CE66D] focus-visible:ring-offset-2 focus-visible:ring-offset-[#080A09]"
              >
                <span>Try ClipCon Free</span>
                <ArrowRight className="h-4 w-4 shrink-0" />
              </button>

              {user ? (
                <button
                  type="button"
                  onClick={() => onNavigate('dashboard')}
                  className="inline-flex items-center gap-2 rounded-lg border border-white/[0.12] bg-[#141816] px-5 py-3.5 min-h-[48px] text-sm font-medium text-[#F8FAFC] hover:bg-white/[0.06] transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2CE66D]"
                >
                  <span>Open Dashboard</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    void signInWithGoogle().then(() => {
                      onNavigate('dashboard');
                    });
                  }}
                  className="inline-flex items-center gap-2 rounded-lg border border-white/[0.12] bg-[#141816] px-5 py-3.5 min-h-[48px] text-sm font-medium text-[#F8FAFC] hover:bg-white/[0.06] transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2CE66D]"
                >
                  <LogIn className="h-4 w-4 text-[#2CE66D] shrink-0" />
                  <span>Sign in to Workspace</span>
                </button>
              )}
            </div>

            <p className="text-xs text-[#94A39B]">
              No account needed to upload and preview · MP4, MOV, and WebM up to 100 MB
            </p>
          </div>
        </section>

        {/* Three-Step Workflow: Upload, Generate, Download */}
        <section
          id="how-it-works"
          className="border-t border-white/[0.08] bg-[#0E1110]/60 py-16 sm:py-20"
        >
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 space-y-10">
            <div className="max-w-2xl space-y-2">
              <h2 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight text-[#F8FAFC]">
                From long-form recording to vertical clips in three steps
              </h2>
              <p className="text-sm sm:text-base text-[#94A39B]">
                Start directly in the creator as a guest, and sign in only when you want to export or store your clips.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {STEPS.map((step) => {
                const Icon = step.icon;
                return (
                  <article
                    key={step.number}
                    className="rounded-xl border border-white/[0.08] bg-[#141816] p-6 space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-sm font-semibold tabular-nums text-[#2CE66D]">
                        {step.number}
                      </span>
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.08] bg-[#0E1110] text-[#F8FAFC]">
                        <Icon className="h-4 w-4" />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h3 className="font-display text-lg font-semibold text-[#F8FAFC]">
                        {step.title}
                      </h3>
                      <p className="text-sm leading-relaxed text-[#94A39B]">
                        {step.description}
                      </p>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        {/* Product Interface Preview */}
        <section id="product-preview" className="border-t border-white/[0.08] py-16 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 space-y-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="space-y-2 max-w-2xl">
                <h2 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight text-[#F8FAFC]">
                  Built for fast framing and preview
                </h2>
                <p className="text-sm sm:text-base text-[#94A39B]">
                  Scrub your source timeline, adjust aspect ratio and caption style, and inspect generated clips side by side.
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('create-clips')}
                className="inline-flex items-center gap-2 text-sm font-semibold text-[#2CE66D] hover:text-[#22C55E] transition-colors whitespace-nowrap shrink-0"
              >
                <span>Open Create Clips</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>

            {/* Studio Interface Frame */}
            <div className="overflow-hidden rounded-xl border border-white/[0.1] bg-[#0E1110]">
              {/* Frame Top Bar */}
              <div className="flex items-center justify-between border-b border-white/[0.08] bg-[#141816] px-5 py-3.5">
                <div className="flex items-center gap-2.5 text-xs text-[#94A39B]">
                  <Film className="h-4 w-4 text-[#2CE66D]" />
                  <span className="font-medium text-[#F8FAFC]">ClipCon Studio</span>
                  <span aria-hidden="true">·</span>
                  <span>Guest Creator</span>
                </div>
                <span className="font-mono text-xs tabular-nums text-[#94A39B]">
                  9:16 Vertical · Bold Dynamic
                </span>
              </div>

              {/* Frame Body */}
              <div className="grid grid-cols-1 gap-6 p-5 lg:grid-cols-12 lg:p-6">
                {/* Left Preview Column */}
                <div className="lg:col-span-7 space-y-4">
                  <div className="flex aspect-video flex-col items-center justify-center rounded-lg border border-white/[0.08] bg-[#080A09] p-6 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-[#2CE66D]/30 bg-[#2CE66D]/10 text-[#2CE66D]">
                      <Clapperboard className="h-5 w-5" />
                    </div>
                    <p className="mt-3 font-display text-sm font-semibold text-[#F8FAFC]">
                      Source Video Preview &amp; Timeline
                    </p>
                    <p className="mt-1 max-w-sm text-xs text-[#94A39B]">
                      Local playback loads immediately with dual-thumb start and end range selection.
                    </p>
                  </div>

                  {/* Mock Timeline Slider Bar (Architectural Preview) */}
                  <div className="rounded-lg border border-white/[0.08] bg-[#141816] p-4 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-[#F8FAFC]">Source Time Range</span>
                      <span className="font-mono tabular-nums text-[#2CE66D]">
                        00:42 — 02:18
                      </span>
                    </div>
                    <div className="relative h-2 rounded-full bg-[#080A09] border border-white/[0.08]">
                      <div
                        className="absolute inset-y-0 rounded-full bg-[#2CE66D]"
                        style={{ left: '18%', width: '48%' }}
                      />
                    </div>
                  </div>
                </div>

                {/* Right Settings & Output Column */}
                <div className="lg:col-span-5 flex flex-col justify-between gap-4 rounded-lg border border-white/[0.08] bg-[#141816] p-5">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-xs font-medium text-[#F8FAFC]">
                      <Sliders className="h-4 w-4 text-[#2CE66D]" />
                      <span>Output Configuration</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5 text-xs">
                      <div className="rounded-lg border border-[#2CE66D]/50 bg-[#2CE66D]/10 px-3 py-2.5 text-[#F8FAFC]">
                        <span className="block font-medium">9:16 Vertical</span>
                        <span className="text-[11px] text-[#94A39B]">Reels &amp; Shorts</span>
                      </div>
                      <div className="rounded-lg border border-white/[0.08] bg-[#0E1110] px-3 py-2.5 text-[#94A39B]">
                        <span className="block font-medium text-[#F8FAFC]">15–30s</span>
                        <span className="text-[11px]">Target clip length</span>
                      </div>
                    </div>

                    <div className="rounded-lg border border-white/[0.08] bg-[#0E1110] p-3.5 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-[#F8FAFC]">Generated Clips</span>
                        <span className="text-[#94A39B]">Preview free · Sign in to save</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <div className="rounded border border-white/[0.08] bg-[#141816] px-2.5 py-2 text-[11px] text-[#94A39B]">
                          Highlight #1 · 0:24
                        </div>
                        <div className="rounded border border-white/[0.08] bg-[#141816] px-2.5 py-2 text-[11px] text-[#94A39B]">
                          Highlight #2 · 0:29
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onNavigate('create-clips')}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#2CE66D] px-4 py-3 min-h-[44px] text-sm font-semibold text-[#06130B] hover:bg-[#22C55E] transition-colors whitespace-nowrap"
                  >
                    <Scissors className="h-4 w-4 shrink-0" />
                    <span>Try ClipCon Free</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Quiet Footer */}
      <footer className="border-t border-white/[0.08] bg-[#0E1110] py-10">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <div className="space-y-1">
            <span className="font-display text-base font-semibold text-[#F8FAFC]">
              ClipCon
            </span>
            <p className="text-xs text-[#94A39B]">
              Short-form video clipping workspace.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-xs font-medium text-[#94A39B]">
            <button
              type="button"
              onClick={() => onNavigate('create-clips')}
              className="hover:text-[#F8FAFC] transition-colors whitespace-nowrap"
            >
              Create Clips
            </button>
            <button
              type="button"
              onClick={() => onNavigate('dashboard')}
              className="hover:text-[#F8FAFC] transition-colors whitespace-nowrap"
            >
              Dashboard
            </button>
            <button
              type="button"
              onClick={() => onNavigate('projects')}
              className="hover:text-[#F8FAFC] transition-colors whitespace-nowrap"
            >
              My Projects
            </button>
            <button
              type="button"
              onClick={() => onNavigate('clips')}
              className="hover:text-[#F8FAFC] transition-colors whitespace-nowrap"
            >
              My Clips
            </button>
          </div>

          <p className="text-xs text-[#94A39B]">
            &copy; {new Date().getFullYear()} ClipCon
          </p>
        </div>
      </footer>
    </div>
  );
};
