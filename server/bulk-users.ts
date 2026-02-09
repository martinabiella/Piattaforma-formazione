import * as XLSX from "xlsx";
import { z } from "zod";
import { insertUserSchema, type InsertUser } from "@shared/schema";
import { storage } from "./storage";
import { hashPassword } from "./auth";

// Define the expected CSV/XLS row format
const bulkUserRowSchema = z.object({
    username: z.string().min(3, "Username must be at least 3 characters"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    email: z.string().email("Invalid email address"),
    role: z.enum(["user", "admin"]).optional().default("user"),
});

export type BulkUserRow = z.infer<typeof bulkUserRowSchema>;

export interface BulkUploadResult {
    created: number;
    failed: { row: number; error: string }[];
}

export async function parseUserFile(buffer: Buffer): Promise<BulkUserRow[]> {
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    // Convert to JSON
    const rawData = XLSX.utils.sheet_to_json(sheet);

    // Validate each row
    const validRows: BulkUserRow[] = [];

    rawData.forEach((row: any, index) => {
        // Map Excel column names to schema keys if needed (case insensitive)
        // For now assuming headers match schema keys

        // Normalize keys to camelCase just in case
        const normalizedRow: any = {};
        Object.keys(row).forEach(key => {
            // Simple normalization: remove spaces, lowercase first letter
            // This is a basic heuristic, ideally headers should be strict
            // Let's assume strict headers for now as per plan
            normalizedRow[key] = row[key];
        });

        // Try to parse with permissive schema first to catch structural errors closer to source?
        // Actually, let's just use the schema.
        // We are returning parsed rows, validation happens here or later?
        // Plan said "Parse CSV and validate rows".
        // But `createUsersInBulk` might also want to report per-row errors.
        // If I throw here, I lose all rows.
        // Better to return raw data or valid rows?
        // The interface says `Promise<BulkUserRow[]>`. So it returns only valid rows?
        // Or I should return `ParsedResult` with valid and invalid?
        // Let's stick to returning valid rows but maybe we should validate deeply in `createUsersInBulk` 
        // to report row numbers.
        // Actually, `sheet_to_json` gives us an array.
        // Let's return the raw objects cast to expected type, and validate in bulk creation 
        // so we can report "Row X: Invalid email".
        validRows.push(row);
    });

    return validRows;
}

export async function createUsersInBulk(
    rawData: any[],
    groupId?: number
): Promise<BulkUploadResult> {
    let createdCount = 0;
    const failed: { row: number; error: string }[] = [];

    for (let i = 0; i < rawData.length; i++) {
        const row = rawData[i];
        const rowNumber = i + 2; // 1-based index, +1 for header

        try {
            // 1. Validate format
            const result = bulkUserRowSchema.safeParse(row);

            if (!result.success) {
                const errorMsg = result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(", ");
                failed.push({ row: rowNumber, error: errorMsg });
                continue;
            }

            const userData = result.data;

            // 2. Check for duplicates (username)
            const existingUser = await storage.getUserByUsername(userData.username);
            if (existingUser) {
                failed.push({ row: rowNumber, error: `Username '${userData.username}' already exists` });
                continue;
            }

            // 3. Check for duplicates (email)
            // Note: storage doesn't have getUserByEmail public method exposed in interface usually?
            // Let's check storage.ts if it has it.
            // Schema says email is unique.
            // `createUser` checks email uniqueness internally?
            // storage.ts: createUser checks if user exists by email line 257 in `upsertUser`.. 
            // but `createUser` (lines 224-241) just does insert. 
            // If insert fails due to constraint, it throws.
            // So we can try/catch the create.

            // 4. Hash password
            const hashedPassword = await hashPassword(userData.password);

            // 5. Create user
            const newUser = await storage.createUser({
                ...userData,
                password: hashedPassword,
            });

            // 6. Assign to group if needed
            if (groupId) {
                await storage.addGroupMember({
                    userId: newUser.id,
                    groupId: groupId,
                });
            }

            createdCount++;

        } catch (error: any) {
            // Catch duplicate key errors from DB if any
            if (error.code === '23505') { // Postgres unique constraint violation
                if (error.detail?.includes('email')) {
                    failed.push({ row: rowNumber, error: `Email already exists` });
                } else if (error.detail?.includes('username')) {
                    failed.push({ row: rowNumber, error: `Username '${row.username}' already exists` });
                } else {
                    failed.push({ row: rowNumber, error: "Duplicate entry" });
                }
            } else {
                failed.push({ row: rowNumber, error: error.message || "Unknown error" });
            }
        }
    }

    return { created: createdCount, failed };
}
