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

export default function ExportPage() {
  const params = useParams<{ locationId: string }>();
  const locationId = params?.locationId || "";
  const { isLoggedIn, isInitializing } = useAuth();
  const router = useRouter();
  const t = useTranslations("inventory");
  const { toast } = useToast();

  const [products, setProducts] = useState<Product[]>([]);
  const [locationName, setLocationName] = useState("general");
  const [form, setForm] = useState({
    productId: "",
    quantity: "",
    notes: "",
  });
  const [files, setFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedProduct = products.find((p) => p.id === form.productId);

  useEffect(() => {
    if (isInitializing) return;
    if (!isLoggedIn) {
      router.push("/inventory/login");
      return;
    }
    axiosInstance
      .get(`/locations/${locationId}/products`)
      .then((r) => setProducts(r.data.products.filter((p: Product) => p.quantity > 0)))
      .catch(() => {});
    axiosInstance
      .get("/users/me/locations")
      .then((r) => {
        const loc = r.data.locations?.find(
          (l: { id: string; name: string }) => l.id === locationId
        );
        if (loc) setLocationName(loc.name);
      })
      .catch(() => {});
  }, [isInitializing, isLoggedIn, locationId]);

  const uploadFiles = async (locName: string): Promise<{ imageUrls: string[]; fileUrls: string[] }> => {
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
        if (res.data.resourceType === "image") {
          imageUrls.push(res.data.url);
        } else {
          fileUrls.push(res.data.url);
        }
      } catch {
        // continue
      }
    }
    return { imageUrls, fileUrls };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.productId || !form.quantity) return;
    setIsSubmitting(true);

    try {
      const { imageUrls, fileUrls } = await uploadFiles(locationName);
      await axiosInstance.post(`/locations/${locationId}/transactions`, {
        productId: form.productId,
        type: "EXPORT",
        quantity: Number(parseDots(form.quantity)),
        notes: form.notes || undefined,
        imageUrls,
        fileUrls,
      });

      toast({ title: t("exportSuccess") });
      router.push(`/inventory/${locationId}`);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      toast({
        title: t("exportFailed"),
        description: error.response?.data?.error,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-6 py-8 max-w-lg space-y-6">
        <div className="flex items-center gap-3">
          <Link
            href={`/inventory/${locationId}`}
            className="text-muted-foreground hover:text-foreground text-sm"
          >
            ← {t("back")}
          </Link>
        </div>

        <h2 className="text-2xl font-bold">{t("exportStock")}</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">
              {t("selectProduct")}
            </label>
            <Select
              value={form.productId}
              onValueChange={(v) => setForm((f) => ({ ...f, productId: v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("selectProduct")} />
              </SelectTrigger>
              <SelectContent>
                {products.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} ({p.sku}) — {t("available")}: {p.quantity}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">{t("quantity")}</label>
            <Input
              type="text"
              inputMode="numeric"
              value={form.quantity}
              onChange={(e) => setForm((f) => ({ ...f, quantity: formatWithDots(e.target.value) }))}
              required
            />
            {selectedProduct && (
              <p className="text-xs text-muted-foreground mt-1">
                {t("maxAvailable")}: {selectedProduct.quantity}
              </p>
            )}
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">{t("notes")}</label>
            <Input
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder={t("optional")}
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">
              {t("attachments")}
            </label>
            <Input
              type="file"
              multiple
              accept="image/*,.pdf,.doc,.docx"
              onChange={(e) => setFiles(Array.from(e.target.files || []))}
            />
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? t("submitting") : t("confirmExport")}
          </Button>
        </form>
      </main>
    </div>
  );
}
