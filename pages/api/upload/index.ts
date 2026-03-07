import { NextApiRequest, NextApiResponse } from "next";
import formidable, { File, Fields } from "formidable";
import fs from "fs";
import { getSessionServer } from "@/utils/auth";

export const config = {
  api: { bodyParser: false },
};

const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "gif", "webp", "bmp", "tiff"];
const VIDEO_EXTENSIONS = ["mp4", "mov", "avi", "mkv", "wmv", "flv", "webm", "m4v", "3gp", "3gpp", "ogv", "mpg", "mpeg", "ts", "m2ts"];

// Dropbox single-chunk limit is 150MB; use chunked session for anything larger
const DROPBOX_CHUNK_LIMIT = 140 * 1024 * 1024; // 140MB to be safe
const CHUNK_SIZE = 100 * 1024 * 1024; // 100MB per chunk

function getExtension(filename: string): string {
  return filename.split(".").pop()?.toLowerCase() || "";
}

function isImage(filename: string): boolean {
  return IMAGE_EXTENSIONS.includes(getExtension(filename));
}

function isVideo(filename: string): boolean {
  return VIDEO_EXTENSIONS.includes(getExtension(filename));
}

/**
 * Build Dropbox path:
 *   default:  /{DROPBOX_FOLDER}/{locationName}/{YYYY}/{MM}/{DD}-{safeName}
 *   subfolder: /{DROPBOX_FOLDER}/{locationName}/{subfolder}/{DD}-{safeName}
 */
function buildDropboxPath(
  baseFolder: string,
  locationName: string,
  originalName: string,
  subfolder?: string
): string {
  const now = new Date();
  const year = String(now.getFullYear());
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  const safeLocation = locationName.trim().replace(/[/\\:*?"<>|]/g, "-") || "general";
  const safeName = originalName.replace(/[^a-zA-Z0-9.\-_àáảãạăắặẳẵặâấầẩẫậđèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵÀÁẢÃẠĂẮẶẲẴẶÂẤẦẨẪẬĐÈÉẺẼẸÊẾỀỂỄỆÌÍỈĨỊÒÓỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢÙÚỦŨỤƯỨỪỬỮỰỲÝỶỸỴ]/g, "_").substring(0, 80);

  if (subfolder) {
    const safeSubfolder = subfolder.replace(/[^a-zA-Z0-9_-]/g, "_");
    return `${baseFolder}/${safeLocation}/${safeSubfolder}/${day}-${safeName}`;
  }

  return `${baseFolder}/${safeLocation}/${year}/${month}/${day}-${safeName}`;
}

// ─── Chunked Dropbox upload (handles files > 140MB) ─────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function dropboxUploadWithSession(dbx: any, dropboxPath: string, fileBuffer: Buffer): Promise<void> {
  if (fileBuffer.length <= DROPBOX_CHUNK_LIMIT) {
    // Small enough: single upload
    await dbx.filesUpload({
      path: dropboxPath,
      contents: fileBuffer,
      mode: { ".tag": "overwrite" },
    });
    return;
  }

  // Large file: use upload session (chunked)
  console.log(`[upload] File ${fileBuffer.length} bytes — using chunked upload session`);

  const firstChunk = fileBuffer.slice(0, CHUNK_SIZE);
  const sessionResult = await dbx.filesUploadSessionStart({
    contents: firstChunk,
    close: false,
  });
  const sessionId = (sessionResult.result as { session_id: string }).session_id;

  let offset = firstChunk.length;

  while (offset + CHUNK_SIZE < fileBuffer.length) {
    const chunk = fileBuffer.slice(offset, offset + CHUNK_SIZE);
    await dbx.filesUploadSessionAppendV2({
      cursor: { session_id: sessionId, offset },
      close: false,
      contents: chunk,
    });
    offset += chunk.length;
  }

  // Final chunk — finish session
  const lastChunk = fileBuffer.slice(offset);
  await dbx.filesUploadSessionFinish({
    cursor: { session_id: sessionId, offset },
    commit: {
      path: dropboxPath,
      mode: { ".tag": "overwrite" },
    },
    contents: lastChunk,
  });
}

// ─── Upload to Dropbox ───────────────────────────────────────────────
async function uploadToDropbox(
  filePath: string,
  fileSize: number,
  originalName: string,
  locationName: string,
  subfolder?: string
): Promise<{ url: string; publicId: string; resourceType: string }> {
  const { getDropboxClient, toDirectUrl, DROPBOX_FOLDER } = await import(
    "@/utils/dropbox"
  );

  const dbx = getDropboxClient();
  const imageUpload = isImage(originalName);
  const videoUpload = isVideo(originalName);

  console.log(`[upload] File: "${originalName}" | size: ${(fileSize / 1024 / 1024).toFixed(1)}MB | type: ${imageUpload ? "image" : videoUpload ? "video" : "raw"}`);

  // Resize images with sharp; videos and other files upload as-is
  let fileBuffer: Buffer;
  if (imageUpload) {
    try {
      const sharp = (await import("sharp")).default;
      fileBuffer = await sharp(filePath)
        .resize({ width: 1200, withoutEnlargement: true })
        .jpeg({ quality: 85 })
        .toBuffer();
    } catch (sharpErr) {
      console.warn("[upload] sharp resize failed, using original:", sharpErr);
      fileBuffer = fs.readFileSync(filePath);
    }
  } else {
    fileBuffer = fs.readFileSync(filePath);
  }

  const dropboxPath = buildDropboxPath(DROPBOX_FOLDER, locationName, originalName, subfolder);
  console.log(`[upload] Dropbox path: ${dropboxPath}`);

  await dropboxUploadWithSession(dbx, dropboxPath, fileBuffer);

  // Create a shared link
  let sharedLink: string;
  try {
    const linkResult = await dbx.sharingCreateSharedLinkWithSettings({
      path: dropboxPath,
      settings: { requested_visibility: { ".tag": "public" } },
    });
    sharedLink = (linkResult.result as { url: string }).url;
  } catch (err: unknown) {
    const existingError = err as {
      error?: { error?: { shared_link_already_exists?: { metadata?: { url?: string } } } };
    };
    const existingUrl =
      existingError?.error?.error?.shared_link_already_exists?.metadata?.url;
    if (existingUrl) {
      sharedLink = existingUrl;
    } else {
      throw err;
    }
  }

  return {
    url: toDirectUrl(sharedLink),
    publicId: dropboxPath,
    resourceType: imageUpload ? "image" : videoUpload ? "video" : "raw",
  };
}

// ─── Main handler ────────────────────────────────────────────────────
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const session = await getSessionServer(req, res);
  if (!session) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const form = formidable({ maxFileSize: 500 * 1024 * 1024 }); // 500MB

  try {
    const [fields, files] = await form.parse(req);

    const fileField = files.file;
    if (!fileField || fileField.length === 0) {
      return res.status(400).json({ error: "No file provided" });
    }

    const file = fileField[0] as File;
    const originalName = file.originalFilename || "upload";
    const fileSize = file.size || 0;

    const locationName = (fields as Fields).locationName?.[0] || "general";
    const subfolder = (fields as Fields).subfolder?.[0] || undefined;

    const result = await uploadToDropbox(file.filepath, fileSize, originalName, locationName, subfolder);

    return res.status(200).json(result);
  } catch (error: unknown) {
    // Log full error detail to server console
    console.error("[upload] Error:", error);

    // Return useful details to client for debugging
    const errMsg =
      error instanceof Error
        ? error.message
        : typeof error === "object" && error !== null
        ? JSON.stringify(error)
        : String(error);

    return res.status(500).json({
      error: "Upload failed",
      detail: errMsg,
    });
  }
}
