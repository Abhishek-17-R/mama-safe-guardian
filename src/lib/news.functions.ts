import { createServerFn } from "@tanstack/react-start";

export interface NewsItem {
  title: string;
  description: string;
  url: string;
  image: string | null;
  source: string;
  publishedAt: string;
}

// Decode common HTML entities found in RSS feeds.
function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, n) => String.fromCharCode(parseInt(n, 16)));
}

function stripTags(s: string): string {
  return s.replace(/<[^>]*>/g, "").trim();
}

function pick(tag: string, block: string): string {
  // Match <tag>...</tag>, including CDATA sections.
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  const m = block.match(re);
  if (!m) return "";
  let inner = m[1].trim();
  const cdata = inner.match(/<!\[CDATA\[([\s\S]*?)\]\]>/);
  if (cdata) inner = cdata[1];
  return decodeEntities(inner).trim();
}

function extractImage(block: string): string | null {
  // Try common image tags inside an item.
  const mediaContent = block.match(/<media:content[^>]*url="([^"]+)"/i);
  if (mediaContent) return mediaContent[1];
  const mediaThumb = block.match(/<media:thumbnail[^>]*url="([^"]+)"/i);
  if (mediaThumb) return mediaThumb[1];
  const enclosure = block.match(/<enclosure[^>]*url="([^"]+)"[^>]*type="image/i);
  if (enclosure) return enclosure[1];
  // Fallback: first <img src="..."> in the description.
  const desc = pick("description", block);
  const img = desc.match(/<img[^>]*src="([^"]+)"/i);
  if (img) return img[1];
  return null;
}

// Parse Google News RSS source string from the description, e.g. "... - BBC News".
function extractSource(descriptionText: string, fallback: string): string {
  const dashSplit = descriptionText.split(" - ");
  if (dashSplit.length > 1) {
    const last = dashSplit[dashSplit.length - 1].trim();
    if (last && last.length < 60) return last;
  }
  return fallback;
}

export const getMaternalNews = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ articles: NewsItem[]; error: string | null }> => {
    // Verified-source allowlist: official health bodies + reputable medical publishers.
    // We bias the query to these domains and filter results post-fetch as a safety net.
    const VERIFIED_DOMAINS = [
      "who.int", "cdc.gov", "nhs.uk", "unicef.org", "mayoclinic.org", "aap.org",
      "bmj.com", "thelancet.com", "reuters.com", "apnews.com",
      "nih.gov", "nichd.nih.gov", "acog.org", "marchofdimes.org",
    ];
    const siteFilter = VERIFIED_DOMAINS.map((d) => `site:${d}`).join(" OR ");
    const topics =
      '("maternal health" OR "maternity" OR "pregnancy" OR "antenatal" OR "postpartum" OR "newborn" OR "baby" OR "infant" OR "child health")';
    const query = encodeURIComponent(`${topics} (${siteFilter})`);
    const url = `https://news.google.com/rss/search?q=${query}+when:30d&hl=en-US&gl=US&ceid=US:en`;

    try {
      const res = await fetch(url, {
        headers: {
          Accept: "application/rss+xml, application/xml, text/xml, */*",
          "User-Agent":
            "Mozilla/5.0 (compatible; MatriCareBot/1.0; +https://matricare.app)",
        },
      });

      if (!res.ok) {
        console.error("News RSS error:", res.status, await res.text().catch(() => ""));
        return { articles: [], error: `News unavailable (${res.status})` };
      }

      const xml = await res.text();
      const itemBlocks = xml.match(/<item[\s\S]*?<\/item>/g) ?? [];

      // Hard filters: must match a maternity/baby/health topic and a verified domain.
      const KEYWORDS = [
        "maternity", "maternal", "pregnan", "antenatal", "prenatal",
        "postnatal", "postpartum", "childbirth", "midwif", "obstetric",
        "newborn", "neonatal", "infant", "baby", "babies", "breastfeed",
        "vaccine", "immuniz", "nutrition", "wellness", "health",
      ];
      const BLOCK = [
        "celebrity", "kardashian", "jenner", "bollywood", "hollywood",
        "red carpet", "baby bump photo", "shows off", "flaunts", "stuns in",
        "instagram", "tiktok", "reality star", "influencer",
      ];

      const articles: NewsItem[] = [];
      for (const block of itemBlocks) {
        const title = stripTags(pick("title", block));
        const link = pick("link", block);
        const pubDate = pick("pubDate", block);
        const sourceTag = stripTags(pick("source", block));
        const descriptionRaw = pick("description", block);
        const descriptionText = stripTags(descriptionRaw);
        if (!title || !link) continue;

        const text = `${title} ${descriptionText}`.toLowerCase();
        if (BLOCK.some((b) => text.includes(b))) continue;
        if (!KEYWORDS.some((k) => text.includes(k))) continue;

        // Verify the article links to one of our trusted domains.
        const linkLower = link.toLowerCase();
        const sourceLower = sourceTag.toLowerCase();
        const isVerified =
          VERIFIED_DOMAINS.some((d) => linkLower.includes(d)) ||
          VERIFIED_DOMAINS.some((d) => sourceLower.includes(d.split(".")[0]));
        if (!isVerified) continue;

        articles.push({
          title,
          description: descriptionText.slice(0, 240),
          url: link,
          image: extractImage(block),
          source: sourceTag || extractSource(descriptionText, "Verified source"),
          publishedAt: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
        });
        if (articles.length >= 8) break;
      }

      return { articles, error: null };
    } catch (err) {
      console.error("News fetch failed:", err);
      return { articles: [], error: "News service unavailable" };
    }
  },
);
