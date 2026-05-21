"use client";

import { useEffect, useState } from "react";
import { MyMissionsClient } from "./MyMissionsClient";

type Mission = Parameters<typeof MyMissionsClient>[0]["initial"][number];

export default function MyMissionsPage() {
  const [items, setItems] = useState<Mission[]>([]);

  useEffect(() => {
    fetch("/api/me/missions").then(async (res) => {
      const payload = (await res.json()) as { success: boolean; data: Mission[] };
      if (res.ok && payload.success) setItems(payload.data);
    });
  }, []);

  return <MyMissionsClient initial={items} />;
}
