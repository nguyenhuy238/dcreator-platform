import { ReviewActionDialog } from "@/app/admin/_components/ReviewActionDialog";

export function ConfirmDangerDialog(props: { open: boolean; title: string; description: string; submitting?: boolean; onCancel: () => void; onConfirm: (reason?: string) => void }) {
  return (
    <ReviewActionDialog
      open={props.open}
      title={props.title}
      description={props.description}
      confirmLabel="Xác nhận"
      requireReason
      submitting={props.submitting}
      onCancel={props.onCancel}
      onConfirm={props.onConfirm}
    />
  );
}
