"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { EmptyState, ErrorState, LoadingSkeleton, PageHeader, SectionHeader } from "@/app/components/dcreator/ui/base";

type ApiResult<T> = { success: boolean; data?: T; error?: string };

type MissionItem = {
  id: string;
  status: string;
  productReceiveOption: string;
  productStatus: string;
  videoReviewStatus: string;
  videoReviewFeedback: string | null;
  publishStatus: string;
  publishFeedback: string | null;
  publishSubmittedAt: string | null;
  mission: { title: string; description: string; rewardPoints: number; productLink: string | null; deadlineAt: string | null };
  campaign: { title: string; slug: string };
  submission: {
    videoUrl: string | null;
    note: string | null;
    rejectReason: string | null;
    publicVideoUrl: string | null;
    socialPostUrl: string | null;
    adCode: string | null;
    screenshotUrl: string | null;
    purchaseBillImageUrl: string | null;
    productReviewScreenshotUrl: string | null;
    finalProofNote: string | null;
  } | null;
};

type FormMap = Record<string, string>;

function fmtDate(value: string | null) {
  if (!value) return "Khong gioi han";
  return new Date(value).toLocaleDateString("vi-VN");
}

function workflowStatus(item: MissionItem) {
  if (item.status === "COMPLETED") return "Hoan thanh";
  if (item.publishStatus === "PENDING") return "Bai dang dang cho duyet cuoi";
  if (item.publishStatus === "REJECTED") return "Bi tu choi buoc cuoi";
  if (item.videoReviewStatus === "PENDING") return "Video dang cho duyet";
  if (item.videoReviewStatus === "REJECTED") return "Video bi tu choi";
  if (item.videoReviewStatus === "APPROVED") return "Cho dang bai public";
  if (item.productReceiveOption === "CREATOR_BUY_FIRST" && item.productStatus !== "RECEIVED") return "Cho mua san pham";
  return "Cho nop video";
}

async function fetchJson<T>(url: string, init?: RequestInit) {
  const res = await fetch(url, init);
  const body = (await res.json()) as ApiResult<T>;
  if (!res.ok || !body.success || !body.data) throw new Error(body.error ?? "Khong the thuc hien thao tac");
  return body.data;
}

export default function CreatorMissionsPage() {
  const [items, setItems] = useState<MissionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busyId, setBusyId] = useState("");

  const [billUrlMap, setBillUrlMap] = useState<FormMap>({});
  const [ratingUrlMap, setRatingUrlMap] = useState<FormMap>({});
  const [purchaseNoteMap, setPurchaseNoteMap] = useState<FormMap>({});
  const [videoUrlMap, setVideoUrlMap] = useState<FormMap>({});
  const [videoNoteMap, setVideoNoteMap] = useState<FormMap>({});
  const [publicUrlMap, setPublicUrlMap] = useState<FormMap>({});
  const [adCodeMap, setAdCodeMap] = useState<FormMap>({});
  const [screenshotMap, setScreenshotMap] = useState<FormMap>({});
  const [finalNoteMap, setFinalNoteMap] = useState<FormMap>({});

  async function load() {
    setLoading(true);
    setError("");
    try {
      const data = await fetchJson<MissionItem[]>("/api/creator/missions");
      setItems(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Khong the tai nhiem vu");
    } finally {
      setLoading(false);
    }
  }

  async function submitPurchaseProof(item: MissionItem) {
    const bill = billUrlMap[item.id]?.trim();
    const rating = ratingUrlMap[item.id]?.trim();
    if (!bill || !rating) {
      setError("Can nhap day du anh bill va anh danh gia 5 sao.");
      return;
    }
    setBusyId(item.id);
    setError("");
    setNotice("");
    try {
      await fetchJson(`/api/creator/missions/${item.id}/purchase-proof`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          purchaseBillImageUrl: bill,
          productReviewScreenshotUrl: rating,
          purchaseProofNote: purchaseNoteMap[item.id]?.trim() || undefined
        })
      });
      setNotice("Da xac nhan mua hang. Ban co the nop video review.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Khong the gui bang chung mua hang");
    } finally {
      setBusyId("");
    }
  }

  async function submitVideo(item: MissionItem) {
    const videoUrl = videoUrlMap[item.id]?.trim();
    if (!videoUrl) {
      setError("Can nhap video URL.");
      return;
    }
    setBusyId(item.id);
    setError("");
    setNotice("");
    try {
      await fetchJson(`/api/creator/missions/${item.id}/video-submission`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoUrl, note: videoNoteMap[item.id]?.trim() || undefined })
      });
      setNotice("Da gui video review.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Khong the gui video");
    } finally {
      setBusyId("");
    }
  }

  async function submitPublish(item: MissionItem) {
    const publicUrl = publicUrlMap[item.id]?.trim();
    if (!publicUrl) {
      setError("Can nhap link video public/social post.");
      return;
    }
    setBusyId(item.id);
    setError("");
    setNotice("");
    try {
      await fetchJson(`/api/creator/missions/${item.id}/publish-submission`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          publicVideoUrl: publicUrl,
          adCode: adCodeMap[item.id]?.trim() || undefined,
          screenshotUrl: screenshotMap[item.id]?.trim() || undefined,
          finalProofNote: finalNoteMap[item.id]?.trim() || undefined
        })
      });
      setNotice("Da gui buoc dang bai public.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Khong the gui buoc dang public");
    } finally {
      setBusyId("");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const counters = useMemo(() => {
    let waitingProduct = 0;
    let waitingVideo = 0;
    let reviewingVideo = 0;
    let waitingPublish = 0;
    let reviewingFinal = 0;
    let completed = 0;
    for (const item of items) {
      if (item.status === "COMPLETED") {
        completed += 1;
      } else if (item.publishStatus === "PENDING") {
        reviewingFinal += 1;
      } else if (item.videoReviewStatus === "PENDING") {
        reviewingVideo += 1;
      } else if (item.videoReviewStatus === "APPROVED") {
        waitingPublish += 1;
      } else if (item.productReceiveOption === "CREATOR_BUY_FIRST" && item.productStatus !== "RECEIVED") {
        waitingProduct += 1;
      } else {
        waitingVideo += 1;
      }
    }
    return { waitingProduct, waitingVideo, reviewingVideo, waitingPublish, reviewingFinal, completed };
  }, [items]);

  return (
    <>
      <PageHeader
        title="Nhiem vu cua toi"
        subtitle="Day la man hinh chinh de ban thuc hien nhiem vu: mua hang (neu co), nop video, va nop link public."
        action={<Link href="/dashboard/creator/jobs" className="dc-btn-secondary">Xem campaign/job</Link>}
      />

      {notice ? <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{notice}</p> : null}
      {error ? <ErrorState title="Co loi" description={error} onRetry={() => void load()} /> : null}
      {loading ? <LoadingSkeleton rows={5} /> : null}

      {!loading ? (
        <>
          <section className="dc-grid-dashboard">
            <article className="dc-card p-4"><p className="text-sm text-zinc-600">Cho mua san pham</p><p className="text-2xl font-bold">{counters.waitingProduct}</p></article>
            <article className="dc-card p-4"><p className="text-sm text-zinc-600">Cho nop video</p><p className="text-2xl font-bold">{counters.waitingVideo}</p></article>
            <article className="dc-card p-4"><p className="text-sm text-zinc-600">Video dang cho duyet</p><p className="text-2xl font-bold">{counters.reviewingVideo}</p></article>
            <article className="dc-card p-4"><p className="text-sm text-zinc-600">Cho dang social</p><p className="text-2xl font-bold">{counters.waitingPublish}</p></article>
            <article className="dc-card p-4"><p className="text-sm text-zinc-600">Dang cho duyet cuoi</p><p className="text-2xl font-bold">{counters.reviewingFinal}</p></article>
            <article className="dc-card p-4"><p className="text-sm text-zinc-600">Hoan thanh</p><p className="text-2xl font-bold">{counters.completed}</p></article>
          </section>

          <section className="mt-6">
            <SectionHeader title="Danh sach Creator Mission" subtitle={`${items.length} nhiem vu`} />
            {items.length === 0 ? (
              <EmptyState
                title="Ban chua co nhiem vu da duyet"
                description="Sau khi don xin nhiem vu duoc duyet, nhiem vu se xuat hien tai day."
                action={<Link href="/dashboard/creator/jobs" className="dc-btn-primary">Xin lam nhiem vu</Link>}
              />
            ) : (
              <div className="grid gap-4">
                {items.map((item) => {
                  const canSubmitPurchase = item.productReceiveOption === "CREATOR_BUY_FIRST" && item.productStatus !== "RECEIVED";
                  const canSubmitVideo =
                    item.status !== "COMPLETED" &&
                    item.videoReviewStatus !== "PENDING" &&
                    item.publishStatus !== "PENDING" &&
                    (item.productReceiveOption === "NO_PRODUCT_REQUIRED" || item.productStatus === "RECEIVED");
                  const canSubmitPublish = item.videoReviewStatus === "APPROVED" && item.status !== "COMPLETED";
                  return (
                    <article key={item.id} className="dc-card p-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <h2 className="text-lg font-semibold text-zinc-900">{item.mission.title}</h2>
                          <p className="text-sm text-zinc-600">Campaign: {item.campaign.title}</p>
                        </div>
                        <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-700">
                          {workflowStatus(item)}
                        </span>
                      </div>

                      <p className="mt-2 text-sm text-zinc-700">{item.mission.description}</p>
                      <div className="mt-2 grid gap-1 text-sm text-zinc-600 md:grid-cols-2">
                        <p>Reward: <strong>{item.mission.rewardPoints.toLocaleString("vi-VN")} N-Points</strong></p>
                        <p>Deadline: <strong>{fmtDate(item.mission.deadlineAt)}</strong></p>
                        <p>Video status: <strong>{item.videoReviewStatus}</strong></p>
                        <p>Publish status: <strong>{item.publishStatus}</strong></p>
                      </div>

                      {item.videoReviewFeedback ? <p className="mt-2 text-sm text-red-700">Feedback video: {item.videoReviewFeedback}</p> : null}
                      {item.publishFeedback ? <p className="mt-1 text-sm text-red-700">Feedback buoc cuoi: {item.publishFeedback}</p> : null}
                      {item.submission?.rejectReason ? <p className="mt-1 text-sm text-red-700">Reject reason: {item.submission.rejectReason}</p> : null}

                      {canSubmitPurchase ? (
                        <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                          <p className="font-medium">Buoc 1 - Mua san pham</p>
                          <p className="text-sm text-zinc-600">Link san pham: {item.mission.productLink ?? "-"}</p>
                          <p className="text-sm text-zinc-600">Huong dan: Dat hang dung link, danh gia 5 sao, upload anh bill va anh danh gia.</p>
                          <div className="mt-2 grid gap-2">
                            <input className="dc-input" placeholder="URL anh bill mua hang" value={billUrlMap[item.id] ?? ""} onChange={(e) => setBillUrlMap((s) => ({ ...s, [item.id]: e.target.value }))} />
                            <input className="dc-input" placeholder="URL anh da danh gia 5 sao" value={ratingUrlMap[item.id] ?? ""} onChange={(e) => setRatingUrlMap((s) => ({ ...s, [item.id]: e.target.value }))} />
                            <textarea className="dc-input" placeholder="Ghi chu (neu co)" value={purchaseNoteMap[item.id] ?? ""} onChange={(e) => setPurchaseNoteMap((s) => ({ ...s, [item.id]: e.target.value }))} />
                            <button className="dc-btn-primary" disabled={busyId === item.id} onClick={() => void submitPurchaseProof(item)}>Xac nhan da mua hang</button>
                          </div>
                        </div>
                      ) : null}

                      {canSubmitVideo ? (
                        <div className="mt-4 rounded-xl border border-zinc-200 bg-white p-3">
                          <p className="font-medium">Buoc 2 - Nop video review</p>
                          <div className="mt-2 grid gap-2">
                            <input className="dc-input" placeholder="Video URL" value={videoUrlMap[item.id] ?? item.submission?.videoUrl ?? ""} onChange={(e) => setVideoUrlMap((s) => ({ ...s, [item.id]: e.target.value }))} />
                            <textarea className="dc-input" placeholder="Ghi chu video" value={videoNoteMap[item.id] ?? item.submission?.note ?? ""} onChange={(e) => setVideoNoteMap((s) => ({ ...s, [item.id]: e.target.value }))} />
                            <button className="dc-btn-primary" disabled={busyId === item.id} onClick={() => void submitVideo(item)}>
                              {item.videoReviewStatus === "REJECTED" ? "Gui lai video" : "Gui video review"}
                            </button>
                          </div>
                        </div>
                      ) : null}

                      {canSubmitPublish ? (
                        <div className="mt-4 rounded-xl border border-zinc-200 bg-white p-3">
                          <p className="font-medium">Buoc 3 - Nop link public</p>
                          <div className="mt-2 grid gap-2">
                            <input className="dc-input" placeholder="Public video URL / Social post URL" value={publicUrlMap[item.id] ?? item.submission?.publicVideoUrl ?? item.submission?.socialPostUrl ?? ""} onChange={(e) => setPublicUrlMap((s) => ({ ...s, [item.id]: e.target.value }))} />
                            <input className="dc-input" placeholder="Ma quang cao (adCode)" value={adCodeMap[item.id] ?? item.submission?.adCode ?? ""} onChange={(e) => setAdCodeMap((s) => ({ ...s, [item.id]: e.target.value }))} />
                            <input className="dc-input" placeholder="Screenshot URL (neu can)" value={screenshotMap[item.id] ?? item.submission?.screenshotUrl ?? ""} onChange={(e) => setScreenshotMap((s) => ({ ...s, [item.id]: e.target.value }))} />
                            <textarea className="dc-input" placeholder="Ghi chu buoc cuoi" value={finalNoteMap[item.id] ?? item.submission?.finalProofNote ?? ""} onChange={(e) => setFinalNoteMap((s) => ({ ...s, [item.id]: e.target.value }))} />
                            <button className="dc-btn-primary" disabled={busyId === item.id} onClick={() => void submitPublish(item)}>
                              {item.publishStatus === "REJECTED" ? "Gui lai buoc cuoi" : "Gui buoc hoan thanh"}
                            </button>
                          </div>
                        </div>
                      ) : null}

                      {item.status === "COMPLETED" ? (
                        <p className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                          Nhiem vu da hoan thanh. N-Points da duoc cong theo ket qua duyet.
                        </p>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </>
      ) : null}
    </>
  );
}
