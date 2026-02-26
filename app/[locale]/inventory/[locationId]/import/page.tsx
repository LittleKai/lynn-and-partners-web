"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/app/authContext";
import { useTranslations } from "next-intl";
import axiosInstance from "@/utils/axiosInstance";
import { formatWithDots, parseDots } from "@/utils/formatNumber";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
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

  const getProduct = (id: string) => products.find((p) => p.id === id);

  // ── Product picker ───────────────────────────────────────────────
  const openPicker = (uid: string) => {
    setPickerItemUid(uid);
    setProductSearch("");
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
    const validItems = items.filter((i) => i.productId && i.quantity);
    if (validItems.length === 0) return;
    setIsSubmitting(true);
    try {
      const { imageUrls, fileUrls } = await uploadFiles(locationName);
      await Promise.all(
        validItems.map((item) => {
          const qty = Number(parseDots(item.quantity));
          const unitPrice = item.unitPrice
            ? Number(parseDots(item.unitPrice))
            : undefined;
          return axiosInstance.post(`/locations/${locationId}/transactions`, {
            productId: item.productId,
            type: "IMPORT",
            quantity: qty,
            unitPrice,
            totalPrice: unitPrice ? unitPrice * qty : undefined,
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
          </div>

          {/* Items */}
          <div className="space-y-3">
            {items.map((item, idx) => {
              const prod = getProduct(item.productId);
              return (
                <div
                  key={item.uid}
                  className="rounded-xl border p-4 space-y-3 bg-card"
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
                      {t("selectProduct")}
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
                      <p className="text-xs text-muted-foreground mt-1">
                        {t("currentStock")}: {prod.quantity.toLocaleString()}
                      </p>
                    )}
                  </div>

                  {/* Quantity + Unit Price */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium mb-1 block">
                        {t("quantity")}
                      </label>
                      <Input
                        type="text"
                        inputMode="numeric"
                        value={item.quantity}
                        onChange={(e) =>
                          updateItem(
                            item.uid,
                            "quantity",
                            formatWithDots(e.target.value)
                          )
                        }
                        required={idx === 0}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block">
                        {t("unitPrice")}{" "}
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
                        placeholder={t("optional")}
                      />
                    </div>
                  </div>
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
          </div>

          {/* Notes */}
          <div>
            <label className="text-sm font-medium mb-1 block">
              {t("notes")}
            </label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t("optional")}
            />
          </div>

          {/* Attachments */}
          <div>
            <label className="text-sm font-medium mb-1 block">
              {t("attachments")} ({t("imagesAndFiles")})
            </label>
            <Input
              type="file"
              multiple
              accept="image/*,.pdf,.doc,.docx,.xlsx"
              onChange={(e) => setFiles(Array.from(e.target.files || []))}
            />
            {files.length > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                {files.length} {t("filesSelected")}
              </p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? t("submitting") : t("confirmImport")}
          </Button>
        </form>
      </main>

      {/* Product Picker Dialog */}
      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("selectProduct")}</DialogTitle>
          </DialogHeader>
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
                    {p.sku} · {t("currentStock")}: {p.quantity.toLocaleString()}
                  </p>
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
