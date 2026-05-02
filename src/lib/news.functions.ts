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
      // Maternity-health-focused query (must stay under GNews 200-char limit when encoded)
      const q = encodeURIComponent(
        '"maternal health" OR "pregnancy" OR "antenatal" OR "postpartum" OR "childbirth" OR "midwifery"'
      );
      const url = `https://gnews.io/api/v4/search?q=${q}&lang=en&max=25&sortby=publishedAt&in=title,description&topic=health&apikey=${apiKey}`;
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

      // Whitelist filter: only keep articles whose title or description clearly mentions maternity topics
      const KEYWORDS = [
        "maternity", "maternal", "pregnan", "antenatal", "prenatal",
        "postnatal", "postpartum", "childbirth", "midwif", "obstetric",
        "gynaecolog", "gynecolog", "newborn", "neonatal", "labor ward", "labour ward",
        "expecting mother", "expectant mother", "mother and child", "maternal mortality",
      ];
      // Block celebrity / entertainment / gossip noise
      const BLOCK = [
        "celebrity", "celebrities", "kardashian", "jenner", "instagram", "tiktok",
        "actress", "actor", "singer", "rapper", "model ", "reality star", "influencer",
        "boyfriend", "girlfriend", "wedding", "engagement ring", "red carpet",
        "bikini", "baby bump photo", "shows off", "flaunts", "stuns in",
        "bollywood", "hollywood", "netflix", "movie", "film star", "tv star",
        "royal", "prince ", "princess ", "duchess", "meghan", "harry",
      ];
      const articles: NewsItem[] = (json.articles || [])
        .filter((a) => {
          const text = `${a.title ?? ""} ${a.description ?? ""}`.toLowerCase();
          if (BLOCK.some((b) => text.includes(b))) return false;
          return KEYWORDS.some((k) => text.includes(k));
        })
        .slice(0, 8)
        .map((a) => ({
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
