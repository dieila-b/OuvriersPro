// src/components/reviews/ClientReviewReplies.tsx
import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Loader2, MessageSquareText, ThumbsUp, BadgeCheck, ThumbsDown } from "lucide-react";

type VoteType = "like" | "useful" | "not_useful";

type ReplyRow = {
  id: string;
  review_id: string | null;
  client_id: string | null;
  worker_id: string | null;
  sender_role: "client" | "worker"; // NOT NULL
  content: string | null; // ✅ colonne réelle
  created_at: string;
};

type Props = {
  reviewId: string;
  clientId?: string | null; // op_clients.id (si connecté côté client)
  canReply?: boolean; // true si on veut afficher le formulaire
};

const ClientReviewReplies: React.FC<Props> = ({ reviewId, clientId, canReply = true }) => {
  const { language } = useLanguage();

  const [authUserId, setAuthUserId] = useState<string | null>(null);

  const [replies, setReplies] = useState<ReplyRow[]>([]);
  const [loading, setLoading] = useState(false);

  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [text, setText] = useState("");

  // Votes
  const [myVoteByReplyId, setMyVoteByReplyId] = useState<Record<string, VoteType | null>>({});
  const [countsByReplyId, setCountsByReplyId] = useState<
    Record<string, { like: number; useful: number; not_useful: number }>
  >({});

  const t = useMemo(() => {
    return {
      title: language === "fr" ? "Réponses" : "Replies",
      placeholder: language === "fr" ? "Écrire une réponse…" : "Write a reply…",
      send: language === "fr" ? "Répondre" : "Reply",
      loadError: language === "fr" ? "Impossible de charger les réponses." : "Unable to load replies.",
      postError: language === "fr" ? "Impossible d’envoyer votre réponse." : "Unable to post your reply.",
      noReply: language === "fr" ? "Aucune réponse pour le moment." : "No replies yet.",
      you: language === "fr" ? "Vous" : "You",
      worker: language === "fr" ? "Ouvrier" : "Worker",

      like: language === "fr" ? "J’aime" : "Like",
      useful: language === "fr" ? "Utile" : "Useful",
      notUseful: language === "fr" ? "Pas utile" : "Not useful",
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

  // A) Auth user (pour charger "mon vote")
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setAuthUserId(data.user?.id ?? null));
  }, []);

  // A) Charger replies
  const loadReplies = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from("op_worker_client_review_replies")
        .select("id, review_id, client_id, worker_id, sender_role, content, created_at")
        .eq("review_id", reviewId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setReplies((data || []) as ReplyRow[]);
    } catch (e: any) {
      console.error("ClientReviewReplies load error", e);
      setError(e?.message || t.loadError);
      setReplies([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!reviewId) return;
    loadReplies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reviewId, language]);

  // B) Votes: charger "mon vote" + compteurs après replies
  const replyIds = useMemo(() => replies.map((r) => r.id), [replies]);

  const loadMyVotes = async (ids: string[]) => {
    if (!authUserId || ids.length === 0) return;

    const { data, error } = await supabase
      .from("op_review_reply_votes")
      .select("reply_id, vote_type")
      .eq("voter_user_id", authUserId)
      .in("reply_id", ids);

    if (error) throw error;

    const map: Record<string, VoteType | null> = {};
    for (const row of data ?? []) {
      map[row.reply_id] = row.vote_type as VoteType;
    }
    setMyVoteByReplyId(map);
  };

  const loadCounts = async (ids: string[]) => {
    if (ids.length === 0) return;

    const init: Record<string, { like: number; useful: number; not_useful: number }> = {};
    ids.forEach((id) => (init[id] = { like: 0, useful: 0, not_useful: 0 }));

    const types: VoteType[] = ["like", "useful", "not_useful"];
    for (const vt of types) {
      const { data, error } = await supabase
        .from("op_review_reply_votes")
        .select("reply_id")
        .in("reply_id", ids)
        .eq("vote_type", vt);

      if (error) throw error;

      for (const row of data ?? []) {
        init[row.reply_id][vt] += 1;
      }
    }

    setCountsByReplyId(init);
  };

  const loadVotesAndCounts = async () => {
    if (replyIds.length === 0) {
      setMyVoteByReplyId({});
      setCountsByReplyId({});
      return;
    }
    await Promise.all([loadMyVotes(replyIds), loadCounts(replyIds)]);
  };

  useEffect(() => {
    loadVotesAndCounts().catch((e) => console.error("loadVotesAndCounts error", e));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [replyIds.join(","), authUserId]);

  // C) Toggle vote
  const toggleVote = async (replyId: string, voteType: VoteType) => {
    if (!authUserId) return;

    const current = myVoteByReplyId[replyId] ?? null;

    // 1) même vote => DELETE
    if (current === voteType) {
      const { error: delErr } = await supabase
        .from("op_review_reply_votes")
        .delete()
        .eq("reply_id", replyId)
        .eq("voter_user_id", authUserId);

      if (delErr) {
        console.error("toggleVote delete error", delErr);
        throw delErr;
      }

      // UI optimiste
      setMyVoteByReplyId((prev) => ({ ...prev, [replyId]: null }));
      setCountsByReplyId((prev) => {
        const base = prev[replyId] ?? { like: 0, useful: 0, not_useful: 0 };
        return {
          ...prev,
          [replyId]: { ...base, [voteType]: Math.max(0, base[voteType] - 1) },
        };
      });
      return;
    }

    // 2) vote différent => UPSERT (création ou remplacement)
    const payload = { reply_id: replyId, voter_user_id: authUserId, vote_type: voteType };

    const { error: upErr } = await supabase
      .from("op_review_reply_votes")
      .upsert(payload, { onConflict: "reply_id,voter_user_id" });

    if (upErr) {
      console.error("toggleVote upsert error", upErr);
      throw upErr;
    }

    // UI optimiste
    setMyVoteByReplyId((prev) => ({ ...prev, [replyId]: voteType }));
    setCountsByReplyId((prev) => {
      const base = prev[replyId] ?? { like: 0, useful: 0, not_useful: 0 };
      const next = { ...base };

      // décrémenter l'ancien vote si existant
      if (current) next[current] = Math.max(0, next[current] - 1);

      // incrémenter le nouveau
      next[voteType] = next[voteType] + 1;

      return { ...prev, [replyId]: next };
    });
  };

  // D) Envoyer réponse client (IMPORTANT: sender_role NOT NULL + content)
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
        client_id: clientId, // op_clients.id
        worker_id: null,
        sender_role: "client" as const, // ✅ évite l'erreur "sender_role null"
        content, // ✅ colonne réelle
      };

      const { data, error } = await supabase
        .from("op_worker_client_review_replies")
        .insert(payload)
        .select("id, review_id, client_id, worker_id, sender_role, content, created_at")
        .single();

      if (error) throw error;

      setReplies((prev) => [...prev, data as ReplyRow]);
      setText("");
    } catch (e: any) {
      console.error("ClientReviewReplies post error", e);
      setError(e?.message || t.postError);
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
            {replies.map((r) => {
              const isClient = r.sender_role === "client";
              const myVote = myVoteByReplyId[r.id] ?? null;
              const counts = countsByReplyId[r.id] ?? { like: 0, useful: 0, not_useful: 0 };

              return (
                <div
                  key={r.id}
                  className={`rounded-lg border p-3 ${
                    isClient ? "bg-slate-50 border-slate-100" : "bg-blue-50 border-blue-100"
                  }`}
                >
                  <div className="text-[11px] text-slate-500 mb-1">
                    {isClient ? t.you : t.worker} • {formatDateTime(r.created_at)}
                  </div>

                  <div className="text-sm text-slate-800 whitespace-pre-line">{r.content || ""}</div>

                  {/* Boutons votes */}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant={myVote === "like" ? "default" : "outline"}
                      className="h-8 px-3 text-xs"
                      onClick={() => toggleVote(r.id, "like")}
                    >
                      <ThumbsUp className="w-4 h-4 mr-2" />
                      {t.like} ({counts.like})
                    </Button>

                    <Button
                      type="button"
                      variant={myVote === "useful" ? "default" : "outline"}
                      className="h-8 px-3 text-xs"
                      onClick={() => toggleVote(r.id, "useful")}
                    >
                      <BadgeCheck className="w-4 h-4 mr-2" />
                      {t.useful} ({counts.useful})
                    </Button>

                    <Button
                      type="button"
                      variant={myVote === "not_useful" ? "default" : "outline"}
                      className="h-8 px-3 text-xs"
                      onClick={() => toggleVote(r.id, "not_useful")}
                    >
                      <ThumbsDown className="w-4 h-4 mr-2" />
                      {t.notUseful} ({counts.not_useful})
                    </Button>
                  </div>
                </div>
              );
            })}
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
