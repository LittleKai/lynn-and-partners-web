"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import axiosInstance from "@/utils/axiosInstance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Users } from "lucide-react";

const ALL_PERMISSIONS = [
  "MANAGE_PRODUCTS",
  "MANAGE_CATEGORIES",
  "MANAGE_SUPPLIERS",
  "IMPORT_STOCK",
  "EXPORT_STOCK",
  "MANAGE_EXPENSES",
  "VIEW_REPORTS",
] as const;

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

interface UsersTabProps {
  branchId: string;
}

export function UsersTab({ branchId }: UsersTabProps) {
  const t = useTranslations("admin");
  const { toast } = useToast();

  const [users, setUsers] = useState<User[]>([]);
  const [accessMap, setAccessMap] = useState<Record<string, string[]>>({});
  const [addedUserIds, setAddedUserIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);

  // Add user dialog
  const [showAddUser, setShowAddUser] = useState(false);
  const [addUserSearch, setAddUserSearch] = useState("");

  useEffect(() => {
    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const usersRes = await axiosInstance.get("/admin/users");
      const allUsers: User[] = usersRes.data.users;
      setUsers(allUsers);

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
        const record = access.find((a: AccessRecord) => a.locationId === branchId);
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

  const selectAll = (userId: string) => {
    setAccessMap((prev) => ({ ...prev, [userId]: [...ALL_PERMISSIONS] }));
  };

  const selectNone = (userId: string) => {
    setAccessMap((prev) => ({ ...prev, [userId]: [] }));
  };

  const saveUserAccess = async (userId: string) => {
    setSavingUserId(userId);
    try {
      const currentRes = await axiosInstance.get(`/admin/users/${userId}/access`);
      const existing: AccessRecord[] = currentRes.data.access;
      const otherLocations = existing.filter((a) => a.locationId !== branchId);
      const thisAccess = { locationId: branchId, permissions: accessMap[userId] || [] };
      await axiosInstance.put(`/admin/users/${userId}/access`, {
        access: [...otherLocations, thisAccess],
      });
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
      const otherLocations = existing.filter((a) => a.locationId !== branchId);
      await axiosInstance.put(`/admin/users/${userId}/access`, {
        access: otherLocations,
      });
      setAddedUserIds((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
      setAccessMap((prev) => ({ ...prev, [userId]: [] }));
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

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold">{t("userAccess")}</h2>
            <p className="text-sm text-muted-foreground">
              {addedUsers.length > 0
                ? `${addedUsers.length} ${addedUsers.length > 1 ? "users have" : "user has"} access to this branch`
                : t("noAddedUsers")}
            </p>
          </div>
          <Button onClick={() => { setAddUserSearch(""); setShowAddUser(true); }}>
            + {t("addUserToLocation")}
          </Button>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">{t("loading")}</p>
        ) : addedUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
            <Users className="h-10 w-10 opacity-30" />
            <p className="text-sm">{t("noAddedUsers")}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {addedUsers.map((u) => {
              const perms = accessMap[u.id] || [];
              const allSelected = ALL_PERMISSIONS.every((p) => perms.includes(p));
              const noneSelected = perms.length === 0;
              return (
                <div key={u.id} className="rounded-xl border bg-card p-5 space-y-4">
                  {/* Header row */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
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

                  {/* Quick select row */}
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>Quick select:</span>
                    <button
                      type="button"
                      className={`underline underline-offset-2 hover:text-foreground transition-colors ${allSelected ? "text-foreground font-medium" : ""}`}
                      onClick={() => selectAll(u.id)}
                    >
                      All
                    </button>
                    <button
                      type="button"
                      className={`underline underline-offset-2 hover:text-foreground transition-colors ${noneSelected ? "text-foreground font-medium" : ""}`}
                      onClick={() => selectNone(u.id)}
                    >
                      None
                    </button>
                  </div>

                  {/* Permissions grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-y-2 gap-x-4">
                    {ALL_PERMISSIONS.map((perm) => (
                      <label
                        key={perm}
                        className="flex items-center gap-2 text-sm cursor-pointer select-none"
                      >
                        <Checkbox
                          checked={perms.includes(perm)}
                          onCheckedChange={() => togglePermission(u.id, perm)}
                        />
                        <span>{t(`permissions.${perm}` as Parameters<typeof t>[0])}</span>
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

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
    </>
  );
}
