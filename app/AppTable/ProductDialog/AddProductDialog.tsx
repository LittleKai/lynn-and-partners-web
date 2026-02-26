/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useProductStore } from "@/app/useProductStore";
import { useToast } from "@/hooks/use-toast";
import ProductName from "./_components/ProductName";
import SKU from "./_components/SKU";
import Quantity from "./_components/Quantity";
import Price from "./_components/Price";
import { Product } from "@/app/types";
import { useTranslations } from "next-intl";

const ProductSchema = z.object({
  productName: z
    .string()
    .min(1, "Product Name is required")
    .max(100, "Product Name must be 100 characters or less"),
  sku: z
    .string()
    .min(1, "SKU is required")
    .regex(/^[a-zA-Z0-9-_]+$/, "SKU must be alphanumeric"),
  quantity: z
    .number()
    .int("Quantity must be an integer")
    .nonnegative("Quantity cannot be negative"),
  price: z.number().nonnegative("Price cannot be negative"),
});

interface ProductFormData {
  productName: string;
  sku: string;
  quantity: number;
  price: number;
}

interface AddProductDialogProps {
  allProducts: Product[];
  userId: string;
}

export default function AddProductDialog({
  allProducts,
  userId,
}: AddProductDialogProps) {
  const methods = useForm<ProductFormData>({
    resolver: zodResolver(ProductSchema),
    defaultValues: {
      productName: "",
      sku: "",
      quantity: 0,
      price: 0.0,
    },
  });

  const { reset } = methods;

  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedSupplier, setSelectedSupplier] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const dialogCloseRef = useRef<HTMLButtonElement | null>(null);

  const t = useTranslations("product");

  const {
    isLoading,
    setOpenProductDialog,
    openProductDialog,
    setSelectedProduct,
    selectedProduct,
    addProduct,
    updateProduct,
    loadProducts,
    categories,
    suppliers,
  } = useProductStore();
  const { toast } = useToast();

  useEffect(() => {
    if (selectedProduct) {
      reset({
        productName: selectedProduct.name,
        sku: selectedProduct.sku,
        quantity: selectedProduct.quantity,
        price: selectedProduct.price,
      });
      setSelectedCategory(selectedProduct.categoryId || "");
      setSelectedSupplier(selectedProduct.supplierId || "");
    } else {
      reset({
        productName: "",
        sku: "",
        quantity: 0,
        price: 0.0,
      });
      setSelectedCategory("");
      setSelectedSupplier("");
    }
  }, [selectedProduct, openProductDialog, reset]);

  const calculateStatus = (quantity: number): string => {
    if (quantity > 20) return "Available";
    if (quantity > 0 && quantity <= 20) return "Stock Low";
    return "Stock Out";
  };

  const onSubmit = async (data: ProductFormData) => {
    setIsSubmitting(true);
    const status: Product["status"] = calculateStatus(data.quantity);

    try {
      if (!selectedProduct) {
        const newProduct: Product = {
          id: Date.now().toString(),
          supplierId: selectedSupplier,
          name: data.productName,
          price: data.price,
          quantity: data.quantity,
          sku: data.sku,
          status,
          categoryId: selectedCategory,
          createdAt: new Date(),
          userId: userId,
        };

        const result = await addProduct(newProduct);

        if (result.success) {
          toast({
            title: t("createSuccess"),
            description: `"${data.productName}" ${t("createSuccessDesc")}`,
          });
          dialogCloseRef.current?.click();
          loadProducts();
          setOpenProductDialog(false);
        } else {
          toast({
            title: t("createFailed"),
            description: t("createFailedDesc"),
            variant: "destructive",
          });
        }
      } else {
        const productToUpdate: Product = {
          id: selectedProduct.id,
          createdAt: new Date(selectedProduct.createdAt),
          supplierId: selectedSupplier,
          name: data.productName,
          price: data.price,
          quantity: data.quantity,
          sku: data.sku,
          status,
          categoryId: selectedCategory,
          userId: selectedProduct.userId,
        };

        const result = await updateProduct(productToUpdate);
        if (result.success) {
          toast({
            title: t("updateSuccess"),
            description: `"${data.productName}" ${t("updateSuccessDesc")}`,
          });
          loadProducts();
          setOpenProductDialog(false);
        } else {
          toast({
            title: t("updateFailed"),
            description: t("updateFailedDesc"),
            variant: "destructive",
          });
        }
      }
    } catch (error: any) {
      toast({
        title: t("operationFailed"),
        description: t("operationFailedDesc"),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setSelectedProduct(null);
    }
    setOpenProductDialog(open);
  };

  return (
    <Dialog open={openProductDialog} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="h-10 font-semibold">{t("addProduct")}</Button>
      </DialogTrigger>
      <DialogContent
        className="p-4 sm:p-7 sm:px-8 poppins max-h-[90vh] overflow-y-auto"
        aria-describedby="dialog-description"
      >
        <DialogHeader>
          <DialogTitle className="text-[22px]">
            {selectedProduct ? t("updateProduct") : t("addProduct")}
          </DialogTitle>
        </DialogHeader>
        <DialogDescription id="dialog-description">
          {t("productDetails")}
        </DialogDescription>
        <FormProvider {...methods}>
          <form onSubmit={methods.handleSubmit(onSubmit)}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <ProductName />
              <SKU allProducts={allProducts} />
              <Quantity />
              <Price />
              <div>
                <label htmlFor="category" className="block text-sm font-medium">
                  {t("category")}
                </label>
                <select
                  id="category"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="mt-1 h-11 block w-full rounded-md border-gray-300 shadow-md focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                >
                  <option value="">{t("selectCategory")}</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="supplier" className="block text-sm font-medium">
                  {t("supplier")}
                </label>
                <select
                  id="supplier"
                  value={selectedSupplier}
                  onChange={(e) => setSelectedSupplier(e.target.value)}
                  className="mt-1 h-11 block w-full rounded-md border-gray-300 shadow-md focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                >
                  <option value="">{t("selectSupplier")}</option>
                  {suppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>
                      {(supplier as any).companyName || supplier.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <DialogFooter className="mt-9 mb-4 flex flex-col sm:flex-row items-center gap-4">
              <DialogClose asChild>
                <Button
                  ref={dialogCloseRef}
                  variant="secondary"
                  className="h-11 w-full sm:w-auto px-11"
                >
                  Cancel
                </Button>
              </DialogClose>
              <Button
                type="submit"
                className="h-11 w-full sm:w-auto px-11"
                isLoading={isSubmitting}
              >
                {isSubmitting
                  ? t("loading")
                  : selectedProduct
                  ? t("updateProduct")
                  : t("addProduct")}
              </Button>
            </DialogFooter>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}
