"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { XIcon } from "lucide-react"

type DialogContextValue = { open: boolean; onOpenChange?: (open: boolean) => void }
const DialogContext = React.createContext<DialogContextValue>({ open: false })

function Dialog({ open = false, onOpenChange, children }: { open?: boolean; onOpenChange?: (open: boolean) => void; children: React.ReactNode }) {
  return <DialogContext.Provider value={{ open, onOpenChange }}>{children}</DialogContext.Provider>
}

function DialogTrigger({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const ctx = React.useContext(DialogContext)
  return <button type="button" {...props} onClick={(e) => { props.onClick?.(e); if (!e.defaultPrevented) ctx.onOpenChange?.(true) }}>{children}</button>
}

function DialogClose({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const ctx = React.useContext(DialogContext)
  return <button type="button" {...props} onClick={(e) => { props.onClick?.(e); if (!e.defaultPrevented) ctx.onOpenChange?.(false) }}>{children}</button>
}

function DialogPortal({ children }: { children?: React.ReactNode }) { return <>{children}</> }
function DialogOverlay({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("fixed inset-0 z-50 bg-black/20 backdrop-blur-[1px]", className)} {...props} />
}

function DialogContent({ className, children, showCloseButton = true, ...props }: React.HTMLAttributes<HTMLDivElement> & { showCloseButton?: boolean }) {
  const ctx = React.useContext(DialogContext)
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])
  React.useEffect(() => {
    if (!ctx.open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") ctx.onOpenChange?.(false) }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [ctx])
  if (!ctx.open || !mounted) return null
  return createPortal(
    <>
      <DialogOverlay onClick={() => ctx.onOpenChange?.(false)} />
      <div
        role="dialog"
        aria-modal="true"
        className={cn("fixed left-1/2 top-1/2 z-50 grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-4 rounded-xl bg-popover p-4 text-sm text-popover-foreground shadow-xl ring-1 ring-foreground/10 sm:max-w-sm", className)}
        {...props}
      >
        {children}
        {showCloseButton && <Button variant="ghost" className="absolute right-2 top-2" size="icon-sm" onClick={() => ctx.onOpenChange?.(false)}><XIcon /><span className="sr-only">閉じる</span></Button>}
      </div>
    </>, document.body,
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) { return <div className={cn("flex flex-col gap-2", className)} {...props} /> }
function DialogFooter({ className, ...props }: React.ComponentProps<"div">) { return <div className={cn("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)} {...props} /> }
function DialogTitle({ className, ...props }: React.ComponentProps<"h2">) { return <h2 className={cn("text-base font-medium leading-none", className)} {...props} /> }
function DialogDescription({ className, ...props }: React.ComponentProps<"p">) { return <p className={cn("text-sm text-muted-foreground", className)} {...props} /> }

export { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogOverlay, DialogPortal, DialogTitle, DialogTrigger }
