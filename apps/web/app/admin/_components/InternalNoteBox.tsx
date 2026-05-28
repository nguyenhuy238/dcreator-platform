export function InternalNoteBox({ value, onChange, onSave, saving }: { value: string; onChange: (v: string) => void; onSave: () => void; saving?: boolean }) {
  return (
    <section className="dc-card p-4">
      <p className="font-semibold text-zinc-900">Internal note</p>
      <textarea className="dc-input mt-3 min-h-24" placeholder="Ghi chú nội bộ cho Ops/Admin..." value={value} onChange={(e) => onChange(e.target.value)} />
      <div className="mt-3">
        <button className="dc-btn-secondary" disabled={saving} onClick={onSave}>{saving ? "Đang lưu..." : "Lưu ghi chú"}</button>
      </div>
    </section>
  );
}
