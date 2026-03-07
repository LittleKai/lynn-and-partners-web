export const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "gif", "webp", "bmp", "tiff"];
export const VIDEO_EXTENSIONS = ["mp4", "mov", "avi", "mkv", "wmv", "flv", "webm", "m4v", "3gp", "3gpp", "ogv", "mpg", "mpeg", "ts", "m2ts"];

export function getExtension(filename: string): string {
  return filename.split(".").pop()?.toLowerCase() || "";
}

export function isImage(filename: string): boolean {
  return IMAGE_EXTENSIONS.includes(getExtension(filename));
}

export function isVideo(filename: string): boolean {
  return VIDEO_EXTENSIONS.includes(getExtension(filename));
}

export function getResourceType(filename: string): "image" | "video" | "raw" {
  if (isImage(filename)) return "image";
  if (isVideo(filename)) return "video";
  return "raw";
}

/**
 * Build Dropbox path:
 *   default:  /{baseFolder}/{locationName}/{YYYY}/{MM}/{DD}-{safeName}
 *   subfolder: /{baseFolder}/{locationName}/{subfolder}/{DD}-{safeName}
 */
export function buildDropboxPath(
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
  const safeName = originalName
    .replace(/[^a-zA-Z0-9.\-_àáảãạăắặẳẵặâấầẩẫậđèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵÀÁẢÃẠĂẮẶẲẴẶÂẤẦẨẪẬĐÈÉẺẼẸÊẾỀỂỄỆÌÍỈĨỊÒÓỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢÙÚỦŨỤƯỨỪỬỮỰỲÝỶỸỴ]/g, "_")
    .substring(0, 80);

  if (subfolder) {
    const safeSubfolder = subfolder.replace(/[^a-zA-Z0-9_-]/g, "_");
    return `${baseFolder}/${safeLocation}/${safeSubfolder}/${day}-${safeName}`;
  }

  return `${baseFolder}/${safeLocation}/${year}/${month}/${day}-${safeName}`;
}
