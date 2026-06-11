const COVER_MARKER = "[[COVER_IMAGE_URL]]:";
const CONTENT_FILE_MARKER = "[[CONTENT_FILE_URL]]:";
const REQUIREMENTS_MARKER = "[[CAMPAIGN_REQUIREMENTS]]:";

function extractMarkerLine(lines: string[], marker: string) {
  const markerIndex = lines.findIndex((line) => line.trim().startsWith(marker));
  if (markerIndex < 0) return { value: "", markerIndex: -1, consumedIndexes: new Set<number>() };

  const firstValue = lines[markerIndex]?.trim().slice(marker.length).trim() ?? "";
  const continuationParts: string[] = [];
  const consumedIndexes = new Set<number>([markerIndex]);

  for (const [offset, line] of lines.slice(markerIndex + 1).entries()) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("[[")) break;
    if (!trimmed.startsWith("/") && !trimmed.startsWith("?") && !trimmed.startsWith("#")) break;
    continuationParts.push(trimmed);
    consumedIndexes.add(markerIndex + offset + 1);
  }

  return {
    value: [firstValue, ...continuationParts].join(""),
    markerIndex,
    consumedIndexes
  };
}

export function extractCampaignRequestMarkerValue(brief: string, marker: string) {
  return extractMarkerLine(brief.split("\n"), marker).value;
}

export function extractCampaignRequestMeta(brief: string) {
  const lines = brief.split("\n");
  const coverMeta = extractMarkerLine(lines, COVER_MARKER);
  const contentMeta = extractMarkerLine(lines, CONTENT_FILE_MARKER);
  const requirementsMeta = extractMarkerLine(lines, REQUIREMENTS_MARKER);
  const coverImageUrl = coverMeta.value || null;
  const contentFileUrl = contentMeta.value || null;
  const requirementValue = requirementsMeta.value;
  const consumedIndexes = new Set([
    ...coverMeta.consumedIndexes,
    ...contentMeta.consumedIndexes,
    ...requirementsMeta.consumedIndexes
  ]);
  const requirements = (() => {
    if (!requirementValue) return null;
    try {
      return decodeURIComponent(requirementValue);
    } catch {
      return requirementValue;
    }
  })();

  const cleanBrief = lines
    .filter((_, index) => !consumedIndexes.has(index))
    .join("\n")
    .trim();

  return {
    coverImageUrl,
    contentFileUrl,
    requirements,
    cleanBrief
  };
}

export const campaignRequestMarkers = {
  cover: COVER_MARKER,
  content: CONTENT_FILE_MARKER,
  requirements: REQUIREMENTS_MARKER
};
