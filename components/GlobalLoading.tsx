"use client";

import React, { useState, useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import Loading from "@/components/Loading";

export default function GlobalLoading() {
  const [isPageLoading, setIsPageLoading] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    setIsPageLoading(true);

    const timeout = setTimeout(() => {
      setIsPageLoading(false);
    }, 500);

    return () => clearTimeout(timeout);
  }, [pathname, searchParams]);

  if (!isPageLoading) {
    return null;
  }

  return <Loading />;
}
