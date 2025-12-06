import { db } from "../server/db";
import { moduleSections, contentBlocks, modules, trainingPathways, pathwayModules } from "../shared/schema";
import { eq } from "drizzle-orm";

async function migrateToBlocks() {
  console.log("Starting migration to content blocks...");

  // Get all modules
  const allModules = await db.select().from(modules);
  console.log(`Found ${allModules.length} modules`);

  for (const module of allModules) {
    // Get sections for this module
    const sections = await db.select().from(moduleSections).where(eq(moduleSections.moduleId, module.id));
    
    // Check if content blocks already exist for this module
    const existingBlocks = await db.select().from(contentBlocks).where(eq(contentBlocks.moduleId, module.id));
    
    if (existingBlocks.length > 0) {
      console.log(`Module ${module.id} already has ${existingBlocks.length} content blocks, skipping...`);
      continue;
    }

    console.log(`Converting ${sections.length} sections to content blocks for module ${module.id}...`);

    // Convert each section to a text content block
    for (const section of sections) {
      await db.insert(contentBlocks).values({
        moduleId: module.id,
        blockType: "text",
        order: section.order,
        title: section.title,
        content: section.content,
        imageUrl: section.imageUrl,
        question: null,
        options: null,
        correctOptionIndex: null,
        explanation: null,
      });
    }

    console.log(`Converted ${sections.length} sections to content blocks for module ${module.id}`);
  }

  // Create a default training pathway with all published modules
  const publishedModules = allModules.filter(m => m.published);
  
  if (publishedModules.length > 0) {
    // Check if default pathway exists
    const existingPathways = await db.select().from(trainingPathways);
    
    if (existingPathways.length === 0) {
      console.log("Creating default training pathway...");
      
      const [defaultPathway] = await db.insert(trainingPathways).values({
        name: "Getting Started",
        description: "Complete all foundational training modules",
        published: true,
      }).returning();

      // Add all published modules to the pathway
      for (let i = 0; i < publishedModules.length; i++) {
        await db.insert(pathwayModules).values({
          pathwayId: defaultPathway.id,
          moduleId: publishedModules[i].id,
          order: i + 1,
        });
      }

      console.log(`Created default pathway with ${publishedModules.length} modules`);
    } else {
      console.log("Training pathways already exist, skipping default pathway creation...");
    }
  }

  console.log("Migration complete!");
}

migrateToBlocks()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Migration failed:", error);
    process.exit(1);
  });
