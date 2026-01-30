// src/lib/camera.ts
import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";

export async function takePhoto(): Promise<string> {
  // Demande permission
  const perm = await Camera.requestPermissions();
  if (perm.camera !== "granted") {
    throw new Error("Permission caméra refusée");
  }

  const photo = await Camera.getPhoto({
    quality: 80,
    allowEditing: false,
    resultType: CameraResultType.Uri,
    source: CameraSource.Camera,
  });

  if (!photo.webPath) {
    throw new Error("Impossible de récupérer la photo");
  }

  return photo.webPath; // utilisable directement dans <img src="..." />
}
