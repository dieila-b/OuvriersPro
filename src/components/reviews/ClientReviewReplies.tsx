import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Loader2, MessageSquareText } from "lucide-react";

type ReplyRow = {
  id: string;
  review_id: string;
  client_id: string;
  message: string;
  created_at: string;
};

type Props = {
  reviewId: string;
  clientId?: string | null; // op_clients.id (si connecté côté client)
  canReply?: boolean; // true si on veut afficher le formulaire
};

const ClientReviewReplies: React.FC<Props> = ({ reviewId, clientId, canReply }) => {
  const { language } = useLanguage();

  const [replies, setReplies] = useState<ReplyRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [text, setText] = useState("");

  const t = useMemo(() => {
    return {
      title: language === "fr" ? "Réponses du client" : "Client replies",
      placeholder: language === "fr" ? "Écrire une réponse…" : "Write a reply…",
      send: language === "fr" ? "Répondre" : "Reply",
      loadError: language === "fr" ? "Impossible de charger les réponses." : "Unable to load replies.",
      postError: language === "fr" ? "Impossible d’envoyer votre réponse." : "Unable to post your reply.",
      noReply: language === "fr" ? "Aucune réponse pour le moment." : "No replies yet.",
      you: language === "fr" ? "Vous" : "You",
    };
  }, [language]);

  const formatDateTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString(language === "fr" ? "fr-FR" : "en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const loadReplies = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from("op_worker_client_review_replies")
        .select("id, review_id, client_id, message, created_at")
        .eq("review_id", reviewId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setReplies((data || []) as ReplyRow[]);
    } catch (e) {
      console.error("ClientReviewReplies load error", e);
      setError(t.loadError);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!reviewId) return;
    loadReplies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reviewId, language]);

  const handleSend = async () => {
    if (!canReply) return;
    if (!clientId) return;
    const content = text.trim();
    if (!content) return;

    setPosting(true);
    setError(null);

    try {
      const payload = {
        review_id: reviewId,
        client_id: clientId, // ⚠️ op_clients.id (PAS auth.uid())
        message: content,
      };

      const { data, error } = await supabase
        .from("op_worker_client_review_replies")
        .insert(payload)
        .select("id, review_id, client_id, message, created_at")
        .single();

      if (error) throw error;

      setReplies((prev) => [...prev, data as ReplyRow]);
      setText("");
    } catch (e) {
      console.error("ClientReviewReplies post error", e);
      setError(t.postError);
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="mt-4 rounded-xl border border-slate-200 bg-white">
      <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
        <MessageSquareText className="w-4 h-4 text-slate-500" />
        <div className="text-sm font-semibold text-slate-900">{t.title}</div>
      </div>

      <div className="px-4 py-3">
        {loading && (
          <div className="text-sm text-slate-500 flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            {language === "fr" ? "Chargement..." : "Loading..."}
          </div>
        )}

        {!loading && replies.length === 0 && (
          <div className="text-sm text-slate-500">{t.noReply}</div>
        )}

        {!loading && replies.length > 0 && (
          <div className="space-y-3">
            {replies.map((r) => (
              <div key={r.id} className="rounded-lg bg-slate-50 border border-slate-100 p-3">
                <div className="text-[11px] text-slate-500 mb-1">
                  {t.you} • {formatDateTime(r.created_at)}
                </div>
                <div className="text-sm text-slate-800 whitespace-pre-line">{r.message}</div>
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="mt-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
            {error}
          </div>
        )}

        {canReply && (
          <div className="mt-4">
            <Textarea
              rows={2}
              placeholder={t.placeholder}
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={posting}
              className="text-sm"
            />
            <div className="mt-2 flex justify-end">
              <Button
                type="button"
                onClick={handleSend}
                disabled={posting || !text.trim() || !clientId}
                className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600"
              >
                {posting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {t.send}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClientReviewReplies;
