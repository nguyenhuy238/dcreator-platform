export function resolveAdminImageSrc(input?: string | null) {
  const raw = (input ?? "").trim();
  if (!raw) return "";

  try {
    const parsed = new URL(raw);
    if (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") {
      return `${parsed.pathname}${parsed.search}`;
    }
    return raw;
  } catch {
    if (raw.startsWith("/")) return raw;
    return `/${raw}`;
  }
}
