import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';
import { SignInWallModal } from './components/auth/SignInWallModal';
import { GuestCreatorHeader } from './components/layout/GuestCreatorHeader';
import { Sidebar } from './components/layout/Sidebar';
import { TopBar } from './components/layout/TopBar';
import { useAuth } from './contexts/AuthContext';
import { CreateClipsPage } from './pages/CreateClipsPage';
import { DashboardPage } from './pages/DashboardPage';
import { HomePage } from './pages/HomePage';
import { MyClipsPage } from './pages/MyClipsPage';
import { MyProjectsPage } from './pages/MyProjectsPage';
import { SettingsPage } from './pages/SettingsPage';
import {
  AiProcessingError,
  claimGuestClips,
  createRemoteProject,
  deleteRemoteProject,
  downloadAuthenticatedMedia,
  fetchClips,
  fetchGuestSession,
  fetchProjects,
  fetchWorkspaceAccount,
  processGuestVideo,
  saveWorkspacePreferences,
  saveWorkspaceProfile,
  uploadGuestVideo,
} from './services/apiClient';
import { clipPilotPipeline } from './services/pipelinePlaceholder';
import {
  ClipSettings,
  GeneratedClip,
  GuestClipItem,
  GuestSessionState,
  LocalVideoAsset,
  NavRoute,
  PendingSignInAction,
  VideoProject,
  WorkspacePreferences,
  WorkspaceProfile,
} from './types/video';

const INITIAL_PROFILE: WorkspaceProfile = {
  displayName: 'Creator Workspace',
  email: '',
  workspaceName: 'ClipCon Studio',
  creatorFocus: 'Short-form highlights',
};

const INITIAL_PREFERENCES: WorkspacePreferences = {
  defaultAspectRatio: '9:16',
  defaultDuration: 'auto',
  defaultCaptionStyle: 'bold-dynamic',
  autoIncludeCaptions: true,
  emailAlertsOnCompletion: false,
};

function pathToRoute(pathname: string): NavRoute {
  const clean = pathname.replace(/\/+$/, '') || '/';
  switch (clean) {
    case '/':
      return 'home';
    case '/create':
    case '/create-clips':
      return 'create-clips';
    case '/dashboard':
      return 'dashboard';
    case '/projects':
      return 'projects';
    case '/clips':
      return 'clips';
    case '/settings':
      return 'settings';
    default:
      return 'home';
  }
}

function routeToPath(route: NavRoute): string {
  switch (route) {
    case 'home':
      return '/';
    case 'create-clips':
      return '/create';
    case 'dashboard':
      return '/dashboard';
    case 'projects':
      return '/projects';
    case 'clips':
      return '/clips';
    case 'settings':
      return '/settings';
  }
}

export default function App() {
  const {
    user,
    loading: authLoading,
    authError,
    clearAuthError,
    signInWithGoogle,
    getFreshToken,
  } = useAuth();

  const [activeRoute, setActiveRoute] = useState<NavRoute>(() =>
    typeof window !== 'undefined' ? pathToRoute(window.location.pathname) : 'home',
  );
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [profile, setProfile] = useState<WorkspaceProfile>(INITIAL_PROFILE);
  const [preferences, setPreferences] =
    useState<WorkspacePreferences>(INITIAL_PREFERENCES);

  const [selectedVideo, setSelectedVideo] = useState<LocalVideoAsset | null>(
    null,
  );
  const [clipSettings, setClipSettings] = useState<ClipSettings>({
    duration: INITIAL_PREFERENCES.defaultDuration,
    aspectRatio: INITIAL_PREFERENCES.defaultAspectRatio,
    captionStyle: INITIAL_PREFERENCES.defaultCaptionStyle,
    startTime: 0,
    endTime: 0,
  });

  const [projects, setProjects] = useState<VideoProject[]>([]);
  const [clips, setClips] = useState<GeneratedClip[]>([]);
  const [guestSession, setGuestSession] = useState<GuestSessionState | null>(null);
  const [processingStage, setProcessingStage] = useState<
    'idle' | 'uploading' | 'processing'
  >('idle');
  const [processingError, setProcessingError] = useState<string | null>(null);

  const [pendingAction, setPendingAction] =
    useState<PendingSignInAction | null>(null);
  const [signInWallOpen, setSignInWallOpen] = useState(false);

  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const createdObjectUrlsRef = useRef<Set<string>>(new Set());

  const navigate = useCallback((route: NavRoute) => {
    setActiveRoute(route);
    if (typeof window !== 'undefined') {
      const targetPath = routeToPath(route);
      if (window.location.pathname !== targetPath) {
        window.history.pushState(null, '', targetPath);
      }
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      setActiveRoute(pathToRoute(window.location.pathname));
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const revokeIfUnused = useCallback(
    (url: string | undefined, nextProjects: VideoProject[], nextSelectedUrl?: string) => {
      if (!url) return;
      const usedBySelected = nextSelectedUrl === url;
      const usedByProject = nextProjects.some((p) => p.previewUrl === url);
      if (!usedBySelected && !usedByProject && createdObjectUrlsRef.current.has(url)) {
        URL.revokeObjectURL(url);
        createdObjectUrlsRef.current.delete(url);
      }
    },
    [],
  );

  useEffect(() => {
    const urls = createdObjectUrlsRef.current;
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
      urls.clear();
    };
  }, []);

  // Load guest temporary session (quota, AI readiness, unexpired clips)
  useEffect(() => {
    let cancelled = false;
    fetchGuestSession()
      .then((session) => {
        if (!cancelled) {
          setGuestSession(session);
        }
      })
      .catch(() => {
        // Non-fatal if guest session bootstrap fails offline
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Load persisted workspace account, projects, and clips when user signs in
  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setProfile(INITIAL_PROFILE);
      setPreferences(INITIAL_PREFERENCES);
      setProjects([]);
      setClips([]);
      return;
    }

    let cancelled = false;

    const loadUserData = async () => {
      try {
        const token = await getFreshToken();
        if (!token || cancelled) return;

        const [account, remoteProjects, remoteClips] = await Promise.all([
          fetchWorkspaceAccount(token),
          fetchProjects(token),
          fetchClips(token),
        ]);

        if (cancelled) return;

        setProfile(account.profile);
        setPreferences(account.preferences);
        setProjects(remoteProjects);
        setClips(remoteClips);
        setClipSettings((prev) => ({
          ...prev,
          duration: account.preferences.defaultDuration,
          aspectRatio: account.preferences.defaultAspectRatio,
          captionStyle: account.preferences.autoIncludeCaptions
            ? account.preferences.defaultCaptionStyle
            : 'none',
        }));
      } catch (error) {
        if (cancelled) return;
        const message =
          error instanceof Error
            ? error.message
            : 'Unable to load workspace data. Please try again.';
        setActionError(message);
      }
    };

    void loadUserData();

    return () => {
      cancelled = true;
    };
  }, [user, authLoading, getFreshToken]);

  const executeDownloadGuestClip = useCallback(
    async (clipId: string, clipTitle: string) => {
      const token = await getFreshToken();
      if (!token) {
        throw new Error('Authentication required to download clips.');
      }
      await downloadAuthenticatedMedia(
        `/api/guest/clips/${encodeURIComponent(clipId)}/download`,
        token,
        clipTitle,
      );
      setActionSuccess(`Downloading "${clipTitle}". Your generated clips remain available below.`);
    },
    [getFreshToken],
  );

  const executeClaimGuestClips = useCallback(
    async (clipIds?: string[]) => {
      const token = await getFreshToken();
      if (!token) {
        throw new Error('Authentication required to save clips.');
      }
      const claimed = await claimGuestClips(token, clipSettings, clipIds);
      setProjects((prev) => {
        const withoutDup = prev.filter((p) => p.id !== claimed.project.id);
        return [claimed.project, ...withoutDup];
      });
      setClips((prev) => {
        const existingIds = new Set(claimed.clips.map((c) => c.id));
        return [...claimed.clips, ...prev.filter((c) => !existingIds.has(c.id))];
      });
      setGuestSession(claimed.session);
      setActionSuccess(
        `Saved ${claimed.clips.length} ${claimed.clips.length === 1 ? 'clip' : 'clips'} to My Clips.`,
      );
      navigate('clips');
    },
    [getFreshToken, clipSettings, navigate],
  );

  // Resume pending sign-in wall action automatically after authentication
  useEffect(() => {
    if (!user || !pendingAction) return;

    const actionToResume = pendingAction;
    setPendingAction(null);
    setSignInWallOpen(false);

    const resume = async () => {
      setActionError(null);
      try {
        if (actionToResume.type === 'download') {
          await executeDownloadGuestClip(
            actionToResume.clipId,
            actionToResume.clipTitle,
          );
        } else if (actionToResume.type === 'save-clip') {
          await executeClaimGuestClips([actionToResume.clipId]);
        } else if (actionToResume.type === 'save-all') {
          await executeClaimGuestClips();
        }
      } catch (error) {
        setActionError(
          error instanceof Error
            ? error.message
            : 'Unable to complete your requested action after sign-in.',
        );
      }
    };

    void resume();
  }, [user, pendingAction, executeDownloadGuestClip, executeClaimGuestClips]);

  const handleSelectVideo = useCallback(
    (file: File, extension: 'MP4' | 'MOV' | 'WebM', navigateToStudio = false) => {
      const objectUrl = URL.createObjectURL(file);
      createdObjectUrlsRef.current.add(objectUrl);

      setSelectedVideo((prev) => {
        if (prev?.objectUrl) {
          revokeIfUnused(prev.objectUrl, projects, objectUrl);
        }
        return {
          file,
          objectUrl,
          name: file.name,
          sizeBytes: file.size,
          mimeType: file.type,
          extension,
        };
      });

      setClipSettings((prev) => ({
        ...prev,
        startTime: 0,
        endTime: 0,
      }));
      setProcessingError(null);

      if (navigateToStudio) {
        navigate('create-clips');
      }
    },
    [projects, revokeIfUnused, navigate],
  );

  const handleUpdateVideoMetadata = useCallback(
    (patch: Partial<LocalVideoAsset>) => {
      setSelectedVideo((prev) => (prev ? { ...prev, ...patch } : prev));
    },
    [],
  );

  const handleClearVideo = useCallback(() => {
    setSelectedVideo((prev) => {
      if (prev?.objectUrl) {
        revokeIfUnused(prev.objectUrl, projects, undefined);
      }
      return null;
    });
    setClipSettings((prev) => ({
      ...prev,
      startTime: 0,
      endTime: 0,
    }));
    setProcessingError(null);
  }, [projects, revokeIfUnused]);

  const handleUpdateSettings = useCallback((patch: Partial<ClipSettings>) => {
    setClipSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  const handleGenerateClips = useCallback(async () => {
    if (!selectedVideo || processingStage !== 'idle') return;
    setProcessingError(null);
    setActionError(null);
    setActionSuccess(null);

    try {
      const wasCachedUpload = Boolean(selectedVideo.remoteUploadId);
      let uploadId = selectedVideo.remoteUploadId;

      if (!uploadId) {
        setProcessingStage('uploading');
        const uploaded = await uploadGuestVideo(selectedVideo.file);
        uploadId = uploaded.upload.id;
        setGuestSession(uploaded.session);
        setSelectedVideo((prev) =>
          prev ? { ...prev, remoteUploadId: uploadId } : prev,
        );
      }

      setProcessingStage('processing');
      try {
        const result = await processGuestVideo(uploadId, clipSettings);
        setGuestSession(result.session);
        setActionSuccess(
          `Generated ${result.session.clips.length} short-form clip previews.`,
        );
      } catch (err) {
        // If a cached remoteUploadId expired (e.g. >60m guest TTL), transparently re-upload once.
        if (
          wasCachedUpload &&
          err instanceof AiProcessingError &&
          (err.status === 400 || err.status === 404)
        ) {
          setProcessingStage('uploading');
          const reuploaded = await uploadGuestVideo(selectedVideo.file);
          uploadId = reuploaded.upload.id;
          setGuestSession(reuploaded.session);
          setSelectedVideo((prev) =>
            prev ? { ...prev, remoteUploadId: uploadId } : prev,
          );
          setProcessingStage('processing');
          const retried = await processGuestVideo(uploadId, clipSettings);
          setGuestSession(retried.session);
          setActionSuccess(
            `Generated ${retried.session.clips.length} short-form clip previews.`,
          );
        } else {
          throw err;
        }
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Unable to process video. Please try again.';
      setProcessingError(message);
    } finally {
      setProcessingStage('idle');
    }
  }, [selectedVideo, processingStage, clipSettings]);

  const handleStageProject = useCallback(async () => {
    if (!selectedVideo) return;
    setActionError(null);
    const stagedProject = clipPilotPipeline.stageLocalProject(
      selectedVideo,
      clipSettings,
    );

    if (!user) {
      setProjects((prev) => [stagedProject, ...prev]);
      return;
    }

    try {
      const token = await getFreshToken();
      if (!token) {
        setProjects((prev) => [stagedProject, ...prev]);
        return;
      }
      const saved = await createRemoteProject(token, stagedProject);
      setProjects((prev) => [saved, ...prev]);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to save project to your account.';
      setActionError(message);
      throw error;
    }
  }, [selectedVideo, clipSettings, user, getFreshToken]);

  const handleRequestDownload = useCallback(
    async (clip: GuestClipItem) => {
      setActionError(null);
      if (!user) {
        clearAuthError();
        setPendingAction({
          type: 'download',
          clipId: clip.id,
          clipTitle: clip.title,
        });
        setSignInWallOpen(true);
        return;
      }

      try {
        await executeDownloadGuestClip(clip.id, clip.title);
      } catch (error) {
        setActionError(
          error instanceof Error ? error.message : 'Failed to download clip.',
        );
      }
    },
    [user, clearAuthError, executeDownloadGuestClip],
  );

  const handleRequestSaveClip = useCallback(
    async (clip: GuestClipItem) => {
      setActionError(null);
      if (!user) {
        clearAuthError();
        setPendingAction({
          type: 'save-clip',
          clipId: clip.id,
          clipTitle: clip.title,
        });
        setSignInWallOpen(true);
        return;
      }

      try {
        await executeClaimGuestClips([clip.id]);
      } catch (error) {
        setActionError(
          error instanceof Error ? error.message : 'Failed to save clip.',
        );
      }
    },
    [user, clearAuthError, executeClaimGuestClips],
  );

  const handleRequestSaveAll = useCallback(async () => {
    setActionError(null);
    if (!user) {
      clearAuthError();
      setPendingAction({ type: 'save-all' });
      setSignInWallOpen(true);
      return;
    }

    try {
      await executeClaimGuestClips();
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : 'Failed to save clips.',
      );
    }
  }, [user, clearAuthError, executeClaimGuestClips]);

  const handleDownloadSavedClip = useCallback(
    async (clip: GeneratedClip) => {
      setActionError(null);
      try {
        const token = await getFreshToken();
        if (!token) {
          throw new Error('Sign in to download saved clips.');
        }
        const url =
          clip.downloadUrl || `/api/clips/${encodeURIComponent(clip.id)}/download`;
        await downloadAuthenticatedMedia(url, token, clip.title);
      } catch (error) {
        setActionError(
          error instanceof Error ? error.message : 'Failed to download clip.',
        );
      }
    },
    [getFreshToken],
  );

  const handleOpenProjectPreview = useCallback(
    (project: VideoProject) => {
      if (project.previewUrl && project.sourceFile) {
        setSelectedVideo({
          file: project.sourceFile,
          objectUrl: project.previewUrl,
          name: project.fileName,
          sizeBytes: project.fileSizeBytes,
          mimeType: project.sourceFile.type,
          extension: project.format,
          durationSeconds: project.durationSeconds,
          thumbnailDataUrl: project.thumbnailDataUrl,
        });
      }
      setClipSettings({ ...project.settings });
      navigate('create-clips');
    },
    [navigate],
  );

  const handleRemoveProject = useCallback(
    async (projectId: string) => {
      setActionError(null);

      if (user) {
        try {
          const token = await getFreshToken();
          if (token) {
            await deleteRemoteProject(token, projectId);
          }
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : 'Failed to remove project.';
          setActionError(message);
          return;
        }
      }

      setProjects((prev) => {
        const target = prev.find((p) => p.id === projectId);
        const remaining = prev.filter((p) => p.id !== projectId);
        if (target?.previewUrl) {
          revokeIfUnused(target.previewUrl, remaining, selectedVideo?.objectUrl);
        }
        return remaining;
      });
    },
    [user, getFreshToken, revokeIfUnused, selectedVideo],
  );

  const handleSaveProfile = useCallback(
    async (nextProfile: WorkspaceProfile) => {
      setActionError(null);
      if (!user) {
        setProfile(nextProfile);
        return;
      }
      try {
        const token = await getFreshToken();
        if (!token) {
          setProfile(nextProfile);
          return;
        }
        const saved = await saveWorkspaceProfile(token, nextProfile);
        setProfile(saved);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Failed to update profile.';
        setActionError(message);
      }
    },
    [user, getFreshToken],
  );

  const handleSavePreferences = useCallback(
    async (nextPrefs: WorkspacePreferences) => {
      setActionError(null);
      const applyPrefsLocally = (prefs: WorkspacePreferences) => {
        setPreferences(prefs);
        setClipSettings((prev) => ({
          ...prev,
          duration: prefs.defaultDuration,
          aspectRatio: prefs.defaultAspectRatio,
          captionStyle: prefs.autoIncludeCaptions
            ? prefs.defaultCaptionStyle
            : 'none',
        }));
      };

      if (!user) {
        applyPrefsLocally(nextPrefs);
        return;
      }

      try {
        const token = await getFreshToken();
        if (!token) {
          applyPrefsLocally(nextPrefs);
          return;
        }
        const saved = await saveWorkspacePreferences(token, nextPrefs);
        applyPrefsLocally(saved);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : 'Failed to update preferences.';
        setActionError(message);
      }
    },
    [user, getFreshToken],
  );

  const visibleError = actionError || authError;
  const generatedClips = guestSession?.clips ?? [];

  const renderFeedbackBanners = () => (
    <>
      {visibleError && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
            <span className="truncate">{visibleError}</span>
          </div>
          <button
            type="button"
            aria-label="Dismiss error"
            onClick={() => {
              setActionError(null);
              clearAuthError();
            }}
            className="rounded p-1 text-red-300 hover:bg-red-500/20"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {actionSuccess && (
        <div
          role="status"
          className="flex items-center justify-between gap-3 rounded-lg border border-[#2CE66D]/30 bg-[#2CE66D]/10 px-4 py-3 text-sm text-[#D1FAE5]"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-[#2CE66D]" />
            <span className="truncate">{actionSuccess}</span>
          </div>
          <button
            type="button"
            aria-label="Dismiss notification"
            onClick={() => setActionSuccess(null)}
            className="rounded p-1 text-[#2CE66D] hover:bg-[#2CE66D]/20"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </>
  );

  const signInModal = (
    <SignInWallModal
      open={signInWallOpen}
      pendingAction={pendingAction}
      authError={authError}
      onConfirmGoogleSignIn={signInWithGoogle}
      onClose={() => {
        setSignInWallOpen(false);
        setPendingAction(null);
      }}
    />
  );

  // Public Homepage (/)
  if (activeRoute === 'home') {
    return (
      <>
        <HomePage onNavigate={navigate} />
        {signInModal}
      </>
    );
  }

  // Standalone Guest Creator (/create when not signed in)
  if (activeRoute === 'create-clips' && !user) {
    return (
      <div className="min-h-screen bg-[#080A09] text-[#F8FAFC] flex flex-col">
        <GuestCreatorHeader
          guestSession={guestSession}
          onNavigate={navigate}
        />

        <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          <div className="mx-auto w-full max-w-6xl space-y-6">
            {renderFeedbackBanners()}

            <CreateClipsPage
              selectedVideo={selectedVideo}
              settings={clipSettings}
              guestSession={guestSession}
              generatedClips={generatedClips}
              processingStage={processingStage}
              processingError={processingError}
              onClearProcessingError={() => setProcessingError(null)}
              onSelectVideo={(file, ext) =>
                handleSelectVideo(file, ext, false)
              }
              onUpdateVideoMetadata={handleUpdateVideoMetadata}
              onClearVideo={handleClearVideo}
              onUpdateSettings={handleUpdateSettings}
              onGenerateClips={handleGenerateClips}
              onStageProject={handleStageProject}
              onRequestDownload={handleRequestDownload}
              onRequestSaveClip={handleRequestSaveClip}
              onRequestSaveAll={handleRequestSaveAll}
              onNavigate={navigate}
            />
          </div>
        </main>

        {signInModal}
      </div>
    );
  }

  // Authenticated Workspace Shell (Dashboard, Create Clips, My Projects, My Clips, Settings)
  return (
    <div className="min-h-screen bg-[#080A09] text-[#F8FAFC]">
      <Sidebar
        activeRoute={activeRoute}
        onNavigate={navigate}
        profile={profile}
        projectsCount={projects.length}
        clipsCount={clips.length}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      <div className="lg:pl-64 flex min-h-screen flex-col">
        <TopBar
          activeRoute={activeRoute}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          onNewClipClick={() => navigate('create-clips')}
        />

        <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          <div className="mx-auto w-full max-w-6xl space-y-6">
            {renderFeedbackBanners()}

            {activeRoute === 'dashboard' && (
              <DashboardPage
                projects={projects}
                clipsCount={clips.length}
                onNavigate={navigate}
                onVideoSelected={(file, ext) =>
                  handleSelectVideo(file, ext, true)
                }
                onOpenProjectPreview={handleOpenProjectPreview}
                onRemoveProject={(id) => void handleRemoveProject(id)}
              />
            )}

            {activeRoute === 'create-clips' && (
              <CreateClipsPage
                selectedVideo={selectedVideo}
                settings={clipSettings}
                guestSession={guestSession}
                generatedClips={generatedClips}
                processingStage={processingStage}
                processingError={processingError}
                onClearProcessingError={() => setProcessingError(null)}
                onSelectVideo={(file, ext) =>
                  handleSelectVideo(file, ext, false)
                }
                onUpdateVideoMetadata={handleUpdateVideoMetadata}
                onClearVideo={handleClearVideo}
                onUpdateSettings={handleUpdateSettings}
                onGenerateClips={handleGenerateClips}
                onStageProject={handleStageProject}
                onRequestDownload={handleRequestDownload}
                onRequestSaveClip={handleRequestSaveClip}
                onRequestSaveAll={handleRequestSaveAll}
                onNavigate={navigate}
              />
            )}

            {activeRoute === 'projects' && (
              <MyProjectsPage
                projects={projects}
                onNavigate={navigate}
                onOpenProjectPreview={handleOpenProjectPreview}
                onRemoveProject={(id) => void handleRemoveProject(id)}
              />
            )}

            {activeRoute === 'clips' && (
              <MyClipsPage
                clips={clips}
                onNavigate={navigate}
                onDownloadClip={handleDownloadSavedClip}
              />
            )}

            {activeRoute === 'settings' && (
              <SettingsPage
                profile={profile}
                preferences={preferences}
                onSaveProfile={handleSaveProfile}
                onSavePreferences={handleSavePreferences}
              />
            )}
          </div>
        </main>
      </div>

      {signInModal}
    </div>
  );
}
