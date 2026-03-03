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
  locationId: string;
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
  locationId,
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
  const [editingGuest, setEditingGuest] = useState<Guest | null>(null);
  const [editingGuestData, setEditingGuestData] = useState({ name: "", customerId: "", checkIn: "", checkOut: "", adults: "1", children: "0", notes: "", agreedPrice: "" });

  // ── Room state ─────────────────────────────────────────────────────
  const [showAddRoom, setShowAddRoom] = useState(false);
  const [newRoom, setNewRoom] = useState({ number: "", priceType: "night" as "night" | "month", price: "", notes: "" });
  const [isRoomSubmitting, setIsRoomSubmitting] = useState(false);
  const [isUpdatingRoom, setIsUpdatingRoom] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [editingRoomData, setEditingRoomData] = useState({ number: "", priceType: "night" as "night" | "month", price: "", notes: "" });

  // ── Computed ──────────────────────────────────────────────────────
  // Map roomId → active guest display name, used to show current occupant in Rooms tab
  const occupiedByMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const g of guests) {
      if (g.status === "active" && g.roomId) {
        map.set(g.roomId, g.name || getCustomerName(g.customerId));
      }
    }
    return map;
  }, [guests, getCustomerName]);

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
        .put(`/locations/${locationId}/rooms/${r.id}`, { status: "available" })
        .then(() =>
          setRooms((prev) => prev.map((room) => room.id === r.id ? { ...room, status: "available" } : room))
        )
        .catch(() => { /* silent */ });
    }
  }, [guests, locationId, rooms, setRooms]);

  // Min checkout date for Add Guest dialog (monthly rooms require min 1 month)
  const newGuestMinCheckout = useMemo(() => {
    if (!newGuest.checkIn || !newGuest.roomId) return newGuest.checkIn || "";
    const room = rooms.find((r) => r.id === newGuest.roomId);
    if (room?.pricePerMonth) {
      const d = new Date(newGuest.checkIn);
      d.setMonth(d.getMonth() + 1);
      return d.toISOString().split("T")[0];
    }
    return newGuest.checkIn;
  }, [newGuest.checkIn, newGuest.roomId, rooms]);

  // Min checkout date for Edit Guest dialog
  const editMinCheckout = useMemo(() => {
    if (!editingGuestData.checkIn || !editingGuest?.roomId) return editingGuestData.checkIn || "";
    const room = rooms.find((r) => r.id === editingGuest.roomId);
    if (room?.pricePerMonth) {
      const d = new Date(editingGuestData.checkIn);
      d.setMonth(d.getMonth() + 1);
      return d.toISOString().split("T")[0];
    }
    return editingGuestData.checkIn;
  }, [editingGuestData.checkIn, editingGuest, rooms]);

  const filteredCustomers = useMemo(() => {
    if (!customerSearch) return customers;
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
        (c.phone && c.phone.includes(customerSearch))
    );
  }, [customers, customerSearch]);

  // ── Customer CRUD ─────────────────────────────────────────────────
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
    setIsUpdatingCustomer(true);
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
    } finally {
      setIsUpdatingCustomer(false);
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
      const res = await axiosInstance.post(`/locations/${locationId}/guests`, {
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
      const e = err as { response?: { data?: { error?: string } } };
      toast({ title: e.response?.data?.error || t("importFailed"), variant: "destructive" });
    } finally {
      setIsGuestSubmitting(false);
    }
  };

  const handleGuestCheckOut = async (guest: Guest) => {
    setCheckingOutId(guest.id);
    const today = new Date().toISOString().split("T")[0];
    try {
      const res = await axiosInstance.put(`/locations/${locationId}/guests`, {
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
      await axiosInstance.delete(`/locations/${locationId}/guests?guestId=${id}`);
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
      const res = await axiosInstance.put(`/locations/${locationId}/guests`, {
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
      const e = err as { response?: { data?: { error?: string } } };
      toast({ title: e.response?.data?.error || t("importFailed"), variant: "destructive" });
    } finally {
      setIsUpdatingGuest(false);
    }
  };

  // ── Room CRUD ──────────────────────────────────────────────────────
  const handleAddRoom = async () => {
    if (!newRoom.number.trim()) return;
    setIsRoomSubmitting(true);
    try {
      const res = await axiosInstance.post(`/locations/${locationId}/rooms`, {
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
      const e = err as { response?: { data?: { error?: string } } };
      const msg = e.response?.data?.error;
      toast({ title: msg === "Room number already exists" ? t("roomDuplicate") : t("roomAddFailed"), variant: "destructive" });
    } finally {
      setIsRoomSubmitting(false);
    }
  };

  const handleUpdateRoom = async () => {
    if (!editingRoom || !editingRoomData.number.trim()) return;
    setIsUpdatingRoom(true);
    try {
      const res = await axiosInstance.put(`/locations/${locationId}/rooms/${editingRoom.id}`, {
        number: editingRoomData.number.trim(),
        pricePerNight: editingRoomData.priceType === "night" ? (editingRoomData.price ? Number(parseDots(editingRoomData.price)) : null) : null,
        pricePerMonth: editingRoomData.priceType === "month" ? (editingRoomData.price ? Number(parseDots(editingRoomData.price)) : null) : null,
        notes: editingRoomData.notes || null,
      });
      setRooms((prev) => prev.map((r) => r.id === editingRoom.id ? res.data.room : r));
      setEditingRoom(null);
      toast({ title: t("roomUpdated") });
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      const msg = e.response?.data?.error;
      toast({ title: msg === "Room number already exists" ? t("roomDuplicate") : t("roomAddFailed"), variant: "destructive" });
    } finally {
      setIsUpdatingRoom(false);
    }
  };

  const handleRoomStatusChange = async (roomId: string, status: string) => {
    try {
      const res = await axiosInstance.put(`/locations/${locationId}/rooms/${roomId}`, { status });
      setRooms((prev) => prev.map((r) => r.id === roomId ? res.data.room : r));
    } catch {
      toast({ title: t("roomAddFailed"), variant: "destructive" });
    }
  };

  const handleDeleteRoom = async (roomId: string) => {
    if (!confirm(t("confirmDelete"))) return;
    try {
      await axiosInstance.delete(`/locations/${locationId}/rooms/${roomId}`);
      setRooms((prev) => prev.filter((r) => r.id !== roomId));
      toast({ title: t("roomDeleted") });
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      const msg = e.response?.data?.error;
      toast({ title: msg?.includes("occupied") ? t("roomDeleteFailed") : t("roomAddFailed"), variant: "destructive" });
    }
  };

  return (
    <>
      {isHotel ? (
        /* hotel/apartment: Guests + Rooms only */
        <Tabs defaultValue="guests">
          <TabsList>
            <TabsTrigger value="guests">{t("guests")} ({guests.length})</TabsTrigger>
            <TabsTrigger value="rooms">{t("rooms")} ({rooms.length})</TabsTrigger>
          </TabsList>

          {/* Guests sub-tab */}
          <TabsContent value="guests" className="mt-4 space-y-3">
            <div className="flex justify-end">
              <Button onClick={() => setShowAddGuest(true)}>+ {t("newGuest")}</Button>
            </div>
            {guests.length === 0 ? (
              <p className="text-muted-foreground text-sm">{t("noGuests")}</p>
            ) : (
              <div className="rounded-xl border overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium">{t("guestName")}</th>
                      <th className="px-4 py-3 text-left font-medium">{t("roomNumber")}</th>
                      <th className="px-4 py-3 text-left font-medium">{t("checkIn")}</th>
                      <th className="px-4 py-3 text-left font-medium">{t("checkOut")}</th>
                      <th className="px-4 py-3 text-center font-medium">{t("adults")}/{t("children")}</th>
                      <th className="px-4 py-3 text-right font-medium">{t("agreedPrice")}</th>
                      <th className="px-4 py-3 text-left font-medium">{t("status")}</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {guests.map((g) => (
                      <tr key={g.id} className="border-t hover:bg-muted/50">
                        <td className="px-4 py-3 font-medium">
                          <div>{g.name || getCustomerName(g.customerId)}</div>
                          {g.notes && <div className="text-xs text-muted-foreground mt-0.5 italic">{g.notes}</div>}
                        </td>
                        <td className="px-4 py-3">{g.roomNumber || "—"}</td>
                        <td className="px-4 py-3 whitespace-nowrap">{new Date(g.checkIn).toLocaleDateString()}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {g.checkOut ? new Date(g.checkOut).toLocaleDateString() : "—"}
                        </td>
                        <td className="px-4 py-3 text-center text-muted-foreground">
                          {g.adults}/{g.children}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-muted-foreground text-xs">
                          {g.agreedPrice != null
                            ? `${g.agreedPrice.toLocaleString()}${roomPriceTypeMap.get(g.roomId ?? "") === "month" ? "/tháng" : "/đêm"}`
                            : "—"}
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
                                variant="outline" size="sm" className="h-7 px-2 text-xs"
                                onClick={() => handleGuestCheckOut(g)}
                                disabled={checkingOutId === g.id}
                              >
                                {checkingOutId === g.id ? t("submitting") : t("checkOut")}
                              </Button>
                            )}
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
                              className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                              onClick={() => handleDeleteGuest(g.id)}
                            >🗑️</Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>

          {/* Rooms sub-tab */}
          <TabsContent value="rooms" className="mt-4 space-y-3">
            <div className="flex justify-end">
              <Button onClick={() => setShowAddRoom(true)}>+ {t("addRoom")}</Button>
            </div>
            {rooms.length === 0 ? (
              <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
                {t("noRooms")}
              </div>
            ) : (
              <div className="rounded-xl border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium">{t("roomNumber")}</th>
                      <th className="px-4 py-3 text-left font-medium">{t("roomStatus")}</th>
                      <th className="px-4 py-3 text-left font-medium">{t("currentGuest")}</th>
                      <th className="px-4 py-3 text-right font-medium">{t("price")} ({location?.currency})</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {rooms.map((r) => (
                      <tr key={r.id} className="border-t hover:bg-muted/50">
                        {editingRoom?.id === r.id ? (
                          <>
                            <td className="px-3 py-2">
                              <Input
                                value={editingRoomData.number}
                                onChange={(e) => setEditingRoomData((f) => ({ ...f, number: e.target.value }))}
                                className="h-8 w-24"
                                autoFocus
                              />
                            </td>
                            <td className="px-3 py-2">
                              <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                                r.status === "available" ? "bg-green-100 text-green-800" :
                                r.status === "occupied" ? "bg-orange-100 text-orange-800" :
                                "bg-muted text-muted-foreground"
                              }`}>
                                {t(`room${r.status.charAt(0).toUpperCase() + r.status.slice(1)}` as Parameters<typeof t>[0])}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-sm text-muted-foreground">
                              {occupiedByMap.get(r.id) || "—"}
                            </td>
                            <td className="px-3 py-2">
                              <div className="flex gap-1 justify-end">
                                <Input
                                  type="text"
                                  inputMode="numeric"
                                  value={editingRoomData.price}
                                  onChange={(e) => setEditingRoomData((f) => ({ ...f, price: formatWithDots(e.target.value) }))}
                                  className="h-8 w-28 text-right text-xs"
                                  placeholder="0"
                                />
                                <Select
                                  value={editingRoomData.priceType}
                                  onValueChange={(v) => setEditingRoomData((f) => ({ ...f, priceType: v as "night" | "month" }))}
                                >
                                  <SelectTrigger className="h-8 w-[90px] text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="night">/đêm</SelectItem>
                                    <SelectItem value="month">/tháng</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </td>
                            <td className="px-3 py-2">
                              <div className="flex gap-1 justify-end">
                                <Button size="sm" className="h-7 px-2" onClick={handleUpdateRoom} disabled={isUpdatingRoom || !editingRoomData.number.trim()}>
                                  {isUpdatingRoom ? "..." : "✓"}
                                </Button>
                                <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setEditingRoom(null)} disabled={isUpdatingRoom}>✕</Button>
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-4 py-3 font-medium">
                              <div>{r.number}</div>
                              {r.notes && <div className="text-xs text-muted-foreground mt-0.5 italic font-normal">{r.notes}</div>}
                            </td>
                            <td className="px-4 py-3">
                              {r.status === "occupied" ? (
                                <span className="text-xs px-2 py-1 rounded-full font-medium text-orange-700 bg-orange-50">
                                  {t("roomOccupied")}
                                </span>
                              ) : (
                                <Select
                                  value={r.status}
                                  onValueChange={(v) => handleRoomStatusChange(r.id, v)}
                                >
                                  <SelectTrigger className={`h-7 w-32 text-xs border-0 px-2 font-medium ${
                                    r.status === "available" ? "text-green-700 bg-green-50" :
                                    "text-muted-foreground bg-muted"
                                  }`}>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="available">{t("roomAvailable")}</SelectItem>
                                    <SelectItem value="maintenance">{t("roomMaintenance")}</SelectItem>
                                  </SelectContent>
                                </Select>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm text-muted-foreground">
                              {occupiedByMap.get(r.id) || "—"}
                            </td>
                            <td className="px-4 py-3 text-right font-mono text-muted-foreground text-xs">
                              {r.pricePerNight ? (
                                <div>{r.pricePerNight.toLocaleString()} <span className="text-muted-foreground/60">/đêm</span></div>
                              ) : null}
                              {r.pricePerMonth ? (
                                <div>{r.pricePerMonth.toLocaleString()} <span className="text-muted-foreground/60">/tháng</span></div>
                              ) : null}
                              {!r.pricePerNight && !r.pricePerMonth ? "—" : null}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex gap-1 justify-end">
                                <Button
                                  variant="ghost" size="sm" className="h-7 px-2"
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
                                  variant="ghost" size="sm"
                                  className="h-7 px-2 text-destructive hover:text-destructive"
                                  onClick={() => handleDeleteRoom(r.id)}
                                  disabled={r.status === "occupied"}
                                >🗑️</Button>
                              </div>
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
                      {r.pricePerNight ? ` — ${r.pricePerNight.toLocaleString()}/đêm` : ""}
                      {r.pricePerMonth ? ` — ${r.pricePerMonth.toLocaleString()}/tháng` : ""}
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
                    {roomPriceTypeMap.get(newGuest.roomId) === "month" ? "/tháng" : "/đêm"}
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
                {newGuestMinCheckout && newGuestMinCheckout !== newGuest.checkIn && (
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
                    {roomPriceTypeMap.get(editingGuest.roomId) === "month" ? "/tháng" : "/đêm"}
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
                {editMinCheckout && editMinCheckout !== editingGuestData.checkIn && (
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
