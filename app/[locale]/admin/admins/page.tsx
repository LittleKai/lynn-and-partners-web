"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/app/authContext";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import axiosInstance from "@/utils/axiosInstance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface Admin {
  id: string;
  username: string;
  name: string;
  role: string;
  createdAt: string;
}

export default function AdminsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const t = useTranslations("admin");
  const { toast } = useToast();

  const [admins, setAdmins] = useState<Admin[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({
    username: "",
    name: "",
    password: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user?.role !== "superadmin") {
      router.push("/admin");
      return;
    }
    loadAdmins();
  }, [user]);

  const loadAdmins = async () => {
    try {
      const res = await axiosInstance.get("/superadmin/admins");
      setAdmins(res.data.admins);
    } catch {
      toast({ title: t("loadFailed"), variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!createForm.username || !createForm.name || !createForm.password)
      return;
    setIsSubmitting(true);
    try {
      const res = await axiosInstance.post("/superadmin/admins", createForm);
      setAdmins((prev) => [res.data.admin, ...prev]);
      setShowCreate(false);
      setCreateForm({ username: "", name: "", password: "" });
      toast({ title: t("adminCreated") });
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      toast({
        title: t("createFailed"),
        description: error.response?.data?.error,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t("confirmDelete"))) return;
    try {
      await axiosInstance.delete(`/superadmin/admins/${id}`);
      setAdmins((prev) => prev.filter((a) => a.id !== id));
      toast({ title: t("adminDeleted") });
    } catch {
      toast({ title: t("deleteFailed"), variant: "destructive" });
    }
  };

  if (user?.role !== "superadmin") return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin">
            <Button variant="outline" size="sm">← {t("back")}</Button>
          </Link>
          <h2 className="text-2xl font-bold">{t("manageAdmins")}</h2>
        </div>
        <Button onClick={() => setShowCreate(true)}>+ {t("createAdmin")}</Button>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">{t("loading")}</p>
      ) : admins.length === 0 ? (
        <p className="text-muted-foreground">{t("noAdmins")}</p>
      ) : (
        <div className="rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="px-4 py-3 text-left font-medium">{t("username")}</th>
                <th className="px-4 py-3 text-left font-medium">{t("name")}</th>
                <th className="px-4 py-3 text-left font-medium">{t("createdAt")}</th>
                <th className="px-4 py-3 text-right font-medium">{t("actions")}</th>
              </tr>
            </thead>
            <tbody>
              {admins.map((admin) => (
                <tr key={admin.id} className="border-t hover:bg-muted/50">
                  <td className="px-4 py-3 font-mono">{admin.username}</td>
                  <td className="px-4 py-3">{admin.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(admin.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(admin.id)}
                    >
                      {t("delete")}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("createAdmin")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Input
              placeholder={t("username")}
              value={createForm.username}
              onChange={(e) =>
                setCreateForm((f) => ({ ...f, username: e.target.value }))
              }
            />
            <Input
              placeholder={t("name")}
              value={createForm.name}
              onChange={(e) =>
                setCreateForm((f) => ({ ...f, name: e.target.value }))
              }
            />
            <Input
              type="password"
              placeholder={t("password")}
              value={createForm.password}
              onChange={(e) =>
                setCreateForm((f) => ({ ...f, password: e.target.value }))
              }
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>
              {t("cancel")}
            </Button>
            <Button onClick={handleCreate} disabled={isSubmitting}>
              {isSubmitting ? t("creating") : t("create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
