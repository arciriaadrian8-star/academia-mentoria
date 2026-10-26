export type VideoEmbed = { type: "iframe"; src: string } | { type: "file"; src: string } | null;

/** Convierte un enlace de YouTube, Vimeo, Loom, Google Drive o .mp4 en algo que se pueda incrustar. */
export function getVideoEmbed(raw: string | null | undefined): VideoEmbed {
  if (!raw) return null;
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;

  const host = url.hostname.replace(/^(www\.|m\.)/, "");
  const path = url.pathname;

  // YouTube
  let youtubeId: string | null = null;
  if (host === "youtu.be") youtubeId = path.slice(1).split("/")[0];
  if (host === "youtube.com" || host === "youtube-nocookie.com" || host === "music.youtube.com") {
    if (path === "/watch") youtubeId = url.searchParams.get("v");
    else youtubeId = path.match(/^\/(?:embed|shorts|live|v)\/([^/?#]+)/)?.[1] ?? null;
  }
  if (youtubeId) {
    return { type: "iframe", src: `https://www.youtube-nocookie.com/embed/${youtubeId}?rel=0&modestbranding=1` };
  }

  // Vimeo (incluye vídeos ocultos con hash: vimeo.com/123/abc)
  if (host === "vimeo.com") {
    const match = path.match(/\/(\d+)(?:\/([a-zA-Z0-9]+))?/);
    if (match) {
      const hash = match[2] ?? url.searchParams.get("h");
      return { type: "iframe", src: `https://player.vimeo.com/video/${match[1]}${hash ? `?h=${hash}` : ""}` };
    }
  }
  if (host === "player.vimeo.com") return { type: "iframe", src: url.toString() };

  // Loom
  if (host === "loom.com") {
    const id = path.match(/\/(?:share|embed)\/([a-zA-Z0-9]+)/)?.[1];
    if (id) return { type: "iframe", src: `https://www.loom.com/embed/${id}` };
  }

  // Google Drive
  if (host === "drive.google.com") {
    const id = path.match(/\/file\/d\/([^/]+)/)?.[1] ?? url.searchParams.get("id");
    if (id) return { type: "iframe", src: `https://drive.google.com/file/d/${id}/preview` };
  }

  // Archivo de vídeo directo
  if (/\.(mp4|webm|ogg|mov|m4v)$/i.test(path)) return { type: "file", src: url.toString() };

  // Cualquier otro reproductor (Wistia, Bunny, etc.)
  return { type: "iframe", src: url.toString() };
}
