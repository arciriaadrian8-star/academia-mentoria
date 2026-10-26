import { requireActive } from "@/lib/auth";
import { FormMessage } from "@/components/FormMessage";
import { ImageUpload } from "@/components/ImageUpload";
import { PageHeader } from "@/components/PageHeader";
import { SubmitButton } from "@/components/SubmitButton";
import { updateProfile } from "./actions";
import { PasswordForm } from "./PasswordForm";

export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ guardado?: string }> }) {
  const { guardado } = await searchParams;
  const { profile, user } = await requireActive();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title="Mi perfil" />
      <form action={updateProfile} className="card space-y-5 p-6">
        {guardado && <FormMessage success="Perfil actualizado." />}
        <div>
          <span className="label">Foto</span>
          <ImageUpload name="avatar_url" folder={`avatars/${user.id}`} defaultUrl={profile.avatar_url} shape="round" />
        </div>
        <div>
          <label className="label" htmlFor="full_name">Nombre</label>
          <input id="full_name" name="full_name" required defaultValue={profile.full_name} className="input" />
        </div>
        <div>
          <label className="label">Email</label>
          <input value={profile.email} disabled className="input bg-zinc-50 text-zinc-500" />
        </div>
        <div>
          <label className="label" htmlFor="bio">Sobre mí</label>
          <textarea id="bio" name="bio" rows={3} defaultValue={profile.bio ?? ""} className="input" placeholder="A qué te dedicas, tus objetivos..." />
        </div>
        <div className="flex justify-end">
          <SubmitButton pendingText="Guardando...">Guardar perfil</SubmitButton>
        </div>
      </form>
      <PasswordForm />
    </div>
  );
}
