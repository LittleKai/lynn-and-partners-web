import { Dropbox } from "dropbox";

/**
 * Dropbox client — uses App Key + App Secret + Refresh Token (long-lived).
 * Set in .env.local:
 *   DROPBOX_APP_KEY=...
 *   DROPBOX_APP_SECRET=...
 *   DROPBOX_REFRESH_TOKEN=...
 *   DROPBOX_UPLOAD_FOLDER=/lynn-partners   (optional, default: /lynn-partners)
 */
export function getDropboxClient(): Dropbox {
  return new Dropbox({
    clientId: process.env.DROPBOX_APP_KEY,
    clientSecret: process.env.DROPBOX_APP_SECRET,
    refreshToken: process.env.DROPBOX_REFRESH_TOKEN,
  });
}

/**
 * Convert a Dropbox shared link to a direct-access URL.
 * https://www.dropbox.com/s/xxx/file.jpg?dl=0
 * → https://dl.dropboxusercontent.com/s/xxx/file.jpg
 */
export function toDirectUrl(sharedLink: string): string {
  return sharedLink
    .replace("www.dropbox.com", "dl.dropboxusercontent.com")
    .replace("?dl=0", "")
    .replace("?dl=1", "");
}

export const DROPBOX_FOLDER =
  process.env.DROPBOX_UPLOAD_FOLDER || "/lynn-partners";
