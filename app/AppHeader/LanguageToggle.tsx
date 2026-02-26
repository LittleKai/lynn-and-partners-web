"use client";

import { useLocale } from "next-intl";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";

export function LanguageToggle() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const toggle = () => {
    const newLocale = locale === "en" ? "vi" : "en";
    document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=31536000; SameSite=Lax`;

    // Build the new path
    const strippedPath = (pathname ?? "/").replace(/^\/(en|vi)/, "") || "/";
    const newPath =
      newLocale === "vi" ? `/vi${strippedPath}` : strippedPath;
    router.push(newPath);
  };

  return (
    <Button variant="ghost" size="sm" onClick={toggle} className="font-medium">
      {locale === "en" ? "VI" : "EN"}
    </Button>
  );
}
