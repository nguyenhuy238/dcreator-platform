export const DEFAULT_REQUIRED_HASHTAGS = ["#dCreator", "#Kocogi.vn"];
export const MAX_REQUIRED_HASHTAGS = 10;

export function normalizeHashtagValue(input: string) {
  const trimmed = input.trim();
  if (!trimmed) return "";
  return trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
}

export function getHashtagError(input: string) {
  const normalized = normalizeHashtagValue(input);
  if (!normalized || normalized === "#") return "Hashtag không được để trống.";
  if (/\s/.test(normalized)) return "Hashtag không được chứa khoảng trắng.";
  if (normalized.slice(1).includes("#")) return "Hashtag chỉ được có dấu # ở đầu.";
  if (normalized.length > 40) return "Hashtag tối đa 40 ký tự.";
  return "";
}

export function normalizeRequiredHashtags(input: string[]) {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const item of input) {
    const normalized = normalizeHashtagValue(item);
    if (!normalized || getHashtagError(normalized)) continue;

    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;

    seen.add(key);
    result.push(normalized);
    if (result.length >= MAX_REQUIRED_HASHTAGS) break;
  }

  return result;
}

export function validateRequiredHashtags(input: string[]) {
  if (input.length > MAX_REQUIRED_HASHTAGS) return `Tối đa ${MAX_REQUIRED_HASHTAGS} hashtag bắt buộc.`;

  const seen = new Set<string>();
  for (const item of input) {
    const error = getHashtagError(item);
    if (error) return error;

    const key = normalizeHashtagValue(item).toLowerCase();
    if (seen.has(key)) return "Hashtag không được trùng nhau.";
    seen.add(key);
  }

  return "";
}
