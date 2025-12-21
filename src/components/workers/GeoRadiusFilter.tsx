import React, { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LocateFixed } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

type Props = {
  radiusKm: number;
  onRadiusChange: (km: number) => void;

  // Remontée au parent si vous calculez la distance
  onPositionResolved?: (pos: { latitude: number; longitude: number }) => void;
};

export default function GeoRadiusFilter({
  radiusKm,
  onRadiusChange,
  onPositionResolved,
}: Props) {
  const { language } = useLanguage();

  const [expanded, setExpanded] = useState(false); // ✅ on n'affiche rien tant que pas cliqué
  const [locating, setLocating] = useState(false);
  const [pos, setPos] = useState<{ latitude: number; longitude: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const t = useMemo(
    () => ({
      useMyPos: language === "fr" ? "Utiliser ma position" : "Use my location",
      locating: language === "fr" ? "Géolocalisation..." : "Locating...",
      radius: language === "fr" ? "Rayon" : "Radius",
      enableLoc:
        language === "fr"
          ? "Activez la localisation pour calculer les distances."
          : "Enable location to calculate distances.",
      denied:
        language === "fr"
          ? "Impossible de récupérer votre position. Autorisez la localisation dans votre navigateur."
          : "Unable to retrieve your location. Please allow location permission in your browser.",
      unsupported:
        language === "fr"
          ? "La géolocalisation n'est pas supportée par ce navigateur."
          : "Geolocation is not supported by this browser.",
      km: language === "fr" ? "km" : "km",
    }),
    [language]
  );

  const requestLocation = () => {
    // ✅ Au clic : on dévoile le bloc “Rayon + message”
    setExpanded(true);
    setError(null);

    if (!navigator.geolocation) {
      setError(t.unsupported);
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const next = { latitude: p.coords.latitude, longitude: p.coords.longitude };
        setPos(next);
        setLocating(false);
        setError(null);
        onPositionResolved?.(next);
      },
      (err) => {
        console.error("geolocation error", err);
        setLocating(false);
        setPos(null);
        setError(t.denied);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  };

  return (
    <div className="space-y-3">
      {/* ✅ Toujours visible */}
      <Button
        type="button"
        onClick={requestLocation}
        disabled={locating}
        className="w-full rounded-xl bg-pro-blue hover:bg-pro-blue/90 flex items-center justify-center gap-2"
      >
        <LocateFixed className="w-4 h-4" />
        {locating ? t.locating : t.useMyPos}
      </Button>

      {/* ✅ Caché au départ, visible seulement après clic */}
      {expanded && (
        <Card className="p-4 rounded-2xl border border-slate-200 bg-white space-y-3">
          {error ? (
            <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
              {error}
            </div>
          ) : null}

          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-slate-900">{t.radius}</div>
            <div className="text-xs text-slate-500">
              {Math.round(radiusKm)} {t.km}
            </div>
          </div>

          <input
            type="range"
            min={1}
            max={100}
            step={1}
            value={radiusKm}
            onChange={(e) => onRadiusChange(Number(e.target.value))}
            className="w-full"
          />

          {/* ✅ Votre message exact */}
          {!pos ? (
            <div className="text-xs text-slate-500">{t.enableLoc}</div>
          ) : (
            <div className="text-xs text-slate-500">
              {language === "fr"
                ? "Position détectée. Les distances peuvent être calculées."
                : "Location detected. Distances can be calculated."}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
