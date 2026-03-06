"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import axiosInstance from "@/utils/axiosInstance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FloatLabelInput } from "@/components/ui/float-label-input";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { ImportStockDialog } from "./dialogs/ImportStockDialog";
import { ImagePreviewDialog } from "@/components/ui/image-preview-dialog";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import type {
  Location,
  Product,
  Transaction,
  Supplier,
  Customer,
  SaleOrder,
  HistoryEntry,
} from "../_types";

interface ItemsTabProps {
  branchId: string;
  location: Location | null;
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  transactions: Transaction[];
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  suppliers: Supplier[];
  setSuppliers: React.Dispatch<React.SetStateAction<Supplier[]>>;
  orders: SaleOrder[];
  customers: Customer[];
  isAdmin: boolean;
  canManageProducts: boolean;
}

export function ItemsTab({
  branchId,
  location,
  products,
  setProducts,
  transactions,
  setTransactions,
  suppliers,
  setSuppliers,
  orders,
  customers,
  isAdmin,
  canManageProducts,
}: ItemsTabProps) {
  const t = useTranslations("inventory");
  const { toast } = useToast();

  // ── Filters & sort ────────────────────────────────────────────────
  const [productSearch, setProductSearch] = useState("");
  const [productStatusFilter, setProductStatusFilter] = useState("ALL");
  const [productSort, setProductSort] = useState("name_asc");
  const [supplierSearch, setSupplierSearch] = useState("");
  const [supplierSort, setSupplierSort] = useState("name_asc");

  // ── Product creation state ─────────────────────────────────────────
  const [showCreateProduct, setShowCreateProduct] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: "", sku: "", unit: "" });
  const [isProductSubmitting, setIsProductSubmitting] = useState(false);

  // ── Supplier state ─────────────────────────────────────────────────
  const [showAddSupplier, setShowAddSupplier] = useState(false);
  const [newSupplier, setNewSupplier] = useState({ name: "", address: "", phone: "", email: "", notes: "" });
  const [isSupplierSubmitting, setIsSupplierSubmitting] = useState(false);
  const [isUpdatingSupplier, setIsUpdatingSupplier] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [editingSupplierData, setEditingSupplierData] = useState({ name: "", address: "", phone: "", email: "", notes: "" });

  // ── Product history dialog ─────────────────────────────────────────
  const [historyProduct, setHistoryProduct] = useState<Product | null>(null);
  const [historyTypeFilter, setHistoryTypeFilter] = useState("ALL");
  const [previewImages, setPreviewImages] = useState<string[]>([]);
  const [previewIndex, setPreviewIndex] = useState(0);

  // ── Delete product confirmation ────────────────────────────────────
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const [deletingSupplier, setDeletingSupplier] = useState<Supplier | null>(null);

  // ── Deactivate confirmation ─────────────────────────────────────────
  const [deactivatingProduct, setDeactivatingProduct] = useState<Product | null>(null);
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [activatingProductId, setActivatingProductId] = useState<string | null>(null);

  // ── Export dialog ────────────────────────────────────────────────────
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [exportForm, setExportForm] = useState({ productId: "", quantity: "1", unitPrice: "", notes: "" });
  const [isExportSubmitting, setIsExportSubmitting] = useState(false);

  // ── Import dialog ─────────────────────────────────────────────────
  const [showImportDialog, setShowImportDialog] = useState(false);

  // ── Filtered & sorted lists ───────────────────────────────────────
  const filteredProducts = useMemo(() => {
    let list = products.filter((p) => {
      const q = productSearch.toLowerCase();
      const matchSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q);
      const matchStatus =
        productStatusFilter === "ALL" || p.status === productStatusFilter;
      return matchSearch && matchStatus;
    });

    const [field, dir] = productSort.split("_");
    list = [...list].sort((a, b) => {
      if (field === "name")
        return dir === "asc"
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name);
      if (field === "quantity")
        return dir === "asc"
          ? a.quantity - b.quantity
          : b.quantity - a.quantity;
      if (field === "price")
        return dir === "asc" ? a.price - b.price : b.price - a.price;
      return 0;
    });
    return list;
  }, [products, productSearch, productStatusFilter, productSort]);

  const filteredSuppliers = useMemo(() => {
    let list = suppliers.filter(
      (s) =>
        !supplierSearch ||
        s.name.toLowerCase().includes(supplierSearch.toLowerCase())
    );
    list = [...list].sort((a, b) =>
      supplierSort === "name_asc"
        ? a.name.localeCompare(b.name)
        : b.name.localeCompare(a.name)
    );
    return list;
  }, [suppliers, supplierSearch, supplierSort]);

  const getSupplierName = (supplierId: string | null) => {
    if (!supplierId) return null;
    const s = suppliers.find((s) => s.id === supplierId);
    return s?.name || null;
  };

  const productHistoryEntries = useMemo((): HistoryEntry[] => {
    if (!historyProduct) return [];

    const txEntries: HistoryEntry[] = transactions
      .filter((tx) => tx.productId === historyProduct.id)
      .map((tx) => ({
        kind: "tx" as const,
        id: tx.id,
        date: tx.createdAt,
        type: tx.type,
        quantity: tx.quantity,
        unitPrice: tx.unitPrice,
        totalPrice: tx.totalPrice,
        notes: tx.notes,
        supplierId: tx.supplierId,
        imageUrls: tx.imageUrls,
        fileUrls: tx.fileUrls,
        createdByName: tx.createdByName,
      }));

    const saleEntries: HistoryEntry[] = orders.flatMap((o) =>
      o.items
        .filter((item) => item.productId === historyProduct.id)
        .map((item) => ({
          kind: "sale" as const,
          id: `${o.id}-${item.productId}`,
          date: o.createdAt,
          quantity: item.quantity,
          salePrice: item.salePrice,
          totalPrice: item.totalPrice,
          notes: o.notes,
          orderId: o.id,
          customerName: o.customerId
            ? customers.find((c) => c.id === o.customerId)?.name || "—"
            : "—",
          createdByName: o.createdByName,
        }))
    );

    const all = [...txEntries, ...saleEntries];
    return all
      .filter((entry) => {
        if (historyTypeFilter === "ALL") return true;
        if (historyTypeFilter === "SALE") return entry.kind === "sale";
        if (entry.kind === "tx") return entry.type === historyTypeFilter;
        return false;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [historyProduct, historyTypeFilter, transactions, orders, customers]);

  // ── Product CRUD ──────────────────────────────────────────────────
  const handleCreateProduct = async () => {
    if (!newProduct.name.trim()) return;
    setIsProductSubmitting(true);
    try {
      const res = await axiosInstance.post(`/locations/${branchId}/products`, {
        name: newProduct.name.trim(),
        sku: newProduct.sku.trim(),
        unit: newProduct.unit.trim() || null,
        price: 0,
        quantity: 0,
        status: "available",
      });
      setProducts((prev) => [res.data.product, ...prev]);
      setNewProduct({ name: "", sku: "", unit: "" });
      setShowCreateProduct(false);
      toast({ title: t("createItemSuccess") });
    } catch {
      toast({ title: t("createItemFailed"), variant: "destructive" });
    } finally {
      setIsProductSubmitting(false);
    }
  };

  const handleToggleActive = (p: Product) => {
    if (p.status !== "inactive") {
      setDeactivatingProduct(p);
    } else {
      handleActivateProduct(p);
    }
  };

  const handleActivateProduct = async (p: Product) => {
    setActivatingProductId(p.id);
    try {
      await axiosInstance.put(`/locations/${branchId}/products/${p.id}`, {
        status: "available",
      });
      setProducts((prev) =>
        prev.map((x) => (x.id === p.id ? { ...x, status: "available" } : x))
      );
      toast({ title: t("activate") });
    } catch {
      toast({ title: t("importFailed"), variant: "destructive" });
    } finally {
      setActivatingProductId(null);
    }
  };

  const handleConfirmDeactivate = async () => {
    if (!deactivatingProduct) return;
    setIsDeactivating(true);
    try {
      await axiosInstance.put(
        `/locations/${branchId}/products/${deactivatingProduct.id}`,
        { status: "inactive" }
      );
      setProducts((prev) =>
        prev.map((x) =>
          x.id === deactivatingProduct.id ? { ...x, status: "inactive" } : x
        )
      );
      setDeactivatingProduct(null);
      toast({ title: t("deactivate") });
    } catch {
      toast({ title: t("importFailed"), variant: "destructive" });
    } finally {
      setIsDeactivating(false);
    }
  };

  const handleExportDialogSubmit = async () => {
    if (!exportForm.productId || Number(exportForm.quantity) < 1) return;
    if (!exportForm.notes.trim()) {
      toast({ title: t("notesRequired"), variant: "destructive" });
      return;
    }
    setIsExportSubmitting(true);
    try {
      const qty = Number(exportForm.quantity);
      const unitPrice = exportForm.unitPrice ? Number(exportForm.unitPrice) : undefined;
      const res = await axiosInstance.post(`/locations/${branchId}/transactions`, {
        type: "EXPORT",
        productId: exportForm.productId,
        quantity: qty,
        unitPrice: unitPrice || undefined,
        totalPrice: unitPrice ? unitPrice * qty : undefined,
        notes: exportForm.notes.trim(),
      });
      const newTx = res.data.transaction;
      setTransactions((prev) => [newTx, ...prev]);
      setProducts((prev) =>
        prev.map((p) =>
          p.id === exportForm.productId
            ? { ...p, quantity: p.quantity - qty }
            : p
        )
      );
      setShowExportDialog(false);
      setExportForm({ productId: "", quantity: "1", unitPrice: "", notes: "" });
      toast({ title: t("exportSuccess") });
    } catch {
      toast({ title: t("exportFailed"), variant: "destructive" });
    } finally {
      setIsExportSubmitting(false);
    }
  };

  const handleDeleteProduct = async () => {
    if (!deletingProduct) return;
    try {
      await axiosInstance.delete(`/locations/${branchId}/products/${deletingProduct.id}`);
      setProducts((prev) => prev.filter((p) => p.id !== deletingProduct.id));
      setDeletingProduct(null);
      toast({ title: t("deleteProductSuccess") });
    } catch {
      toast({ title: t("deleteProductFailed"), variant: "destructive" });
    }
  };

  // ── Supplier CRUD ─────────────────────────────────────────────────
  const handleAddSupplier = async () => {
    if (!newSupplier.name.trim()) return;
    setIsSupplierSubmitting(true);
    try {
      const res = await axiosInstance.post(`/locations/${branchId}/suppliers`, {
        name: newSupplier.name.trim(),
        address: newSupplier.address || undefined,
        phone: newSupplier.phone || undefined,
        email: newSupplier.email || undefined,
        notes: newSupplier.notes || undefined,
      });
      setSuppliers((prev) => [...prev, res.data.supplier]);
      setNewSupplier({ name: "", address: "", phone: "", email: "", notes: "" });
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
    setIsUpdatingSupplier(true);
    try {
      const res = await axiosInstance.put(`/locations/${branchId}/suppliers`, {
        supplierId: editingSupplier.id,
        name: editingSupplierData.name.trim(),
        address: editingSupplierData.address || null,
        phone: editingSupplierData.phone || null,
        email: editingSupplierData.email || null,
        notes: editingSupplierData.notes || null,
      });
      setSuppliers((prev) =>
        prev.map((s) => (s.id === editingSupplier.id ? res.data.supplier : s))
      );
      setEditingSupplier(null);
      toast({ title: t("supplierUpdated") });
    } catch {
      toast({ title: t("importFailed"), variant: "destructive" });
    } finally {
      setIsUpdatingSupplier(false);
    }
  };

  const doDeleteSupplier = async () => {
    if (!deletingSupplier) return;
    try {
      await axiosInstance.delete(`/locations/${branchId}/suppliers?supplierId=${deletingSupplier.id}`);
      setSuppliers((prev) => prev.filter((s) => s.id !== deletingSupplier.id));
      setDeletingSupplier(null);
      toast({ title: t("supplierDeleted") });
    } catch {
      toast({ title: t("importFailed"), variant: "destructive" });
    }
  };

  const openImportDialog = () => {
    setShowImportDialog(true);
  };

  return (
    <>
      <Tabs defaultValue="itemList">
        <TabsList>
          <TabsTrigger value="itemList">{t("itemList")}</TabsTrigger>
          <TabsTrigger value="suppliers">
            {t("suppliers")} ({suppliers.length})
          </TabsTrigger>
        </TabsList>

        {/* Item List sub-tab */}
        <TabsContent value="itemList" className="mt-4 space-y-3">
          <div className="flex justify-end gap-2">
            <Button onClick={() => setShowCreateProduct(true)}>
              + {t("newItem")}
            </Button>
            <Button variant="outline" onClick={openImportDialog}>
              {t("importStock")}
            </Button>
            {canManageProducts && (
              <Button
                variant="outline"
                onClick={() => {
                  setExportForm({ productId: "", quantity: "1", unitPrice: "", notes: "" });
                  setShowExportDialog(true);
                }}
              >
                {t("exportStock")}
              </Button>
            )}
          </div>

          {/* Filter bar */}
          <div className="flex flex-wrap gap-2">
            <Input
              className="flex-1 min-w-[180px]"
              placeholder={t("searchProduct")}
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
            />
            <Select value={productStatusFilter} onValueChange={setProductStatusFilter}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">
                  {t("all")} {t("status")}
                </SelectItem>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="stockLow">Stock Low</SelectItem>
                <SelectItem value="stockOut">Stock Out</SelectItem>
                <SelectItem value="inactive">{t("statusInactive")}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={productSort} onValueChange={setProductSort}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name_asc">{t("productName")} ↑</SelectItem>
                <SelectItem value="name_desc">{t("productName")} ↓</SelectItem>
                <SelectItem value="quantity_asc">{t("quantity")} ↑</SelectItem>
                <SelectItem value="quantity_desc">{t("quantity")} ↓</SelectItem>
                <SelectItem value="price_asc">{t("price")} ↑</SelectItem>
                <SelectItem value="price_desc">{t("price")} ↓</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {filteredProducts.length === 0 ? (
            <p className="text-muted-foreground">{t("noProducts")}</p>
          ) : (
            <div className="rounded-xl border overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">{t("productName")}</th>
                    <th className="px-4 py-3 text-left font-medium">SKU</th>
                    <th className="px-4 py-3 text-center font-medium">{t("unit")}</th>
                    <th className="px-4 py-3 text-right font-medium">{t("quantity")}</th>
                    <th className="px-4 py-3 text-right font-medium">
                      {t("price")} ({location?.currency || "VND"})
                    </th>
                    <th className="px-4 py-3 text-left font-medium">{t("status")}</th>
                    <th className="px-4 py-3 text-right font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((p) => (
                    <tr key={p.id} className="border-t hover:bg-muted/50">
                      <td className="px-4 py-3 font-medium">{p.name}</td>
                      <td className="px-4 py-3 font-mono text-xs">{p.sku}</td>
                      <td className="px-4 py-3 text-center text-xs text-muted-foreground">
                        {p.unit || "—"}
                      </td>
                      <td className="px-4 py-3 text-right">{p.quantity.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right">{p.price.toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs px-2 py-1 rounded-full font-medium ${
                            p.status === "inactive"
                              ? "bg-gray-100 text-gray-500"
                              : p.status === "available"
                              ? "bg-green-100 text-green-800"
                              : p.status === "stockLow"
                              ? "bg-orange-100 text-orange-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {p.status === "inactive" ? t("statusInactive") : p.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex gap-1 justify-end flex-wrap">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs"
                            onClick={() => {
                              setHistoryProduct(p);
                              setHistoryTypeFilter("ALL");
                            }}
                          >
                            📋 {t("viewHistory")}
                          </Button>
                          {canManageProducts && (
                            <>
                              <Button
                                variant={p.status === "inactive" ? "outline" : "ghost"}
                                size="sm"
                                className={`h-7 px-2 text-xs ${
                                  p.status === "inactive"
                                    ? "text-green-700 border-green-300 hover:bg-green-50"
                                    : "text-destructive hover:text-destructive"
                                }`}
                                onClick={() => handleToggleActive(p)}
                                disabled={activatingProductId === p.id}
                              >
                                {activatingProductId === p.id ? "..." : p.status === "inactive" ? t("activate") : t("deactivate")}
                              </Button>
                              {isAdmin && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                                  onClick={() => {
                                    setDeletingProduct(p);
                                    setDeleteProductConfirmName("");
                                  }}
                                >
                                  🗑️
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        {/* Suppliers sub-tab */}
        <TabsContent value="suppliers" className="mt-4 space-y-4">
          {!showAddSupplier ? (
            <Button onClick={() => setShowAddSupplier(true)}>
              + {t("addSupplier")}
            </Button>
          ) : (
            <div className="rounded-xl border p-4 space-y-3">
              <FloatLabelInput
                label={`${t("supplierName")} *`}
                value={newSupplier.name}
                onChange={(e) => setNewSupplier((f) => ({ ...f, name: e.target.value }))}
                autoFocus
              />
              <FloatLabelInput
                label={t("supplierCompany")}
                value={newSupplier.address}
                onChange={(e) => setNewSupplier((f) => ({ ...f, address: e.target.value }))}
              />
              <div className="grid grid-cols-2 gap-3">
                <FloatLabelInput
                  label={t("phone")}
                  value={newSupplier.phone}
                  onChange={(e) => setNewSupplier((f) => ({ ...f, phone: e.target.value }))}
                />
                <FloatLabelInput
                  label={t("email")}
                  type="email"
                  value={newSupplier.email}
                  onChange={(e) => setNewSupplier((f) => ({ ...f, email: e.target.value }))}
                />
              </div>
              <FloatLabelInput
                label={t("notes")}
                value={newSupplier.notes}
                onChange={(e) => setNewSupplier((f) => ({ ...f, notes: e.target.value }))}
              />
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowAddSupplier(false)}>✕</Button>
                <Button
                  onClick={handleAddSupplier}
                  disabled={isSupplierSubmitting || !newSupplier.name.trim()}
                >
                  {isSupplierSubmitting ? t("submitting") : t("addSupplier")}
                </Button>
              </div>
            </div>
          )}
          <div className="flex gap-2">
            <Input
              className="flex-1"
              placeholder={`${t("suppliers")}...`}
              value={supplierSearch}
              onChange={(e) => setSupplierSearch(e.target.value)}
            />
            <Select value={supplierSort} onValueChange={setSupplierSort}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name_asc">A → Z</SelectItem>
                <SelectItem value="name_desc">Z → A</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {filteredSuppliers.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t("noSuppliers")}</p>
          ) : (
            <div className="rounded-xl border overflow-hidden">
              {filteredSuppliers.map((s) => (
                <div key={s.id} className="px-4 py-3 border-b last:border-b-0 hover:bg-muted/40">
                  {editingSupplier?.id === s.id ? (
                    <div className="space-y-2">
                      <FloatLabelInput
                        inputSize="sm"
                        label={`${t("supplierName")} *`}
                        value={editingSupplierData.name}
                        onChange={(e) =>
                          setEditingSupplierData((f) => ({ ...f, name: e.target.value }))
                        }
                        autoFocus
                      />
                      <FloatLabelInput
                        inputSize="sm"
                        label={t("supplierCompany")}
                        value={editingSupplierData.address}
                        onChange={(e) =>
                          setEditingSupplierData((f) => ({ ...f, address: e.target.value }))
                        }
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <FloatLabelInput
                          inputSize="sm"
                          label={t("phone")}
                          value={editingSupplierData.phone}
                          onChange={(e) =>
                            setEditingSupplierData((f) => ({ ...f, phone: e.target.value }))
                          }
                        />
                        <FloatLabelInput
                          inputSize="sm"
                          label={t("email")}
                          type="email"
                          value={editingSupplierData.email}
                          onChange={(e) =>
                            setEditingSupplierData((f) => ({ ...f, email: e.target.value }))
                          }
                        />
                      </div>
                      <FloatLabelInput
                        inputSize="sm"
                        label={t("notes")}
                        value={editingSupplierData.notes}
                        onChange={(e) =>
                          setEditingSupplierData((f) => ({ ...f, notes: e.target.value }))
                        }
                      />
                      <div className="flex gap-2 justify-end">
                        <Button size="sm" variant="ghost" onClick={() => setEditingSupplier(null)} disabled={isUpdatingSupplier}>✕</Button>
                        <Button
                          size="sm"
                          onClick={handleUpdateSupplier}
                          disabled={isUpdatingSupplier || !editingSupplierData.name.trim()}
                        >
                          {isUpdatingSupplier ? "..." : "✓"}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium">{s.name}</p>
                        {s.address && (
                          <p className="text-xs text-muted-foreground">📍 {s.address}</p>
                        )}
                        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mt-0.5">
                          {s.phone && <span>📞 {s.phone}</span>}
                          {s.email && <span>✉️ {s.email}</span>}
                        </div>
                        {s.notes && (
                          <p className="text-xs text-muted-foreground mt-1 italic">{s.notes}</p>
                        )}
                      </div>
                      <div className="flex gap-1 shrink-0">
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
                              notes: s.notes || "",
                            });
                          }}
                        >
                          ✏️
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          onClick={() => setDeletingSupplier(s)}
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

      {/* ── Create Item Dialog ── */}
      <Dialog open={showCreateProduct} onOpenChange={setShowCreateProduct}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>+ {t("newItem")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <label className="text-sm font-medium mb-1 block">{t("itemName")} *</label>
              <Input
                value={newProduct.name}
                onChange={(e) => setNewProduct((f) => ({ ...f, name: e.target.value }))}
                onKeyDown={(e) => e.key === "Enter" && handleCreateProduct()}
                autoFocus
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">
                  {t("sku")}{" "}
                  <span className="text-muted-foreground font-normal text-xs">({t("optional")})</span>
                </label>
                <Input
                  value={newProduct.sku}
                  onChange={(e) => setNewProduct((f) => ({ ...f, sku: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">{t("unit")} *</label>
                <Input
                  value={newProduct.unit}
                  onChange={(e) => setNewProduct((f) => ({ ...f, unit: e.target.value }))}
                  placeholder={t("unitPlaceholder")}
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" onClick={() => setShowCreateProduct(false)}>✕</Button>
              <Button
                onClick={handleCreateProduct}
                disabled={isProductSubmitting || !newProduct.name.trim() || !newProduct.unit.trim()}
              >
                {isProductSubmitting ? t("submitting") : t("newItem")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Attachment Image Preview ── */}
      <ImagePreviewDialog
        images={previewImages}
        initialIndex={previewIndex}
        open={previewImages.length > 0}
        onClose={() => setPreviewImages([])}
      />

      {/* ── Delete Product Confirmation Dialog ── */}
      <DeleteConfirmDialog
        open={!!deletingProduct}
        onClose={() => setDeletingProduct(null)}
        onConfirm={handleDeleteProduct}
        confirmText={deletingProduct?.name ?? ""}
        description={t("deleteItemWarning")}
      />

      {/* ── Delete Supplier Confirmation Dialog ── */}
      <DeleteConfirmDialog
        open={!!deletingSupplier}
        onClose={() => setDeletingSupplier(null)}
        onConfirm={doDeleteSupplier}
        confirmText={deletingSupplier?.name ?? ""}
      />

      {/* ── Deactivate Confirmation Dialog ── */}
      <Dialog
        open={!!deactivatingProduct}
        onOpenChange={(open) => !open && setDeactivatingProduct(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-destructive">{t("confirmDeactivate")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <code className="block bg-destructive/10 border border-destructive/20 px-3 py-2 rounded text-sm font-mono text-destructive">
              {deactivatingProduct?.name}
            </code>
            <p className="text-sm text-muted-foreground">{t("deactivateWarning")}</p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setDeactivatingProduct(null)} disabled={isDeactivating}>
                {t("cancel")}
              </Button>
              <Button variant="destructive" onClick={handleConfirmDeactivate} disabled={isDeactivating}>
                {isDeactivating ? t("submitting") : t("deactivate")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Export Stock Dialog ── */}
      <Dialog
        open={showExportDialog}
        onOpenChange={(open) => {
          if (!open) {
            setShowExportDialog(false);
            setExportForm({ productId: "", quantity: "1", unitPrice: "", notes: "" });
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>↗ {t("exportStock")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <label className="text-sm font-medium mb-1 block">{t("selectProduct")} *</label>
              <Select
                value={exportForm.productId || "none"}
                onValueChange={(v) => {
                  const pid = v === "none" ? "" : v;
                  const product = products.find((p) => p.id === pid);
                  setExportForm((f) => ({
                    ...f,
                    productId: pid,
                    unitPrice: product ? String(product.price) : "",
                  }));
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("selectProduct")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t("selectProduct")}</SelectItem>
                  {products
                    .filter((p) => p.status !== "inactive")
                    .map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} ({t("available")}: {p.quantity})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">{t("quantity")} *</label>
                <Input
                  type="number"
                  min="1"
                  value={exportForm.quantity}
                  onChange={(e) => setExportForm((f) => ({ ...f, quantity: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">
                  {t("unitPrice")}{" "}
                  <span className="text-muted-foreground font-normal text-xs">({t("optional")})</span>
                </label>
                <Input
                  type="number"
                  min="0"
                  value={exportForm.unitPrice}
                  onChange={(e) => setExportForm((f) => ({ ...f, unitPrice: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">
                {t("notes")} *{" "}
                <span className="text-xs text-muted-foreground">({t("required")})</span>
              </label>
              <Input
                value={exportForm.notes}
                onChange={(e) => setExportForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder={t("notesRequired")}
                className={!exportForm.notes.trim() && exportForm.productId ? "border-destructive" : ""}
              />
            </div>
            <div className="flex gap-2 justify-end pt-1">
              <Button
                variant="outline"
                onClick={() => {
                  setShowExportDialog(false);
                  setExportForm({ productId: "", quantity: "1", unitPrice: "", notes: "" });
                }}
              >
                {t("cancel")}
              </Button>
              <Button
                onClick={handleExportDialogSubmit}
                disabled={
                  isExportSubmitting ||
                  !exportForm.productId ||
                  Number(exportForm.quantity) < 1 ||
                  !exportForm.notes.trim()
                }
              >
                {isExportSubmitting ? t("submitting") : t("confirmExport")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Product History Dialog ── */}
      <Dialog
        open={!!historyProduct}
        onOpenChange={(open) => !open && setHistoryProduct(null)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              📋 {t("transactionHistory")} — {historyProduct?.name}
            </DialogTitle>
          </DialogHeader>

          {/* Type filter */}
          <div className="flex gap-2 flex-wrap">
            {(["ALL", "IMPORT", "EXPORT", "SALE"] as const).map((type) => (
              <Button
                key={type}
                size="sm"
                variant={historyTypeFilter === type ? "default" : "outline"}
                onClick={() => setHistoryTypeFilter(type)}
              >
                {type === "ALL"
                  ? t("all")
                  : type === "IMPORT"
                  ? t("import")
                  : type === "EXPORT"
                  ? t("export")
                  : t("typeSaleOrder")}
              </Button>
            ))}
          </div>

          {productHistoryEntries.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              {t("noTransactionsForItem")}
            </p>
          ) : (
            <div className="max-h-[60vh] overflow-y-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-muted sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">{t("date")}</th>
                    <th className="px-3 py-2 text-left font-medium">{t("type")}</th>
                    <th className="px-3 py-2 text-right font-medium">{t("quantity")}</th>
                    <th className="px-3 py-2 text-right font-medium">{t("unitPrice")}</th>
                    <th className="px-3 py-2 text-right font-medium">{t("totalPrice")}</th>
                    <th className="px-3 py-2 text-left font-medium">{t("supplier")}</th>
                    <th className="px-3 py-2 text-left font-medium">{t("notes")}</th>
                    <th className="px-3 py-2 text-left font-medium">{t("createdBy")}</th>
                    <th className="px-3 py-2 text-left font-medium">{t("attachments")}</th>
                  </tr>
                </thead>
                <tbody>
                  {productHistoryEntries.map((entry) =>
                    entry.kind === "tx" ? (
                      <tr key={entry.id} className="border-t hover:bg-muted/50">
                        <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                          <p>{new Date(entry.date).toLocaleDateString()}</p>
                          <p className="text-xs opacity-70">
                            {new Date(entry.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </td>
                        <td className="px-3 py-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${entry.type === "EXPORT" ? "bg-blue-100 text-blue-800" : "bg-yellow-100 text-yellow-800"}`}>
                            {entry.type === "EXPORT" ? t("typeSale") : t("typeReturn")}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right">{entry.quantity.toLocaleString()}</td>
                        <td className="px-3 py-2 text-right font-mono">{entry.unitPrice ? entry.unitPrice.toLocaleString() : "—"}</td>
                        <td className="px-3 py-2 text-right font-mono">{entry.totalPrice ? entry.totalPrice.toLocaleString() : "—"}</td>
                        <td className="px-3 py-2 text-muted-foreground text-xs">{getSupplierName(entry.supplierId) || "—"}</td>
                        <td className="px-3 py-2 text-muted-foreground">{entry.notes || "—"}</td>
                        <td className="px-3 py-2 text-muted-foreground text-xs">{entry.createdByName || "—"}</td>
                        <td className="px-3 py-2">
                          <div className="flex flex-wrap gap-1 items-center">
                            {entry.imageUrls?.map((url, i) => (
                              <button key={i} type="button" onClick={() => { setPreviewImages(entry.imageUrls!); setPreviewIndex(i); }} className="shrink-0">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={url} alt="" className="h-8 w-8 object-cover rounded border hover:opacity-80 transition-opacity" />
                              </button>
                            ))}
                            {entry.fileUrls?.map((url, i) => (
                              <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-lg" title={url.split("/").pop()}>📄</a>
                            ))}
                            {!entry.imageUrls?.length && !entry.fileUrls?.length && (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ) : (
                      <tr key={entry.id} className="border-t hover:bg-muted/50">
                        <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                          <p>{new Date(entry.date).toLocaleDateString()}</p>
                          <p className="text-xs opacity-70">
                            {new Date(entry.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </td>
                        <td className="px-3 py-2">
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-purple-100 text-purple-800">
                            {t("typeSaleOrder")}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right">{entry.quantity.toLocaleString()}</td>
                        <td className="px-3 py-2 text-right font-mono">{entry.salePrice.toLocaleString()}</td>
                        <td className="px-3 py-2 text-right font-mono">{entry.totalPrice.toLocaleString()}</td>
                        <td className="px-3 py-2 text-muted-foreground text-xs">{entry.customerName}</td>
                        <td className="px-3 py-2 text-muted-foreground">{entry.notes || "—"}</td>
                        <td className="px-3 py-2 text-muted-foreground text-xs">{entry.createdByName || "—"}</td>
                        <td className="px-3 py-2 text-muted-foreground">—</td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Import Stock Dialog (self-contained) ── */}
      <ImportStockDialog
        open={showImportDialog}
        onClose={() => setShowImportDialog(false)}
        branchId={branchId}
        location={location}
        products={products}
        setProducts={setProducts}
        setTransactions={setTransactions}
        suppliers={suppliers}
        setSuppliers={setSuppliers}
      />
    </>
  );
}
