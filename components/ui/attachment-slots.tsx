"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { useTranslations } from "next-intl"
import { MediaPreviewDialog, type MediaPreviewItem } from "@/components/ui/media-preview-dialog"

const MAX_SLOTS = 5

interface AttachmentSlotsProps {
  files: (File | null)[]
  onChange: (files: (File | null)[]) => void
  accept?: string
  className?: string
  maxSlots?: number
}

export function AttachmentSlots({
  files,
  onChange,
  accept = "image/*,.pdf,.doc,.docx,.xlsx",
  className,
  maxSlots = MAX_SLOTS,
}: AttachmentSlotsProps) {
  const t = useTranslations("common")
  const [error, setError] = React.useState<string | null>(null)
  const [previewIndex, setPreviewIndex] = React.useState<number | null>(null)

  // Collect image and video entries for preview navigation
  const mediaEntries = React.useMemo(
    () =>
      files
        .map((f, slotIndex) => ({ f, slotIndex }))
        .filter((x): x is { f: File; slotIndex: number } =>
          x.f !== null && (x.f.type.startsWith("image/") || x.f.type.startsWith("video/"))
        ),
    [files]
  )
  const mediaItems = React.useMemo<MediaPreviewItem[]>(
    () =>
      mediaEntries.map(({ f }) => ({
        url: URL.createObjectURL(f),
        type: f.type.startsWith("video/") ? "video" : "image",
        name: f.name,
      })),
    [mediaEntries]
  )

  const handleFileChange = (i: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? [])
    e.target.value = ""
    if (!selected.length) return

    const existingCount = files.filter(Boolean).length
    if (existingCount + selected.length > maxSlots) {
      setError(t("attachmentMaxError", { max: maxSlots }))
      return
    }

    setError(null)
    const next = [...files]

    // Collect empty slot indices starting from i, then wrapping around
    const emptySlots: number[] = []
    for (let j = i; j < maxSlots; j++) {
      if (!next[j]) emptySlots.push(j)
    }
    for (let j = 0; j < i; j++) {
      if (!next[j]) emptySlots.push(j)
    }

    selected.forEach((file, idx) => {
      if (idx < emptySlots.length) next[emptySlots[idx]] = file
    })

    onChange(next)
  }

  const handleRemove = (i: number) => {
    const next = [...files]
    next[i] = null
    setError(null)
    onChange(next)
  }

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex gap-2 flex-wrap">
        {Array.from({ length: maxSlots }, (_, i) => {
          const file = files[i] ?? null
          const isImage = file?.type.startsWith("image/")
          const isVideoFile = file?.type.startsWith("video/")
          const isPreviewable = isImage || isVideoFile

          return (
            <div key={i} className="relative w-14 h-14 shrink-0">
              {file ? (
                <div
                  className={cn(
                    "w-14 h-14 rounded-lg border overflow-hidden",
                    isPreviewable ? "cursor-pointer" : "cursor-default"
                  )}
                  onClick={() => {
                    if (isPreviewable) {
                      const mediaIdx = mediaEntries.findIndex((e) => e.slotIndex === i)
                      if (mediaIdx !== -1) setPreviewIndex(mediaIdx)
                    }
                  }}
                >
                  {isImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={URL.createObjectURL(file)}
                      alt={file.name}
                      className="w-full h-full object-cover"
                    />
                  ) : isVideoFile ? (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-muted gap-0.5 p-1">
                      <span className="text-base leading-none">🎬</span>
                      <span className="text-[8px] text-muted-foreground text-center line-clamp-2 leading-tight break-all">
                        {file.name}
                      </span>
                    </div>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-muted gap-0.5 p-1">
                      <span className="text-base leading-none">📄</span>
                      <span className="text-[8px] text-muted-foreground text-center line-clamp-2 leading-tight break-all">
                        {file.name}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <label className="w-14 h-14 rounded-lg border-2 border-dashed border-muted-foreground/30 flex items-center justify-center cursor-pointer hover:border-primary/60 hover:bg-muted/30 transition-colors">
                  <span className="text-2xl font-light text-muted-foreground/40 leading-none select-none">
                    +
                  </span>
                  <input
                    type="file"
                    accept={accept}
                    multiple
                    className="hidden"
                    onChange={(e) => handleFileChange(i, e)}
                  />
                </label>
              )}

              {file && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleRemove(i)
                  }}
                  className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-destructive text-white text-[11px] font-bold flex items-center justify-center leading-none shadow hover:bg-destructive/80 transition-colors z-10"
                  aria-label="Remove file"
                >
                  ×
                </button>
              )}
            </div>
          )
        })}
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      <MediaPreviewDialog
        items={mediaItems}
        initialIndex={previewIndex ?? 0}
        open={previewIndex !== null}
        onClose={() => setPreviewIndex(null)}
      />
    </div>
  )
}
