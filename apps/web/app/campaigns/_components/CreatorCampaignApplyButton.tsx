"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

type StatusState =
  | "LOGIN_REQUIRED"
  | "NOT_CREATOR"
  | "PROFILE_REQUIRED"
  | "SOCIAL_CHANNEL_REQUIRED"
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
  inline?: boolean;
  hideStatusMessage?: boolean;
};

export function CreatorCampaignApplyButton({ slug, compact = false, inline = false, hideStatusMessage = false }: Props) {
  const [status, setStatus] = useState<StatusPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkingSession, setCheckingSession] = useState(false);
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
      const redirect = typeof window === "undefined" ? `/campaigns/${slug}` : `${window.location.pathname}${window.location.search}`;
      return { href: `/auth/register?redirect=${encodeURIComponent(redirect)}`, label: "Tạo tài khoản để tiếp tục" };
    }

    if (status.state === "NOT_CREATOR") {
      return {
        href: `/dashboard/user/upgrade?message=${encodeURIComponent("Hãy nâng cấp tài khoản để đăng ký tham gia campaign")}`,
        label: "Đăng ký quyền Creator"
      };
    }

    if (status.state === "PROFILE_REQUIRED" || status.state === "SOCIAL_CHANNEL_REQUIRED") {
      return { href: "/dashboard/creator/channels", label: "Hoàn thiện kênh Creator" };
    }

    return null;
  }, [slug, status]);

  const buttonLabel = useMemo(() => {
    if (loading) return "Đang kiểm tra...";
    if (!status) return "Nộp đơn đăng ký";
    if (checkingSession) return "Đang kiểm tra...";
    if (submitting) return "Đang gửi đơn...";
    if (missingAction) return "Đăng ký tham gia campaign";
    return status.label;
  }, [loading, status, checkingSession, submitting, missingAction]);

  const buttonDisabled = useMemo(() => {
    if (loading || checkingSession || submitting) return true;
    if (!status) return true;
    return status.disabled && !missingAction;
  }, [loading, status, checkingSession, submitting, missingAction]);

  function redirectToRegister() {
    const redirect = `${window.location.pathname}${window.location.search}`;
    window.location.assign(`/auth/register?redirect=${encodeURIComponent(redirect)}`);
  }

  async function applyCampaign() {
    if (!status) return;

    if (status.state === "LOGIN_REQUIRED") {
      redirectToRegister();
      return;
    }

    setCheckingSession(true);
    try {
      const response = await fetch("/api/auth/me", { cache: "no-store" });
      const payload = (await response.json()) as ApiResponse<{ user?: { id?: string } }>;
      if (response.status === 401) {
        redirectToRegister();
        return;
      }
      if (!response.ok || !payload.success) {
        throw new Error(payload.error ?? "Không thể kiểm tra trạng thái đăng nhập");
      }
      if (!payload.data?.user?.id) {
        redirectToRegister();
        return;
      }
    } catch (error) {
      setNotice({
        type: "error",
        text: error instanceof Error ? error.message : "Không thể kiểm tra trạng thái đăng nhập"
      });
      return;
    } finally {
      setCheckingSession(false);
    }

    if (status.state === "NOT_CREATOR") {
      window.location.assign(`/dashboard/user/upgrade?message=${encodeURIComponent("Hãy nâng cấp tài khoản để đăng ký tham gia campaign")}`);
      return;
    }

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
      setNotice({ type: "success", text: "Đăng kí thành công" });
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
    <div className={`${inline ? "" : "grid gap-2"} ${compact ? "" : "mt-2"}`}>
      <button
        type="button"
        className={`inline-flex items-center justify-center rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 px-5 py-2.5 text-center font-semibold text-white shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.02] hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:scale-100 ${inline ? "w-full min-w-0 px-3 py-2 text-sm leading-tight" : ""}`}
        disabled={buttonDisabled}
        onClick={() => void applyCampaign()}
      >
        {buttonLabel}
      </button>
      {!inline && notice ? (
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
      {!inline && !hideStatusMessage && !notice && status?.message ? (
        <p className="text-xs text-zinc-500">
          {status.message}
          {status.state === "REJECTED" && status.rejectReason ? ` Lý do: ${status.rejectReason}` : ""}
        </p>
      ) : null}
      {portalReady && actionNotice
        ? createPortal(
            <div className="fixed bottom-4 right-4 z-[9999] w-[360px] max-w-[calc(100vw-2rem)] rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 shadow-xl">
              <p className="font-semibold">Bạn cần cập nhật kênh mạng xã hội trước khi đăng ký campaign. Hãy vào <a href={actionNotice.href} className="font-semibold underline">Kênh Creator</a> để hoàn thiện hồ sơ.</p>

              <button type="button" className="mt-3 text-xs font-semibold underline" onClick={() => setActionNotice(null)}>
                Đóng
              </button>
            </div>,
            document.body
          )
        : null}
      {portalReady && inline && status && notice
        ? createPortal(
            <div
              className={`fixed bottom-4 right-4 z-[9999] w-[360px] max-w-[calc(100vw-2rem)] rounded-2xl border p-4 text-sm shadow-xl ${
                notice.type === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                  : "border-red-200 bg-red-50 text-red-900"
              }`}
            >
              <p className="font-semibold">{notice.text}</p>
              <button type="button" className="mt-3 text-xs font-semibold underline" onClick={() => setNotice(null)}>
                Đóng
              </button>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
