import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * This endpoint is disabled in production.
 * Previously it allowed unauthenticated creation of test users.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  return res.status(403).json({
    error: 'This endpoint is disabled. Use the admin panel to create users.',
  });
}
