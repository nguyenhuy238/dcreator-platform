"use client";

import { useEffect, useMemo, useState } from "react";

type StatusState =
  | "LOGIN_REQUIRED"
  | "NOT_CREATOR"
  | "PROFILE_REQUIRED"
  | "CAMPAIGN_UNAVAILABLE"
  | "MISSION_UNAVAILABLE"
  | "CAN_APPLY"
  | "PENDING_REVIEW"
  | "ASSIGNED"
  | "REJECTED";

type StatusPayload = {
  state: StatusState;
  label: string;
  disabled: boolean;
  message: string;
  rejectReason: string | null;
  submissionId: string | null;
  missionId: string | null;
  lifecycleStatus: string | null;
};

type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

type Props = {
  slug: string;
  compact?: boolean;
};

function LoginHint({ path }: { path: string }) {
  return (
    <a className="text-xs text-zinc-600 underline" href={`/auth/login?next=${encodeURIComponent(path)}`}>
      Đăng nhập để tiếp tục
    </a>
  );
}

export function CreatorCampaignApplyButton({ slug, compact = false }: Props) {
  const [status, setStatus] = useState<StatusPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      setNotice(null);
      try {
        const response = await fetch(`/api/campaigns/${slug}/creator-application`, { cache: "no-store" });
        const payload = (await response.json()) as ApiResponse<StatusPayload>;
        if (!response.ok || !payload.success || !payload.data) {
          throw new Error(payload.error ?? "Không thể kiểm tra trạng thái đăng ký");
        }
        if (!mounted) return;
        setStatus(payload.data);
      } catch (error) {
        if (!mounted) return;
        setNotice({
          type: "error",
          text: error instanceof Error ? error.message : "Không thể kiểm tra trạng thái đăng ký"
        });
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void load();
    return () => {
      mounted = false;
    };
  }, [slug]);

  const buttonLabel = useMemo(() => {
    if (loading) return "Đang kiểm tra...";
    if (!status) return "Nộp đơn đăng ký";
    if (submitting) return "Đang gửi đơn...";
    return status.label;
  }, [loading, status, submitting]);

  const buttonDisabled = useMemo(() => {
    if (loading || submitting) return true;
    if (!status) return true;
    if (status.state === "LOGIN_REQUIRED") return false;
    return status.disabled;
  }, [loading, status, submitting]);

  async function applyCampaign() {
    if (!status) return;

    if (status.state === "LOGIN_REQUIRED") {
      window.location.href = `/auth/login?next=${encodeURIComponent(window.location.pathname)}`;
      return;
    }

    if (status.state === "PROFILE_REQUIRED") {
      setNotice({
        type: "error",
        text: "Bạn cần hoàn thiện hồ sơ Creator và chọn nền tảng chính trước khi xin làm nhiệm vụ."
      });
      return;
    }

    if (status.disabled) return;

    const confirmed = window.confirm("Bạn có chắc chắn muốn nộp đơn đăng ký chiến dịch này không?");
    if (!confirmed) return;

    setSubmitting(true);
    setNotice(null);

    try {
      const response = await fetch(`/api/campaigns/${slug}/creator-application`, {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      const payload = (await response.json()) as ApiResponse<{ status: StatusPayload }>;
      if (!response.ok || !payload.success || !payload.data) {
        throw new Error(payload.error ?? "Nộp đơn thất bại");
      }

      setStatus(payload.data.status);
      setNotice({ type: "success", text: "Đã nộp đơn đăng ký thành công." });
    } catch (error) {
      setNotice({
        type: "error",
        text: error instanceof Error ? error.message : "Nộp đơn thất bại"
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={`grid gap-2 ${compact ? "" : "mt-2"}`}>
      <button type="button" className="dc-btn-primary" disabled={buttonDisabled} onClick={() => void applyCampaign()}>
        {buttonLabel}
      </button>
      {!compact && status?.state === "LOGIN_REQUIRED" ? (
        <LoginHint path={typeof window === "undefined" ? "/campaigns" : window.location.pathname} />
      ) : null}
      {notice ? (
        <p
          className={`rounded-xl border px-3 py-2 text-sm ${
            notice.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {notice.text}
        </p>
      ) : null}
      {!notice && status?.message ? (
        <p className="text-xs text-zinc-500">
          {status.message}
          {status.state === "REJECTED" && status.rejectReason ? ` Lý do: ${status.rejectReason}` : ""}
        </p>
      ) : null}
    </div>
  );
}
