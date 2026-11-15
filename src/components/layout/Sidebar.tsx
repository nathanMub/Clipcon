import React from 'react';
import {
  Clapperboard,
  FolderKanban,
  LayoutDashboard,
  LogIn,
  LogOut,
  Scissors,
  Settings,
  User,
  X,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { NavRoute, WorkspaceProfile } from '../../types/video';

interface SidebarProps {
  activeRoute: NavRoute;
  onNavigate: (route: NavRoute) => void;
  profile: WorkspaceProfile;
  projectsCount: number;
  clipsCount: number;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

interface NavItemConfig {
  id: NavRoute;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  count?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeRoute,
  onNavigate,
  profile,
  projectsCount,
  clipsCount,
  mobileOpen,
  onCloseMobile,
}) => {
  const { user, loading: authLoading, signInWithGoogle, signOutUser } = useAuth();

  const navItems: NavItemConfig[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'create-clips', label: 'Create Clips', icon: Scissors },
    { id: 'projects', label: 'My Projects', icon: FolderKanban, count: projectsCount },
    { id: 'clips', label: 'My Clips', icon: Clapperboard, count: clipsCount },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const handleSelect = (route: NavRoute) => {
    onNavigate(route);
    onCloseMobile();
  };

  const initials = profile.displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

  const sidebarContent = (
    <div className="flex h-full w-64 flex-col bg-[#0E1110] border-r border-white/[0.08]">
      {/* Brand header */}
      <div className="flex h-16 items-center justify-between px-5 border-b border-white/[0.08]">
        <button
          type="button"
          onClick={() => handleSelect('home')}
          className="flex items-center gap-2.5 text-left rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2CE66D]"
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

        <button
          type="button"
          onClick={onCloseMobile}
          aria-label="Close navigation menu"
          className="lg:hidden flex h-9 w-9 items-center justify-center rounded-lg text-[#94A39B] hover:text-[#F8FAFC] hover:bg-white/[0.05] transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Primary navigation */}
      <nav aria-label="Primary navigation" className="flex-1 px-3 py-5 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeRoute === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleSelect(item.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`group flex w-full items-center justify-between rounded-lg px-3 py-2.5 min-h-[42px] text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2CE66D] ${
                isActive
                  ? 'bg-[#2CE66D]/12 text-[#F8FAFC] border border-[#2CE66D]/30'
                  : 'text-[#94A39B] border border-transparent hover:bg-white/[0.04] hover:text-[#F8FAFC]'
              }`}
            >
              <span className="flex items-center gap-3 min-w-0">
                <Icon
                  className={`h-4 w-4 shrink-0 transition-colors ${
                    isActive
                      ? 'text-[#2CE66D]'
                      : 'text-[#94A39B] group-hover:text-[#F8FAFC]'
                  }`}
                />
                <span className="truncate whitespace-nowrap">{item.label}</span>
              </span>

              {typeof item.count === 'number' && (
                <span
                  className={`font-mono text-xs tabular-nums shrink-0 ${
                    isActive ? 'text-[#2CE66D]' : 'text-[#94A39B]'
                  }`}
                >
                  {item.count}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom user profile */}
      <div className="p-3 border-t border-white/[0.08]">
        {authLoading ? (
          <div className="h-[56px] rounded-lg bg-[#141816]/60 animate-pulse" />
        ) : user ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleSelect('settings')}
              className="flex min-w-0 flex-1 items-center gap-3 rounded-lg px-2.5 py-2 text-left hover:bg-white/[0.04] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2CE66D]"
            >
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={profile.displayName || 'Account avatar'}
                  referrerPolicy="no-referrer"
                  className="h-9 w-9 shrink-0 rounded-lg border border-white/[0.08] object-cover"
                />
              ) : (
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#141816] border border-white/[0.08] text-xs font-semibold text-[#F8FAFC]">
                  {initials || <User className="h-4 w-4 text-[#94A39B]" />}
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-[#F8FAFC]">
                  {profile.displayName || user.displayName || 'Workspace'}
                </span>
                <span className="block truncate text-xs text-[#94A39B]">
                  {user.email || profile.workspaceName}
                </span>
              </span>
            </button>

            <button
              type="button"
              onClick={() => void signOutUser()}
              aria-label="Sign out"
              title="Sign out"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[#94A39B] hover:bg-white/[0.06] hover:text-[#F8FAFC] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2CE66D]"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => void signInWithGoogle()}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/[0.12] bg-[#141816] px-3 py-2.5 min-h-[42px] text-sm font-medium text-[#F8FAFC] hover:bg-white/[0.06] transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2CE66D]"
          >
            <LogIn className="h-4 w-4 text-[#2CE66D] shrink-0" />
            <span>Sign in with Google</span>
          </button>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop fixed sidebar */}
      <aside className="hidden lg:block lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:w-64">
        {sidebarContent}
      </aside>

      {/* Mobile slide-over drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation menu">
          <div
            className="fixed inset-0 bg-black/65 backdrop-blur-[2px]"
            onClick={onCloseMobile}
          />
          <div className="fixed inset-y-0 left-0 z-50 w-64 shadow-2xl">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
