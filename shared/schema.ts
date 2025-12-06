import { sql, relations } from "drizzle-orm";
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  boolean,
  serial,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Users table with role support
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role", { length: 20 }).default("user").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const usersRelations = relations(users, ({ many }) => ({
  quizAttempts: many(quizAttempts),
  groupMemberships: many(groupMembers),
  pathwayAssignments: many(userPathwayAssignments),
}));

// User Groups table
export const userGroups = pgTable("user_groups", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const userGroupsRelations = relations(userGroups, ({ many }) => ({
  members: many(groupMembers),
  pathwayAssignments: many(groupPathwayAssignments),
}));

// Group Members (many-to-many: users <-> groups)
export const groupMembers = pgTable("group_members", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id").references(() => userGroups.id, { onDelete: "cascade" }).notNull(),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const groupMembersRelations = relations(groupMembers, ({ one }) => ({
  group: one(userGroups, {
    fields: [groupMembers.groupId],
    references: [userGroups.id],
  }),
  user: one(users, {
    fields: [groupMembers.userId],
    references: [users.id],
  }),
}));

// Training Pathways table
export const trainingPathways = pgTable("training_pathways", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  published: boolean("published").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const trainingPathwaysRelations = relations(trainingPathways, ({ many }) => ({
  modules: many(pathwayModules),
  groupAssignments: many(groupPathwayAssignments),
  userAssignments: many(userPathwayAssignments),
}));

// Pathway Modules (many-to-many: pathways <-> modules with order)
export const pathwayModules = pgTable("pathway_modules", {
  id: serial("id").primaryKey(),
  pathwayId: integer("pathway_id").references(() => trainingPathways.id, { onDelete: "cascade" }).notNull(),
  moduleId: integer("module_id").references(() => modules.id, { onDelete: "cascade" }).notNull(),
  order: integer("order").default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const pathwayModulesRelations = relations(pathwayModules, ({ one }) => ({
  pathway: one(trainingPathways, {
    fields: [pathwayModules.pathwayId],
    references: [trainingPathways.id],
  }),
  module: one(modules, {
    fields: [pathwayModules.moduleId],
    references: [modules.id],
  }),
}));

// Group Pathway Assignments
export const groupPathwayAssignments = pgTable("group_pathway_assignments", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id").references(() => userGroups.id, { onDelete: "cascade" }).notNull(),
  pathwayId: integer("pathway_id").references(() => trainingPathways.id, { onDelete: "cascade" }).notNull(),
  dueDate: timestamp("due_date"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const groupPathwayAssignmentsRelations = relations(groupPathwayAssignments, ({ one }) => ({
  group: one(userGroups, {
    fields: [groupPathwayAssignments.groupId],
    references: [userGroups.id],
  }),
  pathway: one(trainingPathways, {
    fields: [groupPathwayAssignments.pathwayId],
    references: [trainingPathways.id],
  }),
}));

// User Pathway Assignments (for individual assignments)
export const userPathwayAssignments = pgTable("user_pathway_assignments", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  pathwayId: integer("pathway_id").references(() => trainingPathways.id, { onDelete: "cascade" }).notNull(),
  dueDate: timestamp("due_date"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const userPathwayAssignmentsRelations = relations(userPathwayAssignments, ({ one }) => ({
  user: one(users, {
    fields: [userPathwayAssignments.userId],
    references: [users.id],
  }),
  pathway: one(trainingPathways, {
    fields: [userPathwayAssignments.pathwayId],
    references: [trainingPathways.id],
  }),
}));

// Modules table
export const modules = pgTable("modules", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  imageUrl: varchar("image_url"),
  order: integer("order").default(1).notNull(),
  published: boolean("published").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const modulesRelations = relations(modules, ({ many, one }) => ({
  sections: many(moduleSections),
  contentBlocks: many(contentBlocks),
  quiz: one(quizzes),
  pathwayModules: many(pathwayModules),
}));

// Module sections table (legacy - kept for backwards compatibility)
export const moduleSections = pgTable("module_sections", {
  id: serial("id").primaryKey(),
  moduleId: integer("module_id").references(() => modules.id, { onDelete: "cascade" }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content"),
  imageUrl: varchar("image_url"),
  order: integer("order").default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const moduleSectionsRelations = relations(moduleSections, ({ one }) => ({
  module: one(modules, {
    fields: [moduleSections.moduleId],
    references: [modules.id],
  }),
}));

// Content Blocks table (new block-based content system)
export const contentBlocks = pgTable("content_blocks", {
  id: serial("id").primaryKey(),
  moduleId: integer("module_id").references(() => modules.id, { onDelete: "cascade" }).notNull(),
  blockType: varchar("block_type", { length: 20 }).notNull(), // 'text' or 'question'
  order: integer("order").default(1).notNull(),
  // For text blocks
  title: varchar("title", { length: 255 }),
  content: text("content"),
  imageUrl: varchar("image_url"),
  // For question blocks
  question: text("question"),
  options: jsonb("options").$type<string[]>(),
  correctOptionIndex: integer("correct_option_index"),
  explanation: text("explanation"), // Shown after answering
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const contentBlocksRelations = relations(contentBlocks, ({ one }) => ({
  module: one(modules, {
    fields: [contentBlocks.moduleId],
    references: [modules.id],
  }),
}));

// Quizzes table (final assessment at end of module)
export const quizzes = pgTable("quizzes", {
  id: serial("id").primaryKey(),
  moduleId: integer("module_id").references(() => modules.id, { onDelete: "cascade" }).notNull().unique(),
  passingScore: integer("passing_score").default(70).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const quizzesRelations = relations(quizzes, ({ one, many }) => ({
  module: one(modules, {
    fields: [quizzes.moduleId],
    references: [modules.id],
  }),
  questions: many(quizQuestions),
  attempts: many(quizAttempts),
}));

// Quiz questions table (end-of-module quiz questions)
export const quizQuestions = pgTable("quiz_questions", {
  id: serial("id").primaryKey(),
  quizId: integer("quiz_id").references(() => quizzes.id, { onDelete: "cascade" }).notNull(),
  question: text("question").notNull(),
  options: jsonb("options").$type<string[]>().notNull(),
  correctOptionIndex: integer("correct_option_index").notNull(),
  order: integer("order").default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const quizQuestionsRelations = relations(quizQuestions, ({ one }) => ({
  quiz: one(quizzes, {
    fields: [quizQuestions.quizId],
    references: [quizzes.id],
  }),
}));

// Quiz attempts table (tracks both inline and final quiz answers)
export const quizAttempts = pgTable("quiz_attempts", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  quizId: integer("quiz_id").references(() => quizzes.id, { onDelete: "cascade" }).notNull(),
  moduleId: integer("module_id").references(() => modules.id, { onDelete: "cascade" }).notNull(),
  score: integer("score").notNull(),
  passed: boolean("passed").notNull(),
  answers: jsonb("answers").$type<number[]>().notNull(),
  inlineAnswers: jsonb("inline_answers").$type<{ blockId: number; selectedIndex: number; correct: boolean }[]>(),
  inlineScore: integer("inline_score"), // Percentage from inline questions
  createdAt: timestamp("created_at").defaultNow(),
});

export const quizAttemptsRelations = relations(quizAttempts, ({ one }) => ({
  user: one(users, {
    fields: [quizAttempts.userId],
    references: [users.id],
  }),
  quiz: one(quizzes, {
    fields: [quizAttempts.quizId],
    references: [quizzes.id],
  }),
  module: one(modules, {
    fields: [quizAttempts.moduleId],
    references: [modules.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  createdAt: true,
  updatedAt: true,
});

export const insertModuleSchema = createInsertSchema(modules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertModuleSectionSchema = createInsertSchema(moduleSections).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertContentBlockSchema = createInsertSchema(contentBlocks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertQuizSchema = createInsertSchema(quizzes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertQuizQuestionSchema = createInsertSchema(quizQuestions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertQuizAttemptSchema = createInsertSchema(quizAttempts).omit({
  id: true,
  createdAt: true,
});

export const insertUserGroupSchema = createInsertSchema(userGroups).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTrainingPathwaySchema = createInsertSchema(trainingPathways).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPathwayModuleSchema = createInsertSchema(pathwayModules).omit({
  id: true,
  createdAt: true,
});

export const insertGroupMemberSchema = createInsertSchema(groupMembers).omit({
  id: true,
  createdAt: true,
});

export const insertGroupPathwayAssignmentSchema = createInsertSchema(groupPathwayAssignments).omit({
  id: true,
  createdAt: true,
});

export const insertUserPathwayAssignmentSchema = createInsertSchema(userPathwayAssignments).omit({
  id: true,
  createdAt: true,
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Module = typeof modules.$inferSelect;
export type InsertModule = z.infer<typeof insertModuleSchema>;

export type ModuleSection = typeof moduleSections.$inferSelect;
export type InsertModuleSection = z.infer<typeof insertModuleSectionSchema>;

export type ContentBlock = typeof contentBlocks.$inferSelect;
export type InsertContentBlock = z.infer<typeof insertContentBlockSchema>;

export type Quiz = typeof quizzes.$inferSelect;
export type InsertQuiz = z.infer<typeof insertQuizSchema>;

export type QuizQuestion = typeof quizQuestions.$inferSelect;
export type InsertQuizQuestion = z.infer<typeof insertQuizQuestionSchema>;

export type QuizAttempt = typeof quizAttempts.$inferSelect;
export type InsertQuizAttempt = z.infer<typeof insertQuizAttemptSchema>;

export type UserGroup = typeof userGroups.$inferSelect;
export type InsertUserGroup = z.infer<typeof insertUserGroupSchema>;

export type GroupMember = typeof groupMembers.$inferSelect;
export type InsertGroupMember = z.infer<typeof insertGroupMemberSchema>;

export type TrainingPathway = typeof trainingPathways.$inferSelect;
export type InsertTrainingPathway = z.infer<typeof insertTrainingPathwaySchema>;

export type PathwayModule = typeof pathwayModules.$inferSelect;
export type InsertPathwayModule = z.infer<typeof insertPathwayModuleSchema>;

export type GroupPathwayAssignment = typeof groupPathwayAssignments.$inferSelect;
export type InsertGroupPathwayAssignment = z.infer<typeof insertGroupPathwayAssignmentSchema>;

export type UserPathwayAssignment = typeof userPathwayAssignments.$inferSelect;
export type InsertUserPathwayAssignment = z.infer<typeof insertUserPathwayAssignmentSchema>;

// Extended types for frontend use
export type ModuleWithProgress = Module & {
  status: 'not_started' | 'in_progress' | 'completed';
  lastAttemptScore?: number;
  sections?: ModuleSection[];
  contentBlocks?: ContentBlock[];
  quiz?: Quiz & { questions?: QuizQuestion[] };
};

export type QuizAttemptWithDetails = QuizAttempt & {
  user?: User;
  module?: Module;
  quiz?: Quiz;
};

export type UserGroupWithMembers = UserGroup & {
  members?: (GroupMember & { user?: User })[];
  memberCount?: number;
};

export type TrainingPathwayWithModules = TrainingPathway & {
  modules?: (PathwayModule & { module?: Module })[];
  moduleCount?: number;
};

export type UserWithProgress = User & {
  completedModules?: number;
  totalAttempts?: number;
  averageScore?: number;
  groups?: UserGroup[];
};

export type InlineAnswer = {
  blockId: number;
  selectedIndex: number;
  correct: boolean;
};
