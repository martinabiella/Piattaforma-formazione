
import { storage } from "./server/storage";

async function main() {
    console.log("--- Starting Reproduction Script ---");

    try {
        // 1. Fetch all users
        console.log("Fetching all users...");
        const users = await storage.getUsersWithProgress();
        console.log(`Found ${users.length} users.`);
        users.forEach(u => {
            console.log(`- ${u.username} (${u.role})`);
        });

        // 2. Check for admins
        const admins = users.filter(u => u.role === 'admin');
        console.log(`Found ${admins.length} admins.`);

        if (admins.length === 0) {
            console.log("WARNING: No admins found!");
        } else {
            console.log("Admins found:", admins.map(a => a.username));
        }

        // 3. Test Role Update (if a non-admin user exists)
        const normalUser = users.find(u => u.role === 'user');
        if (normalUser) {
            console.log(`Attempting to promote user ${normalUser.username} to admin...`);
            const updated = await storage.updateUserRole(normalUser.id, 'admin');
            console.log("Update result:", updated);

            const verified = await storage.getUser(normalUser.id);
            console.log(`Verified role: ${verified?.role}`);

            // Revert
            console.log("Reverting role...");
            await storage.updateUserRole(normalUser.id, 'user');
        } else {
            console.log("No normal user found to test role update.");
        }

    } catch (error) {
        console.error("Error:", error);
    }

    console.log("--- End Reproduction Script ---");
    process.exit(0);
}

main();
