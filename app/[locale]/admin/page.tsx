"use client";

import { useAuth } from "@/app/authContext";
import { useTranslations } from "next-intl";
import Link from "next/link";

export default function AdminDashboard() {
  const { user } = useAuth();
  const t = useTranslations("admin");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">{t("dashboard")}</h2>
        <p className="text-muted-foreground mt-1">
          {t("welcomeBack")}, {user?.name}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {user?.role === "superadmin" && (
          <Link href="/admin/admins">
            <div className="rounded-xl border bg-card p-6 hover:shadow-md transition-shadow cursor-pointer">
              <div className="text-3xl mb-3">👥</div>
              <h3 className="font-semibold text-lg">{t("manageAdmins")}</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {t("manageAdminsDesc")}
              </p>
            </div>
          </Link>
        )}

        {(user?.role === "admin" || user?.role === "superadmin") && (
          <>
            <Link href="/admin/locations">
              <div className="rounded-xl border bg-card p-6 hover:shadow-md transition-shadow cursor-pointer">
                <div className="text-3xl mb-3">📍</div>
                <h3 className="font-semibold text-lg">{t("manageLocations")}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {t("manageLocationsDesc")}
                </p>
              </div>
            </Link>

            <Link href="/admin/users">
              <div className="rounded-xl border bg-card p-6 hover:shadow-md transition-shadow cursor-pointer">
                <div className="text-3xl mb-3">🧑‍💼</div>
                <h3 className="font-semibold text-lg">{t("manageUsers")}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {t("manageUsersDesc")}
                </p>
              </div>
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
