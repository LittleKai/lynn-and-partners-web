"use client";

import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { useAuth } from "../authContext";
import { ModeToggle } from "./ModeToggle";
import { LanguageToggle } from "./LanguageToggle";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LayoutDashboard, ShieldCheck, LogOut } from "lucide-react";

export default function AppHeader() {
  const { logout, user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const t = useTranslations("header");

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      toast({
        title: t("logoutSuccess"),
        description: t("logoutSuccessDesc"),
      });
      setTimeout(() => router.push("/inventory/login"), 1500);
    } catch {
      toast({
        title: t("logoutFailed"),
        description: t("logoutFailedDesc"),
        variant: "destructive",
      });
    } finally {
      setIsLoggingOut(false);
    }
  };

  const isAdmin = user?.role === "admin" || user?.role === "superadmin";
  const initials = user?.name
    ? user.name
        .split(" ")
        .map((w) => w[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "?";

  return (
    <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <div className="container mx-auto px-6 flex h-14 items-center justify-between gap-4">

        {/* ── Left: brand + nav ── */}
        <div className="flex items-center gap-1">
          {/* Brand mark */}
          <Link href="/inventory" className="flex items-center gap-2.5 mr-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
              <span className="text-primary-foreground text-xs font-bold tracking-tight">
                L&P
              </span>
            </div>
            <span className="font-semibold text-sm hidden md:block">
              Lynn &amp; Partners
            </span>
          </Link>

          <div className="w-px h-5 bg-border mx-1 hidden sm:block" />

          {/* Nav buttons */}
          <Link href="/inventory">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 text-muted-foreground hover:text-foreground"
            >
              <LayoutDashboard className="h-4 w-4" />
              <span className="hidden sm:inline">{t("dashboard")}</span>
            </Button>
          </Link>

          {isAdmin && (
            <Link href="/admin">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1.5 text-muted-foreground hover:text-foreground"
              >
                <ShieldCheck className="h-4 w-4" />
                <span className="hidden sm:inline">{t("adminPanel")}</span>
              </Button>
            </Link>
          )}
        </div>

        {/* ── Right: user info + tools ── */}
        <div className="flex items-center gap-2">
          <ModeToggle />
          <LanguageToggle />

          {/* User badge */}
          {user && (
            <div className="hidden sm:flex items-center gap-2 pl-2 border-l">
              <div className="h-7 w-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                <span className="text-xs font-semibold text-primary">
                  {initials}
                </span>
              </div>
              <div className="hidden md:block leading-tight">
                <p className="text-sm font-medium">{user.name}</p>
                <p className="text-xs text-muted-foreground">@{user.username}</p>
              </div>
            </div>
          )}

          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 text-muted-foreground hover:text-destructive"
            onClick={handleLogout}
            disabled={isLoggingOut}
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">
              {isLoggingOut ? t("loggingOut") : t("logout")}
            </span>
          </Button>
        </div>
      </div>
    </header>
  );
}
