import { eq } from 'drizzle-orm';
import { db } from './index.ts';
import { users } from './schema.ts';

export interface UserProfileUpdate {
  displayName: string;
  workspaceName: string;
  creatorFocus: string;
}

export interface UserPreferencesUpdate {
  defaultAspectRatio: string;
  defaultDuration: string;
  defaultCaptionStyle: string;
  autoIncludeCaptions: boolean;
  emailAlertsOnCompletion: boolean;
}

export async function getOrCreateUser(
  uid: string,
  email: string,
  defaultDisplayName?: string,
) {
  try {
    const fallbackName =
      defaultDisplayName?.trim() ||
      email.split('@')[0] ||
      'Creator Workspace';

    const result = await db
      .insert(users)
      .values({
        uid,
        email,
        displayName: fallbackName,
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email,
          updatedAt: new Date(),
        },
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error('Database query failed in getOrCreateUser:', error);
    throw new Error('Failed to load user workspace. Please try again later.', {
      cause: error,
    });
  }
}

export async function updateUserProfile(uid: string, input: UserProfileUpdate) {
  try {
    const result = await db
      .update(users)
      .set({
        displayName: input.displayName,
        workspaceName: input.workspaceName,
        creatorFocus: input.creatorFocus,
        updatedAt: new Date(),
      })
      .where(eq(users.uid, uid))
      .returning();

    return result[0] ?? null;
  } catch (error) {
    console.error('Database query failed in updateUserProfile:', error);
    throw new Error('Failed to update profile. Please try again later.', {
      cause: error,
    });
  }
}

export async function updateUserPreferences(
  uid: string,
  input: UserPreferencesUpdate,
) {
  try {
    const result = await db
      .update(users)
      .set({
        defaultAspectRatio: input.defaultAspectRatio,
        defaultDuration: input.defaultDuration,
        defaultCaptionStyle: input.defaultCaptionStyle,
        autoIncludeCaptions: input.autoIncludeCaptions,
        emailAlertsOnCompletion: input.emailAlertsOnCompletion,
        updatedAt: new Date(),
      })
      .where(eq(users.uid, uid))
      .returning();

    return result[0] ?? null;
  } catch (error) {
    console.error('Database query failed in updateUserPreferences:', error);
    throw new Error('Failed to update preferences. Please try again later.', {
      cause: error,
    });
  }
}
