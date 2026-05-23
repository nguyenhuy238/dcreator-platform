"use client";

import {
  CampaignCard,
  DashboardLayout,
  EmptyState,
  ErrorState,
  LoadingSkeleton,
  MissionCard,
  RewardCard,
  VoucherCard,
} from "@repo/ui";

export default function DesignSystemPage() {
  return (
    <DashboardLayout>
      <section className="space-y-6">
        <div>
          <h1 className="font-heading text-2xl font-black text-dc-text">dCreator Design System</h1>
          <p className="mt-1 text-sm text-dc-muted">Light premium, mobile-first, creator economy UI kit.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <CampaignCard title="Build Creator Studio" creatorName="by Nguyen An" progress={62} raisedText="62% mục tiêu" />
          <RewardCard title="Áo phiên bản giới hạn" points={2500} stock={41} />
          <MissionCard title="Quay video review 60s" rewardText="500 điểm + voucher" deadlineText="26/05/2026" status="open" />
          <VoucherCard code="DCR-26MAY-NEW" condition="Giảm 15% cho đơn từ 299k" expiry="31/05/2026" claimed={false} />
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <LoadingSkeleton />
          <EmptyState title="Chưa có campaign phù hợp" description="Hãy thử đổi bộ lọc hoặc tham gia mission mới." />
          <ErrorState onRetry={() => undefined} />
        </div>
      </section>
    </DashboardLayout>
  );
}
