"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import axiosInstance from "@/utils/axiosInstance";
import { formatWithDots, parseDots } from "@/utils/formatNumber";
import { AttachmentSlots } from "@/components/ui/attachment-slots";
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
import type { Location, Product, Supplier, Transaction, ImportItem } from "../../_types";

interface ImportStockDialogProps {
  open: boolean;
  onClose: () => void;
  locationId: string;
  location: Location | null;
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  suppliers: Supplier[];
  setSuppliers: React.Dispatch<React.SetStateAction<Supplier[]>>;
}

export function ImportStockDialog({
  open,
  onClose,
  locationId,
  location,
  products,
  setProducts,
  setTransactions,
  suppliers,
  setSuppliers,
}: ImportStockDialogProps) {
  const t = useTranslations("inventory");
  const { toast } = useToast();

  const [importItems, setImportItems] = useState<ImportItem[]>([
    { uid: "1", productId: "", quantity: "", unitPrice: "" },
  ]);
  const [importSupplierId, setImportSupplierId] = useState("none");
  const [importNotes, setImportNotes] = useState("");
  const [importFiles, setImportFiles] = useState<(File | null)[]>(Array(5).fill(null));
  const [isImportSubmitting, setIsImportSubmitting] = useState(false);
  const [importPickerOpen, setImportPickerOpen] = useState(false);
  const [importPickerItemUid, setImportPickerItemUid] = useState("");
  const [importProductSearch, setImportProductSearch] = useState("");
  const [importPickerView, setImportPickerView] = useState<"search" | "add">("search");
  const [importNewProductName, setImportNewProductName] = useState("");
  const [importNewProductSku, setImportNewProductSku] = useState("");
  const [importNewProductUnit, setImportNewProductUnit] = useState("");
  const [isCreatingImportProduct, setIsCreatingImportProduct] = useState(false);
  const [importSupplierOpen, setImportSupplierOpen] = useState(false);
  const [importNewSupplier, setImportNewSupplier] = useState({ name: "", address: "", phone: "", email: "" });
  const [isCreatingImportSupplier, setIsCreatingImportSupplier] = useState(false);
  const [importPreviewUrl, setImportPreviewUrl] = useState<string | null>(null);

  const importHasNegativeQty = importItems.some(
    (i) => i.quantity && Number(parseDots(i.quantity)) < 0
  );

  const importGrandTotal = useMemo(() => {
    return importItems.reduce((sum, item) => {
      if (!item.productId || !item.quantity || !item.unitPrice) return sum;
      const qty = Number(parseDots(item.quantity));
      const price = Number(parseDots(item.unitPrice));
      if (isNaN(qty) || isNaN(price)) return sum;
      return sum + qty * price;
    }, 0);
  }, [importItems]);

  const importFilteredProducts = useMemo(() => {
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(importProductSearch.toLowerCase()) ||
        p.sku.toLowerCase().includes(importProductSearch.toLowerCase())
    );
  }, [products, importProductSearch]);

  const importGetProduct = (id: string) => products.find((p) => p.id === id);

  const importAddItem = () =>
    setImportItems((prev) => [
      ...prev,
      { uid: Date.now().toString(), productId: "", quantity: "", unitPrice: "" },
    ]);

  const importRemoveItem = (uid: string) =>
    setImportItems((prev) => prev.filter((i) => i.uid !== uid));

  const importUpdateItem = (
    uid: string,
    field: keyof Omit<ImportItem, "uid">,
    value: string
  ) =>
    setImportItems((prev) =>
      prev.map((i) => (i.uid === uid ? { ...i, [field]: value } : i))
    );

  const importHandleQuantityChange = (uid: string, value: string) => {
    const isNeg = value.startsWith("-");
    const digits = value.replace(/^-/, "");
    importUpdateItem(uid, "quantity", (isNeg ? "-" : "") + formatWithDots(digits));
  };

  const importOpenPicker = (uid: string) => {
    setImportPickerItemUid(uid);
    setImportProductSearch("");
    setImportPickerView("search");
    setImportNewProductName("");
    setImportNewProductSku("");
    setImportNewProductUnit("");
    setImportPickerOpen(true);
  };

  const importSelectProduct = (product: Product) => {
    importUpdateItem(importPickerItemUid, "productId", product.id);
    setImportPickerOpen(false);
  };

  const importHandleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importNewProductName.trim() || !importNewProductUnit.trim()) return;
    setIsCreatingImportProduct(true);
    try {
      const res = await axiosInstance.post(`/locations/${locationId}/products`, {
        name: importNewProductName.trim(),
        sku: importNewProductSku.trim() || undefined,
        unit: importNewProductUnit.trim(),
      });
      const created: Product = res.data.product;
      setProducts((prev) => [created, ...prev]);
      importSelectProduct(created);
      toast({ title: t("createItemSuccess") });
    } catch {
      toast({ title: t("createItemFailed"), variant: "destructive" });
    } finally {
      setIsCreatingImportProduct(false);
    }
  };

  const importHandleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importNewSupplier.name.trim()) return;
    setIsCreatingImportSupplier(true);
    try {
      const res = await axiosInstance.post(`/locations/${locationId}/suppliers`, {
        name: importNewSupplier.name.trim(),
        address: importNewSupplier.address.trim() || undefined,
        phone: importNewSupplier.phone.trim() || undefined,
        email: importNewSupplier.email.trim() || undefined,
      });
      const created: Supplier = res.data.supplier;
      setSuppliers((prev) => [...prev, created]);
      setImportSupplierId(created.id);
      setImportSupplierOpen(false);
      setImportNewSupplier({ name: "", address: "", phone: "", email: "" });
      toast({ title: t("supplierAdded") });
    } catch {
      toast({ title: t("importFailed"), variant: "destructive" });
    } finally {
      setIsCreatingImportSupplier(false);
    }
  };

  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validItems = importItems.filter(
      (i) => i.productId && i.quantity && i.unitPrice
    );
    if (validItems.length === 0) return;
    if (importHasNegativeQty && !importNotes.trim()) {
      toast({ title: t("negativeQtyNoteRequired"), variant: "destructive" });
      return;
    }
    setIsImportSubmitting(true);
    try {
      const locName = location?.name || "general";
      const imageUrls: string[] = [];
      const fileUrls: string[] = [];
      for (const file of importFiles.filter((f): f is File => f !== null)) {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("locationName", locName);
        try {
          const r = await axiosInstance.post("/upload", fd, {
            headers: { "Content-Type": "multipart/form-data" },
          });
          if (r.data.resourceType === "image") imageUrls.push(r.data.url);
          else fileUrls.push(r.data.url);
        } catch { /* continue */ }
      }
      await Promise.all(
        validItems.map((item) => {
          const qty = Number(parseDots(item.quantity));
          const unitPrice = Number(parseDots(item.unitPrice));
          return axiosInstance.post(`/locations/${locationId}/transactions`, {
            productId: item.productId,
            type: "IMPORT",
            quantity: qty,
            unitPrice,
            totalPrice: unitPrice * qty,
            supplierId: importSupplierId !== "none" ? importSupplierId : undefined,
            notes: importNotes || undefined,
            imageUrls,
            fileUrls,
          });
        })
      );
      toast({ title: t("importSuccess") });
      onClose();
      const [prodRes, txRes] = await Promise.allSettled([
        axiosInstance.get(`/locations/${locationId}/products`),
        axiosInstance.get(`/locations/${locationId}/transactions`),
      ]);
      if (prodRes.status === "fulfilled") setProducts(prodRes.value.data.products);
      if (txRes.status === "fulfilled") setTransactions(txRes.value.data.transactions);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      toast({
        title: t("importFailed"),
        description: error.response?.data?.error,
        variant: "destructive",
      });
    } finally {
      setIsImportSubmitting(false);
    }
  };

  const handleDialogClose = (open: boolean) => {
    if (!open) onClose();
  };

  return (
    <>
      {/* ── Import Stock Dialog ── */}
      <Dialog open={open} onOpenChange={handleDialogClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("importStock")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleImportSubmit} className="space-y-5 py-2">
            {importHasNegativeQty && (
              <div className="rounded-lg border border-yellow-400 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
                ⚠️ {t("negativeQtyWarning")}
              </div>
            )}

            {/* Supplier */}
            <div>
              <label className="text-sm font-medium mb-1 block">{t("supplier")}</label>
              <Select value={importSupplierId} onValueChange={setImportSupplierId}>
                <SelectTrigger>
                  <SelectValue placeholder={t("selectSupplier")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— {t("selectSupplier")} —</SelectItem>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}{s.address ? ` — ${s.address}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <button
                type="button"
                onClick={() => {
                  setImportNewSupplier({ name: "", address: "", phone: "", email: "" });
                  setImportSupplierOpen(true);
                }}
                className="mt-1.5 text-xs text-primary hover:underline"
              >
                + {t("addNewSupplier")}
              </button>
            </div>

            {/* Items */}
            <div className="space-y-3">
              {importItems.map((item, idx) => {
                const prod = importGetProduct(item.productId);
                const qty = item.quantity ? Number(parseDots(item.quantity)) : null;
                const isNeg = qty !== null && qty < 0;
                return (
                  <div
                    key={item.uid}
                    className={`rounded-xl border p-4 space-y-3 bg-card ${isNeg ? "border-yellow-400" : ""}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">#{idx + 1}</span>
                      {importItems.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-destructive h-6 px-2 text-xs"
                          onClick={() => importRemoveItem(item.uid)}
                        >
                          ✕ {t("removeItem")}
                        </Button>
                      )}
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block">{t("selectProduct")} *</label>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full justify-start font-normal"
                        onClick={() => importOpenPicker(item.uid)}
                      >
                        {prod ? (
                          <span>
                            {prod.name}{" "}
                            <span className="text-muted-foreground font-mono text-xs">({prod.sku})</span>
                          </span>
                        ) : (
                          <span className="text-muted-foreground">{t("selectProduct")}...</span>
                        )}
                      </Button>
                      {prod && (
                        <p className="text-xs mt-1">
                          {t("currentStock")}:{" "}
                          <span className="font-semibold text-primary">{prod.quantity.toLocaleString()}</span>
                          {prod.unit && <span className="ml-1 text-muted-foreground">{prod.unit}</span>}
                        </p>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="text-sm font-medium mb-1 block">{t("quantity")} *</label>
                        <Input
                          type="text"
                          inputMode="numeric"
                          value={item.quantity}
                          onChange={(e) => importHandleQuantityChange(item.uid, e.target.value)}
                          required
                          className={isNeg ? "border-yellow-400 focus-visible:ring-yellow-400" : ""}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1 block">{t("unit")}</label>
                        <Input
                          value={prod?.unit ?? "—"}
                          readOnly
                          className="bg-muted text-muted-foreground cursor-default"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1 block">
                          {t("unitPrice")} *{" "}
                          <span className="text-muted-foreground font-mono text-xs">
                            ({location?.currency || "VND"})
                          </span>
                        </label>
                        <Input
                          type="text"
                          inputMode="numeric"
                          value={item.unitPrice}
                          onChange={(e) =>
                            importUpdateItem(item.uid, "unitPrice", formatWithDots(e.target.value))
                          }
                          required
                        />
                      </div>
                    </div>
                    {item.quantity && item.unitPrice && (
                      <p className="text-xs text-right text-muted-foreground">
                        ={" "}
                        {(
                          Number(parseDots(item.quantity)) * Number(parseDots(item.unitPrice))
                        ).toLocaleString()}{" "}
                        {location?.currency || "VND"}
                      </p>
                    )}
                  </div>
                );
              })}
              <Button type="button" variant="outline" className="w-full" onClick={importAddItem}>
                + {t("addItem")}
              </Button>
              {importGrandTotal !== 0 && (
                <div className="flex justify-between items-center rounded-xl border px-4 py-3 bg-muted/40 font-medium">
                  <span className="text-sm">{t("totalPrice")}</span>
                  <span className="font-mono">
                    {importGrandTotal.toLocaleString()} {location?.currency || "VND"}
                  </span>
                </div>
              )}
            </div>

            {/* Notes */}
            <div>
              <label className="text-sm font-medium mb-1 block">
                {t("notes")}
                {importHasNegativeQty && (
                  <span className="ml-1 text-yellow-600 font-normal text-xs">* {t("required")}</span>
                )}
              </label>
              <Input
                value={importNotes}
                onChange={(e) => setImportNotes(e.target.value)}
                placeholder={importHasNegativeQty ? t("negativeQtyNotePlaceholder") : t("optional")}
                required={importHasNegativeQty}
                className={
                  importHasNegativeQty && !importNotes.trim()
                    ? "border-yellow-400 focus-visible:ring-yellow-400"
                    : ""
                }
              />
            </div>

            {/* Attachments */}
            <div>
              <label className="text-sm font-medium mb-2 block">{t("attachments")}</label>
              <AttachmentSlots
                files={importFiles}
                onChange={setImportFiles}
                onPreview={setImportPreviewUrl}
              />
            </div>

            <Button type="submit" className="w-full" disabled={isImportSubmitting}>
              {isImportSubmitting ? t("submitting") : t("confirmImport")}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Import: Product Picker Dialog ── */}
      <Dialog
        open={importPickerOpen}
        onOpenChange={(open) => {
          setImportPickerOpen(open);
          if (!open) setImportPickerView("search");
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {importPickerView === "add" ? t("addNewProduct") : t("selectProduct")}
            </DialogTitle>
          </DialogHeader>
          {importPickerView === "search" ? (
            <>
              <Input
                placeholder={t("searchProduct")}
                value={importProductSearch}
                onChange={(e) => setImportProductSearch(e.target.value)}
                autoFocus
              />
              <div className="mt-2 max-h-72 overflow-y-auto space-y-1">
                {importFilteredProducts.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    {t("noProductFound")}
                  </p>
                ) : (
                  importFilteredProducts.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => importSelectProduct(p)}
                      className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-muted transition-colors"
                    >
                      <p className="text-sm font-medium">{p.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {p.sku && <span className="mr-2">{p.sku}</span>}
                        {p.unit && <span className="mr-2">· {p.unit}</span>}
                        {t("currentStock")}:{" "}
                        <span className="font-semibold text-primary">
                          {p.quantity.toLocaleString()}
                        </span>
                      </p>
                    </button>
                  ))
                )}
              </div>
              <div className="pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setImportPickerView("add")}
                  className="text-xs text-primary hover:underline"
                >
                  + {t("addNewProduct")}
                </button>
              </div>
            </>
          ) : (
            <form onSubmit={importHandleCreateProduct} className="space-y-3 mt-1">
              <div>
                <label className="text-sm font-medium mb-1 block">{t("itemName")} *</label>
                <Input
                  value={importNewProductName}
                  onChange={(e) => setImportNewProductName(e.target.value)}
                  autoFocus
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">{t("sku")}</label>
                <Input
                  value={importNewProductSku}
                  onChange={(e) => setImportNewProductSku(e.target.value)}
                  placeholder={t("optional")}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">{t("unit")} *</label>
                <Input
                  value={importNewProductUnit}
                  onChange={(e) => setImportNewProductUnit(e.target.value)}
                  placeholder={t("unitPlaceholder")}
                  required
                />
              </div>
              <div className="flex gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setImportPickerView("search")}
                >
                  ← {t("back")}
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={
                    isCreatingImportProduct ||
                    !importNewProductName.trim() ||
                    !importNewProductUnit.trim()
                  }
                >
                  {isCreatingImportProduct ? t("creating") : t("addItem")}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Import: Add New Supplier Dialog ── */}
      <Dialog open={importSupplierOpen} onOpenChange={setImportSupplierOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("addNewSupplier")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={importHandleCreateSupplier} className="space-y-3 mt-1">
            <div>
              <label className="text-sm font-medium mb-1 block">{t("supplierName")} *</label>
              <Input
                value={importNewSupplier.name}
                onChange={(e) => setImportNewSupplier((f) => ({ ...f, name: e.target.value }))}
                autoFocus
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">{t("supplierCompany")}</label>
              <Input
                value={importNewSupplier.address}
                onChange={(e) => setImportNewSupplier((f) => ({ ...f, address: e.target.value }))}
                placeholder={t("optional")}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">{t("phone")}</label>
                <Input
                  value={importNewSupplier.phone}
                  onChange={(e) => setImportNewSupplier((f) => ({ ...f, phone: e.target.value }))}
                  placeholder={t("optional")}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">{t("email")}</label>
                <Input
                  type="email"
                  value={importNewSupplier.email}
                  onChange={(e) => setImportNewSupplier((f) => ({ ...f, email: e.target.value }))}
                  placeholder={t("optional")}
                />
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setImportSupplierOpen(false)}
              >
                {t("back")}
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={isCreatingImportSupplier || !importNewSupplier.name.trim()}
              >
                {isCreatingImportSupplier ? t("creating") : t("addSupplier")}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Import: Image Preview ── */}
      {importPreviewUrl && (
        <Dialog open={!!importPreviewUrl} onOpenChange={() => setImportPreviewUrl(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{t("previewImage")}</DialogTitle>
            </DialogHeader>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={importPreviewUrl}
              alt="preview"
              className="w-full rounded-lg object-contain max-h-[70vh]"
            />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
