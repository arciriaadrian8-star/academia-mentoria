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
        <video src={embed.src} controls className="aspect-video w-full" />
      </div>
    );
  }
  return (
    <div className="aspect-video overflow-hidden rounded-xl bg-black">
      <iframe
        src={embed.src}
        className="size-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; fullscreen; gyroscope; picture-in-picture"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
        title="Vídeo de la lección"
      />
    </div>
  );
}
