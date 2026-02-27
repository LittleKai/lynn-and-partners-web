"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

const MAX_SLOTS = 5

interface AttachmentSlotsProps {
  files: (File | null)[]
  onChange: (files: (File | null)[]) => void
  onPreview?: (url: string) => void
  accept?: string
  className?: string
}

export function AttachmentSlots({
  files,
  onChange,
  onPreview,
  accept = "image/*,.pdf,.doc,.docx,.xlsx",
  className,
}: AttachmentSlotsProps) {
  const handleFileChange = (i: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null
    if (!file) return
    const next = [...files]
    next[i] = file
    onChange(next)
    e.target.value = ""
  }

  const handleRemove = (i: number) => {
    const next = [...files]
    next[i] = null
    onChange(next)
  }

  return (
    <div className={cn("flex gap-2 flex-wrap", className)}>
      {Array.from({ length: MAX_SLOTS }, (_, i) => {
        const file = files[i] ?? null
        const isImage = file?.type.startsWith("image/")

        return (
          <div key={i} className="relative w-14 h-14 shrink-0">
            {file ? (
              <div
                className={cn(
                  "w-14 h-14 rounded-lg border overflow-hidden",
                  isImage && onPreview ? "cursor-pointer" : "cursor-default"
                )}
                onClick={() => {
                  if (isImage && onPreview) {
                    onPreview(URL.createObjectURL(file))
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
  )
}
