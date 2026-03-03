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
import type { Location, Expense } from "../_types";

interface ExpensesTabProps {
  locationId: string;
  location: Location | null;
  expenses: Expense[];
  setExpenses: React.Dispatch<React.SetStateAction<Expense[]>>;
}

export function ExpensesTab({
  locationId,
  location,
  expenses,
  setExpenses,
}: ExpensesTabProps) {
  const t = useTranslations("inventory");
  const { toast } = useToast();

  // ── Local state ───────────────────────────────────────────────────
  const [expTypeFilter, setExpTypeFilter] = useState("ALL");
  const [expMonthFilter, setExpMonthFilter] = useState(() => new Date().toISOString().slice(0, 7));
  const [expSort, setExpSort] = useState("date_desc");
  const [showExpenseDialog, setShowExpenseDialog] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    type: "OTHER",
    amount: "",
    currency: "VND",
    description: "",
    notes: "",
  });
  const [expenseFiles, setExpenseFiles] = useState<(File | null)[]>(Array(5).fill(null));
  const [isExpenseSubmitting, setIsExpenseSubmitting] = useState(false);
  const [expensePreviewUrl, setExpensePreviewUrl] = useState<string | null>(null);

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
        const diff =
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        return dir === "asc" ? diff : -diff;
      }
      if (field === "amount") {
        return dir === "asc" ? a.amount - b.amount : b.amount - a.amount;
      }
      return 0;
    });
    return list;
  }, [expenses, expTypeFilter, expMonthFilter, expSort]);

  // Total per currency for filtered expenses
  const filteredTotal = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const exp of filteredExpenses) {
      const cur = exp.currency || "VND";
      totals[cur] = (totals[cur] || 0) + exp.amount;
    }
    return totals;
  }, [filteredExpenses]);

  // ── Handlers ──────────────────────────────────────────────────────
  const openExpenseDialog = () => {
    setExpenseForm({
      type: "OTHER",
      amount: "",
      currency: location?.currency || "VND",
      description: "",
      notes: "",
    });
    setExpenseFiles(Array(5).fill(null));
    setExpensePreviewUrl(null);
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
      await axiosInstance.post(`/locations/${locationId}/expenses`, {
        type: expenseForm.type,
        amount: Number(parseDots(expenseForm.amount)),
        currency: expenseForm.currency,
        description: expenseForm.description || undefined,
        notes: expenseForm.notes || undefined,
        imageUrls,
        fileUrls,
      });
      toast({ title: t("expenseAdded") });
      setShowExpenseDialog(false);
      const expRes = await axiosInstance
        .get(`/locations/${locationId}/expenses`)
        .catch(() => null);
      if (expRes) setExpenses(expRes.data.expenses);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      toast({
        title: t("expenseFailed"),
        description: error.response?.data?.error,
        variant: "destructive",
      });
    } finally {
      setIsExpenseSubmitting(false);
    }
  };

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
                  <th className="px-4 py-3 text-left font-medium">{t("date")}</th>
                </tr>
              </thead>
              <tbody>
                {filteredExpenses.map((exp) => (
                  <tr key={exp.id} className="border-t hover:bg-muted/50">
                    <td className="px-4 py-3 capitalize">{exp.type}</td>
                    <td className="px-4 py-3 text-right font-mono">
                      {exp.amount.toLocaleString()} {exp.currency || "VND"}
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
      </div>

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
                  {["RENT","UTILITIES","SALARY","MAINTENANCE","SUPPLIES","CLEANING","SECURITY","INSURANCE","REPAIR","OTHER"].map(
                    (type) => (
                      <SelectItem key={type} value={type}>
                        {t(`expense${type.charAt(0) + type.slice(1).toLowerCase()}` as Parameters<typeof t>[0])}
                      </SelectItem>
                    )
                  )}
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
              <label className="text-sm font-medium mb-1 block">{t("notes")}</label>
              <Input
                value={expenseForm.notes}
                onChange={(e) => setExpenseForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder={t("optional")}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">{t("attachments")}</label>
              <AttachmentSlots
                files={expenseFiles}
                onChange={setExpenseFiles}
                onPreview={setExpensePreviewUrl}
                accept="image/*,.pdf,.doc,.docx"
              />
            </div>
            <Button type="submit" className="w-full" disabled={isExpenseSubmitting}>
              {isExpenseSubmitting ? t("submitting") : t("addExpense")}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Expense: Image Preview ── */}
      {expensePreviewUrl && (
        <Dialog open={!!expensePreviewUrl} onOpenChange={() => setExpensePreviewUrl(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{t("previewImage")}</DialogTitle>
            </DialogHeader>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={expensePreviewUrl}
              alt="preview"
              className="w-full rounded-lg object-contain max-h-[70vh]"
            />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
