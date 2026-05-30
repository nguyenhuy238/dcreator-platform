import type { Role } from "@prisma/client";
import { deriveCapabilities } from "@/lib/auth/capabilities";

export type WorkspaceId = "user" | "creator" | "brand" | "admin";

export type WorkspaceChoiceUser = {
  roles: Role[];
  creatorProfile?: { id: string } | null;
  brandMemberships?: Array<{ id: string; name: string; role: "OWNER" | "MANAGER" | "STAFF" }>;
};

export type WorkspaceCard = {
  id: WorkspaceId;
  title: string;
  label: string;
  description: string;
  href: string;
};

export function getWorkspaceCards(user: WorkspaceChoiceUser): WorkspaceCard[] {
  const capabilities = deriveCapabilities({
    roles: user.roles,
    creatorProfile: user.creatorProfile ?? null,
    brandMemberships: user.brandMemberships ?? []
  });

  const cards: WorkspaceCard[] = [
    {
      id: "user",
      title: "Companion/User",
      label: "Vào trang người dùng",
      description: "Khám phá campaign, ủng hộ Creator, đổi voucher",
      href: "/dashboard/user"
    }
  ];

  if (capabilities.creator) {
    cards.push({
      id: "creator",
      title: "Creator",
      label: "Vào Creator Dashboard",
      description: "Quản lý job, nhiệm vụ, hoa hồng và hồ sơ Creator",
      href: "/dashboard/creator"
    });
  }

  if (capabilities.brand) {
    cards.push({
      id: "brand",
      title: "Brand",
      label: "Vào Brand Dashboard",
      description: "Quản lý chiến dịch, sản phẩm, thành viên và ngân sách Brand",
      href: "/dashboard/brand"
    });
  }

  if (capabilities.admin) {
    cards.push({
      id: "admin",
      title: "Admin/Ops",
      label: "Vào Admin/Ops",
      description: "Quản trị, vận hành và giám sát toàn hệ thống",
      href: "/admin"
    });
  }

  return cards;
}

export function resolveWorkspaceLanding(user: WorkspaceChoiceUser) {
  const cards = getWorkspaceCards(user);
  const majorCount = cards.filter((item) => item.id !== "user").length;

  if (majorCount === 0) return { type: "redirect" as const, href: "/dashboard/user", cards };
  if (majorCount === 1) return { type: "redirect" as const, href: cards.find((item) => item.id !== "user")!.href, cards };
  return { type: "choose" as const, href: "/workspace/select", cards };
}

export function canAccessPath(pathname: string, user: WorkspaceChoiceUser) {
  const cards = getWorkspaceCards(user);
  if (pathname.startsWith("/dashboard/user")) return true;
  if (pathname.startsWith("/dashboard/creator")) return cards.some((x) => x.id === "creator");
  if (pathname.startsWith("/dashboard/brand") || pathname.startsWith("/brand")) return cards.some((x) => x.id === "brand");
  if (pathname.startsWith("/admin") || pathname.startsWith("/ops")) return cards.some((x) => x.id === "admin");
  return true;
}
