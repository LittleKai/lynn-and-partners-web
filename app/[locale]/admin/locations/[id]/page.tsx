"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import axiosInstance from "@/utils/axiosInstance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const ALL_PERMISSIONS = [
  "MANAGE_PRODUCTS",
  "MANAGE_CATEGORIES",
  "MANAGE_SUPPLIERS",
  "IMPORT_STOCK",
  "EXPORT_STOCK",
  "MANAGE_EXPENSES",
  "VIEW_REPORTS",
];

interface Location {
  id: string;
  name: string;
  type: string;
  description: string | null;
  address: string | null;
}

interface User {
  id: string;
  username: string;
  name: string;
}

interface AccessRecord {
  userId: string;
  locationId: string;
  permissions: string[];
}

export default function LocationDetailPage() {
  const params = useParams<{ id: string }>();
  const locationId = params?.id || "";
  const t = useTranslations("admin");
  const { toast } = useToast();

  const [location, setLocation] = useState<Location | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [accessMap, setAccessMap] = useState<Record<string, string[]>>({});
  // tracks which users have been added to this branch (have a record)
  const [addedUserIds, setAddedUserIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);

  // Add user dialog
  const [showAddUser, setShowAddUser] = useState(false);
  const [addUserSearch, setAddUserSearch] = useState("");

  useEffect(() => {
    loadData();
  }, [locationId]);

  const loadData = async () => {
    try {
      const [locRes, usersRes] = await Promise.all([
        axiosInstance.get(`/admin/locations/${locationId}`),
        axiosInstance.get("/admin/users"),
      ]);
      setLocation(locRes.data.location);
      const allUsers: User[] = usersRes.data.users;
      setUsers(allUsers);

      // Load each user's access to find who has been added to this location
      const accessResults = await Promise.all(
        allUsers.map((u) =>
          axiosInstance
            .get(`/admin/users/${u.id}/access`)
            .then((r: { data: { access: AccessRecord[] } }) => ({ userId: u.id, access: r.data.access }))
            .catch(() => ({ userId: u.id, access: [] as AccessRecord[] }))
        )
      );

      const map: Record<string, string[]> = {};
      const added = new Set<string>();
      accessResults.forEach(({ userId, access }) => {
        const record = access.find((a: AccessRecord) => a.locationId === locationId);
        if (record) {
          map[userId] = record.permissions;
          added.add(userId);
        } else {
          map[userId] = [];
        }
      });
      setAccessMap(map);
      setAddedUserIds(added);
    } catch {
      toast({ title: t("loadFailed"), variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const togglePermission = (userId: string, perm: string) => {
    setAccessMap((prev) => {
      const current = prev[userId] || [];
      const updated = current.includes(perm)
        ? current.filter((p) => p !== perm)
        : [...current, perm];
      return { ...prev, [userId]: updated };
    });
  };

  const saveUserAccess = async (userId: string) => {
    setSavingUserId(userId);
    try {
      const currentRes = await axiosInstance.get(`/admin/users/${userId}/access`);
      const existing: AccessRecord[] = currentRes.data.access;
      const otherLocations = existing.filter((a) => a.locationId !== locationId);
      const thisAccess = { locationId, permissions: accessMap[userId] || [] };
      await axiosInstance.put(`/admin/users/${userId}/access`, {
        access: [...otherLocations, thisAccess],
      });
      // Mark as properly added in DB
      setAddedUserIds((prev) => new Set([...prev, userId]));
      toast({ title: t("accessSaved") });
    } catch {
      toast({ title: t("saveFailed"), variant: "destructive" });
    } finally {
      setSavingUserId(null);
    }
  };

  const handleRemoveUser = async (userId: string) => {
    setRemovingUserId(userId);
    try {
      const currentRes = await axiosInstance.get(`/admin/users/${userId}/access`);
      const existing: AccessRecord[] = currentRes.data.access;
      const otherLocations = existing.filter((a) => a.locationId !== locationId);
      await axiosInstance.put(`/admin/users/${userId}/access`, {
        access: otherLocations,
      });
      setAddedUserIds((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
      setAccessMap((prev) => {
        const next = { ...prev };
        next[userId] = [];
        return next;
      });
      toast({ title: t("userRemoved") });
    } catch {
      toast({ title: t("saveFailed"), variant: "destructive" });
    } finally {
      setRemovingUserId(null);
    }
  };

  const handleAddUser = (userId: string) => {
    setAddedUserIds((prev) => new Set([...prev, userId]));
    setAccessMap((prev) => ({ ...prev, [userId]: prev[userId] || [] }));
    setShowAddUser(false);
    setAddUserSearch("");
  };

  const addedUsers = users.filter((u) => addedUserIds.has(u.id));
  const availableUsers = users.filter(
    (u) =>
      !addedUserIds.has(u.id) &&
      (addUserSearch === "" ||
        u.name.toLowerCase().includes(addUserSearch.toLowerCase()) ||
        u.username.toLowerCase().includes(addUserSearch.toLowerCase()))
  );

  if (isLoading) return <p className="text-muted-foreground">{t("loading")}</p>;
  if (!location) return <p className="text-muted-foreground">{t("notFound")}</p>;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/locations">
          <Button variant="outline" size="sm" className="mb-3">← {t("back")}</Button>
        </Link>
        <h2 className="text-2xl font-bold">{location.name}</h2>
        <p className="text-muted-foreground capitalize">{location.type}</p>
        {location.address && (
          <p className="text-sm text-muted-foreground mt-1">
            📌 {location.address}
          </p>
        )}
      </div>

      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users">{t("userAccess")}</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4 mt-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {addedUsers.length > 0
                ? `${addedUsers.length} user${addedUsers.length > 1 ? "s" : ""} in this branch`
                : ""}
            </p>
            <Button onClick={() => { setAddUserSearch(""); setShowAddUser(true); }}>
              + {t("addUserToLocation")}
            </Button>
          </div>

          {/* User list */}
          {addedUsers.length === 0 ? (
            <div className="rounded-xl border border-dashed p-10 text-center text-muted-foreground text-sm">
              {t("noAddedUsers")}
            </div>
          ) : (
            addedUsers.map((u) => (
              <div key={u.id} className="rounded-xl border bg-card p-5 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">{u.name}</p>
                    <p className="text-sm text-muted-foreground font-mono">@{u.username}</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive border-destructive/30 hover:bg-destructive/10"
                      disabled={removingUserId === u.id}
                      onClick={() => handleRemoveUser(u.id)}
                    >
                      {removingUserId === u.id ? t("removing") : t("removeFromLocation")}
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => saveUserAccess(u.id)}
                      disabled={savingUserId === u.id}
                    >
                      {savingUserId === u.id ? t("saving") : t("save")}
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {ALL_PERMISSIONS.map((perm) => (
                    <label
                      key={perm}
                      className="flex items-center gap-2 text-sm cursor-pointer"
                    >
                      <Checkbox
                        checked={(accessMap[u.id] || []).includes(perm)}
                        onCheckedChange={() => togglePermission(u.id, perm)}
                      />
                      {t(`permissions.${perm}`) || perm}
                    </label>
                  ))}
                </div>
              </div>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* ── Add User Dialog ── */}
      <Dialog open={showAddUser} onOpenChange={setShowAddUser}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>+ {t("addUserToLocation")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-1">
            <Input
              placeholder={t("addUserSearch")}
              value={addUserSearch}
              onChange={(e) => setAddUserSearch(e.target.value)}
              autoFocus
            />
            <div className="max-h-72 overflow-y-auto rounded-xl border divide-y">
              {availableUsers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8 px-4">
                  {t("noUsersAvailable")}
                </p>
              ) : (
                availableUsers.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/60 transition-colors text-left"
                    onClick={() => handleAddUser(u.id)}
                  >
                    <div>
                      <p className="text-sm font-medium">{u.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">@{u.username}</p>
                    </div>
                    <span className="text-xs text-primary font-medium">+ Add</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
