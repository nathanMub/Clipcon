import React from 'react';
import { Menu, Plus } from 'lucide-react';
import { NavRoute } from '../../types/video';

interface TopBarProps {
  activeRoute: NavRoute;
  onOpenMobileMenu: () => void;
  onNewClipClick: () => void;
}

const ROUTE_TITLES: Record<NavRoute, string> = {
  home: 'Home',
  dashboard: 'Dashboard',
  'create-clips': 'Create Clips',
  projects: 'My Projects',
  clips: 'My Clips',
  settings: 'Settings',
};

export const TopBar: React.FC<TopBarProps> = ({
  activeRoute,
  onOpenMobileMenu,
  onNewClipClick,
}) => {
  const currentTitle = ROUTE_TITLES[activeRoute];

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-4 border-b border-white/[0.08] bg-[#080A09]/95 px-4 sm:px-6 lg:px-8 backdrop-blur-sm">
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          aria-label="Open navigation menu"
          className="lg:hidden flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] bg-[#0E1110] text-[#94A39B] hover:text-[#F8FAFC] transition-colors"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2 text-sm min-w-0">
          <span className="hidden sm:inline text-[#94A39B] whitespace-nowrap">ClipCon</span>
          <span className="hidden sm:inline text-[#94A39B]/50" aria-hidden="true">/</span>
          <span className="font-medium text-[#F8FAFC] truncate">{currentTitle}</span>
        </div>
      </div>

      {activeRoute !== 'create-clips' && (
        <button
          type="button"
          onClick={onNewClipClick}
          className="inline-flex items-center gap-2 rounded-lg bg-[#2CE66D] px-4 py-2 min-h-[40px] text-sm font-semibold text-[#06130B] hover:bg-[#22C55E] transition-colors duration-150 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2CE66D] focus-visible:ring-offset-2 focus-visible:ring-offset-[#080A09]"
        >
          <Plus className="h-4 w-4 shrink-0" />
          <span>Create Clips</span>
        </button>
      )}
    </header>
  );
};
