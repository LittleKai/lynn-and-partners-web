"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { ModeToggle } from "@/app/AppHeader/ModeToggle";
import { LanguageToggle } from "@/app/AppHeader/LanguageToggle";

export default function HomePage() {
  const t = useTranslations("home");

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navbar */}
      <nav className="flex items-center justify-between px-6 py-4 border-b shadow-sm">
        <div className="flex items-center gap-2">
          <span className="font-bold text-xl text-primary">Lynn & Partners</span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/inventory"
            className="text-sm font-medium hover:text-primary transition-colors"
          >
            {t("inventoryLink")}
          </Link>
          <ModeToggle />
          <LanguageToggle />
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex flex-col items-center justify-center min-h-[calc(100vh-73px)] px-4 text-center">
        <h1 className="text-5xl font-bold mb-4">{t("title")}</h1>
        <p className="text-xl text-muted-foreground mb-8 max-w-2xl">{t("tagline")}</p>
        <Link
          href="/inventory"
          className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 transition-colors"
        >
          {t("inventoryLink")}
        </Link>
      </main>
    </div>
  );
}
