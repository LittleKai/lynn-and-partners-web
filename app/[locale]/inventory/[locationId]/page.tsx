"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/app/authContext";
import { useTranslations } from "next-intl";
import axiosInstance from "@/utils/axiosInstance";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AppHeader from "@/app/AppHeader/AppHeader";
import Loading from "@/components/Loading";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface Location {
  id: string;
  name: string;
  type: string;
  description: string | null;
  address: string | null;
}

interface Product {
  id: string;
  name: string;
  sku: string;
  quantity: number;
  price: number;
  status: string;
  imageUrl: string | null;
}

interface Transaction {
  id: string;
  type: "IMPORT" | "EXPORT";
  quantity: number;
  unitPrice: number | null;
  totalPrice: number | null;
  notes: string | null;
  createdAt: string;
  productId: string;
}

interface Expense {
  id: string;
  type: string;
  amount: number;
  currency: string;
  description: string | null;
  createdAt: string;
}

export default function LocationInventoryPage() {
  const params = useParams<{ locationId: string }>();
  const locationId = params?.locationId || "";
  const { isLoggedIn, isInitializing } = useAuth();
  const router = useRouter();
  const t = useTranslations("inventory");

  const [location, setLocation] = useState<Location | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isInitializing) return;
    if (!isLoggedIn) {
      router.push("/inventory/login");
      return;
    }
    loadData();
  }, [isInitializing, isLoggedIn, locationId]);

  const loadData = async () => {
    try {
      const [locRes, productsRes, txRes, expRes] = await Promise.allSettled([
        axiosInstance.get(`/admin/locations/${locationId}`),
        axiosInstance.get(`/locations/${locationId}/products`),
        axiosInstance.get(`/locations/${locationId}/transactions`),
        axiosInstance.get(`/locations/${locationId}/expenses`),
      ]);

      if (locRes.status === "fulfilled") setLocation(locRes.value.data.location);
      if (productsRes.status === "fulfilled")
        setProducts(productsRes.value.data.products);
      if (txRes.status === "fulfilled")
        setTransactions(txRes.value.data.transactions);
      if (expRes.status === "fulfilled")
        setExpenses(expRes.value.data.expenses);
    } catch {
      // silent
    } finally {
      setIsLoading(false);
    }
  };

  if (isInitializing || !isLoggedIn) return <Loading />;
  if (isLoading) return <Loading />;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container mx-auto px-6 py-8 space-y-6">
        <div className="flex items-center gap-3">
          <Link
            href="/inventory"
            className="text-muted-foreground hover:text-foreground text-sm"
          >
            ← {t("backToLocations")}
          </Link>
        </div>

        {location && (
          <div>
            <h2 className="text-2xl font-bold">{location.name}</h2>
            {location.address && (
              <p className="text-sm text-muted-foreground mt-1">
                📌 {location.address}
              </p>
            )}
          </div>
        )}

        <Tabs defaultValue="products">
          <TabsList>
            <TabsTrigger value="products">
              {t("products")} ({products.length})
            </TabsTrigger>
            <TabsTrigger value="transactions">
              {t("transactions")} ({transactions.length})
            </TabsTrigger>
            <TabsTrigger value="expenses">
              {t("expenses")} ({expenses.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="products" className="mt-4">
            <div className="flex justify-end gap-2 mb-4">
              <Link href={`/inventory/${locationId}/import`}>
                <Button variant="outline">{t("importStock")}</Button>
              </Link>
              <Link href={`/inventory/${locationId}/export`}>
                <Button variant="outline">{t("exportStock")}</Button>
              </Link>
            </div>
            {products.length === 0 ? (
              <p className="text-muted-foreground">{t("noProducts")}</p>
            ) : (
              <div className="rounded-xl border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium">{t("productName")}</th>
                      <th className="px-4 py-3 text-left font-medium">SKU</th>
                      <th className="px-4 py-3 text-right font-medium">{t("quantity")}</th>
                      <th className="px-4 py-3 text-right font-medium">{t("price")}</th>
                      <th className="px-4 py-3 text-left font-medium">{t("status")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((p) => (
                      <tr key={p.id} className="border-t hover:bg-muted/50">
                        <td className="px-4 py-3">{p.name}</td>
                        <td className="px-4 py-3 font-mono text-xs">{p.sku}</td>
                        <td className="px-4 py-3 text-right">{p.quantity}</td>
                        <td className="px-4 py-3 text-right">
                          {p.price.toLocaleString()}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`text-xs px-2 py-1 rounded-full ${
                              p.status === "available"
                                ? "bg-green-100 text-green-800"
                                : p.status === "stockLow"
                                ? "bg-orange-100 text-orange-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {p.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>

          <TabsContent value="transactions" className="mt-4">
            <div className="flex justify-end gap-2 mb-4">
              <Link href={`/inventory/${locationId}/import`}>
                <Button size="sm">{t("newImport")}</Button>
              </Link>
              <Link href={`/inventory/${locationId}/export`}>
                <Button variant="outline" size="sm">{t("newExport")}</Button>
              </Link>
            </div>
            {transactions.length === 0 ? (
              <p className="text-muted-foreground">{t("noTransactions")}</p>
            ) : (
              <div className="rounded-xl border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium">{t("type")}</th>
                      <th className="px-4 py-3 text-right font-medium">{t("quantity")}</th>
                      <th className="px-4 py-3 text-right font-medium">{t("totalPrice")}</th>
                      <th className="px-4 py-3 text-left font-medium">{t("notes")}</th>
                      <th className="px-4 py-3 text-left font-medium">{t("date")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((tx) => (
                      <tr key={tx.id} className="border-t hover:bg-muted/50">
                        <td className="px-4 py-3">
                          <span
                            className={`text-xs px-2 py-1 rounded-full font-medium ${
                              tx.type === "IMPORT"
                                ? "bg-green-100 text-green-800"
                                : "bg-orange-100 text-orange-800"
                            }`}
                          >
                            {tx.type}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">{tx.quantity}</td>
                        <td className="px-4 py-3 text-right">
                          {tx.totalPrice ? tx.totalPrice.toLocaleString() : "—"}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {tx.notes || "—"}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {new Date(tx.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>

          <TabsContent value="expenses" className="mt-4">
            <div className="flex justify-end mb-4">
              <Link href={`/inventory/${locationId}/expenses/new`}>
                <Button size="sm">{t("addExpense")}</Button>
              </Link>
            </div>
            {expenses.length === 0 ? (
              <p className="text-muted-foreground">{t("noExpenses")}</p>
            ) : (
              <div className="rounded-xl border overflow-hidden">
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
                    {expenses.map((exp) => (
                      <tr key={exp.id} className="border-t hover:bg-muted/50">
                        <td className="px-4 py-3 capitalize">{exp.type}</td>
                        <td className="px-4 py-3 text-right font-mono">
                          {exp.amount.toLocaleString()} {exp.currency || "VND"}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {exp.description || "—"}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {new Date(exp.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
