"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface FloatLabelInputProps extends React.ComponentProps<"input"> {
  label: string
  containerClassName?: string
  inputSize?: "default" | "sm"
}

const FloatLabelInput = React.forwardRef<HTMLInputElement, FloatLabelInputProps>(
  (
    {
      label,
      id,
      className,
      containerClassName,
      inputSize = "default",
      value,
      onFocus,
      onBlur,
      ...props
    },
    ref
  ) => {
    const generatedId = React.useId()
    const inputId = id || generatedId
    const [isFocused, setIsFocused] = React.useState(false)

    const hasValue = value !== undefined && String(value).length > 0
    const isFloated = isFocused || hasValue

    const isSm = inputSize === "sm"

    return (
      <div className={cn("relative", containerClassName)}>
        <input
          id={inputId}
          ref={ref}
          value={value}
          onFocus={(e) => {
            setIsFocused(true)
            onFocus?.(e)
          }}
          onBlur={(e) => {
            setIsFocused(false)
            onBlur?.(e)
          }}
          className={cn(
            "flex w-full rounded-md border border-input bg-transparent px-3 text-base shadow-sm transition-colors",
            "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
            "disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
            isSm ? "h-10 pt-4 pb-0.5 text-sm" : "h-12 pt-5 pb-1.5",
            className
          )}
          {...props}
        />
        <label
          htmlFor={inputId}
          className={cn(
            "absolute left-3 pointer-events-none transition-all duration-150 text-muted-foreground",
            isFloated
              ? isSm
                ? "top-1 text-[9px] leading-none"
                : "top-1.5 text-[10px] leading-none"
              : isSm
              ? "top-1/2 -translate-y-1/2 text-xs"
              : "top-1/2 -translate-y-1/2 text-sm"
          )}
        >
          {label}
        </label>
      </div>
    )
  }
)

FloatLabelInput.displayName = "FloatLabelInput"

export { FloatLabelInput }
