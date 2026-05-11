import * as React from "react"

import { cn } from "@/lib/utils"

type ToggleProps = Omit<React.ComponentProps<"button">, "onChange"> & {
  pressed?: boolean
  onPressedChange?: (pressed: boolean) => void
}

function Toggle({ className, pressed = false, onPressedChange, onClick, ...props }: ToggleProps) {
  return (
    <button
      type="button"
      data-state={pressed ? "on" : "off"}
      aria-pressed={pressed}
      className={cn("inline-flex items-center justify-center rounded-md px-2 py-1 text-sm transition-colors", className)}
      onClick={(e) => {
        onPressedChange?.(!pressed)
        onClick?.(e)
      }}
      {...props}
    />
  )
}

export { Toggle }
