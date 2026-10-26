"use client";

import { useRef, useState } from "react";
import { POST_CATEGORIES } from "@/lib/constants";
import { Avatar } from "@/components/Avatar";
import { SubmitButton } from "@/components/SubmitButton";
import { createPost } from "./actions";

export function Composer({ name, avatarUrl, isStaff }: { name: string; avatarUrl: string | null; isStaff: boolean }) {
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="card flex w-full items-center gap-3 p-4 text-left">
        <Avatar name={name} url={avatarUrl} size={40} />
        <span className="flex-1 rounded-full bg-zinc-100 px-4 py-2.5 text-sm text-zinc-500">Escribe algo...</span>
      </button>
    );
  }

  return (
    <form
      ref={formRef}
      action={async (formData) => {
        await createPost(formData);
        formRef.current?.reset();
        setOpen(false);
      }}
      className="card space-y-3 p-4"
    >
      <input name="title" required autoFocus placeholder="Título" className="input text-base font-semibold" />
      <textarea name="body" rows={5} placeholder="Comparte una pregunta, un logro o un recurso..." className="input" />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <select name="category" defaultValue="general" className="input w-auto py-1.5">
          {POST_CATEGORIES.filter((c) => !c.staffOnly || isStaff).map((c) => (
            <option key={c.id} value={c.id}>{c.label}</option>
          ))}
        </select>
        <div className="flex gap-2">
          <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>Cancelar</button>
          <SubmitButton pendingText="Publicando...">Publicar</SubmitButton>
        </div>
      </div>
    </form>
  );
}
