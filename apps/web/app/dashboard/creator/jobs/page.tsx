"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/app/components/dcreator/ui/base";
import { CampaignCoverImage } from "@/app/components/dcreator/ui/CampaignCoverImage";
import { CampaignList } from "@/app/campaigns/_components/CampaignList";
import { CreatorMissionsPanel } from "@/app/dashboard/creator/_components/CreatorMissionsPanel";

type MissionHistoryItem = {
  id: string;
  status: string;
  productReceiveOption: string;
  productStatus: string;
  videoReviewStatus: string;
  submission?: { status: string } | null;
  publishStatus: string;
  missionApplication?: { status: string; rejectReason?: string | null } | null;
  mission: { title: string; deadlineAt?: string | null };
  campaign: { id: string; title: string; slug: string; coverImageUrl?: string | null; brand?: { displayName?: string } | null };
};

type CampaignItem = {
  id: string;
  missionId: string;
  slug: string;
  title: string;
  brand: string;
  coverImageUrl: string | null;
  missionStatus: string;
  canReapply: boolean;
  rejectReason: string | null;
};

type HistoryStatus = "IN_PROGRESS" | "COMPLETED" | "REJECTED" | "OVERDUE";

const statusLabel: Record<HistoryStatus, string> = {
  IN_PROGRESS: "Đang thực hiện",
  COMPLETED: "Đã hoàn thành",
  REJECTED: "Bị từ chối",
  OVERDUE: "Quá hạn"
};

function isOverdue(deadlineAt: string | null | undefined) {
  if (!deadlineAt) return false;
  return new Date(deadlineAt).getTime() < Date.now();
}

function toMissionHistoryStatus(item: MissionHistoryItem): HistoryStatus {
  if (item.missionApplication?.status === "REJECTED") return "REJECTED";
  if (item.status === "COMPLETED") return "COMPLETED";
  if (item.status === "CANCELLED") return "REJECTED";
  if (isOverdue(item.mission.deadlineAt ?? null)) return "OVERDUE";
  return "IN_PROGRESS";
}

function missionStatusLabel(item: MissionHistoryItem) {
  if (isOverdue(item.mission.deadlineAt ?? null) && item.status !== "COMPLETED" && item.missionApplication?.status !== "REJECTED") {
    return "Quá hạn";
  }
  if (item.missionApplication?.status === "PENDING_REVIEW") return "Chờ duyệt tham gia";
  if (item.missionApplication?.status === "REJECTED") return "Đăng ký bị từ chối";
  if (item.status === "COMPLETED") return "Đã hoàn thành";
  if (item.status === "CANCELLED") return "Bị từ chối";
  if (item.publishStatus === "PENDING") return "Chờ duyệt link public";
  if (item.publishStatus === "REJECTED") return "Link public bị từ chối";
  if (item.videoReviewStatus === "PENDING") return "Chờ duyệt video";
  if (item.videoReviewStatus === "REJECTED") return "Video bị từ chối";
  if (item.videoReviewStatus === "APPROVED") return "Cần nộp link public";
  if (item.status === "DRAFT_PENDING") {
    if (item.submission?.status === "SUBMITTED") return "Chờ duyệt kịch bản";
    if (item.submission?.status === "REJECTED") return "Kịch bản bị từ chối";
    return "Cần nộp kịch bản";
  }
  if (item.productReceiveOption === "PRODUCT_REQUIRED" && item.productStatus !== "RECEIVED") return "Cần xác nhận mua hàng";
  return "Cần nộp video";
}

function missionStatusPillClass(label: string) {
  if (label.includes("Quá hạn")) return "border-red-200 bg-red-50 text-red-700";
  if (label.includes("từ chối")) return "border-red-200 bg-red-50 text-red-700";
  if (label.includes("hoàn thành")) return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (label.includes("Chờ")) return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-blue-200 bg-blue-50 text-blue-700";
}

async function fetchJson<T>(url: string, init?: RequestInit) {
  const response = await fetch(url, init);
  const body = (await response.json()) as { success?: boolean; data?: T; error?: string };
  if (!response.ok || !body.success) {
    throw new Error(body.error ?? "Yêu cầu thất bại");
  }
  return body.data;
}

export default function CreatorJobsPage() {
  const router = useRouter();
  const [historyItems, setHistoryItems] = useState<CampaignItem[]>([]);
  const [participatedSlugs, setParticipatedSlugs] = useState<string[]>([]);
  const [activeStatus, setActiveStatus] = useState<HistoryStatus>("IN_PROGRESS");
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [busyMissionId, setBusyMissionId] = useState("");
  const [rejectedMissionId, setRejectedMissionId] = useState("");
  const [reapplyError, setReapplyError] = useState("");
  const [detailMissionId, setDetailMissionId] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      try {
        const missionsRes = await fetch("/api/me/mission", { cache: "no-store" });
        const missionsBody = await missionsRes.json();
        if (!active) return;
        const missionRows = (missionsBody?.data ?? []) as MissionHistoryItem[];
        setParticipatedSlugs(Array.from(new Set(missionRows.map((item) => item.campaign.slug))));

        const rows: CampaignItem[] = [];
        const seen = new Set<string>();
        for (const mission of missionRows) {
          const status = toMissionHistoryStatus(mission);
          if (status !== activeStatus) continue;
          const key = `${status}-${mission.campaign.slug}`;
          if (seen.has(key)) continue;
          seen.add(key);
          const currentMissionStatus = missionStatusLabel(mission);
          rows.push({
            id: mission.campaign.id,
            missionId: mission.id,
            slug: mission.campaign.slug,
            title: mission.campaign.title,
            brand: mission.campaign.brand?.displayName ?? "Đang cập nhật",
            coverImageUrl: mission.campaign.coverImageUrl ?? null,
            missionStatus: currentMissionStatus,
            canReapply: mission.missionApplication?.status === "REJECTED",
            rejectReason: mission.missionApplication?.rejectReason ?? null
          });
        }
        setHistoryItems(rows);
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [activeStatus]);

  const historyTitle = useMemo(() => statusLabel[activeStatus], [activeStatus]);
  const rejectedMission = useMemo(
    () => (rejectedMissionId ? historyItems.find((item) => item.missionId === rejectedMissionId) ?? null : null),
    [historyItems, rejectedMissionId]
  );

  async function reapplyMission(item: CampaignItem) {
    setBusyMissionId(item.missionId);
    setReapplyError("");
    setNotice("");
    try {
      await fetchJson(`/api/campaigns/${item.slug}/creator-application`, {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      setRejectedMissionId("");
      setNotice("Đã gửi lại đăng ký campaign. Vui lòng chờ Brand/Admin duyệt.");
      const missionsRes = await fetch("/api/me/mission", { cache: "no-store" });
      const missionsBody = await missionsRes.json();
      const missionRows = (missionsBody?.data ?? []) as MissionHistoryItem[];
      setParticipatedSlugs(Array.from(new Set(missionRows.map((mission) => mission.campaign.slug))));

      const rows: CampaignItem[] = [];
      const seen = new Set<string>();
      for (const mission of missionRows) {
        const status = toMissionHistoryStatus(mission);
        if (status !== activeStatus) continue;
        const key = `${status}-${mission.campaign.slug}`;
        if (seen.has(key)) continue;
        seen.add(key);
        rows.push({
          id: mission.campaign.id,
          missionId: mission.id,
          slug: mission.campaign.slug,
          title: mission.campaign.title,
          brand: mission.campaign.brand?.displayName ?? "Đang cập nhật",
          coverImageUrl: mission.campaign.coverImageUrl ?? null,
          missionStatus: missionStatusLabel(mission),
          canReapply: mission.missionApplication?.status === "REJECTED",
          rejectReason: mission.missionApplication?.rejectReason ?? null
        });
      }
      setHistoryItems(rows);
    } catch (error) {
      setReapplyError(error instanceof Error ? error.message : "Không thể gửi lại đăng ký campaign.");
    } finally {
      setBusyMissionId("");
    }
  }

  return (
    <>
      <PageHeader title="Campaign / Job" subtitle="Danh sách campaign đang mở để Creator tham gia và nhận nhiệm vụ phù hợp." />
      {notice ? <p className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{notice}</p> : null}
      <section className="mb-6 rounded-2xl border border-zinc-200 bg-white p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-black text-zinc-900">{historyTitle}</h2>
          <div className="flex flex-wrap gap-2">
            {(["IN_PROGRESS", "REJECTED", "OVERDUE", "COMPLETED"] as HistoryStatus[]).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setActiveStatus(status)}
                className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                  activeStatus === status ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-600"
                }`}
              >
                {statusLabel[status]}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-3 overflow-x-auto pb-2">
          {loading ? (
            Array.from({ length: 3 }).map((_, index) => <div key={index} className="h-48 min-w-[230px] rounded-2xl bg-zinc-100 sm:min-w-[260px]" />)
          ) : historyItems.length === 0 ? (
            <p className="text-sm text-zinc-500">Chưa có campaign trong nhóm này.</p>
          ) : (
            historyItems.map((campaign) => (
              <article
                key={`${activeStatus}-${campaign.slug}`}
                className="group min-w-[230px] max-w-[230px] cursor-pointer overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:ring-1 hover:ring-zinc-300 sm:min-w-[260px] sm:max-w-[260px]"
                onClick={() => router.push(`/dashboard/creator/jobs/${campaign.slug}`)}
              >
                <div className="relative aspect-[16/9] w-full overflow-hidden bg-zinc-100">
                  <CampaignCoverImage
                    src={campaign.coverImageUrl}
                    alt={campaign.title}
                    className="object-cover transition duration-500 group-hover:scale-[1.03]"
                    sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                  />
                  <div className="pointer-events-none absolute right-3 top-3 rounded-full border border-white/70 bg-white/90 px-3 py-1 text-[11px] font-semibold text-zinc-900 opacity-0 shadow-sm transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                    Xem campaign
                  </div>
                </div>
                <div className="flex min-h-[136px] flex-col gap-2 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <p className="line-clamp-2 min-h-10 text-sm font-bold leading-5 text-zinc-900">{campaign.title}</p>
                      <p className="truncate text-sm leading-5 text-zinc-500">Brand: {campaign.brand}</p>
                    </div>
                    <span className={`max-w-[92px] shrink-0 rounded-xl border px-2 py-1 text-center text-[11px] font-bold leading-tight ${missionStatusPillClass(campaign.missionStatus)}`}>
                      {campaign.missionStatus}
                    </span>
                  </div>
                  <div className="flex justify-end pt-1">
                    <div className="flex flex-wrap justify-end gap-2">
                      {campaign.canReapply ? (
                        <button
                          type="button"
                          className="rounded-full bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
                          onClick={(event) => {
                            event.stopPropagation();
                            setReapplyError("");
                            setRejectedMissionId(campaign.missionId);
                          }}
                        >
                          Thao tác
                        </button>
                      ) : activeStatus === "OVERDUE" || activeStatus === "COMPLETED" ? (
                        <button
                          type="button"
                          className="rounded-full border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-100"
                          onClick={(event) => {
                            event.stopPropagation();
                            setDetailMissionId(campaign.missionId);
                          }}
                        >
                          Xem chi tiết
                        </button>
                      ) : activeStatus === "IN_PROGRESS" ? (
                        <button
                          type="button"
                          className="rounded-full bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-zinc-800"
                          onClick={(event) => {
                            event.stopPropagation();
                            setDetailMissionId(campaign.missionId);
                          }}
                        >
                          Tiếp tục
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      </section>
      <CampaignList excludeSlugs={participatedSlugs} compact detailHrefBase="/dashboard/creator/jobs" />
      {detailMissionId ? (
        <CreatorMissionsPanel
          overview={null}
          initialDetailMissionId={detailMissionId}
          detailOnly
          onDetailClose={() => setDetailMissionId("")}
        />
      ) : null}
      {rejectedMission ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/50 p-4" onClick={() => setRejectedMissionId("")}>
          <div className="w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-5 shadow-xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-lg font-bold text-zinc-900">Campaign bị từ chối</p>
                <p className="mt-1 text-sm text-zinc-600">{rejectedMission.title}</p>
              </div>
              <button type="button" className="rounded-full border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-100" onClick={() => setRejectedMissionId("")}>
                Đóng
              </button>
            </div>
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <p className="font-semibold">Lý do bị từ chối</p>
              <p className="mt-1 whitespace-pre-line">{rejectedMission.rejectReason || "Brand/Admin chưa nhập lý do cụ thể."}</p>
            </div>
            <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              Hãy thực hiện đầy đủ các yêu cầu để apply lại campaign. Sau khi gửi lại, đơn sẽ quay về trạng thái chờ duyệt.
            </p>
            {reapplyError ? <p className="mt-3 text-sm text-red-600">{reapplyError}</p> : null}
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button type="button" className="rounded-full border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-100" onClick={() => setRejectedMissionId("")}>
                Để sau
              </button>
              <button
                type="button"
                className="rounded-full bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={busyMissionId === rejectedMission.missionId}
                onClick={() => void reapplyMission(rejectedMission)}
              >
                {busyMissionId === rejectedMission.missionId ? "Đang gửi lại..." : "Đăng ký campaign lại"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
