import { Search, LayoutGrid, List } from "lucide-react";
import type { SortOption, ViewMode } from "@/types";

type FilterBarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  category: string;
  onCategoryChange: (value: string) => void;
  categories: string[];
  stockFilter: string;
  onStockFilterChange: (value: string) => void;
  offerFilter: string;
  onOfferFilterChange: (value: string) => void;
  sortBy: SortOption;
  onSortChange: (value: SortOption) => void;
  view: ViewMode;
  onViewChange: (value: ViewMode) => void;
};

const sortOptions: SortOption[] = [
  "Recientes",
  "Nombre A-Z",
  "Mayor stock",
  "Menor stock",
  "Mayor descuento",
  "Precio mayor",
  "Precio menor",
];

export default function FilterBar({
  search,
  onSearchChange,
  category,
  onCategoryChange,
  categories,
  stockFilter,
  onStockFilterChange,
  offerFilter,
  onOfferFilterChange,
  sortBy,
  onSortChange,
  view,
  onViewChange,
}: FilterBarProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar productos por nombre o SKU..."
            className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-12 pr-4 text-[14px] text-slate-700 outline-none transition focus:border-violet-300 focus:ring-2 focus:ring-violet-100"
          />
        </div>

        <div className="grid grid-cols-2 gap-3 xl:flex xl:items-center">
          <select
            value={category}
            onChange={(e) => onCategoryChange(e.target.value)}
            className="h-12 min-w-[160px] rounded-xl border border-slate-200 bg-white px-4 text-[14px] text-slate-700 outline-none transition focus:border-violet-300 focus:ring-2 focus:ring-violet-100"
          >
            {categories.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>

          <select
            value={stockFilter}
            onChange={(e) => onStockFilterChange(e.target.value)}
            className="h-12 min-w-[140px] rounded-xl border border-slate-200 bg-white px-4 text-[14px] text-slate-700 outline-none transition focus:border-violet-300 focus:ring-2 focus:ring-violet-100"
          >
            <option value="Todos">Todos</option>
            <option value="Con stock">Con stock</option>
            <option value="Sin stock">Sin stock</option>
            <option value="Bajo stock">Bajo stock</option>
          </select>

          <select
            value={offerFilter}
            onChange={(e) => onOfferFilterChange(e.target.value)}
            className="h-12 min-w-[140px] rounded-xl border border-slate-200 bg-white px-4 text-[14px] text-slate-700 outline-none transition focus:border-violet-300 focus:ring-2 focus:ring-violet-100"
          >
            <option value="Todos">Todos</option>
            <option value="Con oferta">Con oferta</option>
            <option value="Sin oferta">Sin oferta</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value as SortOption)}
            className="h-12 min-w-[160px] rounded-xl border border-slate-200 bg-white px-4 text-[14px] text-slate-700 outline-none transition focus:border-violet-300 focus:ring-2 focus:ring-violet-100"
          >
            {sortOptions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>

          <div className="col-span-2 inline-flex h-12 items-center rounded-xl border border-slate-200 bg-white p-1 xl:col-span-1">
            <button
              type="button"
              onClick={() => onViewChange("cards")}
              className={`inline-flex h-10 items-center gap-2 rounded-lg px-4 text-[13px] font-semibold transition ${
                view === "cards"
                  ? "bg-violet-600 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <LayoutGrid className="h-4 w-4" />
              Tarjetas
            </button>

            <button
              type="button"
              onClick={() => onViewChange("table")}
              className={`inline-flex h-10 items-center gap-2 rounded-lg px-4 text-[13px] font-semibold transition ${
                view === "table"
                  ? "bg-violet-600 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <List className="h-4 w-4" />
              Tabla
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}