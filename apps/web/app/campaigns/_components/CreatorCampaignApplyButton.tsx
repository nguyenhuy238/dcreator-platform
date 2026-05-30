"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

type StatusState =
  | "LOGIN_REQUIRED"
  | "NOT_CREATOR"
  | "PROFILE_REQUIRED"
  | "CAMPAIGN_UNAVAILABLE"
  | "MISSION_UNAVAILABLE"
  | "VIDEO_QUOTA_REACHED"
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

export function CreatorCampaignApplyButton({ slug, compact = false }: Props) {
  const [status, setStatus] = useState<StatusPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [actionNotice, setActionNotice] = useState<{ href: string } | null>(null);
  const [portalReady, setPortalReady] = useState(false);

  useEffect(() => {
    setPortalReady(true);
  }, []);

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

  const missingAction = useMemo(() => {
    if (!status) return null as { href: string; label: string } | null;

    if (status.state === "LOGIN_REQUIRED") {
      const next = typeof window === "undefined" ? `/campaigns/${slug}` : window.location.pathname;
      return { href: `/auth/login?next=${encodeURIComponent(next)}`, label: "Đăng nhập để tiếp tục" };
    }

    if (status.state === "NOT_CREATOR") {
      return { href: "/dashboard/user/profile#role-requests", label: "Đăng ký quyền Creator" };
    }

    if (status.state === "PROFILE_REQUIRED") {
      return { href: "/dashboard/creator/channels", label: "Hoàn thiện kênh Creator" };
    }

    return null;
  }, [slug, status]);

  const buttonLabel = useMemo(() => {
    if (loading) return "Đang kiểm tra...";
    if (!status) return "Nộp đơn đăng ký";
    if (submitting) return "Đang gửi đơn...";
    if (missingAction) return "Đăng ký tham gia campaign";
    return status.label;
  }, [loading, status, submitting, missingAction]);

  const buttonDisabled = useMemo(() => {
    if (loading || submitting) return true;
    if (!status) return true;
    return status.disabled && !missingAction;
  }, [loading, status, submitting, missingAction]);

  async function applyCampaign() {
    if (!status) return;

    if (missingAction) {
      setActionNotice({ href: missingAction.href });
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
      {portalReady && actionNotice
        ? createPortal(
            <div className="fixed bottom-4 right-4 z-[9999] w-[360px] max-w-[calc(100vw-2rem)] rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 shadow-xl">
              <p className="font-semibold">Bạn đang chưa điền tài khoản mạng xã hội của mình hãy vào đây <a href={actionNotice.href} className="font-semibold underline">"Hồ Sơ Cá Nhân"</a> để hoàn thiện hồ sơ của mình nhé.</p>

              <button type="button" className="mt-3 text-xs font-semibold underline" onClick={() => setActionNotice(null)}>
                Đóng
              </button>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
