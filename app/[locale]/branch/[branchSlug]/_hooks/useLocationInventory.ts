"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/app/authContext";
import axiosInstance from "@/utils/axiosInstance";
import { extractBranchId } from "@/utils/slugify";
import type {
  Location,
  Product,
  Transaction,
  Expense,
  Category,
  Supplier,
  Customer,
  Guest,
  Room,
  SaleOrder,
  LocationDoc,
  Announcement,
} from "../_types";

export function useLocationInventory() {
  const params = useParams<{ branchSlug: string }>();
  const branchSlug = params?.branchSlug || "";
  const branchId = extractBranchId(branchSlug);
  const { isLoggedIn, isInitializing, user } = useAuth();
  const router = useRouter();

  const [location, setLocation] = useState<Location | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [orders, setOrders] = useState<SaleOrder[]>([]);
  const [documents, setDocuments] = useState<LocationDoc[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [locationPermissions, setLocationPermissions] = useState<string[]>([]);

  useEffect(() => {
    if (isInitializing) return;
    if (!isLoggedIn) {
      router.push("/inventory/login");
      return;
    }
    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInitializing, isLoggedIn, branchId]);

  const loadData = async () => {
    // ── Phase 1: critical data — unblock UI immediately ────────────────
    try {
      const [locRes, productsRes, meLocRes] = await Promise.allSettled([
        axiosInstance.get(`/admin/locations/${branchId}`),
        axiosInstance.get(`/locations/${branchId}/products`),
        axiosInstance.get("/users/me/locations"),
      ]);
      if (locRes.status === "fulfilled") setLocation(locRes.value.data.location);
      if (productsRes.status === "fulfilled") setProducts(productsRes.value.data.products);
      if (meLocRes.status === "fulfilled") {
        const loc = meLocRes.value.data.locations?.find(
          (l: { id: string; permissions?: string[] }) => l.id === branchId
        );
        if (loc?.permissions) setLocationPermissions(loc.permissions);
      }
    } catch {
      // silent
    } finally {
      setIsLoading(false); // show UI as soon as Items tab is ready
    }

    // ── Phase 2: background data — fills remaining tabs silently ───────
    Promise.allSettled([
      axiosInstance.get(`/locations/${branchId}/transactions`),
      axiosInstance.get(`/locations/${branchId}/expenses`),
      axiosInstance.get(`/locations/${branchId}/categories`),
      axiosInstance.get(`/locations/${branchId}/suppliers`),
      axiosInstance.get(`/locations/${branchId}/customers`),
      axiosInstance.get(`/locations/${branchId}/guests`),
      axiosInstance.get(`/locations/${branchId}/orders`),
      axiosInstance.get(`/locations/${branchId}/documents`),
      axiosInstance.get(`/locations/${branchId}/rooms`),
      axiosInstance.get(`/locations/${branchId}/announcements`),
    ]).then(([txRes, expRes, catRes, supRes, custRes, guestRes, ordersRes, docsRes, roomsRes, announcementsRes]) => {
      if (txRes.status === "fulfilled") setTransactions(txRes.value.data.transactions);
      if (expRes.status === "fulfilled") setExpenses(expRes.value.data.expenses);
      if (catRes.status === "fulfilled") setCategories(catRes.value.data.categories);
      if (supRes.status === "fulfilled") setSuppliers(supRes.value.data.suppliers);
      if (custRes.status === "fulfilled") setCustomers(custRes.value.data.customers);
      if (guestRes.status === "fulfilled") setGuests(guestRes.value.data.guests);
      if (ordersRes.status === "fulfilled") setOrders(ordersRes.value.data.orders);
      if (docsRes.status === "fulfilled") setDocuments(docsRes.value.data.documents);
      if (roomsRes.status === "fulfilled") setRooms(roomsRes.value.data.rooms);
      if (announcementsRes.status === "fulfilled") setAnnouncements(announcementsRes.value.data.announcements);
    });
  };

  const canManageProducts = useMemo(() => {
    if (!user) return false;
    if (user.role === "superadmin" || user.role === "admin") return true;
    return locationPermissions.includes("MANAGE_PRODUCTS");
  }, [user, locationPermissions]);

  const isAdmin = useMemo(() => {
    if (!user) return false;
    return user.role === "superadmin" || user.role === "admin";
  }, [user]);

  const isHotel = location?.type === "hotel" || location?.type === "apartment";

  const availableRooms = useMemo(
    () => rooms.filter((r) => r.status === "available"),
    [rooms]
  );

  const activeGuests = useMemo(
    () => guests.filter((g) => g.status === "active"),
    [guests]
  );

  const getCustomerName = (customerId: string | null) => {
    if (!customerId) return "—";
    return customers.find((c) => c.id === customerId)?.name || "—";
  };

  const getGuestLabel = (guestId: string | null) => {
    if (!guestId) return "—";
    const g = guests.find((g) => g.id === guestId);
    if (!g) return "—";
    const displayName = g.name || getCustomerName(g.customerId);
    return `${g.roomNumber ? `P.${g.roomNumber}` : ""}${displayName !== "—" ? ` — ${displayName}` : ""}`.trim() || "—";
  };

  return {
    branchId,
    branchSlug,
    isLoggedIn,
    isInitializing,
    user,
    location,
    setLocation,
    products,
    setProducts,
    transactions,
    setTransactions,
    expenses,
    setExpenses,
    categories,
    setCategories,
    suppliers,
    setSuppliers,
    customers,
    setCustomers,
    guests,
    setGuests,
    rooms,
    setRooms,
    orders,
    setOrders,
    documents,
    setDocuments,
    announcements,
    setAnnouncements,
    isLoading,
    locationPermissions,
    canManageProducts,
    isAdmin,
    isHotel,
    availableRooms,
    activeGuests,
    getCustomerName,
    getGuestLabel,
  };
}
