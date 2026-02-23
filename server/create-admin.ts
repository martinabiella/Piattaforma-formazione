import { db } from "./db";
import { users } from "@shared/schema";
import { hashPassword } from "./auth";
import { eq } from "drizzle-orm";

async function main() {
    const adminUsername = "admin";
    const adminPassword = "password"; // Use simple password for testing

    const existing = await db.query.users.findFirst({
        where: eq(users.username, adminUsername)
    });

    if (existing) {
        console.log("Admin user already exists. Updating password and role...");
        await db.update(users)
            .set({
                role: "admin",
                password: await hashPassword(adminPassword)
            })
            .where(eq(users.id, existing.id));
        console.log("Updated admin user. Login: admin / password");
    } else {
        console.log("Creating admin user...");
        await db.insert(users).values({
            username: adminUsername,
            password: await hashPassword(adminPassword),
            role: "admin",
        });
        console.log("Created admin user. Login: admin / password");
    }
    process.exit(0);
}

main().catch(console.error);
