// /lib/db/schema.ts

import {
  pgTable,
  serial,
  varchar,
  text,
  timestamp,
  integer,
  boolean,
  date,
  unique,
  numeric,
  time
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Teams Table
export const teams = pgTable('teams', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  stripeCustomerId: text('stripe_customer_id').unique(), // Nullable by default
  stripeSubscriptionId: text('stripe_subscription_id').unique(),
  stripeProductId: text('stripe_product_id'),
  planName: varchar('plan_name', { length: 50 }),
  subscriptionStatus: varchar('subscription_status', { length: 20 }),
});

// Users Table
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }), // Nullable by default
  email: varchar('email', { length: 255 }).notNull().unique(),
  phone: varchar('phone', { length: 100 }), // Nullable by default
  birthDate: date('birth_date'),
  passwordHash: text('password_hash').notNull(),
  role: varchar('role', { length: 20 }).notNull().default('member'),
  hourlyRate: numeric('hourly_rate').notNull().$type<number>().default(0),
  maxWeeklyHours: integer('max_weekly_hours').notNull().default(40),
  minWeeklyHours: integer('min_weekly_hours').notNull().default(0),
  seniority: integer('seniority').notNull().default(0),
  position: varchar('position', { length: 50 }).notNull().default(''),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  deletedAt: timestamp('deleted_at'), // Nullable by default
});

// Team Members Table
export const teamMembers = pgTable('team_members', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id),
  teamId: integer('team_id')
    .notNull()
    .references(() => teams.id),
  role: varchar('role', { length: 50 }).notNull().default('member'),
  joinedAt: timestamp('joined_at').notNull().defaultNow(),
});

// Activity Logs Table
export const activityLogs = pgTable('activity_logs', {
  id: serial('id').primaryKey(),
  teamId: integer('team_id')
    .notNull()
    .references(() => teams.id),
  userId: integer('user_id')
    .references(() => users.id), // Nullable by default
  action: text('action').notNull(),
  timestamp: timestamp('timestamp').notNull().defaultNow(),
  ipAddress: varchar('ip_address', { length: 45 }), // Nullable by default
});

// Invitations Table
export const invitations = pgTable('invitations', {
  id: serial('id').primaryKey(),
  teamId: integer('team_id')
    .notNull()
    .references(() => teams.id),
  email: varchar('email', { length: 255 }).notNull(),
  role: varchar('role', { length: 50 }).notNull().default('member'),
  invitedBy: integer('invited_by')
    .notNull()
    .references(() => users.id),
  invitedAt: timestamp('invited_at').notNull().defaultNow(),
  status: varchar('status', { length: 20 }).notNull().default('pending'),
});

// Rosters Table
export const rosters = pgTable('rosters', {
  id: serial('id').primaryKey(),
  teamId: integer('team_id')
    .notNull()
    .references(() => teams.id),
  startDate: date('start_date').notNull(),
  endDate: date('end_date').notNull(),
  createdBy: integer('created_by')
    .notNull()
    .references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const shifts = pgTable('shifts', {
  id: serial('id').primaryKey(),
  rosterId: integer('roster_id')
    .notNull()
    .references(() => rosters.id),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id),
  shiftType: varchar('shift_type', { length: 20 }).notNull(),
  date: date('date').notNull(),
  startTime: time('start_time').notNull(),
  finishTime: time('finish_time').notNull(),
  hours: integer('hours').notNull(),
});

// User Availability Table
export const userAvailability = pgTable('user_availability', {
  userId: integer('user_id').notNull(),
  date: text('date').notNull(),
  isAvailableAM: boolean('is_available_am').default(false),
  isAvailablePM: boolean('is_available_pm').default(false),
  isAvailableNight: boolean('is_available_night').default(false)
}, (table) => ({
  // Add a unique constraint on the combination of userId and date
  uniqCombination: unique().on(table.userId, table.date)
}))

// Relations

// Teams Relations
export const teamsRelations = relations(teams, ({ many }) => ({
  teamMembers: many(teamMembers),
  rosters: many(rosters),
  activityLogs: many(activityLogs),
  invitations: many(invitations),
}));

// Users Relations
export const usersRelations = relations(users, ({ many }) => ({
  teamMembers: many(teamMembers),
  shifts: many(shifts),
  availability: many(userAvailability),
  invitationsSent: many(invitations),
}));

// Team Members Relations
export const teamMembersRelations = relations(teamMembers, ({ one }) => ({
  user: one(users, {
    fields: [teamMembers.userId],
    references: [users.id],
  }),
  team: one(teams, {
    fields: [teamMembers.teamId],
    references: [teams.id],
  }),
}));

// Activity Logs Relations
export const activityLogsRelations = relations(activityLogs, ({ one }) => ({
  team: one(teams, {
    fields: [activityLogs.teamId],
    references: [teams.id],
  }),
  user: one(users, {
    fields: [activityLogs.userId],
    references: [users.id],
  }),
}));

// Invitations Relations
export const invitationsRelations = relations(invitations, ({ one }) => ({
  team: one(teams, {
    fields: [invitations.teamId],
    references: [teams.id],
  }),
  invitedByUser: one(users, {
    fields: [invitations.invitedBy],
    references: [users.id],
  }),
}));

// Rosters Relations
export const rostersRelations = relations(rosters, ({ one, many }) => ({
  team: one(teams, {
    fields: [rosters.teamId],
    references: [teams.id],
  }),
  shifts: many(shifts),
  createdByUser: one(users, {
    fields: [rosters.createdBy],
    references: [users.id],
  }),
}));

// Shifts Relations
export const shiftsRelations = relations(shifts, ({ one }) => ({
  roster: one(rosters, {
    fields: [shifts.rosterId],
    references: [rosters.id],
  }),
  user: one(users, {
    fields: [shifts.userId],
    references: [users.id],
  }),
}));

// User Availability Relations
export const userAvailabilityRelations = relations(userAvailability, ({ one }) => ({
  user: one(users, {
    fields: [userAvailability.userId],
    references: [users.id],
  }),
}));

// Types
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Team = typeof teams.$inferSelect;
export type NewTeam = typeof teams.$inferInsert;
export type TeamMember = typeof teamMembers.$inferSelect;
export type NewTeamMember = typeof teamMembers.$inferInsert;
export type ActivityLog = typeof activityLogs.$inferSelect;
export type NewActivityLog = typeof activityLogs.$inferInsert;
export type Invitation = typeof invitations.$inferSelect;
export type NewInvitation = typeof invitations.$inferInsert;
export type Roster = typeof rosters.$inferSelect;
export type NewRoster = typeof rosters.$inferInsert;
export type Shift = typeof shifts.$inferSelect;
export type NewShift = typeof shifts.$inferInsert;
export type UserAvailability = typeof userAvailability.$inferSelect;
export type NewUserAvailability = typeof userAvailability.$inferInsert;

export type TeamDataWithMembers = Team & {
  teamMembers: (TeamMember & {
    user: Pick<User, 'id' | 'name' | 'email'>;
  })[];
};

export enum ActivityType {
  SIGN_UP = 'SIGN_UP',
  SIGN_IN = 'SIGN_IN',
  SIGN_OUT = 'SIGN_OUT',
  UPDATE_PASSWORD = 'UPDATE_PASSWORD',
  DELETE_ACCOUNT = 'DELETE_ACCOUNT',
  UPDATE_ACCOUNT = 'UPDATE_ACCOUNT',
  UPDATE_TEAM_MEMBER = 'UPDATE_TEAM_MEMBER',
  CREATE_TEAM = 'CREATE_TEAM',
  REMOVE_TEAM_MEMBER = 'REMOVE_TEAM_MEMBER',
  INVITE_TEAM_MEMBER = 'INVITE_TEAM_MEMBER',
  ACCEPT_INVITATION = 'ACCEPT_INVITATION',
}
