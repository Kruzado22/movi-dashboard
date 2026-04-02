import { Search, ChevronDown, LayoutGrid, Table2, X } from "lucide-react";
import type { SortOption, ViewMode } from "@/types";

type Props = {
  search: string;
  onSearchChange: (v: string) => void;
  category: string;
  onCategoryChange: (v: string) => void;
  categories: string[];
  stockFilter: string;
  onStockFilterChange: (v: string) => void;
  offerFilter: string;
  onOfferFilterChange: (v: string) => void;
  sortBy: SortOption;
  onSortChange: (v: SortOption) => void;
  view: ViewMode;
  onViewChange: (v: ViewMode) => void;
};

function SelectFilter({
  value,
  onChange,
  options,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  label: string;
}) {
  const isActive = value !== options[0];
  return (
    <div className="relative">
      <select
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`h-9 w-full appearance-none rounded-lg border px-3 pr-7 text-[12.5px] font-medium outline-none transition focus:ring-2 focus:ring-violet-100 ${
          isActive
            ? "border-violet-300 bg-violet-50 text-violet-800 focus:border-violet-400"
            : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 focus:border-violet-400"
        }`}
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
      <ChevronDown
        className={`pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 ${
          isActive ? "text-violet-500" : "text-slate-400"
        }`}
      />
    </div>
  );
}

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
}: Props) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
      {/* Search — dominant */}
      <div className="relative min-w-0 flex-[2]">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Buscar productos por nombre o SKU..."
          className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-8 text-[13px] text-slate-800 outline-none placeholder:text-slate-400 transition hover:border-slate-300 focus:border-violet-400 focus:bg-white focus:ring-2 focus:ring-violet-100"
        />
        {search && (
          <button
            onClick={() => onSearchChange("")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:text-slate-600"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      <div className="h-5 w-px shrink-0 bg-slate-200" />

      {/* Dropdowns */}
      <div className="w-[126px] shrink-0">
        <SelectFilter
          value={category}
          onChange={onCategoryChange}
          options={categories}
          label="Categoría"
        />
      </div>
      <div className="w-[116px] shrink-0">
        <SelectFilter
          value={stockFilter}
          onChange={onStockFilterChange}
          options={["Todos", "Con stock", "Sin stock", "Bajo stock"]}
          label="Stock"
        />
      </div>
      <div className="w-[116px] shrink-0">
        <SelectFilter
          value={offerFilter}
          onChange={onOfferFilterChange}
          options={["Todos", "Con oferta", "Sin oferta"]}
          label="Oferta"
        />
      </div>
      <div className="w-[126px] shrink-0">
        <SelectFilter
          value={sortBy}
          onChange={(v) => onSortChange(v as SortOption)}
          options={[
            "Recientes",
            "Nombre A-Z",
            "Mayor stock",
            "Menor stock",
            "Mayor descuento",
            "Precio mayor",
            "Precio menor",
          ]}
          label="Ordenar"
        />
      </div>

      <div className="h-5 w-px shrink-0 bg-slate-200" />

      {/* View toggle */}
      <div className="flex shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
        <button
          onClick={() => onViewChange("cards")}
          title="Vista tarjetas"
          className={`flex h-9 w-9 items-center justify-center transition-colors ${
            view === "cards"
              ? "bg-violet-600 text-white"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          <LayoutGrid className="h-3.5 w-3.5" />
        </button>
        <div className="w-px bg-slate-200" />
        <button
          onClick={() => onViewChange("table")}
          title="Vista tabla"
          className={`flex h-9 w-9 items-center justify-center transition-colors ${
            view === "table"
              ? "bg-violet-600 text-white"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          <Table2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
