"use client";

import { useState, useRef } from "react";
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
import { FolderOpen, Pencil } from "lucide-react";
import type { Location, LocationDoc } from "../_types";

interface DocumentsTabProps {
  locationId: string;
  location: Location | null;
  documents: LocationDoc[];
  setDocuments: React.Dispatch<React.SetStateAction<LocationDoc[]>>;
}

export function DocumentsTab({
  locationId,
  location,
  documents,
  setDocuments,
}: DocumentsTabProps) {
  const t = useTranslations("inventory");
  const { toast } = useToast();

  // ── Local state ───────────────────────────────────────────────────
  const docFileInputRef = useRef<HTMLInputElement>(null);
  const [isDocUploading, setIsDocUploading] = useState(false);
  const [pendingDocFile, setPendingDocFile] = useState<File | null>(null);
  const [pendingDocNote, setPendingDocNote] = useState("");
  const [showDocUploadDialog, setShowDocUploadDialog] = useState(false);
  const [editingDoc, setEditingDoc] = useState<LocationDoc | null>(null);
  const [editDocName, setEditDocName] = useState("");
  const [editDocNote, setEditDocNote] = useState("");
  const [isSavingDoc, setIsSavingDoc] = useState(false);
  const [docPreviewUrl, setDocPreviewUrl] = useState<string | null>(null);

  // ── Handlers ──────────────────────────────────────────────────────
  const handleDocFileSelected = (file: File) => {
    setPendingDocFile(file);
    setPendingDocNote("");
    setShowDocUploadDialog(true);
  };

  const handleDocUploadConfirm = async () => {
    if (!pendingDocFile) return;
    setIsDocUploading(true);
    try {
      const locName = location?.name || "general";
      const fd = new FormData();
      fd.append("file", pendingDocFile);
      fd.append("locationName", locName);
      fd.append("subfolder", "documents");
      const r = await axiosInstance.post("/upload", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      await axiosInstance.post(`/locations/${locationId}/documents`, {
        name: pendingDocFile.name,
        url: r.data.url,
        resourceType: r.data.resourceType || "raw",
        notes: pendingDocNote.trim() || undefined,
      });
      toast({ title: t("documentUploaded") });
      const docsRes = await axiosInstance
        .get(`/locations/${locationId}/documents`)
        .catch(() => null);
      if (docsRes) setDocuments(docsRes.data.documents);
      setShowDocUploadDialog(false);
      setPendingDocFile(null);
      setPendingDocNote("");
    } catch {
      toast({ title: t("documentUploadFailed"), variant: "destructive" });
    } finally {
      setIsDocUploading(false);
    }
  };

  const handleDocDelete = async (docId: string) => {
    if (!confirm(t("confirmDelete"))) return;
    try {
      await axiosInstance.delete(`/locations/${locationId}/documents/${docId}`);
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
      toast({ title: t("documentDeleted") });
    } catch {
      toast({ title: t("documentDeleteFailed"), variant: "destructive" });
    }
  };

  const openDocEdit = (doc: LocationDoc) => {
    setEditingDoc(doc);
    setEditDocName(doc.name);
    setEditDocNote(doc.notes || "");
  };

  const handleDocEditSave = async () => {
    if (!editingDoc) return;
    setIsSavingDoc(true);
    try {
      const res = await axiosInstance.put(
        `/locations/${locationId}/documents/${editingDoc.id}`,
        { name: editDocName, notes: editDocNote }
      );
      setDocuments((prev) =>
        prev.map((d) => (d.id === editingDoc.id ? res.data.document : d))
      );
      toast({ title: t("documentUpdated") });
      setEditingDoc(null);
    } catch {
      toast({ title: t("documentUpdateFailed"), variant: "destructive" });
    } finally {
      setIsSavingDoc(false);
    }
  };

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold">{t("documents")}</h2>
            <p className="text-sm text-muted-foreground">{t("documentsDesc")}</p>
          </div>
          <div>
            <input
              ref={docFileInputRef}
              type="file"
              className="hidden"
              accept="image/*,.pdf,.doc,.docx,.xlsx,.xls,.ppt,.pptx,.txt,.zip,.rar"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleDocFileSelected(file);
                e.target.value = "";
              }}
            />
            <Button
              disabled={isDocUploading}
              onClick={() => docFileInputRef.current?.click()}
            >
              {isDocUploading ? t("uploading") : `+ ${t("uploadDocument")}`}
            </Button>
          </div>
        </div>

        {documents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
            <FolderOpen className="h-10 w-10 opacity-30" />
            <p className="text-sm">{t("noDocuments")}</p>
          </div>
        ) : (
          <div className="rounded-xl border overflow-hidden">
            {documents.map((doc) => {
              const isImage = doc.resourceType === "image";
              return (
                <div key={doc.id} className="flex items-center gap-3 px-4 py-3 border-b last:border-b-0 hover:bg-muted/40">
                  <div className="shrink-0 text-xl">
                    {isImage ? "🖼️" : "📄"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium hover:underline truncate block"
                    >
                      {doc.name}
                    </a>
                    <div className="flex gap-3 text-xs text-muted-foreground mt-0.5">
                      {doc.uploadedByName && <span>{doc.uploadedByName}</span>}
                      <span>{new Date(doc.uploadedAt).toLocaleDateString()}</span>
                    </div>
                    {doc.notes && (
                      <p className="text-xs text-muted-foreground mt-1 italic">{doc.notes}</p>
                    )}
                  </div>
                  {isImage && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDocPreviewUrl(doc.url)}
                    >
                      👁
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openDocEdit(doc)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleDocDelete(doc.id)}
                  >
                    🗑️
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Image Preview Dialog ── */}
      {docPreviewUrl && (
        <Dialog open={!!docPreviewUrl} onOpenChange={() => setDocPreviewUrl(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{t("previewImage")}</DialogTitle>
            </DialogHeader>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={docPreviewUrl}
              alt="preview"
              className="w-full rounded-lg object-contain max-h-[70vh]"
            />
          </DialogContent>
        </Dialog>
      )}

      {/* ── Document Upload Dialog ── */}
      <Dialog
        open={showDocUploadDialog}
        onOpenChange={(open) => {
          if (!open) {
            setShowDocUploadDialog(false);
            setPendingDocFile(null);
            setPendingDocNote("");
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("uploadDocument")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
              <span className="text-xl">📄</span>
              <span className="text-sm font-medium truncate">{pendingDocFile?.name}</span>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">
                {t("documentNote")}{" "}
                <span className="text-muted-foreground font-normal text-xs">({t("optional")})</span>
              </label>
              <Textarea
                value={pendingDocNote}
                onChange={(e) => setPendingDocNote(e.target.value)}
                placeholder={t("documentNotePlaceholder")}
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button
                variant="outline"
                onClick={() => {
                  setShowDocUploadDialog(false);
                  setPendingDocFile(null);
                  setPendingDocNote("");
                }}
              >
                {t("cancel")}
              </Button>
              <Button onClick={handleDocUploadConfirm} disabled={isDocUploading}>
                {isDocUploading ? t("uploading") : t("upload")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Document Edit Dialog ── */}
      <Dialog open={!!editingDoc} onOpenChange={(open) => { if (!open) setEditingDoc(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("editDocument")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <label className="text-sm font-medium mb-1 block">{t("fileName")}</label>
              <Input
                value={editDocName}
                onChange={(e) => setEditDocName(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">
                {t("documentNote")}{" "}
                <span className="text-muted-foreground font-normal text-xs">({t("optional")})</span>
              </label>
              <Textarea
                value={editDocNote}
                onChange={(e) => setEditDocNote(e.target.value)}
                placeholder={t("documentNotePlaceholder")}
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => setEditingDoc(null)}>
                {t("cancel")}
              </Button>
              <Button onClick={handleDocEditSave} disabled={isSavingDoc}>
                {isSavingDoc ? t("saving") : t("saveChanges")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
