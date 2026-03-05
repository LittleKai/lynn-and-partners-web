"use client"

import * as React from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { useTranslations } from "next-intl"

interface ImagePreviewDialogProps {
  images: string[]
  initialIndex: number
  open: boolean
  onClose: () => void
}

export function ImagePreviewDialog({ images, initialIndex, open, onClose }: ImagePreviewDialogProps) {
  const t = useTranslations("common")
  const [index, setIndex] = React.useState(initialIndex)

  React.useEffect(() => {
    if (open) setIndex(initialIndex)
  }, [initialIndex, open])

  if (!images.length) return null

  const canPrev = index > 0
  const canNext = index < images.length - 1

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {t("previewImage")}
            {images.length > 1 && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                {index + 1} / {images.length}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={images[index]}
            alt="preview"
            className="w-full rounded-lg object-contain max-h-[70vh]"
          />
          {images.length > 1 && (
            <>
              <Button
                variant="outline"
                size="icon"
                className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-background/80 backdrop-blur"
                onClick={() => setIndex((i) => i - 1)}
                disabled={!canPrev}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-background/80 backdrop-blur"
                onClick={() => setIndex((i) => i + 1)}
                disabled={!canNext}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
