"use client";

export default function CampaignDetailError({
  error,
  reset
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <main className="container">
      <h1>Khong tai duoc Campaign Detail</h1>
      <p className="error">{error.message}</p>
      <button type="button" onClick={reset}>
        Thu lai
      </button>
    </main>
  );
}
