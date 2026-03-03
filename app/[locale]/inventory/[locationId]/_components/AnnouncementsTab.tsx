"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import axiosInstance from "@/utils/axiosInstance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Megaphone, Pencil } from "lucide-react";
import type { Announcement } from "../_types";

interface AnnouncementsTabProps {
  locationId: string;
  announcements: Announcement[];
  setAnnouncements: React.Dispatch<React.SetStateAction<Announcement[]>>;
  isAdmin: boolean;
}

export function AnnouncementsTab({
  locationId,
  announcements,
  setAnnouncements,
  isAdmin,
}: AnnouncementsTabProps) {
  const t = useTranslations("inventory");
  const { toast } = useToast();

  // ── Local state ───────────────────────────────────────────────────
  const [showAnnouncementDialog, setShowAnnouncementDialog] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [announcementForm, setAnnouncementForm] = useState({
    title: "",
    content: "",
    type: "info",
  });
  const [isSavingAnnouncement, setIsSavingAnnouncement] = useState(false);

  // ── Handlers ──────────────────────────────────────────────────────
  const openNewAnnouncement = () => {
    setEditingAnnouncement(null);
    setAnnouncementForm({ title: "", content: "", type: "info" });
    setShowAnnouncementDialog(true);
  };

  const openEditAnnouncement = (ann: Announcement) => {
    setEditingAnnouncement(ann);
    setAnnouncementForm({ title: ann.title, content: ann.content, type: ann.type });
    setShowAnnouncementDialog(true);
  };

  const handleAnnouncementSave = async () => {
    if (!announcementForm.title.trim() || !announcementForm.content.trim()) return;
    setIsSavingAnnouncement(true);
    try {
      if (editingAnnouncement) {
        const res = await axiosInstance.put(
          `/locations/${locationId}/announcements/${editingAnnouncement.id}`,
          announcementForm
        );
        setAnnouncements((prev) =>
          prev.map((a) => (a.id === editingAnnouncement.id ? res.data.announcement : a))
        );
        toast({ title: t("announcementUpdated") });
      } else {
        const res = await axiosInstance.post(
          `/locations/${locationId}/announcements`,
          announcementForm
        );
        setAnnouncements((prev) => [res.data.announcement, ...prev]);
        toast({ title: t("announcementCreated") });
      }
      setShowAnnouncementDialog(false);
    } catch {
      toast({ title: t("announcementSaveFailed"), variant: "destructive" });
    } finally {
      setIsSavingAnnouncement(false);
    }
  };

  const handleAnnouncementDelete = async (annId: string) => {
    if (!confirm(t("confirmDelete"))) return;
    try {
      await axiosInstance.delete(`/locations/${locationId}/announcements/${annId}`);
      setAnnouncements((prev) => prev.filter((a) => a.id !== annId));
      toast({ title: t("announcementDeleted") });
    } catch {
      toast({ title: t("announcementDeleteFailed"), variant: "destructive" });
    }
  };

  // ── Render ────────────────────────────────────────────────────────
  const typeColors: Record<string, string> = {
    info: "border-l-blue-400 bg-blue-50/50 dark:bg-blue-950/20",
    warning: "border-l-yellow-400 bg-yellow-50/50 dark:bg-yellow-950/20",
    urgent: "border-l-red-400 bg-red-50/50 dark:bg-red-950/20",
  };
  const typeBadge: Record<string, string> = {
    info: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
    warning: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300",
    urgent: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300",
  };

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold">{t("announcements")}</h2>
            <p className="text-sm text-muted-foreground">{t("announcementsDesc")}</p>
          </div>
          {isAdmin && (
            <Button onClick={openNewAnnouncement}>
              + {t("newAnnouncement")}
            </Button>
          )}
        </div>

        {announcements.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
            <Megaphone className="h-10 w-10 opacity-30" />
            <p className="text-sm">{t("noAnnouncements")}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {announcements.map((ann) => (
              <div
                key={ann.id}
                className={`rounded-xl border-l-4 border border-border px-4 py-3 ${typeColors[ann.type] ?? typeColors.info}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeBadge[ann.type] ?? typeBadge.info}`}>
                        {t(`announcementType_${ann.type}` as Parameters<typeof t>[0])}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {ann.createdByName && `${ann.createdByName} · `}
                        {new Date(ann.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm font-semibold">{ann.title}</p>
                    <p className="text-sm text-muted-foreground mt-0.5 whitespace-pre-wrap">{ann.content}</p>
                  </div>
                  {isAdmin && (
                    <div className="flex gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditAnnouncement(ann)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleAnnouncementDelete(ann.id)}
                      >
                        🗑️
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Announcement Create/Edit Dialog ── */}
      <Dialog open={showAnnouncementDialog} onOpenChange={setShowAnnouncementDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingAnnouncement ? t("editAnnouncement") : t("newAnnouncement")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <label className="text-sm font-medium mb-1 block">{t("announcementTitle")} *</label>
              <Input
                value={announcementForm.title}
                onChange={(e) => setAnnouncementForm((f) => ({ ...f, title: e.target.value }))}
                autoFocus
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">{t("announcementContent")} *</label>
              <Textarea
                value={announcementForm.content}
                onChange={(e) => setAnnouncementForm((f) => ({ ...f, content: e.target.value }))}
                rows={4}
                placeholder={t("announcementContentPlaceholder")}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">{t("announcementType")}</label>
              <Select
                value={announcementForm.type}
                onValueChange={(v) => setAnnouncementForm((f) => ({ ...f, type: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">{t("announcementType_info")}</SelectItem>
                  <SelectItem value="warning">{t("announcementType_warning")}</SelectItem>
                  <SelectItem value="urgent">{t("announcementType_urgent")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => setShowAnnouncementDialog(false)}>
                {t("cancel")}
              </Button>
              <Button
                onClick={handleAnnouncementSave}
                disabled={
                  isSavingAnnouncement ||
                  !announcementForm.title.trim() ||
                  !announcementForm.content.trim()
                }
              >
                {isSavingAnnouncement ? t("saving") : t("saveChanges")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
