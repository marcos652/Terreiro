import type { NextApiRequest, NextApiResponse } from "next";

type YouTubeResult = {
  id: string;
  title: string;
  thumb: string;
  channel: string;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const q = (req.query.q as string | undefined)?.trim();
  if (!q) {
    return res.status(400).json({ error: "missing query" });
  }

  const key = process.env.YOUTUBE_API_KEY || process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;
  if (!key) {
    return res.status(500).json({ error: "missing api key" });
  }

  try {
    const params = new URLSearchParams({
      key,
      q,
      part: "snippet",
      type: "video",
      videoCategoryId: "10", // music category
      maxResults: "8",
      fields: "items(id/videoId,snippet/title,snippet/thumbnails/default/url,snippet/channelTitle)",
    });

    const response = await fetch(`https://www.googleapis.com/youtube/v3/search?${params.toString()}`);
    if (!response.ok) {
      return res.status(response.status).json({ error: "youtube request failed" });
    }

    const data = await response.json();
    const items: YouTubeResult[] = (data.items || [])
      .map((item: any) => ({
        id: item?.id?.videoId,
        title: item?.snippet?.title || "",
        thumb: item?.snippet?.thumbnails?.default?.url || "",
        channel: item?.snippet?.channelTitle || "",
      }))
      .filter((item: YouTubeResult) => Boolean(item.id));

    return res.status(200).json({ items });
  } catch (error) {
    return res.status(500).json({ error: "internal error" });
  }
}
