export interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  quantity: number;
  status?: string;
  createdAt: Date;
  userId: string;
  categoryId: string;
  supplierId: string;
  category?: string;
  supplier?: string;
}

export interface Supplier {
  id: string;
  name: string;
  userId: string;
  // Contact
  contactName?: string;
  phone?: string;
  email?: string;
  // Address
  address?: string;
  city?: string;
  country?: string;
  // Business
  taxId?: string;
  businessRegistrationNumber?: string;
  companyName?: string;
  // Notes / Contract
  notes?: string;
  paymentTerms?: string;
  contractDate?: string;
}

export interface Category {
  id: string;
  name: string;
  userId: string;
}
