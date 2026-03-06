"use client"

import * as React from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useTranslations } from "next-intl"

interface DeleteConfirmDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  isDeleting?: boolean
  title?: string
  description?: string
  confirmText: string
}

export function DeleteConfirmDialog({
  open,
  onClose,
  onConfirm,
  isDeleting = false,
  title,
  description,
  confirmText,
}: DeleteConfirmDialogProps) {
  const t = useTranslations("common")
  const [inputValue, setInputValue] = React.useState("")

  React.useEffect(() => {
    if (open) setInputValue("")
  }, [open])

  const isMatch = inputValue === confirmText

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-destructive">
            {title ?? t("deleteConfirmTitle")}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
          <p className="text-sm text-muted-foreground">{t("deleteConfirmWarning")}</p>
          <code className="block bg-muted px-3 py-2 rounded text-sm font-mono break-all">
            {confirmText}
          </code>
          <p className="text-sm">{t("typeToConfirm")}</p>
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={confirmText}
            autoFocus
            onKeyDown={(e) => { if (e.key === "Enter" && isMatch && !isDeleting) onConfirm() }}
          />
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={onClose} disabled={isDeleting}>
              {t("cancel")}
            </Button>
            <Button
              variant="destructive"
              disabled={!isMatch || isDeleting}
              onClick={onConfirm}
            >
              {isDeleting ? "..." : t("delete")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
