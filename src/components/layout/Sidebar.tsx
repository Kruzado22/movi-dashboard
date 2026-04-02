import { Link, useLocation } from "wouter";
import {
  Package,
  Home,
  ShoppingBag,
  Layers,
  Tag,
  BarChart3,
  Settings,
  ChevronRight,
} from "lucide-react";

const navItems = [
  { icon: Home, label: "Inicio", href: "/" },
  { icon: ShoppingBag, label: "Productos", href: "/productos" },
  { icon: Layers, label: "Categorías", href: "/categorias" },
  { icon: Tag, label: "Ofertas", href: "/ofertas" },
  { icon: BarChart3, label: "Reportes", href: "/reportes" },
];

export default function Sidebar() {
  const [location] = useLocation();

  return (
    <aside className="flex h-screen w-[216px] shrink-0 flex-col border-r border-slate-200 bg-white">
      {/* Logo */}
      <div className="flex h-[56px] items-center gap-2.5 border-b border-slate-100 px-4">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-600 shadow-sm shadow-violet-300/40">
          <Package className="h-3.5 w-3.5 text-white" />
        </div>
        <span className="text-[15px] font-black tracking-tight text-slate-900">MOVI</span>
        <span className="inline-flex items-center rounded-full bg-violet-100 px-1.5 py-px text-[9px] font-bold uppercase tracking-wider text-violet-700">
          Pro
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2.5 py-4">
        <p className="mb-1 px-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
          Principal
        </p>
        <ul className="space-y-px">
          {navItems.map(({ icon: Icon, label, href }) => {
            const isActive =
              href === "/"
                ? location === "/" || location === ""
                : location.startsWith(href);
            return (
              <li key={href}>
                <Link href={href}>
                  <a
                    className={`group flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] font-medium transition-colors ${
                      isActive
                        ? "bg-violet-50 text-violet-700"
                        : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                    }`}
                  >
                    <Icon
                      className={`h-[15px] w-[15px] shrink-0 ${
                        isActive
                          ? "text-violet-600"
                          : "text-slate-400 group-hover:text-slate-500"
                      }`}
                    />
                    {label}
                    {isActive && label === "Productos" && (
                      <span className="ml-auto flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-violet-600 px-1 text-[10px] font-bold text-white">
                        8
                      </span>
                    )}
                  </a>
                </Link>
              </li>
            );
          })}
        </ul>

        <p className="mb-1 mt-5 px-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
          Sistema
        </p>
        <ul className="space-y-px">
          <li>
            <Link href="/configuracion">
              <a
                className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] font-medium transition-colors ${
                  location.startsWith("/configuracion")
                    ? "bg-violet-50 text-violet-700"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                }`}
              >
                <Settings className="h-[15px] w-[15px] shrink-0 text-slate-400" />
                Configuración
              </a>
            </Link>
          </li>
        </ul>
      </nav>

      {/* User */}
      <div className="border-t border-slate-100 p-2.5">
        <button className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left transition-colors hover:bg-slate-50">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 text-[11px] font-bold text-white shadow-sm">
            CA
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12px] font-semibold text-slate-800">
              Carlos Araya
            </p>
            <p className="truncate text-[10px] text-slate-400">Administrador</p>
          </div>
          <ChevronRight className="h-3 w-3 text-slate-300" />
        </button>
      </div>
    </aside>
  );
}
