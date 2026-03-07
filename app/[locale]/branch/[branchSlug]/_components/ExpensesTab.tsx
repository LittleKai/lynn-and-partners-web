"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import axiosInstance from "@/utils/axiosInstance";
import { formatWithDots, parseDots } from "@/utils/formatNumber";
import { AttachmentSlots } from "@/components/ui/attachment-slots";
import { ImagePreviewDialog } from "@/components/ui/image-preview-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Paperclip, Pencil, Trash2 } from "lucide-react";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
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
import type { Location, Expense } from "../_types";

interface ExpensesTabProps {
  branchId: string;
  location: Location | null;
  expenses: Expense[];
  setExpenses: React.Dispatch<React.SetStateAction<Expense[]>>;
  isAdmin: boolean;
  currentUserId: string;
}

const EXPENSE_TYPES = ["RENT","UTILITIES","SALARY","MAINTENANCE","SUPPLIES","CLEANING","SECURITY","INSURANCE","REPAIR","OTHER"] as const;

export function ExpensesTab({
  branchId,
  location,
  expenses,
  setExpenses,
  isAdmin,
  currentUserId,
}: ExpensesTabProps) {
  const t = useTranslations("inventory");
  const { toast } = useToast();

  // ── Filter / sort state ────────────────────────────────────────────
  const [expTypeFilter, setExpTypeFilter] = useState("ALL");
  const [expMonthFilter, setExpMonthFilter] = useState(() => new Date().toISOString().slice(0, 7));
  const [expSort, setExpSort] = useState("date_desc");

  // ── Add dialog ─────────────────────────────────────────────────────
  const [showExpenseDialog, setShowExpenseDialog] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    type: "OTHER",
    amount: "",
    currency: "VND",
    description: "",
  });
  const [expenseFiles, setExpenseFiles] = useState<(File | null)[]>(Array(10).fill(null));
  const [isExpenseSubmitting, setIsExpenseSubmitting] = useState(false);

  // ── Edit dialog ────────────────────────────────────────────────────
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [editForm, setEditForm] = useState({
    type: "OTHER",
    amount: "",
    currency: "VND",
    description: "",
  });
  const [editExistingImageUrls, setEditExistingImageUrls] = useState<string[]>([]);
  const [editExistingFileUrls, setEditExistingFileUrls] = useState<string[]>([]);
  const [editNewFiles, setEditNewFiles] = useState<(File | null)[]>(Array(10).fill(null));
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);

  // ── Attachments viewer ─────────────────────────────────────────────
  const [viewingAttachments, setViewingAttachments] = useState<Expense | null>(null);
  const [previewImages, setPreviewImages] = useState<string[]>([]);
  const [previewIndex, setPreviewIndex] = useState(0);

  // ── Delete ─────────────────────────────────────────────────────────
  const [deletingExpense, setDeletingExpense] = useState<Expense | null>(null);
  const [isDeletingExpense, setIsDeletingExpense] = useState(false);

  const doDeleteExpense = async () => {
    if (!deletingExpense) return;
    setIsDeletingExpense(true);
    try {
      await axiosInstance.delete(`/locations/${branchId}/expenses/${deletingExpense.id}`);
      setExpenses((prev) => prev.filter((e) => e.id !== deletingExpense.id));
      setDeletingExpense(null);
      toast({ title: t("expenseDeleted") });
    } catch {
      toast({ title: t("expenseDeleteFailed"), variant: "destructive" });
    } finally {
      setIsDeletingExpense(false);
    }
  };

  // ── Computed ──────────────────────────────────────────────────────
  const expenseTypes = useMemo(
    () => [...new Set(expenses.map((e) => e.type))].sort(),
    [expenses]
  );

  const filteredExpenses = useMemo(() => {
    let list = expenses.filter((e) => {
      if (expTypeFilter !== "ALL" && e.type !== expTypeFilter) return false;
      if (expMonthFilter && e.createdAt.slice(0, 7) !== expMonthFilter) return false;
      return true;
    });

    const [field, dir] = expSort.split("_");
    list = [...list].sort((a, b) => {
      if (field === "date") {
        const diff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        return dir === "asc" ? diff : -diff;
      }
      if (field === "amount") {
        return dir === "asc" ? a.amount - b.amount : b.amount - a.amount;
      }
      return 0;
    });
    return list;
  }, [expenses, expTypeFilter, expMonthFilter, expSort]);

  const filteredTotal = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const exp of filteredExpenses) {
      const cur = exp.currency || "VND";
      totals[cur] = (totals[cur] || 0) + exp.amount;
    }
    return totals;
  }, [filteredExpenses]);

  // ── Add expense ────────────────────────────────────────────────────
  const openExpenseDialog = () => {
    setExpenseForm({
      type: "OTHER",
      amount: "",
      currency: location?.currency || "VND",
      description: "",
    });
    setExpenseFiles(Array(10).fill(null));
    setShowExpenseDialog(true);
  };

  const handleExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseForm.amount) return;
    setIsExpenseSubmitting(true);
    try {
      const locName = location?.name || "general";
      const imageUrls: string[] = [];
      const fileUrls: string[] = [];
      for (const file of expenseFiles.filter((f): f is File => f !== null)) {
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
      await axiosInstance.post(`/locations/${branchId}/expenses`, {
        type: expenseForm.type,
        amount: Number(parseDots(expenseForm.amount)),
        currency: expenseForm.currency,
        description: expenseForm.description || undefined,
        imageUrls,
        fileUrls,
      });
      toast({ title: t("expenseAdded") });
      setShowExpenseDialog(false);
      const expRes = await axiosInstance.get(`/locations/${branchId}/expenses`).catch(() => null);
      if (expRes) setExpenses(expRes.data.expenses);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: unknown } } };
      toast({
        title: t("expenseFailed"),
        description: typeof error.response?.data?.error === "string" ? error.response?.data?.error : undefined,
        variant: "destructive",
      });
    } finally {
      setIsExpenseSubmitting(false);
    }
  };

  // ── Edit expense ───────────────────────────────────────────────────
  const openEditDialog = (exp: Expense) => {
    setEditingExpense(exp);
    setEditForm({
      type: exp.type,
      amount: formatWithDots(String(exp.amount)),
      currency: exp.currency || "VND",
      description: exp.description || "",
    });
    setEditExistingImageUrls(exp.imageUrls || []);
    setEditExistingFileUrls(exp.fileUrls || []);
    setEditNewFiles(Array(10).fill(null));
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingExpense || !editForm.amount) return;
    setIsEditSubmitting(true);
    try {
      const locName = location?.name || "general";
      const newImageUrls: string[] = [];
      const newFileUrls: string[] = [];
      for (const file of editNewFiles.filter((f): f is File => f !== null)) {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("locationName", locName);
        try {
          const r = await axiosInstance.post("/upload", fd, {
            headers: { "Content-Type": "multipart/form-data" },
          });
          if (r.data.resourceType === "image") newImageUrls.push(r.data.url);
          else newFileUrls.push(r.data.url);
        } catch { /* continue */ }
      }

      const res = await axiosInstance.put(
        `/locations/${branchId}/expenses/${editingExpense.id}`,
        {
          type: editForm.type,
          amount: Number(parseDots(editForm.amount)),
          currency: editForm.currency,
          description: editForm.description || null,
          imageUrls: [...editExistingImageUrls, ...newImageUrls],
          fileUrls: [...editExistingFileUrls, ...newFileUrls],
        }
      );
      setExpenses((prev) =>
        prev.map((e) => (e.id === editingExpense.id ? res.data.expense : e))
      );
      toast({ title: t("expenseUpdated") });
      setEditingExpense(null);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: unknown } } };
      toast({
        title: t("updateExpenseFailed"),
        description: typeof error.response?.data?.error === "string" ? error.response?.data?.error : undefined,
        variant: "destructive",
      });
    } finally {
      setIsEditSubmitting(false);
    }
  };

  const canEdit = (exp: Expense) => isAdmin || exp.createdById === currentUserId;

  return (
    <>
      <div className="space-y-3">
        <div className="flex justify-end">
          <Button size="sm" onClick={openExpenseDialog}>
            {t("addExpense")}
          </Button>
        </div>

        {/* Filter bar */}
        <div className="flex flex-wrap gap-2 items-center">
          <Select value={expTypeFilter} onValueChange={setExpTypeFilter}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">{t("all")}</SelectItem>
              {expenseTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  <span className="capitalize">{type}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-1">
            <Input
              type="month"
              value={expMonthFilter}
              onChange={(e) => setExpMonthFilter(e.target.value)}
              className="w-44 h-10"
            />
            {expMonthFilter && (
              <Button
                variant="ghost"
                size="sm"
                className="h-10 px-2 text-muted-foreground"
                onClick={() => setExpMonthFilter("")}
                title={t("allMonths")}
              >
                ✕
              </Button>
            )}
          </div>
          <Select value={expSort} onValueChange={setExpSort}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date_desc">{t("date")} ↓ (newest)</SelectItem>
              <SelectItem value="date_asc">{t("date")} ↑ (oldest)</SelectItem>
              <SelectItem value="amount_desc">{t("amount")} ↓</SelectItem>
              <SelectItem value="amount_asc">{t("amount")} ↑</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Total summary */}
        {filteredExpenses.length > 0 && (
          <div className="flex items-center justify-between px-4 py-2.5 rounded-lg bg-muted/60 border text-sm">
            <span className="text-muted-foreground">{filteredExpenses.length} {t("expenses").toLowerCase()}</span>
            <div className="flex items-center gap-3 font-medium">
              <span className="text-muted-foreground font-normal">{t("totalExpenses")}:</span>
              {Object.entries(filteredTotal).map(([currency, amount]) => (
                <span key={currency} className="font-mono tabular-nums">
                  {amount.toLocaleString()} <span className="text-muted-foreground text-xs font-sans">{currency}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {filteredExpenses.length === 0 ? (
          <p className="text-muted-foreground">{t("noExpenses")}</p>
        ) : (
          <div className="rounded-xl border overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">{t("type")}</th>
                  <th className="px-4 py-3 text-right font-medium">{t("amount")}</th>
                  <th className="px-4 py-3 text-left font-medium">{t("description")}</th>
                  <th className="px-4 py-3 text-left font-medium">{t("createdBy")}</th>
                  <th className="px-4 py-3 text-left font-medium">{t("date")}</th>
                  <th className="px-2 py-3 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {filteredExpenses.map((exp) => {
                  const attachCount = (exp.imageUrls?.length || 0) + (exp.fileUrls?.length || 0);
                  return (
                    <tr key={exp.id} className="border-t hover:bg-muted/50">
                      <td className="px-4 py-3 capitalize">{exp.type}</td>
                      <td className="px-4 py-3 text-right font-mono">
                        {exp.amount.toLocaleString()} {exp.currency || "VND"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {exp.description || "—"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        {exp.createdByName || "—"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        {new Date(exp.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-2 py-3">
                        <div className="flex items-center gap-1">
                          {attachCount > 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-muted-foreground hover:text-foreground"
                              onClick={() => setViewingAttachments(exp)}
                            >
                              <Paperclip className="h-3.5 w-3.5" />
                              <span className="ml-1 text-xs tabular-nums">{attachCount}</span>
                            </Button>
                          )}
                          {canEdit(exp) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-muted-foreground hover:text-foreground"
                              onClick={() => openEditDialog(exp)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {isAdmin && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-destructive hover:text-destructive"
                              onClick={() => setDeletingExpense(exp)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Attachments Viewer Dialog ── */}
      <Dialog open={!!viewingAttachments} onOpenChange={(open) => { if (!open) setViewingAttachments(null); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("attachments")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {viewingAttachments?.imageUrls && viewingAttachments.imageUrls.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">{t("previewImage")}</p>
                <div className="grid grid-cols-3 gap-2">
                  {viewingAttachments.imageUrls.map((url, i) => (
                    <button
                      key={i}
                      onClick={() => { setPreviewImages(viewingAttachments.imageUrls!); setPreviewIndex(i); }}
                      className="aspect-square rounded-lg overflow-hidden border hover:opacity-80 transition-opacity"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            )}
            {viewingAttachments?.fileUrls && viewingAttachments.fileUrls.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">{t("files")}</p>
                <div className="space-y-1">
                  {viewingAttachments.fileUrls.map((url, i) => (
                    <a
                      key={i}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-primary hover:underline"
                    >
                      <Paperclip className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{decodeURIComponent(url.split("/").pop() || `File ${i + 1}`)}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Add Expense Dialog ── */}
      <Dialog open={showExpenseDialog} onOpenChange={setShowExpenseDialog}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("addExpense")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleExpenseSubmit} className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium mb-1 block">{t("expenseType")}</label>
              <Select
                value={expenseForm.type}
                onValueChange={(v) => setExpenseForm((f) => ({ ...f, type: v }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EXPENSE_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {t(`expense${type.charAt(0) + type.slice(1).toLowerCase()}` as Parameters<typeof t>[0])}
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
                  value={expenseForm.amount}
                  onChange={(e) =>
                    setExpenseForm((f) => ({ ...f, amount: formatWithDots(e.target.value) }))
                  }
                  required
                  className="flex-1"
                />
                <Select
                  value={expenseForm.currency}
                  onValueChange={(v) => setExpenseForm((f) => ({ ...f, currency: v }))}
                >
                  <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
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
                value={expenseForm.description}
                onChange={(e) => setExpenseForm((f) => ({ ...f, description: e.target.value }))}
                placeholder={t("optional")}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">{t("attachments")}</label>
              <AttachmentSlots
                files={expenseFiles}
                onChange={setExpenseFiles}
                accept="image/*,.pdf,.doc,.docx"
                maxSlots={10}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isExpenseSubmitting}>
              {isExpenseSubmitting ? t("submitting") : t("addExpense")}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Edit Expense Dialog ── */}
      <Dialog open={!!editingExpense} onOpenChange={(open) => { if (!open) setEditingExpense(null); }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("editExpense")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium mb-1 block">{t("expenseType")}</label>
              <Select
                value={editForm.type}
                onValueChange={(v) => setEditForm((f) => ({ ...f, type: v }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EXPENSE_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {t(`expense${type.charAt(0) + type.slice(1).toLowerCase()}` as Parameters<typeof t>[0])}
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
                  value={editForm.amount}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, amount: formatWithDots(e.target.value) }))
                  }
                  required
                  className="flex-1"
                />
                <Select
                  value={editForm.currency}
                  onValueChange={(v) => setEditForm((f) => ({ ...f, currency: v }))}
                >
                  <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
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
                value={editForm.description}
                onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                placeholder={t("optional")}
              />
            </div>
            {/* ── Attachments ── */}
            <div>
              <label className="text-sm font-medium mb-2 block">{t("attachments")}</label>
              <div className="flex gap-2 flex-wrap">
                {/* Existing images */}
                {editExistingImageUrls.map((url, i) => (
                  <div key={`img-${i}`} className="relative w-14 h-14 shrink-0">
                    <div className="w-14 h-14 rounded-lg border overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={url}
                        alt=""
                        className="w-full h-full object-cover cursor-pointer hover:opacity-80"
                        onClick={() => { setPreviewImages(editExistingImageUrls); setPreviewIndex(i); }}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditExistingImageUrls((prev) => prev.filter((_, idx) => idx !== i))}
                      className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-destructive text-white text-[11px] font-bold flex items-center justify-center leading-none shadow hover:bg-destructive/80 transition-colors z-10"
                      aria-label="Remove"
                    >
                      ×
                    </button>
                  </div>
                ))}
                {/* Existing files */}
                {editExistingFileUrls.map((url, i) => (
                  <div key={`file-${i}`} className="relative w-14 h-14 shrink-0">
                    <div className="w-14 h-14 rounded-lg border overflow-hidden">
                      <div className="w-full h-full flex flex-col items-center justify-center bg-muted gap-0.5 p-1">
                        <span className="text-base leading-none">📄</span>
                        <span className="text-[8px] text-muted-foreground text-center line-clamp-2 leading-tight break-all">
                          {decodeURIComponent(url.split("/").pop() || `File ${i + 1}`)}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditExistingFileUrls((prev) => prev.filter((_, idx) => idx !== i))}
                      className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-destructive text-white text-[11px] font-bold flex items-center justify-center leading-none shadow hover:bg-destructive/80 transition-colors z-10"
                      aria-label="Remove"
                    >
                      ×
                    </button>
                  </div>
                ))}
                {/* New file slots */}
                <AttachmentSlots
                  files={editNewFiles}
                  onChange={setEditNewFiles}
                  maxSlots={Math.max(1, 10 - editExistingImageUrls.length - editExistingFileUrls.length)}
                  accept="image/*,.pdf,.doc,.docx"
                />
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingExpense(null)}
                disabled={isEditSubmitting}
              >
                {t("cancel")}
              </Button>
              <Button type="submit" disabled={isEditSubmitting}>
                {isEditSubmitting ? t("submitting") : t("save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Image Preview ── */}
      <ImagePreviewDialog
        images={previewImages}
        initialIndex={previewIndex}
        open={previewImages.length > 0}
        onClose={() => setPreviewImages([])}
      />

      {/* ── Delete Expense Confirmation ── */}
      <DeleteConfirmDialog
        open={!!deletingExpense}
        onClose={() => setDeletingExpense(null)}
        onConfirm={doDeleteExpense}
        isDeleting={isDeletingExpense}
        confirmText="DELETE"
      />
    </>
  );
}
