import type { ReactNode } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";

type Props = {
  title: string;
  value: number;
  subtitle: string;
  icon: ReactNode;
  accentBg: string;
  accentText: string;
  trend?: "up" | "down";
  trendLabel?: string;
};

export default function MetricCard({
  title,
  value,
  subtitle,
  icon,
  accentBg,
  accentText,
  trend,
  trendLabel,
}: Props) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
            {title}
          </p>
          <p className="mt-2 text-[2rem] font-black tabular-nums leading-none tracking-tight text-slate-900">
            {value}
          </p>
          <p className="mt-1 text-[11px] text-slate-500">{subtitle}</p>
        </div>
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${accentBg}`}
        >
          <span className={accentText}>{icon}</span>
        </div>
      </div>
      {trend && trendLabel && (
        <div className="mt-3 flex items-center gap-1 border-t border-slate-100 pt-2.5">
          {trend === "up" ? (
            <TrendingUp className="h-3 w-3 text-emerald-500" />
          ) : (
            <TrendingDown className="h-3 w-3 text-rose-500" />
          )}
          <span
            className={`text-[11px] font-semibold ${
              trend === "up" ? "text-emerald-600" : "text-rose-600"
            }`}
          >
            {trendLabel}
          </span>
        </div>
      )}
    </div>
  );
}
