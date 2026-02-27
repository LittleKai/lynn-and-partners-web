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

const emptyForm = {
  name: "",
  type: "warehouse",
  currency: "VND",
  description: "",
  address: "",
};

export default function LocationsPage() {
  const t = useTranslations("admin");
  const { toast } = useToast();

  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Create
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ ...emptyForm });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [editForm, setEditForm] = useState({ ...emptyForm });
  const [isEditing, setIsEditing] = useState(false);

  // Delete confirmation
  const [deletingLocation, setDeletingLocation] = useState<Location | null>(null);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

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

  // ── Create ──────────────────────────────────────────────────────────
  const handleCreate = async () => {
    if (!createForm.name.trim()) return;
    setIsSubmitting(true);
    try {
      const res = await axiosInstance.post("/admin/locations", createForm);
      setLocations((prev) => [res.data.location, ...prev]);
      setShowCreate(false);
      setCreateForm({ ...emptyForm });
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

  // ── Edit ────────────────────────────────────────────────────────────
  const openEdit = (loc: Location) => {
    setEditingLocation(loc);
    setEditForm({
      name: loc.name,
      type: loc.type,
      currency: loc.currency || "VND",
      description: loc.description || "",
      address: loc.address || "",
    });
  };

  const handleEdit = async () => {
    if (!editingLocation || !editForm.name.trim()) return;
    setIsEditing(true);
    try {
      const res = await axiosInstance.put(
        `/admin/locations/${editingLocation.id}`,
        editForm
      );
      setLocations((prev) =>
        prev.map((l) =>
          l.id === editingLocation.id ? res.data.location : l
        )
      );
      setEditingLocation(null);
      toast({ title: t("locationSaved") });
    } catch {
      toast({ title: t("saveFailed"), variant: "destructive" });
    } finally {
      setIsEditing(false);
    }
  };

  // ── Delete ──────────────────────────────────────────────────────────
  const openDelete = (loc: Location) => {
    setDeletingLocation(loc);
    setDeleteConfirmName("");
  };

  const handleDeleteConfirmed = async () => {
    if (!deletingLocation) return;
    setIsDeleting(true);
    try {
      await axiosInstance.delete(`/admin/locations/${deletingLocation.id}`);
      setLocations((prev) => prev.filter((l) => l.id !== deletingLocation.id));
      setDeletingLocation(null);
      setDeleteConfirmName("");
      toast({ title: t("locationDeleted") });
    } catch {
      toast({ title: t("deleteFailed"), variant: "destructive" });
    } finally {
      setIsDeleting(false);
    }
  };

  // ── Shared form fields ───────────────────────────────────────────────
  const LocationFormFields = ({
    form,
    setForm,
  }: {
    form: typeof emptyForm;
    setForm: React.Dispatch<React.SetStateAction<typeof emptyForm>>;
  }) => (
    <div className="space-y-3 py-2">
      <Input
        placeholder={`${t("locationName")} *`}
        value={form.name}
        onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
        autoFocus
      />
      <div className="grid grid-cols-2 gap-3">
        <Select
          value={form.type}
          onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}
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
          value={form.currency}
          onValueChange={(v) => setForm((f) => ({ ...f, currency: v }))}
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
      </div>
      <Input
        placeholder={t("description")}
        value={form.description}
        onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
      />
      <Input
        placeholder={t("address")}
        value={form.address}
        onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
      />
    </div>
  );

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
            <div key={loc.id} className="rounded-xl border bg-card p-5 space-y-3">
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
                  variant="outline"
                  size="sm"
                  onClick={() => openEdit(loc)}
                >
                  ✏️ {t("editLocation")}
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => openDelete(loc)}
                >
                  {t("delete")}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Create Dialog ── */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("createLocation")}</DialogTitle>
          </DialogHeader>
          <LocationFormFields form={createForm} setForm={setCreateForm} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>
              {t("cancel")}
            </Button>
            <Button
              onClick={handleCreate}
              disabled={isSubmitting || !createForm.name.trim()}
            >
              {isSubmitting ? t("creating") : t("create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit Dialog ── */}
      <Dialog
        open={!!editingLocation}
        onOpenChange={(open) => !open && setEditingLocation(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>✏️ {t("editLocation")} — {editingLocation?.name}</DialogTitle>
          </DialogHeader>
          <LocationFormFields form={editForm} setForm={setEditForm} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingLocation(null)}>
              {t("cancel")}
            </Button>
            <Button
              onClick={handleEdit}
              disabled={isEditing || !editForm.name.trim()}
            >
              {isEditing ? t("saving") : t("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation Dialog ── */}
      <Dialog
        open={!!deletingLocation}
        onOpenChange={(open) => {
          if (!open) {
            setDeletingLocation(null);
            setDeleteConfirmName("");
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive">
              🗑️ {t("confirmDeleteLocation")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-1">
            <p className="text-sm text-muted-foreground">
              {t("deleteLocationWarning")}
            </p>
            <div className="rounded-lg bg-muted px-4 py-2 text-sm font-mono font-semibold">
              {deletingLocation?.name}
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">
                {t("typeNameToConfirm")}
              </label>
              <Input
                value={deleteConfirmName}
                onChange={(e) => setDeleteConfirmName(e.target.value)}
                placeholder={deletingLocation?.name}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeletingLocation(null);
                setDeleteConfirmName("");
              }}
            >
              {t("cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirmed}
              disabled={
                isDeleting ||
                deleteConfirmName !== deletingLocation?.name
              }
            >
              {isDeleting ? t("deleting") : t("delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
