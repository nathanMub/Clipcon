import { relations } from 'drizzle-orm';
import {
  bigint,
  boolean,
  doublePrecision,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  displayName: text('display_name').notNull().default('Creator Workspace'),
  workspaceName: text('workspace_name').notNull().default('ClipCon Studio'),
  creatorFocus: text('creator_focus').notNull().default('Short-form highlights'),
  defaultAspectRatio: text('default_aspect_ratio').notNull().default('9:16'),
  defaultDuration: text('default_duration').notNull().default('auto'),
  defaultCaptionStyle: text('default_caption_style').notNull().default('bold-dynamic'),
  autoIncludeCaptions: boolean('auto_include_captions').notNull().default(true),
  emailAlertsOnCompletion: boolean('email_alerts_on_completion').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const projects = pgTable('projects', {
  id: text('id').primaryKey(),
  userUid: text('user_uid')
    .references(() => users.uid, { onDelete: 'cascade' })
    .notNull(),
  name: text('name').notNull(),
  fileName: text('file_name').notNull(),
  fileSizeBytes: bigint('file_size_bytes', { mode: 'number' }).notNull(),
  format: text('format').notNull(),
  durationSeconds: doublePrecision('duration_seconds'),
  status: text('status').notNull().default('staged'),
  clipDurationPreset: text('clip_duration_preset').notNull().default('auto'),
  aspectRatio: text('aspect_ratio').notNull().default('9:16'),
  captionStyle: text('caption_style').notNull().default('bold-dynamic'),
  startTime: doublePrecision('start_time').notNull().default(0),
  endTime: doublePrecision('end_time').notNull().default(0),
  thumbnailDataUrl: text('thumbnail_data_url'),
  clipsCount: integer('clips_count').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const uploadedVideos = pgTable('uploaded_videos', {
  id: text('id').primaryKey(),
  projectId: text('project_id')
    .references(() => projects.id, { onDelete: 'cascade' })
    .notNull(),
  userUid: text('user_uid')
    .references(() => users.uid, { onDelete: 'cascade' })
    .notNull(),
  fileName: text('file_name').notNull(),
  mimeType: text('mime_type').notNull().default('video/mp4'),
  fileSizeBytes: bigint('file_size_bytes', { mode: 'number' }).notNull(),
  format: text('format').notNull(),
  durationSeconds: doublePrecision('duration_seconds'),
  width: integer('width'),
  height: integer('height'),
  thumbnailDataUrl: text('thumbnail_data_url'),
  storageKey: text('storage_key'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const clips = pgTable('clips', {
  id: text('id').primaryKey(),
  projectId: text('project_id')
    .references(() => projects.id, { onDelete: 'cascade' })
    .notNull(),
  userUid: text('user_uid')
    .references(() => users.uid, { onDelete: 'cascade' })
    .notNull(),
  title: text('title').notNull(),
  startTime: doublePrecision('start_time').notNull().default(0),
  endTime: doublePrecision('end_time').notNull().default(0),
  durationSeconds: doublePrecision('duration_seconds').notNull(),
  aspectRatio: text('aspect_ratio').notNull(),
  thumbnailUrl: text('thumbnail_url'),
  downloadUrl: text('download_url'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  projects: many(projects),
  uploadedVideos: many(uploadedVideos),
  clips: many(clips),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  owner: one(users, {
    fields: [projects.userUid],
    references: [users.uid],
  }),
  uploadedVideos: many(uploadedVideos),
  clips: many(clips),
}));

export const uploadedVideosRelations = relations(uploadedVideos, ({ one }) => ({
  project: one(projects, {
    fields: [uploadedVideos.projectId],
    references: [projects.id],
  }),
  owner: one(users, {
    fields: [uploadedVideos.userUid],
    references: [users.uid],
  }),
}));

export const clipsRelations = relations(clips, ({ one }) => ({
  project: one(projects, {
    fields: [clips.projectId],
    references: [projects.id],
  }),
  owner: one(users, {
    fields: [clips.userUid],
    references: [users.uid],
  }),
}));
