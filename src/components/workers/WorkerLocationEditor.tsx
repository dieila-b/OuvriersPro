// src/components/workers/WorkerLocationEditor.tsx
import React, { useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MapPin, LocateFixed, Save, AlertTriangle } from "lucide-react";

type Props = {
  workerId: string;                 // op_ouvriers.id
  initialLat?: number | null;
  initialLng?: number | null;
  language?: "fr" | "en";
  onSaved?: (lat: number | null, lng: number | null) => void; // optionnel (pour rafraîchir UI)
};

export const WorkerLocationEditor: React.FC<Props> = ({
  workerId,
  initialLat = null,
  initialLng = null,
  language = "fr",
  onSaved,
}) => {
  const [lat, setLat] = useState<string>(initialLat != null ? String(initialLat) : "");
  const [lng, setLng] = useState<string>(initialLng != null ? String(initialLng) : "");

  const [geoLoading, setGeoLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const t = useMemo(() => {
    return {
      title: language === "fr" ? "Localisation" : "Location",
      subtitle:
        language === "fr"
          ? "Utilisez votre position actuelle ou saisissez les coordonnées manuellement."
          : "Use your current position or enter coordinates manually.",
      useMyPos: language === "fr" ? "Utiliser ma position" : "Use my position",
      latitude: "Latitude",
      longitude: "Longitude",
      example: language === "fr" ? "Ex : 9.5092" : "e.g. 9.5092",
      save: language === "fr" ? "Enregistrer" : "Save",
      saving: language === "fr" ? "Enregistrement..." : "Saving...",
      saved: language === "fr" ? "Localisation mise à jour." : "Location updated.",
      geoUnsupported:
        language === "fr"
          ? "La géolocalisation n’est pas supportée sur ce navigateur."
          : "Geolocation is not supported by this browser.",
      geoDenied:
        language === "fr"
          ? "Autorisation refusée. Activez la localisation dans votre navigateur."
          : "Permission denied. Enable location access in your browser.",
      geoError:
        language === "fr"
          ? "Impossible d’obtenir la position."
          : "Unable to get position.",
      invalid:
        language === "fr"
          ? "Coordonnées invalides (latitude -90..90, longitude -180..180)."
          : "Invalid coordinates (lat -90..90, lng -180..180).",
      saveError:
        language === "fr"
          ? "Erreur lors de l’enregistrement."
          : "Error while saving.",
      openInMaps: language === "fr" ? "Ouvrir dans Google Maps" : "Open in Google Maps",
    };
  }, [language]);

  const parsed = useMemo(() => {
    const latN = lat.trim() === "" ? null : Number(lat);
    const lngN = lng.trim() === "" ? null : Number(lng);

    const latOk = latN == null || (Number.isFinite(latN) && latN >= -90 && latN <= 90);
    const lngOk = lngN == null || (Number.isFinite(lngN) && lngN >= -180 && lngN <= 180);

    return { latN, lngN, latOk, lngOk, valid: latOk && lngOk && !(latN == null) && !(lngN == null) };
  }, [lat, lng]);

  const mapsUrl = useMemo(() => {
    if (parsed.latN != null && parsed.lngN != null && Number.isFinite(parsed.latN) && Number.isFinite(parsed.lngN)) {
      return `https://www.google.com/maps?q=${parsed.latN},${parsed.lngN}`;
    }
    return "";
  }, [parsed.latN, parsed.lngN]);

  const handleUseMyPosition = async () => {
    setError(null);
    setSuccess(null);

    if (!navigator.geolocation) {
      setError(t.geoUnsupported);
      return;
    }

    setGeoLoading(true);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const nextLat = pos.coords.latitude;
        const nextLng = pos.coords.longitude;
        setLat(String(nextLat));
        setLng(String(nextLng));
        setGeoLoading(false);
      },
      (err) => {
        console.error("geolocation error", err);
        if (err?.code === 1) setError(t.geoDenied);
        else setError(t.geoError);
        setGeoLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 0,
      }
    );
  };

  const handleSave = async () => {
    setError(null);
    setSuccess(null);

    const latN = parsed.latN;
    const lngN = parsed.lngN;

    if (!parsed.latOk || !parsed.lngOk || latN == null || lngN == null) {
      setError(t.invalid);
      return;
    }

    setSaving(true);
    try {
      const { error: updErr } = await supabase
        .from("op_ouvriers")
        .update({
          latitude: latN,
          longitude: lngN,
          updated_at: new Date().toISOString(),
        })
        .eq("id", workerId);

      if (updErr) throw updErr;

      setSuccess(t.saved);
      onSaved?.(latN, lngN);
    } catch (e: any) {
      console.error("save location error", e);
      setError(`${t.saveError}${e?.message ? ` (${e.message})` : ""}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-pro-blue/10 flex items-center justify-center">
              <MapPin className="w-4 h-4 text-pro-blue" />
            </div>
            <h2 className="text-sm font-semibold text-slate-900">{t.title}</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">{t.subtitle}</p>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-full text-xs"
          onClick={handleUseMyPosition}
          disabled={geoLoading}
        >
          <LocateFixed className="w-4 h-4 mr-2" />
          {geoLoading ? (language === "fr" ? "Localisation..." : "Locating...") : t.useMyPos}
        </Button>
      </div>

      {error && (
        <div className="mt-3 text-xs text-red-700 bg-red-50 border border-red-100 rounded-md px-3 py-2 flex gap-2">
          <AlertTriangle className="w-4 h-4 mt-0.5" />
          <div>{error}</div>
        </div>
      )}

      {success && (
        <div className="mt-3 text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-md px-3 py-2">
          {success}
        </div>
      )}

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div>
          <label className="block text-[11px] font-medium text-slate-600 mb-1">{t.latitude}</label>
          <Input
            inputMode="decimal"
            value={lat}
            onChange={(e) => setLat(e.target.value)}
            placeholder={t.example}
            className={!parsed.latOk ? "border-red-300 focus-visible:ring-red-200" : ""}
          />
        </div>

        <div>
          <label className="block text-[11px] font-medium text-slate-600 mb-1">{t.longitude}</label>
          <Input
            inputMode="decimal"
            value={lng}
            onChange={(e) => setLng(e.target.value)}
            placeholder={t.example}
            className={!parsed.lngOk ? "border-red-300 focus-visible:ring-red-200" : ""}
          />
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        {mapsUrl ? (
          <a
            className="text-xs text-pro-blue hover:underline inline-flex items-center gap-1"
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            {t.openInMaps}
          </a>
        ) : (
          <span className="text-[11px] text-slate-400">
            {language === "fr" ? "Renseignez les coordonnées pour activer la carte." : "Fill coordinates to enable map."}
          </span>
        )}

        <Button
          type="button"
          onClick={handleSave}
          className="rounded-full px-4"
          disabled={saving}
        >
          <Save className="w-4 h-4 mr-2" />
          {saving ? t.saving : t.save}
        </Button>
      </div>
    </div>
  );
};
