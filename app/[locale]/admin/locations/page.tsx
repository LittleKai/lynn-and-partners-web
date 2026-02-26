"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import axiosInstance from "@/utils/axiosInstance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Location {
  id: string;
  name: string;
  type: string;
  currency: string;
  description: string | null;
  address: string | null;
  createdAt: string;
}

const LOCATION_TYPES = ["hotel", "apartment", "warehouse", "office", "store", "other"];

const LOCATION_TYPE_ICONS: Record<string, string> = {
  hotel: "🏨",
  apartment: "🏠",
  warehouse: "🏭",
  office: "🏢",
  store: "🏪",
  other: "📍",
};

export default function LocationsPage() {
  const t = useTranslations("admin");
  const { toast } = useToast();

  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "",
    type: "warehouse",
    currency: "VND",
    description: "",
    address: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadLocations();
  }, []);

  const loadLocations = async () => {
    try {
      const res = await axiosInstance.get("/admin/locations");
      setLocations(res.data.locations);
    } catch {
      toast({ title: t("loadFailed"), variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!createForm.name) return;
    setIsSubmitting(true);
    try {
      const res = await axiosInstance.post("/admin/locations", createForm);
      setLocations((prev) => [res.data.location, ...prev]);
      setShowCreate(false);
      setCreateForm({ name: "", type: "warehouse", currency: "VND", description: "", address: "" });
      toast({ title: t("locationCreated") });
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      toast({
        title: t("createFailed"),
        description: error.response?.data?.error,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t("confirmDelete"))) return;
    try {
      await axiosInstance.delete(`/admin/locations/${id}`);
      setLocations((prev) => prev.filter((l) => l.id !== id));
      toast({ title: t("locationDeleted") });
    } catch {
      toast({ title: t("deleteFailed"), variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin">
            <Button variant="outline" size="sm">← {t("back")}</Button>
          </Link>
          <h2 className="text-2xl font-bold">{t("manageLocations")}</h2>
        </div>
        <Button onClick={() => setShowCreate(true)}>+ {t("createLocation")}</Button>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">{t("loading")}</p>
      ) : locations.length === 0 ? (
        <p className="text-muted-foreground">{t("noLocations")}</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {locations.map((loc) => (
            <div
              key={loc.id}
              className="rounded-xl border bg-card p-5 space-y-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-2xl">
                    {LOCATION_TYPE_ICONS[loc.type] || "📍"}
                  </span>
                  <h3 className="font-semibold mt-1">{loc.name}</h3>
                  <p className="text-xs text-muted-foreground capitalize">
                    {t(`locationType.${loc.type}`) || loc.type}
                  </p>
                  <p className="text-xs text-muted-foreground font-mono">
                    {loc.currency || "VND"}
                  </p>
                </div>
              </div>
              {loc.description && (
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {loc.description}
                </p>
              )}
              {loc.address && (
                <p className="text-xs text-muted-foreground">📌 {loc.address}</p>
              )}
              <div className="flex gap-2 pt-1">
                <Link href={`/admin/locations/${loc.id}`} className="flex-1">
                  <Button variant="outline" size="sm" className="w-full">
                    {t("manage")}
                  </Button>
                </Link>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDelete(loc.id)}
                >
                  {t("delete")}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("createLocation")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Input
              placeholder={t("locationName")}
              value={createForm.name}
              onChange={(e) =>
                setCreateForm((f) => ({ ...f, name: e.target.value }))
              }
            />
            <Select
              value={createForm.type}
              onValueChange={(v) =>
                setCreateForm((f) => ({ ...f, type: v }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder={t("selectType")} />
              </SelectTrigger>
              <SelectContent>
                {LOCATION_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {LOCATION_TYPE_ICONS[type]} {t(`locationType.${type}`) || type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={createForm.currency}
              onValueChange={(v) => setCreateForm((f) => ({ ...f, currency: v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("defaultCurrency")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="VND">🇻🇳 VND</SelectItem>
                <SelectItem value="USD">🇺🇸 USD</SelectItem>
                <SelectItem value="EUR">🇪🇺 EUR</SelectItem>
              </SelectContent>
            </Select>
            <Input
              placeholder={t("description")}
              value={createForm.description}
              onChange={(e) =>
                setCreateForm((f) => ({ ...f, description: e.target.value }))
              }
            />
            <Input
              placeholder={t("address")}
              value={createForm.address}
              onChange={(e) =>
                setCreateForm((f) => ({ ...f, address: e.target.value }))
              }
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>
              {t("cancel")}
            </Button>
            <Button onClick={handleCreate} disabled={isSubmitting}>
              {isSubmitting ? t("creating") : t("create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
