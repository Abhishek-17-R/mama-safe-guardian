import { createServerFn } from "@tanstack/react-start";

export interface NewsItem {
  title: string;
  description: string;
  url: string;
  image: string | null;
  source: string;
  publishedAt: string;
}

export const getMaternalNews = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ articles: NewsItem[]; error: string | null }> => {
    const apiKey = process.env.GNEWS_API_KEY;
    if (!apiKey) {
      return { articles: [], error: "News service not configured" };
    }

    try {
      const q = encodeURIComponent('"maternal health" OR pregnancy OR "antenatal care" OR "maternal mortality"');
      const url = `https://gnews.io/api/v4/search?q=${q}&lang=en&max=8&sortby=publishedAt&apikey=${apiKey}`;
      const res = await fetch(url, { headers: { Accept: "application/json" } });

      if (!res.ok) {
        const text = await res.text();
        console.error("GNews error:", res.status, text);
        return { articles: [], error: `News unavailable (${res.status})` };
      }

      const json = (await res.json()) as {
        articles?: Array<{
          title: string;
          description: string;
          url: string;
          image: string | null;
          publishedAt: string;
          source: { name: string };
        }>;
      };

      const articles: NewsItem[] = (json.articles || []).map((a) => ({
        title: a.title,
        description: a.description,
        url: a.url,
        image: a.image,
        source: a.source?.name ?? "Unknown",
        publishedAt: a.publishedAt,
      }));

      return { articles, error: null };
    } catch (err) {
      console.error("News fetch failed:", err);
      return { articles: [], error: "News service unavailable" };
    }
  },
);
