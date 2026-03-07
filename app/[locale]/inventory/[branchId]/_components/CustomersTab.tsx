"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import axiosInstance from "@/utils/axiosInstance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FloatLabelInput } from "@/components/ui/float-label-input";
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
import type { Location, Customer, Guest, Room } from "../_types";
import { formatWithDots, parseDots } from "@/utils/formatNumber";

interface CustomerListProps {
  customers: Customer[];
  editingCustomer: Customer | null;
  editingCustomerData: { name: string; phone: string; email: string; address: string; notes: string };
  setEditingCustomer: (c: Customer | null) => void;
  setEditingCustomerData: React.Dispatch<React.SetStateAction<{ name: string; phone: string; email: string; address: string; notes: string }>>;
  handleUpdateCustomer: () => void;
  handleDeleteCustomer: (id: string) => void;
  isUpdatingCustomer: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: (key: string) => string;
}

function CustomerList({
  customers,
  editingCustomer,
  editingCustomerData,
  setEditingCustomer,
  setEditingCustomerData,
  handleUpdateCustomer,
  handleDeleteCustomer,
  isUpdatingCustomer,
  t,
}: CustomerListProps) {
  return (
    <div className="rounded-xl border overflow-hidden">
      {customers.map((c) => (
        <div key={c.id} className="px-4 py-3 border-b last:border-b-0 hover:bg-muted/40">
          {editingCustomer?.id === c.id ? (
            <div className="space-y-2">
              <FloatLabelInput
                inputSize="sm"
                label={`${t("customerName")} *`}
                value={editingCustomerData.name}
                onChange={(e) => setEditingCustomerData((f) => ({ ...f, name: e.target.value }))}
                autoFocus
              />
              <div className="grid grid-cols-2 gap-2">
                <FloatLabelInput
                  inputSize="sm"
                  label={t("phone")}
                  value={editingCustomerData.phone}
                  onChange={(e) => setEditingCustomerData((f) => ({ ...f, phone: e.target.value }))}
                />
                <FloatLabelInput
                  inputSize="sm"
                  label={t("email")}
                  value={editingCustomerData.email}
                  onChange={(e) => setEditingCustomerData((f) => ({ ...f, email: e.target.value }))}
                />
              </div>
              <FloatLabelInput
                inputSize="sm"
                label={t("supplierCompany")}
                value={editingCustomerData.address}
                onChange={(e) => setEditingCustomerData((f) => ({ ...f, address: e.target.value }))}
              />
              <FloatLabelInput
                inputSize="sm"
                label={t("notes")}
                value={editingCustomerData.notes}
                onChange={(e) => setEditingCustomerData((f) => ({ ...f, notes: e.target.value }))}
              />
              <div className="flex gap-2 justify-end">
                <Button size="sm" variant="ghost" onClick={() => setEditingCustomer(null)}>✕</Button>
                <Button size="sm" onClick={handleUpdateCustomer} disabled={isUpdatingCustomer || !editingCustomerData.name.trim()}>
                  {isUpdatingCustomer ? "..." : "✓"}
                </Button>
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

interface CustomersTabProps {
  branchId: string;
  location: Location | null;
  customers: Customer[];
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
  guests: Guest[];
  setGuests: React.Dispatch<React.SetStateAction<Guest[]>>;
  rooms: Room[];
  setRooms: React.Dispatch<React.SetStateAction<Room[]>>;
  isHotel: boolean;
  availableRooms: Room[];
  getCustomerName: (customerId: string | null) => string;
}

export function CustomersTab({
  branchId,
  location,
  customers,
  setCustomers,
  guests,
  setGuests,
  rooms,
  setRooms,
  isHotel,
  availableRooms,
  getCustomerName,
}: CustomersTabProps) {
  const t = useTranslations("inventory");
  const { toast } = useToast();

  // ── Auto-fix ref (runs once after data loads) ─────────────────────
  const hasAutoFixedRooms = useRef(false);

  // ── Customer state ─────────────────────────────────────────────────
  const [customerSearch, setCustomerSearch] = useState("");
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: "", phone: "", email: "", address: "", notes: "" });
  const [isCustomerSubmitting, setIsCustomerSubmitting] = useState(false);
  const [isUpdatingCustomer, setIsUpdatingCustomer] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [editingCustomerData, setEditingCustomerData] = useState({ name: "", phone: "", email: "", address: "", notes: "" });

  // ── Guest state ────────────────────────────────────────────────────
  const [showAddGuest, setShowAddGuest] = useState(false);
  const [newGuest, setNewGuest] = useState({ name: "", customerId: "", roomId: "", checkIn: "", checkOut: "", adults: "1", children: "0", notes: "", agreedPrice: "" });
  const [isGuestSubmitting, setIsGuestSubmitting] = useState(false);
  const [isUpdatingGuest, setIsUpdatingGuest] = useState(false);
  const [checkingOutId, setCheckingOutId] = useState<string | null>(null);
  const [confirmCheckOutGuest, setConfirmCheckOutGuest] = useState<Guest | null>(null);
  const [editingGuest, setEditingGuest] = useState<Guest | null>(null);
  const [editingGuestData, setEditingGuestData] = useState({ name: "", customerId: "", checkIn: "", checkOut: "", adults: "1", children: "0", notes: "", agreedPrice: "" });

  // ── Room state ─────────────────────────────────────────────────────
  const [showAddRoom, setShowAddRoom] = useState(false);
  const [newRoom, setNewRoom] = useState({ number: "", priceType: "night" as "night" | "month", price: "", notes: "" });
  const [isRoomSubmitting, setIsRoomSubmitting] = useState(false);
  const [isUpdatingRoom, setIsUpdatingRoom] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [editingRoomData, setEditingRoomData] = useState({ number: "", priceType: "night" as "night" | "month", price: "", notes: "" });
  const [roomStatusFilter, setRoomStatusFilter] = useState<"ALL" | "available" | "occupied" | "maintenance">("ALL");
  const [showCheckoutHistory, setShowCheckoutHistory] = useState(false);
  const [historyYear, setHistoryYear] = useState(() => new Date().getFullYear());
  const [historyMonth, setHistoryMonth] = useState(0); // 0 = all months

  // ── Computed ──────────────────────────────────────────────────────
  // Map roomId → active guest display name (kept for compatibility)
  const occupiedByMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const g of guests) {
      if (g.status === "active" && g.roomId) {
        map.set(g.roomId, g.name || getCustomerName(g.customerId));
      }
    }
    return map;
  }, [guests, getCustomerName]);

  // Map roomId → full active Guest object (for room cards)
  const activeGuestByRoom = useMemo(() => {
    const map = new Map<string, Guest>();
    for (const g of guests) {
      if (g.status === "active" && g.roomId) map.set(g.roomId, g);
    }
    return map;
  }, [guests]);

  const guestsActive = useMemo(() => guests.filter((g) => g.status === "active"), [guests]);
  const guestsCheckedOut = useMemo(() => guests.filter((g) => g.status !== "active"), [guests]);

  const filteredRooms = useMemo(() => {
    if (roomStatusFilter === "ALL") return rooms;
    return rooms.filter((r) => r.status === roomStatusFilter);
  }, [rooms, roomStatusFilter]);

  // Map roomId → price type ("night" | "month") for display in guest dialogs / list
  const roomPriceTypeMap = useMemo(() => {
    const map = new Map<string, "night" | "month">();
    for (const r of rooms) {
      map.set(r.id, r.pricePerMonth ? "month" : "night");
    }
    return map;
  }, [rooms]);

  // Auto-fix orphaned "occupied" rooms (no active guest linked) once after data loads
  useEffect(() => {
    if (hasAutoFixedRooms.current || rooms.length === 0) return;
    hasAutoFixedRooms.current = true;
    const orphaned = rooms.filter(
      (r) => r.status === "occupied" && !guests.some((g) => g.status === "active" && g.roomId === r.id)
    );
    for (const r of orphaned) {
      axiosInstance
        .put(`/locations/${branchId}/rooms/${r.id}`, { status: "available" })
        .then(() =>
          setRooms((prev) => prev.map((room) => room.id === r.id ? { ...room, status: "available" } : room))
        )
        .catch(() => { /* silent */ });
    }
  }, [guests, branchId, rooms, setRooms]);

  // Min checkout date for Add Guest dialog (monthly rooms: min 1 month; others: min checkIn + 1 day)
  const newGuestMinCheckout = useMemo(() => {
    if (!newGuest.checkIn) return "";
    const room = newGuest.roomId ? rooms.find((r) => r.id === newGuest.roomId) : null;
    const d = new Date(newGuest.checkIn);
    if (room?.pricePerMonth) {
      d.setMonth(d.getMonth() + 1);
    } else {
      d.setDate(d.getDate() + 1);
    }
    return d.toISOString().split("T")[0];
  }, [newGuest.checkIn, newGuest.roomId, rooms]);

  // Min checkout date for Edit Guest dialog (monthly rooms: min 1 month; others: min checkIn + 1 day)
  const editMinCheckout = useMemo(() => {
    if (!editingGuestData.checkIn) return "";
    const room = editingGuest?.roomId ? rooms.find((r) => r.id === editingGuest.roomId) : null;
    const d = new Date(editingGuestData.checkIn);
    if (room?.pricePerMonth) {
      d.setMonth(d.getMonth() + 1);
    } else {
      d.setDate(d.getDate() + 1);
    }
    return d.toISOString().split("T")[0];
  }, [editingGuestData.checkIn, editingGuest, rooms]);

  const filteredCustomers = useMemo(() => {
    if (!customerSearch) return customers;
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
        (c.phone && c.phone.includes(customerSearch))
    );
  }, [customers, customerSearch]);

  // Years that appear in checkout history (for filter dropdown)
  const historyYears = useMemo(() => {
    const years = new Set<number>();
    years.add(new Date().getFullYear());
    for (const g of guestsCheckedOut) {
      if (g.checkIn) years.add(new Date(g.checkIn).getFullYear());
    }
    return Array.from(years).sort((a, b) => b - a);
  }, [guestsCheckedOut]);

  // Checkout history filtered by selected year + month
  const filteredCheckedOut = useMemo(() => {
    return guestsCheckedOut.filter((g) => {
      if (!g.checkIn) return false;
      const d = new Date(g.checkIn);
      if (d.getFullYear() !== historyYear) return false;
      if (historyMonth === 0) return true;
      return d.getMonth() + 1 === historyMonth;
    });
  }, [guestsCheckedOut, historyYear, historyMonth]);

  // ── Customer CRUD ─────────────────────────────────────────────────
  const handleAddCustomer = async () => {
    if (!newCustomer.name.trim()) return;
    setIsCustomerSubmitting(true);
    try {
      const res = await axiosInstance.post(`/locations/${branchId}/customers`, newCustomer);
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
    setIsUpdatingCustomer(true);
    try {
      const res = await axiosInstance.put(`/locations/${branchId}/customers`, {
        customerId: editingCustomer.id,
        ...editingCustomerData,
      });
      setCustomers((prev) => prev.map((c) => c.id === editingCustomer.id ? res.data.customer : c));
      setEditingCustomer(null);
      toast({ title: t("customerUpdated") });
    } catch {
      toast({ title: t("importFailed"), variant: "destructive" });
    } finally {
      setIsUpdatingCustomer(false);
    }
  };

  const handleDeleteCustomer = async (id: string) => {
    if (!confirm(t("confirmDelete"))) return;
    try {
      await axiosInstance.delete(`/locations/${branchId}/customers?customerId=${id}`);
      setCustomers((prev) => prev.filter((c) => c.id !== id));
      toast({ title: t("customerDeleted") });
    } catch {
      toast({ title: t("importFailed"), variant: "destructive" });
    }
  };

  // ── Guest CRUD ────────────────────────────────────────────────────
  const handleNewGuestRoomChange = (roomId: string) => {
    const room = rooms.find((r) => r.id === roomId);
    const defaultPrice = room?.pricePerMonth ?? room?.pricePerNight ?? null;
    setNewGuest((f) => ({
      ...f,
      roomId,
      agreedPrice: defaultPrice !== null ? formatWithDots(String(defaultPrice)) : "",
      checkOut: "", // reset checkout when room changes
    }));
  };

  const handleAddGuest = async () => {
    if (!newGuest.name.trim() || !newGuest.checkIn || !newGuest.roomId) return;
    setIsGuestSubmitting(true);
    try {
      const res = await axiosInstance.post(`/locations/${branchId}/guests`, {
        name: newGuest.name || undefined,
        customerId: newGuest.customerId || undefined,
        roomId: newGuest.roomId,
        checkIn: newGuest.checkIn,
        checkOut: newGuest.checkOut || undefined,
        adults: Number(newGuest.adults),
        children: Number(newGuest.children),
        notes: newGuest.notes || undefined,
        agreedPrice: newGuest.agreedPrice !== "" ? Number(parseDots(newGuest.agreedPrice)) : undefined,
      });
      setGuests((prev) => [res.data.guest, ...prev]);
      setRooms((prev) => prev.map((r) => r.id === newGuest.roomId ? { ...r, status: "occupied" } : r));
      setNewGuest({ name: "", customerId: "", roomId: "", checkIn: "", checkOut: "", adults: "1", children: "0", notes: "", agreedPrice: "" });
      setShowAddGuest(false);
      toast({ title: t("guestAdded") });
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: unknown } } };
      const errMsg = typeof e.response?.data?.error === "string" ? e.response?.data?.error : undefined;
      toast({ title: errMsg || t("importFailed"), variant: "destructive" });
    } finally {
      setIsGuestSubmitting(false);
    }
  };

  const handleGuestCheckOut = async (guest: Guest) => {
    setCheckingOutId(guest.id);
    const today = new Date().toISOString().split("T")[0];
    try {
      const res = await axiosInstance.put(`/locations/${branchId}/guests`, {
        guestId: guest.id,
        checkOut: today,
        status: "checked-out",
      });
      setGuests((prev) => prev.map((g) => g.id === guest.id ? res.data.guest : g));
      if (guest.roomId) {
        setRooms((prev) => prev.map((r) => r.id === guest.roomId ? { ...r, status: "available" } : r));
      }
      toast({ title: t("guestCheckedOut") });
    } catch {
      toast({ title: t("importFailed"), variant: "destructive" });
    } finally {
      setCheckingOutId(null);
    }
  };

  const handleDeleteGuest = async (id: string) => {
    if (!confirm(t("confirmDelete"))) return;
    const guest = guests.find((g) => g.id === id);
    try {
      await axiosInstance.delete(`/locations/${branchId}/guests?guestId=${id}`);
      setGuests((prev) => prev.filter((g) => g.id !== id));
      // Reset room to available if the deleted guest was still active
      if (guest?.status === "active" && guest.roomId) {
        setRooms((prev) =>
          prev.map((r) => r.id === guest.roomId ? { ...r, status: "available" } : r)
        );
      }
      toast({ title: t("guestDeleted") });
    } catch {
      toast({ title: t("importFailed"), variant: "destructive" });
    }
  };

  const handleUpdateGuest = async () => {
    if (!editingGuest || !editingGuestData.name.trim() || !editingGuestData.checkIn) return;
    setIsUpdatingGuest(true);
    try {
      const res = await axiosInstance.put(`/locations/${branchId}/guests`, {
        guestId: editingGuest.id,
        name: editingGuestData.name || null,
        customerId: editingGuestData.customerId || null,
        checkIn: editingGuestData.checkIn,
        checkOut: editingGuestData.checkOut || null,
        adults: Number(editingGuestData.adults),
        children: Number(editingGuestData.children),
        notes: editingGuestData.notes || null,
        agreedPrice: editingGuestData.agreedPrice !== "" ? Number(parseDots(editingGuestData.agreedPrice)) : null,
      });
      setGuests((prev) => prev.map((g) => g.id === editingGuest.id ? res.data.guest : g));
      setEditingGuest(null);
      toast({ title: t("guestUpdated") });
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: unknown } } };
      const errMsg = typeof e.response?.data?.error === "string" ? e.response?.data?.error : undefined;
      toast({ title: errMsg || t("importFailed"), variant: "destructive" });
    } finally {
      setIsUpdatingGuest(false);
    }
  };

  // ── Room CRUD ──────────────────────────────────────────────────────
  const handleAddRoom = async () => {
    if (!newRoom.number.trim()) return;
    setIsRoomSubmitting(true);
    try {
      const res = await axiosInstance.post(`/locations/${branchId}/rooms`, {
        number: newRoom.number.trim(),
        pricePerNight: newRoom.priceType === "night" && newRoom.price ? Number(parseDots(newRoom.price)) : undefined,
        pricePerMonth: newRoom.priceType === "month" && newRoom.price ? Number(parseDots(newRoom.price)) : undefined,
        notes: newRoom.notes || undefined,
      });
      setRooms((prev) => [...prev, res.data.room].sort((a, b) => a.number.localeCompare(b.number, undefined, { numeric: true })));
      setNewRoom({ number: "", priceType: "night", price: "", notes: "" });
      setShowAddRoom(false);
      toast({ title: t("roomAdded") });
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: unknown } } };
      const msg = typeof e.response?.data?.error === "string" ? e.response?.data?.error : undefined;
      toast({ title: msg === "Room number already exists" ? t("roomDuplicate") : t("roomAddFailed"), variant: "destructive" });
    } finally {
      setIsRoomSubmitting(false);
    }
  };

  const handleUpdateRoom = async () => {
    if (!editingRoom || !editingRoomData.number.trim()) return;
    setIsUpdatingRoom(true);
    try {
      const res = await axiosInstance.put(`/locations/${branchId}/rooms/${editingRoom.id}`, {
        number: editingRoomData.number.trim(),
        pricePerNight: editingRoomData.priceType === "night" ? (editingRoomData.price ? Number(parseDots(editingRoomData.price)) : null) : null,
        pricePerMonth: editingRoomData.priceType === "month" ? (editingRoomData.price ? Number(parseDots(editingRoomData.price)) : null) : null,
        notes: editingRoomData.notes || null,
      });
      setRooms((prev) => prev.map((r) => r.id === editingRoom.id ? res.data.room : r));
      setEditingRoom(null);
      toast({ title: t("roomUpdated") });
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: unknown } } };
      const msg = typeof e.response?.data?.error === "string" ? e.response?.data?.error : undefined;
      toast({ title: msg === "Room number already exists" ? t("roomDuplicate") : t("roomAddFailed"), variant: "destructive" });
    } finally {
      setIsUpdatingRoom(false);
    }
  };

  const handleRoomStatusChange = async (roomId: string, status: string) => {
    try {
      const res = await axiosInstance.put(`/locations/${branchId}/rooms/${roomId}`, { status });
      setRooms((prev) => prev.map((r) => r.id === roomId ? res.data.room : r));
    } catch {
      toast({ title: t("roomAddFailed"), variant: "destructive" });
    }
  };

  // Helper: number of days from checkIn to checkOut (or today if still active)
  const getDaysStaying = (checkIn: string, checkOut?: string | null): number => {
    const start = new Date(checkIn);
    const end = checkOut ? new Date(checkOut) : new Date();
    return Math.max(0, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
  };

  // Helper: open Add Guest dialog pre-filled for a specific room
  const openCheckInForRoom = (roomId: string) => {
    const room = rooms.find((r) => r.id === roomId);
    const defaultPrice = room?.pricePerMonth ?? room?.pricePerNight ?? null;
    const today = new Date().toISOString().split("T")[0];
    setNewGuest({
      name: "",
      customerId: "",
      roomId,
      checkIn: today,
      checkOut: "",
      adults: "1",
      children: "0",
      notes: "",
      agreedPrice: defaultPrice !== null ? formatWithDots(String(defaultPrice)) : "",
    });
    setShowAddGuest(true);
  };

  const handleDeleteRoom = async (roomId: string) => {
    if (!confirm(t("confirmDelete"))) return;
    try {
      await axiosInstance.delete(`/locations/${branchId}/rooms/${roomId}`);
      setRooms((prev) => prev.filter((r) => r.id !== roomId));
      toast({ title: t("roomDeleted") });
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: unknown } } };
      const msg = typeof e.response?.data?.error === "string" ? e.response?.data?.error : undefined;
      toast({ title: msg?.includes("occupied") ? t("roomDeleteFailed") : t("roomAddFailed"), variant: "destructive" });
    }
  };

  return (
    <>
      {isHotel ? (
        /* hotel/apartment: Rooms overview (default) + Guests */
        <Tabs defaultValue="rooms">
          <TabsList className="w-full">
            <TabsTrigger value="rooms" className="flex-1">{t("rooms")} ({rooms.length})</TabsTrigger>
            <TabsTrigger value="guests" className="flex-1">{t("guests")} ({guests.length})</TabsTrigger>
          </TabsList>

          {/* ─── Guests sub-tab ─── */}
          <TabsContent value="guests" className="mt-4 space-y-5">

            {/* Section 1 — Currently Staying */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                <h3 className="text-sm font-semibold">
                  {t("currentlyStaying")}
                  <span className="text-muted-foreground font-normal ml-1.5">({guestsActive.length})</span>
                </h3>
              </div>
              {guestsActive.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center border rounded-xl border-dashed">
                  {t("noActiveGuests")}
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {guestsActive.map((g) => {
                    const days = getDaysStaying(g.checkIn, g.checkOut);
                    const priceType = roomPriceTypeMap.get(g.roomId ?? "");
                    return (
                      <div key={g.id} className="rounded-xl border-2 border-emerald-200 bg-emerald-50/40 dark:border-emerald-800/50 dark:bg-emerald-950/10 p-4 flex flex-col gap-2">
                        {/* Room badge + name */}
                        <div className="flex items-center gap-2 flex-wrap">
                          {g.roomNumber && (
                            <span className="text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200 px-2 py-0.5 rounded-full shrink-0">
                              {t("room")} {g.roomNumber}
                            </span>
                          )}
                          <span className="font-semibold text-sm truncate">{g.name || getCustomerName(g.customerId)}</span>
                        </div>
                        {/* Dates + nights */}
                        <div className="text-xs text-muted-foreground space-y-0.5">
                          <div>
                            {new Date(g.checkIn).toLocaleDateString()} →{" "}
                            {g.checkOut ? new Date(g.checkOut).toLocaleDateString() : <span className="italic">{t("openEnded")}</span>}
                          </div>
                          <div className="font-semibold text-amber-700 dark:text-amber-400">{days} {t("nights")}</div>
                        </div>
                        {/* Adults / children */}
                        <div className="text-xs text-muted-foreground">
                          {g.adults} {t("adults")}{g.children > 0 ? `, ${g.children} ${t("children")}` : ""}
                          {g.agreedPrice != null && (
                            <span className="ml-2 font-medium text-foreground">
                              · {g.agreedPrice.toLocaleString()} {location?.currency || "VND"}
                              {priceType === "month" ? t("perMonth") : t("perNight")}
                            </span>
                          )}
                        </div>
                        {g.notes && <p className="text-[11px] text-muted-foreground italic">{g.notes}</p>}
                        {/* Actions */}
                        <div className="flex gap-1.5 mt-auto pt-2 border-t border-emerald-200/60 dark:border-emerald-800/40">
                          <Button
                            size="sm" variant="ghost" className="h-7 px-2 text-xs"
                            onClick={() => {
                              setEditingGuest(g);
                              setEditingGuestData({
                                name: g.name || "",
                                customerId: g.customerId || "",
                                checkIn: g.checkIn.split("T")[0],
                                checkOut: g.checkOut ? g.checkOut.split("T")[0] : "",
                                adults: String(g.adults),
                                children: String(g.children),
                                notes: g.notes || "",
                                agreedPrice: g.agreedPrice !== null && g.agreedPrice !== undefined ? formatWithDots(String(g.agreedPrice)) : "",
                              });
                            }}
                          >✏️</Button>
                          <Button
                            size="sm" variant="outline"
                            className="h-7 px-2 text-xs flex-1 border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400"
                            onClick={() => setConfirmCheckOutGuest(g)}
                            disabled={checkingOutId === g.id}
                          >
                            {checkingOutId === g.id ? "..." : `✓ ${t("checkOut")}`}
                          </Button>
                          <Button
                            size="sm" variant="ghost"
                            className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                            onClick={() => handleDeleteGuest(g.id)}
                          >🗑️</Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Section 2 — Check-out History (collapsible) */}
            <div className="space-y-2">
              <button
                className="flex items-center gap-2 w-full text-left py-1 hover:text-foreground transition-colors"
                onClick={() => setShowCheckoutHistory((v) => !v)}
              >
                <span className={`text-xs text-muted-foreground transition-transform duration-150 ${showCheckoutHistory ? "rotate-90" : ""}`}>▶</span>
                <h3 className="text-sm font-semibold text-muted-foreground">
                  {t("checkoutHistory")}
                  <span className="font-normal ml-1.5">({guestsCheckedOut.length})</span>
                </h3>
              </button>
              {showCheckoutHistory && (
                <>
                  {/* Year / Month filter */}
                  <div className="flex flex-wrap gap-2 pl-4 pb-1">
                    <Select
                      value={String(historyYear)}
                      onValueChange={(v) => { setHistoryYear(Number(v)); setHistoryMonth(0); }}
                    >
                      <SelectTrigger className="h-7 w-24 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {historyYears.map((y) => (
                          <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={String(historyMonth)}
                      onValueChange={(v) => setHistoryMonth(Number(v))}
                    >
                      <SelectTrigger className="h-7 w-36 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">{t("allMonths")}</SelectItem>
                        {Array.from({ length: 12 }, (_, i) => (
                          <SelectItem key={i + 1} value={String(i + 1)}>
                            {new Date(2000, i, 1).toLocaleString("default", { month: "long" })}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <span className="text-xs text-muted-foreground self-center">
                      {filteredCheckedOut.length} / {guestsCheckedOut.length}
                    </span>
                  </div>

                  {guestsCheckedOut.length === 0 ? (
                    <p className="text-sm text-muted-foreground pl-5 py-2">{t("noHistory")}</p>
                  ) : filteredCheckedOut.length === 0 ? (
                    <p className="text-sm text-muted-foreground pl-5 py-2">{t("noResults")}</p>
                  ) : (
                    <div className="rounded-xl border overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-muted">
                          <tr>
                            <th className="px-4 py-2.5 text-left font-medium text-xs">{t("guestName")}</th>
                            <th className="px-4 py-2.5 text-left font-medium text-xs">{t("roomNumber")}</th>
                            <th className="px-4 py-2.5 text-left font-medium text-xs">{t("checkIn")}</th>
                            <th className="px-4 py-2.5 text-left font-medium text-xs">{t("checkOut")}</th>
                            <th className="px-4 py-2.5 text-right font-medium text-xs">{t("nights")}</th>
                            <th className="px-4 py-2.5 text-right font-medium text-xs">{t("agreedPrice")}</th>
                            <th className="px-4 py-2.5 text-right font-medium text-xs">{t("totalAmount")}</th>
                            <th className="px-4 py-2.5"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredCheckedOut.map((g) => {
                            const nights = getDaysStaying(g.checkIn, g.checkOut);
                            const priceType = roomPriceTypeMap.get(g.roomId ?? "");
                            const units = priceType === "month" ? Math.ceil(nights / 30) : nights;
                            const totalAmount = g.agreedPrice != null ? g.agreedPrice * units : null;
                            return (
                              <tr key={g.id} className="border-t hover:bg-muted/40">
                                <td className="px-4 py-2.5 font-medium text-xs">
                                  <div>{g.name || getCustomerName(g.customerId)}</div>
                                  {g.notes && <div className="text-muted-foreground italic">{g.notes}</div>}
                                </td>
                                <td className="px-4 py-2.5 text-xs text-muted-foreground">{g.roomNumber || "—"}</td>
                                <td className="px-4 py-2.5 text-xs whitespace-nowrap">{new Date(g.checkIn).toLocaleDateString()}</td>
                                <td className="px-4 py-2.5 text-xs whitespace-nowrap">{g.checkOut ? new Date(g.checkOut).toLocaleDateString() : "—"}</td>
                                <td className="px-4 py-2.5 text-xs text-right text-muted-foreground">{nights}</td>
                                <td className="px-4 py-2.5 text-xs text-right font-mono text-muted-foreground">
                                  {g.agreedPrice != null ? g.agreedPrice.toLocaleString() : "—"}
                                </td>
                                <td className="px-4 py-2.5 text-xs text-right font-mono font-semibold">
                                  {totalAmount != null ? totalAmount.toLocaleString() : "—"}
                                </td>
                                <td className="px-4 py-2.5">
                                  <div className="flex gap-1 justify-end">
                                    <Button
                                      variant="ghost" size="sm" className="h-7 px-2"
                                      onClick={() => {
                                        setEditingGuest(g);
                                        setEditingGuestData({
                                          name: g.name || "",
                                          customerId: g.customerId || "",
                                          checkIn: g.checkIn.split("T")[0],
                                          checkOut: g.checkOut ? g.checkOut.split("T")[0] : "",
                                          adults: String(g.adults),
                                          children: String(g.children),
                                          notes: g.notes || "",
                                          agreedPrice: g.agreedPrice !== null && g.agreedPrice !== undefined ? formatWithDots(String(g.agreedPrice)) : "",
                                        });
                                      }}
                                    >✏️</Button>
                                    <Button
                                      variant="ghost" size="sm"
                                      className="h-7 px-2 text-destructive hover:text-destructive"
                                      onClick={() => handleDeleteGuest(g.id)}
                                    >🗑️</Button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </div>
          </TabsContent>

          {/* ─── Rooms sub-tab — Card Grid ─── */}
          <TabsContent value="rooms" className="mt-4 space-y-4">
            {/* Toolbar: status filter pills + Add Room button */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap gap-1.5">
                {(["ALL", "available", "occupied", "maintenance"] as const).map((s) => {
                  const count = s === "ALL" ? rooms.length : rooms.filter((r) => r.status === s).length;
                  const labelMap = { ALL: t("all"), available: t("roomAvailable"), occupied: t("roomOccupied"), maintenance: t("roomMaintenance") };
                  const activeStyle = { ALL: "bg-foreground text-background", available: "bg-emerald-600 text-white", occupied: "bg-amber-500 text-white", maintenance: "bg-slate-500 text-white" }[s];
                  const isActive = roomStatusFilter === s;
                  return (
                    <button
                      key={s}
                      onClick={() => setRoomStatusFilter(s)}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${isActive ? activeStyle : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
                    >
                      {labelMap[s]} ({count})
                    </button>
                  );
                })}
              </div>
              <Button size="sm" onClick={() => setShowAddRoom(true)}>+ {t("addRoom")}</Button>
            </div>

            {/* Room cards */}
            {rooms.length === 0 ? (
              <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
                {t("noRooms")}
              </div>
            ) : filteredRooms.length === 0 ? (
              <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                {t("noResults")}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {filteredRooms.map((r) => {
                  const activeGuest = activeGuestByRoom.get(r.id);
                  const isAvail = r.status === "available";
                  const isOccup = r.status === "occupied";
                  const days = activeGuest ? getDaysStaying(activeGuest.checkIn, activeGuest.checkOut) : 0;
                  const cardBorder = isAvail ? "border-emerald-200 bg-emerald-50/50 dark:border-emerald-800/50 dark:bg-emerald-950/10"
                    : isOccup ? "border-amber-200 bg-amber-50/50 dark:border-amber-800/50 dark:bg-amber-950/10"
                    : "border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/20";
                  const badge = isAvail
                    ? { label: t("roomAvailable"), cls: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300" }
                    : isOccup
                    ? { label: t("roomOccupied"), cls: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300" }
                    : { label: t("roomMaintenance"), cls: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400" };
                  return (
                    <div key={r.id} className={`rounded-xl border-2 p-3.5 flex flex-col gap-2 ${cardBorder}`}>
                      {/* Room number + status */}
                      <div className="flex items-start justify-between gap-1">
                        <span className="text-2xl font-bold leading-none tracking-tight">{r.number}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold shrink-0 ${badge.cls}`}>{badge.label}</span>
                      </div>

                      {/* Price */}
                      <div className="text-xs text-muted-foreground font-mono space-y-0.5">
                        {r.pricePerNight != null && <div>{r.pricePerNight.toLocaleString()}<span className="opacity-60">{t("perNight")}</span></div>}
                        {r.pricePerMonth != null && <div>{r.pricePerMonth.toLocaleString()}<span className="opacity-60">{t("perMonth")}</span></div>}
                        {r.notes && <p className="italic truncate not-italic opacity-70 font-sans">{r.notes}</p>}
                      </div>

                      {/* Guest info (occupied) */}
                      {isOccup && activeGuest && (
                        <div className="text-xs space-y-0.5 pt-2 border-t border-amber-200/60 dark:border-amber-800/40">
                          <p className="font-semibold truncate">{activeGuest.name || getCustomerName(activeGuest.customerId)}</p>
                          <p className="text-muted-foreground">
                            {new Date(activeGuest.checkIn).toLocaleDateString()} →{" "}
                            {activeGuest.checkOut ? new Date(activeGuest.checkOut).toLocaleDateString() : t("openEnded")}
                          </p>
                          <p className="font-medium text-amber-700 dark:text-amber-400">{days} {t("nights")}</p>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex flex-wrap gap-1 mt-auto pt-2 border-t border-current/10">
                        {isAvail && (
                          <Button
                            size="sm"
                            className="h-7 px-2 text-xs flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                            onClick={() => openCheckInForRoom(r.id)}
                          >
                            + {t("checkIn")}
                          </Button>
                        )}
                        {isOccup && activeGuest && (
                          <>
                            <Button
                              size="sm" variant="outline" className="h-7 px-2"
                              onClick={() => {
                                setEditingGuest(activeGuest);
                                setEditingGuestData({
                                  name: activeGuest.name || "",
                                  customerId: activeGuest.customerId || "",
                                  checkIn: activeGuest.checkIn.split("T")[0],
                                  checkOut: activeGuest.checkOut ? activeGuest.checkOut.split("T")[0] : "",
                                  adults: String(activeGuest.adults),
                                  children: String(activeGuest.children),
                                  notes: activeGuest.notes || "",
                                  agreedPrice: activeGuest.agreedPrice !== null && activeGuest.agreedPrice !== undefined ? formatWithDots(String(activeGuest.agreedPrice)) : "",
                                });
                              }}
                            >✏️</Button>
                            <Button
                              size="sm" variant="outline"
                              className="h-7 px-2 text-xs flex-1 border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400"
                              onClick={() => setConfirmCheckOutGuest(activeGuest)}
                              disabled={checkingOutId === activeGuest.id}
                            >
                              {checkingOutId === activeGuest.id ? "..." : `✓ ${t("checkOut")}`}
                            </Button>
                          </>
                        )}
                        {!isOccup && (
                          <div className="flex gap-1 ml-auto">
                            {r.status === "maintenance" && (
                              <Button
                                size="sm" variant="outline"
                                className="h-7 px-2 text-xs"
                                onClick={() => handleRoomStatusChange(r.id, "available")}
                              >
                                {t("markAvailable")}
                              </Button>
                            )}
                            <Button
                              size="sm" variant="ghost" className="h-7 px-2"
                              onClick={() => {
                                setEditingRoom(r);
                                setEditingRoomData({
                                  number: r.number,
                                  priceType: r.pricePerMonth ? "month" : "night",
                                  price: r.pricePerMonth ? formatWithDots(String(r.pricePerMonth)) : r.pricePerNight ? formatWithDots(String(r.pricePerNight)) : "",
                                  notes: r.notes || "",
                                });
                              }}
                            >✏️</Button>
                            <Button
                              size="sm" variant="ghost"
                              className="h-7 px-2 text-destructive hover:text-destructive"
                              onClick={() => handleDeleteRoom(r.id)}
                            >🗑️</Button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      ) : (
        /* Non-hotel/apartment: Customer List only */
        <div className="space-y-3">
          <div className="flex justify-end">
            <Button onClick={() => setShowAddCustomer(true)}>+ {t("newCustomer")}</Button>
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
              isUpdatingCustomer={isUpdatingCustomer}
              t={t as (key: string) => string}
            />
          )}
        </div>
      )}

      {/* ── Add Customer Dialog ── */}
      <Dialog open={showAddCustomer} onOpenChange={setShowAddCustomer}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>+ {t("newCustomer")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-1">
            <FloatLabelInput
              label={`${t("customerName")} *`}
              value={newCustomer.name}
              onChange={(e) => setNewCustomer((f) => ({ ...f, name: e.target.value }))}
              autoFocus
            />
            <div className="grid grid-cols-2 gap-3">
              <FloatLabelInput
                label={t("phone")}
                value={newCustomer.phone}
                onChange={(e) => setNewCustomer((f) => ({ ...f, phone: e.target.value }))}
              />
              <FloatLabelInput
                label={t("email")}
                type="email"
                value={newCustomer.email}
                onChange={(e) => setNewCustomer((f) => ({ ...f, email: e.target.value }))}
              />
            </div>
            <FloatLabelInput
              label={t("supplierCompany")}
              value={newCustomer.address}
              onChange={(e) => setNewCustomer((f) => ({ ...f, address: e.target.value }))}
            />
            <FloatLabelInput
              label={t("notes")}
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
            {/* Guest name */}
            <div>
              <label className="text-xs font-medium mb-1 block">{t("guestName")} *</label>
              <Input
                placeholder={t("guestName")}
                value={newGuest.name}
                onChange={(e) => setNewGuest((f) => ({ ...f, name: e.target.value }))}
                autoFocus
              />
            </div>
            {/* Room selector */}
            <div>
              <label className="text-xs font-medium mb-1 block">{t("selectRoom")} *</label>
              <Select
                value={newGuest.roomId || "none"}
                onValueChange={(v) => {
                  if (v === "none") setNewGuest((f) => ({ ...f, roomId: "", agreedPrice: "", checkOut: "" }));
                  else handleNewGuestRoomChange(v);
                }}
              >
                <SelectTrigger className={!newGuest.roomId ? "border-destructive/50" : ""}>
                  <SelectValue placeholder={t("selectRoom")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t("selectRoom")}</SelectItem>
                  {availableRooms.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {t("room")} {r.number}
                      {r.pricePerNight ? ` — ${r.pricePerNight.toLocaleString()}${t("perNight")}` : ""}
                      {r.pricePerMonth ? ` — ${r.pricePerMonth.toLocaleString()}${t("perMonth")}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {availableRooms.length === 0 && (
                <p className="text-xs text-muted-foreground mt-1">{t("roomOccupied")} — {t("noRooms")}</p>
              )}
            </div>
            {/* Agreed price */}
            <div>
              <label className="text-xs font-medium mb-1 block">
                {t("agreedPrice")} ({location?.currency || "VND"})
                {newGuest.roomId && (
                  <span className="text-muted-foreground ml-1">
                    {roomPriceTypeMap.get(newGuest.roomId) === "month" ? t("perMonth") : t("perNight")}
                  </span>
                )}
              </label>
              <Input
                type="text"
                inputMode="numeric"
                placeholder="0"
                value={newGuest.agreedPrice}
                onChange={(e) => setNewGuest((f) => ({ ...f, agreedPrice: formatWithDots(e.target.value) }))}
              />
            </div>
            {/* Check-in / Check-out */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium mb-1 block">{t("checkIn")} *</label>
                <Input
                  type="date"
                  value={newGuest.checkIn}
                  min={new Date().toISOString().split("T")[0]}
                  onChange={(e) => setNewGuest((f) => ({ ...f, checkIn: e.target.value, checkOut: "" }))}
                  required
                />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block">{t("checkOut")}</label>
                <Input
                  type="date"
                  value={newGuest.checkOut}
                  min={newGuestMinCheckout || new Date().toISOString().split("T")[0]}
                  onChange={(e) => setNewGuest((f) => ({ ...f, checkOut: e.target.value }))}
                />
                {newGuest.roomId && rooms.find((r) => r.id === newGuest.roomId)?.pricePerMonth && (
                  <p className="text-xs text-muted-foreground mt-0.5">{t("minOneMonth")}</p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium mb-1 block">{t("adults")}</label>
                <Input
                  type="number" min="1"
                  value={newGuest.adults}
                  onChange={(e) => setNewGuest((f) => ({ ...f, adults: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block">{t("children")}</label>
                <Input
                  type="number" min="0"
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
              <Button onClick={handleAddGuest} disabled={isGuestSubmitting || !newGuest.name.trim() || !newGuest.checkIn || !newGuest.roomId}>
                {isGuestSubmitting ? t("submitting") : t("newGuest")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Edit Guest Dialog ── */}
      <Dialog open={!!editingGuest} onOpenChange={(open) => { if (!open) setEditingGuest(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>✏️ {t("editGuest")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-1">
            {/* Guest name */}
            <div>
              <label className="text-xs font-medium mb-1 block">{t("guestName")} *</label>
              <Input
                placeholder={t("guestName")}
                value={editingGuestData.name}
                onChange={(e) => setEditingGuestData((f) => ({ ...f, name: e.target.value }))}
                autoFocus
              />
            </div>
            {/* Agreed price */}
            <div>
              <label className="text-xs font-medium mb-1 block">
                {t("agreedPrice")} ({location?.currency || "VND"})
                {editingGuest?.roomId && (
                  <span className="text-muted-foreground ml-1">
                    {roomPriceTypeMap.get(editingGuest.roomId) === "month" ? t("perMonth") : t("perNight")}
                  </span>
                )}
              </label>
              <Input
                type="text"
                inputMode="numeric"
                placeholder="0"
                value={editingGuestData.agreedPrice}
                onChange={(e) => setEditingGuestData((f) => ({ ...f, agreedPrice: formatWithDots(e.target.value) }))}
              />
            </div>
            {/* Check-in / Check-out */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium mb-1 block">{t("checkIn")} *</label>
                <Input
                  type="date"
                  value={editingGuestData.checkIn}
                  onChange={(e) => setEditingGuestData((f) => ({ ...f, checkIn: e.target.value, checkOut: "" }))}
                />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block">{t("checkOut")}</label>
                <Input
                  type="date"
                  value={editingGuestData.checkOut}
                  min={editMinCheckout || undefined}
                  onChange={(e) => setEditingGuestData((f) => ({ ...f, checkOut: e.target.value }))}
                />
                {editingGuest?.roomId && rooms.find((r) => r.id === editingGuest.roomId)?.pricePerMonth && (
                  <p className="text-xs text-muted-foreground mt-0.5">{t("minOneMonth")}</p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium mb-1 block">{t("adults")}</label>
                <Input
                  type="number" min="1"
                  value={editingGuestData.adults}
                  onChange={(e) => setEditingGuestData((f) => ({ ...f, adults: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block">{t("children")}</label>
                <Input
                  type="number" min="0"
                  value={editingGuestData.children}
                  onChange={(e) => setEditingGuestData((f) => ({ ...f, children: e.target.value }))}
                />
              </div>
            </div>
            <Input
              placeholder={t("notes")}
              value={editingGuestData.notes}
              onChange={(e) => setEditingGuestData((f) => ({ ...f, notes: e.target.value }))}
            />
            <div className="flex gap-2 justify-end pt-1">
              <Button variant="outline" onClick={() => setEditingGuest(null)} disabled={isUpdatingGuest}>✕</Button>
              <Button onClick={handleUpdateGuest} disabled={isUpdatingGuest || !editingGuestData.name.trim() || !editingGuestData.checkIn}>
                {isUpdatingGuest ? t("submitting") : t("saveChanges")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Edit Room Dialog ── */}
      <Dialog open={!!editingRoom} onOpenChange={(open) => { if (!open) setEditingRoom(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>✏️ {t("editRoom")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-1">
            <FloatLabelInput
              label={`${t("roomNumber")} *`}
              value={editingRoomData.number}
              onChange={(e) => setEditingRoomData((f) => ({ ...f, number: e.target.value }))}
              autoFocus
            />
            <div className="flex gap-2 w-full">
              <FloatLabelInput
                label={t("price")}
                type="text"
                inputMode="numeric"
                value={editingRoomData.price}
                onChange={(e) => setEditingRoomData((f) => ({ ...f, price: formatWithDots(e.target.value) }))}
                className="flex-1"
              />
              <Select
                value={editingRoomData.priceType}
                onValueChange={(v) => setEditingRoomData((f) => ({ ...f, priceType: v as "night" | "month" }))}
              >
                <SelectTrigger className="h-12 w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="night">{t("roomPricePerNight")}</SelectItem>
                  <SelectItem value="month">{t("roomPricePerMonth")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <FloatLabelInput
              label={t("notes")}
              value={editingRoomData.notes}
              onChange={(e) => setEditingRoomData((f) => ({ ...f, notes: e.target.value }))}
            />
            <div className="flex items-center gap-2 pt-1">
              {editingRoom?.status === "available" && (
                <Button
                  variant="outline"
                  className="text-slate-600 border-slate-300 hover:bg-slate-50 dark:text-slate-400 dark:border-slate-600"
                  onClick={() => { handleRoomStatusChange(editingRoom.id, "maintenance"); setEditingRoom(null); }}
                  disabled={isUpdatingRoom}
                >
                  {t("setMaintenance")}
                </Button>
              )}
              {editingRoom?.status === "maintenance" && (
                <Button
                  variant="outline"
                  onClick={() => { handleRoomStatusChange(editingRoom.id, "available"); setEditingRoom(null); }}
                  disabled={isUpdatingRoom}
                >
                  {t("markAvailable")}
                </Button>
              )}
              <div className="flex gap-2 ml-auto">
                <Button variant="outline" onClick={() => setEditingRoom(null)} disabled={isUpdatingRoom}>✕</Button>
                <Button onClick={handleUpdateRoom} disabled={isUpdatingRoom || !editingRoomData.number.trim()}>
                  {isUpdatingRoom ? t("submitting") : t("saveChanges")}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Confirm Check-Out Dialog ── */}
      <Dialog open={!!confirmCheckOutGuest} onOpenChange={(open) => { if (!open) setConfirmCheckOutGuest(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>✓ {t("checkOut")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-1">
            <p className="text-sm text-muted-foreground">
              {t("confirmCheckout")}{" "}
              <span className="font-semibold text-foreground">
                {confirmCheckOutGuest?.name || getCustomerName(confirmCheckOutGuest?.customerId ?? null)}
              </span>
              {confirmCheckOutGuest?.roomNumber && (
                <span> — {t("room")} {confirmCheckOutGuest.roomNumber}</span>
              )}
              ?
            </p>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setConfirmCheckOutGuest(null)}
                disabled={checkingOutId === confirmCheckOutGuest?.id}
              >
                {t("cancel")}
              </Button>
              <Button
                className="bg-amber-500 hover:bg-amber-600 text-white"
                disabled={checkingOutId === confirmCheckOutGuest?.id}
                onClick={async () => {
                  if (!confirmCheckOutGuest) return;
                  await handleGuestCheckOut(confirmCheckOutGuest);
                  setConfirmCheckOutGuest(null);
                }}
              >
                {checkingOutId === confirmCheckOutGuest?.id ? "..." : `✓ ${t("checkOut")}`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Add Room Dialog ── */}
      <Dialog open={showAddRoom} onOpenChange={setShowAddRoom}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>+ {t("addRoom")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-1">
            <FloatLabelInput
              label={`${t("roomNumber")} *`}
              value={newRoom.number}
              onChange={(e) => setNewRoom((f) => ({ ...f, number: e.target.value }))}
              autoFocus
            />
            <div className="flex gap-2 w-full">
              <FloatLabelInput
                label={t("price")}
                type="text"
                inputMode="numeric"
                value={newRoom.price}
                onChange={(e) => setNewRoom((f) => ({ ...f, price: formatWithDots(e.target.value) }))}
                className="flex-1"
              />
              <Select
                value={newRoom.priceType}
                onValueChange={(v) => setNewRoom((f) => ({ ...f, priceType: v as "night" | "month" }))}
              >
                <SelectTrigger className="h-12 w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="night">{t("roomPricePerNight")}</SelectItem>
                  <SelectItem value="month">{t("roomPricePerMonth")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <FloatLabelInput
              label={t("notes")}
              value={newRoom.notes}
              onChange={(e) => setNewRoom((f) => ({ ...f, notes: e.target.value }))}
            />
            <div className="flex gap-2 justify-end pt-1">
              <Button variant="outline" onClick={() => setShowAddRoom(false)}>✕</Button>
              <Button onClick={handleAddRoom} disabled={isRoomSubmitting || !newRoom.number.trim()}>
                {isRoomSubmitting ? t("submitting") : t("addRoom")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
