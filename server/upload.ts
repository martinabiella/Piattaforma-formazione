import multer from "multer";
import path from "path";
import fs from "fs";
import express, { type Express, type Request, type Response } from "express";
import { isAuthenticated } from "./auth";

// Ensure uploads directory exists
const UPLOADS_DIR = path.join(process.cwd(), "uploads");
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, UPLOADS_DIR);
    },
    filename: (_req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        const ext = path.extname(file.originalname);
        cb(null, uniqueSuffix + ext);
    },
});

// File filter - only allow images
const fileFilter = (
    _req: Request,
    file: Express.Multer.File,
    cb: multer.FileFilterCallback
) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error("Only image files are allowed (JPEG, PNG, GIF, WebP)"));
    }
};

// Configure multer
const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB max
    },
});

export function setupUploadRoutes(app: Express) {
    console.log("Setting up upload routes");
    // Serve static files from uploads directory
    app.use("/uploads", (req, res, next) => {
        // Allow access to uploaded files
        res.setHeader("Cache-Control", "public, max-age=31536000");
        next();
    });
    app.use("/uploads", express.static(UPLOADS_DIR));

    // Upload endpoint
    app.post(
        "/api/upload",
        isAuthenticated,
        upload.single("image"),
        (req: any, res: Response) => {
            console.log("Upload request received", req.user?.id);
            if (!req.file) {
                console.log("No file received");
                return res.status(400).json({ message: "No file uploaded" });
            }

            console.log("File uploaded:", req.file.path);

            // Return the URL to access the uploaded file
            const fileUrl = `/uploads/${req.file.filename}`;
            res.json({ url: fileUrl });
        }
    );

    // Error handling for multer
    app.use((err: Error, req: Request, res: Response, next: Function) => {
        if (err instanceof multer.MulterError) {
            if (err.code === "LIMIT_FILE_SIZE") {
                return res.status(400).json({ message: "File too large. Maximum size is 5MB." });
            }
            return res.status(400).json({ message: err.message });
        }
        if (err.message?.includes("Only image files")) {
            return res.status(400).json({ message: err.message });
        }
        next(err);
    });
}
