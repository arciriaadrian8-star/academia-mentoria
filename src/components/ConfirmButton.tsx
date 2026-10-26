"use client";

import { useFormStatus } from "react-dom";
import { cn } from "@/lib/utils";

/** Botón de envío que pide confirmación antes (para borrar cosas). */
export function ConfirmButton({
  message,
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { message: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={cn("btn btn-danger", className)}
      onClick={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
      {...props}
    >
      {children}
    </button>
  );
}
