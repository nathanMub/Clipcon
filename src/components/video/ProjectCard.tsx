import React from 'react';
import { Clock, Film, Play, Trash2 } from 'lucide-react';
import { ProjectStatus, VideoProject } from '../../types/video';
import {
  formatDuration,
  formatFileSize,
  formatShortDate,
} from '../../utils/formatters';

interface ProjectCardProps {
  project: VideoProject;
  onOpenPreview: (project: VideoProject) => void;
  onRemove: (projectId: string) => void;
}

const STATUS_META: Record<ProjectStatus, { label: string; colorClass: string }> = {
  staged: {
    label: 'Awaiting AI Setup',
    colorClass: 'text-amber-300',
  },
  queued: {
    label: 'Queued',
    colorClass: 'text-[#2CE66D]',
  },
  processing: {
    label: 'Processing',
    colorClass: 'text-sky-300',
  },
  completed: {
    label: 'Ready',
    colorClass: 'text-[#2CE66D]',
  },
};

export const ProjectCard: React.FC<ProjectCardProps> = ({
  project,
  onOpenPreview,
  onRemove,
}) => {
  const statusInfo = STATUS_META[project.status];

  return (
    <article className="flex flex-col overflow-hidden rounded-xl border border-white/[0.08] bg-[#141816] transition-colors hover:border-white/[0.16]">
      {/* Thumbnail area */}
      <div className="relative aspect-video w-full bg-[#0E1110] border-b border-white/[0.07] overflow-hidden">
        {project.thumbnailDataUrl ? (
          <img
            src={project.thumbnailDataUrl}
            alt={`${project.name} video frame`}
            referrerPolicy="no-referrer"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-[#94A39B]">
            <Film className="h-7 w-7" />
            <span className="text-xs">{project.format} Video</span>
          </div>
        )}

        {project.durationSeconds !== undefined && (
          <span className="absolute bottom-2.5 right-2.5 rounded bg-black/85 px-2 py-0.5 font-mono text-xs tabular-nums text-[#F8FAFC]">
            {formatDuration(project.durationSeconds)}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-display text-base font-semibold text-[#F8FAFC] truncate">
            {project.name}
          </h3>
        </div>

        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#94A39B]">
          <span>{formatShortDate(project.createdAt)}</span>
          <span aria-hidden="true">·</span>
          <span className="font-mono tabular-nums">
            {formatFileSize(project.fileSizeBytes)}
          </span>
          <span aria-hidden="true">·</span>
          <span>{project.settings.aspectRatio}</span>
        </div>

        <div className="mt-3 flex items-center gap-1.5 text-xs font-medium">
          <Clock className={`h-3.5 w-3.5 shrink-0 ${statusInfo.colorClass}`} />
          <span className={statusInfo.colorClass}>{statusInfo.label}</span>
        </div>

        <div className="mt-5 flex items-center justify-between gap-2 pt-4 border-t border-white/[0.07]">
          <button
            type="button"
            onClick={() => onOpenPreview(project)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.1] bg-[#0E1110] px-3.5 py-2 min-h-[38px] text-xs font-medium text-[#F8FAFC] hover:bg-white/[0.06] transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2CE66D]"
          >
            <Play className="h-3.5 w-3.5 shrink-0" />
            <span>Open in Studio</span>
          </button>

          <button
            type="button"
            onClick={() => onRemove(project.id)}
            aria-label={`Remove ${project.name}`}
            className="inline-flex h-[38px] w-[38px] items-center justify-center rounded-lg text-[#94A39B] hover:bg-red-500/10 hover:text-red-300 transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2CE66D]"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </article>
  );
};
