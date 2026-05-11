import * as React from "react"

import { cn } from "@/lib/utils"

type SelectContextValue = {
  value: string
  setValue: (value: string) => void
  open: boolean
  setOpen: (open: boolean) => void
}

const SelectContext = React.createContext<SelectContextValue | null>(null)

function Select({
  value,
  onValueChange,
  children,
}: {
  value?: string
  onValueChange?: (value: string) => void
  children: React.ReactNode
}) {
  const [open, setOpen] = React.useState(false)
  const currentValue = value ?? ""

  return (
    <SelectContext.Provider
      value={{
        value: currentValue,
        setValue: (next) => onValueChange?.(next),
        open,
        setOpen,
      }}
    >
      <div className="relative">{children}</div>
    </SelectContext.Provider>
  )
}

function SelectTrigger({ className, children, ...props }: React.ComponentProps<"button">) {
  const context = React.useContext(SelectContext)
  if (!context) return null
  return (
    <button
      type="button"
      className={cn("flex w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm", className)}
      onClick={() => context.setOpen(!context.open)}
      {...props}
    >
      {children}
    </button>
  )
}

function SelectValue({ placeholder }: { placeholder?: string }) {
  const context = React.useContext(SelectContext)
  if (!context) return null
  return <span>{context.value || placeholder}</span>
}

function SelectContent({ className, children, ...props }: React.ComponentProps<"div">) {
  const context = React.useContext(SelectContext)
  if (!context || !context.open) return null
  return (
    <div className={cn("absolute z-50 mt-1 w-full rounded-md border bg-popover p-1 shadow-md", className)} {...props}>
      {children}
    </div>
  )
}

function SelectItem({ className, value, children, ...props }: React.ComponentProps<"button"> & { value: string }) {
  const context = React.useContext(SelectContext)
  if (!context) return null
  const selected = context.value === value
  return (
    <button
      type="button"
      className={cn("block w-full rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent", selected && "bg-accent", className)}
      onClick={() => {
        context.setValue(value)
        context.setOpen(false)
      }}
      {...props}
    >
      {children}
    </button>
  )
}

export { Select, SelectTrigger, SelectValue, SelectContent, SelectItem }
