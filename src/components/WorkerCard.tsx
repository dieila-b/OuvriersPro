// src/components/WorkerCard.tsx
import React from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, MapPin, Clock, ShieldCheck } from "lucide-react";

interface WorkerCardProps {
  worker: {
    id: string;
    name: string;
    trade: string;
    hourlyRate: number;
    rating: number;
    reviewCount: number;
    location: string;
    avatar: string;
    experience: number;
    verified: boolean;
  };
}

const WorkerCard = ({ worker }: WorkerCardProps) => {
  const { t } = useLanguage();

  return (
    <Card className="group overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-[0_12px_32px_rgba(15,23,42,0.06)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_22px_50px_rgba(15,23,42,0.12)]">
      <CardContent className="p-5 sm:p-6">
        <div className="flex items-start gap-4">
          <div className="relative shrink-0">
            <div className="rounded-full bg-gradient-to-br from-blue-200 via-blue-300 to-blue-600 p-[2px] shadow-[0_10px_24px_rgba(37,99,235,0.20)]">
              <img
                src={worker.avatar}
                alt={worker.name}
                className="h-16 w-16 rounded-full object-cover bg-white"
              />
            </div>

            {worker.verified && (
              <div className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 shadow-lg">
                <ShieldCheck className="h-3.5 w-3.5 text-white" />
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate text-lg font-bold tracking-tight text-slate-900">
                  {worker.name}
                </h3>

                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <Badge className="rounded-full border border-blue-100 bg-blue-50 px-2.5 py-0.5 text-blue-700">
                    {worker.trade}
                  </Badge>

                  {worker.verified && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      Vérifié
                    </span>
                  )}
                </div>
              </div>

              <div className="shrink-0 text-right">
                <div className="text-lg font-bold tracking-tight text-blue-700">
                  {worker.hourlyRate}
                  {t("common.euro")}
                </div>
                <div className="text-xs text-slate-500">/ {t("subscription.month")}</div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-600">
              <div className="inline-flex items-center gap-1.5">
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                <span className="font-medium text-slate-800">{worker.rating}</span>
                <span>({worker.reviewCount})</span>
              </div>

              <div className="inline-flex items-center gap-1.5 min-w-0">
                <MapPin className="h-4 w-4 text-slate-400" />
                <span className="truncate">{worker.location}</span>
              </div>

              <div className="inline-flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-slate-400" />
                <span>
                  {worker.experience} {t("profile.years")}
                </span>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end">
              <Button
                size="sm"
                className="h-10 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 px-4 text-white shadow-[0_10px_24px_rgba(37,99,235,0.22)] hover:from-blue-700 hover:to-blue-700"
              >
                {t("profile.contact")}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default WorkerCard;
