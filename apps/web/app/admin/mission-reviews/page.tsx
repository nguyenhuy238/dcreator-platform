"use client";

import { useSearchParams } from "next/navigation";
import { MissionReviewsPage, type MissionReviewsTabKey } from "@/app/dashboard/brand/mission-reviews/page";

function getInitialTab(value: string | null): MissionReviewsTabKey {
  if (value === "transcript-reviews" || value === "video-reviews" || value === "final-reviews" || value === "refund-reviews" || value === "deposit-confirmations" || value === "applications") {
    return value;
  }
  return "applications";
}

export default function AdminMissionReviewsPage() {
  const searchParams = useSearchParams();
  const initialTab = getInitialTab(searchParams.get("tab"));

  return (
    <MissionReviewsPage
      pageTitle="Duyệt nhiệm vụ Creator"
      subtitle="Quản lý các bước duyệt nhiệm vụ cho toàn bộ campaign của tất cả Brand, gồm cả duyệt public link và hoàn tiền."
      apiBasePath="/api/admin"
      initialTab={initialTab}
    />
  );
}
