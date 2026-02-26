"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/authContext";
import { useTranslations } from "next-intl";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isLoggedIn, isInitializing, user } = useAuth();
  const router = useRouter();
  const t = useTranslations("admin");

  useEffect(() => {
    if (isInitializing) return;
    if (!isLoggedIn) {
      router.push("/inventory/login");
      return;
    }
    if (user && user.role !== "admin" && user.role !== "superadmin") {
      router.push("/inventory");
    }
  }, [isInitializing, isLoggedIn, user, router]);

  if (isInitializing) return null;
  if (!isLoggedIn || !user) return null;
  if (user.role !== "admin" && user.role !== "superadmin") return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold">Lynn &amp; Partners</h1>
          <span className="text-muted-foreground">|</span>
          <span className="text-sm text-muted-foreground">{t("adminPanel")}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">
            {user.name} ({user.role})
          </span>
          <a href="/inventory" className="text-sm text-primary hover:underline">
            {t("inventory")}
          </a>
        </div>
      </header>
      <main className="container mx-auto px-6 py-8">{children}</main>
    </div>
  );
}
