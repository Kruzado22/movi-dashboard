import { useLocation } from "wouter";
import { Bell, ChevronDown, ChevronRight } from "lucide-react";

const PAGE_LABELS: Record<string, string> = {
  "/": "Inicio",
  "/productos": "Productos",
  "/categorias": "Categorías",
  "/ofertas": "Ofertas",
  "/reportes": "Reportes",
  "/configuracion": "Configuración",
};

export default function Topbar() {
  const [location] = useLocation();
  const label = PAGE_LABELS[location] ?? "MOVI";

  return (
    <header className="flex h-[56px] shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6">
      <nav className="flex items-center gap-1.5 text-[13px]">
        <span className="font-medium text-slate-400">MOVI</span>
        <ChevronRight className="h-3 w-3 text-slate-300" />
        <span className="font-semibold text-slate-800">{label}</span>
      </nav>

      <div className="flex items-center gap-2.5">
        <button className="relative flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100">
          <Bell className="h-[15px] w-[15px]" />
          <span className="absolute right-1.5 top-1.5 h-[7px] w-[7px] rounded-full bg-violet-600 ring-[1.5px] ring-white" />
        </button>
        <div className="h-4 w-px bg-slate-200" />
        <button className="flex items-center gap-2 rounded-xl px-2.5 py-1.5 transition-colors hover:bg-slate-50">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-600 text-[11px] font-bold text-white shadow-sm">
            CA
          </div>
          <span className="text-[13px] font-semibold text-slate-700">
            Carlos A.
          </span>
          <ChevronDown className="h-3 w-3 text-slate-400" />
        </button>
      </div>
    </header>
  );
}
