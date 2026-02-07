/**
 * Mapping domain patterns to simple-icons slugs (public/icons/*.svg).
 * Falls back to Google Favicon API for unknown URLs.
 */
const DOMAIN_TO_SLUG: Record<string, string> = {
  "docs.google.com": "googledocs",
  "sheets.google.com": "googlesheets",
  "drive.google.com": "googledrive",
  "discord.com": "discord",
  "discord.gg": "discord",
  "t.me": "telegram",
  "web.telegram.org": "telegram",
  "telegram.org": "telegram",
  "notion.so": "notion",
  "notion.site": "notion",
  "figma.com": "figma",
  "miro.com": "miro",
  "trello.com": "trello",
  "github.com": "github",
  "airtable.com": "airtable",
};

/** Couleurs des marques (simple-icons hex). */
const SLUG_TO_HEX: Record<string, string> = {
  googledocs: "4285F4",
  googlesheets: "34A853",
  googleslides: "FBBC04",
  googledrive: "4285F4",
  discord: "5865F2",
  telegram: "26A5E4",
  notion: "000000",
  figma: "F24E1E",
  miro: "050038",
  trello: "0052CC",
  github: "181717",
  airtable: "18BFFF",
};

function getBaseUrl(): string {
  if (typeof window !== "undefined") return window.location.origin;
  return "";
}

export type IconInfo =
  | { type: "local"; url: string; hex: string }
  | { type: "favicon"; url: string };

function getGoogleSlugFromPath(pathname: string): string | null {
  if (pathname.includes("/spreadsheets/")) return "googlesheets";
  if (pathname.includes("/document/")) return "googledocs";
  if (pathname.includes("/presentation/")) return "googleslides";
  if (pathname.includes("/file/") || pathname.includes("/drive/")) return "googledrive";
  return null;
}

export function getServiceIconInfo(url: string): IconInfo {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.replace(/^www\./, "");
    const pathname = parsed.pathname.toLowerCase();

    if (hostname === "docs.google.com" || hostname.endsWith(".docs.google.com")) {
      const slug = getGoogleSlugFromPath(pathname) ?? "googledocs";
      const base = getBaseUrl();
      const iconUrl = base ? `${base}/icons/${slug}.svg` : `/icons/${slug}.svg`;
      const hex = SLUG_TO_HEX[slug] ?? "000000";
      return { type: "local", url: iconUrl, hex };
    }

    for (const [pattern, slug] of Object.entries(DOMAIN_TO_SLUG)) {
      if (pattern === "docs.google.com") continue;
      if (hostname === pattern || hostname.endsWith(`.${pattern}`)) {
        const base = getBaseUrl();
        const iconUrl = base ? `${base}/icons/${slug}.svg` : `/icons/${slug}.svg`;
        const hex = SLUG_TO_HEX[slug] ?? "000000";
        return { type: "local", url: iconUrl, hex };
      }
    }

    return {
      type: "favicon",
      url: `https://www.google.com/s2/favicons?domain=${hostname}&sz=128`,
    };
  } catch {
    return { type: "favicon", url: "https://www.google.com/s2/favicons?domain=example.com&sz=128" };
  }
}

/** @deprecated Use getServiceIconInfo */
export function getServiceIconUrl(url: string): string {
  const info = getServiceIconInfo(url);
  return info.url;
}

function getGoogleNameFromPath(pathname: string): string {
  if (pathname.includes("/spreadsheets/")) return "Google Sheets";
  if (pathname.includes("/document/")) return "Google Docs";
  if (pathname.includes("/presentation/")) return "Google Slides";
  if (pathname.includes("/file/") || pathname.includes("/drive/")) return "Google Drive";
  return "Google Docs";
}

export function getServiceName(url: string): string {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.replace(/^www\./, "");
    const pathname = parsed.pathname.toLowerCase();

    if (hostname === "docs.google.com" || hostname.endsWith(".docs.google.com")) {
      return getGoogleNameFromPath(pathname);
    }

    const names: Record<string, string> = {
      "sheets.google.com": "Google Sheets",
      "drive.google.com": "Google Drive",
      "discord.com": "Discord",
      "discord.gg": "Discord",
      "t.me": "Telegram",
      "web.telegram.org": "Telegram",
      "notion.so": "Notion",
      "figma.com": "Figma",
      "miro.com": "Miro",
      "trello.com": "Trello",
      "slack.com": "Slack",
      "github.com": "GitHub",
      "airtable.com": "Airtable",
    }

    for (const [pattern, name] of Object.entries(names)) {
      if (hostname === pattern || hostname.endsWith(`.${pattern}`)) {
        return name;
      }
    }

    return hostname;
  } catch {
    return "Lien";
  }
}
