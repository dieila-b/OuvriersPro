import React from "react";
import { Link } from "react-router-dom";
import { Globe, Mail, Phone, User } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type ContactRow = {
  id: string;
  created_at: string;
  worker_name: string | null;
  client_name: string | null;
  client_email?: string | null;
  client_phone?: string | null;
  message: string | null;
  status: string | null;
  origin?: string | null;
};

function formatDateTime(value: string, locale: "fr-FR" | "en-GB" = "fr-FR") {
  const d = new Date(value);
  return d.toLocaleString(locale, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusLabel(status: string | null | undefined) {
  if (status === "done") return "Traité";
  if (status === "in_progress") return "En cours";
  return "Nouveau";
}

function statusBadgeClass(status: string | null | undefined) {
  if (status === "done") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (status === "in_progress") return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-sky-50 text-sky-700 border-sky-200";
}

function originLabel(origin: string | null | undefined) {
  if (!origin || origin === "web") return "web";
  if (origin === "mobile") return "mobile";
  return origin;
}

function clampMessage(msg: string | null | undefined, n = 120) {
  const t = (msg || "").trim();
  if (!t) return "—";
  return t.length > n ? `${t.slice(0, n)}…` : t;
}

export default function ResponsiveContactsList({
  rows,
  onChangeStatus,
  statusOptions = [
    { value: "new", label: "Nouveau" },
    { value: "in_progress", label: "En cours" },
    { value: "done", label: "Traité" },
  ],
}: {
  rows: ContactRow[];
  onChangeStatus: (id: string, status: string) => void;
  statusOptions?: { value: string; label: string }[];
}) {
  return (
    <div className="w-full">
      {/* ✅ DESKTOP TABLE */}
      <div className="hidden md:block">
        <div className="rounded-2xl border border-slate-200/60 bg-white/85 backdrop-blur shadow-[0_18px_45px_rgba(15,23,42,0.06)] overflow-hidden">
          <div className="w-full overflow-x-auto">
            <table className="min-w-[980px] w-full text-sm">
              <thead className="bg-slate-50/80 text-slate-600">
                <tr className="border-b border-slate-200/60">
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide">Ouvrier</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide">Client</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide">Message</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide">Statut</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide">Origine</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wide">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {rows.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3 whitespace-nowrap text-slate-700">
                      {formatDateTime(r.created_at, "fr-FR")}
                    </td>

                    <td className="px-4 py-3 font-semibold text-slate-900 whitespace-nowrap">
                      {r.worker_name || "—"}
                    </td>

                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{r.client_name || "—"}</div>
                      {(r.client_email || r.client_phone) && (
                        <div className="text-xs text-slate-500">
                          {r.client_email ? <span className="mr-2">{r.client_email}</span> : null}
                          {r.client_phone ? <span>{r.client_phone}</span> : null}
                        </div>
                      )}
                    </td>

                    <td className="px-4 py-3 text-slate-700">
                      <div className="max-w-[420px]">
                        {clampMessage(r.message, 140)}
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-full border ${statusBadgeClass(r.status)}`}>
                        {statusLabel(r.status)}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs bg-white">
                        <Globe className="h-3.5 w-3.5" />
                        {originLabel(r.origin)}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center justify-end gap-2">
                        <Select
                          value={(r.status || "new") as string}
                          onValueChange={(v) => onChangeStatus(r.id, v)}
                        >
                          <SelectTrigger className="h-9 w-[150px] bg-white">
                            <SelectValue placeholder="Statut" />
                          </SelectTrigger>
                          <SelectContent>
                            {statusOptions.map((o) => (
                              <SelectItem key={o.value} value={o.value}>
                                {o.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </td>
                  </tr>
                ))}

                {rows.length === 0 && (
                  <tr>
                    <td className="px-4 py-8 text-center text-slate-500" colSpan={7}>
                      Aucune demande.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ✅ MOBILE CARDS */}
      <div className="md:hidden space-y-3">
        {rows.map((r) => (
          <div
            key={r.id}
            className="rounded-2xl border border-slate-200/60 bg-white/90 backdrop-blur p-4 shadow-[0_18px_45px_rgba(15,23,42,0.06)]"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-xs text-slate-500">{formatDateTime(r.created_at, "fr-FR")}</div>
                <div className="mt-1 font-semibold text-slate-900 truncate">
                  {r.worker_name || "—"}
                </div>
              </div>

              <span className={`shrink-0 inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-full border ${statusBadgeClass(r.status)}`}>
                {statusLabel(r.status)}
              </span>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-2 text-sm">
              <div className="flex items-center gap-2 text-slate-700">
                <User className="h-4 w-4 text-slate-500" />
                <span className="font-medium">{r.client_name || "—"}</span>
              </div>

              {r.client_email && (
                <div className="flex items-center gap-2 text-slate-700 break-all">
                  <Mail className="h-4 w-4 text-slate-500" />
                  <span>{r.client_email}</span>
                </div>
              )}

              {r.client_phone && (
                <div className="flex items-center gap-2 text-slate-700">
                  <Phone className="h-4 w-4 text-slate-500" />
                  <span>{r.client_phone}</span>
                </div>
              )}

              <div className="flex items-center gap-2 text-slate-700">
                <Globe className="h-4 w-4 text-slate-500" />
                <span className="text-xs px-2 py-0.5 rounded-full border bg-white">
                  {originLabel(r.origin)}
                </span>
              </div>

              <div className="mt-1 text-slate-700">
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                  Message
                </div>
                <div className="text-sm leading-relaxed">{clampMessage(r.message, 220)}</div>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-2">
              <div className="flex-1">
                <Select
                  value={(r.status || "new") as string}
                  onValueChange={(v) => onChangeStatus(r.id, v)}
                >
                  <SelectTrigger className="h-10 w-full bg-white">
                    <SelectValue placeholder="Changer le statut" />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Optionnel : lien détail si tu as une page détail */}
              {/* <Link to={`/admin/ouvrier-contacts/${r.id}`} className="text-sm text-pro-blue font-medium">
                Détails
              </Link> */}
            </div>
          </div>
        ))}

        {rows.length === 0 && (
          <div className="rounded-2xl border border-slate-200/60 bg-white/90 p-5 text-sm text-slate-500">
            Aucune demande.
          </div>
        )}
      </div>
    </div>
  );
}
