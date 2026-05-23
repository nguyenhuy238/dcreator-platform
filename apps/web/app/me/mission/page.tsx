"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell, PublicHeader } from "@/app/components/dcreator/layout/shell";
import { EmptyState, ErrorState, LoadingSkeleton, PageHeader, SectionHeader } from "@/app/components/dcreator/ui/base";
import { CreatorWorkspaceGate } from "@/app/dashboard/creator/_components/CreatorWorkspaceGate";

type CreatorMissionStatus = "PRODUCT_PENDING" | "DRAFT_PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
type ProductReceiveOption = "CREATOR_BUY_FIRST" | "NO_PRODUCT_REQUIRED" | string;
type ProductStatus = "NOT_REQUIRED" | "WAITING_PURCHASE" | "RECEIVED" | string;
type ReimbursementStatus = "NOT_REQUIRED" | "PENDING" | "PAID" | string;
type VideoReviewStatus = "NOT_SUBMITTED" | "PENDING" | "APPROVED" | "REJECTED" | string;
type PublishStatus = "NOT_SUBMITTED" | "PENDING" | "APPROVED" | "REJECTED" | string;

type CreatorMissionItem = {
  id: string;
  status: CreatorMissionStatus;
  productReceiveOption: ProductReceiveOption;
  productStatus: ProductStatus;
  reimbursementStatus: ReimbursementStatus;
  productPurchasedConfirmedAt: string | null;
  videoReviewStatus: VideoReviewStatus;
  videoReviewFeedback: string | null;
  publishStatus: PublishStatus;
  publishFeedback: string | null;
  publishPurchaseAmountVnd: number | null;
  mission: {
    id: string;
    title: string;
    description: string;
    deadlineAt: string | null;
    rewardPoints: number;
    productLink: string | null;
  };
  campaign: {
    id: string;
    title: string;
    slug: string;
  };
  submission: {
    id: string;
    lifecycleStatus: string;
    status: string;
    videoUrl: string | null;
    socialPostUrl: string | null;
    screenshotUrl: string | null;
    fileUploadUrl: string | null;
    proofTextNote: string | null;
    note: string | null;
    rejectReason: string | null;
  } | null;
  guidance: string;
};

type AlertTone = "success" | "error";

const nav = [
  { href: "/dashboard/creator", label: "Tổng quan" },
  { href: "/campaigns", label: "Chiến dịch" },
  { href: "/me/mission", label: "Nhiệm vụ của tôi" }
];

const statusLabel: Record<string, string> = {
  PRODUCT_PENDING: "Xử lý sản phẩm",
  DRAFT_PENDING: "Quay video review",
  IN_PROGRESS: "Đang xử lý nội dung",
  COMPLETED: "Hoàn thành",
  CANCELLED: "Đã hủy",
  CREATOR_BUY_FIRST: "Creator tự mua trước",
  NO_PRODUCT_REQUIRED: "Không cần sản phẩm",
  WAITING_PURCHASE: "Chờ Creator mua hàng",
  RECEIVED: "Đã xác nhận mua hàng",
  NOT_REQUIRED: "Không áp dụng",
  NOT_SUBMITTED: "Chưa gửi",
  PENDING: "Đang chờ duyệt",
  APPROVED: "Đã duyệt",
  REJECTED: "Bị từ chối",
  PAID: "Đã hoàn tiền"
};

function vi(value: string) {
  return statusLabel[value] ?? value;
}

function formatDate(value: string | null) {
  if (!value) return "Không giới hạn";
  return new Date(value).toLocaleDateString("vi-VN");
}

function statusTone(status: string) {
  if (status === "COMPLETED" || status === "APPROVED" || status === "PAID") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (status === "REJECTED" || status === "CANCELLED") return "bg-red-50 text-red-700 border-red-200";
  return "bg-zinc-100 text-zinc-700 border-zinc-200";
}

function StatusPill({ label, value }: { label: string; value: string }) {
  return (
    <div className={`rounded-full border px-3 py-1 text-xs font-medium ${statusTone(value)}`}>
      {label}: {vi(value)}
    </div>
  );
}

function StepHint({ title, message }: { title: string; message: string }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
      <p className="text-sm font-semibold text-zinc-800">{title}</p>
      <p className="mt-1 text-sm text-zinc-700">{message}</p>
    </div>
  );
}

export default function MyCreatorMissionPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<CreatorMissionItem[]>([]);
  const [submittingId, setSubmittingId] = useState<string>("");
  const [selectedMissionId, setSelectedMissionId] = useState<string | null>(null);
  const [alertModal, setAlertModal] = useState<{ open: boolean; tone: AlertTone; title: string; message: string }>({
    open: false,
    tone: "success",
    title: "",
    message: ""
  });

  const [draftInput, setDraftInput] = useState<Record<string, { videoUrl: string; note: string }>>({});
  const [publishInput, setPublishInput] = useState<
    Record<string, { socialPostUrl: string; adCode: string; purchaseInvoiceUrl: string; ratingImageUrl: string; note: string }>
  >({});

  const selectedItem = useMemo(
    () => (selectedMissionId ? items.find((item) => item.id === selectedMissionId) ?? null : null),
    [items, selectedMissionId]
  );

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/me/mission", { cache: "no-store" });
      const payload = (await response.json()) as { success: boolean; data?: CreatorMissionItem[]; error?: string };
      if (!response.ok || !payload.success || !payload.data) {
        throw new Error(payload.error ?? "Không thể tải nhiệm vụ Creator");
      }
      setItems(payload.data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Không thể tải nhiệm vụ Creator");
    } finally {
      setLoading(false);
    }
  };

  const showAlert = (tone: AlertTone, title: string, message: string) => {
    setAlertModal({ open: true, tone, title, message });
  };

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (selectedMissionId && !items.some((item) => item.id === selectedMissionId)) {
      setSelectedMissionId(null);
    }
  }, [items, selectedMissionId]);

  async function confirmBought(itemId: string) {
    setSubmittingId(itemId);
    try {
      const response = await fetch(`/api/me/mission/${itemId}/confirm-product-purchase`, { method: "POST" });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.error ?? "Không thể xác nhận mua hàng");
      showAlert("success", "Thao tác thành công", "Đã xác nhận mua hàng. Bạn có thể bắt đầu quay video review.");
      await load();
    } catch (actionError) {
      showAlert("error", "Không thể thực hiện", actionError instanceof Error ? actionError.message : "Không thể xác nhận mua hàng");
    } finally {
      setSubmittingId("");
    }
  }

  async function submitDraftAction(itemId: string) {
    const form = draftInput[itemId] ?? { videoUrl: "", note: "" };
    setSubmittingId(itemId);

    try {
      const response = await fetch(`/api/me/mission/${itemId}/draft`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoUrl: form.videoUrl, note: form.note || undefined })
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.error ?? "Không thể gửi video review");
      showAlert("success", "Đã gửi video review", "Nhiệm vụ đã chuyển sang trạng thái chờ admin duyệt nội dung.");
      await load();
    } catch (actionError) {
      showAlert("error", "Không thể thực hiện", actionError instanceof Error ? actionError.message : "Không thể gửi video review");
    } finally {
      setSubmittingId("");
    }
  }

  async function submitPublishReportAction(itemId: string) {
    const form = publishInput[itemId] ?? {
      socialPostUrl: "",
      adCode: "",
      purchaseInvoiceUrl: "",
      ratingImageUrl: "",
      note: ""
    };

    setSubmittingId(itemId);

    try {
      const response = await fetch(`/api/me/mission/${itemId}/publish-report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          socialPostUrl: form.socialPostUrl,
          adCode: form.adCode || undefined,
          purchaseInvoiceUrl: form.purchaseInvoiceUrl || undefined,
          ratingImageUrl: form.ratingImageUrl || undefined,
          note: form.note || undefined
        })
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.error ?? "Không thể gửi báo cáo đăng bài");
      showAlert("success", "Đã gửi báo cáo", "Báo cáo của bạn đã được gửi. Vui lòng chờ admin duyệt.");
      await load();
    } catch (actionError) {
      showAlert("error", "Không thể thực hiện", actionError instanceof Error ? actionError.message : "Không thể gửi báo cáo đăng bài");
    } finally {
      setSubmittingId("");
    }
  }

  const content = (() => {
    if (loading) return <LoadingSkeleton rows={4} />;
    if (error) return <ErrorState title="Không thể tải nhiệm vụ" description={error} />;

    if (items.length === 0) {
      return (
        <EmptyState
          title="Chưa có nhiệm vụ được giao"
          description="Khi được duyệt tham gia campaign, nhiệm vụ sẽ xuất hiện tại đây."
        />
      );
    }

    const completedCount = items.filter((item) => item.status === "COMPLETED").length;

    return (
      <section className="mt-6">
        <SectionHeader title="Nhiệm vụ của tôi" subtitle={`${items.length} nhiệm vụ • ${completedCount} hoàn thành`} />

        <div className="grid gap-4 md:grid-cols-2">
          {items.map((item) => (
            <article key={item.id} className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm transition-all duration-200 hover:shadow-md">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-zinc-900">{item.mission.title}</h3>
                  <p className="mt-1 text-sm text-zinc-500">Chiến dịch: {item.campaign.title}</p>
                </div>
                <span className={`rounded-full border px-3 py-1 text-xs font-medium ${statusTone(item.status)}`}>{vi(item.status)}</span>
              </div>

              <div className="mt-3 grid gap-1 text-sm text-zinc-600">
                <p>Deadline: {formatDate(item.mission.deadlineAt)}</p>
                <p>Reward: {item.mission.rewardPoints.toLocaleString("vi-VN")} N-Points</p>
                <p>Nhận sản phẩm: {vi(item.productReceiveOption)}</p>
              </div>

              <button
                className="mt-4 w-full rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-zinc-800"
                onClick={() => setSelectedMissionId(item.id)}
              >
                Xem chi tiết và thao tác
              </button>
            </article>
          ))}
        </div>
      </section>
    );
  })();

  const detailModal = (() => {
    if (!selectedItem) return null;

    const isBuyFirst = selectedItem.productReceiveOption === "CREATOR_BUY_FIRST";
    const canConfirmBuy =
      isBuyFirst && selectedItem.status === "PRODUCT_PENDING" && selectedItem.productStatus === "WAITING_PURCHASE";
    const canSubmitDraft = selectedItem.status === "DRAFT_PENDING";
    const canSubmitPublish =
      selectedItem.videoReviewStatus === "APPROVED" &&
      (selectedItem.publishStatus === "NOT_SUBMITTED" || selectedItem.publishStatus === "REJECTED");

    const draftForm = draftInput[selectedItem.id] ?? { videoUrl: "", note: "" };
    const publishForm = publishInput[selectedItem.id] ?? {
      socialPostUrl: selectedItem.submission?.socialPostUrl ?? "",
      adCode: selectedItem.submission?.proofTextNote ?? "",
      purchaseInvoiceUrl: selectedItem.submission?.screenshotUrl ?? "",
      ratingImageUrl: selectedItem.submission?.fileUploadUrl ?? "",
      note: selectedItem.submission?.note ?? ""
    };

    return (
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-zinc-900/60 p-3 md:items-center" onClick={() => setSelectedMissionId(null)}>
        <div
          className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-zinc-200 bg-white shadow-xl"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-zinc-200 bg-white px-5 py-4">
            <div>
              <h3 className="text-lg font-semibold text-zinc-900">{selectedItem.mission.title}</h3>
              <p className="text-sm text-zinc-500">Chiến dịch: {selectedItem.campaign.title}</p>
            </div>
            <button className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm text-zinc-700" onClick={() => setSelectedMissionId(null)}>
              Đóng
            </button>
          </div>

          <div className="space-y-4 px-5 py-5">
            <p className="text-sm text-zinc-700">{selectedItem.mission.description}</p>
            <div className="flex flex-wrap gap-2">
              <StatusPill label="Nhiệm vụ" value={selectedItem.status} />
              <StatusPill label="Duyệt video" value={selectedItem.videoReviewStatus} />
              <StatusPill label="Duyệt báo cáo" value={selectedItem.publishStatus} />
              <StatusPill label="Hoàn tiền" value={selectedItem.reimbursementStatus} />
            </div>

            <StepHint title="Hướng dẫn" message={selectedItem.guidance} />

            {isBuyFirst ? (
              <StepHint title="Nhận hướng dẫn mua sản phẩm" message={selectedItem.mission.productLink ?? "Brand chưa cung cấp link sản phẩm."} />
            ) : (
              <StepHint title="Nhận hướng dẫn sản phẩm" message="Nhiệm vụ này không cần sản phẩm, bạn có thể gửi video review ngay." />
            )}

            {selectedItem.videoReviewFeedback ? (
              <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">Feedback B8: {selectedItem.videoReviewFeedback}</p>
            ) : null}

            {selectedItem.publishFeedback ? (
              <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">Feedback B9: {selectedItem.publishFeedback}</p>
            ) : null}

            {selectedItem.status === "COMPLETED" && selectedItem.publishPurchaseAmountVnd !== null ? (
              <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                Admin đã duyệt B9. Số tiền mua hàng xác nhận: {selectedItem.publishPurchaseAmountVnd.toLocaleString("vi-VN")} VND.
              </p>
            ) : null}

            {canConfirmBuy ? (
              <div className="space-y-2">
                <p className="text-sm font-semibold text-zinc-800">Xác nhận mua hàng</p>
                <button
                  className="rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-50"
                  disabled={submittingId === selectedItem.id || !selectedItem.mission.productLink}
                  onClick={() => void confirmBought(selectedItem.id)}
                >
                  Xác nhận đã mua hàng
                </button>
              </div>
            ) : null}

            {canSubmitDraft ? (
              <div className="space-y-2 rounded-xl border border-zinc-200 p-4">
                <p className="text-sm font-semibold text-zinc-800">Gửi video review</p>
                <input
                  className="dc-input"
                  placeholder="Video URL"
                  value={draftForm.videoUrl}
                  onChange={(event) =>
                    setDraftInput((prev) => ({
                      ...prev,
                      [selectedItem.id]: { ...draftForm, videoUrl: event.target.value }
                    }))
                  }
                />
                <textarea
                  className="dc-input"
                  placeholder="Ghi chú"
                  value={draftForm.note}
                  onChange={(event) =>
                    setDraftInput((prev) => ({
                      ...prev,
                      [selectedItem.id]: { ...draftForm, note: event.target.value }
                    }))
                  }
                />
                <button
                  className="rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-50"
                  disabled={submittingId === selectedItem.id}
                  onClick={() => void submitDraftAction(selectedItem.id)}
                >
                  Gửi video review
                </button>
              </div>
            ) : null}

            {selectedItem.videoReviewStatus === "PENDING" ? (
              <StepHint title="Duyệt video review" message="Video review đang chờ admin duyệt." />
            ) : null}

            {canSubmitPublish ? (
              <div className="space-y-2 rounded-xl border border-zinc-200 p-4">
                <p className="text-sm font-semibold text-zinc-800">Cập nhật báo cáo đăng bài</p>
                <input
                  className="dc-input"
                  placeholder="Link/ID video đã đăng công khai"
                  value={publishForm.socialPostUrl}
                  onChange={(event) =>
                    setPublishInput((prev) => ({
                      ...prev,
                      [selectedItem.id]: { ...publishForm, socialPostUrl: event.target.value }
                    }))
                  }
                />
                <input
                  className="dc-input"
                  placeholder="Mã quảng cáo / campaign code"
                  value={publishForm.adCode}
                  onChange={(event) =>
                    setPublishInput((prev) => ({
                      ...prev,
                      [selectedItem.id]: { ...publishForm, adCode: event.target.value }
                    }))
                  }
                />

                {isBuyFirst ? (
                  <>
                    <input
                      className="dc-input"
                      placeholder="Hóa đơn mua hàng URL"
                      value={publishForm.purchaseInvoiceUrl}
                      onChange={(event) =>
                        setPublishInput((prev) => ({
                          ...prev,
                          [selectedItem.id]: { ...publishForm, purchaseInvoiceUrl: event.target.value }
                        }))
                      }
                    />
                    <input
                      className="dc-input"
                      placeholder="Ảnh đánh giá 5* URL"
                      value={publishForm.ratingImageUrl}
                      onChange={(event) =>
                        setPublishInput((prev) => ({
                          ...prev,
                          [selectedItem.id]: { ...publishForm, ratingImageUrl: event.target.value }
                        }))
                      }
                    />
                  </>
                ) : null}

                <textarea
                  className="dc-input"
                  placeholder="Ghi chú thêm"
                  value={publishForm.note}
                  onChange={(event) =>
                    setPublishInput((prev) => ({
                      ...prev,
                      [selectedItem.id]: { ...publishForm, note: event.target.value }
                    }))
                  }
                />

                <button
                  className="rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-50"
                  disabled={submittingId === selectedItem.id}
                  onClick={() => void submitPublishReportAction(selectedItem.id)}
                >
                  Gửi báo cáo
                </button>
              </div>
            ) : null}

            {selectedItem.publishStatus === "PENDING" ? (
              <StepHint title="Duyệt báo cáo" message="Báo cáo đã gửi. Đang chờ admin duyệt và xác nhận hoàn tiền." />
            ) : null}
          </div>
        </div>
      </div>
    );
  })();

  const pageContent = (
    <>
      <PageHeader title="Nhiệm vụ Creator" subtitle="Danh sách gọn để theo dõi nhanh, mở chi tiết để thao tác theo từng bước." />
      {content}
    </>
  );

  const fallbackLayout = (
    <>
      <PublicHeader />
      <AppShell sidebarItems={nav}>{pageContent}</AppShell>
    </>
  );

  return (
    <CreatorWorkspaceGate fallback={fallbackLayout}>
      {pageContent}
      {detailModal}

      {alertModal.open ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-zinc-900/60 p-4" onClick={() => setAlertModal((prev) => ({ ...prev, open: false }))}>
          <div
            className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-5 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <h4 className={`text-lg font-semibold ${alertModal.tone === "success" ? "text-emerald-700" : "text-red-700"}`}>
              {alertModal.title}
            </h4>
            <p className="mt-2 text-sm text-zinc-700">{alertModal.message}</p>
            <button
              className="mt-4 w-full rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800"
              onClick={() => setAlertModal((prev) => ({ ...prev, open: false }))}
            >
              Đóng
            </button>
          </div>
        </div>
      ) : null}
    </CreatorWorkspaceGate>
  );
}
