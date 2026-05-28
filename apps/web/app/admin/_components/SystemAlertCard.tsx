type SystemAlertCardProps = {
  title: string;
  detail: string;
  severity?: "warning" | "danger";
};

export function SystemAlertCard({ title, detail, severity = "warning" }: SystemAlertCardProps) {
  const tone = severity === "danger"
    ? "border-red-200 bg-red-50 text-red-700"
    : "border-amber-200 bg-amber-50 text-amber-700";
  return (
    <article className={`rounded-2xl border p-3 ${tone}`}>
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-1 text-xs">{detail}</p>
    </article>
  );
}
