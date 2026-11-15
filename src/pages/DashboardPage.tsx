import React from 'react';
import { ArrowRight, FolderKanban } from 'lucide-react';
import { EmptyState } from '../components/ui/EmptyState';
import { StatCard } from '../components/ui/StatCard';
import { ProjectCard } from '../components/video/ProjectCard';
import { VideoDropzone } from '../components/video/VideoDropzone';
import { NavRoute, VideoProject } from '../types/video';

interface DashboardPageProps {
  projects: VideoProject[];
  clipsCount: number;
  onNavigate: (route: NavRoute) => void;
  onVideoSelected: (file: File, extension: 'MP4' | 'MOV' | 'WebM') => void;
  onOpenProjectPreview: (project: VideoProject) => void;
  onRemoveProject: (projectId: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  projects,
  clipsCount,
  onNavigate,
  onVideoSelected,
  onOpenProjectPreview,
  onRemoveProject,
}) => {
  const processedCount = projects.filter((p) => p.status === 'completed').length;
  const recentProjects = projects.slice(0, 3);

  return (
    <div className="space-y-8">
      {/* Welcome header */}
      <section className="space-y-2.5">
        <h1 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight text-[#2CE66D] text-balance max-w-2xl">
          Turn long videos into engaging clips.
        </h1>
        <p className="max-w-2xl text-sm sm:text-base leading-relaxed text-[#94A39B]">
          Upload long-form podcasts, interviews, or tutorials to prepare vertical
          short-form clips for TikTok, Instagram Reels, and YouTube Shorts.
        </p>
      </section>

      {/* Quick statistics */}
      <section aria-label="Workspace statistics" className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Total Projects"
          value={projects.length}
          helper={projects.length === 0 ? 'No videos staged yet' : 'Staged in workspace'}
        />
        <StatCard
          label="Clips Created"
          value={clipsCount}
          helper={clipsCount === 0 ? 'Generated clips appear here' : 'Ready to export'}
        />
        <StatCard
          label="Videos Processed"
          value={processedCount}
          helper="AI pipeline connects in next stage"
        />
      </section>

      {/* Primary upload dropzone */}
      <section aria-label="Quick video upload">
        <VideoDropzone
          onFileAccepted={onVideoSelected}
          heading="Upload a long-form video to get started"
          description="Drag and drop an MP4, MOV, or WebM file, or browse from your device to preview and configure clip settings."
          buttonLabel="Upload Video"
        />
      </section>

      {/* Recent projects */}
      <section aria-label="Recent projects" className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-display text-lg font-semibold text-[#F8FAFC]">
            Recent Projects
          </h2>
          {projects.length > 0 && (
            <button
              type="button"
              onClick={() => onNavigate('projects')}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-[#2CE66D] hover:text-[#22C55E] transition-colors whitespace-nowrap shrink-0"
            >
              <span>View all</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>

        {recentProjects.length === 0 ? (
          <EmptyState
            icon={FolderKanban}
            title="No recent projects yet"
            description="Once you upload a video and configure your clip preferences, your projects will appear here for quick access."
            actionLabel="Go to Create Clips"
            onAction={() => onNavigate('create-clips')}
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {recentProjects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onOpenPreview={onOpenProjectPreview}
                onRemove={onRemoveProject}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
