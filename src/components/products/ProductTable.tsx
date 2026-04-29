import { useState } from "react";
import {
  Image as ImageIcon,
  Pencil,
  Copy,
  Trash2,
  Check,
} from "lucide-react";
import type { Product } from "@/types";
import { formatCLP } from "@/data/products";
import { getLogisticsCostInfo } from "@/lib/logistics";
import { formatKg, getVolumetricBadgeClass, getVolumetricInfo } from "@/lib/volumetric";
import StatusBadge from "./StatusBadge";

type Props = {
  products: Product[];
  onDelete: (id: number) => void;
  onEdit?: (product: Product) => void;
  onDuplicate?: (product: Product) => void;
};

function TableImageCell({ product }: { product: Product }) {
  const [imgError, setImgError] = useState(false);
  const showImg = product.hasImage && product.image && !imgError;
  return (
    <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-slate-100">
      {showImg ? (
        <img
          src={product.image}
          alt={product.name}
          className="h-full w-full object-cover"
          onError={() => setImgError(true)}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <ImageIcon className="h-4 w-4 text-slate-300" />
        </div>
      )}
    </div>
  );
}

function VolumetricTableCell({ product }: { product: Product }) {
  const volumetric = getVolumetricInfo(product);

  return (
    <div className="min-w-[118px]">
      <span
        className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold ${getVolumetricBadgeClass(
          volumetric.status,
        )}`}
      >
        {volumetric.statusLabel}
      </span>
      <p className="mt-1 text-[11px] font-semibold text-slate-500">
        {formatKg(volumetric.billableWeightKg)}
      </p>
    </div>
  );
}

function LogisticsTableCell({ product }: { product: Product }) {
  const logistics = getLogisticsCostInfo(product);

  return (
    <div className="min-w-[108px]">
      <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
        {logistics.tier}
      </span>
      <p className="mt-1 text-[11px] font-bold text-slate-700">
        {logistics.cost !== undefined ? formatCLP(logistics.cost) : "Sin calcular"}
      </p>
    </div>
  );
}

export default function ProductTable({ products, onDelete, onEdit, onDuplicate }: Props) {
  const [selected, setSelected] = useState<Set<number>>(new Set());

  function toggleSelect(id: number) {
    setSelected((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  function toggleAll() {
    if (selected.size === products.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(products.map((p) => p.id)));
    }
  }

  const allSelected = products.length > 0 && selected.size === products.length;

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full text-left">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50/80">
            <th className="w-9 px-4 py-3">
              <div className="flex items-center justify-center">
                {allSelected ? (
                  <button
                    onClick={toggleAll}
                    className="flex h-4 w-4 items-center justify-center rounded bg-violet-600"
                  >
                    <Check className="h-2.5 w-2.5 text-white" />
                  </button>
                ) : (
                  <input
                    type="checkbox"
                    checked={false}
                    onChange={toggleAll}
                    className="rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                  />
                )}
              </div>
            </th>
            {["Producto", "SKU", "Categoría", "Precio", "Stock", "Vol.", "Log.", "Oferta", "Estado", ""].map(
              (h) => (
                <th
                  key={h}
                  className="px-3 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400 whitespace-nowrap"
                >
                  {h}
                </th>
              ),
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {products.map((product) => (
            <tr
              key={product.id}
              onClick={() => toggleSelect(product.id)}
              className={`group cursor-pointer text-sm transition-colors ${
                selected.has(product.id)
                  ? "bg-violet-50/50"
                  : "hover:bg-slate-50/70"
              }`}
            >
              <td
                className="px-4 py-3"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-center">
                  {selected.has(product.id) ? (
                    <button
                      onClick={() => toggleSelect(product.id)}
                      className="flex h-4 w-4 items-center justify-center rounded bg-violet-600"
                    >
                      <Check className="h-2.5 w-2.5 text-white" />
                    </button>
                  ) : (
                    <input
                      type="checkbox"
                      checked={false}
                      readOnly
                      className="rounded border-slate-300 text-violet-600"
                    />
                  )}
                </div>
              </td>
              <td className="px-3 py-3">
                <div className="flex items-center gap-3">
                  <TableImageCell product={product} />
                  <div className="min-w-0">
                    <p className="max-w-[180px] truncate text-[13px] font-semibold text-slate-900">
                      {product.name}
                    </p>
                    <p className="mt-0.5 font-mono text-[10px] text-slate-400">
                      #{product.id}
                    </p>
                  </div>
                </div>
              </td>
              <td className="px-3 py-3">
                <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[11px] text-slate-600">
                  {product.sku}
                </span>
              </td>
              <td className="px-3 py-3">
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600">
                  {product.category}
                </span>
              </td>
              <td className="px-3 py-3">
                <span className="text-[13px] font-bold text-slate-900">
                  {formatCLP(product.price)}
                </span>
              </td>
              <td className="px-3 py-3">
                <span
                  className={`text-[13px] font-bold tabular-nums ${
                    product.stock === 0
                      ? "text-rose-600"
                      : product.stock <= 5
                        ? "text-amber-600"
                        : "text-slate-800"
                  }`}
                >
                  {product.stock}
                </span>
              </td>
              <td className="px-3 py-3">
                <VolumetricTableCell product={product} />
              </td>
              <td className="px-3 py-3">
                <LogisticsTableCell product={product} />
              </td>
              <td className="px-3 py-3">
                {product.discount ? (
                  <span className="inline-flex items-center rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-bold text-rose-600 ring-1 ring-rose-200">
                    -{product.discount}%
                  </span>
                ) : (
                  <span className="text-[12px] text-slate-300">—</span>
                )}
              </td>
              <td className="px-3 py-3">
                <StatusBadge status={product.status} />
              </td>
              <td
                className="px-3 py-3"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-end gap-1">
                  <button
                    title="Editar"
                    onClick={() => onEdit?.(product)}
                    className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-violet-50 hover:text-violet-600"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    title="Duplicar"
                    onClick={() => onDuplicate?.(product)}
                    className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                  <button
                    title="Eliminar"
                    onClick={() => onDelete(product.id)}
                    className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
