"use client";

import { useTranslations } from "next-intl";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AppHeader from "@/app/AppHeader/AppHeader";
import Loading from "@/components/Loading";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Package, ShoppingCart, Wallet, Users, ChevronLeft, FolderOpen, Megaphone } from "lucide-react";
import { useLocationInventory } from "./_hooks/useLocationInventory";
import { ItemsTab } from "./_components/ItemsTab";
import { SalesTab } from "./_components/SalesTab";
import { ExpensesTab } from "./_components/ExpensesTab";
import { CustomersTab } from "./_components/CustomersTab";
import { AnnouncementsTab } from "./_components/AnnouncementsTab";
import { DocumentsTab } from "./_components/DocumentsTab";

export default function LocationInventoryPage() {
  const t = useTranslations("inventory");
  const {
    branchId,
    isLoggedIn,
    isInitializing,
    location,
    products,
    setProducts,
    transactions,
    setTransactions,
    expenses,
    setExpenses,
    suppliers,
    setSuppliers,
    customers,
    setCustomers,
    guests,
    setGuests,
    rooms,
    setRooms,
    orders,
    setOrders,
    documents,
    setDocuments,
    announcements,
    setAnnouncements,
    isLoading,
    canManageProducts,
    isAdmin,
    isHotel,
    availableRooms,
    activeGuests,
    getCustomerName,
    getGuestLabel,
  } = useLocationInventory();

  if (isInitializing || !isLoggedIn) return <Loading />;
  if (isLoading) return <Loading />;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container mx-auto px-6 py-6 space-y-5">
        {/* ── Page header ── */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <Link href="/inventory">
              <Button variant="outline" size="sm" className="mb-3 gap-1.5 h-8">
                <ChevronLeft className="h-4 w-4" />
                {t("backToLocations")}
              </Button>
            </Link>
            {location && (
              <>
                <h1 className="text-2xl font-bold tracking-tight">
                  {location.name}
                </h1>
                {location.address && (
                  <p className="text-sm text-muted-foreground mt-0.5">
                    📌 {location.address}
                  </p>
                )}
              </>
            )}
          </div>
        </div>

        <Tabs defaultValue="items">
          {/* ── Main tabs ── */}
          <TabsList className="flex w-full h-auto p-1 gap-1 overflow-x-auto">
            <TabsTrigger value="items" className="flex flex-1 items-center justify-center gap-1.5 py-2 whitespace-nowrap">
              <Package className="h-4 w-4 shrink-0" />
              <span className="text-sm font-medium">{t("products")}</span>
            </TabsTrigger>
            <TabsTrigger value="sales" className="flex flex-1 items-center justify-center gap-1.5 py-2 whitespace-nowrap">
              <ShoppingCart className="h-4 w-4 shrink-0" />
              <span className="text-sm font-medium">{t("sales")}</span>
            </TabsTrigger>
            <TabsTrigger value="expenses" className="flex flex-1 items-center justify-center gap-1.5 py-2 whitespace-nowrap">
              <Wallet className="h-4 w-4 shrink-0" />
              <span className="text-sm font-medium">{t("expenses")}</span>
            </TabsTrigger>
            <TabsTrigger value="customers" className="flex flex-1 items-center justify-center gap-1.5 py-2 whitespace-nowrap">
              <Users className="h-4 w-4 shrink-0" />
              <span className="text-sm font-medium">{t("customers")}</span>
            </TabsTrigger>
            <TabsTrigger value="announcements" className="flex flex-1 items-center justify-center gap-1.5 py-2 whitespace-nowrap">
              <Megaphone className="h-4 w-4 shrink-0" />
              <span className="text-sm font-medium">{t("announcements")}</span>
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="documents" className="flex flex-1 items-center justify-center gap-1.5 py-2 whitespace-nowrap">
                <FolderOpen className="h-4 w-4 shrink-0" />
                <span className="text-sm font-medium">{t("documents")}</span>
              </TabsTrigger>
            )}
          </TabsList>

          {/* ── Items Tab ── */}
          <TabsContent value="items" className="mt-4">
            <ItemsTab
              branchId={branchId}
              location={location}
              products={products}
              setProducts={setProducts}
              transactions={transactions}
              setTransactions={setTransactions}
              suppliers={suppliers}
              setSuppliers={setSuppliers}
              orders={orders}
              customers={customers}
              isAdmin={isAdmin}
              canManageProducts={canManageProducts}
            />
          </TabsContent>

          {/* ── Sales Tab ── */}
          <TabsContent value="sales" className="mt-4">
            <SalesTab
              branchId={branchId}
              location={location}
              products={products}
              setProducts={setProducts}
              customers={customers}
              guests={guests}
              orders={orders}
              setOrders={setOrders}
              isAdmin={isAdmin}
              isHotel={isHotel}
              canManageProducts={canManageProducts}
              activeGuests={activeGuests}
              getCustomerName={getCustomerName}
              getGuestLabel={getGuestLabel}
            />
          </TabsContent>

          {/* ── Expenses Tab ── */}
          <TabsContent value="expenses" className="mt-4">
            <ExpensesTab
              branchId={branchId}
              location={location}
              expenses={expenses}
              setExpenses={setExpenses}
              isAdmin={isAdmin}
              currentUserId={user?.id || ""}
            />
          </TabsContent>

          {/* ── Customers Tab ── */}
          <TabsContent value="customers" className="mt-4">
            <CustomersTab
              branchId={branchId}
              location={location}
              customers={customers}
              setCustomers={setCustomers}
              guests={guests}
              setGuests={setGuests}
              rooms={rooms}
              setRooms={setRooms}
              isHotel={isHotel}
              availableRooms={availableRooms}
              getCustomerName={getCustomerName}
            />
          </TabsContent>

          {/* ── Announcements Tab ── */}
          <TabsContent value="announcements" className="mt-4">
            <AnnouncementsTab
              branchId={branchId}
              announcements={announcements}
              setAnnouncements={setAnnouncements}
              isAdmin={isAdmin}
            />
          </TabsContent>

          {/* ── Documents Tab (admin only) ── */}
          {isAdmin && (
            <TabsContent value="documents" className="mt-4">
              <DocumentsTab
                branchId={branchId}
                location={location}
                documents={documents}
                setDocuments={setDocuments}
              />
            </TabsContent>
          )}
        </Tabs>
      </main>
    </div>
  );
}
