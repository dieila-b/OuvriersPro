import React, { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Camera, Image as ImageIcon, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

// Capacitor (mobile)
import { Capacitor } from "@capacitor/core";
import { Camera as CapCamera, CameraResultType, CameraSource } from "@capacitor/camera";

type Props = {
  contactId: string;          // id de la conversation / contact
  senderId: string;           // auth user id
  onSent?: () => void;        // refresh messages
};

function extFromMime(mime?: string | null) {
  if (!mime) return "jpg";
  if (mime.includes("png")) return "png";
  if (mime.includes("webp")) return "webp";
  return "jpg";
}

async function fileFromWebPick(): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = () => {
      const f = input.files?.[0] ?? null;
      resolve(f);
    };
    input.click();
  });
}

async function fileFromCapacitorCamera(): Promise<{ blob: Blob; mimeType: string } | null> {
  const perm = await CapCamera.requestPermissions();
  if (perm.camera !== "granted" && perm.photos !== "granted") {
    throw new Error("Permission caméra/photos refusée");
  }

  const photo = await CapCamera.getPhoto({
    quality: 85,
    allowEditing: false,
    resultType: CameraResultType.Uri,
    source: CameraSource.Prompt, // propose Camera ou Gallery
  });

  if (!photo.webPath) return null;

  const res = await fetch(photo.webPath);
  const blob = await res.blob();
  const mimeType = blob.type || "image/jpeg";
  return { blob, mimeType };
}

export default function ChatImageButton({ contactId, senderId, onSent }: Props) {
  const [loading, setLoading] = useState(false);

  const sendImage = useCallback(async () => {
    setLoading(true);
    try {
      // 1) Récupérer l’image (mobile via Capacitor / web via input)
      let fileBlob: Blob | null = null;
      let mimeType = "image/jpeg";

      if (Capacitor.isNativePlatform()) {
        const cap = await fileFromCapacitorCamera();
        if (!cap) return;
        fileBlob = cap.blob;
        mimeType = cap.mimeType;
      } else {
        const f = await fileFromWebPick();
        if (!f) return;
        fileBlob = f;
        mimeType = f.type || "image/jpeg";
      }

      // 2) Upload Storage (privé)
      const ext = extFromMime(mimeType);
      const fileName = `${Date.now()}-${Math.random().toString(16).slice(2)}.${ext}`;
      const path = `contacts/${contactId}/${senderId}/${fileName}`;

      const { error: upErr } = await supabase.storage
        .from("chat-media")
        .upload(path, fileBlob, { contentType: mimeType, upsert: false });

      if (upErr) throw upErr;

      // 3) Générer une URL signée (privé)
      const { data: signed, error: signErr } = await supabase.storage
        .from("chat-media")
        .createSignedUrl(path, 60 * 60); // 1h

      if (signErr) throw signErr;

      // 4) Insérer message DB
      // ⚠️ adapte si ta table n’a pas ces champs exacts
      const { error: msgErr } = await supabase.from("op_contact_messages").insert({
        contact_id: contactId,
        sender_id: senderId,
        content: "",                 // message texte vide
        media_type: "image",
        media_path: path,
        media_url: signed.signedUrl,
      });

      if (msgErr) throw msgErr;

      onSent?.();
    } catch (e: any) {
      console.error(e);
      alert(e?.message ?? "Erreur lors de l’envoi de l’image");
    } finally {
      setLoading(false);
    }
  }, [contactId, senderId, onSent]);

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="rounded-full"
      onClick={sendImage}
      disabled={loading}
      title="Envoyer une image"
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
        <>
          <Camera className="h-4 w-4 mr-2" />
          <span className="hidden sm:inline">Image</span>
          <ImageIcon className="h-4 w-4 sm:hidden" />
        </>
      )}
    </Button>
  );
}
