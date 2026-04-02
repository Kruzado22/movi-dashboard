import { useState } from "react";
import { Pencil, Copy, Trash2, Image as ImageIcon } from "lucide-react";
import type { Product } from "@/types";
import { formatCLP } from "@/data/products";
import StatusBadge from "./StatusBadge";

type Props = {
  product: Product;
  onDelete: (id: number) => void;
  onEdit?: (product: Product) => void;
};

export default function ProductCard({ product, onDelete, onEdit }: Props) {
  const [imgError, setImgError] = useState(false);
  const showImage = product.hasImage && product.image && !imgError;

  return (
    <div className="group flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition duration-200 hover:-translate-y-px hover:border-violet-200 hover:shadow-[0_4px_24px_-4px_rgba(109,40,217,0.14)]">
      {/* Image */}
      <div className="relative h-[160px] w-full shrink-0 overflow-hidden bg-slate-100">
        {showImage ? (
          <img
            src={product.image}
            alt=""
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-slate-50">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-200">
              <ImageIcon className="h-4 w-4 text-slate-400" />
            </div>
            <span className="text-[11px] font-medium text-slate-400">
              Sin imagen
            </span>
          </div>
        )}

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

        {product.discount ? (
          <span className="absolute right-2.5 top-2.5 rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-bold tracking-wide text-white shadow-md shadow-rose-500/20">
            -{product.discount}%
          </span>
        ) : null}
        <span className="absolute left-2.5 top-2.5 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white/90 backdrop-blur-sm">
          #{product.id}
        </span>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col px-4 py-3.5">
        <div className="mb-3">
          <h3 className="line-clamp-2 text-[13px] font-bold leading-[1.35] text-slate-900 transition-colors group-hover:text-violet-900">
            {product.name}
          </h3>
          <p className="mt-1 font-mono text-[10px] font-medium tracking-wide text-slate-400">
            {product.sku}
          </p>
        </div>

        <div className="mb-3 flex items-end justify-between border-b border-slate-100 pb-3">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
              Precio
            </p>
            <p className="mt-0.5 text-[15px] font-black tabular-nums leading-none text-slate-900">
              {formatCLP(product.price)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
              Stock
            </p>
            <p
              className={`mt-0.5 text-[15px] font-black tabular-nums leading-none ${
                product.stock === 0
                  ? "text-rose-600"
                  : product.stock <= 5
                    ? "text-amber-600"
                    : "text-slate-900"
              }`}
            >
              {product.stock}{" "}
              <span className="text-[11px] font-semibold">uds</span>
            </p>
          </div>
        </div>

        <div className="mb-3 flex items-center justify-between gap-2">
          <StatusBadge status={product.status} />
          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
            {product.category}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onEdit?.(product)}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white py-[7px] text-[12px] font-semibold text-slate-700 transition-colors hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700"
          >
            <Pencil className="h-3 w-3" />
            Editar
          </button>
          <button
            title="Duplicar"
            className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-2.5 py-[7px] text-slate-500 transition-colors hover:border-slate-300 hover:bg-slate-50"
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
          <button
            title="Eliminar"
            onClick={() => onDelete(product.id)}
            className="inline-flex items-center justify-center rounded-lg border border-rose-100 bg-rose-50/50 px-2.5 py-[7px] text-rose-400 transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
