import type { Product, LogisticsTier } from "@/types";
import { getVolumetricInfo } from "@/lib/volumetric";

export const LOGISTICS_PRICE_LIMIT = 19990;
export const LOGISTICS_TIERS: LogisticsTier[] = ["5/5", "4/5", "3/5", "2/5"];

type PriceBand = "low" | "high";

type LogisticsRateRow = {
  label: string;
  min: number;
  max: number;
  low: Record<LogisticsTier, number>;
  high: Record<LogisticsTier, number>;
};

export type LogisticsCostInfo = {
  tier: LogisticsTier;
  priceBand: PriceBand;
  priceBandLabel: string;
  weightRange?: string;
  cost?: number;
  baseCost?: number;
  extraKg?: number;
  extraCost?: number;
  billableWeightKg?: number;
  missing: string[];
  margin?: number;
  totalCost?: number;
  statusLabel: string;
};

const SAME_FOR_BOTH = (values: Record<LogisticsTier, number>) => ({
  low: values,
  high: values,
});

export const LOGISTICS_RATES: LogisticsRateRow[] = [
  {
    label: "0-1 kg",
    min: 0,
    max: 1,
    low: { "5/5": 1000, "4/5": 1190, "3/5": 1890, "2/5": 2390 },
    high: { "5/5": 2790, "4/5": 3290, "3/5": 5290, "2/5": 6590 },
  },
  {
    label: "1-2 kg",
    min: 1,
    max: 2,
    low: { "5/5": 1000, "4/5": 1190, "3/5": 1890, "2/5": 2390 },
    high: { "5/5": 2890, "4/5": 3490, "3/5": 5590, "2/5": 6990 },
  },
  {
    label: "2-3 kg",
    min: 2,
    max: 3,
    low: { "5/5": 1000, "4/5": 1190, "3/5": 1890, "2/5": 2390 },
    high: { "5/5": 3090, "4/5": 3690, "3/5": 5890, "2/5": 7390 },
  },
  {
    label: "3-6 kg",
    min: 3,
    max: 6,
    low: { "5/5": 2490, "4/5": 2990, "3/5": 4790, "2/5": 5990 },
    high: { "5/5": 3390, "4/5": 3990, "3/5": 6390, "2/5": 7990 },
  },
  {
    label: "6-10 kg",
    min: 6,
    max: 10,
    ...SAME_FOR_BOTH({ "5/5": 3790, "4/5": 4490, "3/5": 7190, "2/5": 8990 }),
  },
  {
    label: "10-15 kg",
    min: 10,
    max: 15,
    ...SAME_FOR_BOTH({ "5/5": 4590, "4/5": 5490, "3/5": 8790, "2/5": 10990 }),
  },
  {
    label: "15-20 kg",
    min: 15,
    max: 20,
    ...SAME_FOR_BOTH({ "5/5": 5490, "4/5": 6490, "3/5": 10390, "2/5": 12990 }),
  },
  {
    label: "20-30 kg",
    min: 20,
    max: 30,
    ...SAME_FOR_BOTH({ "5/5": 6690, "4/5": 7990, "3/5": 12790, "2/5": 15990 }),
  },
  {
    label: "30-50 kg",
    min: 30,
    max: 50,
    ...SAME_FOR_BOTH({ "5/5": 7590, "4/5": 8990, "3/5": 14390, "2/5": 17990 }),
  },
  {
    label: "50-80 kg",
    min: 50,
    max: 80,
    ...SAME_FOR_BOTH({ "5/5": 8390, "4/5": 9990, "3/5": 15990, "2/5": 19990 }),
  },
  {
    label: "80-100 kg",
    min: 80,
    max: 100,
    ...SAME_FOR_BOTH({ "5/5": 9190, "4/5": 10990, "3/5": 17590, "2/5": 21990 }),
  },
  {
    label: "100-125 kg",
    min: 100,
    max: 125,
    ...SAME_FOR_BOTH({ "5/5": 9190, "4/5": 10990, "3/5": 17590, "2/5": 21990 }),
  },
  {
    label: "125-150 kg",
    min: 125,
    max: 150,
    ...SAME_FOR_BOTH({ "5/5": 10890, "4/5": 12990, "3/5": 20790, "2/5": 25990 }),
  },
  {
    label: "150-175 kg",
    min: 150,
    max: 175,
    ...SAME_FOR_BOTH({ "5/5": 10890, "4/5": 12990, "3/5": 20790, "2/5": 25990 }),
  },
  {
    label: "175-200 kg",
    min: 175,
    max: 200,
    ...SAME_FOR_BOTH({ "5/5": 12590, "4/5": 14990, "3/5": 23990, "2/5": 29990 }),
  },
  {
    label: "200-225 kg",
    min: 200,
    max: 225,
    ...SAME_FOR_BOTH({ "5/5": 15990, "4/5": 18990, "3/5": 30390, "2/5": 37990 }),
  },
  {
    label: "225-250 kg",
    min: 225,
    max: 250,
    ...SAME_FOR_BOTH({ "5/5": 15990, "4/5": 18990, "3/5": 30390, "2/5": 37990 }),
  },
  {
    label: "250-300 kg",
    min: 250,
    max: 300,
    ...SAME_FOR_BOTH({ "5/5": 20990, "4/5": 24990, "3/5": 39990, "2/5": 49990 }),
  },
  {
    label: "300-400 kg",
    min: 300,
    max: 400,
    ...SAME_FOR_BOTH({ "5/5": 21790, "4/5": 25990, "3/5": 41590, "2/5": 51990 }),
  },
  {
    label: "400-500 kg",
    min: 400,
    max: 500,
    ...SAME_FOR_BOTH({ "5/5": 22690, "4/5": 26990, "3/5": 43190, "2/5": 53990 }),
  },
  {
    label: "500-600 kg",
    min: 500,
    max: 600,
    ...SAME_FOR_BOTH({ "5/5": 29990, "4/5": 34990, "3/5": 55990, "2/5": 69990 }),
  },
];

const EXTRA_KG_RATE: Record<LogisticsTier, number> = {
  "5/5": 34,
  "4/5": 40,
  "3/5": 64,
  "2/5": 80,
};

export function normalizeLogisticsTier(value: unknown): LogisticsTier {
  const normalized = String(value ?? "").trim().replace(",", "/");

  if (LOGISTICS_TIERS.includes(normalized as LogisticsTier)) {
    return normalized as LogisticsTier;
  }

  return "5/5";
}

function getPriceBand(price: number): PriceBand {
  return price >= LOGISTICS_PRICE_LIMIT ? "high" : "low";
}

function findRateRow(weight: number) {
  return LOGISTICS_RATES.find((row) => weight > row.min && weight <= row.max) ?? LOGISTICS_RATES[0];
}

export function getLogisticsCostInfo(
  product: Pick<Product, "price" | "cost" | "measurements" | "weight" | "logisticsTier"> & { description?: string },
): LogisticsCostInfo {
  const tier = normalizeLogisticsTier(product.logisticsTier);
  const priceBand = getPriceBand(product.price);
  const priceBandLabel = priceBand === "high" ? "Mayor o igual a $19.990" : "Menor a $19.990";
  const volumetric = getVolumetricInfo(product);
  const missing = [...volumetric.missing];

  if (!volumetric.billableWeightKg) {
    return {
      tier,
      priceBand,
      priceBandLabel,
      missing,
      statusLabel: "Sin calcular",
    };
  }

  const weight = volumetric.billableWeightKg;
  const baseRow = LOGISTICS_RATES[LOGISTICS_RATES.length - 1];
  const isExtraWeight = weight > baseRow.max;
  const row = isExtraWeight ? baseRow : findRateRow(weight);
  const baseCost = row[priceBand][tier];
  const extraKg = isExtraWeight ? Math.ceil(weight - baseRow.max) : 0;
  const extraCost = extraKg * EXTRA_KG_RATE[tier];
  const cost = baseCost + extraCost;
  const productCost = product.cost ?? 0;
  const totalCost = productCost + cost;
  const margin = product.price - totalCost;

  return {
    tier,
    priceBand,
    priceBandLabel,
    weightRange: isExtraWeight ? ">600 kg" : row.label,
    cost,
    baseCost,
    extraKg,
    extraCost,
    billableWeightKg: weight,
    missing,
    margin,
    totalCost,
    statusLabel: isExtraWeight ? "Sobre 600 kg" : row.label,
  };
}
