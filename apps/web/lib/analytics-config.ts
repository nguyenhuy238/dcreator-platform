const DEFAULT_GA_MEASUREMENT_ID = "G-MRYYNYR9VW";

export function getGoogleAnalyticsMeasurementId() {
  return process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || DEFAULT_GA_MEASUREMENT_ID;
}
