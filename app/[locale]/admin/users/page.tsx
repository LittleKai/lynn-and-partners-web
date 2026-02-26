"use client";

import { useEffect, useState } from "react";
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

interface User {
  id: string;
  username: string;
  name: string;
  createdAt: string;
}

export default function UsersPage() {
  const t = useTranslations("admin");
  const { toast } = useToast();

  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({
    username: "",
    name: "",
    password: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [resetTarget, setResetTarget] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const res = await axiosInstance.get("/admin/users");
      setUsers(res.data.users);
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
      const res = await axiosInstance.post("/admin/users", createForm);
      setUsers((prev) => [res.data.user, ...prev]);
      setShowCreate(false);
      setCreateForm({ username: "", name: "", password: "" });
      toast({ title: t("userCreated") });
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

  const handleResetPassword = async () => {
    if (!resetTarget || !newPassword) return;
    setIsResetting(true);
    try {
      await axiosInstance.put(`/admin/users/${resetTarget.id}`, { password: newPassword });
      toast({ title: t("passwordResetSuccess") });
      setResetTarget(null);
      setNewPassword("");
    } catch {
      toast({ title: t("passwordResetFailed"), variant: "destructive" });
    } finally {
      setIsResetting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t("confirmDelete"))) return;
    try {
      await axiosInstance.delete(`/admin/users/${id}`);
      setUsers((prev) => prev.filter((u) => u.id !== id));
      toast({ title: t("userDeleted") });
    } catch {
      toast({ title: t("deleteFailed"), variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin">
            <Button variant="outline" size="sm">← {t("back")}</Button>
          </Link>
          <h2 className="text-2xl font-bold">{t("manageUsers")}</h2>
        </div>
        <Button onClick={() => setShowCreate(true)}>+ {t("createUser")}</Button>
      </div>

      <p className="text-sm text-muted-foreground">
        {t("assignAccessHint")}{" "}
        <Link href="/admin/locations" className="text-primary hover:underline">
          {t("manageLocations")}
        </Link>
      </p>

      {isLoading ? (
        <p className="text-muted-foreground">{t("loading")}</p>
      ) : users.length === 0 ? (
        <p className="text-muted-foreground">{t("noUsers")}</p>
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
              {users.map((u) => (
                <tr key={u.id} className="border-t hover:bg-muted/50">
                  <td className="px-4 py-3 font-mono">@{u.username}</td>
                  <td className="px-4 py-3">{u.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right flex gap-2 justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => { setResetTarget(u); setNewPassword(""); }}
                    >
                      {t("resetPassword")}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(u.id)}
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

      <Dialog open={!!resetTarget} onOpenChange={(open) => { if (!open) setResetTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t("resetPasswordFor")} @{resetTarget?.username}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Input
              type="password"
              placeholder={t("newPassword")}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetTarget(null)}>
              {t("cancel")}
            </Button>
            <Button onClick={handleResetPassword} disabled={isResetting || !newPassword}>
              {isResetting ? t("resetting") : t("resetPassword")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("createUser")}</DialogTitle>
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
