import { NextApiRequest, NextApiResponse } from "next";
import { getSessionServer } from "@/utils/auth";
import { getDropboxClient, DROPBOX_FOLDER } from "@/utils/dropbox";
import { buildDropboxPath, getResourceType } from "@/utils/dropboxPaths";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  const session = await getSessionServer(req, res);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  const { filename, locationName, subfolder } = req.body as {
    filename?: string;
    locationName?: string;
    subfolder?: string;
  };

  if (!filename) return res.status(400).json({ error: "filename is required" });

  const locName = locationName || "general";
  const dropboxPath = buildDropboxPath(DROPBOX_FOLDER, locName, filename, subfolder);
  const resourceType = getResourceType(filename);

  try {
    const dbx = getDropboxClient();
    const result = await dbx.filesGetTemporaryUploadLink({
      commit_info: {
        path: dropboxPath,
        mode: { ".tag": "overwrite" },
        autorename: false,
        mute: false,
      },
      duration: 14400,
    });

    return res.status(200).json({
      uploadUrl: (result.result as { link: string }).link,
      dropboxPath,
      resourceType,
    });
  } catch (error: unknown) {
    console.error("[temp-link] Error:", error);
    const msg = error instanceof Error ? error.message : JSON.stringify(error);
    return res.status(500).json({ error: "Failed to get upload link", detail: msg });
  }
}
