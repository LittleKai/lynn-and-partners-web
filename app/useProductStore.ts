import { Category, Product, Supplier } from "@/app/types";
import axiosInstance from "@/utils/axiosInstance";
import { create } from "zustand";

interface ProductState {
  allProducts: Product[];
  categories: Category[];
  suppliers: Supplier[];
  isLoading: boolean;
  openDialog: boolean;
  setOpenDialog: (openDialog: boolean) => void;
  openProductDialog: boolean;
  setOpenProductDialog: (openProductDialog: boolean) => void;
  selectedProduct: Product | null;
  setSelectedProduct: (product: Product | null) => void;
  setAllProducts: (allProducts: Product[]) => void;
  loadProducts: () => Promise<void>;
  loadCategories: () => Promise<void>;
  loadSuppliers: () => Promise<void>;
  addProduct: (product: Product) => Promise<{ success: boolean }>;
  updateProduct: (updatedProduct: Product) => Promise<{ success: boolean }>;
  deleteProduct: (productId: string) => Promise<{ success: boolean }>;
  addCategory: (category: Category) => void;
  editCategory: (categoryId: string, newCategoryName: string) => void;
  deleteCategory: (categoryId: string) => void;
  addSupplier: (supplier: Supplier) => void;
  editSupplier: (supplierId: string, newName: string) => void;
  deleteSupplier: (supplierId: string) => void;
}

export const useProductStore = create<ProductState>((set) => ({
  allProducts: [],
  categories: [],
  suppliers: [],
  isLoading: false,
  selectedProduct: null,
  openDialog: false,

  setOpenDialog: (openDialog) => {
    set({ openDialog });
  },

  openProductDialog: false,

  setOpenProductDialog: (openProductDialog) => {
    set({ openProductDialog });
  },

  setSelectedProduct: (product: Product | null) => {
    set({ selectedProduct: product });
  },

  setAllProducts: (allProducts) => {
    set({ allProducts });
  },

  loadProducts: async () => {
    set({ isLoading: true });
    try {
      const response = await axiosInstance.get("/products");
      const products = response.data || [];

      set((state) => {
        if (JSON.stringify(state.allProducts) !== JSON.stringify(products)) {
          return { allProducts: products };
        }
        return state;
      });

      if (process.env.NODE_ENV === "development") {
        console.log("Updated State with Products:", products);
      }
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("Error loading products:", error);
      }
      set({ allProducts: [] });
    } finally {
      set({ isLoading: false });
    }
  },

  addProduct: async (product: Product) => {
    set({ isLoading: true });
    try {
      const response = await axiosInstance.post("/products", product);
      const newProduct = response.data;
      if (process.env.NODE_ENV === "development") {
        console.log("Product added successfully:", newProduct);
      }
      set((state) => ({
        allProducts: [...state.allProducts, newProduct],
      }));
      return { success: true };
    } catch (error) {
      console.error("Error adding product:", error);
      return { success: false };
    } finally {
      set({ isLoading: false });
    }
  },

  updateProduct: async (updatedProduct: Product) => {
    set({ isLoading: true });
    try {
      const response = await axiosInstance.put("/products", updatedProduct);
      const newProduct = response.data;

      set((state) => ({
        allProducts: state.allProducts.map((product) =>
          product.id === newProduct.id ? newProduct : product
        ),
      }));

      if (process.env.NODE_ENV === "development") {
        console.log("Product updated successfully:", newProduct);
      }
      return { success: true };
    } catch (error) {
      console.error("Error updating product:", error);
      return { success: false };
    } finally {
      set({ isLoading: false });
    }
  },

  deleteProduct: async (productId: string) => {
    set({ isLoading: true });
    try {
      const response = await axiosInstance.delete("/products", {
        data: { id: productId },
      });

      if (response.status === 204) {
        set((state) => ({
          allProducts: state.allProducts.filter(
            (product) => product.id !== productId
          ),
        }));
        return { success: true };
      } else {
        throw new Error("Failed to delete product");
      }
    } catch (error) {
      console.error("Error deleting product:", error);
      return { success: false };
    } finally {
      set({ isLoading: false });
    }
  },

  loadCategories: async () => {
    try {
      const response = await axiosInstance.get("/categories");
      set({ categories: response.data });
      if (process.env.NODE_ENV === "development") {
        console.log("Categories loaded successfully:", response.data);
      }
    } catch (error) {
      console.error("Error loading categories:", error);
    }
  },

  addCategory: (category: Category) =>
    set((state) => ({
      categories: [...state.categories, category],
    })),

  editCategory: (categoryId: string, newCategoryName: string) =>
    set((state) => ({
      categories: state.categories.map((category) =>
        category.id === categoryId
          ? { ...category, name: newCategoryName }
          : category
      ),
    })),

  deleteCategory: (categoryId) =>
    set((state) => ({
      categories: state.categories.filter((cat) => cat.id !== categoryId),
    })),

  loadSuppliers: async () => {
    try {
      const response = await axiosInstance.get("/suppliers");
      set({ suppliers: response.data });
      if (process.env.NODE_ENV === "development") {
        console.log("Suppliers loaded successfully:", response.data);
      }
    } catch (error) {
      console.error("Error loading suppliers:", error);
    }
  },

  addSupplier: (supplier: Supplier) =>
    set((state) => ({
      suppliers: [...state.suppliers, supplier],
    })),

  editSupplier: (supplierId: string, newName: string) =>
    set((state) => ({
      suppliers: state.suppliers.map((supplier) =>
        supplier.id === supplierId
          ? { ...supplier, name: newName }
          : supplier
      ),
    })),

  deleteSupplier: (supplierId: string) =>
    set((state) => ({
      suppliers: state.suppliers.filter(
        (supplier) => supplier.id !== supplierId
      ),
    })),
}));
