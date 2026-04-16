import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const forwarded = req.headers['x-forwarded-for'];
  const ip = typeof forwarded === 'string'
    ? forwarded.split(',')[0].trim()
    : req.socket?.remoteAddress || 'unknown';

  // Fetch geolocation from free API
  let city = '';
  let region = '';
  let country = '';
  try {
    const geoRes = await fetch(`http://ip-api.com/json/${ip}?fields=city,regionName,country&lang=pt-BR`);
    if (geoRes.ok) {
      const geo = await geoRes.json();
      city = geo.city || '';
      region = geo.regionName || '';
      country = geo.country || '';
    }
  } catch {}

  res.status(200).json({ ip, city, region, country });
}
