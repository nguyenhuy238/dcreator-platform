"use client";

import { useSearchParams } from "next/navigation";
import { MissionReviewsPage, type MissionReviewsTabKey } from "@/app/dashboard/brand/mission-reviews/page";

function getInitialTab(value: string | null): MissionReviewsTabKey {
  if (value === "transcript-reviews" || value === "video-reviews" || value === "final-reviews" || value === "applications") {
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
      subtitle="Quản lý 4 bước duyệt nhiệm vụ cho toàn bộ campaign của tất cả Brand."
      apiBasePath="/api/admin"
      initialTab={initialTab}
    />
  );
}
