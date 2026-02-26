import createMiddleware from "next-intl/middleware";
import { type NextRequest, NextResponse } from "next/server";
import { routing } from "./i18n/routing";

const intlMiddleware = createMiddleware(routing);

export default function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Strip locale prefix to get the canonical path
  const strippedPath = path.replace(/^\/(en|vi)/, "") || "/";

  const token = request.cookies.get("session_id")?.value;
  const hasValidToken = token && token !== "null" && token !== "undefined";

  const locale = request.cookies.get("NEXT_LOCALE")?.value || "en";

  // Protect /admin/* routes
  const isAdminRoute = strippedPath.startsWith("/admin");
  if (isAdminRoute) {
    if (!hasValidToken) {
      const loginPath =
        locale === "vi" ? "/vi/inventory/login" : "/inventory/login";
      const url = new URL(loginPath, request.url);
      url.searchParams.set("redirect", strippedPath);
      return NextResponse.redirect(url);
    }
  }

  // Protect /inventory/* except login
  const isProtected =
    strippedPath.startsWith("/inventory") &&
    !strippedPath.startsWith("/inventory/login");

  if (isProtected) {
    if (!hasValidToken) {
      const loginPath =
        locale === "vi" ? "/vi/inventory/login" : "/inventory/login";
      const url = new URL(loginPath, request.url);
      url.searchParams.set("redirect", strippedPath);
      return NextResponse.redirect(url);
    }
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|public).*)",
  ],
};
