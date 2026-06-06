"use client";

import { PublicFooter, PublicHeader } from "@/app/components/dcreator/layout/shell";
import { PageHeader } from "@/app/components/dcreator/ui/base";
import { CampaignList } from "./_components/CampaignList";

export default function CampaignsPage() {
  return (
    <>
      <PublicHeader />
      <main className="mx-auto w-full max-w-7xl px-4 pb-16 pt-6 md:px-6">
        <div className="space-y-6">
          <PageHeader
            title="Chiến dịch dành cho bạn"
            subtitle="Tìm chiến dịch phù hợp để ủng hộ hoặc tham gia nhiệm vụ."
          />
          <CampaignList />
        </div>
      </main>
      <PublicFooter />
    </>
  );
}
