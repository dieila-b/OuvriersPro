import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import ImagePickerUpload from "@/components/media/ImagePickerUpload";
import { useAuthProfile } from "@/hooks/useAuthProfile";

type Ouvrier = {
  id: string;
  user_id: string;
  avatar_url: string | null;
};

export default function WorkerAvatarSection() {
  const { user } = useAuthProfile();
  const [ouvrier, setOuvrier] = useState<Ouvrier | null>(null);

  useEffect(() => {
    if (!user?.id) return;

    supabase
      .from("op_ouvriers")
      .select("id, user_id, avatar_url")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => setOuvrier(data as Ouvrier));
  }, [user?.id]);

  if (!user?.id) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold">Photo de profil</h3>

      <ImagePickerUpload
        userId={user.id}
        bucket="avatars"
        path={`ouvriers/${user.id}/avatar.jpg`}
        label="Changer la photo"
        previewUrl={ouvrier?.avatar_url ?? null}
        onUploaded={async ({ publicUrl }) => {
          // 🔁 Update table op_ouvriers
          const { error } = await supabase
            .from("op_ouvriers")
            .update({ avatar_url: publicUrl })
            .eq("user_id", user.id);

          if (error) throw error;

          setOuvrier((o) =>
            o ? { ...o, avatar_url: publicUrl } : o
          );
        }}
      />
    </div>
  );
}
