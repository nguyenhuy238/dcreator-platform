"use client";

import { PageHeader } from "@/app/components/dcreator/ui/base";
import { CampaignList } from "@/app/campaigns/_components/CampaignList";

export default function CreatorJobsPage() {
  return (
    <>
      <PageHeader
        title="Campaign / Job"
        subtitle="Danh sach campaign dang mo de Creator tham gia va nhan nhiem vu phu hop."
      />
      <CampaignList />
    </>
  );
}
