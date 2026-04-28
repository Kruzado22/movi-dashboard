export type ProductStatus = "Activo" | "Bajo stock" | "Agotado";

export type Product = {
  id: number;
  name: string;
  sku: string;
  description?: string;
  price: number;
  cost?: number;
  normalPrice?: number;
  offerPrice1?: number;
  offerPrice2?: number;
  stock: number;
  discount?: number;
  hasImage: boolean;
  status: ProductStatus;
  category: string;
  image: string;
  measurements?: string;
  weight?: string;
};

export type ViewMode = "cards" | "table";

export type SortOption =
  | "Recientes"
  | "Nombre A-Z"
  | "Mayor stock"
  | "Menor stock"
  | "Mayor descuento"
  | "Precio mayor"
  | "Precio menor";
