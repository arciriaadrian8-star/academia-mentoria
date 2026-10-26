import { cn, initials } from "@/lib/utils";

export function Avatar({
  name,
  url,
  size = 40,
  className,
}: {
  name: string | null | undefined;
  url?: string | null;
  size?: number;
  className?: string;
}) {
  const style = { width: size, height: size, fontSize: Math.max(10, size * 0.38) };
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={name ?? ""} style={style} className={cn("shrink-0 rounded-full object-cover", className)} />;
  }
  return (
    <span
      style={style}
      className={cn("inline-flex shrink-0 items-center justify-center rounded-full bg-brand/15 font-semibold text-brand", className)}
    >
      {initials(name)}
    </span>
  );
}
