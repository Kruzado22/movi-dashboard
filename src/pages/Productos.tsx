import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import {
  Plus,
  Upload,
  Download,
  MoreHorizontal,
  Image as ImageIcon,
  AlertTriangle,
  Sparkles,
  Boxes,
  Package,
  Search,
  X,
  FileText,
  Trash2,
  RotateCcw,
  RefreshCw,
  Camera,
  Save,
  Ruler,
  Scale,
  Tag,
  FilePenLine,
  Truck,
  Calculator,
  TrendingUp,
} from "lucide-react";
import type { LogisticsTier, PricingProfile, Product, ProductStatus, SortOption, ViewMode } from "@/types";
import { PRODUCTS_MOCK, formatCLP } from "@/data/products";
import MetricCard from "@/components/products/MetricCard";
import ProductCard from "@/components/products/ProductCard";
import ProductTable from "@/components/products/ProductTable";
import FilterBar from "@/components/products/FilterBar";
import {
  VOLUMETRIC_FACTOR,
  extractMeasurementsFromText,
  extractWeightFromText,
  formatKg,
  getVolumetricBadgeClass,
  getVolumetricInfo,
} from "@/lib/volumetric";
import {
  LOGISTICS_PRICE_LIMIT,
  LOGISTICS_TIERS,
  getLogisticsCostInfo,
  normalizeLogisticsTier,
} from "@/lib/logistics";
import {
  DEFAULT_COMMISSION_RATE,
  DEFAULT_COFINANCING_RATE,
  formatPercent,
  getDefaultCofinancingRate,
  getProfitBadgeClass,
  getProfitInfo,
  normalizePricingProfile,
  normalizeRate,
} from "@/lib/pricing";

const STORAGE_KEY = "movi.products.v1";
const MOCHA_ORIGIN = "https://uiyacnls65gg4.mocha.app";

type ProductDraft = {
  name: string;
  sku: string;
  description: string;
  price: string;
  cost: string;
  normalPrice: string;
  offerPrice1: string;
  offerPrice2: string;
  stock: string;
  discount: string;
  category: string;
  image: string;
  measurements: string;
  weight: string;
  logisticsTier: LogisticsTier;
  pricingProfile: PricingProfile;
  commissionRate: string;
  cofinancingRate: string;
};

type ProductInput = {
  id?: unknown;
  name?: unknown;
  sku?: unknown;
  description?: unknown;
  price?: unknown;
  cost?: unknown;
  normalPrice?: unknown;
  offerPrice1?: unknown;
  offerPrice2?: unknown;
  stock?: unknown;
  discount?: unknown;
  hasImage?: unknown;
  status?: unknown;
  category?: unknown;
  image?: unknown;
  measurements?: unknown;
  weight?: unknown;
  logisticsTier?: unknown;
  pricingProfile?: unknown;
  commissionRate?: unknown;
  cofinancingRate?: unknown;
};

type MochaProduct = {
  id: number;
  article_id: string;
  name: string;
  cost: number | null;
  normal_price: number | null;
  offer_price_1: number | null;
  offer_price_2: number | null;
  measurements: string | null;
  weight: string | null;
  image_url: string | null;
  description: string | null;
  is_out_of_stock: number | boolean | null;
};

function normalizeKey(key: string) {
  return key
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "")
    .replace(/[_-]/g, "");
}

function getValue(row: Record<string, unknown>, keys: string[]) {
  const normalizedEntries = Object.entries(row).map(([k, v]) => [normalizeKey(k), v] as const);

  for (const wanted of keys.map(normalizeKey)) {
    const found = normalizedEntries.find(([k]) => k === wanted);
    if (found) return found[1];
  }

  return undefined;
}

function toNumber(value: unknown, fallback = 0) {
  if (value === undefined || value === null || value === "") return fallback;

  let cleaned: unknown = value;

  if (typeof value === "string") {
    const raw = value.replace(/\$/g, "").trim();
    const hasComma = raw.includes(",");
    const hasDot = raw.includes(".");

    if (hasComma && hasDot) {
      cleaned = /^\d{1,3}(,\d{3})+(\.\d+)?$/.test(raw)
        ? raw.replace(/,/g, "")
        : raw.replace(/\./g, "").replace(/,/g, ".");
    } else if (hasComma) {
      cleaned = /^\d{1,3}(,\d{3})+$/.test(raw)
        ? raw.replace(/,/g, "")
        : raw.replace(/,/g, ".");
    } else if (/^\d{1,3}(\.\d{3})+$/.test(raw)) {
      cleaned = raw.replace(/\./g, "");
    } else {
      cleaned = raw;
    }
  }

  const numberValue = Number(cleaned);
  return Number.isFinite(numberValue) ? numberValue : fallback;
}

function toBoolean(value: unknown) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value > 0;

  if (typeof value === "string") {
    const normalized = value.toLowerCase().trim();
    return ["true", "1", "si", "sí", "yes", "ok", "con", "activo"].includes(normalized);
  }

  return false;
}

function absoluteMochaImage(imageUrl: string | null | undefined) {
  if (!imageUrl) return "";
  return imageUrl.startsWith("http") ? imageUrl : `${MOCHA_ORIGIN}${imageUrl}`;
}

function mapMochaProduct(product: MochaProduct, index = 0): Product {
  const normalPrice = product.normal_price ?? 0;
  const salePrice = product.offer_price_2 || product.offer_price_1 || normalPrice || product.cost || 0;
  const discount =
    normalPrice > 0 && salePrice > 0 && salePrice < normalPrice
      ? Math.round(((normalPrice - salePrice) / normalPrice) * 100)
      : undefined;
  const stock = product.is_out_of_stock ? 0 : 1;
  const image = absoluteMochaImage(product.image_url);

  return normalizeProduct({
    id: product.id || Date.now() + index,
    name: product.name,
    sku: product.article_id || `MOCHA-${product.id}`,
    description: product.description ?? "",
    price: salePrice,
    cost: product.cost,
    normalPrice,
    offerPrice1: product.offer_price_1,
    offerPrice2: product.offer_price_2,
    stock,
    discount,
    category: "General",
    image,
    hasImage: image.length > 0,
    measurements: product.measurements ?? "",
    weight: product.weight ?? "",
    logisticsTier: "5/5",
    pricingProfile: "4/5 estrellas",
    commissionRate: DEFAULT_COMMISSION_RATE,
    cofinancingRate: DEFAULT_COFINANCING_RATE,
  });
}

function getImageValue(row: Record<string, unknown>) {
  return String(
    getValue(row, [
      "image",
      "imagen",
      "foto",
      "urlimagen",
      "imagenurl",
      "url imagen",
      "linkimagen",
      "link imagen",
      "foto url",
      "fotourl",
      "imageurl",
      "imagenprincipal",
      "imagen principal",
      "url",
      "link",
    ]) ?? "",
  ).trim();
}

function getPriceValues(row: Record<string, unknown>) {
  const normalPrice = toNumber(
    getValue(row, [
      "price",
      "precio",
      "precionormal",
      "precio normal",
      "valor",
      "valorventa",
      "valor venta",
      "normal",
    ]),
    0,
  );
  const offer1 = toNumber(getValue(row, ["preciooferta1", "precio oferta 1", "oferta1", "oferta 1"]), 0);
  const offer2 = toNumber(getValue(row, ["preciooferta2", "precio oferta 2", "oferta2", "oferta 2"]), 0);
  const offerPrice = [offer1, offer2].filter((value) => value > 0).sort((a, b) => a - b)[0] ?? 0;
  const salePrice = offerPrice || normalPrice;
  const computedDiscount =
    normalPrice > 0 && offerPrice > 0 && offerPrice < normalPrice
      ? Math.round(((normalPrice - offerPrice) / normalPrice) * 100)
      : undefined;

  return { normalPrice, offer1, offer2, salePrice, computedDiscount };
}

function getProductStatus(stock: number): ProductStatus {
  if (stock <= 0) return "Agotado";
  if (stock <= 5) return "Bajo stock";
  return "Activo";
}

function clampNumber(value: number, min = 0, max = Number.POSITIVE_INFINITY) {
  return Math.min(Math.max(value, min), max);
}

function cleanDiscount(value: unknown) {
  if (value === undefined || value === null || value === "") return undefined;

  const parsed = clampNumber(toNumber(value, 0), 0, 100);
  return parsed > 0 ? parsed : undefined;
}

function normalizeProduct(input: ProductInput, index = 0): Product {
  const id = Math.trunc(toNumber(input.id, Date.now() + index));
  const stock = Math.trunc(clampNumber(toNumber(input.stock, 0), 0));
  const image = String(input.image ?? "").trim();
  const name = String(input.name ?? `Producto ${index + 1}`).trim();
  const sku = String(input.sku ?? `SKU-${id}`).trim();
  const description = String(input.description ?? "").trim();
  const category = String(input.category ?? "General").trim() || "General";
  const cost = toNumber(input.cost, 0);
  const normalPrice = toNumber(input.normalPrice, 0);
  const offerPrice1 = toNumber(input.offerPrice1, 0);
  const offerPrice2 = toNumber(input.offerPrice2, 0);
  const pricingProfile = normalizePricingProfile(input.pricingProfile);
  const measurements = String(input.measurements ?? "").trim() || extractMeasurementsFromText(description);
  const weight = String(input.weight ?? "").trim() || extractWeightFromText(description);
  const offerPrice = [offerPrice1, offerPrice2].filter((value) => value > 0).sort((a, b) => a - b)[0] ?? 0;
  const price = Math.trunc(
    clampNumber(toNumber(input.price, 0) || offerPrice || normalPrice || cost, 0),
  );
  const computedDiscount =
    normalPrice > 0 && offerPrice > 0 && offerPrice < normalPrice
      ? Math.round(((normalPrice - offerPrice) / normalPrice) * 100)
      : undefined;

  return {
    id,
    name,
    sku: sku || `SKU-${id}`,
    description,
    price,
    cost: cost > 0 ? Math.trunc(cost) : undefined,
    normalPrice: normalPrice > 0 ? Math.trunc(normalPrice) : undefined,
    offerPrice1: offerPrice1 > 0 ? Math.trunc(offerPrice1) : undefined,
    offerPrice2: offerPrice2 > 0 ? Math.trunc(offerPrice2) : undefined,
    stock,
    discount: cleanDiscount(input.discount) ?? computedDiscount,
    hasImage: image.length > 0 ? true : toBoolean(input.hasImage),
    status: getProductStatus(stock),
    category,
    image,
    measurements,
    weight,
    logisticsTier: normalizeLogisticsTier(input.logisticsTier),
    pricingProfile,
    commissionRate: normalizeRate(input.commissionRate, DEFAULT_COMMISSION_RATE),
    cofinancingRate: normalizeRate(input.cofinancingRate, getDefaultCofinancingRate(pricingProfile)),
  };
}

function loadProducts(): Product[] {
  if (typeof window === "undefined") {
    return PRODUCTS_MOCK.map((product, index) => normalizeProduct(product, index));
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return PRODUCTS_MOCK.map((product, index) => normalizeProduct(product, index));

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return PRODUCTS_MOCK.map((product, index) => normalizeProduct(product, index));

    const loaded = parsed
      .map((item, index) => normalizeProduct(item, index))
      .filter((product) => product.name.trim().length > 0);

    return loaded.length ? loaded : PRODUCTS_MOCK.map((product, index) => normalizeProduct(product, index));
  } catch {
    return PRODUCTS_MOCK.map((product, index) => normalizeProduct(product, index));
  }
}

function getNextId(products: Product[]) {
  return products.reduce((max, product) => Math.max(max, product.id), 0) + 1;
}

function getUniqueId(baseId: number, usedIds: Set<number>) {
  let id = Math.trunc(baseId);

  while (usedIds.has(id)) {
    id += 1;
  }

  usedIds.add(id);
  return id;
}

function createEmptyDraft(nextId: number): ProductDraft {
  return {
    name: "",
    sku: `SKU-${nextId}`,
    description: "",
    price: "0",
    cost: "",
    normalPrice: "",
    offerPrice1: "",
    offerPrice2: "",
    stock: "0",
    discount: "",
    category: "General",
    image: "",
    measurements: "",
    weight: "",
    logisticsTier: "5/5",
    pricingProfile: "4/5 estrellas",
    commissionRate: String(DEFAULT_COMMISSION_RATE),
    cofinancingRate: String(DEFAULT_COFINANCING_RATE),
  };
}

function createDraftFromProduct(product: Product): ProductDraft {
  return {
    name: product.name,
    sku: product.sku,
    description: product.description ?? "",
    price: String(product.price),
    cost: product.cost ? String(product.cost) : "",
    normalPrice: product.normalPrice ? String(product.normalPrice) : String(product.price || ""),
    offerPrice1: product.offerPrice1 ? String(product.offerPrice1) : "",
    offerPrice2: product.offerPrice2 ? String(product.offerPrice2) : "",
    stock: String(product.stock),
    discount: product.discount ? String(product.discount) : "",
    category: product.category,
    image: product.image ?? "",
    measurements: product.measurements ?? "",
    weight: product.weight ?? "",
    logisticsTier: normalizeLogisticsTier(product.logisticsTier),
    pricingProfile: normalizePricingProfile(product.pricingProfile),
    commissionRate: String(product.commissionRate ?? DEFAULT_COMMISSION_RATE),
    cofinancingRate: String(product.cofinancingRate ?? getDefaultCofinancingRate(normalizePricingProfile(product.pricingProfile))),
  };
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

function getPricingProfileFromSheet(sheetName: string) {
  return sheetName.toLowerCase().includes("3 estrellas") ? "3 estrellas" : "4/5 estrellas";
}

function getCalculatorPriceValues(row: Record<string, unknown>) {
  const { normalPrice, offer1, offer2, salePrice, computedDiscount } = getPriceValues(row);
  const storePrice = toNumber(
    getValue(row, [
      "precio en tienda",
      "precio en tienda pvp",
      "pvp",
      "precio tienda",
      "precioentienda",
      "precioventa",
      "precio venta",
    ]),
    0,
  );

  return {
    normalPrice,
    offer1,
    offer2,
    salePrice: storePrice || salePrice,
    computedDiscount,
  };
}

function getCalculatorProducts(workbook: XLSX.WorkBook) {
  const byKey = new Map<string, ProductInput>();

  workbook.SheetNames.forEach((sheetName) => {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) return;

    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: "",
      raw: false,
    });
    const pricingProfile = getPricingProfileFromSheet(sheetName);
    const cofinancingRate = getDefaultCofinancingRate(pricingProfile);

    rows.forEach((row) => {
      const rawName = getValue(row, ["name", "nombre", "nombre producto", "producto", "titulo", "nombreproducto"]);
      const name = String(rawName ?? "").trim();
      if (!name) return;

      const key = normalizeKey(name);
      if (byKey.has(key)) return;

      const { normalPrice, offer1, offer2, salePrice, computedDiscount } = getCalculatorPriceValues(row);
      const cost = toNumber(getValue(row, ["cost", "costo", "coste", "costo proveedor"]), 0);

      const sku = String(getValue(row, ["sku", "codigo", "código", "referencia", "id"]) ?? "").trim();
      const productInput: ProductInput = {
        name,
        sku,
        price: salePrice,
        cost,
        normalPrice,
        offerPrice1: offer1,
        offerPrice2: offer2,
        discount: computedDiscount,
        pricingProfile,
        commissionRate: DEFAULT_COMMISSION_RATE,
        cofinancingRate,
      };

      byKey.set(key, productInput);

      const skuKey = normalizeKey(sku);
      if (skuKey && !byKey.has(skuKey)) {
        byKey.set(skuKey, productInput);
      }
    });
  });

  return byKey;
}

export default function Productos() {
  const [products, setProducts] = useState<Product[]>(loadProducts);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Todas");
  const [stockFilter, setStockFilter] = useState("Todos");
  const [offerFilter, setOfferFilter] = useState("Todos");
  const [sortBy, setSortBy] = useState<SortOption>("Recientes");
  const [view, setView] = useState<ViewMode>("cards");
  const [menuOpen, setMenuOpen] = useState(false);
  const [showOnlyNoImage, setShowOnlyNoImage] = useState(false);
  const [showVolumetricPanel, setShowVolumetricPanel] = useState(false);
  const [showLogisticsPanel, setShowLogisticsPanel] = useState(false);
  const [showProfitPanel, setShowProfitPanel] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [draft, setDraft] = useState<ProductDraft>(() => createEmptyDraft(1));

  const menuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pricingFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    document.title = "MOVI | Productos";
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    const fn = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  const categories = useMemo(() => {
    const unique = Array.from(new Set(products.map((product) => product.category)));
    return ["Todas", ...unique.sort()];
  }, [products]);

  const filteredProducts = useMemo(() => {
    let result = [...products];

    if (search.trim()) {
      const term = search.toLowerCase().trim();
      result = result.filter(
        (product) =>
          product.name.toLowerCase().includes(term) ||
          product.sku.toLowerCase().includes(term),
      );
    }

    if (category !== "Todas") {
      result = result.filter((product) => product.category === category);
    }

    if (stockFilter === "Con stock") {
      result = result.filter((product) => product.stock > 0);
    }

    if (stockFilter === "Sin stock") {
      result = result.filter((product) => product.stock === 0);
    }

    if (stockFilter === "Bajo stock") {
      result = result.filter((product) => product.stock > 0 && product.stock <= 5);
    }

    if (offerFilter === "Con oferta") {
      result = result.filter((product) => !!product.discount);
    }

    if (offerFilter === "Sin oferta") {
      result = result.filter((product) => !product.discount);
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

    if (showOnlyNoImage) {
      result.sort((a, b) => Number(a.hasImage) - Number(b.hasImage));
    }

    return result;
  }, [products, search, category, stockFilter, offerFilter, sortBy, showOnlyNoImage]);

  const metrics = useMemo(
    () => ({
      total: products.length,
      withStock: products.filter((product) => product.stock > 0).length,
      outOfStock: products.filter((product) => product.stock === 0).length,
      withoutImage: products.filter((product) => !product.hasImage).length,
      inventoryValue: products.reduce((total, product) => total + product.price * product.stock, 0),
    }),
    [products],
  );

  const alerts = useMemo(
    () => ({
      lowStock: products.filter((product) => product.stock > 0 && product.stock <= 5).length,
      noImage: products.filter((product) => !product.hasImage).length,
      offers: products.filter((product) => !!product.discount).length,
    }),
    [products],
  );

  const missingImageProducts = useMemo(
    () => filteredProducts.filter((product) => !product.hasImage),
    [filteredProducts],
  );

  const volumetricRows = useMemo(
    () =>
      filteredProducts.map((product) => ({
        product,
        info: getVolumetricInfo(product),
      })),
    [filteredProducts],
  );

  const volumetricMetrics = useMemo(() => {
    const rows = products.map((product) => getVolumetricInfo(product));

    return {
      needsData: rows.filter((info) => info.status === "complete-data").length,
      high: rows.filter((info) => info.status === "volumetric-high").length,
      billableTotal: rows.reduce((total, info) => total + (info.billableWeightKg ?? 0), 0),
    };
  }, [products]);

  const logisticsRows = useMemo(
    () =>
      filteredProducts.map((product) => ({
        product,
        info: getLogisticsCostInfo(product),
      })),
    [filteredProducts],
  );

  const logisticsMetrics = useMemo(() => {
    const rows = products.map((product) => ({
      product,
      info: getLogisticsCostInfo(product),
    }));

    return {
      pending: rows.filter(({ info }) => info.cost === undefined).length,
      totalCost: rows.reduce((total, { product, info }) => total + (info.cost ?? 0) * product.stock, 0),
      totalMargin: rows.reduce((total, { product, info }) => total + (info.margin ?? 0) * product.stock, 0),
    };
  }, [products]);

  const profitRows = useMemo(
    () =>
      filteredProducts.map((product) => ({
        product,
        info: getProfitInfo(product),
      })),
    [filteredProducts],
  );

  const profitMetrics = useMemo(() => {
    const rows = products.map((product) => ({
      product,
      info: getProfitInfo(product),
    }));

    return {
      missing: rows.filter(({ info }) => info.statusTone === "missing").length,
      low: rows.filter(({ info }) => info.statusTone === "warn").length,
      negative: rows.filter(({ info }) => info.statusTone === "bad").length,
      totalGrossProfit: rows.reduce((total, { product, info }) => total + info.grossProfit * product.stock, 0),
      totalNetProfit: rows.reduce((total, { product, info }) => total + info.netProfit * product.stock, 0),
    };
  }, [products]);

  const draftVolumetric = useMemo(
    () => getVolumetricInfo({ measurements: draft.measurements, weight: draft.weight, description: draft.description }),
    [draft.description, draft.measurements, draft.weight],
  );

  const draftLogistics = useMemo(
    () =>
      getLogisticsCostInfo({
        price: toNumber(draft.offerPrice2 || draft.offerPrice1 || draft.normalPrice || draft.price, 0),
        cost: toNumber(draft.cost, 0),
        description: draft.description,
        measurements: draft.measurements,
        weight: draft.weight,
        logisticsTier: draft.logisticsTier,
      }),
    [draft.cost, draft.description, draft.logisticsTier, draft.measurements, draft.normalPrice, draft.offerPrice1, draft.offerPrice2, draft.price, draft.weight],
  );

  const draftProfit = useMemo(
    () =>
      getProfitInfo({
        price: toNumber(draft.offerPrice2 || draft.offerPrice1 || draft.normalPrice || draft.price, 0),
        cost: toNumber(draft.cost, 0),
        description: draft.description,
        measurements: draft.measurements,
        weight: draft.weight,
        logisticsTier: draft.logisticsTier,
        pricingProfile: draft.pricingProfile,
        commissionRate: draft.commissionRate,
        cofinancingRate: draft.cofinancingRate,
      }),
    [
      draft.cofinancingRate,
      draft.commissionRate,
      draft.cost,
      draft.description,
      draft.logisticsTier,
      draft.measurements,
      draft.normalPrice,
      draft.offerPrice1,
      draft.offerPrice2,
      draft.price,
      draft.pricingProfile,
      draft.weight,
    ],
  );

  const hasActiveFilters = !!(
    search.trim() ||
    category !== "Todas" ||
    stockFilter !== "Todos" ||
    offerFilter !== "Todos" ||
    showOnlyNoImage ||
    showVolumetricPanel ||
    showLogisticsPanel ||
    showProfitPanel
  );

  function clearFilters() {
    setSearch("");
    setCategory("Todas");
    setStockFilter("Todos");
    setOfferFilter("Todos");
    setShowOnlyNoImage(false);
    setShowVolumetricPanel(false);
    setShowLogisticsPanel(false);
    setShowProfitPanel(false);
  }

  function openAddProduct() {
    const nextId = getNextId(products);
    setEditingProduct(null);
    setDraft(createEmptyDraft(nextId));
    setEditorOpen(true);
  }

  function openEditProduct(product: Product) {
    setEditingProduct(product);
    setDraft(createDraftFromProduct(product));
    setEditorOpen(true);
  }

  function closeEditor() {
    setEditorOpen(false);
    setEditingProduct(null);
  }

  function updateDraft<K extends keyof ProductDraft>(field: K, value: ProductDraft[K]) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function handleFillVolumetricFromDescription() {
    const measurements = extractMeasurementsFromText(draft.description);
    const weight = extractWeightFromText(draft.description);

    if (!measurements && !weight) {
      window.alert("No encontre medidas o peso en la descripcion.");
      return;
    }

    setDraft((current) => ({
      ...current,
      measurements: current.measurements || measurements,
      weight: current.weight || weight,
    }));
  }

  function handleSaveProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const name = draft.name.trim();
    const sku = draft.sku.trim();

    if (!name) {
      window.alert("Ingresa el nombre del producto.");
      return;
    }

    if (!sku) {
      window.alert("Ingresa el SKU del producto.");
      return;
    }

    const image = draft.image.trim();
    const id = editingProduct?.id ?? getNextId(products);
    const stock = Math.trunc(clampNumber(toNumber(draft.stock, 0), 0));
    const product: Product = normalizeProduct({
      id,
      name,
      sku,
      description: draft.description,
      price: draft.offerPrice2 || draft.offerPrice1 || draft.normalPrice || draft.price,
      cost: draft.cost,
      normalPrice: draft.normalPrice,
      offerPrice1: draft.offerPrice1,
      offerPrice2: draft.offerPrice2,
      stock,
      discount: draft.discount,
      category: draft.category.trim() || "General",
      image,
      hasImage: image.length > 0,
      measurements: draft.measurements,
      weight: draft.weight,
      logisticsTier: draft.logisticsTier,
      pricingProfile: draft.pricingProfile,
      commissionRate: draft.commissionRate,
      cofinancingRate: draft.cofinancingRate,
    });

    setProducts((current) =>
      editingProduct
        ? current.map((item) => (item.id === editingProduct.id ? product : item))
        : [product, ...current],
    );
    closeEditor();
  }

  function handleDraftImageFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 1_500_000) {
      window.alert("Usa una imagen menor a 1.5 MB para guardarla localmente en el navegador.");
      event.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = (readerEvent) => {
      const result = readerEvent.target?.result;
      if (typeof result === "string") {
        updateDraft("image", result);
      }
    };
    reader.readAsDataURL(file);
  }

  function handleDelete(id: number) {
    const product = products.find((item) => item.id === id);
    const label = product ? `"${product.name}"` : "este producto";

    if (!window.confirm(`¿Eliminar ${label}? Esta acción no se puede deshacer.`)) {
      return;
    }

    setProducts((current) => current.filter((item) => item.id !== id));
  }

  function handleDuplicate(product: Product) {
    const id = getNextId(products);
    const duplicated = normalizeProduct({
      ...product,
      id,
      name: `${product.name} (copia)`,
      sku: `${product.sku}-COPY`,
    });

    setProducts((current) => [duplicated, ...current]);
  }

  function handleImportClick() {
    if (isImporting) return;
    fileInputRef.current?.click();
  }

  function handlePricingImportClick() {
    if (isImporting) return;
    setMenuOpen(false);
    pricingFileInputRef.current?.click();
  }

  function handleFileImport(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);

    const reader = new FileReader();

    reader.onload = (readerEvent) => {
      try {
        const data = readerEvent.target?.result;
        if (!data) {
          throw new Error("No se pudo leer el archivo.");
        }

        const workbook = XLSX.read(data, {
          type: "array",
          cellDates: true,
        });

        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];

        if (!sheet) {
          throw new Error("La hoja del archivo no es válida.");
        }

        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
          defval: "",
          raw: false,
        });

        if (!rows.length) {
          window.alert("El archivo no contiene filas válidas para importar.");
          return;
        }

        const usedIds = new Set<number>();
        const importedProducts = rows
          .map((row, index) => {
            const rawName = getValue(row, ["name", "nombre", "producto", "titulo", "nombreproducto"]);
            const name = String(rawName ?? "").trim();
            if (!name) return null;

            const id = getUniqueId(
              Math.trunc(toNumber(getValue(row, ["id", "codigo", "codigointerno", "iddelarticulo"]), Date.now() + index)),
              usedIds,
            );
            const image = getImageValue(row);
            const { normalPrice, offer1, offer2, salePrice, computedDiscount } = getPriceValues(row);
            const discountRaw = getValue(row, [
              "discount",
              "descuento",
              "descuento%",
              "descuento %",
              "porcentajedescuento",
              "porcentaje descuento",
            ]);

            return normalizeProduct({
              id,
              name,
              sku: String(
                getValue(row, ["sku", "codigosku", "codigo", "referencia", "iddelarticulo"]) ?? `SKU-${id}`,
              ).trim(),
              description: getValue(row, ["description", "descripcion", "descripción", "detalle"]),
              price: salePrice,
              cost: getValue(row, ["cost", "costo", "coste"]),
              normalPrice,
              offerPrice1: offer1,
              offerPrice2: offer2,
              stock: getValue(row, ["stock", "inventario", "cantidad", "unidades"]),
              category: String(getValue(row, ["category", "categoria", "rubro"]) ?? "General").trim(),
              discount: discountRaw || computedDiscount,
              hasImage: image.length > 0 ? true : toBoolean(getValue(row, ["hasImage", "has_image", "conimagen"])),
              image,
              measurements: getValue(row, ["measurements", "medidas", "dimension", "dimensiones", "tamano", "tamaño"]),
              weight: getValue(row, ["weight", "peso", "kg"]),
              logisticsTier: getValue(row, [
                "cofinanciamiento",
                "cofinanciamientologistico",
                "cofinanciamiento logistico",
                "nivel",
                "nivel logistico",
                "talla",
                "rating",
              ]),
              pricingProfile: getValue(row, ["perfil", "perfil precio", "estrellas", "tipo precio"]),
              commissionRate: getValue(row, ["comision", "comision%", "comision promedio", "commission"]),
              cofinancingRate: getValue(row, [
                "cofinanciamiento comercial",
                "cofinanciamiento%",
                "cofinanciamiento promedio",
                "cofinancing",
              ]),
            }, index);
          })
          .filter(Boolean) as Product[];

        if (!importedProducts.length) {
          window.alert("No se encontraron productos válidos en el archivo.");
          return;
        }

        const shouldReplace =
          products.length === 0 ||
          window.confirm(
            "¿Quieres reemplazar el inventario actual? Aceptar reemplaza todo; Cancelar suma los productos importados.",
          );

        setProducts((current) => {
          if (shouldReplace) return importedProducts;

          const currentIds = new Set(current.map((product) => product.id));
          const importedWithUniqueIds = importedProducts.map((product) => ({
            ...product,
            id: getUniqueId(product.id, currentIds),
          }));

          return [...importedWithUniqueIds, ...current];
        });

        window.alert(`Se importaron ${importedProducts.length} productos correctamente.`);
      } catch (error) {
        console.error(error);
        window.alert("No se pudo importar el archivo. Usa un Excel simple o CSV con columnas válidas.");
      } finally {
        setIsImporting(false);
        event.target.value = "";
      }
    };

    reader.onerror = () => {
      setIsImporting(false);
      event.target.value = "";
      window.alert("Error al leer el archivo.");
    };

    reader.readAsArrayBuffer(file);
  }

  function handlePricingFileImport(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);

    const reader = new FileReader();

    reader.onload = (readerEvent) => {
      try {
        const data = readerEvent.target?.result;
        if (!data) throw new Error("No se pudo leer el archivo.");

        const workbook = XLSX.read(data, {
          type: "array",
          cellDates: true,
        });
        const calculatorProducts = getCalculatorProducts(workbook);

        if (!calculatorProducts.size) {
          window.alert("No encontré productos válidos en la calculadora.");
          return;
        }

        let matched = 0;
        let added = 0;
        const shouldAddMissing = window.confirm(
          "¿Agregar también productos nuevos que estén en la calculadora pero no en MOVI?",
        );

        setProducts((current) => {
          const usedIds = new Set(current.map((product) => product.id));
          const usedKeys = new Set<string>();
          const matchedInputs = new Set<ProductInput>();
          const bySku = new Map(
            current
              .filter((product) => product.sku.trim())
              .map((product) => [normalizeKey(product.sku), product]),
          );

          const updated = current.map((product) => {
            const byNameKey = normalizeKey(product.name);
            const bySkuKey = normalizeKey(product.sku);
            const imported = calculatorProducts.get(byNameKey) ?? calculatorProducts.get(bySkuKey);

            if (!imported) return product;

            matched += 1;
            matchedInputs.add(imported);
            usedKeys.add(byNameKey);
            usedKeys.add(bySkuKey);

            const normalPrice = toNumber(imported.normalPrice, product.normalPrice ?? product.price);
            const offerPrice1 = toNumber(imported.offerPrice1, product.offerPrice1 ?? 0);
            const offerPrice2 = toNumber(imported.offerPrice2, product.offerPrice2 ?? 0);
            const price = toNumber(imported.price, product.price);

            return normalizeProduct({
              ...product,
              price: price || product.price,
              cost: toNumber(imported.cost, product.cost ?? 0) || product.cost,
              normalPrice: normalPrice || product.normalPrice,
              offerPrice1: offerPrice1 || product.offerPrice1,
              offerPrice2: offerPrice2 || product.offerPrice2,
              discount: imported.discount || product.discount,
              pricingProfile: imported.pricingProfile ?? product.pricingProfile,
              commissionRate: imported.commissionRate ?? product.commissionRate,
              cofinancingRate: imported.cofinancingRate ?? product.cofinancingRate,
            });
          });

          if (!shouldAddMissing) return updated;

          const additions: Product[] = [];
          const addedInputs = new Set<ProductInput>();

          calculatorProducts.forEach((imported, key) => {
            if (matchedInputs.has(imported)) return;
            if (addedInputs.has(imported)) return;

            const sku = String(imported.sku ?? "").trim();
            const skuKey = normalizeKey(sku);
            const alreadyExists = usedKeys.has(key) || (skuKey && bySku.has(skuKey));

            if (alreadyExists) return;

            const id = getUniqueId(Date.now() + additions.length, usedIds);
            added += 1;
            addedInputs.add(imported);
            additions.push(
              normalizeProduct({
                ...imported,
                id,
                sku: sku || `CALC-${id}`,
                stock: 0,
                category: "Calculadora",
                image: "",
                hasImage: false,
              }),
            );
          });

          return [...additions, ...updated];
        });

        window.alert(
          `Calculadora importada. Actualizados: ${matched}. Productos nuevos: ${added}.`,
        );
      } catch (error) {
        console.error(error);
        window.alert("No se pudo importar la calculadora. Revisa que sea el Excel correcto.");
      } finally {
        setIsImporting(false);
        event.target.value = "";
      }
    };

    reader.onerror = () => {
      setIsImporting(false);
      event.target.value = "";
      window.alert("Error al leer la calculadora.");
    };

    reader.readAsArrayBuffer(file);
  }

  function handleExportInventory() {
    const source = filteredProducts.length ? filteredProducts : products;
    const rows = source.map((product) => ({
      id: product.id,
      nombre: product.name,
      sku: product.sku,
      descripcion: product.description ?? "",
      costo: product.cost ?? "",
      precio_normal: product.normalPrice ?? product.price,
      precio_oferta_1: product.offerPrice1 ?? "",
      precio_oferta_2: product.offerPrice2 ?? "",
      precio: product.price,
      stock: product.stock,
      estado: product.status,
      categoria: product.category,
      descuento: product.discount ?? "",
      medidas: product.measurements ?? "",
      peso: product.weight ?? "",
      peso_real_kg: getVolumetricInfo(product).realWeightKg ?? "",
      peso_volumetrico_kg: getVolumetricInfo(product).volumetricWeightKg ?? "",
      peso_cobrable_kg: getVolumetricInfo(product).billableWeightKg ?? "",
      estado_volumetrico: getVolumetricInfo(product).statusLabel,
      cofinanciamiento_logistico: getLogisticsCostInfo(product).tier,
      tramo_logistico: getLogisticsCostInfo(product).weightRange ?? "",
      costo_logistico: getLogisticsCostInfo(product).cost ?? "",
      costo_total_estimado: getLogisticsCostInfo(product).totalCost ?? "",
      margen_estimado: getLogisticsCostInfo(product).margin ?? "",
      perfil_precio: getProfitInfo(product).profile,
      comision_pct: getProfitInfo(product).commissionRate,
      cofinanciamiento_pct: getProfitInfo(product).cofinancingRate,
      comision_monto: getProfitInfo(product).commission,
      cofinanciamiento_monto: getProfitInfo(product).cofinancing,
      utilidad_bruta: getProfitInfo(product).grossProfit,
      margen_bruto_pct: getProfitInfo(product).grossMargin,
      utilidad_neta_estimada: getProfitInfo(product).netProfit,
      margen_neto_pct: getProfitInfo(product).netMargin,
      precio_minimo_recomendado: getProfitInfo(product).minimumPrice,
      precio_margen_medio: getProfitInfo(product).mediumMarginPrice,
      precio_cmr_envio_gratis: getProfitInfo(product).cmrOrFreeShippingPrice,
      precio_temporada_baja: getProfitInfo(product).lowSeasonPrice,
      precio_temporada_alta: getProfitInfo(product).highSeasonPrice,
      valor_inventario: product.price * product.stock,
      tiene_imagen: product.hasImage ? "sí" : "no",
      imagen: product.image ?? "",
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Productos");
    XLSX.writeFile(workbook, "inventario-movi.xlsx");
    setMenuOpen(false);
  }

  function handleGenerateReport() {
    const lowStockProducts = products.filter((product) => product.stock > 0 && product.stock <= 5);
    const outOfStockProducts = products.filter((product) => product.stock === 0);
    const withoutImageProducts = products.filter((product) => !product.hasImage);
    const volumetricProducts = products.map((product) => ({
      product,
      info: getVolumetricInfo(product),
    }));
    const volumetricPending = volumetricProducts.filter(({ info }) => info.status === "complete-data");
    const volumetricHigh = volumetricProducts.filter(({ info }) => info.status === "volumetric-high");
    const logisticsProducts = products.map((product) => ({
      product,
      info: getLogisticsCostInfo(product),
    }));
    const logisticsPending = logisticsProducts.filter(({ info }) => info.cost === undefined);
    const profitProducts = products.map((product) => ({
      product,
      info: getProfitInfo(product),
    }));
    const profitRisk = profitProducts.filter(({ info }) => ["bad", "warn", "missing"].includes(info.statusTone));

    const report = [
      "REPORTE MOVI",
      "",
      `Total productos: ${products.length}`,
      `Valor inventario: ${formatCLP(metrics.inventoryValue)}`,
      `Con stock: ${metrics.withStock}`,
      `Sin stock: ${metrics.outOfStock}`,
      `Stock bajo: ${lowStockProducts.length}`,
      `Sin imagen: ${withoutImageProducts.length}`,
      `Volumetría pendiente: ${volumetricPending.length}`,
      `Volumétrico alto: ${volumetricHigh.length}`,
      `Logistica pendiente: ${logisticsPending.length}`,
      `Costo logistico total: ${formatCLP(logisticsMetrics.totalCost)}`,
      `Margen estimado total: ${formatCLP(logisticsMetrics.totalMargin)}`,
      `Utilidad bruta total: ${formatCLP(profitMetrics.totalGrossProfit)}`,
      `Utilidad neta estimada total: ${formatCLP(profitMetrics.totalNetProfit)}`,
      `Productos con riesgo de margen: ${profitRisk.length}`,
      `Con oferta: ${alerts.offers}`,
      "",
      "Productos sin stock:",
      ...outOfStockProducts.map((product) => `- ${product.sku} | ${product.name}`),
      "",
      "Productos con stock bajo:",
      ...lowStockProducts.map((product) => `- ${product.sku} | ${product.name} | ${product.stock} uds`),
      "",
      "Productos sin imagen:",
      ...withoutImageProducts.map((product) => `- ${product.sku} | ${product.name}`),
      "",
      "Productos con volumétrico alto:",
      ...volumetricHigh.map(
        ({ product, info }) =>
          `- ${product.sku} | ${product.name} | cobrable ${formatKg(info.billableWeightKg)} | vol ${formatKg(
            info.volumetricWeightKg,
          )} | real ${formatKg(info.realWeightKg)}`,
      ),
      "",
      "Productos con volumetría pendiente:",
      ...volumetricPending.map(({ product, info }) => `- ${product.sku} | ${product.name} | falta ${info.missing.join(" y ")}`),
      "",
      "Costos logisticos estimados:",
      ...logisticsProducts.map(
        ({ product, info }) =>
          `- ${product.sku} | ${product.name} | ${info.tier} | ${info.weightRange ?? "sin tramo"} | logistica ${
            info.cost !== undefined ? formatCLP(info.cost) : "sin calcular"
          } | margen ${info.margin !== undefined ? formatCLP(info.margin) : "sin calcular"}`,
      ),
      "",
      "Rentabilidad:",
      ...profitProducts.map(
        ({ product, info }) =>
          `- ${product.sku} | ${product.name} | ${info.statusLabel} | utilidad ${formatCLP(
            info.grossProfit,
          )} | margen ${formatPercent(info.grossMargin)} | minimo ${formatCLP(info.minimumPrice)}`,
      ),
    ].join("\n");

    downloadBlob(new Blob([report], { type: "text/plain;charset=utf-8" }), "reporte-movi.txt");
    setMenuOpen(false);
  }

  function handleViewWithoutImage() {
    setShowOnlyNoImage((current) => !current);
    setMenuOpen(false);
  }

  function handleViewVolumetricPanel() {
    setShowVolumetricPanel((current) => !current);
    setMenuOpen(false);
  }

  function handleViewLogisticsPanel() {
    setShowLogisticsPanel((current) => !current);
    setMenuOpen(false);
  }

  async function handleImportFromMocha() {
    setMenuOpen(false);
    setIsImporting(true);

    try {
      const response = await fetch("/mocha-api/products");
      if (!response.ok) {
        throw new Error("No se pudo leer la app anterior.");
      }

      const data = (await response.json()) as { products?: MochaProduct[] };
      const mochaProducts = (data.products ?? []).map(mapMochaProduct);

      if (!mochaProducts.length) {
        window.alert("No se encontraron productos en la app anterior.");
        return;
      }

      const shouldReplace =
        products.length === 0 ||
        window.confirm(
          "¿Reemplazar el inventario actual con los datos de Mocha? Aceptar reemplaza todo; Cancelar completa imágenes y productos faltantes.",
        );

      if (shouldReplace) {
        setProducts(mochaProducts);
      } else {
        setProducts((current) => {
          const mochaBySku = new Map(mochaProducts.map((product) => [product.sku, product]));
          const currentSkus = new Set(current.map((product) => product.sku));

          const updated = current.map((product) => {
            const mochaProduct = mochaBySku.get(product.sku) ?? mochaBySku.get(String(product.id));
            if (!mochaProduct) return product;

            const image = mochaProduct.image || product.image;
            return normalizeProduct({
              ...product,
              price: mochaProduct.price || product.price,
              cost: mochaProduct.cost ?? product.cost,
              normalPrice: mochaProduct.normalPrice ?? product.normalPrice,
              offerPrice1: mochaProduct.offerPrice1 ?? product.offerPrice1,
              offerPrice2: mochaProduct.offerPrice2 ?? product.offerPrice2,
              description: mochaProduct.description || product.description,
              discount: mochaProduct.discount ?? product.discount,
              image,
              hasImage: image.length > 0,
              measurements: mochaProduct.measurements || product.measurements,
              weight: mochaProduct.weight || product.weight,
            });
          });

          const additions = mochaProducts.filter((product) => !currentSkus.has(product.sku));
          return [...updated, ...additions];
        });
      }

      window.alert(`Se importaron ${mochaProducts.length} productos desde Mocha.`);
    } catch (error) {
      console.error(error);
      window.alert("No se pudo conectar con la app anterior de Mocha. Revisa tu conexión e inténtalo otra vez.");
    } finally {
      setIsImporting(false);
    }
  }

  function handleRestoreDemo() {
    if (!window.confirm("¿Restaurar los productos de demo? Esto reemplazará el inventario actual.")) {
      return;
    }

    setProducts(PRODUCTS_MOCK.map((product, index) => normalizeProduct(product, index)));
    setMenuOpen(false);
  }

  function handleClearAll() {
    if (!window.confirm("¿Borrar todo el inventario guardado en este navegador?")) {
      return;
    }

    setProducts([]);
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
      <input
        ref={pricingFileInputRef}
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        onChange={handlePricingFileImport}
      />

      <div className="rounded-[28px] border border-violet-400 bg-white px-6 py-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-violet-600 text-white shadow-lg shadow-violet-300/40">
              <Package className="h-7 w-7" />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-[22px] font-black tracking-tight text-slate-950">MOVI</h1>

                <span className="inline-flex items-center rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-violet-700">
                  Inventario inteligente
                </span>
              </div>

              <p className="mt-1 text-[14px] text-slate-500">
                Gestiona productos, stock y ofertas en un solo lugar.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={openAddProduct}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-violet-600 px-5 text-[14px] font-bold text-white shadow-sm shadow-violet-300/40 transition hover:bg-violet-700"
            >
              <Plus className="h-4 w-4" />
              Agregar producto
            </button>

            <button
              onClick={handleImportClick}
              disabled={isImporting}
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-[14px] font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Upload className="h-4 w-4" />
              {isImporting ? "Importando..." : "Importar Excel"}
            </button>

            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen((current) => !current)}
                aria-label="Abrir menú de acciones"
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
                    { icon: Download, label: "Exportar inventario", action: handleExportInventory },
                    { icon: Calculator, label: "Importar calculadora precios", action: handlePricingImportClick },
                    { icon: RefreshCw, label: "Importar desde Mocha", action: handleImportFromMocha },
                    {
                      icon: ImageIcon,
                      label: showOnlyNoImage ? "Ocultar listado sin imagen" : "Listado sin imagen",
                      action: handleViewWithoutImage,
                    },
                    {
                      icon: Scale,
                      label: showVolumetricPanel ? "Ocultar estado volumétrico" : "Estado volumétrico",
                      action: handleViewVolumetricPanel,
                    },
                    {
                      icon: Truck,
                      label: showLogisticsPanel ? "Ocultar costo logístico" : "Costo logístico",
                      action: handleViewLogisticsPanel,
                    },
                    {
                      icon: TrendingUp,
                      label: showProfitPanel ? "Ocultar rentabilidad" : "Rentabilidad",
                      action: () => {
                        setShowProfitPanel((current) => !current);
                        setMenuOpen(false);
                      },
                    },
                    { icon: FileText, label: "Generar reporte", action: handleGenerateReport },
                    { icon: RotateCcw, label: "Restaurar demo", action: handleRestoreDemo },
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
                    onClick={handleClearAll}
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
          <button
            onClick={() => setStockFilter("Bajo stock")}
            className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-[12px] font-semibold text-amber-700 transition-colors hover:bg-amber-100"
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            {alerts.lowStock} {alerts.lowStock === 1 ? "producto con stock bajo" : "productos con stock bajo"}
          </button>
        )}

        {alerts.noImage > 0 && (
          <button
            onClick={() => setShowOnlyNoImage(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-sky-200 bg-sky-50 px-3 py-1.5 text-[12px] font-semibold text-sky-700 transition-colors hover:bg-sky-100"
          >
            <ImageIcon className="h-3.5 w-3.5" />
            {alerts.noImage} {alerts.noImage === 1 ? "producto sin imagen" : "productos sin imagen"}
          </button>
        )}

        {(volumetricMetrics.needsData > 0 || volumetricMetrics.high > 0) && (
          <button
            onClick={() => setShowVolumetricPanel(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-3 py-1.5 text-[12px] font-semibold text-violet-700 transition-colors hover:bg-violet-100"
          >
            <Scale className="h-3.5 w-3.5" />
            {volumetricMetrics.needsData > 0
              ? `${volumetricMetrics.needsData} sin datos volumétricos`
              : `${volumetricMetrics.high} con volumétrico alto`}
          </button>
        )}

        <button
          onClick={() => setShowLogisticsPanel(true)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[12px] font-semibold text-emerald-700 transition-colors hover:bg-emerald-100"
        >
          <Truck className="h-3.5 w-3.5" />
          Logística estimada: {formatCLP(logisticsMetrics.totalCost)}
        </button>

        <button
          onClick={() => setShowProfitPanel(true)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-[12px] font-semibold text-indigo-700 transition-colors hover:bg-indigo-100"
        >
          <TrendingUp className="h-3.5 w-3.5" />
          Utilidad: {formatCLP(profitMetrics.totalGrossProfit)}
        </button>

        {(profitMetrics.negative > 0 || profitMetrics.low > 0 || profitMetrics.missing > 0) && (
          <button
            onClick={() => setShowProfitPanel(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-[12px] font-semibold text-rose-600 transition-colors hover:bg-rose-100"
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            {profitMetrics.negative + profitMetrics.low + profitMetrics.missing} con margen por revisar
          </button>
        )}

        {alerts.offers > 0 && (
          <button
            onClick={() => setOfferFilter("Con oferta")}
            className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-[12px] font-semibold text-rose-600 transition-colors hover:bg-rose-100"
          >
            <Sparkles className="h-3.5 w-3.5" />
            {alerts.offers} {alerts.offers === 1 ? "producto con oferta activa" : "productos con oferta activa"}
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

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-1 pt-3">
          <p className="text-[13px] text-slate-500">
            Mostrando <span className="font-bold text-slate-700">{filteredProducts.length}</span> de{" "}
            <span className="font-bold text-slate-700">{products.length}</span> productos
          </p>

          {showOnlyNoImage && (
            <p className="rounded-full bg-sky-50 px-3 py-1 text-[12px] font-semibold text-sky-700 ring-1 ring-sky-200">
              Listado sin imagen activo, inventario completo abajo
            </p>
          )}

          {showVolumetricPanel && (
            <p className="rounded-full bg-violet-50 px-3 py-1 text-[12px] font-semibold text-violet-700 ring-1 ring-violet-200">
              Estado volumétrico activo, factor {VOLUMETRIC_FACTOR}
            </p>
          )}

          {showLogisticsPanel && (
            <p className="rounded-full bg-emerald-50 px-3 py-1 text-[12px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
              Costo logístico activo, corte {formatCLP(LOGISTICS_PRICE_LIMIT)}
            </p>
          )}

          {showProfitPanel && (
            <p className="rounded-full bg-indigo-50 px-3 py-1 text-[12px] font-semibold text-indigo-700 ring-1 ring-indigo-200">
              Rentabilidad activa, comisión {DEFAULT_COMMISSION_RATE}%
            </p>
          )}

          <p className="text-[13px] font-semibold text-slate-600">
            Valor inventario: <span className="text-slate-950">{formatCLP(metrics.inventoryValue)}</span>
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

      {showVolumetricPanel && volumetricRows.length > 0 && (
        <section className="mt-5 overflow-hidden rounded-[22px] border border-violet-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-violet-100 bg-violet-50/70 px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
                <Scale className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-[15px] font-black text-slate-900">Estado volumétrico</h2>
                <p className="text-[12px] text-slate-500">
                  Cálculo con medidas en cm: largo x ancho x alto / {VOLUMETRIC_FACTOR}.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-white px-3 py-1 text-[12px] font-bold text-slate-700 ring-1 ring-violet-100">
                {volumetricMetrics.needsData} pendientes
              </span>
              <span className="rounded-full bg-white px-3 py-1 text-[12px] font-bold text-amber-700 ring-1 ring-amber-100">
                {volumetricMetrics.high} alto volumen
              </span>
              <span className="rounded-full bg-white px-3 py-1 text-[12px] font-bold text-violet-700 ring-1 ring-violet-100">
                Total cobrable {formatKg(volumetricMetrics.billableTotal)}
              </span>
              <button
                onClick={() => setShowVolumetricPanel(false)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-violet-200 bg-white px-3 py-1.5 text-[12px] font-semibold text-violet-700 transition-colors hover:bg-violet-50"
              >
                <X className="h-3.5 w-3.5" />
                Cerrar
              </button>
            </div>
          </div>

          <div className="max-h-[460px] overflow-y-auto divide-y divide-slate-100">
            {volumetricRows.map(({ product, info }) => (
              <div
                key={product.id}
                className="grid grid-cols-1 gap-3 px-4 py-3 transition-colors hover:bg-slate-50 lg:grid-cols-[minmax(0,1fr)_132px_118px_118px_132px_138px] lg:items-center"
              >
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-bold text-slate-900">{product.name}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                    <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-slate-600">
                      SKU {product.sku}
                    </span>
                    <span>#{product.id}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 lg:block">
                  <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400 lg:block">
                    Medidas
                  </span>
                  <span className="text-[12px] font-bold text-slate-700">
                    {product.measurements || "Sin medidas"}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2 lg:block">
                  <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400 lg:block">
                    Peso real
                  </span>
                  <span className="text-[12px] font-black text-slate-900">{formatKg(info.realWeightKg)}</span>
                </div>

                <div className="flex items-center justify-between gap-2 lg:block">
                  <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400 lg:block">
                    Volumétrico
                  </span>
                  <span className="text-[12px] font-black text-slate-900">{formatKg(info.volumetricWeightKg)}</span>
                </div>

                <div className="flex items-center justify-between gap-2 lg:block">
                  <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400 lg:block">
                    Cobrable
                  </span>
                  <span
                    className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold ${getVolumetricBadgeClass(
                      info.status,
                    )}`}
                  >
                    {info.statusLabel}
                  </span>
                  <p className="mt-1 text-[12px] font-black text-slate-900">{formatKg(info.billableWeightKg)}</p>
                </div>

                <button
                  onClick={() => openEditProduct(product)}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 text-[12.5px] font-bold text-white shadow-sm shadow-violet-300/30 transition-colors hover:bg-violet-700"
                >
                  <FilePenLine className="h-4 w-4" />
                  Editar datos
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {showLogisticsPanel && logisticsRows.length > 0 && (
        <section className="mt-5 overflow-hidden rounded-[22px] border border-emerald-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-emerald-100 bg-emerald-50/70 px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                <Truck className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-[15px] font-black text-slate-900">Costo logístico</h2>
                <p className="text-[12px] text-slate-500">
                  Cruza precio, peso cobrable y cofinanciamiento 5/5, 4/5, 3/5 o 2/5.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-white px-3 py-1 text-[12px] font-bold text-emerald-700 ring-1 ring-emerald-100">
                Logística {formatCLP(logisticsMetrics.totalCost)}
              </span>
              <span
                className={`rounded-full bg-white px-3 py-1 text-[12px] font-bold ring-1 ${
                  logisticsMetrics.totalMargin >= 0
                    ? "text-slate-700 ring-emerald-100"
                    : "text-rose-700 ring-rose-100"
                }`}
              >
                Margen {formatCLP(logisticsMetrics.totalMargin)}
              </span>
              {logisticsMetrics.pending > 0 && (
                <span className="rounded-full bg-white px-3 py-1 text-[12px] font-bold text-amber-700 ring-1 ring-amber-100">
                  {logisticsMetrics.pending} pendientes
                </span>
              )}
              <button
                onClick={() => setShowLogisticsPanel(false)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-white px-3 py-1.5 text-[12px] font-semibold text-emerald-700 transition-colors hover:bg-emerald-50"
              >
                <X className="h-3.5 w-3.5" />
                Cerrar
              </button>
            </div>
          </div>

          <div className="max-h-[460px] overflow-y-auto divide-y divide-slate-100">
            {logisticsRows.map(({ product, info }) => (
              <div
                key={product.id}
                className="grid grid-cols-1 gap-3 px-4 py-3 transition-colors hover:bg-slate-50 xl:grid-cols-[minmax(0,1fr)_102px_122px_116px_116px_118px_138px] xl:items-center"
              >
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-bold text-slate-900">{product.name}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                    <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-slate-600">
                      SKU {product.sku}
                    </span>
                    <span>Precio {formatCLP(product.price)}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 xl:block">
                  <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400 xl:block">
                    Nivel
                  </span>
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-black text-emerald-700 ring-1 ring-emerald-100">
                    {info.tier}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2 xl:block">
                  <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400 xl:block">
                    Tramo
                  </span>
                  <span className="text-[12px] font-bold text-slate-700">{info.weightRange ?? "Sin datos"}</span>
                </div>

                <div className="flex items-center justify-between gap-2 xl:block">
                  <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400 xl:block">
                    Cobrable
                  </span>
                  <span className="text-[12px] font-black text-slate-900">{formatKg(info.billableWeightKg)}</span>
                </div>

                <div className="flex items-center justify-between gap-2 xl:block">
                  <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400 xl:block">
                    Logística
                  </span>
                  <span className="text-[12px] font-black text-slate-900">
                    {info.cost !== undefined ? formatCLP(info.cost) : "Sin calcular"}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2 xl:block">
                  <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400 xl:block">
                    Margen
                  </span>
                  <span
                    className={`text-[12px] font-black ${
                      (info.margin ?? 0) < 0 ? "text-rose-600" : "text-slate-900"
                    }`}
                  >
                    {info.margin !== undefined ? formatCLP(info.margin) : "Sin calcular"}
                  </span>
                </div>

                <button
                  onClick={() => openEditProduct(product)}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-[12.5px] font-bold text-white shadow-sm shadow-emerald-300/30 transition-colors hover:bg-emerald-700"
                >
                  <FilePenLine className="h-4 w-4" />
                  Editar nivel
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {showProfitPanel && profitRows.length > 0 && (
        <section className="mt-5 overflow-hidden rounded-[22px] border border-indigo-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-indigo-100 bg-indigo-50/70 px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-[15px] font-black text-slate-900">Rentabilidad por producto</h2>
                <p className="text-[12px] text-slate-500">
                  Calcula costo, comisión, cofinanciamiento, logística, utilidad y precio recomendado.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-white px-3 py-1 text-[12px] font-bold text-indigo-700 ring-1 ring-indigo-100">
                Bruta {formatCLP(profitMetrics.totalGrossProfit)}
              </span>
              <span className="rounded-full bg-white px-3 py-1 text-[12px] font-bold text-slate-700 ring-1 ring-indigo-100">
                Neta est. {formatCLP(profitMetrics.totalNetProfit)}
              </span>
              <button
                onClick={() => setShowProfitPanel(false)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-white px-3 py-1.5 text-[12px] font-semibold text-indigo-700 transition-colors hover:bg-indigo-50"
              >
                <X className="h-3.5 w-3.5" />
                Cerrar
              </button>
            </div>
          </div>

          <div className="max-h-[500px] overflow-y-auto divide-y divide-slate-100">
            {profitRows.map(({ product, info }) => (
              <div
                key={product.id}
                className="grid grid-cols-1 gap-3 px-4 py-3 transition-colors hover:bg-slate-50 xl:grid-cols-[minmax(0,1fr)_112px_112px_112px_118px_128px_128px_138px] xl:items-center"
              >
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-bold text-slate-900">{product.name}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                    <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-slate-600">
                      SKU {product.sku}
                    </span>
                    <span>{info.profile}</span>
                    <span>{info.commissionRate}% + {info.cofinancingRate}%</span>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 xl:block">
                  <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400 xl:block">
                    Precio
                  </span>
                  <span className="text-[12px] font-black text-slate-900">{formatCLP(product.price)}</span>
                </div>

                <div className="flex items-center justify-between gap-2 xl:block">
                  <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400 xl:block">
                    Costos
                  </span>
                  <span className="text-[12px] font-black text-slate-900">{formatCLP(info.totalCost)}</span>
                </div>

                <div className="flex items-center justify-between gap-2 xl:block">
                  <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400 xl:block">
                    Utilidad
                  </span>
                  <span className={`text-[12px] font-black ${info.grossProfit < 0 ? "text-rose-600" : "text-slate-900"}`}>
                    {formatCLP(info.grossProfit)}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2 xl:block">
                  <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400 xl:block">
                    Margen
                  </span>
                  <span
                    className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold ${getProfitBadgeClass(
                      info.statusTone,
                    )}`}
                  >
                    {info.statusLabel}
                  </span>
                  <p className="mt-1 text-[12px] font-black text-slate-900">{formatPercent(info.grossMargin)}</p>
                </div>

                <div className="flex items-center justify-between gap-2 xl:block">
                  <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400 xl:block">
                    Mínimo
                  </span>
                  <span className="text-[12px] font-black text-slate-900">{formatCLP(info.minimumPrice)}</span>
                </div>

                <div className="flex items-center justify-between gap-2 xl:block">
                  <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400 xl:block">
                    Campaña
                  </span>
                  <span className="text-[12px] font-black text-slate-900">{formatCLP(info.lowSeasonPrice)}</span>
                </div>

                <button
                  onClick={() => openEditProduct(product)}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-[12.5px] font-bold text-white shadow-sm shadow-indigo-300/30 transition-colors hover:bg-indigo-700"
                >
                  <FilePenLine className="h-4 w-4" />
                  Ajustar precio
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {showOnlyNoImage && missingImageProducts.length > 0 && (
        <section className="mt-5 overflow-hidden rounded-[22px] border border-sky-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-sky-100 bg-sky-50/70 px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
                <ImageIcon className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-[15px] font-black text-slate-900">Productos sin imagen</h2>
                <p className="text-[12px] text-slate-500">
                  {missingImageProducts.length} pendiente{missingImageProducts.length === 1 ? "" : "s"}.
                  Usa el buscador para ubicar por nombre o SKU.
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowOnlyNoImage(false)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-sky-200 bg-white px-3 py-1.5 text-[12px] font-semibold text-sky-700 transition-colors hover:bg-sky-50"
            >
              <X className="h-3.5 w-3.5" />
              Cerrar listado
            </button>
          </div>

          <div className="max-h-[420px] overflow-y-auto divide-y divide-slate-100">
            {missingImageProducts.map((product) => (
              <div
                key={product.id}
                className="grid grid-cols-1 gap-3 px-4 py-3 transition-colors hover:bg-slate-50 md:grid-cols-[minmax(0,1fr)_110px_95px_132px] md:items-center"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                    <ImageIcon className="h-5 w-5" />
                  </div>

                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-bold text-slate-900">{product.name}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-slate-600">
                        SKU {product.sku}
                      </span>
                      <span>#{product.id}</span>
                      <span>{product.category}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 md:block">
                  <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400 md:block">
                    Stock
                  </span>
                  <span
                    className={`text-[13px] font-black tabular-nums ${
                      product.stock === 0
                        ? "text-rose-600"
                        : product.stock <= 5
                          ? "text-amber-600"
                          : "text-slate-800"
                    }`}
                  >
                    {product.stock} uds
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2 md:block">
                  <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400 md:block">
                    Precio
                  </span>
                  <span className="text-[13px] font-black text-slate-900">{formatCLP(product.price)}</span>
                </div>

                <button
                  onClick={() => openEditProduct(product)}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 text-[12.5px] font-bold text-white shadow-sm shadow-violet-300/30 transition-colors hover:bg-violet-700"
                >
                  <FilePenLine className="h-4 w-4" />
                  Completar foto
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {filteredProducts.length === 0 && (
        <div className="mt-6 flex flex-col items-center rounded-2xl border border-dashed border-slate-300 bg-white py-14 text-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
            <Search className="h-5 w-5" />
          </div>

          <h3 className="mt-3 text-[14px] font-bold text-slate-800">Sin resultados</h3>

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
          {filteredProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onDelete={handleDelete}
              onEdit={openEditProduct}
              onDuplicate={handleDuplicate}
            />
          ))}
        </div>
      )}

      {view === "table" && filteredProducts.length > 0 && (
        <div className="mt-5">
          <ProductTable
            products={filteredProducts}
            onDelete={handleDelete}
            onEdit={openEditProduct}
            onDuplicate={handleDuplicate}
          />
        </div>
      )}

      {editorOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/55 px-3 py-5 backdrop-blur-md">
          <form
            onSubmit={handleSaveProduct}
            className="max-h-[92vh] w-full max-w-[840px] overflow-hidden rounded-[28px] border border-white/70 bg-[#f3f0f8] shadow-2xl shadow-slate-950/30"
          >
            <div className="flex items-start justify-between gap-4 bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-500 px-7 py-7 text-white">
              <div>
                <h2 className="text-[34px] font-black leading-tight tracking-tight">
                  {editingProduct ? "Editar Producto" : "Nuevo Producto"}
                </h2>
                <p className="mt-2 text-[18px] font-semibold text-white/90">
                  Actualiza la información del producto
                </p>
              </div>
              <button
                type="button"
                onClick={closeEditor}
                aria-label="Cerrar"
                className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/30 bg-white/15 text-white transition hover:bg-white/25"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="max-h-[calc(92vh-138px)] overflow-y-auto px-7 py-7">
              <div className="space-y-7">
                <section>
                  <div className="mb-4 flex items-center gap-2 text-[18px] font-black text-slate-900">
                    <Camera className="h-5 w-5 text-slate-700" />
                    Imagen del Producto
                  </div>
                  <div className="grid grid-cols-1 items-center gap-5 md:grid-cols-[140px_1fr]">
                    <div className="flex h-36 w-36 items-center justify-center overflow-hidden rounded-3xl border-2 border-white bg-white shadow-[0_12px_34px_rgba(124,58,237,0.32)]">
                      {draft.image.trim() ? (
                        <img
                          src={draft.image.trim()}
                          alt={draft.name || "Producto"}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <ImageIcon className="h-10 w-10 text-slate-300" />
                      )}
                    </div>

                    <div className="space-y-3">
                      <label
                        htmlFor="movi-editor-image"
                        className="flex h-[70px] cursor-pointer items-center justify-center gap-3 rounded-3xl border-2 border-dashed border-violet-300 bg-white/45 px-4 text-[18px] font-black text-violet-600 transition hover:border-violet-500 hover:bg-white/70"
                      >
                        <Upload className="h-5 w-5" />
                        Cambiar imagen
                      </label>
                      <input
                        id="movi-editor-image"
                        type="file"
                        accept="image/*"
                        onChange={handleDraftImageFile}
                        className="sr-only"
                      />
                      <input
                        value={draft.image}
                        onChange={(event) => updateDraft("image", event.target.value)}
                        className="h-11 w-full rounded-2xl border border-violet-100 bg-white/80 px-4 text-[13px] text-slate-600 outline-none transition placeholder:text-slate-400 focus:border-violet-300 focus:ring-2 focus:ring-violet-100"
                        placeholder="URL directa de imagen"
                      />
                    </div>
                  </div>
                </section>

                <label className="block">
                  <span className="mb-2 flex items-center gap-2 text-[18px] font-black text-slate-900">
                    <Tag className="h-5 w-5 text-amber-500" />
                    ID del Artículo (SKU)
                  </span>
                  <input
                    value={draft.sku}
                    onChange={(event) => updateDraft("sku", event.target.value)}
                    className="h-16 w-full rounded-2xl border-2 border-violet-100 bg-white px-6 text-[20px] font-semibold text-slate-900 outline-none transition focus:border-violet-300 focus:ring-4 focus:ring-violet-100"
                    placeholder="SKU-001"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 flex items-center gap-2 text-[18px] font-black text-slate-900">
                    <Package className="h-5 w-5 text-orange-500" />
                    Nombre del Producto
                  </span>
                  <input
                    value={draft.name}
                    onChange={(event) => updateDraft("name", event.target.value)}
                    className="h-16 w-full rounded-2xl border-2 border-violet-100 bg-white px-6 text-[20px] font-semibold text-slate-900 outline-none transition focus:border-violet-300 focus:ring-4 focus:ring-violet-100"
                    placeholder="Nombre del producto"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 flex items-center gap-2 text-[18px] font-black text-slate-900">
                    <FilePenLine className="h-5 w-5 text-slate-600" />
                    Descripción
                  </span>
                  <textarea
                    value={draft.description}
                    onChange={(event) => updateDraft("description", event.target.value)}
                    className="min-h-[112px] w-full resize-y rounded-2xl border-2 border-violet-100 bg-white px-6 py-4 text-[17px] font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-violet-300 focus:ring-4 focus:ring-violet-100"
                    placeholder="Añade una descripción detallada del producto..."
                  />
                </label>

                <section className="rounded-3xl border border-violet-100 bg-violet-50/70 p-6 shadow-sm">
                  <div className="mb-5 text-[18px] font-black text-violet-800">Precios</div>
                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                    <label>
                      <span className="text-[14px] font-bold text-slate-700">Costo</span>
                      <input
                        inputMode="numeric"
                        value={draft.cost}
                        onChange={(event) => updateDraft("cost", event.target.value)}
                        className="mt-2 h-16 w-full rounded-2xl border-2 border-violet-100 bg-white px-5 text-[21px] font-black text-slate-900 outline-none transition focus:border-violet-300 focus:ring-4 focus:ring-violet-100"
                      />
                    </label>

                    <label>
                      <span className="text-[14px] font-bold text-slate-700">Precio Normal</span>
                      <input
                        inputMode="numeric"
                        value={draft.normalPrice}
                        onChange={(event) => updateDraft("normalPrice", event.target.value)}
                        className="mt-2 h-16 w-full rounded-2xl border-2 border-violet-100 bg-white px-5 text-[21px] font-black text-slate-900 outline-none transition focus:border-violet-300 focus:ring-4 focus:ring-violet-100"
                      />
                    </label>

                    <label>
                      <span className="text-[14px] font-bold text-slate-700">Precio Oferta 1</span>
                      <input
                        inputMode="numeric"
                        value={draft.offerPrice1}
                        onChange={(event) => updateDraft("offerPrice1", event.target.value)}
                        className="mt-2 h-16 w-full rounded-2xl border-2 border-emerald-200 bg-white px-5 text-[21px] font-black text-slate-900 outline-none transition focus:border-emerald-300 focus:ring-4 focus:ring-emerald-100"
                      />
                    </label>

                    <label>
                      <span className="text-[14px] font-bold text-slate-700">Precio Oferta 2</span>
                      <input
                        inputMode="numeric"
                        value={draft.offerPrice2}
                        onChange={(event) => updateDraft("offerPrice2", event.target.value)}
                        className="mt-2 h-16 w-full rounded-2xl border-2 border-emerald-200 bg-white px-5 text-[21px] font-black text-slate-900 outline-none transition focus:border-emerald-300 focus:ring-4 focus:ring-emerald-100"
                      />
                    </label>
                  </div>
                </section>

                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <label>
                    <span className="mb-2 flex items-center gap-2 text-[18px] font-black text-slate-900">
                      <Ruler className="h-5 w-5 text-amber-500" />
                      Medidas
                    </span>
                    <input
                      value={draft.measurements}
                      onChange={(event) => updateDraft("measurements", event.target.value)}
                      className="h-16 w-full rounded-2xl border-2 border-violet-100 bg-white px-6 text-[20px] font-semibold text-slate-900 outline-none transition focus:border-violet-300 focus:ring-4 focus:ring-violet-100"
                      placeholder="ej: 25x18x15"
                    />
                  </label>

                  <label>
                    <span className="mb-2 flex items-center gap-2 text-[18px] font-black text-slate-900">
                      <Scale className="h-5 w-5 text-amber-500" />
                      Peso
                    </span>
                    <input
                      value={draft.weight}
                      onChange={(event) => updateDraft("weight", event.target.value)}
                      className="h-16 w-full rounded-2xl border-2 border-violet-100 bg-white px-6 text-[20px] font-semibold text-slate-900 outline-none transition focus:border-violet-300 focus:ring-4 focus:ring-violet-100"
                      placeholder="ej: 2 kg"
                    />
                  </label>
                </div>

                <section className="rounded-3xl border border-violet-100 bg-white/80 p-5 shadow-sm">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-[18px] font-black text-slate-900">
                      <Scale className="h-5 w-5 text-violet-600" />
                      Estado volumétrico
                    </div>
                    <button
                      type="button"
                      onClick={handleFillVolumetricFromDescription}
                      className={`rounded-full border px-3 py-1 text-[12px] font-black ${getVolumetricBadgeClass(
                        draftVolumetric.status,
                      )}`}
                    >
                      {draftVolumetric.statusLabel}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-3 text-[13px] md:grid-cols-3">
                    <div className="rounded-2xl bg-slate-50 px-4 py-3">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Peso real</p>
                      <p className="mt-1 text-[18px] font-black text-slate-900">
                        {formatKg(draftVolumetric.realWeightKg)}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 px-4 py-3">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Volumétrico</p>
                      <p className="mt-1 text-[18px] font-black text-slate-900">
                        {formatKg(draftVolumetric.volumetricWeightKg)}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 px-4 py-3">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Peso cobrable</p>
                      <p className="mt-1 text-[18px] font-black text-slate-900">
                        {formatKg(draftVolumetric.billableWeightKg)}
                      </p>
                    </div>
                  </div>

                  <p className="mt-3 text-[12px] font-semibold text-slate-500">
                    {draftVolumetric.statusDescription} Factor usado: {VOLUMETRIC_FACTOR}.
                  </p>
                </section>

                <section className="rounded-3xl border border-emerald-100 bg-white/80 p-5 shadow-sm">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-[18px] font-black text-slate-900">
                      <Truck className="h-5 w-5 text-emerald-600" />
                      Costo logístico
                    </div>
                    <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[12px] font-black text-emerald-700">
                      {draftLogistics.priceBandLabel}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                    {LOGISTICS_TIERS.map((tier) => (
                      <button
                        key={tier}
                        type="button"
                        onClick={() => updateDraft("logisticsTier", tier)}
                        className={`h-11 rounded-2xl border text-[14px] font-black transition ${
                          draft.logisticsTier === tier
                            ? "border-emerald-500 bg-emerald-600 text-white shadow-sm shadow-emerald-300/40"
                            : "border-emerald-100 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                        }`}
                      >
                        {tier}
                      </button>
                    ))}
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-3 text-[13px] md:grid-cols-3">
                    <div className="rounded-2xl bg-slate-50 px-4 py-3">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Tramo</p>
                      <p className="mt-1 text-[18px] font-black text-slate-900">
                        {draftLogistics.weightRange ?? "Sin datos"}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 px-4 py-3">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Logística</p>
                      <p className="mt-1 text-[18px] font-black text-slate-900">
                        {draftLogistics.cost !== undefined ? formatCLP(draftLogistics.cost) : "Sin calcular"}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 px-4 py-3">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Margen</p>
                      <p
                        className={`mt-1 text-[18px] font-black ${
                          (draftLogistics.margin ?? 0) < 0 ? "text-rose-600" : "text-slate-900"
                        }`}
                      >
                        {draftLogistics.margin !== undefined ? formatCLP(draftLogistics.margin) : "Sin calcular"}
                      </p>
                    </div>
                  </div>
                </section>

                <section className="rounded-3xl border border-indigo-100 bg-white/80 p-5 shadow-sm">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-[18px] font-black text-slate-900">
                      <TrendingUp className="h-5 w-5 text-indigo-600" />
                      Rentabilidad
                    </div>
                    <span
                      className={`rounded-full border px-3 py-1 text-[12px] font-black ${getProfitBadgeClass(
                        draftProfit.statusTone,
                      )}`}
                    >
                      {draftProfit.statusLabel}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                    <label>
                      <span className="text-[12px] font-bold text-slate-600">Perfil</span>
                      <select
                        value={draft.pricingProfile}
                        onChange={(event) => {
                          const profile = normalizePricingProfile(event.target.value);
                          updateDraft("pricingProfile", profile);
                          updateDraft("cofinancingRate", String(getDefaultCofinancingRate(profile)));
                        }}
                        className="mt-2 h-12 w-full rounded-2xl border border-indigo-100 bg-white px-4 text-[14px] font-bold text-slate-800 outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100"
                      >
                        <option value="4/5 estrellas">4/5 estrellas</option>
                        <option value="3 estrellas">3 estrellas</option>
                        <option value="Personalizado">Personalizado</option>
                      </select>
                    </label>

                    <label>
                      <span className="text-[12px] font-bold text-slate-600">Comisión %</span>
                      <input
                        inputMode="decimal"
                        value={draft.commissionRate}
                        onChange={(event) => updateDraft("commissionRate", event.target.value)}
                        className="mt-2 h-12 w-full rounded-2xl border border-indigo-100 bg-white px-4 text-[16px] font-black text-slate-900 outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100"
                      />
                    </label>

                    <label>
                      <span className="text-[12px] font-bold text-slate-600">Cofinanciamiento %</span>
                      <input
                        inputMode="decimal"
                        value={draft.cofinancingRate}
                        onChange={(event) => {
                          updateDraft("cofinancingRate", event.target.value);
                          updateDraft("pricingProfile", "Personalizado");
                        }}
                        className="mt-2 h-12 w-full rounded-2xl border border-indigo-100 bg-white px-4 text-[16px] font-black text-slate-900 outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100"
                      />
                    </label>
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-3 text-[13px] md:grid-cols-4">
                    <div className="rounded-2xl bg-slate-50 px-4 py-3">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Utilidad bruta</p>
                      <p className={`mt-1 text-[18px] font-black ${draftProfit.grossProfit < 0 ? "text-rose-600" : "text-slate-900"}`}>
                        {formatCLP(draftProfit.grossProfit)}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 px-4 py-3">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Margen bruto</p>
                      <p className="mt-1 text-[18px] font-black text-slate-900">
                        {formatPercent(draftProfit.grossMargin)}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 px-4 py-3">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Utilidad neta est.</p>
                      <p className={`mt-1 text-[18px] font-black ${draftProfit.netProfit < 0 ? "text-rose-600" : "text-slate-900"}`}>
                        {formatCLP(draftProfit.netProfit)}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 px-4 py-3">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Precio mínimo</p>
                      <p className="mt-1 text-[18px] font-black text-slate-900">
                        {formatCLP(draftProfit.minimumPrice)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4">
                    {[
                      ["Medio", draftProfit.mediumMarginPrice],
                      ["CMR/envío", draftProfit.cmrOrFreeShippingPrice],
                      ["Temp. baja", draftProfit.lowSeasonPrice],
                      ["Temp. alta", draftProfit.highSeasonPrice],
                    ].map(([label, value]) => (
                      <button
                        key={label}
                        type="button"
                        onClick={() => updateDraft("offerPrice2", String(value))}
                        className="rounded-2xl border border-indigo-100 bg-indigo-50 px-3 py-3 text-left transition hover:border-indigo-300 hover:bg-indigo-100"
                      >
                        <p className="text-[10px] font-bold uppercase tracking-wide text-indigo-500">{label}</p>
                        <p className="mt-1 text-[16px] font-black text-slate-900">{formatCLP(Number(value))}</p>
                      </button>
                    ))}
                  </div>
                </section>
              </div>

              <div className="sticky bottom-0 mt-8 grid grid-cols-1 gap-5 border-t border-white/70 bg-[#f3f0f8]/95 py-5 backdrop-blur md:grid-cols-2">
                <button
                  type="button"
                  onClick={closeEditor}
                  className="inline-flex h-[72px] items-center justify-center rounded-3xl border border-slate-200 bg-slate-50 text-[20px] font-black text-slate-700 shadow-sm transition hover:bg-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="inline-flex h-[72px] items-center justify-center gap-3 rounded-3xl bg-gradient-to-r from-violet-600 to-fuchsia-500 text-[20px] font-black text-white shadow-lg shadow-violet-500/25 transition hover:from-violet-700 hover:to-fuchsia-600"
                >
                  <Save className="h-5 w-5" />
                  Guardar Cambios
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      <div className="h-8" />
    </div>
  );
}
