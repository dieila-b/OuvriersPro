// src/pages/AdminFaqQuestions.tsx
import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Send, RefreshCw, Search, CheckCircle2, AlertTriangle } from "lucide-react";

type FaqQuestion = {
  id: string;
  created_at: string;
  full_name: string | null;
  email: string | null;
  subject: string | null;
  message: string;
  category: string | null;
  status: "new" | "answered" | "closed";
  user_id: string | null;
};

type FaqReply = {
  id: string;
  created_at: string;
  question_id: string;
  admin_user_id: string | null;
  content: string;
};

const statusLabel = (s: FaqQuestion["status"]) => {
  if (s === "new") return "New";
  if (s === "answered") return "Answered";
  return "Closed";
};

const statusBadgeClass = (s: FaqQuestion["status"]) => {
  if (s === "new") return "bg-amber-50 text-amber-800 border-amber-200";
  if (s === "answered") return "bg-emerald-50 text-emerald-800 border-emerald-200";
  return "bg-slate-100 text-slate-700 border-slate-200";
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

export default function AdminFaqQuestions() {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [questions, setQuestions] = useState<FaqQuestion[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  const [tab, setTab] = useState<"all" | "new" | "answered" | "closed">("new");
  const [qSearch, setQSearch] = useState("");

  const active = useMemo(() => questions.find((q) => q.id === activeId) ?? null, [questions, activeId]);

  const [replies, setReplies] = useState<FaqReply[]>([]);
  const [repliesLoading, setRepliesLoading] = useState(false);

  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);

  const [statusSaving, setStatusSaving] = useState(false);
  const [statusDraft, setStatusDraft] = useState<FaqQuestion["status"]>("new");

  const [okMsg, setOkMsg] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const base = tab === "all" ? questions : questions.filter((q) => q.status === tab);
    const s = qSearch.trim().toLowerCase();
    if (!s) return base;
    return base.filter((q) => {
      const hay = [
        q.full_name ?? "",
        q.email ?? "",
        q.subject ?? "",
        q.message ?? "",
        q.category ?? "",
        q.status ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(s);
    });
  }, [questions, tab, qSearch]);

  const loadQuestions = async () => {
    setLoading(true);
    setErr(null);
    setOkMsg(null);

    try {
      const { data, error } = await supabase
        .from("op_faq_questions")
        .select("id, created_at, full_name, email, subject, message, category, status, user_id")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const list = (data || []) as FaqQuestion[];
      setQuestions(list);

      // auto select
      if (!activeId && list.length > 0) setActiveId(list[0].id);
      if (activeId && !list.some((x) => x.id === activeId)) setActiveId(list[0]?.id ?? null);
    } catch (e: any) {
      console.error("loadQuestions error", e);
      setErr(e?.message ?? "Unable to load FAQ questions.");
    } finally {
      setLoading(false);
    }
  };

  const loadReplies = async (questionId: string) => {
    setRepliesLoading(true);
    try {
      const { data, error } = await supabase
        .from("op_faq_question_replies")
        .select("id, created_at, question_id, admin_user_id, content")
        .eq("question_id", questionId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setReplies((data || []) as FaqReply[]);
    } catch (e) {
      console.warn("loadReplies error", e);
      setReplies([]);
    } finally {
      setRepliesLoading(false);
    }
  };

  useEffect(() => {
    loadQuestions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!activeId) {
      setReplies([]);
      return;
    }
    loadReplies(activeId);
  }, [activeId]);

  useEffect(() => {
    if (active) setStatusDraft(active.status);
  }, [active]);

  const saveStatus = async () => {
    if (!active) return;
    if (statusDraft === active.status) return;

    setStatusSaving(true);
    setErr(null);
    setOkMsg(null);

    try {
      const { error } = await supabase
        .from("op_faq_questions")
        .update({ status: statusDraft })
        .eq("id", active.id);

      if (error) throw error;

      setQuestions((prev) => prev.map((q) => (q.id === active.id ? { ...q, status: statusDraft } : q)));
      setOkMsg("Status updated.");
    } catch (e: any) {
      console.error("saveStatus error", e);
      setErr(e?.message ?? "Unable to update status.");
    } finally {
      setStatusSaving(false);
    }
  };

  const sendReply = async () => {
    if (!active) return;
    const content = replyText.trim();
    if (!content) return;

    setSending(true);
    setErr(null);
    setOkMsg(null);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from("op_faq_question_replies")
        .insert({
          question_id: active.id,
          admin_user_id: user?.id ?? null,
          content,
        })
        .select("id, created_at, question_id, admin_user_id, content")
        .single();

      if (error) throw error;

      setReplies((prev) => [...prev, data as FaqReply]);
      setReplyText("");
      setOkMsg("Reply sent.");

      // Recharger questions (le trigger met answered automatiquement)
      await loadQuestions();
    } catch (e: any) {
      console.error("sendReply error", e);
      setErr(e?.message ?? "Unable to send reply.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-6">
      <div className="flex items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">FAQ — Questions</h1>
          <p className="text-sm text-slate-600">Lire, répondre et gérer le statut (new / answered / closed).</p>
        </div>

        <Button
          type="button"
          variant="outline"
          className="rounded-full"
          onClick={loadQuestions}
          disabled={loading}
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Rafraîchir
        </Button>
      </div>

      {(err || okMsg) && (
        <div className="mb-5 space-y-2">
          {okMsg && (
            <div className="flex items-start gap-2 rounded-2xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-emerald-800">
              <CheckCircle2 className="w-5 h-5 mt-0.5" />
              <div className="text-sm">{okMsg}</div>
            </div>
          )}
          {err && (
            <div className="flex items-start gap-2 rounded-2xl bg-amber-50 border border-amber-200 px-4 py-3 text-amber-900">
              <AlertTriangle className="w-5 h-5 mt-0.5" />
              <div className="text-sm">{err}</div>
            </div>
          )}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[1.2fr,1.8fr] items-start">
        {/* Liste */}
        <Card className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="p-4 sm:p-5 border-b border-slate-100">
            <div className="flex items-center gap-2 mb-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  value={qSearch}
                  onChange={(e) => setQSearch(e.target.value)}
                  placeholder="Rechercher (nom, email, message, catégorie...)"
                  className="pl-9"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {(["new", "answered", "closed", "all"] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setTab(k)}
                  className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${
                    tab === k
                      ? "bg-pro-blue text-white border-pro-blue"
                      : "bg-white text-slate-700 border-slate-200 hover:border-pro-blue/50"
                  }`}
                >
                  {k.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div className="p-2 sm:p-3 max-h-[70vh] overflow-auto">
            {loading && <div className="p-3 text-sm text-slate-500">Chargement...</div>}
            {!loading && filtered.length === 0 && <div className="p-3 text-sm text-slate-500">Aucun résultat.</div>}

            {!loading &&
              filtered.map((q) => {
                const selected = q.id === activeId;
                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => setActiveId(q.id)}
                    className={`w-full text-left rounded-2xl border px-3 py-3 mb-2 transition-colors ${
                      selected ? "border-pro-blue bg-pro-blue/5" : "border-slate-200 bg-white hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-slate-900 truncate">
                          {q.subject || "(Sans objet)"}
                        </div>
                        <div className="text-xs text-slate-500 truncate">
                          {q.full_name || "—"} • {q.email || "—"}
                        </div>
                      </div>

                      <div className="shrink-0 text-right">
                        <Badge className={`border ${statusBadgeClass(q.status)}`}>{statusLabel(q.status)}</Badge>
                        <div className="text-[11px] text-slate-400 mt-1">{formatDate(q.created_at)}</div>
                      </div>
                    </div>

                    <div className="mt-2 text-xs text-slate-600 line-clamp-2">{q.message}</div>
                    {q.category && <div className="mt-2 text-[11px] text-slate-500">Catégorie: {q.category}</div>}
                  </button>
                );
              })}
          </div>
        </Card>

        {/* Détail */}
        <Card className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          {!active ? (
            <div className="p-6 text-sm text-slate-600">Sélectionnez une question.</div>
          ) : (
            <div className="p-5 sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <div className="lead min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-slate-900 truncate">
                      {active.subject || "(Sans objet)"}
                    </h2>
                    <Badge className={`border ${statusBadgeClass(active.status)}`}>{statusLabel(active.status)}</Badge>
                  </div>

                  <div className="text-xs text-slate-500 mt-1">
                    {formatDate(active.created_at)} • {active.full_name || "—"} • {active.email || "—"}
                  </div>

                  {active.category && <div className="text-xs text-slate-500 mt-1">Catégorie: {active.category}</div>}
                </div>
              </div>

              <div className="mt-4 rounded-2xl bg-slate-50 border border-slate-100 p-4">
                <div className="text-xs uppercase tracking-wide text-slate-500 mb-2">Message</div>
                <div className="text-sm text-slate-800 whitespace-pre-line">{active.message}</div>
              </div>

              {/* Status */}
              <div className="mt-5 rounded-2xl border border-slate-200 p-4">
                <div className="text-sm font-semibold text-slate-900 mb-2">Statut</div>
                <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                  <select
                    value={statusDraft}
                    onChange={(e) => setStatusDraft(e.target.value as FaqQuestion["status"])}
                    className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-pro-blue/25"
                  >
                    <option value="new">new</option>
                    <option value="answered">answered</option>
                    <option value="closed">closed</option>
                  </select>

                  <Button
                    type="button"
                    onClick={saveStatus}
                    disabled={statusSaving || statusDraft === active.status}
                    className="rounded-full bg-pro-blue hover:bg-pro-blue/90"
                  >
                    Enregistrer
                  </Button>

                  <div className="text-xs text-slate-500">
                    Astuce : “closed” pour archiver, “answered” après réponse.
                  </div>
                </div>
              </div>

              {/* Replies */}
              <div className="mt-5">
                <div className="text-sm font-semibold text-slate-900 mb-2">Réponses</div>

                {repliesLoading && <div className="text-sm text-slate-500">Chargement des réponses...</div>}

                {!repliesLoading && replies.length === 0 && (
                  <div className="text-sm text-slate-500">Aucune réponse pour le moment.</div>
                )}

                {!repliesLoading && replies.length > 0 && (
                  <div className="space-y-2">
                    {replies.map((r) => (
                      <div key={r.id} className="rounded-2xl border border-slate-200 bg-white p-3">
                        <div className="text-[11px] text-slate-400 mb-1">{formatDate(r.created_at)}</div>
                        <div className="text-sm text-slate-800 whitespace-pre-line">{r.content}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Reply box */}
              <div className="mt-4 rounded-2xl border border-slate-200 p-4 bg-slate-50">
                <div className="text-sm font-semibold text-slate-900 mb-2">Répondre</div>
                <Textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  rows={4}
                  placeholder="Écrivez votre réponse ici..."
                  disabled={sending}
                  className="bg-white"
                />
                <div className="mt-3 flex justify-end">
                  <Button
                    type="button"
                    onClick={sendReply}
                    disabled={sending || !replyText.trim()}
                    className="rounded-full bg-emerald-600 hover:bg-emerald-700 flex items-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    {sending ? "Envoi..." : "Envoyer la réponse"}
                  </Button>
                </div>

                <div className="mt-2 text-xs text-slate-500">
                  Note : le trigger SQL met automatiquement le statut à “answered” après insertion d’une réponse (sauf si
                  déjà “closed”).
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
