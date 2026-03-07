import { NextApiRequest, NextApiResponse } from "next";
import formidable, { File, Fields } from "formidable";
import fs from "fs";
import { getSessionServer } from "@/utils/auth";

export const config = {
  api: { bodyParser: false },
};

const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "gif", "webp", "bmp", "tiff"];
const VIDEO_EXTENSIONS = ["mp4", "mov", "avi", "mkv", "wmv", "flv", "webm", "m4v", "3gp", "ogv", "mpg", "mpeg"];

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
 *
 * Example:
 *   /lynn-partners/Kho Hà Nội/2026/02/27-hoa-don.pdf
 *   /lynn-partners/Kho Hà Nội/documents/27-hop-dong.pdf
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

  // Sanitize location name: keep unicode letters/numbers, replace special chars
  const safeLocation = locationName.trim().replace(/[/\\:*?"<>|]/g, "-") || "general";

  // Sanitize filename: keep alphanumeric, dot, dash, underscore
  const safeName = originalName.replace(/[^a-zA-Z0-9.\-_àáảãạăắặẳẵặâấầẩẫậđèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵÀÁẢÃẠĂẮẶẲẴẶÂẤẦẨẪẬĐÈÉẺẼẸÊẾỀỂỄỆÌÍỈĨỊÒÓỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢÙÚỦŨỤƯỨỪỬỮỰỲÝỶỸỴ]/g, "_").substring(0, 80);

  if (subfolder) {
    const safeSubfolder = subfolder.replace(/[^a-zA-Z0-9_-]/g, "_");
    return `${baseFolder}/${safeLocation}/${safeSubfolder}/${day}-${safeName}`;
  }

  return `${baseFolder}/${safeLocation}/${year}/${month}/${day}-${safeName}`;
}

// ─── Upload to Dropbox ───────────────────────────────────────────────
async function uploadToDropbox(
  filePath: string,
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

  // Resize images with sharp before uploading; videos and other files upload as-is
  let fileBuffer: Buffer;
  if (imageUpload) {
    try {
      const sharp = (await import("sharp")).default;
      fileBuffer = await sharp(filePath)
        .resize({ width: 1200, withoutEnlargement: true })
        .jpeg({ quality: 85 })
        .toBuffer();
    } catch {
      fileBuffer = fs.readFileSync(filePath);
    }
  } else {
    fileBuffer = fs.readFileSync(filePath);
  }

  const dropboxPath = buildDropboxPath(DROPBOX_FOLDER, locationName, originalName, subfolder);

  // Upload to Dropbox
  await dbx.filesUpload({
    path: dropboxPath,
    contents: fileBuffer,
    mode: { ".tag": "overwrite" },
  });

  // Create a shared link
  let sharedLink: string;
  try {
    const linkResult = await dbx.sharingCreateSharedLinkWithSettings({
      path: dropboxPath,
      settings: {
        requested_visibility: { ".tag": "public" },
      },
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

    const locationName = (fields as Fields).locationName?.[0] || "general";
    const subfolder = (fields as Fields).subfolder?.[0] || undefined;

    const result = await uploadToDropbox(file.filepath, originalName, locationName, subfolder);

    return res.status(200).json(result);
  } catch (error) {
    console.error("Upload error:", error);
    return res.status(500).json({ error: "Upload failed" });
  }
}
