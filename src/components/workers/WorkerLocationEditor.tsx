// src/components/worker/WorkerLocationEditor.tsx
import React, { useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { MapPin, LocateFixed, Save, ExternalLink } from "lucide-react";

type Props = {
  workerId: string;
  initialLat?: number | null;
  initialLng?: number | null;
  onSaved?: (coords: { latitude: number; longitude: number }) => void;
};

const WorkerLocationEditor: React.FC<Props> = ({
  workerId,
  initialLat,
  initialLng,
  onSaved,
}) => {
  const { language } = useLanguage();

  const [lat, setLat] = useState<string>(
    initialLat != null ? String(initialLat) : ""
  );
  const [lng, setLng] = useState<string>(
    initialLng != null ? String(initialLng) : ""
  );

  const [locating, setLocating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const t = {
    title: language === "fr" ? "Localisation (GPS)" : "Location (GPS)",
    subtitle:
      language === "fr"
        ? "Ajoutez votre position pour apparaître dans les recherches “autour de moi”."
        : "Add your position to appear in “near me” searches.",
    useMyPos: language === "fr" ? "Utiliser ma position" : "Use my location",
    lat: language === "fr" ? "Latitude" : "Latitude",
    lng: language === "fr" ? "Longitude" : "Longitude",
    save: language === "fr" ? "Enregistrer" : "Save",
    saving: language === "fr" ? "Enregistrement..." : "Saving...",
    locating: language === "fr" ? "Géolocalisation..." : "Locating...",
    invalid:
      language === "fr"
        ? "Veuillez saisir une latitude/longitude valides."
        : "Please enter valid latitude/longitude.",
    geolocUnsupported:
      language === "fr"
        ? "La géolocalisation n'est pas supportée par ce navigateur."
        : "Geolocation is not supported by this browser.",
    geolocDenied:
      language === "fr"
        ? "Autorisation refusée. Activez la localisation dans votre navigateur."
        : "Permission denied. Enable location in your browser.",
    saved:
      language === "fr"
        ? "Position enregistrée avec succès."
        : "Location saved successfully.",
    openMap:
      language === "fr" ? "Ouvrir dans Google Maps" : "Open in Google Maps",
  };

  const parsed = useMemo(() => {
    const la = Number(lat);
    const lo = Number(lng);
    const isValid =
      Number.isFinite(la) &&
      Number.isFinite(lo) &&
      Math.abs(la) <= 90 &&
      Math.abs(lo) <= 180;
    return { la, lo, isValid };
  }, [lat, lng]);

  const googleMapsUrl = useMemo(() => {
    if (!parsed.isValid) return null;
    return `https://www.google.com/maps?q=${parsed.la},${parsed.lo}`;
  }, [parsed.isValid, parsed.la, parsed.lo]);

  const handleUseMyLocation = () => {
    setError(null);
    setSuccess(null);

    if (!navigator.geolocation) {
      setError(t.geolocUnsupported);
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const la = pos.coords.latitude;
        const lo = pos.coords.longitude;
        setLat(String(la));
        setLng(String(lo));
        setLocating(false);
      },
      (err) => {
        console.error("geolocation error", err);
        setLocating(false);

        // 1 = PERMISSION_DENIED
        if (err?.code === 1) setError(t.geolocDenied);
        else
          setError(
            language === "fr"
              ? "Impossible de récupérer votre position."
              : "Unable to retrieve your location."
          );
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleSave = async () => {
    setError(null);
    setSuccess(null);

    if (!workerId) return;
    if (!parsed.isValid) {
      setError(t.invalid);
      return;
    }

    setSaving(true);
    try {
      const { error: updErr } = await supabase
        .from("op_ouvriers")
        .update({
          latitude: parsed.la,
          longitude: parsed.lo,
          updated_at: new Date().toISOString(),
        })
        .eq("id", workerId);

      if (updErr) throw updErr;

      setSuccess(t.saved);
      onSaved?.({ latitude: parsed.la, longitude: parsed.lo });
    } catch (e: any) {
      console.error("save location error", e);
      setError(
        e?.message ||
          (language === "fr"
            ? "Erreur lors de l'enregistrement."
            : "Error while saving.")
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="p-4 rounded-xl border border-slate-200 bg-white">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center">
              <MapPin className="w-4 h-4 text-slate-700" />
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-900">
                {t.title}
              </div>
              <div className="text-xs text-slate-500">{t.subtitle}</div>
            </div>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-full"
          onClick={handleUseMyLocation}
          disabled={locating}
        >
          <LocateFixed className="w-4 h-4 mr-2" />
          {locating ? t.locating : t.useMyPos}
        </Button>
      </div>

      {error && (
        <div className="mt-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
          {error}
        </div>
      )}
      {success && (
        <div className="mt-3 text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-md px-3 py-2">
          {success}
        </div>
      )}

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            {t.lat}
          </label>
          <Input
            value={lat}
            onChange={(e) => setLat(e.target.value)}
            placeholder="9.6412"
            inputMode="decimal"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            {t.lng}
          </label>
          <Input
            value={lng}
            onChange={(e) => setLng(e.target.value)}
            placeholder="-13.5784"
            inputMode="decimal"
          />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs text-slate-500">
          {parsed.isValid
            ? language === "fr"
              ? "Coordonnées valides."
              : "Valid coordinates."
            : language === "fr"
            ? "Saisissez des coordonnées (lat [-90..90], lng [-180..180])."
            : "Enter coordinates (lat [-90..90], lng [-180..180])."}
        </div>

        <div className="flex items-center gap-2">
          {googleMapsUrl && (
            <Button asChild variant="outline" size="sm" className="rounded-full">
              <a href={googleMapsUrl} target="_blank" rel="noreferrer">
                <ExternalLink className="w-4 h-4 mr-2" />
                {t.openMap}
              </a>
            </Button>
          )}

          <Button
            type="button"
            size="sm"
            className="rounded-full bg-pro-blue hover:bg-pro-blue/90"
            onClick={handleSave}
            disabled={saving || !parsed.isValid}
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? t.saving : t.save}
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default WorkerLocationEditor;
