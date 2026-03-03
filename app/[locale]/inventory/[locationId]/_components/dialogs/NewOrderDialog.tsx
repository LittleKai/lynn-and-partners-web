"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import axiosInstance from "@/utils/axiosInstance";
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
import type { Product, Customer, Guest, SaleOrder, NewOrderRow } from "../../_types";

interface NewOrderDialogProps {
  open: boolean;
  onClose: () => void;
  locationId: string;
  isHotel: boolean;
  products: Product[];
  customers: Customer[];
  activeGuests: Guest[];
  getCustomerName: (customerId: string | null) => string;
  onOrderCreated: (order: SaleOrder, rows: NewOrderRow[]) => void;
}

export function NewOrderDialog({
  open,
  onClose,
  locationId,
  isHotel,
  products,
  customers,
  activeGuests,
  getCustomerName,
  onOrderCreated,
}: NewOrderDialogProps) {
  const t = useTranslations("inventory");
  const { toast } = useToast();

  const [newOrderCustomerId, setNewOrderCustomerId] = useState("");
  const [newOrderGuestId, setNewOrderGuestId] = useState("");
  const [newOrderNotes, setNewOrderNotes] = useState("");
  const [newOrderRows, setNewOrderRows] = useState<NewOrderRow[]>([
    { productId: "", quantity: "1", salePrice: "0" },
  ]);
  const [isOrderSubmitting, setIsOrderSubmitting] = useState(false);

  const newOrderTotal = useMemo(
    () =>
      newOrderRows.reduce(
        (s, r) => s + (Number(r.quantity) || 0) * (Number(r.salePrice) || 0),
        0
      ),
    [newOrderRows]
  );

  const handleOrderProductChange = (index: number, productId: string) => {
    const product = products.find((p) => p.id === productId);
    setNewOrderRows((rows) =>
      rows.map((r, i) =>
        i === index
          ? { ...r, productId, salePrice: String(product?.salePrice ?? 0) }
          : r
      )
    );
  };

  const handleCreateOrder = async () => {
    if (newOrderRows.some((r) => !r.productId || Number(r.quantity) < 1)) return;
    setIsOrderSubmitting(true);
    try {
      const res = await axiosInstance.post(`/locations/${locationId}/orders`, {
        customerId: isHotel ? undefined : (newOrderCustomerId || undefined),
        guestId: isHotel ? (newOrderGuestId || undefined) : undefined,
        notes: newOrderNotes || undefined,
        items: newOrderRows.map((r) => ({
          productId: r.productId,
          quantity: Number(r.quantity),
          salePrice: Number(r.salePrice),
        })),
      });
      const newOrder: SaleOrder = res.data.order;
      onOrderCreated(newOrder, newOrderRows);
      onClose();
      setNewOrderCustomerId("");
      setNewOrderGuestId("");
      setNewOrderNotes("");
      setNewOrderRows([{ productId: "", quantity: "1", salePrice: "0" }]);
      toast({ title: t("orderCreated") });
    } catch {
      toast({ title: t("orderFailed"), variant: "destructive" });
    } finally {
      setIsOrderSubmitting(false);
    }
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      onClose();
      setNewOrderCustomerId("");
      setNewOrderGuestId("");
      setNewOrderNotes("");
      setNewOrderRows([{ productId: "", quantity: "1", salePrice: "0" }]);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>💰 {t("newOrder")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            {isHotel ? (
              <Select
                value={newOrderGuestId || "none"}
                onValueChange={(v) => setNewOrderGuestId(v === "none" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("selectGuest")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t("selectGuest")}</SelectItem>
                  {activeGuests.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {t("room")} {g.roomNumber || "?"}{getCustomerName(g.customerId) !== "—" ? ` — ${getCustomerName(g.customerId)}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Select
                value={newOrderCustomerId || "none"}
                onValueChange={(v) => setNewOrderCustomerId(v === "none" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("selectCustomer")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t("selectCustomer")}</SelectItem>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Input
              placeholder={`${t("notes")} (${t("optional")})`}
              value={newOrderNotes}
              onChange={(e) => setNewOrderNotes(e.target.value)}
            />
          </div>

          {/* Items table */}
          <div className="rounded-xl border overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">
                    {t("selectProduct")}
                  </th>
                  <th className="px-3 py-2 text-center font-medium w-24">
                    {t("quantity")}
                  </th>
                  <th className="px-3 py-2 text-right font-medium w-32">
                    {t("salePrice")}
                  </th>
                  <th className="px-3 py-2 text-right font-medium w-28">
                    {t("totalPrice")}
                  </th>
                  <th className="px-3 py-2 w-8"></th>
                </tr>
              </thead>
              <tbody>
                {newOrderRows.map((row, idx) => {
                  const product = products.find((p) => p.id === row.productId);
                  const lineTotal =
                    (Number(row.quantity) || 0) * (Number(row.salePrice) || 0);
                  return (
                    <tr key={idx} className="border-t">
                      <td className="px-3 py-2">
                        <Select
                          value={row.productId || "none"}
                          onValueChange={(v) =>
                            handleOrderProductChange(idx, v === "none" ? "" : v)
                          }
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue placeholder={t("selectProduct")} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">{t("selectProduct")}</SelectItem>
                            {products.filter((p) => p.status !== "inactive").map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.name} ({t("available")}: {p.quantity})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {product && (
                          <p className="text-xs text-muted-foreground mt-0.5 px-1">
                            {t("available")}: {product.quantity}
                          </p>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          min="1"
                          className="h-8 text-center w-20"
                          value={row.quantity}
                          onChange={(e) =>
                            setNewOrderRows((rows) =>
                              rows.map((r, i) =>
                                i === idx ? { ...r, quantity: e.target.value } : r
                              )
                            )
                          }
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          min="0"
                          className="h-8 text-right w-28"
                          value={row.salePrice}
                          onChange={(e) =>
                            setNewOrderRows((rows) =>
                              rows.map((r, i) =>
                                i === idx ? { ...r, salePrice: e.target.value } : r
                              )
                            )
                          }
                        />
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-sm">
                        {lineTotal.toLocaleString()}
                      </td>
                      <td className="px-3 py-2">
                        {newOrderRows.length > 1 && (
                          <button
                            type="button"
                            className="text-destructive hover:opacity-80"
                            onClick={() =>
                              setNewOrderRows((rows) => rows.filter((_, i) => i !== idx))
                            }
                          >
                            ✕
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t bg-muted/50">
                  <td colSpan={3} className="px-3 py-2 text-right font-medium">
                    {t("orderTotal")}:
                  </td>
                  <td className="px-3 py-2 text-right font-mono font-bold">
                    {newOrderTotal.toLocaleString()}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setNewOrderRows((rows) => [
                ...rows,
                { productId: "", quantity: "1", salePrice: "0" },
              ])
            }
          >
            + {t("addOrderItem")}
          </Button>

          <div className="flex gap-2 justify-end pt-2">
            <Button
              variant="outline"
              onClick={() => {
                onClose();
                setNewOrderCustomerId("");
                setNewOrderNotes("");
                setNewOrderRows([{ productId: "", quantity: "1", salePrice: "0" }]);
              }}
            >
              {t("cancel")}
            </Button>
            <Button
              onClick={handleCreateOrder}
              disabled={
                isOrderSubmitting ||
                newOrderRows.some((r) => !r.productId || Number(r.quantity) < 1)
              }
            >
              {isOrderSubmitting ? t("submitting") : t("newOrder")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
