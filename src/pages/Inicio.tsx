import { Link } from "wouter";
import {
  Package,
  Boxes,
  AlertTriangle,
  Image as ImageIcon,
  ArrowUpRight,
  TrendingUp,
  Tag,
  ShoppingBag,
} from "lucide-react";
import { PRODUCTS_MOCK, formatCLP } from "@/data/products";
import StatusBadge from "@/components/products/StatusBadge";

export default function Inicio() {
  const total = PRODUCTS_MOCK.length;
  const withStock = PRODUCTS_MOCK.filter((p) => p.stock > 0).length;
  const outOfStock = PRODUCTS_MOCK.filter((p) => p.stock === 0).length;
  const lowStock = PRODUCTS_MOCK.filter(
    (p) => p.stock > 0 && p.stock <= 5,
  );
  const withDiscount = PRODUCTS_MOCK.filter((p) => !!p.discount);
  const recentProducts = [...PRODUCTS_MOCK]
    .sort((a, b) => b.id - a.id)
    .slice(0, 5);

  const categories = Array.from(
    new Set(PRODUCTS_MOCK.map((p) => p.category)),
  );

  return (
    <div className="mx-auto max-w-[1180px] px-6 py-5">
      <div>
        <h1 className="text-[18px] font-black tracking-tight text-slate-900">
          Resumen
        </h1>
        <p className="mt-0.5 text-[13px] text-slate-500">
          Vista general del inventario
        </p>
      </div>

      {/* KPI row */}
      <div className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[
          {
            label: "Total productos",
            value: total,
            icon: Package,
            bg: "bg-violet-100",
            color: "text-violet-600",
            note: `${categories.length} categorías`,
          },
          {
            label: "En stock",
            value: withStock,
            icon: Boxes,
            bg: "bg-emerald-100",
            color: "text-emerald-600",
            note: "Listos para vender",
          },
          {
            label: "Agotados",
            value: outOfStock,
            icon: AlertTriangle,
            bg: "bg-rose-100",
            color: "text-rose-600",
            note: "Requieren reposición",
          },
          {
            label: "Con oferta",
            value: withDiscount.length,
            icon: Tag,
            bg: "bg-amber-100",
            color: "text-amber-600",
            note: "Descuentos activos",
          },
        ].map(({ label, value, icon: Icon, bg, color, note }) => (
          <div
            key={label}
            className="rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  {label}
                </p>
                <p className="mt-2 text-[2rem] font-black tabular-nums leading-none tracking-tight text-slate-900">
                  {value}
                </p>
                <p className="mt-1 text-[11px] text-slate-500">{note}</p>
              </div>
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${bg}`}
              >
                <Icon className={`h-4 w-4 ${color}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5 grid grid-cols-3 gap-4">
        {/* Recent products */}
        <div className="col-span-2 rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-4 w-4 text-violet-600" />
              <h2 className="text-[13px] font-bold text-slate-800">
                Productos recientes
              </h2>
            </div>
            <Link href="/productos">
              <a className="flex items-center gap-1 text-[12px] font-semibold text-violet-600 transition-colors hover:text-violet-800">
                Ver todos
                <ArrowUpRight className="h-3 w-3" />
              </a>
            </Link>
          </div>
          <div className="divide-y divide-slate-50">
            {recentProducts.map((product) => (
              <div
                key={product.id}
                className="flex items-center gap-3 px-5 py-3"
              >
                <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                  {product.hasImage && product.image ? (
                    <img
                      src={product.image}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <ImageIcon className="h-4 w-4 text-slate-300" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-slate-900">
                    {product.name}
                  </p>
                  <p className="mt-0.5 font-mono text-[10px] text-slate-400">
                    {product.sku}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[13px] font-bold text-slate-900">
                    {formatCLP(product.price)}
                  </p>
                  <p
                    className={`mt-0.5 text-[11px] font-semibold ${
                      product.stock === 0
                        ? "text-rose-600"
                        : product.stock <= 5
                          ? "text-amber-600"
                          : "text-slate-500"
                    }`}
                  >
                    {product.stock} uds
                  </p>
                </div>
                <div className="ml-2">
                  <StatusBadge status={product.status} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-4">
          {/* Low stock */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3.5">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                <h2 className="text-[13px] font-bold text-slate-800">
                  Stock bajo
                </h2>
              </div>
              <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-amber-100 px-1.5 text-[10px] font-bold text-amber-700">
                {lowStock.length}
              </span>
            </div>
            <div className="divide-y divide-slate-50 px-4 py-1">
              {lowStock.length === 0 ? (
                <p className="py-4 text-center text-[12px] text-slate-400">
                  Todo el stock está en orden
                </p>
              ) : (
                lowStock.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between py-2.5"
                  >
                    <p className="max-w-[140px] truncate text-[12px] font-medium text-slate-800">
                      {p.name}
                    </p>
                    <span className="ml-2 shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-700 ring-1 ring-amber-200">
                      {p.stock} uds
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Top offers */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3.5">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-3.5 w-3.5 text-violet-600" />
                <h2 className="text-[13px] font-bold text-slate-800">
                  Mayores descuentos
                </h2>
              </div>
            </div>
            <div className="divide-y divide-slate-50 px-4 py-1">
              {[...withDiscount]
                .sort((a, b) => (b.discount || 0) - (a.discount || 0))
                .slice(0, 4)
                .map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between py-2.5"
                  >
                    <p className="max-w-[140px] truncate text-[12px] font-medium text-slate-800">
                      {p.name}
                    </p>
                    <span className="ml-2 shrink-0 rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-bold text-rose-600 ring-1 ring-rose-200">
                      -{p.discount}%
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>

      <div className="h-8" />
    </div>
  );
}
