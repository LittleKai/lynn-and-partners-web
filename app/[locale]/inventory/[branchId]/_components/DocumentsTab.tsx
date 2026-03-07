"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import axiosInstance from "@/utils/axiosInstance";
import { directUpload } from "@/utils/directUpload";
import { reportDevError } from "@/utils/reportDevError";
import { AttachmentSlots } from "@/components/ui/attachment-slots";
import { MediaPreviewDialog, type MediaPreviewItem } from "@/components/ui/media-preview-dialog";
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
import { FolderOpen, Paperclip, Pencil, X } from "lucide-react";
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

  // ── Upload dialog ──────────────────────────────────────────────────
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploadName, setUploadName] = useState("");
  const [uploadType, setUploadType] = useState("GENERAL");
  const [uploadNote, setUploadNote] = useState("");
  const [uploadFiles, setUploadFiles] = useState<(File | null)[]>(Array(10).fill(null));
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ file: number; total: number; pct: number } | null>(null);

  // ── Edit dialog ────────────────────────────────────────────────────
  const [editingDoc, setEditingDoc] = useState<LocationDoc | null>(null);
  const [editName, setEditName] = useState("");
  const [editType, setEditType] = useState("GENERAL");
  const [editNote, setEditNote] = useState("");
  const [editExistingUrls, setEditExistingUrls] = useState<string[]>([]);
  const [editExistingResourceTypes, setEditExistingResourceTypes] = useState<string[]>([]);
  const [editNewFiles, setEditNewFiles] = useState<(File | null)[]>(Array(10).fill(null));
  const [isSaving, setIsSaving] = useState(false);

  // ── Attachments viewer ─────────────────────────────────────────────
  const [viewingDoc, setViewingDoc] = useState<LocationDoc | null>(null);

  // ── Media preview ──────────────────────────────────────────────────
  const [previewItems, setPreviewItems] = useState<MediaPreviewItem[]>([]);
  const [previewIndex, setPreviewIndex] = useState(0);

  // ── Filter ─────────────────────────────────────────────────────────
  const [docSearch, setDocSearch] = useState("");
  const [docTypeFilter, setDocTypeFilter] = useState("ALL");

  // ── Helpers ───────────────────────────────────────────────────────
  const docTypeLabel = (type: string | null) =>
    t((`doc${(type || "GENERAL").charAt(0) + (type || "GENERAL").slice(1).toLowerCase()}`) as Parameters<typeof t>[0]);

  const openUploadDialog = () => {
    setUploadName("");
    setUploadType("GENERAL");
    setUploadNote("");
    setUploadFiles(Array(10).fill(null));
    setShowUploadDialog(true);
  };

  const closeUploadDialog = () => {
    setShowUploadDialog(false);
    setUploadName("");
    setUploadType("GENERAL");
    setUploadNote("");
    setUploadFiles(Array(10).fill(null));
  };

  const handleUploadFilesChange = (files: (File | null)[]) => {
    setUploadFiles(files);
    if (!uploadName) {
      const first = files.find((f) => f !== null);
      if (first) setUploadName(first.name.replace(/\.[^.]+$/, ""));
    }
  };

  const handleUploadConfirm = async () => {
    const filesToUpload = uploadFiles.filter((f): f is File => f !== null);
    if (filesToUpload.length === 0 || !uploadName.trim()) return;
    setIsUploading(true);
    setUploadProgress(null);
    try {
      const locName = location?.name || "general";
      const urls: string[] = [];
      const resourceTypes: string[] = [];

      for (let idx = 0; idx < filesToUpload.length; idx++) {
        const file = filesToUpload[idx];
        const { url, resourceType } = await directUpload(file, locName, "documents", (p) => {
          setUploadProgress({ file: idx + 1, total: filesToUpload.length, pct: p.percent });
        });
        urls.push(url);
        resourceTypes.push(resourceType || "raw");
      }

      const res = await axiosInstance.post(`/locations/${branchId}/documents`, {
        name: uploadName.trim(),
        urls,
        resourceTypes,
        type: uploadType,
        notes: uploadNote.trim() || undefined,
      });

      setDocuments((prev) => [res.data.document, ...prev]);
      toast({ title: t("documentUploaded") });
      closeUploadDialog();
    } catch (err: unknown) {
      reportDevError("DocumentsTab.handleUploadConfirm", err);
      const e = err as { response?: { data?: { error?: unknown; detail?: unknown } }; message?: string };
      const rawDesc = e.response?.data?.detail ?? e.response?.data?.error ?? e.message;
      const desc = typeof rawDesc === "string" ? rawDesc : undefined;
      toast({
        title: t("documentUploadFailed"),
        description: desc,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
    }
  };

  const openDocEdit = (doc: LocationDoc) => {
    setEditingDoc(doc);
    setEditName(doc.name);
    setEditType(doc.type || "GENERAL");
    setEditNote(doc.notes || "");
    setEditExistingUrls([...(doc.urls ?? [])]);
    setEditExistingResourceTypes([...(doc.resourceTypes ?? [])]);
    setEditNewFiles(Array(10).fill(null));
  };

  const handleEditSave = async () => {
    if (!editingDoc) return;
    const newFiles = editNewFiles.filter((f): f is File => f !== null);
    setIsSaving(true);
    setUploadProgress(null);
    try {
      const locName = location?.name || "general";
      const newUrls: string[] = [];
      const newResourceTypes: string[] = [];

      for (let idx = 0; idx < newFiles.length; idx++) {
        const file = newFiles[idx];
        const { url, resourceType } = await directUpload(file, locName, "documents", (p) => {
          setUploadProgress({ file: idx + 1, total: newFiles.length, pct: p.percent });
        });
        newUrls.push(url);
        newResourceTypes.push(resourceType || "raw");
      }

      const res = await axiosInstance.put(
        `/locations/${branchId}/documents/${editingDoc.id}`,
        {
          name: editName.trim() || editingDoc.name,
          notes: editNote,
          type: editType,
          urls: [...editExistingUrls, ...newUrls],
          resourceTypes: [...editExistingResourceTypes, ...newResourceTypes],
        }
      );

      setDocuments((prev) =>
        prev.map((d) => (d.id === editingDoc.id ? res.data.document : d))
      );
      toast({ title: t("documentUpdated") });
      setEditingDoc(null);
    } catch (err: unknown) {
      reportDevError("DocumentsTab.handleEditSave", err);
      const e = err as { response?: { data?: { error?: unknown; detail?: unknown } }; message?: string };
      const rawDesc = e.response?.data?.detail ?? e.response?.data?.error ?? e.message;
      const desc = typeof rawDesc === "string" ? rawDesc : undefined;
      toast({
        title: t("documentUpdateFailed"),
        description: desc,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
      setUploadProgress(null);
    }
  };

  const removeExistingAttachment = (index: number) => {
    setEditExistingUrls((prev) => prev.filter((_, i) => i !== index));
    setEditExistingResourceTypes((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDocDelete = async (docId: string, docName: string) => {
    if (!confirm(t("confirmDelete"))) return;
    try {
      await axiosInstance.delete(`/locations/${branchId}/documents/${docId}`);
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
      toast({ title: t("documentDeleted") });
    } catch {
      toast({ title: t("documentDeleteFailed"), variant: "destructive" });
    }
  };

  const openPreview = (doc: LocationDoc, startIndex: number) => {
    const items: MediaPreviewItem[] = (doc.urls ?? []).map((url, i) => ({
      url,
      type: doc.resourceTypes[i] === "video" ? "video" : "image",
      name: doc.name,
    }));
    setPreviewItems(items);
    setPreviewIndex(startIndex);
  };

  const filteredDocuments = useMemo(() => {
    const q = docSearch.trim().toLowerCase();
    return documents.filter((d) => {
      if (docTypeFilter !== "ALL" && (d.type || "GENERAL") !== docTypeFilter) return false;
      if (q && !d.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [documents, docSearch, docTypeFilter]);

  const hasFiles = uploadFiles.some((f) => f !== null);

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold">{t("documents")}</h2>
            <p className="text-sm text-muted-foreground">{t("documentsDesc")}</p>
          </div>
          <Button onClick={openUploadDialog} disabled={isUploading}>
            {isUploading ? t("uploading") : `+ ${t("uploadDocument")}`}
          </Button>
        </div>

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
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{t("allTypes")}</SelectItem>
                {DOC_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>{docTypeLabel(type)}</SelectItem>
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
              const docUrls = doc.urls ?? [];
              const docResourceTypes = doc.resourceTypes ?? [];
              const attachCount = docUrls.length;
              return (
                <div key={doc.id} className="flex items-center gap-3 px-4 py-3 border-b last:border-b-0 hover:bg-muted/40">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium truncate">{doc.name}</span>
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
                  {attachCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-muted-foreground hover:text-foreground shrink-0"
                      onClick={() => setViewingDoc(doc)}
                    >
                      <Paperclip className="h-3.5 w-3.5" />
                      <span className="ml-1 text-xs tabular-nums">{attachCount}</span>
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => openDocEdit(doc)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleDocDelete(doc.id, doc.name)}
                  >
                    🗑️
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Attachments Viewer Dialog ── */}
      <Dialog open={!!viewingDoc} onOpenChange={(open) => { if (!open) setViewingDoc(null); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{viewingDoc?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {viewingDoc && (() => {
              const vUrls = viewingDoc.urls ?? [];
              const vTypes = viewingDoc.resourceTypes ?? [];
              return (
                <>
                  {vUrls.some((_, i) => vTypes[i] === "image") && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2">{t("previewImage")}</p>
                      <div className="grid grid-cols-3 gap-2">
                        {vUrls.map((url, i) => {
                          if (vTypes[i] !== "image") return null;
                          return (
                            <button key={i} onClick={() => openPreview(viewingDoc, i)} className="aspect-square rounded-lg overflow-hidden border hover:opacity-80 transition-opacity">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={url} alt="" className="w-full h-full object-cover" />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {vUrls.some((_, i) => vTypes[i] === "video") && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2">{t("files")}</p>
                      <div className="space-y-1">
                        {vUrls.map((url, i) => {
                          if (vTypes[i] !== "video") return null;
                          return (
                            <button key={i} onClick={() => openPreview(viewingDoc, i)} className="flex items-center gap-2 text-sm text-primary hover:underline">
                              <span>🎬</span>
                              <span className="truncate">{decodeURIComponent(url.split("/").pop() || `Video ${i + 1}`)}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {vUrls.some((_, i) => vTypes[i] === "raw") && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2">{t("files")}</p>
                      <div className="space-y-1">
                        {vUrls.map((url, i) => {
                          if (vTypes[i] !== "raw") return null;
                          return (
                            <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-primary hover:underline">
                              <Paperclip className="h-3.5 w-3.5 shrink-0" />
                              <span className="truncate">{decodeURIComponent(url.split("/").pop() || `File ${i + 1}`)}</span>
                            </a>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Media Preview Dialog ── */}
      <MediaPreviewDialog
        items={previewItems}
        initialIndex={previewIndex}
        open={previewItems.length > 0}
        onClose={() => setPreviewItems([])}
      />

      {/* ── Upload Dialog ── */}
      <Dialog open={showUploadDialog} onOpenChange={(open) => { if (!open) closeUploadDialog(); }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("uploadDocument")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <label className="text-sm font-medium mb-1 block">{t("fileName")}</label>
              <Input value={uploadName} onChange={(e) => setUploadName(e.target.value)} placeholder={t("documentNamePlaceholder")} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">{t("documentType")}</label>
              <Select value={uploadType} onValueChange={setUploadType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DOC_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>{docTypeLabel(type)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">
                {t("documentNote")}{" "}
                <span className="text-muted-foreground font-normal text-xs">({t("optional")})</span>
              </label>
              <Textarea value={uploadNote} onChange={(e) => setUploadNote(e.target.value)} placeholder={t("documentNotePlaceholder")} rows={2} />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">{t("attachments")}</label>
              <AttachmentSlots
                files={uploadFiles}
                onChange={handleUploadFilesChange}
                accept="image/*,video/*,.pdf,.doc,.docx,.xlsx,.xls,.ppt,.pptx,.txt,.zip,.rar,.csv"
                maxSlots={10}
              />
            </div>
            {uploadProgress && (
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">
                  Đang tải lên {uploadProgress.file}/{uploadProgress.total}... {uploadProgress.pct}%
                </p>
                <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-200"
                    style={{ width: `${uploadProgress.pct}%` }}
                  />
                </div>
              </div>
            )}
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={closeUploadDialog} disabled={isUploading}>{t("cancel")}</Button>
              <Button onClick={handleUploadConfirm} disabled={isUploading || !hasFiles || !uploadName.trim()}>
                {isUploading ? t("uploading") : t("upload")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Edit Dialog ── */}
      <Dialog open={!!editingDoc} onOpenChange={(open) => { if (!open) setEditingDoc(null); }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("editDocument")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <label className="text-sm font-medium mb-1 block">{t("fileName")}</label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">{t("documentType")}</label>
              <Select value={editType} onValueChange={setEditType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DOC_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>{docTypeLabel(type)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">
                {t("documentNote")}{" "}
                <span className="text-muted-foreground font-normal text-xs">({t("optional")})</span>
              </label>
              <Textarea value={editNote} onChange={(e) => setEditNote(e.target.value)} placeholder={t("documentNotePlaceholder")} rows={2} />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">{t("attachments")}</label>
              <div className="flex gap-2 flex-wrap">
                {editExistingUrls.map((url, i) => {
                  const rType = editExistingResourceTypes[i] || "raw";
                  const fileName = decodeURIComponent(url.split("/").pop() || `File ${i + 1}`);
                  return (
                    <div key={i} className="relative w-14 h-14 shrink-0">
                      <div className="w-14 h-14 rounded-lg border overflow-hidden">
                        {rType === "image" ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center bg-muted gap-0.5 p-1">
                            <span className="text-base leading-none">{rType === "video" ? "🎬" : "📄"}</span>
                            <span className="text-[8px] text-muted-foreground text-center line-clamp-2 leading-tight break-all">{fileName}</span>
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeExistingAttachment(i)}
                        className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-destructive text-white text-[11px] font-bold flex items-center justify-center leading-none shadow hover:bg-destructive/80 transition-colors z-10"
                        aria-label="Remove"
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
                <AttachmentSlots
                  files={editNewFiles}
                  onChange={setEditNewFiles}
                  maxSlots={Math.max(1, 10 - editExistingUrls.length)}
                  accept="image/*,video/*,.pdf,.doc,.docx,.xlsx,.xls,.ppt,.pptx,.txt,.zip,.rar,.csv"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => setEditingDoc(null)} disabled={isSaving}>{t("cancel")}</Button>
              <Button onClick={handleEditSave} disabled={isSaving}>
                {isSaving ? t("uploading") : t("saveChanges")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
