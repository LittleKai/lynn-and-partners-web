"use client";

import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AiFillProduct } from "react-icons/ai";
import { FiHome } from "react-icons/fi";
import { useAuth } from "../authContext";
import { ModeToggle } from "./ModeToggle";
import { LanguageToggle } from "./LanguageToggle";
import { useTranslations } from "next-intl";

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

      setTimeout(() => {
        router.push("/inventory/login");
      }, 1500);
    } catch (error) {
      toast({
        title: t("logoutFailed"),
        description: t("logoutFailedDesc"),
        variant: "destructive",
      });
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleNavigation = (path: string) => {
    router.push(path);
  };

  return (
    <div className="p-4 flex flex-col sm:flex-row justify-between items-center bg-primary text-primary-foreground rounded-lg shadow-md">
      {/* Logo and Welcome Section */}
      <div className="flex items-center gap-4">
        <div
          className={`flex aspect-square size-10 items-center justify-center rounded-lg bg-primary-dark text-primary-foreground cursor-pointer`}
          onClick={() => handleNavigation("/inventory")}
        >
          <AiFillProduct className="text-3xl" />
        </div>
        <div className="text-center sm:text-left">
          <h1 className="text-2xl font-bold">{t("welcome")}, {user?.name}!</h1>
          <p className="text-sm text-primary-foreground/70">@{user?.username}</p>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex items-center space-x-2 mt-4 sm:mt-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleNavigation("/inventory")}
          className="text-primary-foreground hover:bg-primary-dark"
        >
          <FiHome className="mr-2 h-4 w-4" />
          {t("dashboard")}
        </Button>

        <ModeToggle />
        <LanguageToggle />
        <Button
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="h-10 px-6 bg-secondary text-secondary-foreground shadow-lg hover:shadow-xl hover:bg-secondary-dark transition-all"
        >
          {isLoggingOut ? t("loggingOut") : t("logout")}
        </Button>
      </div>
    </div>
  );
}
