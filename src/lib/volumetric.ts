import type { Product } from "@/types";

export const VOLUMETRIC_FACTOR = 4000;

export type VolumetricStatus =
  | "complete-data"
  | "volumetric-high"
  | "real-weight"
  | "balanced";

export type VolumetricInfo = {
  status: VolumetricStatus;
  statusLabel: string;
  statusDescription: string;
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
  volumeCm3?: number;
  realWeightKg?: number;
  volumetricWeightKg?: number;
  billableWeightKg?: number;
  missing: string[];
};

function parseDecimal(value: string) {
  const normalized = value.replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseNumberList(value?: string) {
  if (!value) return [];
  return (value.match(/\d+(?:[.,]\d+)?/g) ?? []).map(parseDecimal).filter((number) => number > 0);
}

function cleanDimensionValue(value: string) {
  return value
    .replace(/\b(?:cm|cms|centimetros?)\b/gi, "")
    .replace(/[Xx*\u00d7]/g, "x")
    .replace(/\s+/g, "")
    .trim();
}

function cleanWeightValue(value: string, unit?: string) {
  const normalizedUnit = (unit ?? "kg").toLowerCase();
  const suffix = /\b(?:g|gr|grs|gramos?)\b/.test(normalizedUnit) ? "gr" : "kg";
  return `${value.replace(".", ",")} ${suffix}`;
}

export function extractMeasurementsFromText(value?: string) {
  if (!value) return "";

  const labeledMatch = value.match(
    /\b(?:medidas?|dimensiones?|dimension|tamano|tama\u00f1o)\b(?:\s+del\s+producto)?\s*[:\-]?\s*((?:\d+(?:[.,]\d+)?\s*(?:cm|cms|centimetros?)?\s*[xX*\u00d7]\s*){2}\d+(?:[.,]\d+)?\s*(?:cm|cms|centimetros?)?)/i,
  );
  const fallbackMatch = value.match(
    /\b(\d+(?:[.,]\d+)?)\s*(?:cm|cms|centimetros?)?\s*[xX*\u00d7]\s*(\d+(?:[.,]\d+)?)\s*(?:cm|cms|centimetros?)?\s*[xX*\u00d7]\s*(\d+(?:[.,]\d+)?)\s*(?:cm|cms|centimetros?)?\b/i,
  );
  const raw = labeledMatch?.[1] ?? fallbackMatch?.[0] ?? "";
  const cleaned = cleanDimensionValue(raw);

  return parseMeasurements(cleaned) ? cleaned : "";
}

export function parseMeasurements(value?: string) {
  const [lengthCm, widthCm, heightCm] = parseNumberList(value);

  if (!lengthCm || !widthCm || !heightCm) {
    return null;
  }

  return { lengthCm, widthCm, heightCm };
}

export function extractWeightFromText(value?: string) {
  if (!value) return "";

  const labeledMatch = value.match(
    /\b(?:peso|peso\s+real|peso\s+neto|peso\s+producto)\b(?:\s+del\s+producto)?\s*[:\-]?\s*(\d+(?:[.,]\d+)?)\s*(kg|kgs|kilo|kilos|g|gr|grs|gramos?)?\b/i,
  );
  const unitMatch = value.match(
    /\b(\d+(?:[.,]\d+)?)\s*(kg|kgs|kilo|kilos|g|gr|grs|gramos?)\b/i,
  );
  const number = labeledMatch?.[1] ?? unitMatch?.[1] ?? "";
  const unit = labeledMatch?.[2] ?? unitMatch?.[2];
  const cleaned = number ? cleanWeightValue(number, unit) : "";

  return parseWeightKg(cleaned) ? cleaned : "";
}

export function parseWeightKg(value?: string) {
  const [weight] = parseNumberList(value);
  if (!weight) return null;

  const normalized = value?.toLowerCase() ?? "";
  const isGrams = /\b(gr|g|gramos?)\b/.test(normalized) && !/\b(kg|kgs|kilo|kilos)\b/.test(normalized);

  return isGrams ? weight / 1000 : weight;
}

function roundKg(value: number) {
  return Math.round(value * 100) / 100;
}

export function formatKg(value?: number | null) {
  if (value === undefined || value === null || !Number.isFinite(value)) return "Sin dato";

  return `${new Intl.NumberFormat("es-CL", {
    maximumFractionDigits: 2,
    minimumFractionDigits: value < 10 && value % 1 !== 0 ? 1 : 0,
  }).format(value)} kg`;
}

export function getVolumetricInfo(
  product: Pick<Product, "measurements" | "weight"> & { description?: string },
): VolumetricInfo {
  const measurements = product.measurements || extractMeasurementsFromText(product.description);
  const weight = product.weight || extractWeightFromText(product.description);
  const dimensions = parseMeasurements(measurements);
  const realWeightKg = parseWeightKg(weight);
  const missing = [
    !dimensions ? "medidas" : "",
    !realWeightKg ? "peso" : "",
  ].filter(Boolean);

  if (!dimensions || !realWeightKg) {
    return {
      status: "complete-data",
      statusLabel: "Completar datos",
      statusDescription: missing.length
        ? `Falta ${missing.join(" y ")} para calcular el peso cobrable.`
        : "Faltan datos para calcular el peso cobrable.",
      realWeightKg: realWeightKg ?? undefined,
      missing,
    };
  }

  const volumeCm3 = dimensions.lengthCm * dimensions.widthCm * dimensions.heightCm;
  const volumetricWeightKg = roundKg(volumeCm3 / VOLUMETRIC_FACTOR);
  const billableWeightKg = roundKg(Math.max(realWeightKg, volumetricWeightKg));
  const ratio = volumetricWeightKg / realWeightKg;

  if (ratio >= 1.15) {
    return {
      status: "volumetric-high",
      statusLabel: "Volumétrico alto",
      statusDescription: "El volumen pesa más que el peso real.",
      ...dimensions,
      volumeCm3,
      realWeightKg: roundKg(realWeightKg),
      volumetricWeightKg,
      billableWeightKg,
      missing,
    };
  }

  if (ratio <= 0.85) {
    return {
      status: "real-weight",
      statusLabel: "Peso real domina",
      statusDescription: "El peso real es mayor que el volumétrico.",
      ...dimensions,
      volumeCm3,
      realWeightKg: roundKg(realWeightKg),
      volumetricWeightKg,
      billableWeightKg,
      missing,
    };
  }

  return {
    status: "balanced",
    statusLabel: "Equilibrado",
    statusDescription: "Peso real y volumétrico están similares.",
    ...dimensions,
    volumeCm3,
    realWeightKg: roundKg(realWeightKg),
    volumetricWeightKg,
    billableWeightKg,
    missing,
  };
}

export function getVolumetricBadgeClass(status: VolumetricStatus) {
  switch (status) {
    case "volumetric-high":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "real-weight":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "balanced":
      return "border-sky-200 bg-sky-50 text-sky-700";
    default:
      return "border-slate-200 bg-slate-50 text-slate-500";
  }
}
