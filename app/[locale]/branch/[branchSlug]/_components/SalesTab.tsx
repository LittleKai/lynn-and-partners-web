"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import axiosInstance from "@/utils/axiosInstance";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { NewOrderDialog } from "./dialogs/NewOrderDialog";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import type {
  Location,
  Product,
  Customer,
  Guest,
  SaleOrder,
  NewOrderRow,
} from "../_types";

interface SalesTabProps {
  branchId: string;
  branchSlug: string;
  location: Location | null;
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  customers: Customer[];
  guests: Guest[];
  orders: SaleOrder[];
  setOrders: React.Dispatch<React.SetStateAction<SaleOrder[]>>;
  isAdmin: boolean;
  isHotel: boolean;
  canManageProducts: boolean;
  activeGuests: Guest[];
  getCustomerName: (customerId: string | null) => string;
  getGuestLabel: (guestId: string | null) => string;
}

export function SalesTab({
  branchId,
  branchSlug,
  location,
  products,
  setProducts,
  customers,
  guests,
  orders,
  setOrders,
  isAdmin,
  isHotel,
  canManageProducts,
  activeGuests,
  getCustomerName,
  getGuestLabel,
}: SalesTabProps) {
  const t = useTranslations("inventory");
  const { toast } = useToast();

  // ── Local state ───────────────────────────────────────────────────
  const [orderDateFilter, setOrderDateFilter] = useState("");
  const [orderCustomerFilter, setOrderCustomerFilter] = useState("ALL");
  const [orderSort, setOrderSort] = useState("date_desc");
  const [editingSalePrice, setEditingSalePrice] = useState<Record<string, string>>({});
  const [savingPriceId, setSavingPriceId] = useState<string | null>(null);
  const [viewingOrder, setViewingOrder] = useState<SaleOrder | null>(null);
  const [deletingOrderId, setDeletingOrderId] = useState<string | null>(null);
  const [isDeletingOrder, setIsDeletingOrder] = useState(false);
  const [showNewOrder, setShowNewOrder] = useState(false);

  // ── Filtered orders ───────────────────────────────────────────────
  const filteredOrders = useMemo(() => {
    let list = orders.filter((o) => {
      const matchDate = !orderDateFilter || o.createdAt.startsWith(orderDateFilter);
      const matchCustomer =
        orderCustomerFilter === "ALL" || o.customerId === orderCustomerFilter;
      return matchDate && matchCustomer;
    });

    const [field, dir] = orderSort.split("_");
    list = [...list].sort((a, b) => {
      if (field === "date") {
        const diff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        return dir === "asc" ? diff : -diff;
      }
      if (field === "total") {
        return dir === "asc"
          ? a.totalAmount - b.totalAmount
          : b.totalAmount - a.totalAmount;
      }
      return 0;
    });
    return list;
  }, [orders, orderDateFilter, orderCustomerFilter, orderSort]);

  // ── Handlers ──────────────────────────────────────────────────────
  const handleOrderCreated = (order: SaleOrder, rows: NewOrderRow[]) => {
    setOrders((prev) => [order, ...prev]);
    setProducts((prev) =>
      prev.map((p) => {
        const row = rows.find((r) => r.productId === p.id);
        if (!row) return p;
        return { ...p, quantity: p.quantity - Number(row.quantity) };
      })
    );
  };

  const handleDeleteOrder = async (orderId: string) => {
    setIsDeletingOrder(true);
    try {
      const order = orders.find((o) => o.id === orderId);
      await axiosInstance.delete(`/locations/${branchId}/orders?orderId=${orderId}`);
      setOrders((prev) => prev.filter((o) => o.id !== orderId));
      if (order) {
        setProducts((prev) =>
          prev.map((p) => {
            const item = order.items.find((i) => i.productId === p.id);
            if (!item) return p;
            return { ...p, quantity: p.quantity + item.quantity };
          })
        );
      }
      setDeletingOrderId(null);
      toast({ title: t("orderDeleted") });
    } catch {
      toast({ title: t("importFailed"), variant: "destructive" });
    } finally {
      setIsDeletingOrder(false);
    }
  };

  const handleSaveSalePrice = async (productId: string) => {
    const salePriceVal = editingSalePrice[productId];
    if (salePriceVal === undefined) return;
    setSavingPriceId(productId);
    try {
      await axiosInstance.put(`/locations/${branchId}/products/${productId}`, {
        salePrice: Number(salePriceVal),
      });
      setProducts((prev) =>
        prev.map((p) =>
          p.id === productId ? { ...p, salePrice: Number(salePriceVal) } : p
        )
      );
      setEditingSalePrice((prev) => {
        const next = { ...prev };
        delete next[productId];
        return next;
      });
      toast({ title: t("salePriceUpdated") });
    } catch {
      toast({ title: t("importFailed"), variant: "destructive" });
    } finally {
      setSavingPriceId(null);
    }
  };

  const handleExportOrdersCSV = () => {
    const rows = [
      ["Date", "Customer", "Items", "Total", "Notes"],
      ...filteredOrders.map((o) => [
        new Date(o.createdAt).toLocaleString(),
        getCustomerName(o.customerId),
        String(o.items.length),
        String(o.totalAmount),
        o.notes || "",
      ]),
    ];
    const csv = rows
      .map((r) => r.map((v) => `"${v.replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `orders-${branchId}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <Tabs defaultValue="orders">
        <TabsList>
          <TabsTrigger value="orders">
            {t("orders")} ({orders.length})
          </TabsTrigger>
          <TabsTrigger value="priceList">{t("priceList")}</TabsTrigger>
        </TabsList>

        {/* Orders sub-tab */}
        <TabsContent value="orders" className="mt-4 space-y-3">
          <div className="flex flex-wrap gap-2 justify-between items-center">
            <div className="flex flex-wrap gap-2">
              {canManageProducts && (
                <Button size="sm" onClick={() => setShowNewOrder(true)}>
                  💰 {t("newSale")}
                </Button>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportOrdersCSV}
              disabled={filteredOrders.length === 0}
            >
              📥 {t("exportCSV")}
            </Button>
          </div>

          {/* Filter bar */}
          <div className="flex flex-wrap gap-2">
            <Input
              type="date"
              className="w-44"
              value={orderDateFilter}
              onChange={(e) => setOrderDateFilter(e.target.value)}
            />
            <Select value={orderCustomerFilter} onValueChange={setOrderCustomerFilter}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{t("all")}</SelectItem>
                {customers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={orderSort} onValueChange={setOrderSort}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date_desc">{t("date")} ↓</SelectItem>
                <SelectItem value="date_asc">{t("date")} ↑</SelectItem>
                <SelectItem value="total_desc">{t("orderTotal")} ↓</SelectItem>
                <SelectItem value="total_asc">{t("orderTotal")} ↑</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {filteredOrders.length === 0 ? (
            <p className="text-muted-foreground">{t("noOrders")}</p>
          ) : (
            <div className="rounded-xl border overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">{t("date")}</th>
                    <th className="px-4 py-3 text-left font-medium">{t("customers")}</th>
                    <th className="px-4 py-3 text-center font-medium">{t("orderItems")}</th>
                    <th className="px-4 py-3 text-right font-medium">{t("orderTotal")}</th>
                    <th className="px-4 py-3 text-left font-medium">{t("notes")}</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((o) => (
                    <tr key={o.id} className="border-t hover:bg-muted/50">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <p>{new Date(o.createdAt).toLocaleDateString()}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(o.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        {isHotel ? getGuestLabel(o.guestId) : getCustomerName(o.customerId)}
                      </td>
                      <td className="px-4 py-3 text-center">{o.items.length}</td>
                      <td className="px-4 py-3 text-right font-mono">
                        {o.totalAmount.toLocaleString()} {location?.currency || ""}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{o.notes || "—"}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1 justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setViewingOrder(o)}
                          >
                            📋
                          </Button>
                          {isAdmin && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive"
                              onClick={() => setDeletingOrderId(o.id)}
                            >
                              🗑️
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        {/* Price List sub-tab */}
        <TabsContent value="priceList" className="mt-4 space-y-3">
          <p className="text-sm text-muted-foreground">{t("priceListDesc")}</p>
          {products.length === 0 ? (
            <p className="text-muted-foreground">{t("noProducts")}</p>
          ) : (
            <div className="rounded-xl border overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">{t("productName")}</th>
                    <th className="px-4 py-3 text-left font-medium">{t("sku")}</th>
                    <th className="px-4 py-3 text-left font-medium">{t("unit")}</th>
                    <th className="px-4 py-3 text-right font-medium">
                      {t("costPrice")} ({location?.currency || "VND"})
                    </th>
                    <th className="px-4 py-3 text-right font-medium">
                      {t("salePrice")} ({location?.currency || "VND"})
                    </th>
                    <th className="px-4 py-3 text-right font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => (
                    <tr key={p.id} className="border-t hover:bg-muted/50">
                      <td className="px-4 py-3 font-medium">{p.name}</td>
                      <td className="px-4 py-3 font-mono text-muted-foreground">{p.sku || "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{p.unit || "—"}</td>
                      <td className="px-4 py-3 text-right font-mono">{p.price.toLocaleString()}</td>
                      {editingSalePrice[p.id] !== undefined ? (
                        <>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center gap-1 justify-end">
                              <Input
                                type="number"
                                min="0"
                                className="w-28 h-7 text-right text-sm"
                                value={editingSalePrice[p.id]}
                                onChange={(e) =>
                                  setEditingSalePrice((prev) => ({
                                    ...prev,
                                    [p.id]: e.target.value,
                                  }))
                                }
                                autoFocus
                              />
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center gap-1 justify-end">
                              <Button
                                size="sm"
                                className="h-7 px-2"
                                disabled={savingPriceId === p.id}
                                onClick={() => handleSaveSalePrice(p.id)}
                              >
                                ✓
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2"
                                onClick={() =>
                                  setEditingSalePrice((prev) => {
                                    const next = { ...prev };
                                    delete next[p.id];
                                    return next;
                                  })
                                }
                              >
                                ✕
                              </Button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-4 py-3 text-right font-mono">
                            {(p.salePrice ?? 0).toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-muted-foreground hover:text-foreground"
                              onClick={() =>
                                setEditingSalePrice((prev) => ({
                                  ...prev,
                                  [p.id]: String(p.salePrice ?? 0),
                                }))
                              }
                            >
                              ✏️
                            </Button>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ── New Order Dialog ── */}
      <NewOrderDialog
        open={showNewOrder}
        onClose={() => setShowNewOrder(false)}
        branchId={branchId}
        isHotel={isHotel}
        products={products}
        customers={customers}
        activeGuests={activeGuests}
        getCustomerName={getCustomerName}
        onOrderCreated={handleOrderCreated}
      />

      {/* ── View Order Dialog ── */}
      <Dialog
        open={!!viewingOrder}
        onOpenChange={(open) => !open && setViewingOrder(null)}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              📋 {t("orders")} —{" "}
              {viewingOrder && new Date(viewingOrder.createdAt).toLocaleDateString()}
            </DialogTitle>
          </DialogHeader>
          {viewingOrder && (
            <div className="space-y-3 mt-2">
              <div className="text-sm text-muted-foreground space-y-1">
                <p>
                  <span className="font-medium">{t("customers")}:</span>{" "}
                  {isHotel ? getGuestLabel(viewingOrder.guestId) : getCustomerName(viewingOrder.customerId)}
                </p>
                {viewingOrder.createdByName && (
                  <p>
                    <span className="font-medium">{t("createdBy")}:</span>{" "}
                    {viewingOrder.createdByName}
                  </p>
                )}
                {viewingOrder.notes && (
                  <p>
                    <span className="font-medium">{t("notes")}:</span>{" "}
                    {viewingOrder.notes}
                  </p>
                )}
              </div>
              <div className="rounded-xl border overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">{t("productName")}</th>
                      <th className="px-3 py-2 text-center font-medium">{t("quantity")}</th>
                      <th className="px-3 py-2 text-right font-medium">{t("salePrice")}</th>
                      <th className="px-3 py-2 text-right font-medium">{t("totalPrice")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {viewingOrder.items.map((item, i) => (
                      <tr key={i} className="border-t">
                        <td className="px-3 py-2">{item.productName}</td>
                        <td className="px-3 py-2 text-center">{item.quantity.toLocaleString()}</td>
                        <td className="px-3 py-2 text-right font-mono">
                          {item.salePrice.toLocaleString()}
                        </td>
                        <td className="px-3 py-2 text-right font-mono">
                          {item.totalPrice.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t bg-muted/50">
                      <td colSpan={3} className="px-3 py-2 text-right font-medium">
                        {t("orderTotal")}:
                      </td>
                      <td className="px-3 py-2 text-right font-mono font-bold">
                        {viewingOrder.totalAmount.toLocaleString()}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              <div className="flex justify-end pt-1">
                <Link href={`/branch/${branchSlug}/import`}>
                  <Button variant="outline" size="sm" className="gap-1.5">
                    ↩ {t("returnRefund")}
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Delete Order Confirmation ── */}
      <DeleteConfirmDialog
        open={!!deletingOrderId}
        onClose={() => setDeletingOrderId(null)}
        onConfirm={() => deletingOrderId && handleDeleteOrder(deletingOrderId)}
        isDeleting={isDeletingOrder}
        description={t("deleteOrderWarning")}
        confirmText="DELETE"
      />
    </>
  );
}
