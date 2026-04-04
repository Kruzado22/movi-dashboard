import type { ReactNode } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";

type MetricCardProps = {
  title: string;
  value: number | string;
  subtitle: string;
  icon: ReactNode;
  accentBg?: string;
  accentText?: string;
  trend?: "up" | "down";
  trendLabel?: string;
};

export default function MetricCard({
  title,
  value,
  subtitle,
  icon,
  accentBg = "bg-violet-100",
  accentText = "text-violet-600",
  trend,
  trendLabel,
}: MetricCardProps) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-slate-500">{title}</p>

          <div className="mt-2 flex items-end gap-2">
            <h3 className="text-[30px] font-black leading-none tracking-tight text-slate-950">
              {value}
            </h3>
          </div>

          <p className="mt-2 text-[13px] text-slate-500">{subtitle}</p>

          {trendLabel && (
            <div
              className={`mt-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                trend === "down"
                  ? "bg-amber-50 text-amber-700"
                  : "bg-emerald-50 text-emerald-700"
              }`}
            >
              {trend === "down" ? (
                <TrendingDown className="h-3.5 w-3.5" />
              ) : (
                <TrendingUp className="h-3.5 w-3.5" />
              )}
              {trendLabel}
            </div>
          )}
        </div>

        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${accentBg} ${accentText}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}