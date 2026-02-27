"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/app/authContext";
import { useTranslations } from "next-intl";
import axiosInstance from "@/utils/axiosInstance";
import { formatWithDots, parseDots } from "@/utils/formatNumber";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import AppHeader from "@/app/AppHeader/AppHeader";
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

interface Product {
  id: string;
  name: string;
  sku: string;
  unit: string | null;
  quantity: number;
}

interface Supplier {
  id: string;
  name: string;
  address: string | null;
}

interface ImportItem {
  uid: string;
  productId: string;
  quantity: string;
  unitPrice: string;
}

export default function ImportPage() {
  const params = useParams<{ locationId: string }>();
  const locationId = params?.locationId || "";
  const { isLoggedIn, isInitializing } = useAuth();
  const router = useRouter();
  const t = useTranslations("inventory");
  const { toast } = useToast();

  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [locationName, setLocationName] = useState("general");
  const [locationCurrency, setLocationCurrency] = useState("VND");

  // Import form
  const [items, setItems] = useState<ImportItem[]>([
    { uid: "1", productId: "", quantity: "", unitPrice: "" },
  ]);
  const [supplierId, setSupplierId] = useState("none");
  const [notes, setNotes] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Product picker dialog
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerItemUid, setPickerItemUid] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [pickerView, setPickerView] = useState<"search" | "add">("search");

  // Add new product form (inside picker)
  const [newProductName, setNewProductName] = useState("");
  const [newProductSku, setNewProductSku] = useState("");
  const [newProductUnit, setNewProductUnit] = useState("");
  const [isCreatingProduct, setIsCreatingProduct] = useState(false);

  // Add new supplier dialog
  const [supplierDialogOpen, setSupplierDialogOpen] = useState(false);
  const [newSupplier, setNewSupplier] = useState({ name: "", address: "", phone: "", email: "" });
  const [isCreatingSupplier, setIsCreatingSupplier] = useState(false);

  // Image preview dialog
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (isInitializing) return;
    if (!isLoggedIn) {
      router.push("/inventory/login");
      return;
    }
    loadData();
  }, [isInitializing, isLoggedIn, locationId]);

  const loadData = async () => {
    const [prodRes, supRes, locRes] = await Promise.allSettled([
      axiosInstance.get(`/locations/${locationId}/products`),
      axiosInstance.get(`/locations/${locationId}/suppliers`),
      axiosInstance.get("/users/me/locations"),
    ]);
    if (prodRes.status === "fulfilled") setProducts(prodRes.value.data.products);
    if (supRes.status === "fulfilled") setSuppliers(supRes.value.data.suppliers);
    if (locRes.status === "fulfilled") {
      const loc = locRes.value.data.locations?.find(
        (l: { id: string; name: string; currency?: string }) =>
          l.id === locationId
      );
      if (loc) {
        setLocationName(loc.name);
        if (loc.currency) setLocationCurrency(loc.currency);
      }
    }
  };

  // ── Computed ─────────────────────────────────────────────────────
  const hasNegativeQty = items.some(
    (i) => i.quantity && Number(parseDots(i.quantity)) < 0
  );

  const grandTotal = useMemo(() => {
    return items.reduce((sum, item) => {
      if (!item.productId || !item.quantity || !item.unitPrice) return sum;
      const qty = Number(parseDots(item.quantity));
      const price = Number(parseDots(item.unitPrice));
      if (isNaN(qty) || isNaN(price)) return sum;
      return sum + qty * price;
    }, 0);
  }, [items]);

  // ── Item management ──────────────────────────────────────────────
  const addItem = () => {
    setItems((prev) => [
      ...prev,
      { uid: Date.now().toString(), productId: "", quantity: "", unitPrice: "" },
    ]);
  };

  const removeItem = (uid: string) => {
    setItems((prev) => prev.filter((i) => i.uid !== uid));
  };

  const updateItem = (
    uid: string,
    field: keyof Omit<ImportItem, "uid">,
    value: string
  ) => {
    setItems((prev) =>
      prev.map((i) => (i.uid === uid ? { ...i, [field]: value } : i))
    );
  };

  const handleQuantityChange = (uid: string, value: string) => {
    // Allow leading minus for negative quantities
    const isNeg = value.startsWith("-");
    const digits = value.replace(/^-/, "");
    const formatted = (isNeg ? "-" : "") + formatWithDots(digits);
    updateItem(uid, "quantity", formatted);
  };

  const getProduct = (id: string) => products.find((p) => p.id === id);

  // ── Product picker ───────────────────────────────────────────────
  const openPicker = (uid: string) => {
    setPickerItemUid(uid);
    setProductSearch("");
    setPickerView("search");
    setNewProductName("");
    setNewProductSku("");
    setNewProductUnit("");
    setPickerOpen(true);
  };

  const selectProduct = (product: Product) => {
    updateItem(pickerItemUid, "productId", product.id);
    setPickerOpen(false);
  };

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.sku.toLowerCase().includes(productSearch.toLowerCase())
  );

  // ── Create new product (from picker) ─────────────────────────────
  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProductName.trim() || !newProductUnit.trim()) return;
    setIsCreatingProduct(true);
    try {
      const res = await axiosInstance.post(`/locations/${locationId}/products`, {
        name: newProductName.trim(),
        sku: newProductSku.trim() || undefined,
        unit: newProductUnit.trim(),
      });
      const created: Product = res.data.product;
      setProducts((prev) => [created, ...prev]);
      selectProduct(created);
      toast({ title: t("createItemSuccess") });
    } catch {
      toast({ title: t("createItemFailed"), variant: "destructive" });
    } finally {
      setIsCreatingProduct(false);
    }
  };

  // ── Create new supplier ──────────────────────────────────────────
  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSupplier.name.trim()) return;
    setIsCreatingSupplier(true);
    try {
      const res = await axiosInstance.post(`/locations/${locationId}/suppliers`, {
        name: newSupplier.name.trim(),
        address: newSupplier.address.trim() || undefined,
        phone: newSupplier.phone.trim() || undefined,
        email: newSupplier.email.trim() || undefined,
      });
      const created: Supplier = res.data.supplier;
      setSuppliers((prev) => [...prev, created]);
      setSupplierId(created.id);
      setSupplierDialogOpen(false);
      setNewSupplier({ name: "", address: "", phone: "", email: "" });
      toast({ title: t("supplierAdded") });
    } catch {
      toast({ title: t("importFailed"), variant: "destructive" });
    } finally {
      setIsCreatingSupplier(false);
    }
  };

  // ── File upload ──────────────────────────────────────────────────
  const uploadFiles = async (
    locName: string
  ): Promise<{ imageUrls: string[]; fileUrls: string[] }> => {
    const imageUrls: string[] = [];
    const fileUrls: string[] = [];
    for (const file of files) {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("locationName", locName);
      try {
        const res = await axiosInstance.post("/upload", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        if (res.data.resourceType === "image") imageUrls.push(res.data.url);
        else fileUrls.push(res.data.url);
      } catch {
        // continue
      }
    }
    return { imageUrls, fileUrls };
  };

  // ── Submit import ────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validItems = items.filter(
      (i) => i.productId && i.quantity && i.unitPrice
    );
    if (validItems.length === 0) return;

    if (hasNegativeQty && !notes.trim()) {
      toast({
        title: t("negativeQtyNoteRequired"),
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { imageUrls, fileUrls } = await uploadFiles(locationName);
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
            supplierId: supplierId !== "none" ? supplierId : undefined,
            notes: notes || undefined,
            imageUrls,
            fileUrls,
          });
        })
      );
      toast({ title: t("importSuccess") });
      router.push(`/inventory/${locationId}`);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      toast({
        title: t("importFailed"),
        description: error.response?.data?.error,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container mx-auto px-6 py-8 max-w-2xl space-y-6">
        {/* Back */}
        <div className="flex items-center gap-3">
          <Link
            href={`/inventory/${locationId}`}
            className="text-muted-foreground hover:text-foreground text-sm"
          >
            ← {t("back")}
          </Link>
        </div>

        <h2 className="text-2xl font-bold">{t("importStock")}</h2>

        {/* Negative quantity warning */}
        {hasNegativeQty && (
          <div className="rounded-lg border border-yellow-400 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
            ⚠️ {t("negativeQtyWarning")}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Supplier */}
          <div>
            <label className="text-sm font-medium mb-1 block">
              {t("supplier")}
            </label>
            <Select value={supplierId} onValueChange={setSupplierId}>
              <SelectTrigger>
                <SelectValue placeholder={t("selectSupplier")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">
                  — {t("selectSupplier")} —
                </SelectItem>
                {suppliers.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                    {s.address ? ` — ${s.address}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <button
              type="button"
              onClick={() => {
                setNewSupplier({ name: "", address: "", phone: "", email: "" });
                setSupplierDialogOpen(true);
              }}
              className="mt-1.5 text-xs text-primary hover:underline"
            >
              + {t("addNewSupplier")}
            </button>
          </div>

          {/* Items */}
          <div className="space-y-3">
            {items.map((item, idx) => {
              const prod = getProduct(item.productId);
              const qty = item.quantity ? Number(parseDots(item.quantity)) : null;
              const isNeg = qty !== null && qty < 0;

              return (
                <div
                  key={item.uid}
                  className={`rounded-xl border p-4 space-y-3 bg-card ${isNeg ? "border-yellow-400" : ""}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">
                      #{idx + 1}
                    </span>
                    {items.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-destructive h-6 px-2 text-xs"
                        onClick={() => removeItem(item.uid)}
                      >
                        ✕ {t("removeItem")}
                      </Button>
                    )}
                  </div>

                  {/* Product picker */}
                  <div>
                    <label className="text-sm font-medium mb-1 block">
                      {t("selectProduct")} *
                    </label>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full justify-start font-normal"
                      onClick={() => openPicker(item.uid)}
                    >
                      {prod ? (
                        <span>
                          {prod.name}{" "}
                          <span className="text-muted-foreground font-mono text-xs">
                            ({prod.sku})
                          </span>
                        </span>
                      ) : (
                        <span className="text-muted-foreground">
                          {t("selectProduct")}...
                        </span>
                      )}
                    </Button>
                    {prod && (
                      <p className="text-xs mt-1">
                        {t("currentStock")}:{" "}
                        <span className="font-semibold text-primary">
                          {prod.quantity.toLocaleString()}
                        </span>
                        {prod.unit && (
                          <span className="ml-1 text-muted-foreground">
                            {prod.unit}
                          </span>
                        )}
                      </p>
                    )}
                  </div>

                  {/* Quantity | Unit (readonly) | Unit Price */}
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-sm font-medium mb-1 block">
                        {t("quantity")} *
                      </label>
                      <Input
                        type="text"
                        inputMode="numeric"
                        value={item.quantity}
                        onChange={(e) =>
                          handleQuantityChange(item.uid, e.target.value)
                        }
                        required
                        className={isNeg ? "border-yellow-400 focus-visible:ring-yellow-400" : ""}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block">
                        {t("unit")}
                      </label>
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
                          ({locationCurrency})
                        </span>
                      </label>
                      <Input
                        type="text"
                        inputMode="numeric"
                        value={item.unitPrice}
                        onChange={(e) =>
                          updateItem(
                            item.uid,
                            "unitPrice",
                            formatWithDots(e.target.value)
                          )
                        }
                        required
                      />
                    </div>
                  </div>

                  {/* Item subtotal */}
                  {item.quantity && item.unitPrice && (
                    <p className="text-xs text-right text-muted-foreground">
                      = {(Number(parseDots(item.quantity)) * Number(parseDots(item.unitPrice))).toLocaleString()}{" "}
                      {locationCurrency}
                    </p>
                  )}
                </div>
              );
            })}

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={addItem}
            >
              + {t("addItem")}
            </Button>

            {/* Grand total */}
            {grandTotal !== 0 && (
              <div className="flex justify-between items-center rounded-xl border px-4 py-3 bg-muted/40 font-medium">
                <span className="text-sm">{t("totalPrice")}</span>
                <span className="font-mono">
                  {grandTotal.toLocaleString()} {locationCurrency}
                </span>
              </div>
            )}
          </div>

          {/* Notes — required when negative qty */}
          <div>
            <label className="text-sm font-medium mb-1 block">
              {t("notes")}
              {hasNegativeQty && (
                <span className="ml-1 text-yellow-600 font-normal text-xs">
                  * {t("required")}
                </span>
              )}
            </label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={
                hasNegativeQty ? t("negativeQtyNotePlaceholder") : t("optional")
              }
              required={hasNegativeQty}
              className={hasNegativeQty && !notes.trim() ? "border-yellow-400 focus-visible:ring-yellow-400" : ""}
            />
          </div>

          {/* Attachments */}
          <div>
            <label className="text-sm font-medium mb-1 block">
              {t("attachments")} ({t("imagesAndFiles")}){" "}
              <span className="text-muted-foreground font-normal text-xs">
                — {t("maxFiles")}
              </span>
            </label>
            <Input
              type="file"
              multiple
              accept="image/*,.pdf,.doc,.docx,.xlsx"
              onChange={(e) => {
                const selected = Array.from(e.target.files || []);
                if (selected.length > 5) {
                  toast({ title: t("maxFilesExceeded"), variant: "destructive" });
                  e.target.value = "";
                  return;
                }
                setFiles(selected);
              }}
            />
            {files.length > 0 && (
              <div className="mt-2 space-y-1">
                {files.map((file, i) => {
                  const isImage = file.type.startsWith("image/");
                  return (
                    <div
                      key={i}
                      className="flex items-center justify-between text-xs text-muted-foreground"
                    >
                      <span className="truncate max-w-[70%]">
                        {isImage ? "🖼️" : "📄"} {file.name}
                      </span>
                      {isImage && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs"
                          onClick={() =>
                            setPreviewUrl(URL.createObjectURL(file))
                          }
                        >
                          {t("previewImage")}
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? t("submitting") : t("confirmImport")}
          </Button>
        </form>
      </main>

      {/* Product Picker Dialog */}
      <Dialog open={pickerOpen} onOpenChange={(open) => { setPickerOpen(open); if (!open) setPickerView("search"); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {pickerView === "add" ? t("addNewProduct") : t("selectProduct")}
            </DialogTitle>
          </DialogHeader>

          {pickerView === "search" ? (
            <>
              <Input
                placeholder={t("searchProduct")}
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                autoFocus
              />
              <div className="mt-2 max-h-72 overflow-y-auto space-y-1">
                {filteredProducts.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    {t("noProductFound")}
                  </p>
                ) : (
                  filteredProducts.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => selectProduct(p)}
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
                  onClick={() => setPickerView("add")}
                  className="text-xs text-primary hover:underline"
                >
                  + {t("addNewProduct")}
                </button>
              </div>
            </>
          ) : (
            <form onSubmit={handleCreateProduct} className="space-y-3 mt-1">
              <div>
                <label className="text-sm font-medium mb-1 block">
                  {t("itemName")} *
                </label>
                <Input
                  value={newProductName}
                  onChange={(e) => setNewProductName(e.target.value)}
                  autoFocus
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">
                  {t("sku")}
                </label>
                <Input
                  value={newProductSku}
                  onChange={(e) => setNewProductSku(e.target.value)}
                  placeholder={t("optional")}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">
                  {t("unit")} *
                </label>
                <Input
                  value={newProductUnit}
                  onChange={(e) => setNewProductUnit(e.target.value)}
                  placeholder={t("unitPlaceholder")}
                  required
                />
              </div>
              <div className="flex gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setPickerView("search")}
                >
                  ← {t("back")}
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={isCreatingProduct || !newProductName.trim() || !newProductUnit.trim()}
                >
                  {isCreatingProduct ? t("creating") : t("addItem")}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Add New Supplier Dialog */}
      <Dialog open={supplierDialogOpen} onOpenChange={setSupplierDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("addNewSupplier")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateSupplier} className="space-y-3 mt-1">
            <div>
              <label className="text-sm font-medium mb-1 block">
                {t("supplierName")} *
              </label>
              <Input
                value={newSupplier.name}
                onChange={(e) => setNewSupplier((f) => ({ ...f, name: e.target.value }))}
                autoFocus
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">
                {t("supplierCompany")}
              </label>
              <Input
                value={newSupplier.address}
                onChange={(e) => setNewSupplier((f) => ({ ...f, address: e.target.value }))}
                placeholder={t("optional")}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">
                  {t("phone")}
                </label>
                <Input
                  value={newSupplier.phone}
                  onChange={(e) => setNewSupplier((f) => ({ ...f, phone: e.target.value }))}
                  placeholder={t("optional")}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">
                  {t("email")}
                </label>
                <Input
                  type="email"
                  value={newSupplier.email}
                  onChange={(e) => setNewSupplier((f) => ({ ...f, email: e.target.value }))}
                  placeholder={t("optional")}
                />
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setSupplierDialogOpen(false)}
              >
                {t("back")}
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={isCreatingSupplier || !newSupplier.name.trim()}
              >
                {isCreatingSupplier ? t("creating") : t("addSupplier")}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Image Preview Dialog */}
      {previewUrl && (
        <Dialog open={!!previewUrl} onOpenChange={() => setPreviewUrl(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{t("previewImage")}</DialogTitle>
            </DialogHeader>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="preview"
              className="w-full rounded-lg object-contain max-h-[70vh]"
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
