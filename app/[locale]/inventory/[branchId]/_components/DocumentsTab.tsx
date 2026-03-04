"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import axiosInstance from "@/utils/axiosInstance";
import { AttachmentSlots } from "@/components/ui/attachment-slots";
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
import { FolderOpen, Pencil, X } from "lucide-react";
import type { Location, LocationDoc } from "../_types";

const DOC_TYPES = ["GENERAL", "CONTRACT", "INVOICE", "REPORT", "PERMIT", "MANUAL", "PROCEDURE", "POLICY", "OTHER"] as const;

const DOC_TYPE_COLORS: Record<string, string> = {
  GENERAL:   "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  CONTRACT:  "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  INVOICE:   "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  REPORT:    "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  PERMIT:    "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  MANUAL:    "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300",
  PROCEDURE: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
  POLICY:    "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
  OTHER:     "bg-muted text-muted-foreground",
};

interface DocumentsTabProps {
  branchId: string;
  location: Location | null;
  documents: LocationDoc[];
  setDocuments: React.Dispatch<React.SetStateAction<LocationDoc[]>>;
}

export function DocumentsTab({
  branchId,
  location,
  documents,
  setDocuments,
}: DocumentsTabProps) {
  const t = useTranslations("inventory");
  const { toast } = useToast();

  // ── Upload dialog state ────────────────────────────────────────────
  const [showDocUploadDialog, setShowDocUploadDialog] = useState(false);
  const [docType, setDocType] = useState("GENERAL");
  const [docNote, setDocNote] = useState("");
  const [docFiles, setDocFiles] = useState<(File | null)[]>(Array(5).fill(null));
  const [isDocUploading, setIsDocUploading] = useState(false);

  // ── Edit dialog state ──────────────────────────────────────────────
  const [editingDoc, setEditingDoc] = useState<LocationDoc | null>(null);
  const [editDocName, setEditDocName] = useState("");
  const [editDocType, setEditDocType] = useState("GENERAL");
  const [editDocNote, setEditDocNote] = useState("");
  const [editExistingUrl, setEditExistingUrl] = useState<string | null>(null);
  const [editNewFiles, setEditNewFiles] = useState<(File | null)[]>(Array(4).fill(null));
  const [isSavingDoc, setIsSavingDoc] = useState(false);

  // ── Preview ────────────────────────────────────────────────────────
  const [docPreviewUrl, setDocPreviewUrl] = useState<string | null>(null);

  // ── Filter state ───────────────────────────────────────────────────
  const [docSearch, setDocSearch] = useState("");
  const [docTypeFilter, setDocTypeFilter] = useState("ALL");

  // ── Helpers ───────────────────────────────────────────────────────
  const docTypeLabel = (type: string | null) =>
    t((`doc${(type || "GENERAL").charAt(0) + (type || "GENERAL").slice(1).toLowerCase()}`) as Parameters<typeof t>[0]);

  const openUploadDialog = () => {
    setDocType("GENERAL");
    setDocNote("");
    setDocFiles(Array(5).fill(null));
    setShowDocUploadDialog(true);
  };

  const closeUploadDialog = () => {
    setShowDocUploadDialog(false);
    setDocType("GENERAL");
    setDocNote("");
    setDocFiles(Array(5).fill(null));
  };

  // ── Handlers ──────────────────────────────────────────────────────
  const handleDocUploadConfirm = async () => {
    const filesToUpload = docFiles.filter((f): f is File => f !== null);
    if (filesToUpload.length === 0) return;
    setIsDocUploading(true);
    try {
      const locName = location?.name || "general";
      for (const file of filesToUpload) {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("locationName", locName);
        fd.append("subfolder", "documents");
        const r = await axiosInstance.post("/upload", fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        await axiosInstance.post(`/locations/${branchId}/documents`, {
          name: file.name,
          url: r.data.url,
          resourceType: r.data.resourceType || "raw",
          type: docType,
          notes: docNote.trim() || undefined,
        });
      }
      toast({ title: t("documentUploaded") });
      const docsRes = await axiosInstance
        .get(`/locations/${branchId}/documents`)
        .catch(() => null);
      if (docsRes) setDocuments(docsRes.data.documents);
      closeUploadDialog();
    } catch {
      toast({ title: t("documentUploadFailed"), variant: "destructive" });
    } finally {
      setIsDocUploading(false);
    }
  };

  const handleDocDelete = async (docId: string) => {
    if (!confirm(t("confirmDelete"))) return;
    try {
      await axiosInstance.delete(`/locations/${branchId}/documents/${docId}`);
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
      toast({ title: t("documentDeleted") });
    } catch {
      toast({ title: t("documentDeleteFailed"), variant: "destructive" });
    }
  };

  const openDocEdit = (doc: LocationDoc) => {
    setEditingDoc(doc);
    setEditDocName(doc.name);
    setEditDocType(doc.type || "GENERAL");
    setEditDocNote(doc.notes || "");
    setEditExistingUrl(doc.url);
    setEditNewFiles(Array(4).fill(null));
  };

  const handleDocEditSave = async () => {
    if (!editingDoc) return;
    setIsSavingDoc(true);
    try {
      const locName = location?.name || "general";

      // 1. Existing file: update metadata or delete if removed
      if (editExistingUrl !== null) {
        const res = await axiosInstance.put(
          `/locations/${branchId}/documents/${editingDoc.id}`,
          { name: editDocName, notes: editDocNote, type: editDocType }
        );
        setDocuments((prev) =>
          prev.map((d) => (d.id === editingDoc.id ? res.data.document : d))
        );
      } else {
        await axiosInstance.delete(`/locations/${branchId}/documents/${editingDoc.id}`);
        setDocuments((prev) => prev.filter((d) => d.id !== editingDoc.id));
      }

      // 2. Upload new files (if any)
      const newFilesToUpload = editNewFiles.filter((f): f is File => f !== null);
      for (const file of newFilesToUpload) {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("locationName", locName);
        fd.append("subfolder", "documents");
        const r = await axiosInstance.post("/upload", fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        const newDocRes = await axiosInstance.post(`/locations/${branchId}/documents`, {
          name: file.name,
          url: r.data.url,
          resourceType: r.data.resourceType || "raw",
          type: editDocType,
          notes: editDocNote.trim() || undefined,
        });
        setDocuments((prev) => [newDocRes.data.document, ...prev]);
      }

      toast({ title: t("documentUpdated") });
      setEditingDoc(null);
    } catch {
      toast({ title: t("documentUpdateFailed"), variant: "destructive" });
    } finally {
      setIsSavingDoc(false);
    }
  };

  const hasFiles = docFiles.some((f) => f !== null);

  // ── Filtered documents ─────────────────────────────────────────────
  const filteredDocuments = useMemo(() => {
    const q = docSearch.trim().toLowerCase();
    return documents.filter((d) => {
      if (docTypeFilter !== "ALL" && (d.type || "GENERAL") !== docTypeFilter) return false;
      if (q && !d.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [documents, docSearch, docTypeFilter]);

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold">{t("documents")}</h2>
            <p className="text-sm text-muted-foreground">{t("documentsDesc")}</p>
          </div>
          <Button onClick={openUploadDialog} disabled={isDocUploading}>
            {isDocUploading ? t("uploading") : `+ ${t("uploadDocument")}`}
          </Button>
        </div>

        {/* ── Filter bar ── */}
        {documents.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-40">
              <Input
                placeholder={t("search")}
                value={docSearch}
                onChange={(e) => setDocSearch(e.target.value)}
                className="pr-7"
              />
              {docSearch && (
                <button
                  onClick={() => setDocSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <Select value={docTypeFilter} onValueChange={setDocTypeFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{t("allTypes")}</SelectItem>
                {DOC_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {docTypeLabel(type)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="self-center text-xs text-muted-foreground whitespace-nowrap">
              {filteredDocuments.length}/{documents.length}
            </span>
          </div>
        )}

        {filteredDocuments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
            <FolderOpen className="h-10 w-10 opacity-30" />
            <p className="text-sm">{documents.length === 0 ? t("noDocuments") : t("noResults")}</p>
          </div>
        ) : (
          <div className="rounded-xl border overflow-hidden">
            {filteredDocuments.map((doc) => {
              const isImage = doc.resourceType === "image";
              return (
                <div key={doc.id} className="flex items-center gap-3 px-4 py-3 border-b last:border-b-0 hover:bg-muted/40">
                  <div className="shrink-0 text-xl">
                    {isImage ? "🖼️" : "📄"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium hover:underline truncate"
                      >
                        {doc.name}
                      </a>
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium shrink-0 ${DOC_TYPE_COLORS[doc.type || "GENERAL"] || DOC_TYPE_COLORS.OTHER}`}>
                        {docTypeLabel(doc.type)}
                      </span>
                    </div>
                    <div className="flex gap-3 text-xs text-muted-foreground mt-0.5">
                      {doc.uploadedByName && <span>{doc.uploadedByName}</span>}
                      <span>{new Date(doc.uploadedAt).toLocaleDateString()}</span>
                    </div>
                    {doc.notes && (
                      <p className="text-xs text-muted-foreground mt-1 italic whitespace-pre-wrap">{doc.notes}</p>
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
      <Dialog open={showDocUploadDialog} onOpenChange={(open) => { if (!open) closeUploadDialog(); }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("uploadDocument")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            {/* Type */}
            <div>
              <label className="text-sm font-medium mb-1 block">{t("documentType")}</label>
              <Select value={docType} onValueChange={setDocType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DOC_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {docTypeLabel(type)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* Note */}
            <div>
              <label className="text-sm font-medium mb-1 block">
                {t("documentNote")}{" "}
                <span className="text-muted-foreground font-normal text-xs">({t("optional")})</span>
              </label>
              <Textarea
                value={docNote}
                onChange={(e) => setDocNote(e.target.value)}
                placeholder={t("documentNotePlaceholder")}
                rows={2}
              />
            </div>
            {/* Attachments */}
            <div>
              <label className="text-sm font-medium mb-2 block">{t("attachments")}</label>
              <AttachmentSlots
                files={docFiles}
                onChange={setDocFiles}
                accept="image/*,.pdf,.doc,.docx,.xlsx,.xls,.ppt,.pptx,.txt,.zip,.rar"
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={closeUploadDialog} disabled={isDocUploading}>
                {t("cancel")}
              </Button>
              <Button onClick={handleDocUploadConfirm} disabled={isDocUploading || !hasFiles}>
                {isDocUploading ? t("uploading") : t("upload")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Document Edit Dialog ── */}
      <Dialog open={!!editingDoc} onOpenChange={(open) => { if (!open) setEditingDoc(null); }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("editDocument")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            {/* File name (only when existing file is kept) */}
            {editExistingUrl !== null && (
              <div>
                <label className="text-sm font-medium mb-1 block">{t("fileName")}</label>
                <Input
                  value={editDocName}
                  onChange={(e) => setEditDocName(e.target.value)}
                />
              </div>
            )}
            {/* Type */}
            <div>
              <label className="text-sm font-medium mb-1 block">{t("documentType")}</label>
              <Select value={editDocType} onValueChange={setEditDocType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DOC_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {docTypeLabel(type)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* Note */}
            <div>
              <label className="text-sm font-medium mb-1 block">
                {t("documentNote")}{" "}
                <span className="text-muted-foreground font-normal text-xs">({t("optional")})</span>
              </label>
              <Textarea
                value={editDocNote}
                onChange={(e) => setEditDocNote(e.target.value)}
                placeholder={t("documentNotePlaceholder")}
                rows={2}
              />
            </div>
            {/* Attachments */}
            <div>
              <label className="text-sm font-medium mb-2 block">{t("attachments")}</label>
              <div className="flex gap-2 flex-wrap">
                {/* Existing file slot */}
                {editExistingUrl !== null && (
                  <div className="relative w-14 h-14 shrink-0">
                    <div className="w-14 h-14 rounded-lg border overflow-hidden">
                      {editingDoc?.resourceType === "image" ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={editExistingUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-muted gap-0.5 p-1">
                          <span className="text-base leading-none">📄</span>
                          <span className="text-[8px] text-muted-foreground text-center line-clamp-2 leading-tight break-all">
                            {editDocName}
                          </span>
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditExistingUrl(null)}
                      className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-destructive text-white text-[11px] font-bold flex items-center justify-center leading-none shadow hover:bg-destructive/80 transition-colors z-10"
                      aria-label="Remove file"
                    >
                      ×
                    </button>
                  </div>
                )}
                {/* New file slots */}
                <AttachmentSlots
                  files={editNewFiles}
                  onChange={setEditNewFiles}
                  maxSlots={editExistingUrl !== null ? 4 : 5}
                  accept="image/*,.pdf,.doc,.docx,.xlsx,.xls,.ppt,.pptx,.txt,.zip,.rar"
                />
              </div>
              {editExistingUrl === null && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1.5">
                  {t("existingFileRemoved")}
                </p>
              )}
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => setEditingDoc(null)} disabled={isSavingDoc}>
                {t("cancel")}
              </Button>
              <Button onClick={handleDocEditSave} disabled={isSavingDoc}>
                {isSavingDoc ? t("uploading") : t("saveChanges")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
