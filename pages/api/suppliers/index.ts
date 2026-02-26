/**
 * DEPRECATED: This endpoint has been replaced by location-scoped APIs.
 * Use /api/locations/[id]/suppliers instead.
 */
import { NextApiRequest, NextApiResponse } from "next";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  return res.status(410).json({
    error: "This endpoint is deprecated. Use /api/locations/[id]/suppliers",
  });
}

export const config = {
  api: {
    externalResolver: true,
  },
};
