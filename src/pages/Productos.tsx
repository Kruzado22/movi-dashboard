import { useMemo, useState, useRef, useEffect } from "react";
import * as XLSX from "xlsx";
import {
  Plus,
  Upload,
  MoreHorizontal,
  Image as ImageIcon,
  AlertTriangle,
  Sparkles,
  Boxes,
  Package,
  Search,
  X,
  FileText,
  Settings,
  Trash2,
} from "lucide-react";
import type { SortOption, ViewMode, Product } from "@/types";
import { PRODUCTS_MOCK } from "@/data/products";
import MetricCard from "@/components/products/MetricCard";
import ProductCard from "@/components/products/ProductCard";
import ProductTable from "@/components/products/ProductTable";
import FilterBar from "@/components/products/FilterBar";

function normalizeKey(key: string) {
  return key
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "")
    .replace(/[_-]/g, "");
}

function getValue(row: Record<string, any>, keys: string[]) {
  const normalizedEntries = Object.entries(row).map(([k, v]) => [normalizeKey(k), v] as const);

  for (const wanted of keys.map(normalizeKey)) {
    const found = normalizedEntries.find(([k]) => k === wanted);
    if (found) return found[1];
  }

  return undefined;
}

function toNumber(value: any, fallback = 0) {
  if (value === undefined || value === null || value === "") return fallback;

  const cleaned =
    typeof value === "string"
      ? value.replace(/\$/g, "").replace(/\./g, "").replace(/,/g, ".").trim()
      : value;

  const n = Number(cleaned);
  return Number.isFinite(n) ? n : fallback;
}

function toBoolean(value: any) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value > 0;

  if (typeof value === "string") {
    const v = value.toLowerCase().trim();
    return ["true", "1", "si", "sí", "yes", "ok", "con", "activo"].includes(v);
  }

  return false;
}

export default function Productos() {
  const [products, setProducts] = useState<Product[]>(PRODUCTS_MOCK);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Todas");
  const [stockFilter, setStockFilter] = useState("Todos");
  const [offerFilter, setOfferFilter] = useState("Todos");
  const [sortBy, setSortBy] = useState<SortOption>("Recientes");
  const [view, setView] = useState<ViewMode>("cards");
  const [menuOpen, setMenuOpen] = useState(false);
  const [showOnlyNoImage, setShowOnlyNoImage] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    document.title = "MOVI | Productos";
  }, []);

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  const categories = useMemo(() => {
    const unique = Array.from(new Set(products.map((p) => p.category)));
    return ["Todas", ...unique.sort()];
  }, [products]);

  const filteredProducts = useMemo(() => {
    let result = [...products];

    if (search.trim()) {
      const term = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(term) ||
          p.sku.toLowerCase().includes(term),
      );
    }

    if (category !== "Todas") {
      result = result.filter((p) => p.category === category);
    }

    if (stockFilter === "Con stock") {
      result = result.filter((p) => p.stock > 0);
    }

    if (stockFilter === "Sin stock") {
      result = result.filter((p) => p.stock === 0);
    }

    if (stockFilter === "Bajo stock") {
      result = result.filter((p) => p.stock > 0 && p.stock <= 5);
    }

    if (offerFilter === "Con oferta") {
      result = result.filter((p) => !!p.discount);
    }

    if (offerFilter === "Sin oferta") {
      result = result.filter((p) => !p.discount);
    }

    if (showOnlyNoImage) {
      result = result.filter((p) => !p.hasImage);
    }

    switch (sortBy) {
      case "Nombre A-Z":
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "Mayor stock":
        result.sort((a, b) => b.stock - a.stock);
        break;
      case "Menor stock":
        result.sort((a, b) => a.stock - b.stock);
        break;
      case "Mayor descuento":
        result.sort((a, b) => (b.discount || 0) - (a.discount || 0));
        break;
      case "Precio mayor":
        result.sort((a, b) => b.price - a.price);
        break;
      case "Precio menor":
        result.sort((a, b) => a.price - b.price);
        break;
      default:
        result.sort((a, b) => b.id - a.id);
    }

    return result;
  }, [products, search, category, stockFilter, offerFilter, sortBy, showOnlyNoImage]);

  const metrics = useMemo(
    () => ({
      total: products.length,
      withStock: products.filter((p) => p.stock > 0).length,
      outOfStock: products.filter((p) => p.stock === 0).length,
      withoutImage: products.filter((p) => !p.hasImage).length,
    }),
    [products],
  );

  const alerts = useMemo(
    () => ({
      lowStock: products.filter((p) => p.stock > 0 && p.stock <= 5).length,
      noImage: products.filter((p) => !p.hasImage).length,
      offers: products.filter((p) => !!p.discount).length,
    }),
    [products],
  );

  const hasActiveFilters = !!(
    search.trim() ||
    category !== "Todas" ||
    stockFilter !== "Todos" ||
    offerFilter !== "Todos" ||
    showOnlyNoImage
  );

  function handleDelete(id: number) {
    setProducts((prev) => prev.filter((x) => x.id !== id));
  }

  function clearFilters() {
    setSearch("");
    setCategory("Todas");
    setStockFilter("Todos");
    setOfferFilter("Todos");
    setShowOnlyNoImage(false);
  }

  function handleImportClick() {
    fileInputRef.current?.click();
  }

  function handleFileImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        if (!data) return;

        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet);

        if (!rows.length) {
          window.alert("El archivo no contiene filas válidas para importar.");
          return;
        }

        const importedProducts: Product[] = rows.map((row, index) => {
          const id = toNumber(
            getValue(row, ["id", "codigo", "codigointerno"]),
            Date.now() + index,
          );

          const name = String(
            getValue(row, ["name", "nombre", "producto", "titulo"]) ?? `Producto ${index + 1}`,
          );

          const sku = String(
            getValue(row, ["sku", "codigosku", "codigo", "referencia"]) ?? `SKU-${id}`,
          );

          const price = toNumber(
            getValue(row, ["price", "precio", "valor"]),
            0,
          );

          const stock = toNumber(
            getValue(row, ["stock", "inventario", "cantidad", "unidades"]),
            0,
          );

          const productCategory = String(
            getValue(row, ["category", "categoria", "rubro"]) ?? "General",
          );

          const discountRaw = getValue(row, ["discount", "descuento", "oferta"]);
          const discount =
            discountRaw !== undefined && discountRaw !== null && discountRaw !== ""
              ? toNumber(discountRaw, 0)
              : undefined;

          const image = getValue(row, ["image", "imagen", "foto", "urlimagen"]);
          const hasImage =
            image !== undefined && image !== null && String(image).trim() !== ""
              ? true
              : toBoolean(getValue(row, ["hasImage", "has_image", "conimagen"]));

          return {
            id,
            name,
            sku,
            price,
            stock,
            category: productCategory,
            discount,
            hasImage,
            image: image ? String(image) : undefined,
          } as Product;
        });

        setProducts(importedProducts);
      } catch (error) {
        console.error(error);
        window.alert("No se pudo importar el archivo. Revisa el formato del Excel o CSV.");
      } finally {
        e.target.value = "";
      }
    };

    reader.readAsArrayBuffer(file);
  }

  function handleAddProduct() {
    const name = window.prompt("Nombre del producto:");
    if (!name) return;

    const sku = window.prompt("SKU:", `SKU-${Date.now()}`) || `SKU-${Date.now()}`;
    const price = Number(window.prompt("Precio:", "0") || 0);
    const stock = Number(window.prompt("Stock:", "0") || 0);
    const category = window.prompt("Categoría:", "General") || "General";

    const newProduct: Product = {
      id: Date.now(),
      name,
      sku,
      price,
      stock,
      category,
      hasImage: false,
    };

    setProducts((prev) => [newProduct, ...prev]);
  }

  function handleExportInventory() {
    const rows = products.map((p) => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      price: p.price,
      stock: p.stock,
      category: p.category,
      discount: p.discount ?? "",
      hasImage: p.hasImage ? "sí" : "no",
      image: p.image ?? "",
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Productos");
    XLSX.writeFile(workbook, "inventario-movi.xlsx");
    setMenuOpen(false);
  }

  function handleViewWithoutImage() {
    setShowOnlyNoImage((prev) => !prev);
    setMenuOpen(false);
  }

  function handleGenerateReport() {
    const report = [
      "REPORTE MOVI",
      "",
      `Total productos: ${products.length}`,
      `Con stock: ${products.filter((p) => p.stock > 0).length}`,
      `Sin stock: ${products.filter((p) => p.stock === 0).length}`,
      `Sin imagen: ${products.filter((p) => !p.hasImage).length}`,
      `Con oferta: ${products.filter((p) => !!p.discount).length}`,
    ].join("\n");

    const blob = new Blob([report], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "reporte-movi.txt";
    a.click();
    URL.revokeObjectURL(url);
    setMenuOpen(false);
  }

  function handleSettings() {
    window.alert("Aquí puedes conectar una pantalla de configuración más adelante.");
    setMenuOpen(false);
  }

  return (
    <div className="mx-auto max-w-[1440px] px-6 py-5">
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={handleFileImport}
      />

      <div className="rounded-[28px] border border-violet-400 bg-white px-6 py-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-violet-600 text-white shadow-lg shadow-violet-300/40">
              <Package className="h-7 w-7" />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-[22px] font-black tracking-tight text-slate-950">
                  MOVI
                </h1>

                <span className="inline-flex items-center rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-violet-700">
                  ✨ Inventario inteligente
                </span>
              </div>

              <p className="mt-1 text-[14px] text-slate-500">
                Gestiona productos, stock y ofertas en un solo lugar.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleAddProduct}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-violet-600 px-5 text-[14px] font-bold text-white shadow-sm shadow-violet-300/40 transition hover:bg-violet-700"
            >
              <Plus className="h-4 w-4" />
              Agregar producto
            </button>

            <button
              onClick={handleImportClick}
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-[14px] font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              <Upload className="h-4 w-4" />
              Importar Excel
            </button>

            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className={`inline-flex h-11 w-11 items-center justify-center rounded-xl border shadow-sm transition-colors ${
                  menuOpen
                    ? "border-violet-300 bg-violet-50 text-violet-700"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                <MoreHorizontal className="h-5 w-5" />
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-12 z-50 w-56 overflow-hidden rounded-2xl border border-slate-100 bg-white py-1 shadow-2xl shadow-slate-200/40 ring-1 ring-black/[0.04]">
                  {[
                    { icon: Upload, label: "Exportar inventario", action: handleExportInventory },
                    {
                      icon: ImageIcon,
                      label: showOnlyNoImage ? "Ver todos" : "Ver sin imagen",
                      action: handleViewWithoutImage,
                    },
                    { icon: FileText, label: "Generar reporte", action: handleGenerateReport },
                    { icon: Settings, label: "Configuración", action: handleSettings },
                  ].map(({ icon: Icon, label, action }) => (
                    <button
                      key={label}
                      onClick={action}
                      className="flex w-full items-center gap-2.5 px-4 py-2.5 text-[13px] text-slate-700 transition-colors hover:bg-slate-50"
                    >
                      <Icon className="h-3.5 w-3.5 text-slate-400" />
                      {label}
                    </button>
                  ))}

                  <div className="my-1 border-t border-slate-100" />

                  <button
                    onClick={() => {
                      setProducts([]);
                      setMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-2.5 px-4 py-2.5 text-[13px] text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Borrar todo
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Total productos"
          value={metrics.total}
          subtitle="Inventario registrado"
          icon={<Package className="h-4 w-4" />}
          accentBg="bg-violet-100"
          accentText="text-violet-600"
        />
        <MetricCard
          title="Con stock"
          value={metrics.withStock}
          subtitle="Disponibles para venta"
          icon={<Boxes className="h-4 w-4" />}
          accentBg="bg-emerald-100"
          accentText="text-emerald-600"
        />
        <MetricCard
          title="Sin stock"
          value={metrics.outOfStock}
          subtitle="Requieren atención"
          icon={<AlertTriangle className="h-4 w-4" />}
          accentBg="bg-amber-100"
          accentText="text-amber-600"
        />
        <MetricCard
          title="Sin imagen"
          value={metrics.withoutImage}
          subtitle="Pendientes de completar"
          icon={<ImageIcon className="h-4 w-4" />}
          accentBg="bg-sky-100"
          accentText="text-sky-600"
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {alerts.lowStock > 0 && (
          <button className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-[12px] font-semibold text-amber-700 transition-colors hover:bg-amber-100">
            <AlertTriangle className="h-3.5 w-3.5" />
            {alerts.lowStock}{" "}
            {alerts.lowStock === 1 ? "producto con stock bajo" : "productos con stock bajo"}
          </button>
        )}

        {alerts.noImage > 0 && (
          <button className="inline-flex items-center gap-1.5 rounded-lg border border-sky-200 bg-sky-50 px-3 py-1.5 text-[12px] font-semibold text-sky-700 transition-colors hover:bg-sky-100">
            <ImageIcon className="h-3.5 w-3.5" />
            {alerts.noImage}{" "}
            {alerts.noImage === 1 ? "producto sin imagen" : "productos sin imagen"}
          </button>
        )}

        {alerts.offers > 0 && (
          <button className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-[12px] font-semibold text-rose-600 transition-colors hover:bg-rose-100">
            <Sparkles className="h-3.5 w-3.5" />
            {alerts.offers}{" "}
            {alerts.offers === 1 ? "producto con oferta activa" : "productos con oferta activa"}
          </button>
        )}
      </div>

      <div className="mt-4 rounded-[24px] border border-slate-200 bg-white px-4 py-4 shadow-sm">
        <FilterBar
          search={search}
          onSearchChange={setSearch}
          category={category}
          onCategoryChange={setCategory}
          categories={categories}
          stockFilter={stockFilter}
          onStockFilterChange={setStockFilter}
          offerFilter={offerFilter}
          onOfferFilterChange={setOfferFilter}
          sortBy={sortBy}
          onSortChange={setSortBy}
          view={view}
          onViewChange={setView}
        />

        <div className="mt-3 flex items-center justify-between border-t border-slate-100 px-1 pt-3">
          <p className="text-[13px] text-slate-500">
            Mostrando{" "}
            <span className="font-bold text-slate-700">{filteredProducts.length}</span> de{" "}
            <span className="font-bold text-slate-700">{products.length}</span> productos
          </p>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 text-[12px] font-semibold text-violet-600 transition-colors hover:text-violet-800"
            >
              <X className="h-3 w-3" />
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

      {filteredProducts.length === 0 && (
        <div className="mt-6 flex flex-col items-center rounded-2xl border border-dashed border-slate-300 bg-white py-14 text-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
            <Search className="h-5 w-5" />
          </div>

          <h3 className="mt-3 text-[14px] font-bold text-slate-800">
            Sin resultados
          </h3>

          <p className="mt-1 max-w-[260px] text-[13px] text-slate-500">
            Ningún producto coincide con tu búsqueda o filtros activos.
          </p>

          <button
            onClick={clearFilters}
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-4 py-2 text-[12.5px] font-semibold text-white shadow-sm transition-colors hover:bg-violet-700"
          >
            <X className="h-3.5 w-3.5" />
            Limpiar filtros
          </button>
        </div>
      )}

      {view === "cards" && filteredProducts.length > 0 && (
        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {filteredProducts.map((p) => (
            <ProductCard key={p.id} product={p} onDelete={handleDelete} />
          ))}
        </div>
      )}

      {view === "table" && filteredProducts.length > 0 && (
        <div className="mt-5">
          <ProductTable products={filteredProducts} onDelete={handleDelete} />
        </div>
      )}

      <div className="h-8" />
    </div>
  );
}