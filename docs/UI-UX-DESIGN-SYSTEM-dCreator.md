# dCreator Standalone UI/UX Design System

## 1) Design Tokens

### Brand DNA
- Light premium.
- Mobile-first.
- Creator economy hiện đại.
- Tin cậy, minh bạch, trẻ trung.
- Không giống sàn TMĐT truyền thống.
- Không tạo cảm giác app đầu tư tài chính.

### Color Tokens
```ts
// design-tokens.ts
export const dCreatorTokens = {
  color: {
    background: {
      base: "#FFFFFF", // white
      subtle: "#FAFAFA", // zinc-50
      neutral: "#F8F8F7", // neutral wash
    },
    text: {
      primary: "#18181B", // zinc-900
      secondary: "#3F3F46", // zinc-700
      muted: "#71717A", // zinc-500
      inverse: "#FFFFFF",
    },
    border: {
      soft: "#E4E4E7", // zinc-200
      strong: "#D4D4D8", // zinc-300
    },
    brand: {
      primary: "#0EA5E9", // sky-500
      primaryHover: "#0284C7", // sky-600
      accent: "#14B8A6", // teal-500
    },
    state: {
      success: "#10B981", // emerald-500
      warning: "#F59E0B", // amber-500
      error: "#EF4444", // red-500
      info: "#3B82F6", // blue-500
    },
  },
  radius: {
    card: "1rem", // rounded-2xl
    button: "0.875rem",
    modal: "1rem",
    pill: "9999px",
  },
  shadow: {
    card: "0 8px 30px rgba(24,24,27,0.06)",
    elevated: "0 12px 40px rgba(24,24,27,0.1)",
  },
  typography: {
    heading: {
      family: "Manrope, ui-sans-serif, system-ui, sans-serif",
      weight: "800",
    },
    body: {
      family: "Inter, ui-sans-serif, system-ui, sans-serif",
      weight: "400",
    },
  },
  spacing: {
    xxs: "0.25rem",
    xs: "0.5rem",
    sm: "0.75rem",
    md: "1rem",
    lg: "1.5rem",
    xl: "2rem",
  },
};
```

### Tailwind Theme Extension
```ts
// tailwind.config.ts
import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        dc: {
          bg: "#FFFFFF",
          subtle: "#FAFAFA",
          neutral: "#F8F8F7",
          text: "#18181B",
          muted: "#71717A",
          border: "#E4E4E7",
          primary: "#0EA5E9",
          "primary-hover": "#0284C7",
          accent: "#14B8A6",
          success: "#10B981",
          warning: "#F59E0B",
          error: "#EF4444",
          info: "#3B82F6",
        },
      },
      borderRadius: {
        card: "1rem",
      },
      boxShadow: {
        card: "0 8px 30px rgba(24,24,27,0.06)",
      },
      fontFamily: {
        heading: ["Manrope", "ui-sans-serif", "system-ui", "sans-serif"],
        body: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;
```

## 2) Component List

### Base Components
- `Button`: variants `primary`, `secondary`, `ghost`, `danger`; CTA chính dùng `primary`.
- `Card`: `rounded-2xl`, border nhẹ, soft shadow.
- `Badge`: trạng thái `success/warning/error/info`.
- `Progress`: linear progress cho mission/reward progress.
- `Modal`: xác nhận hành động quan trọng, focus trap.
- `Tabs`: phân luồng nội dung theo role/context.
- `EmptyState`: icon + mô tả + CTA phù hợp ngữ cảnh.
- `ErrorState`: thông điệp rõ + nút `Thử lại`.
- `LoadingSkeleton`: skeleton blocks cho list/detail/card.

### Domain Components
- `CampaignCard`: thumbnail, creator, progress, CTA `Ủng hộ` hoặc `Tham gia`.
- `RewardCard`: reward title, điểm cần đổi, tồn kho, CTA `Đổi quà`.
- `MissionCard`: nhiệm vụ, reward, deadline, trạng thái, CTA `Tham gia`.
- `VoucherCard`: mã voucher, điều kiện, hạn dùng, CTA `Xem voucher` hoặc `Nhận reward`.

## 3) Layouts

### PublicLayout
- Dùng cho marketplace/campaign listing/detail.
- Header gọn + search/filter + mobile bottom nav.
- Nội dung max width `max-w-6xl`, mobile padding `px-4`.

### DashboardLayout
- Dùng cho creator/brand dashboard.
- Desktop có sidebar trái, mobile dùng top tabs + bottom nav.
- Card-based KPI, mọi widget có state loading/empty/error/success.

### AdminLayout
- Dùng cho moderation/ops.
- Tập trung readability và traceability.
- Ưu tiên bảng, filter, badge trạng thái, audit metadata.

## 4) Navigation

### Header
- Trái: logo + context title.
- Giữa: search (public pages).
- Phải: notification, profile menu, auth actions.

### MobileBottomNav
- `Trang chủ`, `Campaign`, `Nhiệm vụ`, `Voucher`, `Tài khoản`.
- Sticky bottom, vùng bấm >= 44px.

### Sidebar Dashboard
- Nhóm menu:
  - Overview
  - Campaigns
  - Missions
  - Rewards/Vouchers
  - Wallet
  - Analytics
  - Settings

## 5) UX Rules Theo Actor

### User/Supporter
- Luồng nhanh: khám phá -> hiểu campaign -> `Ủng hộ`.
- Luôn hiển thị minh bạch: mục tiêu, tiến độ, proof, lịch sử hỗ trợ.
- Sau hành động thành công phải có feedback rõ + bước tiếp theo.

### Creator
- Ưu tiên funnel nhiệm vụ, reward, payout.
- Cảnh báo rõ ràng khi thiếu thông tin hồ sơ/proof.
- Bảng tiến độ nhiệm vụ phải có trạng thái trực quan theo màu.

### Brand
- Tập trung quản lý campaign budget, KOL performance, reward stock.
- Dashboard hiển thị KPI quan trọng trước: spend, conversion, completion.
- CTA ưu tiên hành động vận hành: `Tham gia`, `Nhận reward`, `Xem voucher` theo ngữ cảnh.

### Admin/Ops
- Ưu tiên kiểm duyệt, chống gian lận, audit.
- Mọi action rủi ro cao cần modal confirm + lý do.
- Error message phải kèm ID trace/request để debug.

## 6) Async UX Contract (Bắt buộc)
- Mỗi màn có đủ 4 state: `loading`, `empty`, `error`, `success`.
- Không để màn hình trắng khi API chậm/lỗi.
- Retry action luôn hiện rõ tại `ErrorState`.
- Success state nên có summary ngắn + CTA tiếp theo.

## 7) CTA Language Rules
- Dùng CTA chính:
  - `Ủng hộ`
  - `Đổi quà`
  - `Tham gia`
  - `Nhận reward`
  - `Xem voucher`
- Không dùng CTA chính: `Donate`, `Invest`.

## 8) Example UI Code (Tailwind)

```tsx
// app/(public)/campaigns/_components/CampaignCard.tsx
type CampaignCardProps = {
  title: string;
  creatorName: string;
  progress: number;
  raisedText: string;
};

export function CampaignCard({ title, creatorName, progress, raisedText }: CampaignCardProps) {
  return (
    <article className="rounded-2xl border border-dc-border bg-dc-bg p-4 shadow-card transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="mb-3 aspect-[16/10] rounded-xl bg-dc-subtle" />
      <p className="text-xs text-dc-muted">{creatorName}</p>
      <h3 className="mt-1 font-heading text-lg font-extrabold text-dc-text">{title}</h3>

      <div className="mt-3">
        <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100">
          <div className="h-full rounded-full bg-dc-primary" style={{ width: `${progress}%` }} />
        </div>
        <p className="mt-2 text-sm text-dc-muted">{raisedText}</p>
      </div>

      <button className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-dc-primary px-4 py-2.5 font-semibold text-white hover:bg-dc-primary-hover">
        Ủng hộ
      </button>
    </article>
  );
}
```

```tsx
// app/_components/ui-states.tsx
export function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      <div className="h-40 animate-pulse rounded-2xl bg-zinc-100" />
      <div className="h-4 w-2/3 animate-pulse rounded bg-zinc-100" />
      <div className="h-4 w-1/2 animate-pulse rounded bg-zinc-100" />
    </div>
  );
}

export function EmptyState() {
  return (
    <div className="rounded-2xl border border-dc-border bg-white p-6 text-center shadow-card">
      <p className="font-heading text-lg font-bold text-dc-text">Chưa có dữ liệu</p>
      <p className="mt-1 text-sm text-dc-muted">Bạn có thể khám phá campaign mới để tham gia.</p>
      <button className="mt-4 rounded-xl bg-dc-primary px-4 py-2.5 font-semibold text-white">Tham gia</button>
    </div>
  );
}

export function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
      <p className="font-heading text-lg font-bold text-red-700">Có lỗi xảy ra</p>
      <p className="mt-1 text-sm text-red-600">Không tải được dữ liệu. Vui lòng thử lại.</p>
      <button onClick={onRetry} className="mt-4 rounded-xl bg-red-600 px-4 py-2.5 font-semibold text-white hover:bg-red-700">
        Thử lại
      </button>
    </div>
  );
}
```

```tsx
// app/(public)/layout.tsx
import type { ReactNode } from "react";

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-dc-subtle text-dc-text">
      <header className="sticky top-0 z-20 border-b border-dc-border bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <p className="font-heading text-base font-black">dCreator</p>
          <button className="rounded-xl bg-dc-primary px-3 py-2 text-sm font-semibold text-white">Tham gia</button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-4">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 border-t border-dc-border bg-white px-4 py-2 md:hidden">
        <ul className="grid grid-cols-5 gap-2 text-center text-xs text-dc-muted">
          <li>Trang chủ</li>
          <li>Campaign</li>
          <li>Nhiệm vụ</li>
          <li>Voucher</li>
          <li>Tài khoản</li>
        </ul>
      </nav>
    </div>
  );
}
```
