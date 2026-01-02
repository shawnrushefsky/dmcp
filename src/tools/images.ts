import { v4 as uuidv4 } from "uuid";
import { getDatabase } from "../db/connection.js";
import {
  writeFileSync,
  readFileSync,
  mkdirSync,
  existsSync,
  unlinkSync,
  rmSync,
} from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";
import type {
  StoredImage,
  StoreImageParams,
  ImageListResult,
} from "../types/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const IMAGES_DIR = join(__dirname, "..", "..", "data", "images");

// Helper: Ensure directory exists
function ensureDir(dirPath: string): void {
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true });
  }
}

// Helper: Get extension from mime type
function getExtension(mimeType: string): string {
  const map: Record<string, string> = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/gif": "gif",
    "image/webp": "webp",
    "image/svg+xml": "svg",
  };
  return map[mimeType] || "png";
}

// Helper: Infer mime type from base64 header or magic bytes
function inferMimeType(base64: string): string {
  // Check for data URI prefix
  if (base64.startsWith("data:")) {
    const match = base64.match(/^data:([^;]+);/);
    if (match) return match[1];
  }

  // Check magic bytes
  const cleanBase64 = base64.replace(/^data:[^;]+;base64,/, "");
  const decoded = Buffer.from(cleanBase64, "base64");

  if (decoded[0] === 0x89 && decoded[1] === 0x50) return "image/png";
  if (decoded[0] === 0xff && decoded[1] === 0xd8) return "image/jpeg";
  if (decoded[0] === 0x47 && decoded[1] === 0x49) return "image/gif";
  if (decoded[0] === 0x52 && decoded[1] === 0x49) return "image/webp"; // RIFF header

  return "image/png"; // Default
}

// Helper: Map database row to StoredImage
function mapRowToStoredImage(row: Record<string, unknown>): StoredImage {
  return {
    id: row.id as string,
    sessionId: row.session_id as string,
    entityId: row.entity_id as string,
    entityType: row.entity_type as "character" | "location" | "item" | "scene",
    filePath: row.file_path as string,
    fileSize: row.file_size as number,
    mimeType: row.mime_type as string,
    width: row.width as number | null,
    height: row.height as number | null,
    label: row.label as string | null,
    description: row.description as string | null,
    source: row.source as "generated" | "uploaded" | "url",
    sourceUrl: row.source_url as string | null,
    generationTool: row.generation_tool as string | null,
    generationPrompt: row.generation_prompt as string | null,
    isPrimary: (row.is_primary as number) === 1,
    createdAt: row.created_at as string,
  };
}

export async function storeImage(params: StoreImageParams): Promise<StoredImage> {
  const db = getDatabase();
  const id = uuidv4();
  const now = new Date().toISOString();

  let imageBuffer: Buffer;
  let mimeType: string;
  let source: "generated" | "uploaded" | "url";
  let sourceUrl: string | null = null;

  if (params.base64) {
    // Handle base64 input
    const base64Data = params.base64.replace(/^data:[^;]+;base64,/, "");
    imageBuffer = Buffer.from(base64Data, "base64");
    mimeType = params.mimeType || inferMimeType(params.base64);
    source = params.generationTool ? "generated" : "uploaded";
  } else if (params.url) {
    // Fetch from URL
    const response = await fetch(params.url);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status}`);
    }
    imageBuffer = Buffer.from(await response.arrayBuffer());
    mimeType =
      response.headers.get("content-type") || params.mimeType || "image/png";
    source = "url";
    sourceUrl = params.url;
  } else if (params.filePath) {
    // Copy from local file
    if (!existsSync(params.filePath)) {
      throw new Error(`File not found: ${params.filePath}`);
    }
    imageBuffer = readFileSync(params.filePath);
    mimeType = params.mimeType || "image/png"; // Will be refined by sharp below
    source = "uploaded";
  } else {
    throw new Error("Either base64, url, or filePath must be provided");
  }

  // Get image metadata using sharp
  let width: number | null = null;
  let height: number | null = null;
  try {
    const metadata = await sharp(imageBuffer).metadata();
    width = metadata.width || null;
    height = metadata.height || null;
    // Use sharp's detected format if available
    if (metadata.format) {
      const formatToMime: Record<string, string> = {
        jpeg: "image/jpeg",
        png: "image/png",
        gif: "image/gif",
        webp: "image/webp",
        svg: "image/svg+xml",
        tiff: "image/tiff",
        avif: "image/avif",
      };
      mimeType = formatToMime[metadata.format] || mimeType;
    }
  } catch {
    // If sharp can't parse it, proceed without dimensions
  }

  // Build file path
  const ext = getExtension(mimeType);
  const relativePath = join(
    params.sessionId,
    `${params.entityType}s`,
    params.entityId,
    `${id}.${ext}`
  );
  const fullPath = join(IMAGES_DIR, relativePath);

  // Ensure directory exists and write file
  ensureDir(dirname(fullPath));
  writeFileSync(fullPath, imageBuffer);

  // If setting as primary, unset current primary first
  if (params.setAsPrimary) {
    db.prepare(
      `
      UPDATE stored_images SET is_primary = 0
      WHERE entity_id = ? AND entity_type = ?
    `
    ).run(params.entityId, params.entityType);
  }

  // Insert database record
  const stmt = db.prepare(`
    INSERT INTO stored_images (
      id, session_id, entity_id, entity_type, file_path, file_size, mime_type,
      width, height, label, description, source, source_url, generation_tool,
      generation_prompt, is_primary, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id,
    params.sessionId,
    params.entityId,
    params.entityType,
    relativePath,
    imageBuffer.length,
    mimeType,
    width,
    height,
    params.label || null,
    params.description || null,
    source,
    sourceUrl,
    params.generationTool || null,
    params.generationPrompt || null,
    params.setAsPrimary ? 1 : 0,
    now
  );

  return {
    id,
    sessionId: params.sessionId,
    entityId: params.entityId,
    entityType: params.entityType,
    filePath: relativePath,
    fileSize: imageBuffer.length,
    mimeType,
    width,
    height,
    label: params.label || null,
    description: params.description || null,
    source,
    sourceUrl,
    generationTool: params.generationTool || null,
    generationPrompt: params.generationPrompt || null,
    isPrimary: params.setAsPrimary || false,
    createdAt: now,
  };
}

export function getImage(imageId: string): StoredImage | null {
  const db = getDatabase();
  const row = db.prepare(`SELECT * FROM stored_images WHERE id = ?`).get(imageId) as
    | Record<string, unknown>
    | undefined;
  if (!row) return null;
  return mapRowToStoredImage(row);
}

export interface GetImageDataOptions {
  format?: "jpeg" | "webp" | "png";
  width?: number;
  height?: number;
  quality?: number; // 1-100
  fit?: "cover" | "contain" | "fill" | "inside" | "outside";
}

export async function getImageData(
  imageId: string,
  options?: GetImageDataOptions
): Promise<{ image: StoredImage; base64: string; outputFormat: string; outputSize: number } | null> {
  const image = getImage(imageId);
  if (!image) return null;

  const fullPath = join(IMAGES_DIR, image.filePath);
  if (!existsSync(fullPath)) return null;

  const originalBuffer = readFileSync(fullPath);

  // If no processing options, return original
  if (!options || (!options.format && !options.width && !options.height && !options.quality)) {
    const base64 = `data:${image.mimeType};base64,${originalBuffer.toString("base64")}`;
    return { image, base64, outputFormat: image.mimeType, outputSize: originalBuffer.length };
  }

  // Process with Sharp
  let pipeline = sharp(originalBuffer);

  // Resize if dimensions specified
  if (options.width || options.height) {
    pipeline = pipeline.resize({
      width: options.width,
      height: options.height,
      fit: options.fit || "inside",
      withoutEnlargement: true,
    });
  }

  // Convert format and apply quality
  let outputMimeType: string;
  const quality = options.quality ?? 80;

  switch (options.format) {
    case "jpeg":
      pipeline = pipeline.jpeg({ quality });
      outputMimeType = "image/jpeg";
      break;
    case "webp":
      pipeline = pipeline.webp({ quality });
      outputMimeType = "image/webp";
      break;
    case "png":
      pipeline = pipeline.png({ compressionLevel: Math.floor((100 - quality) / 10) });
      outputMimeType = "image/png";
      break;
    default:
      // Keep original format but apply quality if it's a lossy format
      if (image.mimeType === "image/jpeg") {
        pipeline = pipeline.jpeg({ quality });
      } else if (image.mimeType === "image/webp") {
        pipeline = pipeline.webp({ quality });
      }
      outputMimeType = image.mimeType;
  }

  const processedBuffer = await pipeline.toBuffer();
  const base64 = `data:${outputMimeType};base64,${processedBuffer.toString("base64")}`;

  return { image, base64, outputFormat: outputMimeType, outputSize: processedBuffer.length };
}

export function listEntityImages(
  entityId: string,
  entityType: "character" | "location" | "item" | "scene"
): ImageListResult {
  const db = getDatabase();
  const rows = db
    .prepare(
      `
    SELECT * FROM stored_images
    WHERE entity_id = ? AND entity_type = ?
    ORDER BY is_primary DESC, created_at DESC
  `
    )
    .all(entityId, entityType) as Record<string, unknown>[];

  const images = rows.map(mapRowToStoredImage);
  const primaryImage = images.find((img) => img.isPrimary) || null;

  return { entityId, entityType, images, primaryImage };
}

export function deleteImage(imageId: string): boolean {
  const db = getDatabase();
  const image = getImage(imageId);
  if (!image) return false;

  // Delete file
  const fullPath = join(IMAGES_DIR, image.filePath);
  if (existsSync(fullPath)) {
    unlinkSync(fullPath);
  }

  // Delete database record
  const result = db.prepare(`DELETE FROM stored_images WHERE id = ?`).run(imageId);
  return result.changes > 0;
}

export function setPrimaryImage(imageId: string): StoredImage | null {
  const db = getDatabase();
  const image = getImage(imageId);
  if (!image) return null;

  // Unset current primary
  db.prepare(
    `
    UPDATE stored_images SET is_primary = 0
    WHERE entity_id = ? AND entity_type = ?
  `
  ).run(image.entityId, image.entityType);

  // Set new primary
  db.prepare(`UPDATE stored_images SET is_primary = 1 WHERE id = ?`).run(imageId);

  return { ...image, isPrimary: true };
}

export function updateImageMetadata(
  imageId: string,
  updates: { label?: string; description?: string }
): StoredImage | null {
  const db = getDatabase();
  const current = getImage(imageId);
  if (!current) return null;

  const newLabel = updates.label !== undefined ? updates.label : current.label;
  const newDescription =
    updates.description !== undefined ? updates.description : current.description;

  db.prepare(
    `
    UPDATE stored_images SET label = ?, description = ? WHERE id = ?
  `
  ).run(newLabel, newDescription, imageId);

  return { ...current, label: newLabel, description: newDescription };
}

// Cleanup helper - delete all images for a session
export function deleteSessionImages(sessionId: string): number {
  const db = getDatabase();

  // Delete files
  const sessionDir = join(IMAGES_DIR, sessionId);
  if (existsSync(sessionDir)) {
    rmSync(sessionDir, { recursive: true, force: true });
  }

  // Delete records (cascade should handle this, but be explicit)
  const result = db
    .prepare(`DELETE FROM stored_images WHERE session_id = ?`)
    .run(sessionId);
  return result.changes;
}

// Get primary image for an entity
export function getPrimaryImage(
  entityId: string,
  entityType: "character" | "location" | "item" | "scene"
): StoredImage | null {
  const db = getDatabase();
  const row = db
    .prepare(
      `
    SELECT * FROM stored_images
    WHERE entity_id = ? AND entity_type = ? AND is_primary = 1
  `
    )
    .get(entityId, entityType) as Record<string, unknown> | undefined;

  if (!row) return null;
  return mapRowToStoredImage(row);
}

// List all images in a session
export function listSessionImages(sessionId: string): StoredImage[] {
  const db = getDatabase();
  const rows = db
    .prepare(
      `
    SELECT * FROM stored_images
    WHERE session_id = ?
    ORDER BY created_at DESC
  `
    )
    .all(sessionId) as Record<string, unknown>[];

  return rows.map(mapRowToStoredImage);
}
