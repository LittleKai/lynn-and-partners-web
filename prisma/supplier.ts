import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export interface SupplierData {
  name: string;
  locationId: string;
  contactName?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  country?: string;
  taxId?: string;
  businessRegistrationNumber?: string;
  companyName?: string;
  notes?: string;
  paymentTerms?: string;
  contractDate?: Date;
}

export const createSupplier = async (data: SupplierData) => {
  return prisma.supplier.create({ data });
};

export const getSuppliersByLocation = async (locationId: string) => {
  return prisma.supplier.findMany({ where: { locationId } });
};

export const updateSupplier = async (
  id: string,
  data: Partial<Omit<SupplierData, "locationId">>
) => {
  return prisma.supplier.update({ where: { id }, data });
};

export const deleteSupplier = async (id: string) => {
  return prisma.supplier.delete({ where: { id } });
};
