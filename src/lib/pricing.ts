import type { PricingProfile, Product } from "@/types";
import { LOGISTICS_PRICE_LIMIT, getLogisticsCostInfo } from "@/lib/logistics";

export const DEFAULT_COMMISSION_RATE = 15;
export const DEFAULT_COFINANCING_RATE = 20;
export const THREE_STAR_COFINANCING_RATE = 25;
export const VAT_RATE = 19;
export const LOW_PRICE_TARGET_PROFIT = 1000;
export const HIGH_PRICE_TARGET_PROFIT = 2000;

export type ProfitInfo = {
  profile: PricingProfile;
  commissionRate: number;
  cofinancingRate: number;
  commission: number;
  cofinancing: number;
  providerCost: number;
  logisticsCost: number;
  totalCost: number;
  grossProfit: number;
  grossMargin: number;
  netPrice: number;
  estimatedVat: number;
  netProfit: number;
  netMargin: number;
  targetProfit: number;
  minimumPrice: number;
  mediumMarginPrice: number;
  cmrOrFreeShippingPrice: number;
  lowSeasonPrice: number;
  highSeasonPrice: number;
  statusLabel: string;
  statusTone: "good" | "warn" | "bad" | "missing";
  missing: string[];
};

export function normalizeRate(value: unknown, fallback: number) {
  const parsed =
    typeof value === "number"
      ? value
      : Number(String(value ?? "").replace("%", "").replace(",", ".").trim());

  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return parsed > 1 ? parsed : parsed * 100;
}

export function normalizePricingProfile(value: unknown): PricingProfile {
  const normalized = String(value ?? "").toLowerCase().trim();

  if (normalized.includes("3")) return "3 estrellas";
  if (normalized.includes("4") || normalized.includes("5")) return "4/5 estrellas";
  if (normalized.includes("personal")) return "Personalizado";

  return "4/5 estrellas";
}

export function getDefaultCofinancingRate(profile: PricingProfile) {
  return profile === "3 estrellas" ? THREE_STAR_COFINANCING_RATE : DEFAULT_COFINANCING_RATE;
}

function roundMoney(value: number) {
  return Math.round(value);
}

export function roundRecommendedPrice(value: number) {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.max(990, Math.ceil((value + 10) / 1000) * 1000 - 10);
}

export function getProfitInfo(
  product: Pick<Product, "price" | "cost" | "measurements" | "weight" | "logisticsTier" | "pricingProfile"> & {
    commissionRate?: unknown;
    cofinancingRate?: unknown;
  },
): ProfitInfo {
  const profile = normalizePricingProfile(product.pricingProfile);
  const commissionRate = normalizeRate(product.commissionRate, DEFAULT_COMMISSION_RATE);
  const cofinancingRate = normalizeRate(product.cofinancingRate, getDefaultCofinancingRate(profile));
  const logistics = getLogisticsCostInfo(product);
  const price = roundMoney(product.price || 0);
  const providerCost = roundMoney(product.cost ?? 0);
  const logisticsCost = roundMoney(logistics.cost ?? 0);
  const commission = roundMoney(price * (commissionRate / 100));
  const cofinancing = roundMoney(price * (cofinancingRate / 100));
  const totalCost = providerCost + logisticsCost + commission + cofinancing;
  const grossProfit = price - totalCost;
  const grossMargin = price > 0 ? grossProfit / price : 0;
  const netPrice = price / (1 + VAT_RATE / 100);
  const estimatedVat = price - netPrice;
  const netProfit = grossProfit - estimatedVat;
  const netMargin = netPrice > 0 ? netProfit / netPrice : 0;
  const targetProfit = price >= LOGISTICS_PRICE_LIMIT ? HIGH_PRICE_TARGET_PROFIT : LOW_PRICE_TARGET_PROFIT;
  const variableRate = (commissionRate + cofinancingRate) / 100;
  const denominator = Math.max(0.01, 1 - variableRate);
  const minimumPrice = roundRecommendedPrice((providerCost + logisticsCost + targetProfit) / denominator);
  const mediumMarginPrice = roundRecommendedPrice(minimumPrice + 2000);
  const cmrOrFreeShippingPrice = roundRecommendedPrice(minimumPrice + 3000);
  const lowSeasonPrice = roundRecommendedPrice(minimumPrice + 5000);
  const highSeasonPrice = roundRecommendedPrice(minimumPrice + 7000);
  const missing = [
    providerCost <= 0 ? "costo" : "",
    !logistics.cost ? "peso/medidas" : "",
  ].filter(Boolean);

  if (missing.length) {
    return {
      profile,
      commissionRate,
      cofinancingRate,
      commission,
      cofinancing,
      providerCost,
      logisticsCost,
      totalCost,
      grossProfit,
      grossMargin,
      netPrice,
      estimatedVat,
      netProfit,
      netMargin,
      targetProfit,
      minimumPrice,
      mediumMarginPrice,
      cmrOrFreeShippingPrice,
      lowSeasonPrice,
      highSeasonPrice,
      statusLabel: "Completar datos",
      statusTone: "missing",
      missing,
    };
  }

  if (grossProfit < 0) {
    return {
      profile,
      commissionRate,
      cofinancingRate,
      commission,
      cofinancing,
      providerCost,
      logisticsCost,
      totalCost,
      grossProfit,
      grossMargin,
      netPrice,
      estimatedVat,
      netProfit,
      netMargin,
      targetProfit,
      minimumPrice,
      mediumMarginPrice,
      cmrOrFreeShippingPrice,
      lowSeasonPrice,
      highSeasonPrice,
      statusLabel: "Margen negativo",
      statusTone: "bad",
      missing,
    };
  }

  if (grossMargin < 0.18) {
    return {
      profile,
      commissionRate,
      cofinancingRate,
      commission,
      cofinancing,
      providerCost,
      logisticsCost,
      totalCost,
      grossProfit,
      grossMargin,
      netPrice,
      estimatedVat,
      netProfit,
      netMargin,
      targetProfit,
      minimumPrice,
      mediumMarginPrice,
      cmrOrFreeShippingPrice,
      lowSeasonPrice,
      highSeasonPrice,
      statusLabel: "Margen bajo",
      statusTone: "warn",
      missing,
    };
  }

  return {
    profile,
    commissionRate,
    cofinancingRate,
    commission,
    cofinancing,
    providerCost,
    logisticsCost,
    totalCost,
    grossProfit,
    grossMargin,
    netPrice,
    estimatedVat,
    netProfit,
    netMargin,
    targetProfit,
    minimumPrice,
    mediumMarginPrice,
    cmrOrFreeShippingPrice,
    lowSeasonPrice,
    highSeasonPrice,
    statusLabel: "Rentable",
    statusTone: "good",
    missing,
  };
}

export function formatPercent(value: number) {
  return `${new Intl.NumberFormat("es-CL", {
    maximumFractionDigits: 1,
  }).format(value * 100)}%`;
}

export function getProfitBadgeClass(tone: ProfitInfo["statusTone"]) {
  switch (tone) {
    case "good":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "warn":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "bad":
      return "border-rose-200 bg-rose-50 text-rose-700";
    default:
      return "border-slate-200 bg-slate-50 text-slate-500";
  }
}
