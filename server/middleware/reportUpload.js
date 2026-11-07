import crypto from "node:crypto";
import fs from "node:fs";
import { open, unlink } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import multer from "multer";

const thisDirectory = path.dirname(fileURLToPath(import.meta.url));
const uploadDirectory = path.resolve(thisDirectory, "../../backend/uploads/reports");

const imageExtensions = new Map([
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["image/webp", ".webp"],
]);

function detectImageType(bytes) {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (bytes.length >= 12 && bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  return null;
}

export const reportUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, callback) => {
      fs.mkdir(uploadDirectory, { recursive: true }, (error) => callback(error, uploadDirectory));
    },
    filename: (_req, file, callback) => {
      callback(null, `${crypto.randomUUID()}${imageExtensions.get(file.mimetype) || ".bin"}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    if (!imageExtensions.has(file.mimetype)) {
      const error = new Error("Evidence must be a JPEG, PNG, or WebP image");
      error.status = 400;
      callback(error);
      return;
    }
    callback(null, true);
  },
});

export function verifyEvidenceContent(req, _res, next) {
  if (!req.file) return next();

  (async () => {
    const handle = await open(req.file.path, "r");
    const header = Buffer.alloc(12);
    try {
      const { bytesRead } = await handle.read(header, 0, header.length, 0);
      const detectedType = detectImageType(header.subarray(0, bytesRead));
      if (detectedType !== req.file.mimetype) {
        await unlink(req.file.path).catch(() => {});
        throw Object.assign(new Error("Uploaded file content does not match an accepted image type"), { status: 400 });
      }
    } finally {
      await handle.close();
    }
  })().then(() => next(), next);
}

export function sanitizeEvidenceOriginalName(value) {
  const leaf = String(value || "evidence").replaceAll("\\", "/").split("/").pop();
  const safe = leaf.replace(/[\u0000-\u001f\u007f]/g, "").trim();
  return (safe || "evidence").slice(0, 255);
}

export { uploadDirectory };
