import { getVideoEmbed } from "@/lib/video";

export function VideoPlayer({ url, fileUrl }: { url?: string | null; fileUrl?: string | null }) {
  if (fileUrl) {
    return (
      <div className="overflow-hidden rounded-xl bg-black">
        <video src={fileUrl} controls controlsList="nodownload" className="aspect-video w-full" />
      </div>
    );
  }
  const embed = getVideoEmbed(url);
  if (!embed) return null;
  if (embed.type === "file") {
    return (
      <div className="overflow-hidden rounded-xl bg-black">
        <video src={embed.src} controls controlsList="nodownload" className="aspect-video w-full" />
      </div>
    );
  }

  // Google Drive: sin "allow-popups" el botón de abrir en una pestaña nueva no hace nada,
  // y además una capa invisible encima impide hacerle clic.
  const isDrive = embed.src.startsWith("https://drive.google.com/");

  return (
    <div className="relative aspect-video overflow-hidden rounded-xl bg-black">
      <iframe
        src={embed.src}
        className="size-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; fullscreen; gyroscope; picture-in-picture"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
        title="Vídeo de la lección"
        {...(isDrive ? { sandbox: "allow-scripts allow-same-origin allow-presentation" } : {})}
      />
      {isDrive && <div aria-hidden className="absolute top-0 right-0 h-16 w-16" />}
    </div>
  );
}
