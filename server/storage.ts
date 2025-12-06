import {
  users,
  modules,
  moduleSections,
  contentBlocks,
  quizzes,
  quizQuestions,
  quizAttempts,
  userGroups,
  groupMembers,
  trainingPathways,
  pathwayModules,
  groupPathwayAssignments,
  userPathwayAssignments,
  type User,
  type UpsertUser,
  type Module,
  type InsertModule,
  type ModuleSection,
  type InsertModuleSection,
  type ContentBlock,
  type InsertContentBlock,
  type Quiz,
  type InsertQuiz,
  type QuizQuestion,
  type InsertQuizQuestion,
  type QuizAttempt,
  type InsertQuizAttempt,
  type UserGroup,
  type InsertUserGroup,
  type GroupMember,
  type InsertGroupMember,
  type TrainingPathway,
  type InsertTrainingPathway,
  type PathwayModule,
  type InsertPathwayModule,
  type GroupPathwayAssignment,
  type InsertGroupPathwayAssignment,
  type UserPathwayAssignment,
  type InsertUserPathwayAssignment,
  type ModuleWithProgress,
  type QuizAttemptWithDetails,
  type UserGroupWithMembers,
  type TrainingPathwayWithModules,
  type UserWithProgress,
  type InlineAnswer,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql, inArray } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  getUserCount(): Promise<number>;
  getAllUsers(): Promise<User[]>;
  getUsersWithProgress(): Promise<UserWithProgress[]>;
  getUserWithProgress(userId: string): Promise<UserWithProgress | undefined>;
  updateUserRole(userId: string, role: string): Promise<User | undefined>;
  
  // Module operations
  getModules(): Promise<Module[]>;
  getPublishedModules(): Promise<Module[]>;
  getModule(id: number): Promise<Module | undefined>;
  createModule(module: InsertModule): Promise<Module>;
  updateModule(id: number, module: Partial<InsertModule>): Promise<Module | undefined>;
  deleteModule(id: number): Promise<void>;
  
  // Section operations (legacy)
  getSections(moduleId: number): Promise<ModuleSection[]>;
  createSection(section: InsertModuleSection): Promise<ModuleSection>;
  updateSection(id: number, section: Partial<InsertModuleSection>): Promise<ModuleSection | undefined>;
  deleteSection(id: number): Promise<void>;
  deleteSectionsByModuleId(moduleId: number): Promise<void>;
  
  // Content Block operations (new block-based system)
  getContentBlocks(moduleId: number): Promise<ContentBlock[]>;
  getContentBlock(id: number): Promise<ContentBlock | undefined>;
  createContentBlock(block: InsertContentBlock): Promise<ContentBlock>;
  updateContentBlock(id: number, block: Partial<InsertContentBlock>): Promise<ContentBlock | undefined>;
  deleteContentBlock(id: number): Promise<void>;
  deleteContentBlocksByModuleId(moduleId: number): Promise<void>;
  
  // Quiz operations
  getQuiz(moduleId: number): Promise<Quiz | undefined>;
  getQuizById(id: number): Promise<Quiz | undefined>;
  createOrUpdateQuiz(moduleId: number, passingScore: number): Promise<Quiz>;
  
  // Quiz question operations
  getQuestions(quizId: number): Promise<QuizQuestion[]>;
  createQuestion(question: InsertQuizQuestion): Promise<QuizQuestion>;
  updateQuestion(id: number, question: Partial<InsertQuizQuestion>): Promise<QuizQuestion | undefined>;
  deleteQuestion(id: number): Promise<void>;
  deleteQuestionsByQuizId(quizId: number): Promise<void>;
  
  // Quiz attempt operations
  getAttempts(userId: string): Promise<QuizAttempt[]>;
  getAttemptsByUser(userId: string): Promise<QuizAttemptWithDetails[]>;
  getAttemptsByModule(moduleId: number): Promise<QuizAttemptWithDetails[]>;
  getAllAttempts(): Promise<QuizAttemptWithDetails[]>;
  getRecentAttempts(limit: number): Promise<QuizAttemptWithDetails[]>;
  getLastAttempt(userId: string, moduleId: number): Promise<QuizAttempt | undefined>;
  createAttempt(attempt: InsertQuizAttempt): Promise<QuizAttempt>;
  getAttemptCount(): Promise<number>;
  getPassedAttemptCount(): Promise<number>;
  
  // User Group operations
  getGroups(): Promise<UserGroup[]>;
  getGroupsWithMembers(): Promise<UserGroupWithMembers[]>;
  getGroup(id: number): Promise<UserGroup | undefined>;
  getGroupWithMembers(id: number): Promise<UserGroupWithMembers | undefined>;
  createGroup(group: InsertUserGroup): Promise<UserGroup>;
  updateGroup(id: number, group: Partial<InsertUserGroup>): Promise<UserGroup | undefined>;
  deleteGroup(id: number): Promise<void>;
  
  // Group Member operations
  getGroupMembers(groupId: number): Promise<(GroupMember & { user?: User })[]>;
  addGroupMember(member: InsertGroupMember): Promise<GroupMember>;
  removeGroupMember(groupId: number, userId: string): Promise<void>;
  getUserGroups(userId: string): Promise<UserGroup[]>;
  
  // Training Pathway operations
  getPathways(): Promise<TrainingPathway[]>;
  getPathwaysWithModules(): Promise<TrainingPathwayWithModules[]>;
  getPathway(id: number): Promise<TrainingPathway | undefined>;
  getPathwayWithModules(id: number): Promise<TrainingPathwayWithModules | undefined>;
  createPathway(pathway: InsertTrainingPathway): Promise<TrainingPathway>;
  updatePathway(id: number, pathway: Partial<InsertTrainingPathway>): Promise<TrainingPathway | undefined>;
  deletePathway(id: number): Promise<void>;
  
  // Pathway Module operations
  getPathwayModules(pathwayId: number): Promise<(PathwayModule & { module?: Module })[]>;
  addPathwayModule(pathwayModule: InsertPathwayModule): Promise<PathwayModule>;
  removePathwayModule(pathwayId: number, moduleId: number): Promise<void>;
  updatePathwayModuleOrder(pathwayId: number, moduleIds: number[]): Promise<void>;
  
  // Pathway Assignment operations
  getGroupPathwayAssignments(groupId: number): Promise<GroupPathwayAssignment[]>;
  getUserPathwayAssignments(userId: string): Promise<UserPathwayAssignment[]>;
  assignPathwayToGroup(assignment: InsertGroupPathwayAssignment): Promise<GroupPathwayAssignment>;
  assignPathwayToUser(assignment: InsertUserPathwayAssignment): Promise<UserPathwayAssignment>;
  removeGroupPathwayAssignment(groupId: number, pathwayId: number): Promise<void>;
  removeUserPathwayAssignment(userId: string, pathwayId: number): Promise<void>;
  
  // Combined operations
  getModuleWithProgress(moduleId: number, userId: string): Promise<ModuleWithProgress | undefined>;
  getModulesWithProgress(userId: string): Promise<ModuleWithProgress[]>;
  getUserAssignedPathways(userId: string): Promise<TrainingPathwayWithModules[]>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async getUserCount(): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` }).from(users);
    return Number(result[0]?.count ?? 0);
  }

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users).orderBy(users.createdAt);
  }

  async getUsersWithProgress(): Promise<UserWithProgress[]> {
    const allUsers = await this.getAllUsers();
    const result: UserWithProgress[] = [];
    
    for (const user of allUsers) {
      const attempts = await this.getAttempts(user.id);
      const passedAttempts = attempts.filter(a => a.passed);
      const uniqueCompletedModules = new Set(passedAttempts.map(a => a.moduleId));
      const avgScore = attempts.length > 0 
        ? Math.round(attempts.reduce((sum, a) => sum + a.score, 0) / attempts.length)
        : 0;
      const userGroups = await this.getUserGroups(user.id);
      
      result.push({
        ...user,
        completedModules: uniqueCompletedModules.size,
        totalAttempts: attempts.length,
        averageScore: avgScore,
        groups: userGroups,
      });
    }
    
    return result;
  }

  async getUserWithProgress(userId: string): Promise<UserWithProgress | undefined> {
    const user = await this.getUser(userId);
    if (!user) return undefined;
    
    const attempts = await this.getAttempts(userId);
    const passedAttempts = attempts.filter(a => a.passed);
    const uniqueCompletedModules = new Set(passedAttempts.map(a => a.moduleId));
    const avgScore = attempts.length > 0 
      ? Math.round(attempts.reduce((sum, a) => sum + a.score, 0) / attempts.length)
      : 0;
    const userGroupsList = await this.getUserGroups(userId);
    
    return {
      ...user,
      completedModules: uniqueCompletedModules.size,
      totalAttempts: attempts.length,
      averageScore: avgScore,
      groups: userGroupsList,
    };
  }

  async updateUserRole(userId: string, role: string): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ role, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  // Module operations
  async getModules(): Promise<Module[]> {
    return db.select().from(modules).orderBy(modules.order);
  }

  async getPublishedModules(): Promise<Module[]> {
    return db.select().from(modules).where(eq(modules.published, true)).orderBy(modules.order);
  }

  async getModule(id: number): Promise<Module | undefined> {
    const [module] = await db.select().from(modules).where(eq(modules.id, id));
    return module;
  }

  async createModule(moduleData: InsertModule): Promise<Module> {
    const [module] = await db.insert(modules).values(moduleData).returning();
    return module;
  }

  async updateModule(id: number, moduleData: Partial<InsertModule>): Promise<Module | undefined> {
    const [module] = await db
      .update(modules)
      .set({ ...moduleData, updatedAt: new Date() })
      .where(eq(modules.id, id))
      .returning();
    return module;
  }

  async deleteModule(id: number): Promise<void> {
    await db.delete(modules).where(eq(modules.id, id));
  }

  // Section operations (legacy)
  async getSections(moduleId: number): Promise<ModuleSection[]> {
    return db.select().from(moduleSections).where(eq(moduleSections.moduleId, moduleId)).orderBy(moduleSections.order);
  }

  async createSection(sectionData: InsertModuleSection): Promise<ModuleSection> {
    const [section] = await db.insert(moduleSections).values(sectionData).returning();
    return section;
  }

  async updateSection(id: number, sectionData: Partial<InsertModuleSection>): Promise<ModuleSection | undefined> {
    const [section] = await db
      .update(moduleSections)
      .set({ ...sectionData, updatedAt: new Date() })
      .where(eq(moduleSections.id, id))
      .returning();
    return section;
  }

  async deleteSection(id: number): Promise<void> {
    await db.delete(moduleSections).where(eq(moduleSections.id, id));
  }

  async deleteSectionsByModuleId(moduleId: number): Promise<void> {
    await db.delete(moduleSections).where(eq(moduleSections.moduleId, moduleId));
  }

  // Content Block operations
  async getContentBlocks(moduleId: number): Promise<ContentBlock[]> {
    return db.select().from(contentBlocks).where(eq(contentBlocks.moduleId, moduleId)).orderBy(contentBlocks.order);
  }

  async getContentBlock(id: number): Promise<ContentBlock | undefined> {
    const [block] = await db.select().from(contentBlocks).where(eq(contentBlocks.id, id));
    return block;
  }

  async createContentBlock(blockData: InsertContentBlock): Promise<ContentBlock> {
    const data: Record<string, unknown> = { ...blockData };
    if (blockData.options) {
      data.options = [...blockData.options] as string[];
    }
    const [block] = await db.insert(contentBlocks).values(data as InsertContentBlock).returning();
    return block;
  }

  async updateContentBlock(id: number, blockData: Partial<InsertContentBlock>): Promise<ContentBlock | undefined> {
    const data: Record<string, unknown> = { ...blockData, updatedAt: new Date() };
    if (blockData.options) {
      data.options = [...blockData.options] as string[];
    }
    const [block] = await db
      .update(contentBlocks)
      .set(data)
      .where(eq(contentBlocks.id, id))
      .returning();
    return block;
  }

  async deleteContentBlock(id: number): Promise<void> {
    await db.delete(contentBlocks).where(eq(contentBlocks.id, id));
  }

  async deleteContentBlocksByModuleId(moduleId: number): Promise<void> {
    await db.delete(contentBlocks).where(eq(contentBlocks.moduleId, moduleId));
  }

  // Quiz operations
  async getQuiz(moduleId: number): Promise<Quiz | undefined> {
    const [quiz] = await db.select().from(quizzes).where(eq(quizzes.moduleId, moduleId));
    return quiz;
  }

  async getQuizById(id: number): Promise<Quiz | undefined> {
    const [quiz] = await db.select().from(quizzes).where(eq(quizzes.id, id));
    return quiz;
  }

  async createOrUpdateQuiz(moduleId: number, passingScore: number): Promise<Quiz> {
    const existing = await this.getQuiz(moduleId);
    if (existing) {
      const [quiz] = await db
        .update(quizzes)
        .set({ passingScore, updatedAt: new Date() })
        .where(eq(quizzes.id, existing.id))
        .returning();
      return quiz;
    }
    const [quiz] = await db.insert(quizzes).values({ moduleId, passingScore }).returning();
    return quiz;
  }

  // Quiz question operations
  async getQuestions(quizId: number): Promise<QuizQuestion[]> {
    return db.select().from(quizQuestions).where(eq(quizQuestions.quizId, quizId)).orderBy(quizQuestions.order);
  }

  async createQuestion(questionData: InsertQuizQuestion): Promise<QuizQuestion> {
    const data = {
      ...questionData,
      options: [...questionData.options] as string[],
    };
    const [question] = await db.insert(quizQuestions).values(data).returning();
    return question;
  }

  async updateQuestion(id: number, questionData: Partial<InsertQuizQuestion>): Promise<QuizQuestion | undefined> {
    const data: Record<string, unknown> = { ...questionData, updatedAt: new Date() };
    if (questionData.options) {
      data.options = [...questionData.options] as string[];
    }
    const [question] = await db
      .update(quizQuestions)
      .set(data)
      .where(eq(quizQuestions.id, id))
      .returning();
    return question;
  }

  async deleteQuestion(id: number): Promise<void> {
    await db.delete(quizQuestions).where(eq(quizQuestions.id, id));
  }

  async deleteQuestionsByQuizId(quizId: number): Promise<void> {
    await db.delete(quizQuestions).where(eq(quizQuestions.quizId, quizId));
  }

  // Quiz attempt operations
  async getAttempts(userId: string): Promise<QuizAttempt[]> {
    return db.select().from(quizAttempts).where(eq(quizAttempts.userId, userId)).orderBy(desc(quizAttempts.createdAt));
  }

  async getAttemptsByUser(userId: string): Promise<QuizAttemptWithDetails[]> {
    const attempts = await db.select().from(quizAttempts).where(eq(quizAttempts.userId, userId)).orderBy(desc(quizAttempts.createdAt));
    
    const result: QuizAttemptWithDetails[] = [];
    for (const attempt of attempts) {
      const user = await this.getUser(attempt.userId);
      const module = await this.getModule(attempt.moduleId);
      const quiz = await this.getQuizById(attempt.quizId);
      result.push({ ...attempt, user, module, quiz });
    }
    return result;
  }

  async getAttemptsByModule(moduleId: number): Promise<QuizAttemptWithDetails[]> {
    const attempts = await db.select().from(quizAttempts).where(eq(quizAttempts.moduleId, moduleId)).orderBy(desc(quizAttempts.createdAt));
    
    const result: QuizAttemptWithDetails[] = [];
    for (const attempt of attempts) {
      const user = await this.getUser(attempt.userId);
      const module = await this.getModule(attempt.moduleId);
      const quiz = await this.getQuizById(attempt.quizId);
      result.push({ ...attempt, user, module, quiz });
    }
    return result;
  }

  async getAllAttempts(): Promise<QuizAttemptWithDetails[]> {
    const attempts = await db.select().from(quizAttempts).orderBy(desc(quizAttempts.createdAt));
    
    const result: QuizAttemptWithDetails[] = [];
    for (const attempt of attempts) {
      const user = await this.getUser(attempt.userId);
      const module = await this.getModule(attempt.moduleId);
      const quiz = await this.getQuizById(attempt.quizId);
      result.push({ ...attempt, user, module, quiz });
    }
    return result;
  }

  async getRecentAttempts(limit: number): Promise<QuizAttemptWithDetails[]> {
    const attempts = await db.select().from(quizAttempts).orderBy(desc(quizAttempts.createdAt)).limit(limit);
    
    const result: QuizAttemptWithDetails[] = [];
    for (const attempt of attempts) {
      const user = await this.getUser(attempt.userId);
      const module = await this.getModule(attempt.moduleId);
      const quiz = await this.getQuizById(attempt.quizId);
      result.push({ ...attempt, user, module, quiz });
    }
    return result;
  }

  async getLastAttempt(userId: string, moduleId: number): Promise<QuizAttempt | undefined> {
    const [attempt] = await db
      .select()
      .from(quizAttempts)
      .where(and(eq(quizAttempts.userId, userId), eq(quizAttempts.moduleId, moduleId)))
      .orderBy(desc(quizAttempts.createdAt))
      .limit(1);
    return attempt;
  }

  async createAttempt(attemptData: InsertQuizAttempt): Promise<QuizAttempt> {
    const data: Record<string, unknown> = {
      ...attemptData,
      answers: [...attemptData.answers] as number[],
    };
    if (attemptData.inlineAnswers) {
      data.inlineAnswers = [...attemptData.inlineAnswers] as InlineAnswer[];
    }
    const [attempt] = await db.insert(quizAttempts).values(data as InsertQuizAttempt).returning();
    return attempt;
  }

  async getAttemptCount(): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` }).from(quizAttempts);
    return Number(result[0]?.count ?? 0);
  }

  async getPassedAttemptCount(): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` }).from(quizAttempts).where(eq(quizAttempts.passed, true));
    return Number(result[0]?.count ?? 0);
  }

  // User Group operations
  async getGroups(): Promise<UserGroup[]> {
    return db.select().from(userGroups).orderBy(userGroups.name);
  }

  async getGroupsWithMembers(): Promise<UserGroupWithMembers[]> {
    const groups = await this.getGroups();
    const result: UserGroupWithMembers[] = [];
    
    for (const group of groups) {
      const members = await this.getGroupMembers(group.id);
      result.push({
        ...group,
        members,
        memberCount: members.length,
      });
    }
    
    return result;
  }

  async getGroup(id: number): Promise<UserGroup | undefined> {
    const [group] = await db.select().from(userGroups).where(eq(userGroups.id, id));
    return group;
  }

  async getGroupWithMembers(id: number): Promise<UserGroupWithMembers | undefined> {
    const group = await this.getGroup(id);
    if (!group) return undefined;
    
    const members = await this.getGroupMembers(id);
    return {
      ...group,
      members,
      memberCount: members.length,
    };
  }

  async createGroup(groupData: InsertUserGroup): Promise<UserGroup> {
    const [group] = await db.insert(userGroups).values(groupData).returning();
    return group;
  }

  async updateGroup(id: number, groupData: Partial<InsertUserGroup>): Promise<UserGroup | undefined> {
    const [group] = await db
      .update(userGroups)
      .set({ ...groupData, updatedAt: new Date() })
      .where(eq(userGroups.id, id))
      .returning();
    return group;
  }

  async deleteGroup(id: number): Promise<void> {
    await db.delete(userGroups).where(eq(userGroups.id, id));
  }

  // Group Member operations
  async getGroupMembers(groupId: number): Promise<(GroupMember & { user?: User })[]> {
    const members = await db.select().from(groupMembers).where(eq(groupMembers.groupId, groupId));
    const result: (GroupMember & { user?: User })[] = [];
    
    for (const member of members) {
      const user = await this.getUser(member.userId);
      result.push({ ...member, user });
    }
    
    return result;
  }

  async addGroupMember(memberData: InsertGroupMember): Promise<GroupMember> {
    const [member] = await db.insert(groupMembers).values(memberData).returning();
    return member;
  }

  async removeGroupMember(groupId: number, userId: string): Promise<void> {
    await db.delete(groupMembers).where(
      and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId))
    );
  }

  async getUserGroups(userId: string): Promise<UserGroup[]> {
    const memberships = await db.select().from(groupMembers).where(eq(groupMembers.userId, userId));
    if (memberships.length === 0) return [];
    
    const groupIds = memberships.map(m => m.groupId);
    return db.select().from(userGroups).where(inArray(userGroups.id, groupIds));
  }

  // Training Pathway operations
  async getPathways(): Promise<TrainingPathway[]> {
    return db.select().from(trainingPathways).orderBy(trainingPathways.name);
  }

  async getPathwaysWithModules(): Promise<TrainingPathwayWithModules[]> {
    const pathways = await this.getPathways();
    const result: TrainingPathwayWithModules[] = [];
    
    for (const pathway of pathways) {
      const pathwayMods = await this.getPathwayModules(pathway.id);
      result.push({
        ...pathway,
        modules: pathwayMods,
        moduleCount: pathwayMods.length,
      });
    }
    
    return result;
  }

  async getPathway(id: number): Promise<TrainingPathway | undefined> {
    const [pathway] = await db.select().from(trainingPathways).where(eq(trainingPathways.id, id));
    return pathway;
  }

  async getPathwayWithModules(id: number): Promise<TrainingPathwayWithModules | undefined> {
    const pathway = await this.getPathway(id);
    if (!pathway) return undefined;
    
    const pathwayMods = await this.getPathwayModules(id);
    return {
      ...pathway,
      modules: pathwayMods,
      moduleCount: pathwayMods.length,
    };
  }

  async createPathway(pathwayData: InsertTrainingPathway): Promise<TrainingPathway> {
    const [pathway] = await db.insert(trainingPathways).values(pathwayData).returning();
    return pathway;
  }

  async updatePathway(id: number, pathwayData: Partial<InsertTrainingPathway>): Promise<TrainingPathway | undefined> {
    const [pathway] = await db
      .update(trainingPathways)
      .set({ ...pathwayData, updatedAt: new Date() })
      .where(eq(trainingPathways.id, id))
      .returning();
    return pathway;
  }

  async deletePathway(id: number): Promise<void> {
    await db.delete(trainingPathways).where(eq(trainingPathways.id, id));
  }

  // Pathway Module operations
  async getPathwayModules(pathwayId: number): Promise<(PathwayModule & { module?: Module })[]> {
    const pathwayMods = await db.select().from(pathwayModules)
      .where(eq(pathwayModules.pathwayId, pathwayId))
      .orderBy(pathwayModules.order);
    
    const result: (PathwayModule & { module?: Module })[] = [];
    for (const pm of pathwayMods) {
      const module = await this.getModule(pm.moduleId);
      result.push({ ...pm, module });
    }
    
    return result;
  }

  async addPathwayModule(pathwayModuleData: InsertPathwayModule): Promise<PathwayModule> {
    const [pm] = await db.insert(pathwayModules).values(pathwayModuleData).returning();
    return pm;
  }

  async removePathwayModule(pathwayId: number, moduleId: number): Promise<void> {
    await db.delete(pathwayModules).where(
      and(eq(pathwayModules.pathwayId, pathwayId), eq(pathwayModules.moduleId, moduleId))
    );
  }

  async updatePathwayModuleOrder(pathwayId: number, moduleIds: number[]): Promise<void> {
    for (let i = 0; i < moduleIds.length; i++) {
      await db.update(pathwayModules)
        .set({ order: i + 1 })
        .where(and(eq(pathwayModules.pathwayId, pathwayId), eq(pathwayModules.moduleId, moduleIds[i])));
    }
  }

  // Pathway Assignment operations
  async getGroupPathwayAssignments(groupId: number): Promise<GroupPathwayAssignment[]> {
    return db.select().from(groupPathwayAssignments).where(eq(groupPathwayAssignments.groupId, groupId));
  }

  async getUserPathwayAssignments(userId: string): Promise<UserPathwayAssignment[]> {
    return db.select().from(userPathwayAssignments).where(eq(userPathwayAssignments.userId, userId));
  }

  async assignPathwayToGroup(assignmentData: InsertGroupPathwayAssignment): Promise<GroupPathwayAssignment> {
    const [assignment] = await db.insert(groupPathwayAssignments).values(assignmentData).returning();
    return assignment;
  }

  async assignPathwayToUser(assignmentData: InsertUserPathwayAssignment): Promise<UserPathwayAssignment> {
    const [assignment] = await db.insert(userPathwayAssignments).values(assignmentData).returning();
    return assignment;
  }

  async removeGroupPathwayAssignment(groupId: number, pathwayId: number): Promise<void> {
    await db.delete(groupPathwayAssignments).where(
      and(eq(groupPathwayAssignments.groupId, groupId), eq(groupPathwayAssignments.pathwayId, pathwayId))
    );
  }

  async removeUserPathwayAssignment(userId: string, pathwayId: number): Promise<void> {
    await db.delete(userPathwayAssignments).where(
      and(eq(userPathwayAssignments.userId, userId), eq(userPathwayAssignments.pathwayId, pathwayId))
    );
  }

  // Combined operations
  async getModuleWithProgress(moduleId: number, userId: string): Promise<ModuleWithProgress | undefined> {
    const module = await this.getModule(moduleId);
    if (!module) return undefined;

    const sections = await this.getSections(moduleId);
    const blocks = await this.getContentBlocks(moduleId);
    const quiz = await this.getQuiz(moduleId);
    const questions = quiz ? await this.getQuestions(quiz.id) : [];
    const lastAttempt = await this.getLastAttempt(userId, moduleId);

    let status: 'not_started' | 'in_progress' | 'completed' = 'not_started';
    if (lastAttempt?.passed) {
      status = 'completed';
    } else if (lastAttempt) {
      status = 'in_progress';
    }

    return {
      ...module,
      status,
      lastAttemptScore: lastAttempt?.score,
      sections,
      contentBlocks: blocks,
      quiz: quiz ? { ...quiz, questions } : undefined,
    };
  }

  async getModulesWithProgress(userId: string): Promise<ModuleWithProgress[]> {
    const mods = await this.getPublishedModules();
    const result: ModuleWithProgress[] = [];

    for (const mod of mods) {
      const lastAttempt = await this.getLastAttempt(userId, mod.id);
      
      let status: 'not_started' | 'in_progress' | 'completed' = 'not_started';
      if (lastAttempt?.passed) {
        status = 'completed';
      } else if (lastAttempt) {
        status = 'in_progress';
      }

      result.push({
        ...mod,
        status,
        lastAttemptScore: lastAttempt?.score,
      });
    }

    return result;
  }

  async getUserAssignedPathways(userId: string): Promise<TrainingPathwayWithModules[]> {
    // Get direct user assignments
    const directAssignments = await this.getUserPathwayAssignments(userId);
    
    // Get group assignments
    const userGroupsList = await this.getUserGroups(userId);
    const groupPathwayIds: number[] = [];
    for (const group of userGroupsList) {
      const groupAssignments = await this.getGroupPathwayAssignments(group.id);
      groupPathwayIds.push(...groupAssignments.map(a => a.pathwayId));
    }
    
    // Combine unique pathway IDs
    const allPathwayIds = new Set([
      ...directAssignments.map(a => a.pathwayId),
      ...groupPathwayIds,
    ]);
    
    // Get full pathway details
    const result: TrainingPathwayWithModules[] = [];
    for (const pathwayId of allPathwayIds) {
      const pathway = await this.getPathwayWithModules(pathwayId);
      if (pathway && pathway.published) {
        result.push(pathway);
      }
    }
    
    return result;
  }
}

export const storage = new DatabaseStorage();
