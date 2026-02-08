import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, isAdmin } from "./auth";
import { z } from "zod";
import {
  insertModuleSchema,
  insertModuleSectionSchema,
  insertQuizQuestionSchema,
  insertUserGroupSchema,
  insertTrainingPathwaySchema,
  insertContentBlockSchema,
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
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
      const userId = req.user.id;
      const userRole = req.user.role;
      const modules = await storage.getModulesWithProgress(userId, userRole === "admin");
      res.json(modules);
    } catch (error) {
      console.error("Error fetching modules:", error);
      res.status(500).json({ message: "Failed to fetch modules" });
    }
  });

  // Get single module with full details
  app.get("/api/modules/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
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

  // Get user's assigned pathways
  app.get("/api/pathways", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const pathways = await storage.getUserAssignedPathways(userId);
      res.json(pathways);
    } catch (error) {
      console.error("Error fetching pathways:", error);
      res.status(500).json({ message: "Failed to fetch pathways" });
    }
  });

  // Submit quiz attempt (with inline answers support)
  app.post("/api/quiz-attempts", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { moduleId, quizId, answers, inlineAnswers } = req.body;

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

      // Calculate quiz score
      let correct = 0;
      for (let i = 0; i < questions.length; i++) {
        if (answers[i] === questions[i].correctOptionIndex) {
          correct++;
        }
      }

      const quizScore = Math.round((correct / questions.length) * 100);

      // Calculate inline score if inline answers provided
      let inlineScore: number | undefined;
      if (Array.isArray(inlineAnswers) && inlineAnswers.length > 0) {
        const correctInline = inlineAnswers.filter((a: any) => a.correct).length;
        inlineScore = Math.round((correctInline / inlineAnswers.length) * 100);
      }

      // Combined score (weighted average if both present)
      let finalScore = quizScore;
      if (inlineScore !== undefined) {
        // 50% inline, 50% final quiz
        finalScore = Math.round((inlineScore * 0.5) + (quizScore * 0.5));
      }

      const passed = finalScore >= quiz.passingScore;

      const attempt = await storage.createAttempt({
        userId,
        quizId,
        moduleId,
        score: finalScore,
        passed,
        answers,
        inlineAnswers: inlineAnswers || null,
        inlineScore: inlineScore || null,
      });

      res.json({
        score: finalScore,
        quizScore,
        inlineScore,
        passed,
        answers,
        inlineAnswers,
        passingScore: quiz.passingScore,
      });
    } catch (error) {
      console.error("Error submitting quiz:", error);
      res.status(500).json({ message: "Failed to submit quiz" });
    }
  });

  // =========== Step-based Module Routes ===========

  // Get module with steps (step-based learning)
  app.get("/api/modules/:id/steps", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const moduleId = parseInt(req.params.id);

      if (isNaN(moduleId)) {
        return res.status(400).json({ message: "Invalid module ID" });
      }

      const moduleWithSteps = await storage.getModuleWithSteps(moduleId, userId);

      if (!moduleWithSteps) {
        return res.status(404).json({ message: "Module not found" });
      }

      // Check if module is published or user is admin
      if (!moduleWithSteps.published) {
        const user = await storage.getUser(userId);
        if (user?.role !== "admin") {
          return res.status(404).json({ message: "Module not found" });
        }
      }

      res.json(moduleWithSteps);
    } catch (error) {
      console.error("Error fetching module with steps:", error);
      res.status(500).json({ message: "Failed to fetch module with steps" });
    }
  });

  // Submit step checkpoint
  app.post("/api/steps/:id/checkpoint", isAuthenticated, async (req: any, res) => {
    try {
      const stepId = parseInt(req.params.id);
      const userId = req.user.id;
      const { selectedAnswerIndex, checkpointId } = req.body;

      if (isNaN(stepId)) {
        return res.status(400).json({ message: "Invalid step ID" });
      }

      if (typeof selectedAnswerIndex !== "number") {
        return res.status(400).json({ message: "selectedAnswerIndex is required" });
      }

      // Check if step exists and user has access
      const step = await storage.getModuleStep(stepId);
      if (!step) {
        return res.status(404).json({ message: "Step not found" });
      }

      // Get module to check if user has access
      const moduleWithSteps = await storage.getModuleWithSteps(step.moduleId, userId);
      if (!moduleWithSteps) {
        return res.status(404).json({ message: "Module not found" });
      }

      // Check if step is unlocked for user
      const stepData = moduleWithSteps.steps.find(s => s.id === stepId);
      if (!stepData?.isUnlocked) {
        return res.status(403).json({ message: "Step is locked" });
      }

      const result = await storage.submitStepCheckpoint(userId, stepId, selectedAnswerIndex, checkpointId);

      // Get checkpoint to include correct answer info
      const checkpoints = await storage.getStepCheckpoints(stepId);
      let checkpoint = checkpoints[0];

      if (checkpointId) {
        const found = checkpoints.find(c => c.id === checkpointId);
        if (found) checkpoint = found;
      }

      res.json({
        ...result,
        correctAnswerIndex: checkpoint?.correctOptionIndex,
        explanation: checkpoint?.explanation,
      });
    } catch (error: any) {
      console.error("Error submitting checkpoint:", error);
      res.status(500).json({ message: error.message || "Failed to submit checkpoint" });
    }
  });

  // Mark step as complete (for steps without required checkpoints)
  app.post("/api/steps/:id/complete", isAuthenticated, async (req: any, res) => {
    try {
      const stepId = parseInt(req.params.id);
      const userId = req.user.id;

      if (isNaN(stepId)) {
        return res.status(400).json({ message: "Invalid step ID" });
      }

      // Check if step exists and user has access
      const step = await storage.getModuleStep(stepId);
      if (!step) {
        return res.status(404).json({ message: "Step not found" });
      }

      // Get module to check if user has access
      const moduleWithSteps = await storage.getModuleWithSteps(step.moduleId, userId);
      if (!moduleWithSteps) {
        return res.status(404).json({ message: "Module not found" });
      }

      // Check if step is unlocked for user
      const stepData = moduleWithSteps.steps.find(s => s.id === stepId);
      if (!stepData?.isUnlocked) {
        return res.status(403).json({ message: "Step is locked" });
      }

      const result = await storage.markStepComplete(userId, stepId);
      res.json(result);
    } catch (error: any) {
      console.error("Error marking step complete:", error);
      res.status(500).json({ message: error.message || "Failed to mark step complete" });
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
      const groups = await storage.getGroups();
      const pathways = await storage.getPathways();

      res.json({
        totalModules: allModules.length,
        publishedModules: publishedModules.length,
        totalUsers: userCount,
        totalAttempts: attemptCount,
        passRate: attemptCount > 0 ? Math.round((passedCount / attemptCount) * 100) : 0,
        totalGroups: groups.length,
        totalPathways: pathways.length,
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

  // =========== Admin Module Routes ===========

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
      const contentBlocksList = await storage.getContentBlocks(moduleId);
      res.json({ ...module, sections, contentBlocks: contentBlocksList });
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

  // @deprecated - Use /api/admin/modules/:id/steps instead
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

  // @deprecated - Use /api/admin/modules/:id/steps instead
  // Update module content blocks (admin)
  app.put("/api/admin/modules/:id/content-blocks", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const moduleId = parseInt(req.params.id);
      if (isNaN(moduleId)) {
        return res.status(400).json({ message: "Invalid module ID" });
      }

      const { blocks } = req.body;
      if (!Array.isArray(blocks)) {
        return res.status(400).json({ message: "Blocks must be an array" });
      }

      // Delete existing blocks that are not in the new list
      const existingIds = blocks.filter((b: any) => b.id).map((b: any) => b.id);
      const allBlocks = await storage.getContentBlocks(moduleId);

      for (const block of allBlocks) {
        if (!existingIds.includes(block.id)) {
          await storage.deleteContentBlock(block.id);
        }
      }

      // Create or update blocks
      const resultBlocks = [];
      for (let i = 0; i < blocks.length; i++) {
        const block = blocks[i];
        const blockData = {
          moduleId,
          blockType: block.blockType,
          order: i + 1,
          title: block.title || null,
          content: block.content || null,
          imageUrl: block.imageUrl || null,
          question: block.question || null,
          options: block.options || null,
          correctOptionIndex: block.correctOptionIndex ?? null,
          explanation: block.explanation || null,
        };

        if (block.id) {
          const updated = await storage.updateContentBlock(block.id, blockData);
          if (updated) resultBlocks.push(updated);
        } else {
          const created = await storage.createContentBlock(blockData);
          resultBlocks.push(created);
        }
      }

      res.json(resultBlocks);
    } catch (error) {
      console.error("Error updating content blocks:", error);
      res.status(500).json({ message: "Failed to update content blocks" });
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

  // =========== Admin Step Routes (Step-based modules) ===========

  // Get module steps (admin)
  app.get("/api/admin/modules/:id/steps", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const moduleId = parseInt(req.params.id);
      if (isNaN(moduleId)) {
        return res.status(400).json({ message: "Invalid module ID" });
      }

      const steps = await storage.getModuleSteps(moduleId);

      // Get content blocks and checkpoints for each step
      const stepsWithDetails = await Promise.all(
        steps.map(async (step) => {
          const contentBlocks = await storage.getStepContentBlocks(step.id);
          const checkpoints = await storage.getStepCheckpoints(step.id);
          return { ...step, contentBlocks, checkpoints };
        })
      );

      res.json(stepsWithDetails);
    } catch (error) {
      console.error("Error fetching steps:", error);
      res.status(500).json({ message: "Failed to fetch steps" });
    }
  });

  // Update module steps (admin) - full replace
  app.put("/api/admin/modules/:id/steps", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const moduleId = parseInt(req.params.id);
      if (isNaN(moduleId)) {
        return res.status(400).json({ message: "Invalid module ID" });
      }

      const { steps } = req.body;
      if (!Array.isArray(steps)) {
        return res.status(400).json({ message: "Steps must be an array" });
      }

      // Get existing steps
      const existingSteps = await storage.getModuleSteps(moduleId);
      const existingStepIds = new Set(existingSteps.map(s => s.id));
      const newStepIds = new Set(steps.filter((s: any) => s.id).map((s: any) => s.id));

      // Delete steps that are no longer in the list
      for (const existingStep of existingSteps) {
        if (!newStepIds.has(existingStep.id)) {
          // Delete content blocks and checkpoint first
          await storage.deleteStepContentBlocksByStepId(existingStep.id);
          await storage.deleteStepCheckpoint(existingStep.id);
          await storage.deleteModuleStep(existingStep.id);
        }
      }

      // Create or update steps
      const resultSteps = [];
      for (let i = 0; i < steps.length; i++) {
        const stepData = steps[i];
        const step = stepData.id && existingStepIds.has(stepData.id)
          ? await storage.updateModuleStep(stepData.id, {
            title: stepData.title,
            order: i + 1,
            checkpointRequired: stepData.checkpointRequired !== undefined ? stepData.checkpointRequired : true,
          })
          : await storage.createModuleStep({
            moduleId,
            title: stepData.title,
            order: i + 1,
            checkpointRequired: stepData.checkpointRequired !== undefined ? stepData.checkpointRequired : true,
          });

        if (!step) continue;

        // Handle content blocks
        const existingBlocks = await storage.getStepContentBlocks(step.id);
        const existingBlockIds = new Set(existingBlocks.map(b => b.id));
        const newBlockIds = new Set(
          (stepData.contentBlocks || []).filter((b: any) => b.id).map((b: any) => b.id)
        );

        // Delete removed blocks
        for (const existingBlock of existingBlocks) {
          if (!newBlockIds.has(existingBlock.id)) {
            await storage.deleteStepContentBlock(existingBlock.id);
          }
        }

        // Create or update content blocks
        const resultBlocks = [];
        const contentBlocks = stepData.contentBlocks || [];
        for (let j = 0; j < contentBlocks.length; j++) {
          const blockData = contentBlocks[j];
          const block = blockData.id && existingBlockIds.has(blockData.id)
            ? await storage.updateStepContentBlock(blockData.id, {
              blockType: blockData.blockType || 'text',
              content: blockData.content || null,
              imageUrl: blockData.imageUrl || null,
              order: j + 1,
            })
            : await storage.createStepContentBlock({
              stepId: step.id,
              blockType: blockData.blockType || 'text',
              content: blockData.content || null,
              imageUrl: blockData.imageUrl || null,
              order: j + 1,
            });
          if (block) resultBlocks.push(block);
        }

        // Handle checkpoints (multiple per step)
        let checkpoints: any[] = [];
        if (stepData.checkpoints && Array.isArray(stepData.checkpoints) && stepData.checkpoints.length > 0) {
          // New: multiple checkpoints format - delete existing and recreate
          await storage.deleteStepCheckpointsByStepId(step.id);
          for (let k = 0; k < stepData.checkpoints.length; k++) {
            const cp = stepData.checkpoints[k];
            if (cp.question && Array.isArray(cp.options) && cp.options.length >= 2) {
              const checkpoint = await storage.createStepCheckpoint({
                stepId: step.id,
                question: cp.question,
                options: cp.options,
                correctOptionIndex: cp.correctOptionIndex ?? 0,
                explanation: cp.explanation || null,
                order: k + 1,
              });
              checkpoints.push(checkpoint);
            }
          }
        } else if (stepData.checkpoint) {
          // Legacy: single checkpoint format - delete existing and recreate
          await storage.deleteStepCheckpointsByStepId(step.id);
          const cp = stepData.checkpoint;
          if (cp.question && Array.isArray(cp.options) && cp.options.length >= 2) {
            const checkpoint = await storage.createStepCheckpoint({
              stepId: step.id,
              question: cp.question,
              options: cp.options,
              correctOptionIndex: cp.correctOptionIndex ?? 0,
              explanation: cp.explanation || null,
              order: 1,
            });
            checkpoints.push(checkpoint);
          }
        }
        // If neither checkpoints nor checkpoint is provided with content, preserve existing checkpoints

        resultSteps.push({ ...step, contentBlocks: resultBlocks, checkpoints });
      }

      res.json(resultSteps);
    } catch (error) {
      console.error("Error updating steps:", error);
      res.status(500).json({ message: "Failed to update steps" });
    }
  });

  // =========== Admin User Routes ===========

  // Get all users with progress
  app.get("/api/admin/users", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const users = await storage.getUsersWithProgress();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Create new user (admin)
  app.post("/api/admin/users", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { username, password, email, firstName, lastName, role } = req.body;

      if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
      }

      // Check if username already exists
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(409).json({ message: "Username already exists" });
      }

      // Hash password and create user
      const { hashPassword } = await import("./auth");
      const hashedPassword = await hashPassword(password);
      const newUser = await storage.createUser({
        username,
        password: hashedPassword,
        email: email || null,
        firstName: firstName || null,
        lastName: lastName || null,
        role: role || "user",
      });

      res.status(201).json(newUser);
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  // Get single user with progress
  app.get("/api/admin/users/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const userId = req.params.id;
      const user = await storage.getUserWithProgress(userId);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const attempts = await storage.getAttemptsByUser(userId);
      res.json({ ...user, attempts });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Update user role
  app.patch("/api/admin/users/:id/role", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const userId = req.params.id;
      const { role } = req.body;

      if (!role || !["user", "admin"].includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }

      const user = await storage.updateUserRole(userId, role);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json(user);
    } catch (error) {
      console.error("Error updating user role:", error);
      res.status(500).json({ message: "Failed to update user role" });
    }
  });

  // =========== Admin Group Routes ===========

  // Get all groups
  app.get("/api/admin/groups", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const groups = await storage.getGroupsWithMembers();
      res.json(groups);
    } catch (error) {
      console.error("Error fetching groups:", error);
      res.status(500).json({ message: "Failed to fetch groups" });
    }
  });

  // Get single group
  app.get("/api/admin/groups/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const groupId = parseInt(req.params.id);
      if (isNaN(groupId)) {
        return res.status(400).json({ message: "Invalid group ID" });
      }

      const group = await storage.getGroupWithMembers(groupId);
      if (!group) {
        return res.status(404).json({ message: "Group not found" });
      }

      const assignments = await storage.getGroupPathwayAssignments(groupId);
      res.json({ ...group, pathwayAssignments: assignments });
    } catch (error) {
      console.error("Error fetching group:", error);
      res.status(500).json({ message: "Failed to fetch group" });
    }
  });

  // Create group
  app.post("/api/admin/groups", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const result = insertUserGroupSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid group data", errors: result.error.errors });
      }

      const group = await storage.createGroup(result.data);
      res.status(201).json(group);
    } catch (error) {
      console.error("Error creating group:", error);
      res.status(500).json({ message: "Failed to create group" });
    }
  });

  // Update group
  app.patch("/api/admin/groups/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const groupId = parseInt(req.params.id);
      if (isNaN(groupId)) {
        return res.status(400).json({ message: "Invalid group ID" });
      }

      const group = await storage.updateGroup(groupId, req.body);
      if (!group) {
        return res.status(404).json({ message: "Group not found" });
      }

      res.json(group);
    } catch (error) {
      console.error("Error updating group:", error);
      res.status(500).json({ message: "Failed to update group" });
    }
  });

  // Delete group
  app.delete("/api/admin/groups/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const groupId = parseInt(req.params.id);
      if (isNaN(groupId)) {
        return res.status(400).json({ message: "Invalid group ID" });
      }

      await storage.deleteGroup(groupId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting group:", error);
      res.status(500).json({ message: "Failed to delete group" });
    }
  });

  // Add member to group
  app.post("/api/admin/groups/:id/members", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const groupId = parseInt(req.params.id);
      if (isNaN(groupId)) {
        return res.status(400).json({ message: "Invalid group ID" });
      }

      const { userId } = req.body;
      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }

      const member = await storage.addGroupMember({ groupId, userId });
      res.status(201).json(member);
    } catch (error) {
      console.error("Error adding group member:", error);
      res.status(500).json({ message: "Failed to add group member" });
    }
  });

  // Remove member from group
  app.delete("/api/admin/groups/:id/members/:userId", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const groupId = parseInt(req.params.id);
      if (isNaN(groupId)) {
        return res.status(400).json({ message: "Invalid group ID" });
      }

      await storage.removeGroupMember(groupId, req.params.userId);
      res.status(204).send();
    } catch (error) {
      console.error("Error removing group member:", error);
      res.status(500).json({ message: "Failed to remove group member" });
    }
  });

  // =========== Admin Pathway Routes ===========

  // Get all pathways
  app.get("/api/admin/pathways", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const pathways = await storage.getPathwaysWithModules();
      res.json(pathways);
    } catch (error) {
      console.error("Error fetching pathways:", error);
      res.status(500).json({ message: "Failed to fetch pathways" });
    }
  });

  // Get single pathway
  app.get("/api/admin/pathways/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const pathwayId = parseInt(req.params.id);
      if (isNaN(pathwayId)) {
        return res.status(400).json({ message: "Invalid pathway ID" });
      }

      const pathway = await storage.getPathwayWithModules(pathwayId);
      if (!pathway) {
        return res.status(404).json({ message: "Pathway not found" });
      }

      res.json(pathway);
    } catch (error) {
      console.error("Error fetching pathway:", error);
      res.status(500).json({ message: "Failed to fetch pathway" });
    }
  });

  // Create pathway
  app.post("/api/admin/pathways", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const result = insertTrainingPathwaySchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid pathway data", errors: result.error.errors });
      }

      const pathway = await storage.createPathway(result.data);

      // Add modules to the pathway if moduleIds are provided
      const { moduleIds } = req.body;
      if (Array.isArray(moduleIds) && moduleIds.length > 0) {
        for (let i = 0; i < moduleIds.length; i++) {
          await storage.addPathwayModule({
            pathwayId: pathway.id,
            moduleId: moduleIds[i],
            order: i + 1,
          });
        }
      }

      // Return the pathway with modules
      const pathwayWithModules = await storage.getPathwayWithModules(pathway.id);
      res.status(201).json(pathwayWithModules);
    } catch (error) {
      console.error("Error creating pathway:", error);
      res.status(500).json({ message: "Failed to create pathway" });
    }
  });

  // Update pathway
  app.patch("/api/admin/pathways/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const pathwayId = parseInt(req.params.id);
      if (isNaN(pathwayId)) {
        return res.status(400).json({ message: "Invalid pathway ID" });
      }

      const pathway = await storage.updatePathway(pathwayId, req.body);
      if (!pathway) {
        return res.status(404).json({ message: "Pathway not found" });
      }

      res.json(pathway);
    } catch (error) {
      console.error("Error updating pathway:", error);
      res.status(500).json({ message: "Failed to update pathway" });
    }
  });

  // Delete pathway
  app.delete("/api/admin/pathways/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const pathwayId = parseInt(req.params.id);
      if (isNaN(pathwayId)) {
        return res.status(400).json({ message: "Invalid pathway ID" });
      }

      await storage.deletePathway(pathwayId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting pathway:", error);
      res.status(500).json({ message: "Failed to delete pathway" });
    }
  });

  // Update pathway modules
  app.put("/api/admin/pathways/:id/modules", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const pathwayId = parseInt(req.params.id);
      if (isNaN(pathwayId)) {
        return res.status(400).json({ message: "Invalid pathway ID" });
      }

      const { moduleIds } = req.body;
      if (!Array.isArray(moduleIds)) {
        return res.status(400).json({ message: "Module IDs must be an array" });
      }

      // Get current pathway modules
      const currentModules = await storage.getPathwayModules(pathwayId);
      const currentModuleIds = currentModules.map(pm => pm.moduleId);

      // Remove modules that are no longer in the list
      for (const moduleId of currentModuleIds) {
        if (!moduleIds.includes(moduleId)) {
          await storage.removePathwayModule(pathwayId, moduleId);
        }
      }

      // Add new modules
      for (let i = 0; i < moduleIds.length; i++) {
        if (!currentModuleIds.includes(moduleIds[i])) {
          await storage.addPathwayModule({
            pathwayId,
            moduleId: moduleIds[i],
            order: i + 1,
          });
        }
      }

      // Update order
      await storage.updatePathwayModuleOrder(pathwayId, moduleIds);

      const updatedPathway = await storage.getPathwayWithModules(pathwayId);
      res.json(updatedPathway);
    } catch (error) {
      console.error("Error updating pathway modules:", error);
      res.status(500).json({ message: "Failed to update pathway modules" });
    }
  });

  // Assign pathway to group
  app.post("/api/admin/pathways/:id/assign-group", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const pathwayId = parseInt(req.params.id);
      if (isNaN(pathwayId)) {
        return res.status(400).json({ message: "Invalid pathway ID" });
      }

      const { groupId, dueDate } = req.body;
      if (!groupId) {
        return res.status(400).json({ message: "Group ID is required" });
      }

      const assignment = await storage.assignPathwayToGroup({
        pathwayId,
        groupId,
        dueDate: dueDate ? new Date(dueDate) : null,
      });

      res.status(201).json(assignment);
    } catch (error) {
      console.error("Error assigning pathway to group:", error);
      res.status(500).json({ message: "Failed to assign pathway to group" });
    }
  });

  // Assign pathway to user
  app.post("/api/admin/pathways/:id/assign-user", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const pathwayId = parseInt(req.params.id);
      if (isNaN(pathwayId)) {
        return res.status(400).json({ message: "Invalid pathway ID" });
      }

      const { userId, dueDate } = req.body;
      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }

      const assignment = await storage.assignPathwayToUser({
        pathwayId,
        userId,
        dueDate: dueDate ? new Date(dueDate) : null,
      });

      res.status(201).json(assignment);
    } catch (error) {
      console.error("Error assigning pathway to user:", error);
      res.status(500).json({ message: "Failed to assign pathway to user" });
    }
  });

  // Remove pathway from group
  app.delete("/api/admin/pathways/:id/assign-group/:groupId", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const pathwayId = parseInt(req.params.id);
      const groupId = parseInt(req.params.groupId);

      if (isNaN(pathwayId) || isNaN(groupId)) {
        return res.status(400).json({ message: "Invalid IDs" });
      }

      await storage.removeGroupPathwayAssignment(groupId, pathwayId);
      res.status(204).send();
    } catch (error) {
      console.error("Error removing pathway from group:", error);
      res.status(500).json({ message: "Failed to remove pathway from group" });
    }
  });

  // Remove pathway from user
  app.delete("/api/admin/pathways/:id/assign-user/:userId", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const pathwayId = parseInt(req.params.id);

      if (isNaN(pathwayId)) {
        return res.status(400).json({ message: "Invalid pathway ID" });
      }

      await storage.removeUserPathwayAssignment(req.params.userId, pathwayId);
      res.status(204).send();
    } catch (error) {
      console.error("Error removing pathway from user:", error);
      res.status(500).json({ message: "Failed to remove pathway from user" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
