"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useProductStore } from "@/app/useProductStore";
import { useToast } from "@/hooks/use-toast";
import { FaEdit, FaTrash } from "react-icons/fa";
import { useAuth } from "@/app/authContext";
import axiosInstance from "@/utils/axiosInstance";
import { useTranslations } from "next-intl";
import { Supplier } from "@/app/types";

interface SupplierFormData {
  name: string;
  contactName: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  country: string;
  taxId: string;
  businessRegistrationNumber: string;
  companyName: string;
  notes: string;
  paymentTerms: string;
  contractDate: string;
}

const emptyForm: SupplierFormData = {
  name: "",
  contactName: "",
  phone: "",
  email: "",
  address: "",
  city: "",
  country: "",
  taxId: "",
  businessRegistrationNumber: "",
  companyName: "",
  notes: "",
  paymentTerms: "",
  contractDate: "",
};

export default function AddSupplierDialog() {
  const [form, setForm] = useState<SupplierFormData>(emptyForm);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [editForm, setEditForm] = useState<SupplierFormData>(emptyForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const {
    suppliers,
    addSupplier,
    editSupplier,
    deleteSupplier,
    loadSuppliers,
  } = useProductStore();
  const { toast } = useToast();
  const { user, isLoggedIn } = useAuth();
  const t = useTranslations("supplier");

  useEffect(() => {
    if (isLoggedIn) {
      loadSuppliers();
    }
  }, [isLoggedIn, loadSuppliers]);

  const handleAddSupplier = async () => {
    if (form.name.trim() === "") {
      toast({
        title: "Error",
        description: t("nameRequired"),
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await axiosInstance.post("/suppliers", {
        ...form,
        userId: user?.id,
        contractDate: form.contractDate || null,
      });

      if (response.status !== 201) {
        throw new Error("Failed to add supplier");
      }

      const newSupplier = response.data;
      addSupplier(newSupplier);
      setForm(emptyForm);
      toast({
        title: t("createSuccess"),
        description: `"${form.companyName || form.name}" ${t("createSuccessDesc")}`,
      });
    } catch (error) {
      console.error("Error adding supplier:", error);
      toast({
        title: t("createFailed"),
        description: t("createFailedDesc"),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSupplier = async (supplierId: string) => {
    if (editForm.name.trim() === "") {
      toast({
        title: "Error",
        description: t("nameRequired"),
        variant: "destructive",
      });
      return;
    }

    setIsEditing(true);
    try {
      const response = await axiosInstance.put("/suppliers", {
        id: supplierId,
        ...editForm,
        contractDate: editForm.contractDate || null,
      });

      if (response.status !== 200) {
        throw new Error("Failed to edit supplier");
      }

      const updatedSupplier = response.data;
      editSupplier(supplierId, updatedSupplier.name);
      // Update full supplier in store by reloading
      await loadSuppliers();
      setEditingSupplier(null);
      setEditForm(emptyForm);
      toast({
        title: t("updateSuccess"),
        description: `"${editForm.companyName || editForm.name}"`,
      });
    } catch (error) {
      console.error("Error editing supplier:", error);
      toast({
        title: t("updateFailed"),
        description: t("updateFailedDesc"),
        variant: "destructive",
      });
    } finally {
      setIsEditing(false);
    }
  };

  const handleDeleteSupplier = async (supplierId: string) => {
    setIsDeleting(true);

    const supplierToDelete = suppliers.find((sup) => sup.id === supplierId);
    const displayName =
      (supplierToDelete as any)?.companyName ||
      supplierToDelete?.name ||
      "Unknown Supplier";

    try {
      const response = await axiosInstance.delete("/suppliers", {
        data: { id: supplierId },
      });

      if (response.status !== 204) {
        throw new Error("Failed to delete supplier");
      }

      deleteSupplier(supplierId);
      toast({
        title: t("deleteSuccess"),
        description: `"${displayName}" ${t("deleteSuccessDesc")}`,
      });
    } catch (error) {
      console.error("Error deleting supplier:", error);
      toast({
        title: t("deleteFailed"),
        description: t("deleteFailedDesc"),
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const openEditDialog = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setEditForm({
      name: supplier.name || "",
      contactName: supplier.contactName || "",
      phone: supplier.phone || "",
      email: supplier.email || "",
      address: supplier.address || "",
      city: supplier.city || "",
      country: supplier.country || "",
      taxId: supplier.taxId || "",
      businessRegistrationNumber: supplier.businessRegistrationNumber || "",
      companyName: supplier.companyName || "",
      notes: supplier.notes || "",
      paymentTerms: supplier.paymentTerms || "",
      contractDate: supplier.contractDate
        ? supplier.contractDate.split("T")[0]
        : "",
    });
  };

  if (!isLoggedIn) {
    return null;
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="h-10 font-semibold">{t("addSupplier")}</Button>
      </DialogTrigger>
      <DialogContent
        className="p-4 sm:p-7 sm:px-8 poppins max-h-[90vh] overflow-y-auto w-full max-w-2xl"
        aria-describedby="supplier-dialog-description"
      >
        <DialogHeader>
          <DialogTitle className="text-[22px]">{t("addSupplier")}</DialogTitle>
        </DialogHeader>
        <DialogDescription id="supplier-dialog-description">
          {t("enterName")}
        </DialogDescription>

        {/* Tabbed Form */}
        <Tabs defaultValue="basic" className="mt-2">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="basic">{t("basicInfo")}</TabsTrigger>
            <TabsTrigger value="address">{t("addressTab")}</TabsTrigger>
            <TabsTrigger value="contract">{t("contractTab")}</TabsTrigger>
          </TabsList>

          {/* Basic Info Tab */}
          <TabsContent value="basic" className="space-y-3 mt-4">
            <div>
              <label className="block text-sm font-medium mb-1">{t("name")} *</label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder={t("name")}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{t("companyName")}</label>
              <Input
                value={form.companyName}
                onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                placeholder={t("companyName")}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{t("contactName")}</label>
              <Input
                value={form.contactName}
                onChange={(e) => setForm({ ...form, contactName: e.target.value })}
                placeholder={t("contactName")}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{t("phone")}</label>
              <Input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder={t("phone")}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{t("email")}</label>
              <Input
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder={t("email")}
                type="email"
              />
            </div>
          </TabsContent>

          {/* Address Tab */}
          <TabsContent value="address" className="space-y-3 mt-4">
            <div>
              <label className="block text-sm font-medium mb-1">{t("address")}</label>
              <Input
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder={t("address")}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{t("city")}</label>
              <Input
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                placeholder={t("city")}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{t("country")}</label>
              <Input
                value={form.country}
                onChange={(e) => setForm({ ...form, country: e.target.value })}
                placeholder={t("country")}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{t("taxId")}</label>
              <Input
                value={form.taxId}
                onChange={(e) => setForm({ ...form, taxId: e.target.value })}
                placeholder={t("taxId")}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{t("businessRegNumber")}</label>
              <Input
                value={form.businessRegistrationNumber}
                onChange={(e) =>
                  setForm({ ...form, businessRegistrationNumber: e.target.value })
                }
                placeholder={t("businessRegNumber")}
              />
            </div>
          </TabsContent>

          {/* Contract Tab */}
          <TabsContent value="contract" className="space-y-3 mt-4">
            <div>
              <label className="block text-sm font-medium mb-1">{t("notes")}</label>
              <Input
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder={t("notes")}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{t("paymentTerms")}</label>
              <Input
                value={form.paymentTerms}
                onChange={(e) => setForm({ ...form, paymentTerms: e.target.value })}
                placeholder={t("paymentTerms")}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{t("contractDate")}</label>
              <Input
                value={form.contractDate}
                onChange={(e) => setForm({ ...form, contractDate: e.target.value })}
                type="date"
              />
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-6 mb-4 flex flex-col sm:flex-row items-center gap-4">
          <DialogClose asChild>
            <Button variant={"secondary"} className="h-11 w-full sm:w-auto px-11">
              Cancel
            </Button>
          </DialogClose>
          <Button
            onClick={handleAddSupplier}
            className="h-11 w-full sm:w-auto px-11"
            disabled={isSubmitting}
          >
            {isSubmitting ? t("creating") : t("addSupplier")}
          </Button>
        </DialogFooter>

        {/* Supplier List */}
        <div className="mt-4">
          <h3 className="text-lg font-semibold">{t("suppliers")}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            {suppliers.map((supplier) => {
              const sup = supplier as Supplier;
              const displayName = sup.companyName || sup.name;
              return (
                <div
                  key={sup.id}
                  className="p-4 border rounded-lg shadow-sm flex flex-col justify-between"
                >
                  {editingSupplier?.id === sup.id ? (
                    <div className="flex flex-col space-y-2">
                      <Tabs defaultValue="basic">
                        <TabsList className="grid w-full grid-cols-3 text-xs">
                          <TabsTrigger value="basic">{t("basicInfo")}</TabsTrigger>
                          <TabsTrigger value="address">{t("addressTab")}</TabsTrigger>
                          <TabsTrigger value="contract">{t("contractTab")}</TabsTrigger>
                        </TabsList>
                        <TabsContent value="basic" className="space-y-2 mt-2">
                          <Input
                            value={editForm.name}
                            onChange={(e) =>
                              setEditForm({ ...editForm, name: e.target.value })
                            }
                            placeholder={t("name")}
                            className="h-8"
                          />
                          <Input
                            value={editForm.companyName}
                            onChange={(e) =>
                              setEditForm({ ...editForm, companyName: e.target.value })
                            }
                            placeholder={t("companyName")}
                            className="h-8"
                          />
                          <Input
                            value={editForm.contactName}
                            onChange={(e) =>
                              setEditForm({ ...editForm, contactName: e.target.value })
                            }
                            placeholder={t("contactName")}
                            className="h-8"
                          />
                          <Input
                            value={editForm.phone}
                            onChange={(e) =>
                              setEditForm({ ...editForm, phone: e.target.value })
                            }
                            placeholder={t("phone")}
                            className="h-8"
                          />
                          <Input
                            value={editForm.email}
                            onChange={(e) =>
                              setEditForm({ ...editForm, email: e.target.value })
                            }
                            placeholder={t("email")}
                            className="h-8"
                            type="email"
                          />
                        </TabsContent>
                        <TabsContent value="address" className="space-y-2 mt-2">
                          <Input
                            value={editForm.address}
                            onChange={(e) =>
                              setEditForm({ ...editForm, address: e.target.value })
                            }
                            placeholder={t("address")}
                            className="h-8"
                          />
                          <Input
                            value={editForm.city}
                            onChange={(e) =>
                              setEditForm({ ...editForm, city: e.target.value })
                            }
                            placeholder={t("city")}
                            className="h-8"
                          />
                          <Input
                            value={editForm.country}
                            onChange={(e) =>
                              setEditForm({ ...editForm, country: e.target.value })
                            }
                            placeholder={t("country")}
                            className="h-8"
                          />
                          <Input
                            value={editForm.taxId}
                            onChange={(e) =>
                              setEditForm({ ...editForm, taxId: e.target.value })
                            }
                            placeholder={t("taxId")}
                            className="h-8"
                          />
                          <Input
                            value={editForm.businessRegistrationNumber}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                businessRegistrationNumber: e.target.value,
                              })
                            }
                            placeholder={t("businessRegNumber")}
                            className="h-8"
                          />
                        </TabsContent>
                        <TabsContent value="contract" className="space-y-2 mt-2">
                          <Input
                            value={editForm.notes}
                            onChange={(e) =>
                              setEditForm({ ...editForm, notes: e.target.value })
                            }
                            placeholder={t("notes")}
                            className="h-8"
                          />
                          <Input
                            value={editForm.paymentTerms}
                            onChange={(e) =>
                              setEditForm({ ...editForm, paymentTerms: e.target.value })
                            }
                            placeholder={t("paymentTerms")}
                            className="h-8"
                          />
                          <Input
                            value={editForm.contractDate}
                            onChange={(e) =>
                              setEditForm({ ...editForm, contractDate: e.target.value })
                            }
                            type="date"
                            className="h-8"
                          />
                        </TabsContent>
                      </Tabs>
                      <div className="flex justify-between gap-2 mt-2">
                        <Button
                          onClick={() => handleEditSupplier(sup.id)}
                          className="h-8 w-full"
                          disabled={isEditing}
                        >
                          {isEditing ? t("saving") : "Save"}
                        </Button>
                        <Button
                          onClick={() => setEditingSupplier(null)}
                          className="h-8 w-full"
                          variant="secondary"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col space-y-1">
                      <span className="font-semibold">{displayName}</span>
                      {sup.contactName && (
                        <span className="text-sm text-muted-foreground">
                          {sup.contactName}
                        </span>
                      )}
                      {sup.phone && (
                        <span className="text-sm text-muted-foreground">
                          {sup.phone}
                        </span>
                      )}
                      {sup.city && (
                        <span className="text-sm text-muted-foreground">
                          {sup.city}
                        </span>
                      )}
                      <div className="flex justify-between gap-2 mt-2">
                        <Button
                          onClick={() => openEditDialog(sup)}
                          className="h-8 w-full"
                        >
                          <FaEdit />
                        </Button>
                        <Button
                          onClick={() => handleDeleteSupplier(sup.id)}
                          className="h-8 w-full"
                          disabled={isDeleting}
                        >
                          {isDeleting ? t("deleting") : <FaTrash />}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
