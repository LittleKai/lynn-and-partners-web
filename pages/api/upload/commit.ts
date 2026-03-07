import { NextApiRequest, NextApiResponse } from "next";
import { getSessionServer } from "@/utils/auth";
import { getDropboxClient, toDirectUrl } from "@/utils/dropbox";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  const session = await getSessionServer(req, res);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  const { dropboxPath, resourceType } = req.body as {
    dropboxPath?: string;
    resourceType?: string;
  };

  if (!dropboxPath) return res.status(400).json({ error: "dropboxPath is required" });

  try {
    const dbx = getDropboxClient();

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

    return res.status(200).json({
      url: toDirectUrl(sharedLink),
      publicId: dropboxPath,
      resourceType: resourceType || "raw",
    });
  } catch (error: unknown) {
    console.error("[commit] Error:", error);
    const msg = error instanceof Error ? error.message : JSON.stringify(error);
    return res.status(500).json({ error: "Failed to create shared link", detail: msg });
  }
}
