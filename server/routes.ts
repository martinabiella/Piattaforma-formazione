import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, isAdmin } from "./replitAuth";
import { z } from "zod";
import {
  insertModuleSchema,
  insertModuleSectionSchema,
  insertQuizQuestionSchema,
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // =========== User Routes ===========

  // Get published modules with user progress
  app.get("/api/modules", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const modules = await storage.getModulesWithProgress(userId);
      res.json(modules);
    } catch (error) {
      console.error("Error fetching modules:", error);
      res.status(500).json({ message: "Failed to fetch modules" });
    }
  });

  // Get single module with full details
  app.get("/api/modules/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const moduleId = parseInt(req.params.id);
      
      if (isNaN(moduleId)) {
        return res.status(400).json({ message: "Invalid module ID" });
      }

      const module = await storage.getModuleWithProgress(moduleId, userId);
      
      if (!module) {
        return res.status(404).json({ message: "Module not found" });
      }

      if (!module.published) {
        // Check if user is admin
        const user = await storage.getUser(userId);
        if (user?.role !== "admin") {
          return res.status(404).json({ message: "Module not found" });
        }
      }

      res.json(module);
    } catch (error) {
      console.error("Error fetching module:", error);
      res.status(500).json({ message: "Failed to fetch module" });
    }
  });

  // Submit quiz attempt
  app.post("/api/quiz-attempts", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { moduleId, quizId, answers } = req.body;

      if (!moduleId || !quizId || !Array.isArray(answers)) {
        return res.status(400).json({ message: "Invalid request body" });
      }

      const quiz = await storage.getQuizById(quizId);
      if (!quiz) {
        return res.status(404).json({ message: "Quiz not found" });
      }

      const questions = await storage.getQuestions(quizId);
      if (answers.length !== questions.length) {
        return res.status(400).json({ message: "Answer count doesn't match question count" });
      }

      // Calculate score
      let correct = 0;
      for (let i = 0; i < questions.length; i++) {
        if (answers[i] === questions[i].correctOptionIndex) {
          correct++;
        }
      }
      
      const score = Math.round((correct / questions.length) * 100);
      const passed = score >= quiz.passingScore;

      const attempt = await storage.createAttempt({
        userId,
        quizId,
        moduleId,
        score,
        passed,
        answers,
      });

      res.json({
        score,
        passed,
        answers,
        passingScore: quiz.passingScore,
      });
    } catch (error) {
      console.error("Error submitting quiz:", error);
      res.status(500).json({ message: "Failed to submit quiz" });
    }
  });

  // =========== Admin Routes ===========

  // Admin stats
  app.get("/api/admin/stats", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const allModules = await storage.getModules();
      const publishedModules = await storage.getPublishedModules();
      const userCount = await storage.getUserCount();
      const attemptCount = await storage.getAttemptCount();
      const passedCount = await storage.getPassedAttemptCount();

      res.json({
        totalModules: allModules.length,
        publishedModules: publishedModules.length,
        totalUsers: userCount,
        totalAttempts: attemptCount,
        passRate: attemptCount > 0 ? Math.round((passedCount / attemptCount) * 100) : 0,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  // Recent attempts
  app.get("/api/admin/recent-attempts", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const attempts = await storage.getRecentAttempts(10);
      res.json(attempts);
    } catch (error) {
      console.error("Error fetching recent attempts:", error);
      res.status(500).json({ message: "Failed to fetch recent attempts" });
    }
  });

  // Get all modules (admin)
  app.get("/api/admin/modules", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const modules = await storage.getModules();
      res.json(modules);
    } catch (error) {
      console.error("Error fetching modules:", error);
      res.status(500).json({ message: "Failed to fetch modules" });
    }
  });

  // Get single module (admin)
  app.get("/api/admin/modules/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const moduleId = parseInt(req.params.id);
      if (isNaN(moduleId)) {
        return res.status(400).json({ message: "Invalid module ID" });
      }

      const module = await storage.getModule(moduleId);
      if (!module) {
        return res.status(404).json({ message: "Module not found" });
      }

      const sections = await storage.getSections(moduleId);
      res.json({ ...module, sections });
    } catch (error) {
      console.error("Error fetching module:", error);
      res.status(500).json({ message: "Failed to fetch module" });
    }
  });

  // Get module with quiz (admin)
  app.get("/api/admin/modules/:id/quiz", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const moduleId = parseInt(req.params.id);
      if (isNaN(moduleId)) {
        return res.status(400).json({ message: "Invalid module ID" });
      }

      const module = await storage.getModule(moduleId);
      if (!module) {
        return res.status(404).json({ message: "Module not found" });
      }

      const quiz = await storage.getQuiz(moduleId);
      const questions = quiz ? await storage.getQuestions(quiz.id) : [];

      res.json({
        ...module,
        quiz: quiz ? { ...quiz, questions } : null,
      });
    } catch (error) {
      console.error("Error fetching module quiz:", error);
      res.status(500).json({ message: "Failed to fetch module quiz" });
    }
  });

  // Create module (admin)
  app.post("/api/admin/modules", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const result = insertModuleSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid module data", errors: result.error.errors });
      }

      const module = await storage.createModule(result.data);
      
      // Create empty quiz for the module
      await storage.createOrUpdateQuiz(module.id, 70);
      
      res.status(201).json(module);
    } catch (error) {
      console.error("Error creating module:", error);
      res.status(500).json({ message: "Failed to create module" });
    }
  });

  // Update module (admin)
  app.patch("/api/admin/modules/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const moduleId = parseInt(req.params.id);
      if (isNaN(moduleId)) {
        return res.status(400).json({ message: "Invalid module ID" });
      }

      const module = await storage.updateModule(moduleId, req.body);
      if (!module) {
        return res.status(404).json({ message: "Module not found" });
      }

      res.json(module);
    } catch (error) {
      console.error("Error updating module:", error);
      res.status(500).json({ message: "Failed to update module" });
    }
  });

  // Delete module (admin)
  app.delete("/api/admin/modules/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const moduleId = parseInt(req.params.id);
      if (isNaN(moduleId)) {
        return res.status(400).json({ message: "Invalid module ID" });
      }

      await storage.deleteModule(moduleId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting module:", error);
      res.status(500).json({ message: "Failed to delete module" });
    }
  });

  // Update module sections (admin)
  app.put("/api/admin/modules/:id/sections", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const moduleId = parseInt(req.params.id);
      if (isNaN(moduleId)) {
        return res.status(400).json({ message: "Invalid module ID" });
      }

      const { sections } = req.body;
      if (!Array.isArray(sections)) {
        return res.status(400).json({ message: "Sections must be an array" });
      }

      // Delete existing sections that are not in the new list
      const existingIds = sections.filter((s: any) => s.id).map((s: any) => s.id);
      const allSections = await storage.getSections(moduleId);
      
      for (const section of allSections) {
        if (!existingIds.includes(section.id)) {
          await storage.deleteSection(section.id);
        }
      }

      // Create or update sections
      const resultSections = [];
      for (const section of sections) {
        if (section.id) {
          const updated = await storage.updateSection(section.id, {
            title: section.title,
            content: section.content,
            imageUrl: section.imageUrl,
            order: section.order,
          });
          if (updated) resultSections.push(updated);
        } else {
          const created = await storage.createSection({
            moduleId,
            title: section.title,
            content: section.content,
            imageUrl: section.imageUrl,
            order: section.order,
          });
          resultSections.push(created);
        }
      }

      res.json(resultSections);
    } catch (error) {
      console.error("Error updating sections:", error);
      res.status(500).json({ message: "Failed to update sections" });
    }
  });

  // Update quiz (admin)
  app.put("/api/admin/modules/:id/quiz", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const moduleId = parseInt(req.params.id);
      if (isNaN(moduleId)) {
        return res.status(400).json({ message: "Invalid module ID" });
      }

      const { passingScore, questions } = req.body;
      
      if (typeof passingScore !== "number" || passingScore < 1 || passingScore > 100) {
        return res.status(400).json({ message: "Invalid passing score" });
      }

      if (!Array.isArray(questions)) {
        return res.status(400).json({ message: "Questions must be an array" });
      }

      // Create or update quiz
      const quiz = await storage.createOrUpdateQuiz(moduleId, passingScore);

      // Delete existing questions that are not in the new list
      const existingIds = questions.filter((q: any) => q.id).map((q: any) => q.id);
      const allQuestions = await storage.getQuestions(quiz.id);
      
      for (const question of allQuestions) {
        if (!existingIds.includes(question.id)) {
          await storage.deleteQuestion(question.id);
        }
      }

      // Create or update questions
      const resultQuestions = [];
      for (const question of questions) {
        if (!question.question || !Array.isArray(question.options) || question.options.length !== 4) {
          continue;
        }

        if (question.id) {
          const updated = await storage.updateQuestion(question.id, {
            question: question.question,
            options: question.options,
            correctOptionIndex: question.correctOptionIndex,
            order: question.order,
          });
          if (updated) resultQuestions.push(updated);
        } else {
          const created = await storage.createQuestion({
            quizId: quiz.id,
            question: question.question,
            options: question.options,
            correctOptionIndex: question.correctOptionIndex,
            order: question.order,
          });
          resultQuestions.push(created);
        }
      }

      res.json({ ...quiz, questions: resultQuestions });
    } catch (error) {
      console.error("Error updating quiz:", error);
      res.status(500).json({ message: "Failed to update quiz" });
    }
  });

  // Get all quiz attempts (admin)
  app.get("/api/admin/quiz-attempts", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const attempts = await storage.getAllAttempts();
      res.json(attempts);
    } catch (error) {
      console.error("Error fetching attempts:", error);
      res.status(500).json({ message: "Failed to fetch attempts" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
