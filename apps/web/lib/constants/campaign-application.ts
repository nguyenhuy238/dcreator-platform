export const CREATOR_CAMPAIGN_APPLICATION_TAG = "[CREATOR_CAMPAIGN_APPLICATION]";

export function hasCreatorCampaignApplicationTag(note: string | null | undefined) {
  return Boolean(note?.includes(CREATOR_CAMPAIGN_APPLICATION_TAG));
}

export function appendCreatorCampaignApplicationTag(note: string | null | undefined, slug: string) {
  const line = `${CREATOR_CAMPAIGN_APPLICATION_TAG} slug=${slug}`;
  if (!note) return line;
  if (note.includes(CREATOR_CAMPAIGN_APPLICATION_TAG)) return note;
  return `${note}\n${line}`;
}

