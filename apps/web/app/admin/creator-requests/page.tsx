"use client";

import { useState } from "react";
import { AccountRoleRequestsTab } from "./_components/AccountRoleRequestsTab";

type TabKey = "account-review";

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: "account-review", label: "Quản lý tài khoản" }
];

export default function AdminCreatorRequestsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("account-review");

  return (
    <div>
      <section className="mb-4 flex flex-wrap gap-2 rounded-2xl border border-zinc-200 bg-white p-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={
              activeTab === tab.key
                ? "rounded-full border border-zinc-900 bg-zinc-900 px-4 py-1.5 text-sm font-semibold text-white"
                : "rounded-full border border-zinc-200 px-4 py-1.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
            }
          >
            {tab.label}
          </button>
        ))}
      </section>

      {activeTab === "account-review" ? <AccountRoleRequestsTab /> : null}
    </div>
  );
}

