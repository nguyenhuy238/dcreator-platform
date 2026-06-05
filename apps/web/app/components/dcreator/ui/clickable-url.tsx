import { getHostnameLabel, normalizeUrl, shortenUrl } from "@/lib/url";

type ClickableUrlProps = {
  url: string;
  label?: string;
  className?: string;
  fallbackClassName?: string;
  maxLength?: number;
};

export function ClickableUrl({ url, label, className, fallbackClassName, maxLength = 56 }: ClickableUrlProps) {
  const normalized = normalizeUrl(url);
  if (!normalized) {
    return <span className={fallbackClassName ?? "break-all text-zinc-600"}>{url}</span>;
  }

  const displayLabel = label ?? getHostnameLabel(normalized) ?? shortenUrl(normalized, maxLength);
  return (
    <a
      className={className ?? "break-all font-medium text-zinc-800 underline decoration-zinc-300 underline-offset-4 hover:text-zinc-950"}
      href={normalized}
      target="_blank"
      rel="noopener noreferrer"
      title={normalized}
    >
      {displayLabel}
    </a>
  );
}

export function LinkifiedText({ text, className }: { text: string; className?: string }) {
  const urlPattern = /(?:https?:\/\/|www\.)[^\s<>"')]+|(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/[^\s<>"')]*)?/gi;
  const parts: Array<{ type: "text" | "url"; value: string }> = [];
  let lastIndex = 0;

  for (const match of text.matchAll(urlPattern)) {
    const value = match[0];
    const index = match.index ?? 0;
    if (!normalizeUrl(value)) continue;
    if (index > lastIndex) parts.push({ type: "text", value: text.slice(lastIndex, index) });
    parts.push({ type: "url", value });
    lastIndex = index + value.length;
  }
  if (parts.length === 0) return <span className={className}>{text}</span>;
  if (lastIndex < text.length) parts.push({ type: "text", value: text.slice(lastIndex) });

  return (
    <span className={className}>
      {parts.map((part, index) =>
        part.type === "url" ? (
          <ClickableUrl key={`${part.value}-${index}`} url={part.value} className="break-all font-semibold text-zinc-800 underline decoration-zinc-300 underline-offset-4 hover:text-zinc-950" />
        ) : (
          <span key={`${part.value}-${index}`}>{part.value}</span>
        )
      )}
    </span>
  );
}
