'use server';

import { z } from 'zod';
import { and, eq, sql } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import {
  User,
  users,
  teams,
  teamMembers,
  activityLogs,
  type NewUser,
  type NewTeam,
  type NewTeamMember,
  type NewActivityLog,
  ActivityType,
  invitations,
} from '@/lib/db/schema';
import { setSession } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createCheckoutSession } from '@/lib/payments/stripe';
import { getUser, getUserWithTeam } from '@/lib/db/queries';
import {
  validatedAction,
  validatedActionWithUser,
} from '@/lib/auth/middleware';
import { createClient } from '@supabase/supabase-js';
import { compare, hash } from 'bcryptjs';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!, 
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const SALT_ROUNDS = 10;

async function generatePassword() {
  const length = 12;
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
  let password = "";
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
}

async function comparePasswords(
  plainTextPassword: string,
  hashedPassword: string
) {
  return compare(plainTextPassword, hashedPassword);
}

async function hashPassword(password: string) {
  return hash(password, SALT_ROUNDS);
}

async function logActivity(
  teamId: number | null | undefined,
  userId: number,
  type: ActivityType,
  ipAddress?: string
) {
  if (teamId === null || teamId === undefined) {
    return;
  }
  const newActivity: NewActivityLog = {
    teamId,
    userId,
    action: type,
    ipAddress: ipAddress || '',
  };
  await db.insert(activityLogs).values(newActivity);
}

const signInSchema = z.object({
  email: z.string().email().min(3).max(255),
  password: z.string().min(8).max(100),
});

export const signIn = validatedAction(signInSchema, async (data, formData) => {
  const { email, password } = data;

  const userWithTeam = await db
    .select({
      user: users,
      team: teams,
    })
    .from(users)
    .leftJoin(teamMembers, eq(users.id, teamMembers.userId))
    .leftJoin(teams, eq(teamMembers.teamId, teams.id))
    .where(eq(users.email, email))
    .limit(1);

  if (userWithTeam.length === 0) {
    return { error: 'Invalid email or password. Please try again.' };
  }

  const { user: foundUser, team: foundTeam } = userWithTeam[0];

  const isPasswordValid = await comparePasswords(
    password,
    foundUser.passwordHash
  );

  if (!isPasswordValid) {
    return { error: 'Invalid email or password. Please try again.' };
  }

  await Promise.all([
    setSession(foundUser),
    logActivity(foundTeam?.id, foundUser.id, ActivityType.SIGN_IN),
  ]);

  const redirectTo = formData.get('redirect') as string | null;
  if (redirectTo === 'checkout') {
    const priceId = formData.get('priceId') as string;
    return createCheckoutSession({ team: foundTeam, priceId });
  }

  redirect('/dashboard');
});

const signUpSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  inviteId: z.string().optional(),
});

export const signUp = validatedAction(signUpSchema, async (data, formData) => {
  const { email, password, inviteId } = data;

  // Create Supabase user first
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
  });

  if (authError) {
    return { error: 'Failed to create user. Please try again.' };
  }

  const existingUser = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existingUser.length > 0) {
    return { error: 'Failed to create user. Please try again.' };
  }

  const passwordHash = await hashPassword(password);

  const newUser: NewUser = {
    email,
    passwordHash,
    role: 'owner', // Default role, will be overridden if there's an invitation
  };

  const [createdUser] = await db.insert(users).values(newUser).returning();

  if (!createdUser) {
    return { error: 'Failed to create user. Please try again.' };
  }

  let teamId: number;
  let userRole: string;
  let createdTeam: typeof teams.$inferSelect | null = null;

  if (inviteId) {
    // Check if there's a valid invitation
    const [invitation] = await db
      .select()
      .from(invitations)
      .where(
        and(
          eq(invitations.id, parseInt(inviteId)),
          eq(invitations.email, email),
          eq(invitations.status, 'pending')
        )
      )
      .limit(1);

    if (invitation) {
      teamId = invitation.teamId;
      userRole = invitation.role;

      await db
        .update(invitations)
        .set({ status: 'accepted' })
        .where(eq(invitations.id, invitation.id));

      await logActivity(teamId, createdUser.id, ActivityType.ACCEPT_INVITATION);

      [createdTeam] = await db
        .select()
        .from(teams)
        .where(eq(teams.id, teamId))
        .limit(1);
    } else {
      return { error: 'Invalid or expired invitation.' };
    }
  } else {
    // Create a new team if there's no invitation
    const newTeam: NewTeam = {
      name: `${email}'s Team`,
    };

    [createdTeam] = await db.insert(teams).values(newTeam).returning();

    if (!createdTeam) {
      return { error: 'Failed to create team. Please try again.' };
    }

    teamId = createdTeam.id;
    userRole = 'owner';

    await logActivity(teamId, createdUser.id, ActivityType.CREATE_TEAM);
  }

  const newTeamMember: NewTeamMember = {
    userId: createdUser.id,
    teamId: teamId,
    role: userRole,
  };

  await Promise.all([
    db.insert(teamMembers).values(newTeamMember),
    logActivity(teamId, createdUser.id, ActivityType.SIGN_UP),
    setSession(createdUser),
  ]);

  const redirectTo = formData.get('redirect') as string | null;
  if (redirectTo === 'checkout') {
    const priceId = formData.get('priceId') as string;
    return createCheckoutSession({ team: createdTeam, priceId });
  }

  redirect('/dashboard');
});

export async function signOut() {
  const user = (await getUser()) as User;
  const userWithTeam = await getUserWithTeam(user.id);
  await logActivity(userWithTeam?.teamId, user.id, ActivityType.SIGN_OUT);
  (await cookies()).delete('session');
}

const updatePasswordSchema = z
  .object({
    currentPassword: z.string().min(8).max(100),
    newPassword: z.string().min(8).max(100),
    confirmPassword: z.string().min(8).max(100),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

export const updatePassword = validatedActionWithUser(
  updatePasswordSchema,
  async (data, _, user) => {
    const { currentPassword, newPassword } = data;

    const isPasswordValid = await comparePasswords(
      currentPassword,
      user.passwordHash
    );

    if (!isPasswordValid) {
      return { error: 'Current password is incorrect.' };
    }

    if (currentPassword === newPassword) {
      return {
        error: 'New password must be different from the current password.',
      };
    }

    const newPasswordHash = await hashPassword(newPassword);
    const userWithTeam = await getUserWithTeam(user.id);

    await Promise.all([
      db
        .update(users)
        .set({ passwordHash: newPasswordHash })
        .where(eq(users.id, user.id)),
      logActivity(userWithTeam?.teamId, user.id, ActivityType.UPDATE_PASSWORD),
    ]);

    return { success: 'Password updated successfully.' };
  }
);

const deleteAccountSchema = z.object({
  password: z.string().min(8).max(100),
});

export const deleteAccount = validatedActionWithUser(
  deleteAccountSchema,
  async (data, _, user) => {
    const { password } = data;

    const isPasswordValid = await comparePasswords(password, user.passwordHash);
    if (!isPasswordValid) {
      return { error: 'Incorrect password. Account deletion failed.' };
    }

    const userWithTeam = await getUserWithTeam(user.id);

    await logActivity(
      userWithTeam?.teamId,
      user.id,
      ActivityType.DELETE_ACCOUNT
    );

    // Soft delete
    await db
      .update(users)
      .set({
        deletedAt: sql`CURRENT_TIMESTAMP`,
        email: sql`CONCAT(email, '-', id, '-deleted')`, // Ensure email uniqueness
      })
      .where(eq(users.id, user.id));

    if (userWithTeam?.teamId) {
      await db
        .delete(teamMembers)
        .where(
          and(
            eq(teamMembers.userId, user.id),
            eq(teamMembers.teamId, userWithTeam.teamId)
          )
        );
    }

    (await cookies()).delete('session');
    redirect('/sign-in');
  }
);

const updateAccountSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  birthDate: z.string()
    .regex(/^\d{2}\/\d{2}\/\d{4}$/, 'Invalid date format. Use DD/MM/YYYY')
    .transform((value) => {
      const [day, month, year] = value.split('/');
      return `${year}-${month}-${day}`;
    })
    .optional(),
});

export const updateAccount = validatedActionWithUser(
  updateAccountSchema,
  async (data, _, user) => {
    const { name, email, phone, birthDate } = data;
    const userWithTeam = await getUserWithTeam(user.id);
    console.log('Received Data:', { name, email, phone, birthDate }); // Log raw data


    await Promise.all([
      db.update(users).set({ 
        name, 
        email, 
        phone, 
        birthDate: birthDate ? birthDate : null,
      }).where(eq(users.id, user.id)),
      logActivity(userWithTeam?.teamId, user.id, ActivityType.UPDATE_ACCOUNT),
    ]);

    console.log('Database Updated Successfully');
    return { success: 'Account updated successfully.' };
  }
);

const removeTeamMemberSchema = z.object({
  memberId: z.number(),
});

export const removeTeamMember = validatedActionWithUser(
  removeTeamMemberSchema,
  async (data, _, user) => {
    const { memberId } = data;
    const userWithTeam = await getUserWithTeam(user.id);

    if (!userWithTeam?.teamId) {
      return { error: 'User is not part of a team' };
    }

    await db
      .delete(teamMembers)
      .where(
        and(
          eq(teamMembers.id, memberId),
          eq(teamMembers.teamId, userWithTeam.teamId)
        )
      );

    await logActivity(
      userWithTeam.teamId,
      user.id,
      ActivityType.REMOVE_TEAM_MEMBER
    );

    return { success: 'Team member removed successfully' };
  }
);

const inviteTeamMemberSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['member', 'owner']),
});

export const inviteTeamMember = validatedActionWithUser(
  inviteTeamMemberSchema,
  async (data, _, user) => {
    const { email, role } = data;

    // Fetch user's team
    const userWithTeam = await getUserWithTeam(user.id);
    if (!userWithTeam?.teamId) {
      return { error: 'User is not part of a team' };
    }

    const teamId = userWithTeam.teamId;
    const userId = user.id;

    // Check if the user is already part of the team
    const existingMember = await db
      .select()
      .from(users)
      .leftJoin(teamMembers, eq(users.id, teamMembers.userId))
      .where(
        and(eq(users.email, email), eq(teamMembers.teamId, teamId))
      )
      .limit(1);

    if (existingMember.length > 0) {
      return { error: 'User is already a member of this team' };
    }

    // Generate a temporary password
    const generatedPassword = await generatePassword();
    const passwordHash = await hashPassword(generatedPassword);

    try {
      // Create user, team member, and invitation in a transaction
      const [createdUser, invitation] = await db.transaction(async (tx) => {
        // Create the user in the database
        const [newUser] = await tx
          .insert(users)
          .values({
            email,
            passwordHash,
            role,
          })
          .returning();

        if (!newUser) {
          throw new Error('Failed to create user in the database.');
        }

        // Add the new user to the team
        await tx
          .insert(teamMembers)
          .values({
            userId: newUser.id,
            teamId,
            role,
          });

        // Create the invitation
        const [newInvitation] = await tx
          .insert(invitations)
          .values({
            teamId,
            email,
            role,
            invitedBy: userId,
            status: 'approved',
          })
          .returning();

        return [newUser, newInvitation];
      });

      await logActivity(teamId, userId, ActivityType.INVITE_TEAM_MEMBER);

      // Send invitation email using Supabase
      const { data: inviteData, error: supabaseError } = await supabase.auth.admin.inviteUserByEmail(email, {
        data: {
          inviteId: invitation.id,
          inviterName: user.name || user.email,
          role,
          password: generatedPassword, // Include the generated password in the metadata
        },
        redirectTo: `${process.env.BASE_URL}/sign-up?inviteId=${invitation.id}`,
      });

      if (supabaseError) {
        console.error('Failed to send invitation email via Supabase:', supabaseError);
        return { error: 'Failed to send invitation email' };
      }

      console.log('Invitation sent successfully:', inviteData);

      return {
        success: 'Invitation sent successfully',
        email,
        password: generatedPassword, // Return the password for debugging purposes (optional, remove for production)
      };
    } catch (error) {
      console.error('Error in invitation process:', error);
      return { error: 'Failed to complete the invitation process' };
    }
  }
);


// /app/(login)/actions.ts
const updateTeamMemberDetailsSchema = z.object({
  userId: z.string(),
  position: z.string().min(1, 'Position is required'),
  hourlyRate: z.string().transform(Number),
  maxWeeklyHours: z.string().transform(Number),
  minWeeklyHours: z.string().transform(Number),
  seniority: z.string().transform(Number),
});

export const updateTeamMemberDetails = validatedActionWithUser(
  updateTeamMemberDetailsSchema,
  async (data, _, user) => {
    if (user.role !== 'owner') {
      return { error: 'Only owners can modify these details' };
    }

    const userWithTeam = await getUserWithTeam(user.id);
    
    if (!userWithTeam?.teamId) {
      return { error: 'No team found' };
    }

    const { userId, position, hourlyRate, maxWeeklyHours, minWeeklyHours, seniority } = data;

    try {
      await db.update(users)
        .set({ 
          position,
          hourlyRate,
          maxWeeklyHours,
          minWeeklyHours,
          seniority,
        })
        .where(eq(users.id, parseInt(userId)));

      await logActivity(userWithTeam.teamId, user.id, ActivityType.UPDATE_TEAM_MEMBER);

      return { success: 'Team member details updated successfully.' };
    } catch (error) {
      console.error('Error updating team member details:', error);
      return { error: 'Failed to update team member details' };
    }
  }
);