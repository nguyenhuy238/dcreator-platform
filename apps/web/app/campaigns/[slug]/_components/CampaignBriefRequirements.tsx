"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle, WarningCircle } from "@phosphor-icons/react";

const submissionSteps = [
  "Quay video review theo brief phía trên",
  "Đăng lên tài khoản xã hội đã liên kết, không set private",
  "Lấy mã Spark Ads từ TikTok Creator Tools nếu Brand yêu cầu",
  "Quay lại dCreator và gửi link video để Brand/Admin duyệt",
];

type EligibilityState = {
  isChecking: boolean;
  isLoggedIn: boolean;
  hasConnectedSocialAccount: boolean;
};

type ApiResponse<T> = {
  success?: boolean;
  data?: T;
};

type CreatorChannel = {
  isActive?: boolean;
};

export function CampaignBriefRequirements({
  hashtags = [],
  requirements,
}: {
  hashtags?: string[];
  requirements?: string | null;
}) {
  const [eligibility, setEligibility] = useState<EligibilityState>({
    isChecking: true,
    isLoggedIn: false,
    hasConnectedSocialAccount: false,
  });

  useEffect(() => {
    let isCancelled = false;

    async function loadEligibility() {
      try {
        const authResponse = await fetch("/api/auth/me", { cache: "no-store" });
        const authPayload = (await authResponse.json().catch(() => null)) as ApiResponse<{
          user?: { id?: string };
        }> | null;
        const isLoggedIn = authResponse.ok && Boolean(authPayload?.success && authPayload.data?.user?.id);

        if (!isLoggedIn) {
          if (!isCancelled) {
            setEligibility({
              isChecking: false,
              isLoggedIn: false,
              hasConnectedSocialAccount: false,
            });
          }
          return;
        }

        const channelsResponse = await fetch("/api/creator/dashboard/channels", { cache: "no-store" });
        const channelsPayload = (await channelsResponse.json().catch(() => null)) as ApiResponse<{
          channels?: CreatorChannel[];
        }> | null;
        const channels = channelsResponse.ok && channelsPayload?.success ? channelsPayload.data?.channels ?? [] : [];

        if (!isCancelled) {
          setEligibility({
            isChecking: false,
            isLoggedIn: true,
            hasConnectedSocialAccount: channels.some((channel) => channel.isActive !== false),
          });
        }
      } catch {
        if (!isCancelled) {
          setEligibility((current) => ({
            ...current,
            isChecking: false,
          }));
        }
      }
    }

    void loadEligibility();

    return () => {
      isCancelled = true;
    };
  }, []);

  const visibleHashtags = hashtags.map((hashtag) => hashtag.trim()).filter(Boolean);
  const requirementLines = formatRequirementLines(requirements);
  const isEligible = eligibility.isLoggedIn && eligibility.hasConnectedSocialAccount;

  return (
    <div className="grid gap-5">
      <article className="rounded-3xl border border-zinc-100 bg-white p-5 shadow-sm sm:p-6">
        <h3 className="text-xl font-black text-zinc-900"># Hashtags Bắt Buộc</h3>
        {visibleHashtags.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {visibleHashtags.map((hashtag) => (
              <span
                key={hashtag}
                className="rounded-full border border-pink-100 bg-pink-50 px-3 py-1.5 text-sm font-bold text-pink-600"
              >
                {hashtag}
              </span>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm leading-6 text-zinc-500">Chiến dịch này chưa cấu hình hashtag bắt buộc.</p>
        )}
      </article>

      <article className="rounded-3xl border border-zinc-100 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h3 className="text-xl font-black text-zinc-900">Điều Kiện Tham Gia</h3>
          <span
            className={
              isEligible
                ? "rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700"
                : "rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-black text-red-600"
            }
          >
            {isEligible ? "Đủ điều kiện" : "Chưa đủ"}
          </span>
        </div>

        <div className="mt-5 grid gap-3">
          <EligibilityItem
            isMet={eligibility.isLoggedIn}
            title="Đăng nhập"
            subtitle={
              eligibility.isChecking
                ? "Đang kiểm tra trạng thái..."
                : eligibility.isLoggedIn
                  ? "Bạn đã đăng nhập"
                  : "Bạn chưa đăng nhập"
            }
          />
          <EligibilityItem
            isMet={eligibility.hasConnectedSocialAccount}
            title="Liên kết tài khoản xã hội"
            subtitle={
              eligibility.isChecking
                ? "Đang kiểm tra trạng thái..."
                : eligibility.hasConnectedSocialAccount
                  ? "Đã liên kết tài khoản xã hội"
                  : "Chưa liên kết — vào Cài đặt để thêm"
            }
            settingsLink
          />
        </div>
      </article>

      <article className="rounded-3xl bg-zinc-950 p-5 text-white shadow-lg shadow-zinc-950/10 sm:p-6">
        <h3 className="text-xl font-black">Hướng Dẫn Nộp Bài</h3>
        <ol className="mt-5 grid gap-4">
          {submissionSteps.map((step, index) => (
            <li key={step} className="flex gap-3">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-black text-emerald-300">
                {index + 1}
              </span>
              <p className="pt-0.5 text-sm leading-6 text-zinc-200">{step}</p>
            </li>
          ))}
        </ol>
      </article>

      <article className="rounded-3xl border border-zinc-100 bg-white p-5 shadow-sm sm:p-6">
        <h3 className="text-xl font-black text-zinc-900">Yêu Cầu Chi Tiết Từ Brand</h3>
        {requirementLines.length > 0 ? (
          <ol className="mt-5 grid gap-4">
            {requirementLines.map((line, index) => (
              <li key={`${line}-${index}`} className="flex gap-3">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-zinc-200 bg-zinc-50 text-xs font-black text-zinc-900">
                  {index + 1}
                </span>
                <p className="min-w-0 pt-0.5 text-sm leading-6 text-zinc-700">
                  <span className="whitespace-pre-line break-words">{line}</span>
                </p>
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-3 text-sm leading-6 text-zinc-500">Brand chưa cấu hình yêu cầu chi tiết cho chiến dịch này.</p>
        )}
      </article>
    </div>
  );
}

function formatRequirementLines(value?: string | null) {
  const normalized = value?.trim();
  if (!normalized) return [];

  const lineParts = normalized
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*[-•]\s*/, "").trim())
    .filter(Boolean);

  if (lineParts.length > 1) return lineParts;

  return normalized
    .split(/(?<=[.!?。])\s+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function EligibilityItem({
  isMet,
  title,
  subtitle,
  settingsLink = false,
}: {
  isMet: boolean;
  title: string;
  subtitle: string;
  settingsLink?: boolean;
}) {
  const Icon = isMet ? CheckCircle : WarningCircle;

  return (
    <div className="flex items-start gap-3 rounded-2xl border border-zinc-100 bg-zinc-50/70 p-4">
      <Icon
        className={isMet ? "mt-0.5 size-6 shrink-0 text-emerald-600" : "mt-0.5 size-6 shrink-0 text-red-500"}
        weight="fill"
      />
      <div className="min-w-0">
        <h4 className="font-black text-zinc-900">{title}</h4>
        <p className="mt-0.5 text-sm leading-5 text-zinc-500">{subtitle}</p>
        {settingsLink && !isMet ? (
          <Link
            href="/dashboard/creator/channels"
            className="mt-2 inline-flex text-sm font-bold text-emerald-700 transition-colors hover:text-emerald-600"
          >
            Mở cài đặt
          </Link>
        ) : null}
      </div>
    </div>
  );
}
