"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
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

export default function NewExpensePage() {
  const params = useParams<{ locationId: string }>();
  const locationId = params?.locationId || "";
  const router = useRouter();
  const t = useTranslations("inventory");
  const { toast } = useToast();

  const [locationName, setLocationName] = useState("general");
  const EXPENSE_TYPES = [
    "RENT", "UTILITIES", "SALARY", "MAINTENANCE",
    "SUPPLIES", "CLEANING", "SECURITY", "INSURANCE", "REPAIR", "OTHER",
  ];

  const [form, setForm] = useState({
    type: "OTHER",
    amount: "",
    currency: "VND",
    description: "",
    notes: "",
  });
  const [files, setFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    axiosInstance
      .get("/users/me/locations")
      .then((r) => {
        const loc = r.data.locations?.find(
          (l: { id: string; name: string; currency?: string }) => l.id === locationId
        );
        if (loc) {
          setLocationName(loc.name);
          if (loc.currency) setForm((f) => ({ ...f, currency: loc.currency }));
        }
      })
      .catch(() => {});
  }, [locationId]);

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
    if (!form.amount) return;
    setIsSubmitting(true);

    try {
      const { imageUrls, fileUrls } = await uploadFiles(locationName);
      await axiosInstance.post(`/locations/${locationId}/expenses`, {
        type: form.type,
        amount: Number(parseDots(form.amount)),
        currency: form.currency,
        description: form.description || undefined,
        notes: form.notes || undefined,
        imageUrls,
        fileUrls,
      });

      toast({ title: t("expenseAdded") });
      router.push(`/inventory/${locationId}?tab=expenses`);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      toast({
        title: t("expenseFailed"),
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

        <h2 className="text-2xl font-bold">{t("addExpense")}</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">{t("expenseType")}</label>
            <Select
              value={form.type}
              onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EXPENSE_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {t(`expense${type.charAt(0) + type.slice(1).toLowerCase()}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">{t("amount")}</label>
            <div className="flex gap-2">
              <Input
                type="text"
                inputMode="numeric"
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: formatWithDots(e.target.value) }))}
                required
                className="flex-1"
              />
              <Select
                value={form.currency}
                onValueChange={(v) => setForm((f) => ({ ...f, currency: v }))}
              >
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="VND">🇻🇳 VND</SelectItem>
                  <SelectItem value="USD">🇺🇸 USD</SelectItem>
                  <SelectItem value="EUR">🇪🇺 EUR</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">{t("description")}</label>
            <Input
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
              placeholder={t("optional")}
            />
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
            {isSubmitting ? t("submitting") : t("addExpense")}
          </Button>
        </form>
      </main>
    </div>
  );
}
