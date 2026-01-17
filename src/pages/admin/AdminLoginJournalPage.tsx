import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw } from "lucide-react";

type Row = {
  id: number;
  created_at: string;
  user_id: string | null;
  email: string | null;
  event: string;
  success: boolean;
  ip: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  user_agent: string | null;
  source: string | null;
};

const fmt = (iso: string) =>
  new Date(iso).toLocaleString("fr-FR", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" });

export default function AdminLoginJournalPage() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);

    const { data, error } = await supabase
      .from("op_login_audit")
      .select("id, created_at, user_id, email, event, success, ip, country, region, city, user_agent, source")
      .order("created_at", { ascending: false })
      .limit(300);

    if (error) {
      setError(error.message);
      setRows([]);
    } else {
      setRows((data ?? []) as Row[]);
    }

    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) => {
      const loc = [r.country, r.region, r.city].filter(Boolean).join(" ").toLowerCase();
      return (
        (r.email ?? "").toLowerCase().includes(s) ||
        (r.ip ?? "").toLowerCase().includes(s) ||
        (r.event ?? "").toLowerCase().includes(s) ||
        loc.includes(s)
      );
    });
  }, [rows, q]);

  return (
    <div className="w-full px-4 sm:px-6 lg:px-10 2xl:px-16 py-6">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="text-2xl font-bold text-pro-gray">Journal de connexion</h1>
          <p className="text-sm text-gray-600">Historique des connexions (admin uniquement).</p>
        </div>

        <div className="flex items-center gap-2">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Rechercher (email, ip, ville, event...)"
            className="w-[320px] max-w-[60vw]"
          />
          <Button onClick={load} className="bg-pro-blue hover:bg-blue-700">
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualiser
          </Button>
        </div>
      </div>

      <Card className="rounded-2xl border border-gray-200">
        <CardHeader>
          <CardTitle className="text-base">Derniers événements</CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <div className="w-full overflow-auto">
              <table className="min-w-[980px] w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500 border-b">
                    <th className="py-2 pr-3">Date</th>
                    <th className="py-2 pr-3">Email</th>
                    <th className="py-2 pr-3">Event</th>
                    <th className="py-2 pr-3">IP</th>
                    <th className="py-2 pr-3">Localisation</th>
                    <th className="py-2 pr-3">Source</th>
                    <th className="py-2 pr-3">User-Agent</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr key={r.id} className="border-b last:border-b-0">
                      <td className="py-2 pr-3 whitespace-nowrap">{fmt(r.created_at)}</td>
                      <td className="py-2 pr-3 whitespace-nowrap">{r.email ?? "—"}</td>
                      <td className="py-2 pr-3 whitespace-nowrap">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs border ${
                          r.success ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-700 border-red-200"
                        }`}>
                          {r.event}
                        </span>
                      </td>
                      <td className="py-2 pr-3 whitespace-nowrap">{r.ip ?? "—"}</td>
                      <td className="py-2 pr-3 whitespace-nowrap">
                        {[r.city, r.region, r.country].filter(Boolean).join(", ") || "—"}
                      </td>
                      <td className="py-2 pr-3 whitespace-nowrap">{r.source ?? "—"}</td>
                      <td className="py-2 pr-3 max-w-[520px] truncate" title={r.user_agent ?? ""}>
                        {r.user_agent ?? "—"}
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-gray-500">
                        Aucun événement.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
