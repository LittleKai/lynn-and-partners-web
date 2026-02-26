/**
 * DEPRECATED: This endpoint has been replaced by location-scoped APIs.
 * Use /api/locations/[id]/products instead.
 */
import { NextApiRequest, NextApiResponse } from "next";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  return res.status(410).json({
    error: "This endpoint is deprecated. Use /api/locations/[id]/products",
  });
}

export const config = {
  api: {
    externalResolver: true,
  },
};
