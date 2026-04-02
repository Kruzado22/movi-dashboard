import type { ProductStatus } from "@/types";

function getStatusConfig(status: ProductStatus) {
  switch (status) {
    case "Activo":
      return {
        bg: "bg-emerald-50",
        text: "text-emerald-700",
        ring: "ring-1 ring-emerald-200",
        dot: "bg-emerald-500",
      };
    case "Bajo stock":
      return {
        bg: "bg-amber-50",
        text: "text-amber-700",
        ring: "ring-1 ring-amber-200",
        dot: "bg-amber-400",
      };
    case "Agotado":
      return {
        bg: "bg-rose-50",
        text: "text-rose-700",
        ring: "ring-1 ring-rose-200",
        dot: "bg-rose-500",
      };
  }
}

export default function StatusBadge({ status }: { status: ProductStatus }) {
  const cfg = getStatusConfig(status);
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-[3px] text-[11px] font-semibold ${cfg.bg} ${cfg.text} ${cfg.ring}`}
    >
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${cfg.dot}`} />
      {status}
    </span>
  );
}
