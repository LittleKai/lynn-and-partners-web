export interface Location {
  id: string;
  name: string;
  type: string;
  currency: string;
  description: string | null;
  address: string | null;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  unit: string;
  quantity: number;
  price: number;
  salePrice: number;
  status: string;
  imageUrl: string | null;
}

export interface SaleOrderItem {
  productId: string;
  productName: string;
  quantity: number;
  salePrice: number;
  totalPrice: number;
}

export interface SaleOrder {
  id: string;
  customerId: string | null;
  guestId: string | null;
  notes: string | null;
  totalAmount: number;
  createdAt: string;
  createdByName?: string;
  items: SaleOrderItem[];
}

export interface Room {
  id: string;
  number: string;
  status: string; // "available" | "occupied" | "maintenance"
  pricePerNight: number | null;
  pricePerMonth: number | null;
  notes: string | null;
}

export interface HistoryTxEntry {
  kind: "tx";
  id: string;
  date: string;
  type: "IMPORT" | "EXPORT";
  quantity: number;
  unitPrice: number | null;
  totalPrice: number | null;
  notes: string | null;
  supplierId: string | null;
  imageUrls: string[];
  fileUrls: string[];
  createdByName?: string;
}

export interface HistorySaleEntry {
  kind: "sale";
  id: string;
  date: string;
  quantity: number;
  salePrice: number;
  totalPrice: number;
  notes: string | null;
  orderId: string;
  customerName: string;
  createdByName?: string;
}

export type HistoryEntry = HistoryTxEntry | HistorySaleEntry;

export interface NewOrderRow {
  productId: string;
  quantity: string;
  salePrice: string;
}

export interface ImportItem {
  uid: string;
  productId: string;
  quantity: string;
  unitPrice: string;
}

export interface LocationDoc {
  id: string;
  name: string;
  notes: string | null;
  url: string;
  resourceType: string;
  uploadedByName: string | null;
  uploadedAt: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  type: string;
  createdByName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Transaction {
  id: string;
  type: "IMPORT" | "EXPORT";
  productId: string;
  supplierId: string | null;
  quantity: number;
  unitPrice: number | null;
  totalPrice: number | null;
  notes: string | null;
  imageUrls: string[];
  fileUrls: string[];
  createdAt: string;
  createdByName?: string;
}

export interface Expense {
  id: string;
  type: string;
  amount: number;
  currency: string;
  description: string | null;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
}

export interface Supplier {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
}

export interface Customer {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
}

export interface Guest {
  id: string;
  customerId: string | null;
  name: string | null;
  roomId: string | null;
  roomNumber: string | null;
  checkIn: string;
  checkOut: string | null;
  adults: number;
  children: number;
  notes: string | null;
  agreedPrice: number | null;
  status: string;
}
