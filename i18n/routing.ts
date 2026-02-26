import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["en", "vi"],
  defaultLocale: "en",
  localePrefix: "as-needed",
  localeCookie: { name: "NEXT_LOCALE", maxAge: 31536000 },
});
