"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/authContext";
import AppHeader from "@/app/AppHeader/AppHeader";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isLoggedIn, isInitializing, user } = useAuth();
  const router = useRouter();

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
      <AppHeader />
      <main className="container mx-auto px-6 py-8">{children}</main>
    </div>
  );
}
