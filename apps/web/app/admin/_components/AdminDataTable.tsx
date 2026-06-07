import type { ReactNode } from "react";

type AdminDataTableProps = {
  headers: string[];
  children: ReactNode;
};

export function AdminDataTable({ headers, children }: AdminDataTableProps) {
  return (
    <div className="w-full overflow-x-auto rounded-2xl border border-zinc-200 bg-white shadow-sm">
      <table className="w-full min-w-[760px] text-sm">
        <thead className="bg-zinc-50 text-zinc-600">
          <tr>
            {headers.map((header) => (
              <th key={header} className="px-4 py-3 text-left">{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
