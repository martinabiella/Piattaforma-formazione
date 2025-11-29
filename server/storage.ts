import {
  users,
  modules,
  moduleSections,
  quizzes,
  quizQuestions,
  quizAttempts,
  type User,
  type UpsertUser,
  type Module,
  type InsertModule,
  type ModuleSection,
  type InsertModuleSection,
  type Quiz,
  type InsertQuiz,
  type QuizQuestion,
  type InsertQuizQuestion,
  type QuizAttempt,
  type InsertQuizAttempt,
  type ModuleWithProgress,
  type QuizAttemptWithDetails,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  getUserCount(): Promise<number>;
  
  // Module operations
  getModules(): Promise<Module[]>;
  getPublishedModules(): Promise<Module[]>;
  getModule(id: number): Promise<Module | undefined>;
  createModule(module: InsertModule): Promise<Module>;
  updateModule(id: number, module: Partial<InsertModule>): Promise<Module | undefined>;
  deleteModule(id: number): Promise<void>;
  
  // Section operations
  getSections(moduleId: number): Promise<ModuleSection[]>;
  createSection(section: InsertModuleSection): Promise<ModuleSection>;
  updateSection(id: number, section: Partial<InsertModuleSection>): Promise<ModuleSection | undefined>;
  deleteSection(id: number): Promise<void>;
  deleteSectionsByModuleId(moduleId: number): Promise<void>;
  
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
  getAttemptsByModule(moduleId: number): Promise<QuizAttemptWithDetails[]>;
  getAllAttempts(): Promise<QuizAttemptWithDetails[]>;
  getRecentAttempts(limit: number): Promise<QuizAttemptWithDetails[]>;
  getLastAttempt(userId: string, moduleId: number): Promise<QuizAttempt | undefined>;
  createAttempt(attempt: InsertQuizAttempt): Promise<QuizAttempt>;
  getAttemptCount(): Promise<number>;
  getPassedAttemptCount(): Promise<number>;
  
  // Combined operations
  getModuleWithProgress(moduleId: number, userId: string): Promise<ModuleWithProgress | undefined>;
  getModulesWithProgress(userId: string): Promise<ModuleWithProgress[]>;
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

  // Section operations
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
    const data = {
      ...attemptData,
      answers: [...attemptData.answers] as number[],
    };
    const [attempt] = await db.insert(quizAttempts).values(data).returning();
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

  // Combined operations
  async getModuleWithProgress(moduleId: number, userId: string): Promise<ModuleWithProgress | undefined> {
    const module = await this.getModule(moduleId);
    if (!module) return undefined;

    const sections = await this.getSections(moduleId);
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
}

export const storage = new DatabaseStorage();
