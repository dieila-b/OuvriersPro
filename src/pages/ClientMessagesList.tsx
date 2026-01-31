// src/pages/ClientMessagesList.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageCircle, ArrowLeft, Loader2, Clock, Info } from "lucide-react";

type ClientRow = {
  id: string;
  user_id: string | null;
};

type ContactRow = {
  id: string;
  worker_id: string | null;
  client_id: string | null;
  client_name: string | null;
  created_at: string;
  status: string | null;
  worker?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    phone: string | null;
    email: string | null;
    profession: string | null;
    city: string | null;
    commune: string | null;
    district: string | null;
  } | null;
};

type MessageRow = {
  id: string;
  contact_id: string | null;
  worker_id: string | null;
  client_id: string | null;
  sender_role: string | null;
  message: string | null;
  created_at: string;
  media_type: string | null;
  media_path: string | null;
  worker_name: string | null;
};

type ThreadItem = {
  contact_id: string;
  worker_id: string | null;
  worker_name: string;
  last_message: string;
  last_at: string;
  unread: boolean;
  messages_count: number;
};

const isUnreadStatus = (status?: string | null) => {
  const s = (status || "").toLowerCase().trim();
  return s === "new" || s === "unread" || s === "pending";
};

const cleanOneLine = (v?: string | null) => (v || "").replace(/\s+/g, " ").trim();

const fullName = (first?: string | null, last?: string | null) => {
  const s = `${first || ""} ${last || ""}`.trim();
  return s || "Ouvrier";
};

const ClientMessagesList: React.FC = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();

  const [client, setClient] = useState<ClientRow | null>(null);

  const [contacts, setContacts] = useState<ContactRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ✅ Realtime: incrément local en recevant de nouveaux messages
  const [lastByContact, setLastByContact] = useState<
    Record<string, { text: string; at: string; from: string }>
  >({});

  const t = {
    title: language === "fr" ? "Mes échanges" : "My conversations",
    subtitle:
      language === "fr"
        ? "Vos conversations avec les prestataires."
        : "Your conversations with providers.",
    empty:
      language === "fr"
        ? "Vous n’avez pas encore d’échange."
        : "You don’t have any conversation yet.",
    back: language === "fr" ? "Retour à mon espace client" : "Back to my client space",
    unread: language === "fr" ? "Nouveau" : "New",
    open: language === "fr" ? "Ouvrir" : "Open",
    loading: language === "fr" ? "Chargement..." : "Loading...",
    errorLoad: language === "fr" ? "Impossible de charger vos échanges." : "Unable to load your conversations.",
    dateLabel: language === "fr" ? "Dernier message" : "Last message",
  };

  const formatDateTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString(language === "fr" ? "fr-FR" : "en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // 1) Charger client + contacts
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError || !userData?.user) {
          throw new Error(language === "fr" ? "Vous devez être connecté." : "You must be logged in.");
        }

        const { data: clientRow, error: clientErr } = await supabase
          .from("op_clients")
          .select("id, user_id")
          .eq("user_id", userData.user.id)
          .maybeSingle();

        if (clientErr) throw clientErr;
        if (!clientRow) {
          throw new Error(
            language === "fr"
              ? "Aucun profil client associé à ce compte."
              : "No client profile for this account."
          );
        }

        const c = clientRow as ClientRow;
        setClient(c);

        // contacts + worker
        const { data: contactsData, error: contactsErr } = await supabase
          .from("op_ouvrier_contacts")
          .select(
            `
            id,
            worker_id,
            client_id,
            client_name,
            status,
            created_at,
            worker:op_ouvriers (
              id,
              first_name,
              last_name,
              phone,
              email,
              profession,
              city,
              commune,
              district
            )
          `
          )
          .eq("client_id", c.id)
          .order("created_at", { ascending: false });

        if (contactsErr) throw contactsErr;

        setContacts(
          (contactsData || []).map((row: any) => ({
            ...row,
            worker: row.worker ?? null,
          })) as ContactRow[]
        );

        // init lastByContact vide
        setLastByContact({});
      } catch (e: any) {
        setError(e?.message || t.errorLoad);
        setContacts([]);
      } finally {
        setLoading(false);
      }
    };

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);

  // 2) Charger dernier message par contact (1 requête)
  useEffect(() => {
    const fetchLast = async () => {
      if (!client?.id) return;
      if (contacts.length === 0) return;

      const contactIds = contacts.map((c) => c.id);

      // On prend les messages récents et on garde le 1er par contact côté JS
      const { data, error } = await supabase
        .from("op_client_worker_messages")
        .select("id, contact_id, sender_role, message, created_at, media_type")
        .in("contact_id", contactIds)
        .order("created_at", { ascending: false })
        .limit(500);

      if (error) return;

      const map: Record<string, { text: string; at: string; from: string }> = {};
      for (const row of (data || []) as any[]) {
        const cid = row.contact_id as string;
        if (!cid) continue;
        if (map[cid]) continue;
        const text =
          row.media_type === "image"
            ? language === "fr"
              ? "📷 Image"
              : "📷 Image"
            : cleanOneLine(row.message) || "—";
        map[cid] = { text, at: row.created_at, from: row.sender_role || "" };
      }
      setLastByContact(map);
    };

    fetchLast();
  }, [client?.id, contacts.map((c) => c.id).join(","), language]);

  // 3) REALTIME: nouveaux messages -> met à jour lastByContact + remonte le thread en haut
  useEffect(() => {
    if (!client?.id) return;

    const channel = supabase
      .channel(`rt:client:threadlist:${client.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "op_client_worker_messages" },
        (payload) => {
          const row = payload.new as any;
          const cid = row?.contact_id as string;
          if (!cid) return;

          // Ne garde que les threads du client (via contacts en mémoire)
          if (!contacts.some((c) => c.id === cid)) return;

          const text =
            row.media_type === "image"
              ? language === "fr"
                ? "📷 Image"
                : "📷 Image"
              : cleanOneLine(row.message) || "—";

          setLastByContact((prev) => ({
            ...prev,
            [cid]: { text, at: row.created_at, from: row.sender_role || "" },
          }));

          // remonte le contact en haut
          setContacts((prev) => {
            const idx = prev.findIndex((c) => c.id === cid);
            if (idx === -1) return prev;
            const copy = [...prev];
            const [it] = copy.splice(idx, 1);
            return [it, ...copy];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [client?.id, contacts, language]);

  const threads: ThreadItem[] = useMemo(() => {
    return contacts.map((c) => {
      const w = c.worker;
      const name = w ? fullName(w.first_name, w.last_name) : "Ouvrier";
      const last = lastByContact[c.id];

      return {
        contact_id: c.id,
        worker_id: c.worker_id,
        worker_name: name,
        last_message:
          last?.text ||
          (language === "fr" ? "Démarrez la conversation…" : "Start the conversation…"),
        last_at: last?.at || c.created_at,
        unread: isUnreadStatus(c.status),
        messages_count: 0,
      };
    });
  }, [contacts, lastByContact, language]);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <Button variant="ghost" className="mb-4 flex items-center gap-2" onClick={() => navigate("/espace-client")}>
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">{t.back}</span>
        </Button>

        <header className="mb-6">
          <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-500 shadow-sm border border-slate-100 mb-3">
            <MessageCircle className="w-3 h-3" />
            <span>{language === "fr" ? "Messagerie" : "Messaging"}</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-1">{t.title}</h1>
          <p className="text-sm text-slate-600">{t.subtitle}</p>
        </header>

        <Card className="p-4 md:p-6 bg-white shadow-sm border-slate-200 rounded-2xl">
          {loading ? (
            <div className="flex items-center justify-center py-10 text-slate-500">
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              <span className="text-sm">{t.loading}</span>
            </div>
          ) : error ? (
            <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
              <Info className="w-5 h-5 mt-0.5" />
              <div>
                <div className="text-sm font-semibold">{t.errorLoad}</div>
                <div className="text-xs opacity-80 mt-1">{error}</div>
              </div>
            </div>
          ) : threads.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-500">{t.empty}</div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {threads.map((th) => (
                <li key={th.contact_id} className="py-4">
                  <button
                    type="button"
                    onClick={() => navigate(`/client/messages/${th.contact_id}`)}
                    className="w-full text-left rounded-xl hover:bg-slate-50 px-2 py-2 transition"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-slate-900 truncate">{th.worker_name}</p>
                          {th.unread && (
                            <span className="inline-flex items-center px-2 py-0.5 text-[10px] rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                              {t.unread}
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-sm text-slate-700 truncate">{th.last_message}</p>
                      </div>

                      <div className="shrink-0 text-xs text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{formatDateTime(th.last_at)}</span>
                      </div>
                    </div>

                    <div className="mt-2 flex justify-end">
                      <span className="text-xs text-slate-500 underline">{t.open}</span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
};

export default ClientMessagesList;
