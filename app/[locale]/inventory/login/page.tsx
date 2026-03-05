"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

function LoginRedirectInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  useEffect(() => {
    const redirect = searchParams.get("redirect");
    const target = redirect
      ? `/branch/login?redirect=${encodeURIComponent(redirect)}`
      : "/branch/login";
    router.replace(target);
  }, [router, searchParams]);
  return null;
}

export default function InventoryLoginRedirect() {
  return (
    <Suspense>
      <LoginRedirectInner />
    </Suspense>
  );
}
