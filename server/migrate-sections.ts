/**
 * Migration Script: moduleSections → moduleSteps
 * 
 * This script converts legacy moduleSections content to the new step-based system.
 */

import { db } from "./db";
import { modules, moduleSections, moduleSteps, stepContentBlocks } from "@shared/schema";
import { eq } from "drizzle-orm";

async function migrate() {
    console.log("Starting migration: moduleSections → moduleSteps");

    // Get all modules
    const allModules = await db.select().from(modules);
    console.log(`Found ${allModules.length} modules to process`);

    for (const mod of allModules) {
        console.log(`\nProcessing module: ${mod.title} (ID: ${mod.id})`);

        // Get existing sections for this module
        const sections = await db
            .select()
            .from(moduleSections)
            .where(eq(moduleSections.moduleId, mod.id))
            .orderBy(moduleSections.order);

        if (sections.length === 0) {
            console.log(`  No sections found, skipping`);
            continue;
        }

        // Check if steps already exist for this module
        const existingSteps = await db
            .select()
            .from(moduleSteps)
            .where(eq(moduleSteps.moduleId, mod.id));

        if (existingSteps.length > 0) {
            console.log(`  Steps already exist (${existingSteps.length}), skipping migration`);
            continue;
        }

        console.log(`  Found ${sections.length} sections to migrate`);

        // Create a step for each section
        for (let i = 0; i < sections.length; i++) {
            const section = sections[i];

            // Create the step
            const [newStep] = await db.insert(moduleSteps).values({
                moduleId: mod.id,
                title: section.title,
                order: i + 1,
                checkpointRequired: false, // No checkpoint for migrated content
            }).returning();

            console.log(`    Created step: ${newStep.title} (ID: ${newStep.id})`);

            // Create content block for the section content
            if (section.content || section.imageUrl) {
                await db.insert(stepContentBlocks).values({
                    stepId: newStep.id,
                    blockType: section.imageUrl ? "image" : "text",
                    order: 1,
                    title: null,
                    content: section.content || null,
                    imageUrl: section.imageUrl || null,
                });
                console.log(`      Created content block`);
            }
        }

        console.log(`  Migrated ${sections.length} sections to steps`);
    }

    console.log("\nMigration completed successfully!");
}

migrate()
    .catch(console.error)
    .finally(() => process.exit(0));
