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
  const [isLoading, setIsLoading] = useState(true);
  const [savingUserId, setSavingUserId] = useState<string | null>(null);

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
      setUsers(usersRes.data.users);

      // Load each user's access for this location
      const accessResults = await Promise.all(
        usersRes.data.users.map((u: User) =>
          axiosInstance
            .get(`/admin/users/${u.id}/access`)
            .then((r: { data: { access: AccessRecord[] } }) => ({ userId: u.id, access: r.data.access }))
            .catch(() => ({ userId: u.id, access: [] as AccessRecord[] }))
        )
      );

      const map: Record<string, string[]> = {};
      accessResults.forEach(({ userId, access }) => {
        const record = access.find((a: AccessRecord) => a.locationId === locationId);
        map[userId] = record?.permissions || [];
      });
      setAccessMap(map);
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
      // Get current full access list, replace this location's entry
      const currentRes = await axiosInstance.get(`/admin/users/${userId}/access`);
      const existing: AccessRecord[] = currentRes.data.access;
      const otherLocations = existing.filter((a) => a.locationId !== locationId);
      const thisAccess = { locationId, permissions: accessMap[userId] || [] };
      await axiosInstance.put(`/admin/users/${userId}/access`, {
        access: [...otherLocations, thisAccess],
      });
      toast({ title: t("accessSaved") });
    } catch {
      toast({ title: t("saveFailed"), variant: "destructive" });
    } finally {
      setSavingUserId(null);
    }
  };

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
          {users.length === 0 ? (
            <p className="text-muted-foreground">{t("noUsers")}</p>
          ) : (
            users.map((u) => (
              <div key={u.id} className="rounded-xl border bg-card p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{u.name}</p>
                    <p className="text-sm text-muted-foreground font-mono">
                      @{u.username}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => saveUserAccess(u.id)}
                    disabled={savingUserId === u.id}
                  >
                    {savingUserId === u.id ? t("saving") : t("save")}
                  </Button>
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
    </div>
  );
}
