import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const createCategory = async (data: {
  name: string;
  locationId: string;
}) => {
  return prisma.category.create({ data });
};

export const getCategoriesByLocation = async (locationId: string) => {
  return prisma.category.findMany({ where: { locationId } });
};

export const updateCategory = async (id: string, data: { name?: string }) => {
  return prisma.category.update({ where: { id }, data });
};

export const deleteCategory = async (id: string) => {
  return prisma.category.delete({ where: { id } });
};
