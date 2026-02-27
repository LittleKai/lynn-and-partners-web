"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/app/authContext";
import { useTranslations } from "next-intl";
import axiosInstance from "@/utils/axiosInstance";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AppHeader from "@/app/AppHeader/AppHeader";
import Loading from "@/components/Loading";
import Link from "next/link";
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
import { Package, ShoppingCart, Wallet, Users, ChevronLeft } from "lucide-react";

interface Location {
  id: string;
  name: string;
  type: string;
  currency: string;
  description: string | null;
  address: string | null;
}

interface Product {
  id: string;
  name: string;
  sku: string;
  unit: string;
  quantity: number;
  price: number;
  salePrice: number;
  status: string;
  imageUrl: string | null;
}

interface SaleOrderItem {
  productId: string;
  productName: string;
  quantity: number;
  salePrice: number;
  totalPrice: number;
}

interface SaleOrder {
  id: string;
  customerId: string | null;
  notes: string | null;
  totalAmount: number;
  createdAt: string;
  createdByName?: string;
  items: SaleOrderItem[];
}

interface HistoryTxEntry {
  kind: "tx";
  id: string;
  date: string;
  type: "IMPORT" | "EXPORT";
  quantity: number;
  unitPrice: number | null;
  totalPrice: number | null;
  notes: string | null;
  supplierId: string | null;
  imageUrls: string[];
  fileUrls: string[];
  createdByName?: string;
}

interface HistorySaleEntry {
  kind: "sale";
  id: string;
  date: string;
  quantity: number;
  salePrice: number;
  totalPrice: number;
  notes: string | null;
  orderId: string;
  customerName: string;
  createdByName?: string;
}

type HistoryEntry = HistoryTxEntry | HistorySaleEntry;

interface NewOrderRow {
  productId: string;
  quantity: string;
  salePrice: string;
}

interface Transaction {
  id: string;
  type: "IMPORT" | "EXPORT";
  productId: string;
  supplierId: string | null;
  quantity: number;
  unitPrice: number | null;
  totalPrice: number | null;
  notes: string | null;
  imageUrls: string[];
  fileUrls: string[];
  createdAt: string;
  createdByName?: string;
}

interface Expense {
  id: string;
  type: string;
  amount: number;
  currency: string;
  description: string | null;
  createdAt: string;
}

interface Category {
  id: string;
  name: string;
}

interface Supplier {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
}

interface Customer {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
}

interface Guest {
  id: string;
  customerId: string | null;
  roomNumber: string | null;
  checkIn: string;
  checkOut: string | null;
  adults: number;
  children: number;
  notes: string | null;
  status: string;
}

function CustomerList({
  customers,
  editingCustomer,
  editingCustomerData,
  setEditingCustomer,
  setEditingCustomerData,
  handleUpdateCustomer,
  handleDeleteCustomer,
  t,
}: {
  customers: Customer[];
  editingCustomer: Customer | null;
  editingCustomerData: { name: string; phone: string; email: string; address: string; notes: string };
  setEditingCustomer: (c: Customer | null) => void;
  setEditingCustomerData: React.Dispatch<React.SetStateAction<{ name: string; phone: string; email: string; address: string; notes: string }>>;
  handleUpdateCustomer: () => void;
  handleDeleteCustomer: (id: string) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: (key: string) => string;
}) {
  return (
    <div className="rounded-xl border overflow-hidden">
      {customers.map((c) => (
        <div key={c.id} className="px-4 py-3 border-b last:border-b-0 hover:bg-muted/40">
          {editingCustomer?.id === c.id ? (
            <div className="space-y-2">
              <Input
                value={editingCustomerData.name}
                onChange={(e) => setEditingCustomerData((f) => ({ ...f, name: e.target.value }))}
                placeholder={`${t("customerName")} *`}
                className="h-8 text-sm"
                autoFocus
              />
              <div className="grid grid-cols-2 gap-2">
                <Input
                  value={editingCustomerData.phone}
                  onChange={(e) => setEditingCustomerData((f) => ({ ...f, phone: e.target.value }))}
                  placeholder={t("phone")}
                  className="h-8 text-sm"
                />
                <Input
                  value={editingCustomerData.email}
                  onChange={(e) => setEditingCustomerData((f) => ({ ...f, email: e.target.value }))}
                  placeholder={t("email")}
                  className="h-8 text-sm"
                />
              </div>
              <Input
                value={editingCustomerData.address}
                onChange={(e) => setEditingCustomerData((f) => ({ ...f, address: e.target.value }))}
                placeholder={t("supplierCompany")}
                className="h-8 text-sm"
              />
              <Input
                value={editingCustomerData.notes}
                onChange={(e) => setEditingCustomerData((f) => ({ ...f, notes: e.target.value }))}
                placeholder={t("notes")}
                className="h-8 text-sm"
              />
              <div className="flex gap-2 justify-end">
                <Button size="sm" variant="ghost" onClick={() => setEditingCustomer(null)}>✕</Button>
                <Button size="sm" onClick={handleUpdateCustomer} disabled={!editingCustomerData.name.trim()}>✓</Button>
              </div>
            </div>
          ) : (
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-medium">{c.name}</p>
                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mt-0.5">
                  {c.phone && <span>📞 {c.phone}</span>}
                  {c.email && <span>✉️ {c.email}</span>}
                  {c.address && <span>📍 {c.address}</span>}
                </div>
                {c.notes && <p className="text-xs text-muted-foreground mt-1 italic">{c.notes}</p>}
              </div>
              <div className="flex gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setEditingCustomer(c);
                    setEditingCustomerData({ name: c.name, phone: c.phone || "", email: c.email || "", address: c.address || "", notes: c.notes || "" });
                  }}
                >✏️</Button>
                <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDeleteCustomer(c.id)}>🗑️</Button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default function LocationInventoryPage() {
  const params = useParams<{ locationId: string }>();
  const locationId = params?.locationId || "";
  const { isLoggedIn, isInitializing, user } = useAuth();
  const router = useRouter();
  const t = useTranslations("inventory");
  const { toast } = useToast();

  const [location, setLocation] = useState<Location | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [locationPermissions, setLocationPermissions] = useState<string[]>([]);

  // ── Filters & sort ────────────────────────────────────────────────
  const [productSearch, setProductSearch] = useState("");
  const [productStatusFilter, setProductStatusFilter] = useState("ALL");
  const [productSort, setProductSort] = useState("name_asc");

  const [txTypeFilter, setTxTypeFilter] = useState("ALL");
  const [txProductSearch, setTxProductSearch] = useState("");
  const [txSort, setTxSort] = useState("date_desc");

  const [expTypeFilter, setExpTypeFilter] = useState("ALL");
  const [expSort, setExpSort] = useState("date_desc");

  const [supplierSearch, setSupplierSearch] = useState("");
  const [supplierSort, setSupplierSort] = useState("name_asc");

  const [customerSearch, setCustomerSearch] = useState("");

  // ── Customers & Guests ────────────────────────────────────────────
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);

  // Customer add/edit
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: "", phone: "", email: "", address: "", notes: "" });
  const [isCustomerSubmitting, setIsCustomerSubmitting] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [editingCustomerData, setEditingCustomerData] = useState({ name: "", phone: "", email: "", address: "", notes: "" });

  // Guest add
  const [showAddGuest, setShowAddGuest] = useState(false);
  const [newGuest, setNewGuest] = useState({ customerId: "", roomNumber: "", checkIn: "", checkOut: "", adults: "1", children: "0", notes: "" });
  const [isGuestSubmitting, setIsGuestSubmitting] = useState(false);

  // ── Product creation state ─────────────────────────────────────────
  const [showCreateProduct, setShowCreateProduct] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: "", sku: "", unit: "" });
  const [isProductSubmitting, setIsProductSubmitting] = useState(false);

  // ── Supplier state ─────────────────────────────────────────────────
  const [showAddSupplier, setShowAddSupplier] = useState(false);
  const [newSupplier, setNewSupplier] = useState({
    name: "",
    address: "",
    phone: "",
    email: "",
    notes: "",
  });
  const [isSupplierSubmitting, setIsSupplierSubmitting] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [editingSupplierData, setEditingSupplierData] = useState({
    name: "",
    address: "",
    phone: "",
    email: "",
    notes: "",
  });

  // ── Product history dialog ─────────────────────────────────────────
  const [historyProduct, setHistoryProduct] = useState<Product | null>(null);
  const [historyTypeFilter, setHistoryTypeFilter] = useState("ALL");
  const [attachmentPreviewUrl, setAttachmentPreviewUrl] = useState<string | null>(null);

  // ── Delete product confirmation ────────────────────────────────────
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const [deleteProductConfirmName, setDeleteProductConfirmName] = useState("");

  // ── Deactivate confirmation ─────────────────────────────────────────
  const [deactivatingProduct, setDeactivatingProduct] = useState<Product | null>(null);

  // ── Export dialog ────────────────────────────────────────────────────
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [exportForm, setExportForm] = useState({ productId: "", quantity: "1", unitPrice: "", notes: "" });
  const [isExportSubmitting, setIsExportSubmitting] = useState(false);

  // ── Orders state ──────────────────────────────────────────────────
  const [orders, setOrders] = useState<SaleOrder[]>([]);
  const [showNewOrder, setShowNewOrder] = useState(false);
  const [newOrderCustomerId, setNewOrderCustomerId] = useState("");
  const [newOrderNotes, setNewOrderNotes] = useState("");
  const [newOrderRows, setNewOrderRows] = useState<NewOrderRow[]>([
    { productId: "", quantity: "1", salePrice: "0" },
  ]);
  const [isOrderSubmitting, setIsOrderSubmitting] = useState(false);
  const [viewingOrder, setViewingOrder] = useState<SaleOrder | null>(null);
  const [deletingOrderId, setDeletingOrderId] = useState<string | null>(null);
  const [editingSalePrice, setEditingSalePrice] = useState<Record<string, string>>({});
  const [savingPriceId, setSavingPriceId] = useState<string | null>(null);
  const [orderDateFilter, setOrderDateFilter] = useState("");
  const [orderCustomerFilter, setOrderCustomerFilter] = useState("ALL");
  const [orderSort, setOrderSort] = useState("date_desc");

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
      const [locRes, productsRes, txRes, expRes, catRes, supRes, meLocRes, custRes, guestRes, ordersRes] =
        await Promise.allSettled([
          axiosInstance.get(`/admin/locations/${locationId}`),
          axiosInstance.get(`/locations/${locationId}/products`),
          axiosInstance.get(`/locations/${locationId}/transactions`),
          axiosInstance.get(`/locations/${locationId}/expenses`),
          axiosInstance.get(`/locations/${locationId}/categories`),
          axiosInstance.get(`/locations/${locationId}/suppliers`),
          axiosInstance.get("/users/me/locations"),
          axiosInstance.get(`/locations/${locationId}/customers`),
          axiosInstance.get(`/locations/${locationId}/guests`),
          axiosInstance.get(`/locations/${locationId}/orders`),
        ]);

      if (locRes.status === "fulfilled") setLocation(locRes.value.data.location);
      if (productsRes.status === "fulfilled")
        setProducts(productsRes.value.data.products);
      if (txRes.status === "fulfilled")
        setTransactions(txRes.value.data.transactions);
      if (expRes.status === "fulfilled")
        setExpenses(expRes.value.data.expenses);
      if (catRes.status === "fulfilled")
        setCategories(catRes.value.data.categories);
      if (supRes.status === "fulfilled")
        setSuppliers(supRes.value.data.suppliers);
      if (custRes.status === "fulfilled")
        setCustomers(custRes.value.data.customers);
      if (guestRes.status === "fulfilled")
        setGuests(guestRes.value.data.guests);
      if (ordersRes.status === "fulfilled")
        setOrders(ordersRes.value.data.orders);
      if (meLocRes.status === "fulfilled") {
        const loc = meLocRes.value.data.locations?.find(
          (l: { id: string; permissions?: string[] }) => l.id === locationId
        );
        if (loc?.permissions) setLocationPermissions(loc.permissions);
      }
    } catch {
      // silent
    } finally {
      setIsLoading(false);
    }
  };

  // ── Permissions ───────────────────────────────────────────────────
  const canManageProducts = useMemo(() => {
    if (!user) return false;
    if (user.role === "superadmin" || user.role === "admin") return true;
    return locationPermissions.includes("MANAGE_PRODUCTS");
  }, [user, locationPermissions]);

  const isAdmin = useMemo(() => {
    if (!user) return false;
    return user.role === "superadmin" || user.role === "admin";
  }, [user]);

  // ── Helpers ───────────────────────────────────────────────────────
  const getProductName = (productId: string) => {
    const p = products.find((p) => p.id === productId);
    return p?.name || "—";
  };

  const getSupplierName = (supplierId: string | null) => {
    if (!supplierId) return null;
    const s = suppliers.find((s) => s.id === supplierId);
    return s?.name || null;
  };

  // ── Filtered & sorted lists ───────────────────────────────────────
  const filteredProducts = useMemo(() => {
    let list = products.filter((p) => {
      const q = productSearch.toLowerCase();
      const matchSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q);
      const matchStatus =
        productStatusFilter === "ALL" || p.status === productStatusFilter;
      return matchSearch && matchStatus;
    });

    const [field, dir] = productSort.split("_");
    list = [...list].sort((a, b) => {
      if (field === "name")
        return dir === "asc"
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name);
      if (field === "quantity")
        return dir === "asc"
          ? a.quantity - b.quantity
          : b.quantity - a.quantity;
      if (field === "price")
        return dir === "asc" ? a.price - b.price : b.price - a.price;
      return 0;
    });
    return list;
  }, [products, productSearch, productStatusFilter, productSort]);

  const filteredTransactions = useMemo(() => {
    let list = transactions.filter((tx) => {
      const matchType = txTypeFilter === "ALL" || tx.type === txTypeFilter;
      const matchProduct =
        !txProductSearch ||
        getProductName(tx.productId)
          .toLowerCase()
          .includes(txProductSearch.toLowerCase());
      return matchType && matchProduct;
    });

    const [field, dir] = txSort.split("_");
    list = [...list].sort((a, b) => {
      if (field === "date") {
        const diff =
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        return dir === "asc" ? diff : -diff;
      }
      if (field === "total") {
        const diff = (a.totalPrice ?? 0) - (b.totalPrice ?? 0);
        return dir === "asc" ? diff : -diff;
      }
      return 0;
    });
    return list;
  }, [transactions, txTypeFilter, txProductSearch, txSort, products]);

  const filteredExpenses = useMemo(() => {
    let list = expenses.filter(
      (e) => expTypeFilter === "ALL" || e.type === expTypeFilter
    );

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
  }, [expenses, expTypeFilter, expSort]);

  const filteredCustomers = useMemo(() => {
    if (!customerSearch) return customers;
    return customers.filter((c) =>
      c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
      (c.phone && c.phone.includes(customerSearch))
    );
  }, [customers, customerSearch]);

  const filteredSuppliers = useMemo(() => {
    let list = suppliers.filter(
      (s) =>
        !supplierSearch ||
        s.name.toLowerCase().includes(supplierSearch.toLowerCase())
    );
    list = [...list].sort((a, b) =>
      supplierSort === "name_asc"
        ? a.name.localeCompare(b.name)
        : b.name.localeCompare(a.name)
    );
    return list;
  }, [suppliers, supplierSearch, supplierSort]);

  const productHistoryEntries = useMemo((): HistoryEntry[] => {
    if (!historyProduct) return [];

    const txEntries: HistoryEntry[] = transactions
      .filter((tx) => tx.productId === historyProduct.id)
      .map((tx) => ({
        kind: "tx" as const,
        id: tx.id,
        date: tx.createdAt,
        type: tx.type,
        quantity: tx.quantity,
        unitPrice: tx.unitPrice,
        totalPrice: tx.totalPrice,
        notes: tx.notes,
        supplierId: tx.supplierId,
        imageUrls: tx.imageUrls,
        fileUrls: tx.fileUrls,
        createdByName: tx.createdByName,
      }));

    const saleEntries: HistoryEntry[] = orders.flatMap((o) =>
      o.items
        .filter((item) => item.productId === historyProduct.id)
        .map((item) => ({
          kind: "sale" as const,
          id: `${o.id}-${item.productId}`,
          date: o.createdAt,
          quantity: item.quantity,
          salePrice: item.salePrice,
          totalPrice: item.totalPrice,
          notes: o.notes,
          orderId: o.id,
          customerName: o.customerId
            ? customers.find((c) => c.id === o.customerId)?.name || "—"
            : "—",
          createdByName: o.createdByName,
        }))
    );

    const all = [...txEntries, ...saleEntries];
    return all
      .filter((entry) => {
        if (historyTypeFilter === "ALL") return true;
        if (historyTypeFilter === "SALE") return entry.kind === "sale";
        if (entry.kind === "tx") return entry.type === historyTypeFilter;
        return false;
      })
      .sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
  }, [historyProduct, historyTypeFilter, transactions, orders, customers]);

  // ── Unique expense types in current data ──────────────────────────
  const expenseTypes = useMemo(
    () => [...new Set(expenses.map((e) => e.type))].sort(),
    [expenses]
  );

  // ── Filtered orders ───────────────────────────────────────────────
  const filteredOrders = useMemo(() => {
    let list = orders.filter((o) => {
      const matchDate =
        !orderDateFilter || o.createdAt.startsWith(orderDateFilter);
      const matchCustomer =
        orderCustomerFilter === "ALL" || o.customerId === orderCustomerFilter;
      return matchDate && matchCustomer;
    });

    const [field, dir] = orderSort.split("_");
    list = [...list].sort((a, b) => {
      if (field === "date") {
        const diff =
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
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

  // ── New order running total ────────────────────────────────────────
  const newOrderTotal = useMemo(
    () =>
      newOrderRows.reduce(
        (s, r) => s + (Number(r.quantity) || 0) * (Number(r.salePrice) || 0),
        0
      ),
    [newOrderRows]
  );

  // ── Customer CRUD ────────────────────────────────────────────────
  const handleAddCustomer = async () => {
    if (!newCustomer.name.trim()) return;
    setIsCustomerSubmitting(true);
    try {
      const res = await axiosInstance.post(`/locations/${locationId}/customers`, newCustomer);
      setCustomers((prev) => [...prev, res.data.customer].sort((a, b) => a.name.localeCompare(b.name)));
      setNewCustomer({ name: "", phone: "", email: "", address: "", notes: "" });
      setShowAddCustomer(false);
      toast({ title: t("customerAdded") });
    } catch {
      toast({ title: t("importFailed"), variant: "destructive" });
    } finally {
      setIsCustomerSubmitting(false);
    }
  };

  const handleUpdateCustomer = async () => {
    if (!editingCustomer || !editingCustomerData.name.trim()) return;
    try {
      const res = await axiosInstance.put(`/locations/${locationId}/customers`, {
        customerId: editingCustomer.id,
        ...editingCustomerData,
      });
      setCustomers((prev) => prev.map((c) => c.id === editingCustomer.id ? res.data.customer : c));
      setEditingCustomer(null);
      toast({ title: t("customerUpdated") });
    } catch {
      toast({ title: t("importFailed"), variant: "destructive" });
    }
  };

  const handleDeleteCustomer = async (id: string) => {
    if (!confirm(t("confirmDelete"))) return;
    try {
      await axiosInstance.delete(`/locations/${locationId}/customers?customerId=${id}`);
      setCustomers((prev) => prev.filter((c) => c.id !== id));
      toast({ title: t("customerDeleted") });
    } catch {
      toast({ title: t("importFailed"), variant: "destructive" });
    }
  };

  // ── Guest CRUD ───────────────────────────────────────────────────
  const handleAddGuest = async () => {
    if (!newGuest.checkIn) return;
    setIsGuestSubmitting(true);
    try {
      const res = await axiosInstance.post(`/locations/${locationId}/guests`, {
        customerId: newGuest.customerId || undefined,
        roomNumber: newGuest.roomNumber || undefined,
        checkIn: newGuest.checkIn,
        checkOut: newGuest.checkOut || undefined,
        adults: Number(newGuest.adults),
        children: Number(newGuest.children),
        notes: newGuest.notes || undefined,
      });
      setGuests((prev) => [res.data.guest, ...prev]);
      setNewGuest({ customerId: "", roomNumber: "", checkIn: "", checkOut: "", adults: "1", children: "0", notes: "" });
      setShowAddGuest(false);
      toast({ title: t("guestAdded") });
    } catch {
      toast({ title: t("importFailed"), variant: "destructive" });
    } finally {
      setIsGuestSubmitting(false);
    }
  };

  const handleGuestCheckOut = async (guest: Guest) => {
    const today = new Date().toISOString().split("T")[0];
    try {
      const res = await axiosInstance.put(`/locations/${locationId}/guests`, {
        guestId: guest.id,
        checkOut: today,
        status: "checked-out",
      });
      setGuests((prev) => prev.map((g) => g.id === guest.id ? res.data.guest : g));
      toast({ title: t("guestCheckedOut") });
    } catch {
      toast({ title: t("importFailed"), variant: "destructive" });
    }
  };

  const handleDeleteGuest = async (id: string) => {
    if (!confirm(t("confirmDelete"))) return;
    try {
      await axiosInstance.delete(`/locations/${locationId}/guests?guestId=${id}`);
      setGuests((prev) => prev.filter((g) => g.id !== id));
      toast({ title: t("guestDeleted") });
    } catch {
      toast({ title: t("importFailed"), variant: "destructive" });
    }
  };

  const getCustomerName = (customerId: string | null) => {
    if (!customerId) return "—";
    return customers.find((c) => c.id === customerId)?.name || "—";
  };

  // ── Product CRUD ──────────────────────────────────────────────────
  const handleCreateProduct = async () => {
    if (!newProduct.name.trim()) return;
    setIsProductSubmitting(true);
    try {
      const res = await axiosInstance.post(
        `/locations/${locationId}/products`,
        {
          name: newProduct.name.trim(),
          sku: newProduct.sku.trim(),
          unit: newProduct.unit.trim() || null,
          price: 0,
          quantity: 0,
          status: "available",
        }
      );
      setProducts((prev) => [res.data.product, ...prev]);
      setNewProduct({ name: "", sku: "", unit: "" });
      setShowCreateProduct(false);
      toast({ title: t("createItemSuccess") });
    } catch {
      toast({ title: t("createItemFailed"), variant: "destructive" });
    } finally {
      setIsProductSubmitting(false);
    }
  };

  const handleToggleActive = (p: Product) => {
    if (p.status !== "inactive") {
      // Deactivating → show confirmation dialog
      setDeactivatingProduct(p);
    } else {
      // Activating → do it directly
      handleActivateProduct(p);
    }
  };

  const handleActivateProduct = async (p: Product) => {
    try {
      await axiosInstance.put(`/locations/${locationId}/products/${p.id}`, {
        status: "available",
      });
      setProducts((prev) =>
        prev.map((x) => (x.id === p.id ? { ...x, status: "available" } : x))
      );
      toast({ title: t("activate") });
    } catch {
      toast({ title: t("importFailed"), variant: "destructive" });
    }
  };

  const handleConfirmDeactivate = async () => {
    if (!deactivatingProduct) return;
    try {
      await axiosInstance.put(
        `/locations/${locationId}/products/${deactivatingProduct.id}`,
        { status: "inactive" }
      );
      setProducts((prev) =>
        prev.map((x) =>
          x.id === deactivatingProduct.id ? { ...x, status: "inactive" } : x
        )
      );
      setDeactivatingProduct(null);
      toast({ title: t("deactivate") });
    } catch {
      toast({ title: t("importFailed"), variant: "destructive" });
    }
  };

  const handleExportDialogSubmit = async () => {
    if (!exportForm.productId || Number(exportForm.quantity) < 1) return;
    if (!exportForm.notes.trim()) {
      toast({ title: t("notesRequired"), variant: "destructive" });
      return;
    }
    setIsExportSubmitting(true);
    try {
      const qty = Number(exportForm.quantity);
      const unitPrice = exportForm.unitPrice ? Number(exportForm.unitPrice) : undefined;
      const res = await axiosInstance.post(
        `/locations/${locationId}/transactions`,
        {
          type: "EXPORT",
          productId: exportForm.productId,
          quantity: qty,
          unitPrice: unitPrice || undefined,
          totalPrice: unitPrice ? unitPrice * qty : undefined,
          notes: exportForm.notes.trim(),
        }
      );
      const newTx = res.data.transaction;
      setTransactions((prev) => [newTx, ...prev]);
      setProducts((prev) =>
        prev.map((p) =>
          p.id === exportForm.productId
            ? { ...p, quantity: p.quantity - qty }
            : p
        )
      );
      setShowExportDialog(false);
      setExportForm({ productId: "", quantity: "1", unitPrice: "", notes: "" });
      toast({ title: t("exportSuccess") });
    } catch {
      toast({ title: t("exportFailed"), variant: "destructive" });
    } finally {
      setIsExportSubmitting(false);
    }
  };

  const handleDeleteProduct = async () => {
    if (!deletingProduct) return;
    try {
      await axiosInstance.delete(`/locations/${locationId}/products/${deletingProduct.id}`);
      setProducts((prev) => prev.filter((p) => p.id !== deletingProduct.id));
      setDeletingProduct(null);
      setDeleteProductConfirmName("");
      toast({ title: t("deleteProductSuccess") });
    } catch {
      toast({ title: t("deleteProductFailed"), variant: "destructive" });
    }
  };

  // ── Supplier CRUD ─────────────────────────────────────────────────
  const handleAddSupplier = async () => {
    if (!newSupplier.name.trim()) return;
    setIsSupplierSubmitting(true);
    try {
      const res = await axiosInstance.post(
        `/locations/${locationId}/suppliers`,
        {
          name: newSupplier.name.trim(),
          address: newSupplier.address || undefined,
          phone: newSupplier.phone || undefined,
          email: newSupplier.email || undefined,
          notes: newSupplier.notes || undefined,
        }
      );
      setSuppliers((prev) => [...prev, res.data.supplier]);
      setNewSupplier({ name: "", address: "", phone: "", email: "", notes: "" });
      setShowAddSupplier(false);
      toast({ title: t("supplierAdded") });
    } catch {
      toast({ title: t("importFailed"), variant: "destructive" });
    } finally {
      setIsSupplierSubmitting(false);
    }
  };

  const handleUpdateSupplier = async () => {
    if (!editingSupplier || !editingSupplierData.name.trim()) return;
    try {
      const res = await axiosInstance.put(`/locations/${locationId}/suppliers`, {
        supplierId: editingSupplier.id,
        name: editingSupplierData.name.trim(),
        address: editingSupplierData.address || null,
        phone: editingSupplierData.phone || null,
        email: editingSupplierData.email || null,
        notes: editingSupplierData.notes || null,
      });
      setSuppliers((prev) =>
        prev.map((s) => (s.id === editingSupplier.id ? res.data.supplier : s))
      );
      setEditingSupplier(null);
      toast({ title: t("supplierUpdated") });
    } catch {
      toast({ title: t("importFailed"), variant: "destructive" });
    }
  };

  const handleDeleteSupplier = async (id: string) => {
    if (!confirm(t("confirmDelete"))) return;
    try {
      await axiosInstance.delete(
        `/locations/${locationId}/suppliers?supplierId=${id}`
      );
      setSuppliers((prev) => prev.filter((s) => s.id !== id));
      toast({ title: t("supplierDeleted") });
    } catch {
      toast({ title: t("importFailed"), variant: "destructive" });
    }
  };

  // ── Order handlers ────────────────────────────────────────────────
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
    if (newOrderRows.some((r) => !r.productId || Number(r.quantity) < 1))
      return;
    setIsOrderSubmitting(true);
    try {
      const res = await axiosInstance.post(`/locations/${locationId}/orders`, {
        customerId: newOrderCustomerId || undefined,
        notes: newOrderNotes || undefined,
        items: newOrderRows.map((r) => ({
          productId: r.productId,
          quantity: Number(r.quantity),
          salePrice: Number(r.salePrice),
        })),
      });
      const newOrder: SaleOrder = res.data.order;
      setOrders((prev) => [newOrder, ...prev]);
      // Update product quantities in local state
      setProducts((prev) =>
        prev.map((p) => {
          const row = newOrderRows.find((r) => r.productId === p.id);
          if (!row) return p;
          return { ...p, quantity: p.quantity - Number(row.quantity) };
        })
      );
      setShowNewOrder(false);
      setNewOrderCustomerId("");
      setNewOrderNotes("");
      setNewOrderRows([{ productId: "", quantity: "1", salePrice: "0" }]);
      toast({ title: t("orderCreated") });
    } catch {
      toast({ title: t("orderFailed"), variant: "destructive" });
    } finally {
      setIsOrderSubmitting(false);
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    try {
      const order = orders.find((o) => o.id === orderId);
      await axiosInstance.delete(
        `/locations/${locationId}/orders?orderId=${orderId}`
      );
      setOrders((prev) => prev.filter((o) => o.id !== orderId));
      // Restore product quantities in local state
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
    }
  };

  const handleSaveSalePrice = async (productId: string) => {
    const salePriceVal = editingSalePrice[productId];
    if (salePriceVal === undefined) return;
    setSavingPriceId(productId);
    try {
      await axiosInstance.put(
        `/locations/${locationId}/products/${productId}`,
        { salePrice: Number(salePriceVal) }
      );
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
    a.download = `orders-${locationId}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isInitializing || !isLoggedIn) return <Loading />;
  if (isLoading) return <Loading />;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container mx-auto px-6 py-6 space-y-5">
        {/* ── Page header ── */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <Link href="/inventory">
              <Button variant="outline" size="sm" className="mb-3 gap-1.5 h-8">
                <ChevronLeft className="h-4 w-4" />
                {t("backToLocations")}
              </Button>
            </Link>
            {location && (
              <>
                <h1 className="text-2xl font-bold tracking-tight">
                  {location.name}
                </h1>
                {location.address && (
                  <p className="text-sm text-muted-foreground mt-0.5">
                    📌 {location.address}
                  </p>
                )}
              </>
            )}
          </div>
        </div>

        <Tabs defaultValue="items">
          {/* ── Main tabs ── */}
          <TabsList className="grid w-full grid-cols-4 h-auto p-1 gap-1">
            <TabsTrigger
              value="items"
              className="flex flex-col sm:flex-row items-center gap-1.5 py-2.5 data-[state=active]:shadow-sm"
            >
              <Package className="h-4 w-4 shrink-0" />
              <span className="text-xs sm:text-sm font-medium">
                {t("products")}
              </span>
              <span className="text-xs bg-muted-foreground/10 rounded px-1.5 py-0.5 leading-none">
                {products.length}
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="sales"
              className="flex flex-col sm:flex-row items-center gap-1.5 py-2.5 data-[state=active]:shadow-sm"
            >
              <ShoppingCart className="h-4 w-4 shrink-0" />
              <span className="text-xs sm:text-sm font-medium">
                {t("sales")}
              </span>
              <span className="text-xs bg-muted-foreground/10 rounded px-1.5 py-0.5 leading-none">
                {orders.length}
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="expenses"
              className="flex flex-col sm:flex-row items-center gap-1.5 py-2.5 data-[state=active]:shadow-sm"
            >
              <Wallet className="h-4 w-4 shrink-0" />
              <span className="text-xs sm:text-sm font-medium">
                {t("expenses")}
              </span>
              <span className="text-xs bg-muted-foreground/10 rounded px-1.5 py-0.5 leading-none">
                {expenses.length}
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="customers"
              className="flex flex-col sm:flex-row items-center gap-1.5 py-2.5 data-[state=active]:shadow-sm"
            >
              <Users className="h-4 w-4 shrink-0" />
              <span className="text-xs sm:text-sm font-medium">
                {t("customers")}
              </span>
              <span className="text-xs bg-muted-foreground/10 rounded px-1.5 py-0.5 leading-none">
                {customers.length}
              </span>
            </TabsTrigger>
          </TabsList>

          {/* ── Items Tab ── */}
          <TabsContent value="items" className="mt-4">
            <Tabs defaultValue="itemList">
              <TabsList>
                <TabsTrigger value="itemList">{t("itemList")}</TabsTrigger>
                <TabsTrigger value="suppliers">
                  {t("suppliers")} ({suppliers.length})
                </TabsTrigger>
              </TabsList>

              {/* Item List sub-tab */}
              <TabsContent value="itemList" className="mt-4 space-y-3">
            <div className="flex justify-end gap-2">
              <Button onClick={() => setShowCreateProduct(true)}>
                + {t("newItem")}
              </Button>
              <Link href={`/inventory/${locationId}/import`}>
                <Button variant="outline">{t("importStock")}</Button>
              </Link>
              {canManageProducts && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setExportForm({ productId: "", quantity: "1", unitPrice: "", notes: "" });
                    setShowExportDialog(true);
                  }}
                >
                  {t("exportStock")}
                </Button>
              )}
            </div>

            {/* Filter bar */}
            <div className="flex flex-wrap gap-2">
              <Input
                className="flex-1 min-w-[180px]"
                placeholder={t("searchProduct")}
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
              />
              <Select
                value={productStatusFilter}
                onValueChange={setProductStatusFilter}
              >
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">
                    {t("all")} {t("status")}
                  </SelectItem>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="stockLow">Stock Low</SelectItem>
                  <SelectItem value="stockOut">Stock Out</SelectItem>
                  <SelectItem value="inactive">{t("statusInactive")}</SelectItem>
                </SelectContent>
              </Select>
              <Select value={productSort} onValueChange={setProductSort}>
                <SelectTrigger className="w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name_asc">
                    {t("productName")} ↑
                  </SelectItem>
                  <SelectItem value="name_desc">
                    {t("productName")} ↓
                  </SelectItem>
                  <SelectItem value="quantity_asc">
                    {t("quantity")} ↑
                  </SelectItem>
                  <SelectItem value="quantity_desc">
                    {t("quantity")} ↓
                  </SelectItem>
                  <SelectItem value="price_asc">{t("price")} ↑</SelectItem>
                  <SelectItem value="price_desc">{t("price")} ↓</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {filteredProducts.length === 0 ? (
              <p className="text-muted-foreground">{t("noProducts")}</p>
            ) : (
              <div className="rounded-xl border overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium">
                        {t("productName")}
                      </th>
                      <th className="px-4 py-3 text-left font-medium">SKU</th>
                      <th className="px-4 py-3 text-center font-medium">
                        {t("unit")}
                      </th>
                      <th className="px-4 py-3 text-right font-medium">
                        {t("quantity")}
                      </th>
                      <th className="px-4 py-3 text-right font-medium">
                        {t("price")}
                      </th>
                      <th className="px-4 py-3 text-left font-medium">
                        {t("status")}
                      </th>
                      <th className="px-4 py-3 text-right font-medium"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.map((p) => (
                      <tr key={p.id} className="border-t hover:bg-muted/50">
                        <td className="px-4 py-3 font-medium">{p.name}</td>
                        <td className="px-4 py-3 font-mono text-xs">
                          {p.sku}
                        </td>
                        <td className="px-4 py-3 text-center text-xs text-muted-foreground">
                          {p.unit || "—"}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {p.quantity.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {p.price.toLocaleString()}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`text-xs px-2 py-1 rounded-full font-medium ${
                              p.status === "inactive"
                                ? "bg-gray-100 text-gray-500"
                                : p.status === "available"
                                ? "bg-green-100 text-green-800"
                                : p.status === "stockLow"
                                ? "bg-orange-100 text-orange-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {p.status === "inactive"
                              ? t("statusInactive")
                              : p.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex gap-1 justify-end flex-wrap">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs"
                              onClick={() => {
                                setHistoryProduct(p);
                                setHistoryTypeFilter("ALL");
                              }}
                            >
                              📋 {t("viewHistory")}
                            </Button>
                            {canManageProducts && (
                              <>
                                <Button
                                  variant={p.status === "inactive" ? "outline" : "ghost"}
                                  size="sm"
                                  className={`h-7 px-2 text-xs ${
                                    p.status === "inactive"
                                      ? "text-green-700 border-green-300 hover:bg-green-50"
                                      : "text-destructive hover:text-destructive"
                                  }`}
                                  onClick={() => handleToggleActive(p)}
                                >
                                  {p.status === "inactive"
                                    ? t("activate")
                                    : t("deactivate")}
                                </Button>
                                {isAdmin && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                                    onClick={() => {
                                      setDeletingProduct(p);
                                      setDeleteProductConfirmName("");
                                    }}
                                  >
                                    🗑️
                                  </Button>
                                )}
                              </>
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

              {/* Suppliers sub-tab */}
              <TabsContent value="suppliers" className="mt-4 space-y-4">
                {!showAddSupplier ? (
                  <Button onClick={() => setShowAddSupplier(true)}>
                    + {t("addSupplier")}
                  </Button>
                ) : (
                  <div className="rounded-xl border p-4 space-y-3">
                    <Input
                      placeholder={`${t("supplierName")} *`}
                      value={newSupplier.name}
                      onChange={(e) =>
                        setNewSupplier((f) => ({ ...f, name: e.target.value }))
                      }
                      autoFocus
                    />
                    <Input
                      placeholder={t("supplierCompany")}
                      value={newSupplier.address}
                      onChange={(e) =>
                        setNewSupplier((f) => ({ ...f, address: e.target.value }))
                      }
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        placeholder={t("phone")}
                        value={newSupplier.phone}
                        onChange={(e) =>
                          setNewSupplier((f) => ({ ...f, phone: e.target.value }))
                        }
                      />
                      <Input
                        placeholder={t("email")}
                        type="email"
                        value={newSupplier.email}
                        onChange={(e) =>
                          setNewSupplier((f) => ({ ...f, email: e.target.value }))
                        }
                      />
                    </div>
                    <Input
                      placeholder={t("notes")}
                      value={newSupplier.notes}
                      onChange={(e) =>
                        setNewSupplier((f) => ({ ...f, notes: e.target.value }))
                      }
                    />
                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="outline"
                        onClick={() => setShowAddSupplier(false)}
                      >
                        ✕
                      </Button>
                      <Button
                        onClick={handleAddSupplier}
                        disabled={
                          isSupplierSubmitting || !newSupplier.name.trim()
                        }
                      >
                        {isSupplierSubmitting
                          ? t("submitting")
                          : t("addSupplier")}
                      </Button>
                    </div>
                  </div>
                )}
                <div className="flex gap-2">
                  <Input
                    className="flex-1"
                    placeholder={`${t("suppliers")}...`}
                    value={supplierSearch}
                    onChange={(e) => setSupplierSearch(e.target.value)}
                  />
                  <Select value={supplierSort} onValueChange={setSupplierSort}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="name_asc">A → Z</SelectItem>
                      <SelectItem value="name_desc">Z → A</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {filteredSuppliers.length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    {t("noSuppliers")}
                  </p>
                ) : (
                  <div className="rounded-xl border overflow-hidden">
                    {filteredSuppliers.map((s) => (
                      <div
                        key={s.id}
                        className="px-4 py-3 border-b last:border-b-0 hover:bg-muted/40"
                      >
                        {editingSupplier?.id === s.id ? (
                          <div className="space-y-2">
                            <Input
                              value={editingSupplierData.name}
                              onChange={(e) =>
                                setEditingSupplierData((f) => ({
                                  ...f,
                                  name: e.target.value,
                                }))
                              }
                              placeholder={`${t("supplierName")} *`}
                              className="h-8 text-sm"
                              autoFocus
                            />
                            <Input
                              value={editingSupplierData.address}
                              onChange={(e) =>
                                setEditingSupplierData((f) => ({
                                  ...f,
                                  address: e.target.value,
                                }))
                              }
                              placeholder={t("supplierCompany")}
                              className="h-8 text-sm"
                            />
                            <div className="grid grid-cols-2 gap-2">
                              <Input
                                value={editingSupplierData.phone}
                                onChange={(e) =>
                                  setEditingSupplierData((f) => ({
                                    ...f,
                                    phone: e.target.value,
                                  }))
                                }
                                placeholder={t("phone")}
                                className="h-8 text-sm"
                              />
                              <Input
                                value={editingSupplierData.email}
                                onChange={(e) =>
                                  setEditingSupplierData((f) => ({
                                    ...f,
                                    email: e.target.value,
                                  }))
                                }
                                placeholder={t("email")}
                                type="email"
                                className="h-8 text-sm"
                              />
                            </div>
                            <Input
                              value={editingSupplierData.notes}
                              onChange={(e) =>
                                setEditingSupplierData((f) => ({
                                  ...f,
                                  notes: e.target.value,
                                }))
                              }
                              placeholder={t("notes")}
                              className="h-8 text-sm"
                            />
                            <div className="flex gap-2 justify-end">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setEditingSupplier(null)}
                              >
                                ✕
                              </Button>
                              <Button
                                size="sm"
                                onClick={handleUpdateSupplier}
                                disabled={!editingSupplierData.name.trim()}
                              >
                                ✓
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-sm font-medium">{s.name}</p>
                              {s.address && (
                                <p className="text-xs text-muted-foreground">
                                  📍 {s.address}
                                </p>
                              )}
                              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mt-0.5">
                                {s.phone && <span>📞 {s.phone}</span>}
                                {s.email && <span>✉️ {s.email}</span>}
                              </div>
                              {s.notes && (
                                <p className="text-xs text-muted-foreground mt-1 italic">
                                  {s.notes}
                                </p>
                              )}
                            </div>
                            <div className="flex gap-1 shrink-0">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setEditingSupplier(s);
                                  setEditingSupplierData({
                                    name: s.name,
                                    address: s.address || "",
                                    phone: s.phone || "",
                                    email: s.email || "",
                                    notes: s.notes || "",
                                  });
                                }}
                              >
                                ✏️
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive"
                                onClick={() => handleDeleteSupplier(s.id)}
                              >
                                🗑️
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </TabsContent>

          {/* ── Expenses Tab ── */}
          <TabsContent value="expenses" className="mt-4 space-y-3">
            <div className="flex justify-end">
              <Link href={`/inventory/${locationId}/expenses/new`}>
                <Button size="sm">{t("addExpense")}</Button>
              </Link>
            </div>

            {/* Filter bar */}
            <div className="flex flex-wrap gap-2">
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
              <Select value={expSort} onValueChange={setExpSort}>
                <SelectTrigger className="w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date_desc">
                    {t("date")} ↓ (newest)
                  </SelectItem>
                  <SelectItem value="date_asc">
                    {t("date")} ↑ (oldest)
                  </SelectItem>
                  <SelectItem value="amount_desc">
                    {t("amount")} ↓
                  </SelectItem>
                  <SelectItem value="amount_asc">{t("amount")} ↑</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {filteredExpenses.length === 0 ? (
              <p className="text-muted-foreground">{t("noExpenses")}</p>
            ) : (
              <div className="rounded-xl border overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium">
                        {t("type")}
                      </th>
                      <th className="px-4 py-3 text-right font-medium">
                        {t("amount")}
                      </th>
                      <th className="px-4 py-3 text-left font-medium">
                        {t("description")}
                      </th>
                      <th className="px-4 py-3 text-left font-medium">
                        {t("date")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredExpenses.map((exp) => (
                      <tr key={exp.id} className="border-t hover:bg-muted/50">
                        <td className="px-4 py-3 capitalize">{exp.type}</td>
                        <td className="px-4 py-3 text-right font-mono">
                          {exp.amount.toLocaleString()}{" "}
                          {exp.currency || "VND"}
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
          </TabsContent>

          {/* ── Sales Tab ── */}
          <TabsContent value="sales" className="mt-4">
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
                        💰 {t("newOrder")}
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
                  <Select
                    value={orderCustomerFilter}
                    onValueChange={setOrderCustomerFilter}
                  >
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
                      <SelectItem value="date_desc">
                        {t("date")} ↓
                      </SelectItem>
                      <SelectItem value="date_asc">{t("date")} ↑</SelectItem>
                      <SelectItem value="total_desc">
                        {t("orderTotal")} ↓
                      </SelectItem>
                      <SelectItem value="total_asc">
                        {t("orderTotal")} ↑
                      </SelectItem>
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
                          <th className="px-4 py-3 text-left font-medium">
                            {t("date")}
                          </th>
                          <th className="px-4 py-3 text-left font-medium">
                            {t("customers")}
                          </th>
                          <th className="px-4 py-3 text-center font-medium">
                            {t("orderItems")}
                          </th>
                          <th className="px-4 py-3 text-right font-medium">
                            {t("orderTotal")}
                          </th>
                          <th className="px-4 py-3 text-left font-medium">
                            {t("notes")}
                          </th>
                          <th className="px-4 py-3"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredOrders.map((o) => (
                          <tr
                            key={o.id}
                            className="border-t hover:bg-muted/50"
                          >
                            <td className="px-4 py-3 whitespace-nowrap">
                              <p>
                                {new Date(o.createdAt).toLocaleDateString()}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(o.createdAt).toLocaleTimeString(
                                  [],
                                  { hour: "2-digit", minute: "2-digit" }
                                )}
                              </p>
                            </td>
                            <td className="px-4 py-3">
                              {getCustomerName(o.customerId)}
                            </td>
                            <td className="px-4 py-3 text-center">
                              {o.items.length}
                            </td>
                            <td className="px-4 py-3 text-right font-mono">
                              {o.totalAmount.toLocaleString()}{" "}
                              {location?.currency || ""}
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">
                              {o.notes || "—"}
                            </td>
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
                <p className="text-sm text-muted-foreground">
                  {t("priceListDesc")}
                </p>
                {products.length === 0 ? (
                  <p className="text-muted-foreground">{t("noProducts")}</p>
                ) : (
                  <div className="rounded-xl border overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted">
                        <tr>
                          <th className="px-4 py-3 text-left font-medium">
                            {t("productName")}
                          </th>
                          <th className="px-4 py-3 text-left font-medium">
                            {t("sku")}
                          </th>
                          <th className="px-4 py-3 text-left font-medium">
                            {t("unit")}
                          </th>
                          <th className="px-4 py-3 text-right font-medium">
                            {t("costPrice")}
                          </th>
                          <th className="px-4 py-3 text-right font-medium">
                            {t("salePrice")}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {products.map((p) => (
                          <tr
                            key={p.id}
                            className="border-t hover:bg-muted/50"
                          >
                            <td className="px-4 py-3 font-medium">{p.name}</td>
                            <td className="px-4 py-3 font-mono text-muted-foreground">
                              {p.sku || "—"}
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">
                              {p.unit || "—"}
                            </td>
                            <td className="px-4 py-3 text-right font-mono">
                              {p.price.toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-right">
                              {editingSalePrice[p.id] !== undefined ? (
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
                              ) : (
                                <button
                                  className="font-mono hover:underline cursor-pointer"
                                  onClick={() =>
                                    setEditingSalePrice((prev) => ({
                                      ...prev,
                                      [p.id]: String(p.salePrice ?? 0),
                                    }))
                                  }
                                >
                                  {(p.salePrice ?? 0).toLocaleString()}
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </TabsContent>
          {/* ── Customers Tab ── */}
          <TabsContent value="customers" className="mt-4">
            {location?.type === "hotel" || location?.type === "apartment" ? (
              <Tabs defaultValue="customerList">
                <TabsList>
                  <TabsTrigger value="customerList">{t("customerList")}</TabsTrigger>
                  <TabsTrigger value="guests">{t("guests")}</TabsTrigger>
                </TabsList>

                {/* Customer List sub-tab */}
                <TabsContent value="customerList" className="mt-4 space-y-3">
                  <div className="flex justify-end">
                    <Button onClick={() => setShowAddCustomer(true)}>
                      + {t("newCustomer")}
                    </Button>
                  </div>
                  <Input
                    placeholder={`${t("customerName")}, ${t("phone")}...`}
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                  />
                  {filteredCustomers.length === 0 ? (
                    <p className="text-muted-foreground text-sm">{t("noCustomers")}</p>
                  ) : (
                    <CustomerList
                      customers={filteredCustomers}
                      editingCustomer={editingCustomer}
                      editingCustomerData={editingCustomerData}
                      setEditingCustomer={setEditingCustomer}
                      setEditingCustomerData={setEditingCustomerData}
                      handleUpdateCustomer={handleUpdateCustomer}
                      handleDeleteCustomer={handleDeleteCustomer}
                      t={t}
                    />
                  )}
                </TabsContent>

                {/* Guests sub-tab */}
                <TabsContent value="guests" className="mt-4 space-y-3">
                  <div className="flex justify-end">
                    <Button onClick={() => setShowAddGuest(true)}>
                      + {t("newGuest")}
                    </Button>
                  </div>
                  {guests.length === 0 ? (
                    <p className="text-muted-foreground text-sm">{t("noGuests")}</p>
                  ) : (
                    <div className="rounded-xl border overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-muted">
                          <tr>
                            <th className="px-4 py-3 text-left font-medium">{t("customerName")}</th>
                            <th className="px-4 py-3 text-left font-medium">{t("roomNumber")}</th>
                            <th className="px-4 py-3 text-left font-medium">{t("checkIn")}</th>
                            <th className="px-4 py-3 text-left font-medium">{t("checkOut")}</th>
                            <th className="px-4 py-3 text-center font-medium">{t("adults")}/{t("children")}</th>
                            <th className="px-4 py-3 text-left font-medium">{t("status")}</th>
                            <th className="px-4 py-3"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {guests.map((g) => (
                            <tr key={g.id} className="border-t hover:bg-muted/50">
                              <td className="px-4 py-3 font-medium">{getCustomerName(g.customerId)}</td>
                              <td className="px-4 py-3">{g.roomNumber || "—"}</td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                {new Date(g.checkIn).toLocaleDateString()}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                {g.checkOut ? new Date(g.checkOut).toLocaleDateString() : "—"}
                              </td>
                              <td className="px-4 py-3 text-center text-muted-foreground">
                                {g.adults}/{g.children}
                              </td>
                              <td className="px-4 py-3">
                                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                                  g.status === "active"
                                    ? "bg-green-100 text-green-800"
                                    : "bg-muted text-muted-foreground"
                                }`}>
                                  {g.status === "active" ? t("statusActive") : t("statusCheckedOut")}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex gap-1 justify-end">
                                  {g.status === "active" && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-7 px-2 text-xs"
                                      onClick={() => handleGuestCheckOut(g)}
                                    >
                                      {t("checkOut")}
                                    </Button>
                                  )}
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                                    onClick={() => handleDeleteGuest(g.id)}
                                  >
                                    🗑️
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            ) : (
              /* Non-hotel/apartment: just show customer list directly */
              <div className="space-y-3">
                <div className="flex justify-end">
                  <Button onClick={() => setShowAddCustomer(true)}>
                    + {t("newCustomer")}
                  </Button>
                </div>
                <Input
                  placeholder={`${t("customerName")}, ${t("phone")}...`}
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                />
                {filteredCustomers.length === 0 ? (
                  <p className="text-muted-foreground text-sm">{t("noCustomers")}</p>
                ) : (
                  <CustomerList
                    customers={filteredCustomers}
                    editingCustomer={editingCustomer}
                    editingCustomerData={editingCustomerData}
                    setEditingCustomer={setEditingCustomer}
                    setEditingCustomerData={setEditingCustomerData}
                    handleUpdateCustomer={handleUpdateCustomer}
                    handleDeleteCustomer={handleDeleteCustomer}
                    t={t}
                  />
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* ── Create Item Dialog ── */}
      <Dialog open={showCreateProduct} onOpenChange={setShowCreateProduct}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>+ {t("newItem")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <label className="text-sm font-medium mb-1 block">
                {t("itemName")} *
              </label>
              <Input
                value={newProduct.name}
                onChange={(e) =>
                  setNewProduct((f) => ({ ...f, name: e.target.value }))
                }
                onKeyDown={(e) => e.key === "Enter" && handleCreateProduct()}
                autoFocus
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">
                  {t("sku")}{" "}
                  <span className="text-muted-foreground font-normal text-xs">
                    ({t("optional")})
                  </span>
                </label>
                <Input
                  value={newProduct.sku}
                  onChange={(e) =>
                    setNewProduct((f) => ({ ...f, sku: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">
                  {t("unit")} *
                </label>
                <Input
                  value={newProduct.unit}
                  onChange={(e) =>
                    setNewProduct((f) => ({ ...f, unit: e.target.value }))
                  }
                  placeholder={t("unitPlaceholder")}
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button
                variant="outline"
                onClick={() => setShowCreateProduct(false)}
              >
                ✕
              </Button>
              <Button
                onClick={handleCreateProduct}
                disabled={
                  isProductSubmitting ||
                  !newProduct.name.trim() ||
                  !newProduct.unit.trim()
                }
              >
                {isProductSubmitting ? t("submitting") : t("newItem")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Add Customer Dialog ── */}
      <Dialog open={showAddCustomer} onOpenChange={setShowAddCustomer}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>+ {t("newCustomer")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-1">
            <Input
              placeholder={`${t("customerName")} *`}
              value={newCustomer.name}
              onChange={(e) => setNewCustomer((f) => ({ ...f, name: e.target.value }))}
              autoFocus
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                placeholder={t("phone")}
                value={newCustomer.phone}
                onChange={(e) => setNewCustomer((f) => ({ ...f, phone: e.target.value }))}
              />
              <Input
                placeholder={t("email")}
                type="email"
                value={newCustomer.email}
                onChange={(e) => setNewCustomer((f) => ({ ...f, email: e.target.value }))}
              />
            </div>
            <Input
              placeholder={t("supplierCompany")}
              value={newCustomer.address}
              onChange={(e) => setNewCustomer((f) => ({ ...f, address: e.target.value }))}
            />
            <Input
              placeholder={t("notes")}
              value={newCustomer.notes}
              onChange={(e) => setNewCustomer((f) => ({ ...f, notes: e.target.value }))}
            />
            <div className="flex gap-2 justify-end pt-1">
              <Button variant="outline" onClick={() => setShowAddCustomer(false)}>✕</Button>
              <Button onClick={handleAddCustomer} disabled={isCustomerSubmitting || !newCustomer.name.trim()}>
                {isCustomerSubmitting ? t("submitting") : t("newCustomer")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Add Guest Dialog ── */}
      <Dialog open={showAddGuest} onOpenChange={setShowAddGuest}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>+ {t("newGuest")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-1">
            <Select
              value={newGuest.customerId || "none"}
              onValueChange={(v) => setNewGuest((f) => ({ ...f, customerId: v === "none" ? "" : v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("selectCustomer")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t("selectCustomer")}</SelectItem>
                {customers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              placeholder={t("roomNumber")}
              value={newGuest.roomNumber}
              onChange={(e) => setNewGuest((f) => ({ ...f, roomNumber: e.target.value }))}
            />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium mb-1 block">{t("checkIn")} *</label>
                <Input
                  type="date"
                  value={newGuest.checkIn}
                  onChange={(e) => setNewGuest((f) => ({ ...f, checkIn: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block">{t("checkOut")}</label>
                <Input
                  type="date"
                  value={newGuest.checkOut}
                  onChange={(e) => setNewGuest((f) => ({ ...f, checkOut: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium mb-1 block">{t("adults")}</label>
                <Input
                  type="number"
                  min="1"
                  value={newGuest.adults}
                  onChange={(e) => setNewGuest((f) => ({ ...f, adults: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block">{t("children")}</label>
                <Input
                  type="number"
                  min="0"
                  value={newGuest.children}
                  onChange={(e) => setNewGuest((f) => ({ ...f, children: e.target.value }))}
                />
              </div>
            </div>
            <Input
              placeholder={t("notes")}
              value={newGuest.notes}
              onChange={(e) => setNewGuest((f) => ({ ...f, notes: e.target.value }))}
            />
            <div className="flex gap-2 justify-end pt-1">
              <Button variant="outline" onClick={() => setShowAddGuest(false)}>✕</Button>
              <Button onClick={handleAddGuest} disabled={isGuestSubmitting || !newGuest.checkIn}>
                {isGuestSubmitting ? t("submitting") : t("newGuest")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Attachment Image Preview ── */}
      {attachmentPreviewUrl && (
        <Dialog
          open={!!attachmentPreviewUrl}
          onOpenChange={() => setAttachmentPreviewUrl(null)}
        >
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{t("previewImage")}</DialogTitle>
            </DialogHeader>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={attachmentPreviewUrl}
              alt="preview"
              className="w-full rounded-lg object-contain max-h-[70vh]"
            />
          </DialogContent>
        </Dialog>
      )}

      {/* ── Delete Product Confirmation Dialog ── */}
      <Dialog
        open={!!deletingProduct}
        onOpenChange={(open) => {
          if (!open) {
            setDeletingProduct(null);
            setDeleteProductConfirmName("");
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive">
              {t("confirmDeleteItem")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <p className="text-sm text-muted-foreground">
              {t("deleteItemWarning")}
            </p>
            <code className="block bg-muted px-3 py-2 rounded text-sm font-mono">
              {deletingProduct?.name}
            </code>
            <p className="text-sm">{t("typeItemNameToConfirm")}</p>
            <Input
              value={deleteProductConfirmName}
              onChange={(e) => setDeleteProductConfirmName(e.target.value)}
              placeholder={deletingProduct?.name}
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setDeletingProduct(null);
                  setDeleteProductConfirmName("");
                }}
              >
                {t("cancel")}
              </Button>
              <Button
                variant="destructive"
                disabled={deleteProductConfirmName !== deletingProduct?.name}
                onClick={handleDeleteProduct}
              >
                {t("delete")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── New Order Dialog ── */}
      <Dialog
        open={showNewOrder}
        onOpenChange={(open) => {
          if (!open) {
            setShowNewOrder(false);
            setNewOrderCustomerId("");
            setNewOrderNotes("");
            setNewOrderRows([{ productId: "", quantity: "1", salePrice: "0" }]);
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>💰 {t("newOrder")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <Select
                value={newOrderCustomerId || "none"}
                onValueChange={(v) =>
                  setNewOrderCustomerId(v === "none" ? "" : v)
                }
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
                    const product = products.find(
                      (p) => p.id === row.productId
                    );
                    const lineTotal =
                      (Number(row.quantity) || 0) *
                      (Number(row.salePrice) || 0);
                    return (
                      <tr key={idx} className="border-t">
                        <td className="px-3 py-2">
                          <Select
                            value={row.productId || "none"}
                            onValueChange={(v) =>
                              handleOrderProductChange(
                                idx,
                                v === "none" ? "" : v
                              )
                            }
                          >
                            <SelectTrigger className="h-8">
                              <SelectValue
                                placeholder={t("selectProduct")}
                              />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">
                                {t("selectProduct")}
                              </SelectItem>
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
                                  i === idx
                                    ? { ...r, quantity: e.target.value }
                                    : r
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
                                  i === idx
                                    ? { ...r, salePrice: e.target.value }
                                    : r
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
                                setNewOrderRows((rows) =>
                                  rows.filter((_, i) => i !== idx)
                                )
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
                  setShowNewOrder(false);
                  setNewOrderCustomerId("");
                  setNewOrderNotes("");
                  setNewOrderRows([
                    { productId: "", quantity: "1", salePrice: "0" },
                  ]);
                }}
              >
                {t("cancel")}
              </Button>
              <Button
                onClick={handleCreateOrder}
                disabled={
                  isOrderSubmitting ||
                  newOrderRows.some(
                    (r) => !r.productId || Number(r.quantity) < 1
                  )
                }
              >
                {isOrderSubmitting ? t("submitting") : t("newOrder")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── View Order Dialog ── */}
      <Dialog
        open={!!viewingOrder}
        onOpenChange={(open) => !open && setViewingOrder(null)}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              📋 {t("orders")} —{" "}
              {viewingOrder &&
                new Date(viewingOrder.createdAt).toLocaleDateString()}
            </DialogTitle>
          </DialogHeader>
          {viewingOrder && (
            <div className="space-y-3 mt-2">
              <div className="text-sm text-muted-foreground space-y-1">
                <p>
                  <span className="font-medium">{t("customers")}:</span>{" "}
                  {getCustomerName(viewingOrder.customerId)}
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
                      <th className="px-3 py-2 text-left font-medium">
                        {t("productName")}
                      </th>
                      <th className="px-3 py-2 text-center font-medium">
                        {t("quantity")}
                      </th>
                      <th className="px-3 py-2 text-right font-medium">
                        {t("salePrice")}
                      </th>
                      <th className="px-3 py-2 text-right font-medium">
                        {t("totalPrice")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {viewingOrder.items.map((item, i) => (
                      <tr key={i} className="border-t">
                        <td className="px-3 py-2">{item.productName}</td>
                        <td className="px-3 py-2 text-center">
                          {item.quantity.toLocaleString()}
                        </td>
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
                      <td
                        colSpan={3}
                        className="px-3 py-2 text-right font-medium"
                      >
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
                <Link href={`/inventory/${locationId}/import`}>
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
      <Dialog
        open={!!deletingOrderId}
        onOpenChange={(open) => !open && setDeletingOrderId(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-destructive">
              {t("confirmDeleteItem")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <p className="text-sm text-muted-foreground">
              {t("deleteOrderWarning")}
            </p>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setDeletingOrderId(null)}
              >
                {t("cancel")}
              </Button>
              <Button
                variant="destructive"
                onClick={() =>
                  deletingOrderId && handleDeleteOrder(deletingOrderId)
                }
              >
                {t("delete")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Export Stock Dialog ── */}
      <Dialog
        open={showExportDialog}
        onOpenChange={(open) => {
          if (!open) {
            setShowExportDialog(false);
            setExportForm({ productId: "", quantity: "1", unitPrice: "", notes: "" });
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>↗ {t("exportStock")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <label className="text-sm font-medium mb-1 block">{t("selectProduct")} *</label>
              <Select
                value={exportForm.productId || "none"}
                onValueChange={(v) => {
                  const pid = v === "none" ? "" : v;
                  const product = products.find((p) => p.id === pid);
                  setExportForm((f) => ({
                    ...f,
                    productId: pid,
                    unitPrice: product ? String(product.price) : "",
                  }));
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("selectProduct")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t("selectProduct")}</SelectItem>
                  {products
                    .filter((p) => p.status !== "inactive")
                    .map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} ({t("available")}: {p.quantity})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">{t("quantity")} *</label>
                <Input
                  type="number"
                  min="1"
                  value={exportForm.quantity}
                  onChange={(e) => setExportForm((f) => ({ ...f, quantity: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">
                  {t("unitPrice")} <span className="text-muted-foreground font-normal text-xs">({t("optional")})</span>
                </label>
                <Input
                  type="number"
                  min="0"
                  value={exportForm.unitPrice}
                  onChange={(e) => setExportForm((f) => ({ ...f, unitPrice: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">
                {t("notes")} * <span className="text-xs text-muted-foreground">({t("required")})</span>
              </label>
              <Input
                value={exportForm.notes}
                onChange={(e) => setExportForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder={t("notesRequired")}
                className={!exportForm.notes.trim() && exportForm.productId ? "border-destructive" : ""}
              />
            </div>
            <div className="flex gap-2 justify-end pt-1">
              <Button
                variant="outline"
                onClick={() => {
                  setShowExportDialog(false);
                  setExportForm({ productId: "", quantity: "1", unitPrice: "", notes: "" });
                }}
              >
                {t("cancel")}
              </Button>
              <Button
                onClick={handleExportDialogSubmit}
                disabled={
                  isExportSubmitting ||
                  !exportForm.productId ||
                  Number(exportForm.quantity) < 1 ||
                  !exportForm.notes.trim()
                }
              >
                {isExportSubmitting ? t("submitting") : t("confirmExport")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Deactivate Confirmation Dialog ── */}
      <Dialog
        open={!!deactivatingProduct}
        onOpenChange={(open) => !open && setDeactivatingProduct(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-destructive">
              {t("confirmDeactivate")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <code className="block bg-destructive/10 border border-destructive/20 px-3 py-2 rounded text-sm font-mono text-destructive">
              {deactivatingProduct?.name}
            </code>
            <p className="text-sm text-muted-foreground">
              {t("deactivateWarning")}
            </p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setDeactivatingProduct(null)}>
                {t("cancel")}
              </Button>
              <Button variant="destructive" onClick={handleConfirmDeactivate}>
                {t("deactivate")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Product History Dialog ── */}
      <Dialog
        open={!!historyProduct}
        onOpenChange={(open) => !open && setHistoryProduct(null)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              📋 {t("transactionHistory")} — {historyProduct?.name}
            </DialogTitle>
          </DialogHeader>

          {/* Type filter */}
          <div className="flex gap-2 flex-wrap">
            {(["ALL", "IMPORT", "EXPORT", "SALE"] as const).map((type) => (
              <Button
                key={type}
                size="sm"
                variant={historyTypeFilter === type ? "default" : "outline"}
                onClick={() => setHistoryTypeFilter(type)}
              >
                {type === "ALL"
                  ? t("all")
                  : type === "IMPORT"
                  ? t("import")
                  : type === "EXPORT"
                  ? t("export")
                  : t("typeSaleOrder")}
              </Button>
            ))}
          </div>

          {productHistoryEntries.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              {t("noTransactionsForItem")}
            </p>
          ) : (
            <div className="max-h-[60vh] overflow-y-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-muted sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">{t("date")}</th>
                    <th className="px-3 py-2 text-left font-medium">{t("type")}</th>
                    <th className="px-3 py-2 text-right font-medium">{t("quantity")}</th>
                    <th className="px-3 py-2 text-right font-medium">{t("unitPrice")}</th>
                    <th className="px-3 py-2 text-right font-medium">{t("totalPrice")}</th>
                    <th className="px-3 py-2 text-left font-medium">{t("supplier")}</th>
                    <th className="px-3 py-2 text-left font-medium">{t("notes")}</th>
                    <th className="px-3 py-2 text-left font-medium">{t("createdBy")}</th>
                    <th className="px-3 py-2 text-left font-medium">{t("attachments")}</th>
                  </tr>
                </thead>
                <tbody>
                  {productHistoryEntries.map((entry) =>
                    entry.kind === "tx" ? (
                      <tr key={entry.id} className="border-t hover:bg-muted/50">
                        <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                          <p>{new Date(entry.date).toLocaleDateString()}</p>
                          <p className="text-xs opacity-70">
                            {new Date(entry.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </td>
                        <td className="px-3 py-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${entry.type === "EXPORT" ? "bg-blue-100 text-blue-800" : "bg-yellow-100 text-yellow-800"}`}>
                            {entry.type === "EXPORT" ? t("typeSale") : t("typeReturn")}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right">{entry.quantity.toLocaleString()}</td>
                        <td className="px-3 py-2 text-right font-mono">{entry.unitPrice ? entry.unitPrice.toLocaleString() : "—"}</td>
                        <td className="px-3 py-2 text-right font-mono">{entry.totalPrice ? entry.totalPrice.toLocaleString() : "—"}</td>
                        <td className="px-3 py-2 text-muted-foreground text-xs">{getSupplierName(entry.supplierId) || "—"}</td>
                        <td className="px-3 py-2 text-muted-foreground">{entry.notes || "—"}</td>
                        <td className="px-3 py-2 text-muted-foreground text-xs">{entry.createdByName || "—"}</td>
                        <td className="px-3 py-2">
                          <div className="flex flex-wrap gap-1 items-center">
                            {entry.imageUrls?.map((url, i) => (
                              <button key={i} type="button" onClick={() => setAttachmentPreviewUrl(url)} className="shrink-0">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={url} alt="" className="h-8 w-8 object-cover rounded border hover:opacity-80 transition-opacity" />
                              </button>
                            ))}
                            {entry.fileUrls?.map((url, i) => (
                              <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-lg" title={url.split("/").pop()}>📄</a>
                            ))}
                            {!entry.imageUrls?.length && !entry.fileUrls?.length && (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ) : (
                      <tr key={entry.id} className="border-t hover:bg-muted/50">
                        <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                          <p>{new Date(entry.date).toLocaleDateString()}</p>
                          <p className="text-xs opacity-70">
                            {new Date(entry.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </td>
                        <td className="px-3 py-2">
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-purple-100 text-purple-800">
                            {t("typeSaleOrder")}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right">{entry.quantity.toLocaleString()}</td>
                        <td className="px-3 py-2 text-right font-mono">{entry.salePrice.toLocaleString()}</td>
                        <td className="px-3 py-2 text-right font-mono">{entry.totalPrice.toLocaleString()}</td>
                        <td className="px-3 py-2 text-muted-foreground text-xs">{entry.customerName}</td>
                        <td className="px-3 py-2 text-muted-foreground">{entry.notes || "—"}</td>
                        <td className="px-3 py-2 text-muted-foreground text-xs">{entry.createdByName || "—"}</td>
                        <td className="px-3 py-2 text-muted-foreground">—</td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
