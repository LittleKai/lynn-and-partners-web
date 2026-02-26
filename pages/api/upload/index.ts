import { NextApiRequest, NextApiResponse } from "next";
import formidable, { File, Fields } from "formidable";
import fs from "fs";
import { getSessionServer } from "@/utils/auth";

export const config = {
  api: { bodyParser: false },
};

const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "gif", "webp", "bmp", "tiff"];

function getExtension(filename: string): string {
  return filename.split(".").pop()?.toLowerCase() || "";
}

function isImage(filename: string): boolean {
  return IMAGE_EXTENSIONS.includes(getExtension(filename));
}

/**
 * Build Dropbox path:
 *   /{DROPBOX_FOLDER}/{locationName}/{YYYY-MM-DD}/{HH-MM-SS}_{safeName}
 *
 * Example:
 *   /lynn-partners-web/Kho Hà Nội/2026-02-26/14-30-25_hoa-don.pdf
 */
function buildDropboxPath(
  baseFolder: string,
  locationName: string,
  originalName: string
): string {
  const now = new Date();

  const dateFolder = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-"); // 2026-02-26

  const timePrefix = [
    String(now.getHours()).padStart(2, "0"),
    String(now.getMinutes()).padStart(2, "0"),
    String(now.getSeconds()).padStart(2, "0"),
  ].join("-"); // 14-30-25

  // Sanitize location name: keep unicode letters/numbers, replace special chars
  const safeLocation = locationName.trim().replace(/[/\\:*?"<>|]/g, "-") || "general";

  // Sanitize filename: keep alphanumeric, dot, dash, underscore
  const safeName = originalName.replace(/[^a-zA-Z0-9.\-_àáảãạăắặẳẵặâấầẩẫậđèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵÀÁẢÃẠĂẮẶẲẴẶÂẤẦẨẪẬĐÈÉẺẼẸÊẾỀỂỄỆÌÍỈĨỊÒÓỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢÙÚỦŨỤƯỨỪỬỮỰỲÝỶỸỴ]/g, "_").substring(0, 80);

  return `${baseFolder}/${safeLocation}/${dateFolder}/${timePrefix}_${safeName}`;
}

// ─── Cloudinary upload ──────────────────────────────────────────────
async function uploadToCloudinary(
  filePath: string,
  originalName: string,
  locationName: string
): Promise<{ url: string; publicId: string; resourceType: string }> {
  const cloudinary = (await import("@/utils/cloudinary")).default;
  const imageUpload = isImage(originalName);
  const safeLocation = locationName.replace(/[^a-zA-Z0-9-_]/g, "_") || "general";

  let result;
  if (imageUpload) {
    result = await cloudinary.uploader.upload(filePath, {
      resource_type: "image",
      transformation: [
        { width: 1200, crop: "limit" },
        { quality: "auto:good" },
      ],
      folder: `lynn-partners/${safeLocation}`,
    });
  } else {
    result = await cloudinary.uploader.upload(filePath, {
      resource_type: "raw",
      folder: `lynn-partners/${safeLocation}/docs`,
      use_filename: true,
      unique_filename: true,
    });
  }

  return {
    url: result.secure_url,
    publicId: result.public_id,
    resourceType: result.resource_type,
  };
}

// ─── Dropbox upload ──────────────────────────────────────────────────
async function uploadToDropbox(
  filePath: string,
  originalName: string,
  locationName: string
): Promise<{ url: string; publicId: string; resourceType: string }> {
  const { getDropboxClient, toDirectUrl, DROPBOX_FOLDER } = await import(
    "@/utils/dropbox"
  );

  const dbx = getDropboxClient();
  const imageUpload = isImage(originalName);

  // Resize images with sharp before uploading
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

  const dropboxPath = buildDropboxPath(DROPBOX_FOLDER, locationName, originalName);

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
    resourceType: imageUpload ? "image" : "raw",
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

  const form = formidable({ maxFileSize: 20 * 1024 * 1024 }); // 20MB

  try {
    const [fields, files] = await form.parse(req);

    const fileField = files.file;
    if (!fileField || fileField.length === 0) {
      return res.status(400).json({ error: "No file provided" });
    }

    const file = fileField[0] as File;
    const originalName = file.originalFilename || "upload";

    // locationName gửi từ client, fallback về "general"
    const locationName =
      (fields as Fields).locationName?.[0] || "general";

    const provider = process.env.UPLOAD_PROVIDER || "cloudinary";

    let result: { url: string; publicId: string; resourceType: string };

    if (provider === "dropbox") {
      result = await uploadToDropbox(file.filepath, originalName, locationName);
    } else {
      result = await uploadToCloudinary(file.filepath, originalName, locationName);
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error("Upload error:", error);
    return res.status(500).json({ error: "Upload failed" });
  }
}
