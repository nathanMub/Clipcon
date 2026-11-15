import React, { useMemo, useState } from 'react';
import { FolderKanban, Search } from 'lucide-react';
import { EmptyState } from '../components/ui/EmptyState';
import { ProjectCard } from '../components/video/ProjectCard';
import { NavRoute, ProjectStatus, VideoProject } from '../types/video';

interface MyProjectsPageProps {
  projects: VideoProject[];
  onNavigate: (route: NavRoute) => void;
  onOpenProjectPreview: (project: VideoProject) => void;
  onRemoveProject: (projectId: string) => void;
}

type StatusFilter = 'all' | ProjectStatus;

const FILTER_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'staged', label: 'Awaiting AI' },
  { value: 'queued', label: 'Queued' },
  { value: 'processing', label: 'Processing' },
  { value: 'completed', label: 'Completed' },
];

export const MyProjectsPage: React.FC<MyProjectsPageProps> = ({
  projects,
  onNavigate,
  onOpenProjectPreview,
  onRemoveProject,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const filteredProjects = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return projects.filter((project) => {
      const matchesStatus =
        statusFilter === 'all' || project.status === statusFilter;
      const matchesQuery =
        !query ||
        project.name.toLowerCase().includes(query) ||
        project.fileName.toLowerCase().includes(query);
      return matchesStatus && matchesQuery;
    });
  }, [projects, searchQuery, statusFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="font-display text-2xl font-semibold tracking-tight text-[#F8FAFC]">
            My Projects
          </h1>
          <p className="text-sm text-[#94A39B]">
            Manage uploaded source videos and inspect processing status.
          </p>
        </div>
        <p className="font-mono text-xs tabular-nums text-[#94A39B]">
          {projects.length} {projects.length === 1 ? 'project' : 'projects'}
        </p>
      </div>

      {/* Search & Status Filter Toolbar */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A39B]"
            aria-hidden="true"
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search projects by name or filename..."
            aria-label="Search projects"
            className="w-full rounded-lg border border-white/[0.08] bg-[#0E1110] py-2.5 pl-10 pr-4 min-h-[42px] text-sm text-[#F8FAFC] placeholder-[#94A39B] focus:border-[#2CE66D] focus:outline-none focus:ring-1 focus:ring-[#2CE66D]"
          />
        </div>

        <div
          role="group"
          aria-label="Filter projects by status"
          className="flex flex-wrap items-center gap-1 rounded-lg border border-white/[0.08] bg-[#0E1110] p-1"
        >
          {FILTER_OPTIONS.map((option) => {
            const active = statusFilter === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setStatusFilter(option.value)}
                className={`rounded-md px-3 py-1.5 min-h-[34px] text-xs font-medium transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2CE66D] ${
                  active
                    ? 'bg-[#141816] text-[#2CE66D]'
                    : 'text-[#94A39B] hover:text-[#F8FAFC]'
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      {projects.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="No video projects yet"
          description="Upload a long-form video in Create Clips to start your first project. All staged projects and their output settings will appear here."
          actionLabel="Upload First Video"
          onAction={() => onNavigate('create-clips')}
        />
      ) : filteredProjects.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No matching projects"
          description="No projects matched your current search query or status filter."
          actionLabel="Clear Filters"
          onAction={() => {
            setSearchQuery('');
            setStatusFilter('all');
          }}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredProjects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onOpenPreview={onOpenProjectPreview}
              onRemove={onRemoveProject}
            />
          ))}
        </div>
      )}
    </div>
  );
};
