"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/authContext";
import { useTranslations } from "next-intl";
import axiosInstance from "@/utils/axiosInstance";
import Loading from "@/components/Loading";
import AppHeader from "@/app/AppHeader/AppHeader";
import { buildBranchSlug } from "@/utils/slugify";

interface Location {
  id: string;
  name: string;
  type: string;
  description: string | null;
  address: string | null;
  permissions?: string[];
}

const LOCATION_TYPE_ICONS: Record<string, string> = {
  warehouse: "🏭",
  office: "🏢",
  store: "🏪",
  factory: "🏗️",
  other: "📍",
};

export default function BranchPage() {
  const { isLoggedIn, isInitializing, user } = useAuth();
  const router = useRouter();
  const t = useTranslations("inventory");

  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isInitializing) return;
    if (!isLoggedIn) {
      router.push("/branch/login");
      return;
    }
    loadLocations();
  }, [isInitializing, isLoggedIn]);

  const loadLocations = async () => {
    try {
      const res = await axiosInstance.get("/users/me/locations");
      setLocations(res.data.locations);
    } catch {
      // silent
    } finally {
      setIsLoading(false);
    }
  };

  if (isInitializing || !isLoggedIn) return <Loading />;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container mx-auto px-6 py-8 space-y-6">
        <div>
          <h2 className="text-2xl font-bold">{t("selectLocation")}</h2>
          <p className="text-muted-foreground mt-1">{t("selectLocationDesc")}</p>
        </div>

        {isLoading ? (
          <Loading />
        ) : locations.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground text-lg">{t("noLocations")}</p>
            {(user?.role === "admin" || user?.role === "superadmin") && (
              <a
                href="/admin/locations"
                className="text-primary hover:underline text-sm mt-2 block"
              >
                {t("createLocationLink")}
              </a>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {locations.map((loc) => (
              <div
                key={loc.id}
                className="rounded-xl border bg-card p-6 hover:shadow-md transition-shadow cursor-pointer group"
                onClick={() => router.push(`/branch/${buildBranchSlug(loc.name, loc.id)}`)}
              >
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-3xl">
                    {LOCATION_TYPE_ICONS[loc.type] || "📍"}
                  </span>
                  <div>
                    <h3 className="font-semibold group-hover:text-primary transition-colors">
                      {loc.name}
                    </h3>
                    <p className="text-xs text-muted-foreground capitalize">
                      {t(`locationType.${loc.type}`) || loc.type}
                    </p>
                  </div>
                </div>
                {loc.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {loc.description}
                  </p>
                )}
                {loc.address && (
                  <p className="text-xs text-muted-foreground mt-2">
                    📌 {loc.address}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
