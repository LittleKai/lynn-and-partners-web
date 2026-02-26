"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/app/authContext";
import { useTranslations } from "next-intl";
import axiosInstance from "@/utils/axiosInstance";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AppHeader from "@/app/AppHeader/AppHeader";
import Loading from "@/components/Loading";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatWithDots, parseDots } from "@/utils/formatNumber";

interface Location {
  id: string;
  name: string;
  type: string;
  currency: string;
  description: string | null;
  address: string | null;
}

interface Product {
  id: string;
  name: string;
  sku: string;
  quantity: number;
  price: number;
  status: string;
  imageUrl: string | null;
}

interface Transaction {
  id: string;
  type: "IMPORT" | "EXPORT";
  productId: string;
  supplierId: string | null;
  quantity: number;
  unitPrice: number | null;
  totalPrice: number | null;
  notes: string | null;
  createdAt: string;
}

interface Expense {
  id: string;
  type: string;
  amount: number;
  currency: string;
  description: string | null;
  createdAt: string;
}

interface Category {
  id: string;
  name: string;
}

interface Supplier {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
}

export default function LocationInventoryPage() {
  const params = useParams<{ locationId: string }>();
  const locationId = params?.locationId || "";
  const { isLoggedIn, isInitializing } = useAuth();
  const router = useRouter();
  const t = useTranslations("inventory");
  const { toast } = useToast();

  const [location, setLocation] = useState<Location | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Product creation state
  const [showCreateProduct, setShowCreateProduct] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: "",
    sku: "",
    price: "",
    quantity: "",
    categoryId: "",
    supplierId: "",
  });
  const [isProductSubmitting, setIsProductSubmitting] = useState(false);

  // Supplier state
  const [showAddSupplier, setShowAddSupplier] = useState(false);
  const [newSupplier, setNewSupplier] = useState({
    name: "",
    address: "",
    phone: "",
    email: "",
  });
  const [isSupplierSubmitting, setIsSupplierSubmitting] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [editingSupplierData, setEditingSupplierData] = useState({
    name: "",
    address: "",
    phone: "",
    email: "",
  });

  useEffect(() => {
    if (isInitializing) return;
    if (!isLoggedIn) {
      router.push("/inventory/login");
      return;
    }
    loadData();
  }, [isInitializing, isLoggedIn, locationId]);

  const loadData = async () => {
    try {
      const [locRes, productsRes, txRes, expRes, catRes, supRes] =
        await Promise.allSettled([
          axiosInstance.get(`/admin/locations/${locationId}`),
          axiosInstance.get(`/locations/${locationId}/products`),
          axiosInstance.get(`/locations/${locationId}/transactions`),
          axiosInstance.get(`/locations/${locationId}/expenses`),
          axiosInstance.get(`/locations/${locationId}/categories`),
          axiosInstance.get(`/locations/${locationId}/suppliers`),
        ]);

      if (locRes.status === "fulfilled") setLocation(locRes.value.data.location);
      if (productsRes.status === "fulfilled")
        setProducts(productsRes.value.data.products);
      if (txRes.status === "fulfilled")
        setTransactions(txRes.value.data.transactions);
      if (expRes.status === "fulfilled")
        setExpenses(expRes.value.data.expenses);
      if (catRes.status === "fulfilled")
        setCategories(catRes.value.data.categories);
      if (supRes.status === "fulfilled")
        setSuppliers(supRes.value.data.suppliers);
    } catch {
      // silent
    } finally {
      setIsLoading(false);
    }
  };

  const getProductName = (productId: string) => {
    const p = products.find((p) => p.id === productId);
    return p?.name || "—";
  };

  // ── Product CRUD ──────────────────────────────────────────────────
  const handleCreateProduct = async () => {
    if (!newProduct.name.trim() || !newProduct.sku.trim()) return;
    setIsProductSubmitting(true);
    try {
      const res = await axiosInstance.post(
        `/locations/${locationId}/products`,
        {
          name: newProduct.name.trim(),
          sku: newProduct.sku.trim(),
          price: Number(parseDots(newProduct.price)) || 0,
          quantity: Number(parseDots(newProduct.quantity)) || 0,
          categoryId: newProduct.categoryId || undefined,
          supplierId: newProduct.supplierId || undefined,
          status: "available",
        }
      );
      setProducts((prev) => [res.data.product, ...prev]);
      setNewProduct({ name: "", sku: "", price: "", quantity: "", categoryId: "", supplierId: "" });
      setShowCreateProduct(false);
      toast({ title: t("createItemSuccess") });
    } catch {
      toast({ title: t("createItemFailed"), variant: "destructive" });
    } finally {
      setIsProductSubmitting(false);
    }
  };

  // ── Supplier CRUD ─────────────────────────────────────────────────
  const handleAddSupplier = async () => {
    if (!newSupplier.name.trim()) return;
    setIsSupplierSubmitting(true);
    try {
      const res = await axiosInstance.post(
        `/locations/${locationId}/suppliers`,
        newSupplier
      );
      setSuppliers((prev) => [...prev, res.data.supplier]);
      setNewSupplier({ name: "", address: "", phone: "", email: "" });
      setShowAddSupplier(false);
      toast({ title: t("supplierAdded") });
    } catch {
      toast({ title: t("importFailed"), variant: "destructive" });
    } finally {
      setIsSupplierSubmitting(false);
    }
  };

  const handleUpdateSupplier = async () => {
    if (!editingSupplier || !editingSupplierData.name.trim()) return;
    try {
      const res = await axiosInstance.put(`/locations/${locationId}/suppliers`, {
        supplierId: editingSupplier.id,
        name: editingSupplierData.name.trim(),
        address: editingSupplierData.address || null,
        phone: editingSupplierData.phone || null,
        email: editingSupplierData.email || null,
      });
      setSuppliers((prev) =>
        prev.map((s) => (s.id === editingSupplier.id ? res.data.supplier : s))
      );
      setEditingSupplier(null);
      toast({ title: t("supplierUpdated") });
    } catch {
      toast({ title: t("importFailed"), variant: "destructive" });
    }
  };

  const handleDeleteSupplier = async (id: string) => {
    if (!confirm(t("confirmDelete"))) return;
    try {
      await axiosInstance.delete(
        `/locations/${locationId}/suppliers?supplierId=${id}`
      );
      setSuppliers((prev) => prev.filter((s) => s.id !== id));
      toast({ title: t("supplierDeleted") });
    } catch {
      toast({ title: t("importFailed"), variant: "destructive" });
    }
  };

  if (isInitializing || !isLoggedIn) return <Loading />;
  if (isLoading) return <Loading />;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container mx-auto px-6 py-8 space-y-6">
        <div className="flex items-center gap-3">
          <Link
            href="/inventory"
            className="text-muted-foreground hover:text-foreground text-sm"
          >
            ← {t("backToLocations")}
          </Link>
        </div>

        {location && (
          <div>
            <h2 className="text-2xl font-bold">{location.name}</h2>
            {location.address && (
              <p className="text-sm text-muted-foreground mt-1">
                📌 {location.address}
              </p>
            )}
          </div>
        )}

        <Tabs defaultValue="products">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="products">
              {t("products")} ({products.length})
            </TabsTrigger>
            <TabsTrigger value="transactions">
              {t("transactions")} ({transactions.length})
            </TabsTrigger>
            <TabsTrigger value="expenses">
              {t("expenses")} ({expenses.length})
            </TabsTrigger>
            <TabsTrigger value="suppliers">
              {t("suppliers")} ({suppliers.length})
            </TabsTrigger>
          </TabsList>

          {/* ── Products Tab ── */}
          <TabsContent value="products" className="mt-4">
            <div className="flex justify-end gap-2 mb-4">
              <Button onClick={() => setShowCreateProduct(true)}>
                + {t("newItem")}
              </Button>
              <Link href={`/inventory/${locationId}/import`}>
                <Button variant="outline">{t("importStock")}</Button>
              </Link>
              <Link href={`/inventory/${locationId}/export`}>
                <Button variant="outline">{t("exportStock")}</Button>
              </Link>
            </div>
            {products.length === 0 ? (
              <p className="text-muted-foreground">{t("noProducts")}</p>
            ) : (
              <div className="rounded-xl border overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium">
                        {t("productName")}
                      </th>
                      <th className="px-4 py-3 text-left font-medium">SKU</th>
                      <th className="px-4 py-3 text-right font-medium">
                        {t("quantity")}
                      </th>
                      <th className="px-4 py-3 text-right font-medium">
                        {t("price")}
                      </th>
                      <th className="px-4 py-3 text-left font-medium">
                        {t("status")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((p) => (
                      <tr key={p.id} className="border-t hover:bg-muted/50">
                        <td className="px-4 py-3">{p.name}</td>
                        <td className="px-4 py-3 font-mono text-xs">{p.sku}</td>
                        <td className="px-4 py-3 text-right">
                          {p.quantity.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {p.price.toLocaleString()}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`text-xs px-2 py-1 rounded-full ${
                              p.status === "available"
                                ? "bg-green-100 text-green-800"
                                : p.status === "stockLow"
                                ? "bg-orange-100 text-orange-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {p.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>

          {/* ── Transactions Tab ── */}
          <TabsContent value="transactions" className="mt-4">
            <div className="flex justify-end gap-2 mb-4">
              <Link href={`/inventory/${locationId}/import`}>
                <Button size="sm">{t("newImport")}</Button>
              </Link>
              <Link href={`/inventory/${locationId}/export`}>
                <Button variant="outline" size="sm">
                  {t("newExport")}
                </Button>
              </Link>
            </div>
            {transactions.length === 0 ? (
              <p className="text-muted-foreground">{t("noTransactions")}</p>
            ) : (
              <div className="rounded-xl border overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium">
                        {t("type")}
                      </th>
                      <th className="px-4 py-3 text-left font-medium">
                        {t("productName")}
                      </th>
                      <th className="px-4 py-3 text-right font-medium">
                        {t("quantity")}
                      </th>
                      <th className="px-4 py-3 text-right font-medium">
                        {t("unitPrice")}
                      </th>
                      <th className="px-4 py-3 text-right font-medium">
                        {t("totalPrice")}
                      </th>
                      <th className="px-4 py-3 text-left font-medium">
                        {t("notes")}
                      </th>
                      <th className="px-4 py-3 text-left font-medium">
                        {t("date")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((tx) => (
                      <tr key={tx.id} className="border-t hover:bg-muted/50">
                        <td className="px-4 py-3">
                          <span
                            className={`text-xs px-2 py-1 rounded-full font-medium ${
                              tx.type === "IMPORT"
                                ? "bg-green-100 text-green-800"
                                : "bg-orange-100 text-orange-800"
                            }`}
                          >
                            {tx.type}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-medium">
                          {getProductName(tx.productId)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {tx.quantity.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right font-mono">
                          {tx.unitPrice ? tx.unitPrice.toLocaleString() : "—"}
                        </td>
                        <td className="px-4 py-3 text-right font-mono">
                          {tx.totalPrice ? tx.totalPrice.toLocaleString() : "—"}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {tx.notes || "—"}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                          {new Date(tx.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>

          {/* ── Expenses Tab ── */}
          <TabsContent value="expenses" className="mt-4">
            <div className="flex justify-end mb-4">
              <Link href={`/inventory/${locationId}/expenses/new`}>
                <Button size="sm">{t("addExpense")}</Button>
              </Link>
            </div>
            {expenses.length === 0 ? (
              <p className="text-muted-foreground">{t("noExpenses")}</p>
            ) : (
              <div className="rounded-xl border overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium">
                        {t("type")}
                      </th>
                      <th className="px-4 py-3 text-right font-medium">
                        {t("amount")}
                      </th>
                      <th className="px-4 py-3 text-left font-medium">
                        {t("description")}
                      </th>
                      <th className="px-4 py-3 text-left font-medium">
                        {t("date")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.map((exp) => (
                      <tr key={exp.id} className="border-t hover:bg-muted/50">
                        <td className="px-4 py-3 capitalize">{exp.type}</td>
                        <td className="px-4 py-3 text-right font-mono">
                          {exp.amount.toLocaleString()}{" "}
                          {exp.currency || "VND"}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {exp.description || "—"}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                          {new Date(exp.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>

          {/* ── Suppliers Tab ── */}
          <TabsContent value="suppliers" className="mt-4 space-y-4">
            {!showAddSupplier ? (
              <Button onClick={() => setShowAddSupplier(true)}>
                + {t("addSupplier")}
              </Button>
            ) : (
              <div className="rounded-xl border p-4 space-y-3">
                <Input
                  placeholder={`${t("supplierName")} *`}
                  value={newSupplier.name}
                  onChange={(e) =>
                    setNewSupplier((f) => ({ ...f, name: e.target.value }))
                  }
                />
                <Input
                  placeholder={t("supplierCompany")}
                  value={newSupplier.address}
                  onChange={(e) =>
                    setNewSupplier((f) => ({
                      ...f,
                      address: e.target.value,
                    }))
                  }
                />
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    placeholder={t("phone")}
                    value={newSupplier.phone}
                    onChange={(e) =>
                      setNewSupplier((f) => ({ ...f, phone: e.target.value }))
                    }
                  />
                  <Input
                    placeholder={t("email")}
                    type="email"
                    value={newSupplier.email}
                    onChange={(e) =>
                      setNewSupplier((f) => ({ ...f, email: e.target.value }))
                    }
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => setShowAddSupplier(false)}
                  >
                    ✕
                  </Button>
                  <Button
                    onClick={handleAddSupplier}
                    disabled={
                      isSupplierSubmitting || !newSupplier.name.trim()
                    }
                  >
                    {isSupplierSubmitting ? t("submitting") : t("addSupplier")}
                  </Button>
                </div>
              </div>
            )}

            {suppliers.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                {t("noSuppliers")}
              </p>
            ) : (
              <div className="rounded-xl border overflow-hidden">
                {suppliers.map((s) => (
                  <div
                    key={s.id}
                    className="px-4 py-3 border-b last:border-b-0 hover:bg-muted/40"
                  >
                    {editingSupplier?.id === s.id ? (
                      <div className="space-y-2">
                        <Input
                          value={editingSupplierData.name}
                          onChange={(e) =>
                            setEditingSupplierData((f) => ({
                              ...f,
                              name: e.target.value,
                            }))
                          }
                          placeholder={`${t("supplierName")} *`}
                          className="h-8 text-sm"
                          autoFocus
                        />
                        <Input
                          value={editingSupplierData.address}
                          onChange={(e) =>
                            setEditingSupplierData((f) => ({
                              ...f,
                              address: e.target.value,
                            }))
                          }
                          placeholder={t("supplierCompany")}
                          className="h-8 text-sm"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <Input
                            value={editingSupplierData.phone}
                            onChange={(e) =>
                              setEditingSupplierData((f) => ({
                                ...f,
                                phone: e.target.value,
                              }))
                            }
                            placeholder={t("phone")}
                            className="h-8 text-sm"
                          />
                          <Input
                            value={editingSupplierData.email}
                            onChange={(e) =>
                              setEditingSupplierData((f) => ({
                                ...f,
                                email: e.target.value,
                              }))
                            }
                            placeholder={t("email")}
                            type="email"
                            className="h-8 text-sm"
                          />
                        </div>
                        <div className="flex gap-2 justify-end">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingSupplier(null)}
                          >
                            ✕
                          </Button>
                          <Button
                            size="sm"
                            onClick={handleUpdateSupplier}
                            disabled={!editingSupplierData.name.trim()}
                          >
                            ✓
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">{s.name}</p>
                          {s.address && (
                            <p className="text-xs text-muted-foreground">
                              📍 {s.address}
                            </p>
                          )}
                          <div className="flex gap-3 text-xs text-muted-foreground mt-0.5">
                            {s.phone && <span>📞 {s.phone}</span>}
                            {s.email && <span>✉️ {s.email}</span>}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingSupplier(s);
                              setEditingSupplierData({
                                name: s.name,
                                address: s.address || "",
                                phone: s.phone || "",
                                email: s.email || "",
                              });
                            }}
                          >
                            ✏️
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive"
                            onClick={() => handleDeleteSupplier(s.id)}
                          >
                            🗑️
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* ── Create Item Dialog ── */}
      <Dialog open={showCreateProduct} onOpenChange={setShowCreateProduct}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>+ {t("newItem")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <label className="text-sm font-medium mb-1 block">
                {t("itemName")} *
              </label>
              <Input
                value={newProduct.name}
                onChange={(e) =>
                  setNewProduct((f) => ({ ...f, name: e.target.value }))
                }
                autoFocus
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">
                {t("sku")} *
              </label>
              <Input
                value={newProduct.sku}
                onChange={(e) =>
                  setNewProduct((f) => ({ ...f, sku: e.target.value }))
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">
                  {t("price")}
                </label>
                <Input
                  type="text"
                  inputMode="numeric"
                  value={newProduct.price}
                  onChange={(e) =>
                    setNewProduct((f) => ({
                      ...f,
                      price: formatWithDots(e.target.value),
                    }))
                  }
                  placeholder="0"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">
                  {t("quantity")}
                </label>
                <Input
                  type="text"
                  inputMode="numeric"
                  value={newProduct.quantity}
                  onChange={(e) =>
                    setNewProduct((f) => ({
                      ...f,
                      quantity: formatWithDots(e.target.value),
                    }))
                  }
                  placeholder="0"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">
                {t("categories")}
              </label>
              <Select
                value={newProduct.categoryId}
                onValueChange={(v) =>
                  setNewProduct((f) => ({ ...f, categoryId: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("selectCategory")} />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">
                {t("supplier")}
              </label>
              <Select
                value={newProduct.supplierId}
                onValueChange={(v) =>
                  setNewProduct((f) => ({ ...f, supplierId: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("selectSupplier")} />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button
                variant="outline"
                onClick={() => setShowCreateProduct(false)}
              >
                ✕
              </Button>
              <Button
                onClick={handleCreateProduct}
                disabled={
                  isProductSubmitting ||
                  !newProduct.name.trim() ||
                  !newProduct.sku.trim()
                }
              >
                {isProductSubmitting ? t("submitting") : t("newItem")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
