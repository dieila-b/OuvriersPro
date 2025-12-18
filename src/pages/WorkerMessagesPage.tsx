// src/pages/WorkerMessagesPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Mail, Phone, MessageCircle, Clock, Info, Send, Star, X } from "lucide-react";

type WorkerRow = {
  id: string;
  user_id: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
};

type ContactRow = {
  id: string;
  worker_id: string | null;
  client_id: string | null;
  client_name: string | null;
  client_email: string | null;
  client_phone: string | null;
  message: string | null;
  status: string | null; // "new" | "in_progress" | "done"
  origin: string | null;
  created_at: string;
};

type MessageRow = {
  id: string;
  contact_id: string | null;
  worker_id: string | null;
  client_id: string | null;
  sender_role: "worker" | "client";
  message: string | null;
  created_at: string;
};

type ReviewRow = {
  id: string;
  worker_id: string;
  client_id: string;
  contact_id: string | null;
  rating: number;
  title: string | null;
  content: string;
  is_published: boolean;
  created_at: string;
};

type ReviewReplyRow = {
  id: string;
  review_id: string | null;
  client_id: string | null;
  worker_id: string | null;
  sender_role: "client" | "worker";
  content: string | null;
  created_at: string;
};

type VoteType = "like" | "useful" | "not_useful";
type FilterKey = "all" | "unread";

const WorkerMessagesPage: React.FC = () => {
  const { language } = useLanguage();

  const [authUserId, setAuthUserId] = useState<string | null>(null);

  const [worker, setWorker] = useState<WorkerRow | null>(null);

  const [contacts, setContacts] = useState<ContactRow[]>([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [contactsError, setContactsError] = useState<string | null>(null);

  const [filter, setFilter] = useState<FilterKey>("all");
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);

  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesError, setMessagesError] = useState<string | null>(null);

  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);

  // Avis (ouvrier -> client)
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [existingReview, setExistingReview] = useState<ReviewRow | null>(null);

  const [reviewRating, setReviewRating] = useState<number>(5);
  const [reviewTitle, setReviewTitle] = useState<string>("");
  const [reviewContent, setReviewContent] = useState<string>("");
  const [reviewPublish, setReviewPublish] = useState<boolean>(true);
  const [reviewSaving, setReviewSaving] = useState(false);

  // Replies (client + ouvrier) sur l'avis
  const [reviewReplies, setReviewReplies] = useState<ReviewReplyRow[]>([]);
  const [repliesLoading, setRepliesLoading] = useState(false);
  const [repliesError, setRepliesError] = useState<string | null>(null);

  // Ouvrier répond à l'avis
  const [workerReplyContent, setWorkerReplyContent] = useState("");
  const [workerReplySending, setWorkerReplySending] = useState(false);
  const [workerReplyError, setWorkerReplyError] = useState<string | null>(null);

  // Votes (Like / Utile / Pas utile)
  const [myVoteByReplyId, setMyVoteByReplyId] = useState<Record<string, VoteType | null>>({});
  const [countsByReplyId, setCountsByReplyId] = useState<
    Record<string, { like: number; useful: number; not_useful: number }>
  >({});

  const t = {
    title: language === "fr" ? "Messagerie" : "Messages",
    all: language === "fr" ? "Tout" : "All",
    unread: language === "fr" ? "Non lus" : "Unread",
    select: language === "fr" ? "Sélectionner" : "Select",
    loadingContacts: language === "fr" ? "Chargement des clients…" : "Loading clients…",
    loadingMessages: language === "fr" ? "Chargement des messages…" : "Loading messages…",
    loadMessagesError: language === "fr" ? "Impossible de charger les messages." : "Unable to load messages.",
    loadContactsError: language === "fr" ? "Impossible de charger vos clients." : "Unable to load your clients.",
    noContacts: language === "fr" ? "Aucune demande reçue pour le moment." : "No requests yet.",
    typeHere: language === "fr" ? "Écrivez votre message" : "Type your message",
    send: language === "fr" ? "Envoyer" : "Send",
    aboutClient: language === "fr" ? "À propos de ce client" : "About this client",
    since: language === "fr" ? "Client depuis" : "Client since",
    webForm: language === "fr" ? "Formulaire site web" : "Web form",
    requestType: language === "fr" ? "Demande de devis" : "Quote request",
    requestOrigin:
      language === "fr" ? "Demande de devis via OuvrierPro" : "Request via OuvrierPro",
    contactInfo: language === "fr" ? "Informations de contact" : "Contact information",
    clientNameLabel: language === "fr" ? "Nom du client" : "Client name",
    noClientSelected:
      language === "fr"
        ? "Sélectionnez un client à gauche pour voir la conversation."
        : "Select a client on the left to view the conversation.",
    you: language === "fr" ? "Vous" : "You",
    client: language === "fr" ? "Client" : "Client",
    loadingErrorTitle: language === "fr" ? "Erreur de chargement" : "Loading error",

    // Avis
    leaveReview: language === "fr" ? "Laisser un avis public" : "Leave a public review",
    reviewTitle: language === "fr" ? "Titre (optionnel)" : "Title (optional)",
    reviewContent: language === "fr" ? "Votre avis" : "Your review",
    publishReview: language === "fr" ? "Rendre l’avis public" : "Make review public",
    saveReview: language === "fr" ? "Publier" : "Publish",
    savingReview: language === "fr" ? "Publication..." : "Publishing...",
    close: language === "fr" ? "Fermer" : "Close",
    reviewLoadError: language === "fr" ? "Impossible de charger l'avis." : "Unable to load the review.",
    reviewSendError:
      language === "fr" ? "Impossible de publier l'avis." : "Unable to publish the review.",
    ratingLabel: language === "fr" ? "Note" : "Rating",
    alreadyPublished: language === "fr" ? "Déjà publié" : "Already published",
    publicLabel: language === "fr" ? "Public" : "Public",
    privateLabel: language === "fr" ? "Privé" : "Private",

    // Replies
    repliesTitle: language === "fr" ? "Réponses" : "Replies",
    repliesEmpty: language === "fr" ? "Aucune réponse pour le moment." : "No reply yet.",
    repliesLoadError:
      language === "fr" ? "Impossible de charger les réponses." : "Unable to load replies.",
    repliesLoading: language === "fr" ? "Chargement des réponses..." : "Loading replies...",

    // Ouvrier réagit
    replyAsWorkerTitle: language === "fr" ? "Réagir à l'avis" : "React to the review",
    replyHere: language === "fr" ? "Écrivez votre réponse..." : "Write your reply...",
    sendReply: language === "fr" ? "Répondre" : "Reply",
    sendingReply: language === "fr" ? "Envoi..." : "Sending...",
    replySendError:
      language === "fr" ? "Impossible d'envoyer votre réponse." : "Unable to send your reply.",

    // Votes
    like: language === "fr" ? "J’aime" : "Like",
    useful: language === "fr" ? "Utile" : "Useful",
    notUseful: language === "fr" ? "Pas utile" : "Not useful",
  };

  const initials = (name: string | null) =>
    (name || " ")
      .split(" ")
      .filter(Boolean)
      .map((n) => n[0])
      .join("")
      .toUpperCase() || "A";

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString(language === "fr" ? "fr-FR" : "en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

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

  const phoneToWhatsappUrl = (phone?: string | null) => {
    if (!phone) return "";
    const clean = phone.replace(/\s+/g, "");
    if (!clean) return "";
    const normalized = clean.startsWith("+") ? clean.slice(1) : clean;
    return `https://wa.me/${normalized}`;
  };

  const unreadCount = useMemo(
    () => contacts.filter((c) => (c.status || "new") === "new").length,
    [contacts]
  );

  const filteredContacts = useMemo(() => {
    if (filter === "unread") return contacts.filter((c) => (c.status || "new") === "new");
    return contacts;
  }, [contacts, filter]);

  const selectedContact = useMemo(
    () => contacts.find((c) => c.id === selectedContactId) || null,
    [contacts, selectedContactId]
  );

  // 0) Auth user id
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setAuthUserId(data.user?.id ?? null));
  }, []);

  // 1) Load worker + contacts
  useEffect(() => {
    const loadContacts = async () => {
      setContactsLoading(true);
      setContactsError(null);

      try {
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError || !userData?.user) {
          throw new Error(language === "fr" ? "Vous devez être connecté." : "You must be logged in.");
        }

        const { data: workerData, error: workerError } = await supabase
          .from("op_ouvriers")
          .select("id, user_id, first_name, last_name, email, phone")
          .eq("user_id", userData.user.id)
          .maybeSingle();

        if (workerError) throw workerError;
        if (!workerData) {
          throw new Error(
            language === "fr" ? "Aucun profil ouvrier associé à ce compte." : "No worker profile for this account."
          );
        }

        const w = workerData as WorkerRow;
        setWorker(w);

        const { data: contactsData, error: contactsErr } = await supabase
          .from("op_ouvrier_contacts")
          .select("id, worker_id, client_id, client_name, client_email, client_phone, message, status, origin, created_at")
          .eq("worker_id", w.id)
          .order("created_at", { ascending: false });

        if (contactsErr) throw contactsErr;

        const list = (contactsData || []) as ContactRow[];
        setContacts(list);
        setSelectedContactId(list.length > 0 ? list[0].id : null);
      } catch (e: any) {
        setContactsError(e?.message || (language === "fr" ? "Impossible de charger vos clients." : "Unable to load your clients."));
      } finally {
        setContactsLoading(false);
      }
    };

    loadContacts();
  }, [language]);

  const markContactAsRead = async (contactId: string) => {
    const current = contacts.find((c) => c.id === contactId);
    if (!current) return;
    if ((current.status || "new") !== "new") return;

    setContacts((prev) => prev.map((c) => (c.id === contactId ? { ...c, status: "in_progress" } : c)));

    const { error } = await supabase.from("op_ouvrier_contacts").update({ status: "in_progress" }).eq("id", contactId);

    if (error) {
      setContacts((prev) => prev.map((c) => (c.id === contactId ? { ...c, status: "new" } : c)));
    }
  };

  // 2) Load messages for selected contact
  useEffect(() => {
    const loadMessages = async () => {
      if (!selectedContactId) {
        setMessages([]);
        return;
      }

      setMessagesLoading(true);
      setMessagesError(null);

      try {
        const { data, error } = await supabase
          .from("op_client_worker_messages")
          .select("id, contact_id, worker_id, client_id, sender_role, message, created_at")
          .eq("contact_id", selectedContactId)
          .order("created_at", { ascending: true });

        if (error) throw error;
        setMessages((data || []) as MessageRow[]);
      } catch (e: any) {
        setMessagesError(e?.message || (language === "fr" ? "Impossible de charger les messages." : "Unable to load messages."));
      } finally {
        setMessagesLoading(false);
      }
    };

    loadMessages();
  }, [selectedContactId, language]);

  // 3) Load existing review + replies
  useEffect(() => {
    const loadReviewAndReplies = async () => {
      setExistingReview(null);
      setReviewReplies([]);
      setReviewError(null);
      setRepliesError(null);
      setWorkerReplyContent("");
      setWorkerReplyError(null);
      setMyVoteByReplyId({});
      setCountsByReplyId({});

      if (!worker?.id || !selectedContact?.client_id) return;

      setReviewLoading(true);
      setRepliesLoading(true);

      try {
        const { data: byContact, error: e1 } = await supabase
          .from("op_worker_client_reviews")
          .select("id, worker_id, client_id, contact_id, rating, title, content, is_published, created_at")
          .eq("worker_id", worker.id)
          .eq("client_id", selectedContact.client_id)
          .eq("contact_id", selectedContact.id)
          .maybeSingle();

        if (e1) throw e1;

        let found: ReviewRow | null = (byContact as ReviewRow) || null;

        if (!found) {
          const { data: byPair, error: e2 } = await supabase
            .from("op_worker_client_reviews")
            .select("id, worker_id, client_id, contact_id, rating, title, content, is_published, created_at")
            .eq("worker_id", worker.id)
            .eq("client_id", selectedContact.client_id)
            .is("contact_id", null)
            .order("created_at", { ascending: false })
            .limit(1);

          if (e2) throw e2;
          if (byPair && byPair.length > 0) found = byPair[0] as ReviewRow;
        }

        if (!found?.id) return;

        setExistingReview(found);

        const { data: reps, error: repErr } = await supabase
          .from("op_worker_client_review_replies")
          .select("id, review_id, client_id, worker_id, sender_role, content, created_at")
          .eq("review_id", found.id)
          .order("created_at", { ascending: true });

        if (repErr) {
          setRepliesError(repErr.message || t.repliesLoadError);
          setReviewReplies([]);
          return;
        }

        setReviewReplies((reps || []) as ReviewReplyRow[]);
      } catch (e: any) {
        setReviewError(e?.message || t.reviewLoadError);
      } finally {
        setReviewLoading(false);
        setRepliesLoading(false);
      }
    };

    loadReviewAndReplies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [worker?.id, selectedContactId, language]);

  const handleSelectContact = async (contactId: string) => {
    setSelectedContactId(contactId);
    await markContactAsRead(contactId);
  };

  const handleSend = async () => {
    if (!worker || !selectedContact || !newMessage.trim()) return;

    const content = newMessage.trim();
    setSending(true);
    setMessagesError(null);

    try {
      const insertPayload = {
        contact_id: selectedContact.id,
        worker_id: worker.id,
        client_id: selectedContact.client_id,
        sender_role: "worker" as const,
        message: content,
      };

      const { data, error } = await supabase
        .from("op_client_worker_messages")
        .insert(insertPayload)
        .select("id, contact_id, worker_id, client_id, sender_role, message, created_at")
        .single();

      if (error) throw error;

      setMessages((prev) => [...prev, data as MessageRow]);
      setNewMessage("");

      if ((selectedContact.status || "new") === "new") await markContactAsRead(selectedContact.id);
    } catch (e: any) {
      setMessagesError(e?.message || (language === "fr" ? "Impossible d'envoyer votre message." : "Unable to send your message."));
    } finally {
      setSending(false);
    }
  };

  // 4) Votes: load my votes + counts (after replies loaded)
  const loadMyVotes = async (replyIds: string[]) => {
    if (!authUserId || replyIds.length === 0) return;

    const { data, error } = await supabase
      .from("op_review_reply_votes")
      .select("reply_id, vote_type")
      .eq("voter_user_id", authUserId)
      .in("reply_id", replyIds);

    if (error) throw error;

    const map: Record<string, VoteType | null> = {};
    for (const row of data ?? []) map[row.reply_id] = row.vote_type as VoteType;
    setMyVoteByReplyId(map);
  };

  const loadCounts = async (replyIds: string[]) => {
    if (replyIds.length === 0) return;

    const init: Record<string, { like: number; useful: number; not_useful: number }> = {};
    replyIds.forEach((id) => (init[id] = { like: 0, useful: 0, not_useful: 0 }));

    const types: VoteType[] = ["like", "useful", "not_useful"];
    for (const vt of types) {
      const { data, error } = await supabase
        .from("op_review_reply_votes")
        .select("reply_id")
        .in("reply_id", replyIds)
        .eq("vote_type", vt);

      if (error) throw error;

      for (const row of data ?? []) init[row.reply_id][vt] += 1;
    }

    setCountsByReplyId(init);
  };

  const loadVotesAndCounts = async () => {
    const replyIds = reviewReplies.map((r) => r.id);
    await Promise.all([loadMyVotes(replyIds), loadCounts(replyIds)]);
  };

  useEffect(() => {
    if (reviewReplies.length > 0) loadVotesAndCounts().catch(console.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reviewReplies.map((r) => r.id).join(","), authUserId]);

  // 5) TOGGLE vote
  const toggleVote = async (replyId: string, voteType: VoteType) => {
    const current = myVoteByReplyId[replyId] ?? null;
    if (!authUserId) return;

    // CASE 1: same vote => delete (toggle off)
    if (current === voteType) {
      const { error } = await supabase
        .from("op_review_reply_votes")
        .delete()
        .eq("reply_id", replyId)
        .eq("voter_user_id", authUserId);

      if (error) throw error;

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

    // CASE 2: different vote or none => upsert (replace)
    const payload = { reply_id: replyId, voter_user_id: authUserId, vote_type: voteType };

    const { error } = await supabase
      .from("op_review_reply_votes")
      .upsert(payload, { onConflict: "reply_id,voter_user_id" });

    if (error) throw error;

    setMyVoteByReplyId((prev) => ({ ...prev, [replyId]: voteType }));

    setCountsByReplyId((prev) => {
      const base = prev[replyId] ?? { like: 0, useful: 0, not_useful: 0 };
      const next = { ...base };

      // if replacing an old vote, decrement old
      if (current) next[current] = Math.max(0, next[current] - 1);
      // increment new
      next[voteType] = next[voteType] + 1;

      return { ...prev, [replyId]: next };
    });
  };

  // 6) Worker reply insert (IMPORTANT: sender_role NOT NULL)
  const handleSendWorkerReply = async () => {
    if (!worker?.id || !existingReview?.id) return;
    if (!workerReplyContent.trim()) return;

    setWorkerReplySending(true);
    setWorkerReplyError(null);

    try {
      const payload = {
        review_id: existingReview.id,
        worker_id: worker.id,
        client_id: null,
        sender_role: "worker" as const,
        content: workerReplyContent.trim(),
      };

      const { data, error } = await supabase
        .from("op_worker_client_review_replies")
        .insert(payload)
        .select("id, review_id, client_id, worker_id, sender_role, content, created_at")
        .single();

      if (error) throw error;

      setReviewReplies((prev) => [...prev, data as ReviewReplyRow]);
      setWorkerReplyContent("");
    } catch (e: any) {
      setWorkerReplyError(e?.message || t.replySendError);
    } finally {
      setWorkerReplySending(false);
    }
  };

  const openReviewModal = () => {
    setReviewRating(5);
    setReviewTitle("");
    setReviewContent("");
    setReviewPublish(true);
    setReviewError(null);
    setReviewOpen(true);
  };

  const closeReviewModal = () => setReviewOpen(false);

  const saveReview = async () => {
    if (!worker || !selectedContact?.client_id) return;

    if (!reviewContent.trim()) {
      setReviewError(language === "fr" ? "Le contenu est obligatoire." : "Content is required.");
      return;
    }
    if (reviewRating < 1 || reviewRating > 5) {
      setReviewError(language === "fr" ? "La note doit être entre 1 et 5." : "Rating must be 1 to 5.");
      return;
    }

    setReviewSaving(true);
    setReviewError(null);

    try {
      const payload = {
        worker_id: worker.id,
        client_id: selectedContact.client_id,
        contact_id: selectedContact.id,
        rating: reviewRating,
        title: reviewTitle.trim() ? reviewTitle.trim() : null,
        content: reviewContent.trim(),
        is_published: reviewPublish,
      };

      const { data, error } = await supabase
        .from("op_worker_client_reviews")
        .insert(payload)
        .select("id, worker_id, client_id, contact_id, rating, title, content, is_published, created_at")
        .single();

      if (error) throw error;

      setExistingReview(data as ReviewRow);
      setReviewReplies([]);
      setRepliesError(null);
      setWorkerReplyContent("");
      setWorkerReplyError(null);

      setReviewOpen(false);
    } catch (e: any) {
      setReviewError(e?.message || t.reviewSendError);
    } finally {
      setReviewSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-6">
      <div className="max-w-6xl mx-auto px-4">
        <h1 className="text-2xl font-bold text-slate-900 mb-4">{t.title}</h1>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Colonne 1 : liste clients */}
          <div className="bg-white rounded-xl border border-slate-200 flex flex-col lg:col-span-3">
            <div className="px-4 pt-3 flex items-center gap-3 border-b border-slate-100">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setFilter("all")}
                  className={`px-3 py-1 text-xs font-medium rounded-full ${
                    filter === "all" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {t.all}
                </button>
                <button
                  type="button"
                  onClick={() => setFilter("unread")}
                  className={`px-3 py-1 text-xs font-medium rounded-full ${
                    filter === "unread" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {t.unread}
                  {unreadCount > 0 && (
                    <span className="ml-2 inline-flex items-center justify-center min-w-5 h-5 px-1 rounded-full bg-white/20 text-[11px]">
                      {unreadCount}
                    </span>
                  )}
                </button>
              </div>
              <div className="ml-auto text-[11px] text-slate-400">{t.select}</div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {contactsLoading && <div className="p-4 text-sm text-slate-500">{t.loadingContacts}</div>}

              {contactsError && (
                <div className="p-4 text-sm text-red-600">
                  {t.loadContactsError}
                  <br />
                  <span className="text-xs text-red-400">{contactsError}</span>
                </div>
              )}

              {!contactsLoading && !contactsError && filteredContacts.length === 0 && (
                <div className="p-4 text-sm text-slate-500">{t.noContacts}</div>
              )}

              {!contactsLoading && !contactsError && filteredContacts.length > 0 && (
                <ul>
                  {filteredContacts.map((c) => {
                    const isSelected = selectedContactId === c.id;
                    const isUnread = (c.status || "new") === "new";

                    return (
                      <li key={c.id}>
                        <button
                          type="button"
                          onClick={() => handleSelectContact(c.id)}
                          className={`w-full flex items-center gap-3 px-4 py-3 text-left border-b border-slate-100 hover:bg-slate-50 ${
                            isSelected ? "bg-orange-50 border-l-4 border-l-orange-500" : ""
                          }`}
                        >
                          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-xs font-semibold text-slate-600">
                            {initials(c.client_name)}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-sm font-semibold text-slate-900 truncate">
                                {c.client_name || "Client"}
                              </span>
                              <span className="flex items-center gap-1 text-xs text-slate-400 shrink-0">
                                <Clock className="w-3 h-3" />
                                {formatDate(c.created_at)}
                              </span>
                            </div>

                            <div className="text-xs text-slate-500 truncate">
                              {c.message ||
                                (language === "fr"
                                  ? "Type de demande : Demande de devis"
                                  : "Request type: Quote")}
                            </div>

                            {isUnread && (
                              <div className="mt-1">
                                <span className="inline-flex items-center px-2 py-0.5 text-[10px] rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                                  {language === "fr" ? "Nouveau" : "New"}
                                </span>
                              </div>
                            )}
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>

          {/* Colonne 2 : conversation */}
          <div className="bg-white rounded-xl border border-slate-200 flex flex-col lg:col-span-6">
            <div className="px-4 py-3 border-b border-slate-100">
              <div className="text-sm font-semibold text-slate-900">{t.aboutClient}</div>
              {selectedContact && (
                <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                  {t.since} {formatDate(selectedContact.created_at)}
                  <span className="inline-flex items-center px-2 py-0.5 text-[10px] rounded-full bg-slate-100 text-slate-600">
                    {t.webForm}
                  </span>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-3">
              {!selectedContact && <div className="text-sm text-slate-500">{t.noClientSelected}</div>}

              {selectedContact && (
                <>
                  <div className="text-center text-[11px] text-slate-400 mb-4">
                    {formatDate(selectedContact.created_at)}
                  </div>

                  {selectedContact.message && (
                    <div className="mb-4 flex justify-start">
                      <div className="max-w-[85%] rounded-2xl bg-slate-100 px-3 py-2 text-sm text-slate-800">
                        <div className="text-[11px] font-semibold text-slate-500 mb-1">{t.client}</div>
                        <div className="whitespace-pre-line">{selectedContact.message}</div>
                      </div>
                    </div>
                  )}

                  {messagesLoading && <div className="text-sm text-slate-500">{t.loadingMessages}</div>}

                  {messagesError && (
                    <div className="text-sm text-red-600 mb-2 flex items-center gap-2">
                      <Info className="w-4 h-4" />
                      {t.loadMessagesError}
                    </div>
                  )}

                  {!messagesLoading &&
                    !messagesError &&
                    messages.map((m) => {
                      const isWorker = m.sender_role === "worker";
                      return (
                        <div key={m.id} className={`mb-3 flex ${isWorker ? "justify-end" : "justify-start"}`}>
                          <div
                            className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                              isWorker ? "bg-blue-600 text-white rounded-br-sm" : "bg-slate-100 text-slate-800 rounded-bl-sm"
                            }`}
                          >
                            <div className="text-[10px] opacity-80 mb-0.5">
                              {isWorker ? t.you : t.client} • {formatDateTime(m.created_at)}
                            </div>
                            <div className="whitespace-pre-line">{m.message}</div>
                          </div>
                        </div>
                      );
                    })}
                </>
              )}
            </div>

            <div className="border-t border-slate-100 px-4 py-3">
              <Textarea
                rows={2}
                className="text-sm"
                placeholder={t.typeHere}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                disabled={!selectedContact || sending}
              />
              <div className="mt-2 flex justify-end">
                <Button
                  type="button"
                  className="flex items-center gap-1 bg-orange-500 hover:bg-orange-600"
                  onClick={handleSend}
                  disabled={!selectedContact || !newMessage.trim() || sending}
                >
                  <Send className="w-4 h-4" />
                  {t.send}
                </Button>
              </div>
            </div>
          </div>

          {/* Colonne 3 : fiche + avis + replies */}
          <div className="bg-white rounded-xl border border-slate-200 flex flex-col lg:col-span-3">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-3">
              {selectedContact ? (
                <>
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-xs font-semibold text-slate-600">
                    {initials(selectedContact.client_name)}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-900 truncate">
                      {selectedContact.client_name || "Client"}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {language === "fr"
                        ? `Dernière activité: ${formatDate(selectedContact.created_at)}`
                        : `Last activity: ${formatDate(selectedContact.created_at)}`}
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-sm text-slate-500">{t.noClientSelected}</div>
              )}
            </div>

            {selectedContact && (
              <>
                <div className="px-4 py-3 border-b border-slate-100 flex gap-3">
                  <div className="flex flex-col items-center justify-center w-20 rounded-lg bg-slate-50 border border-slate-100 p-2 text-center">
                    <div className="text-[11px] text-slate-500">{t.requestType}</div>
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-slate-900">{t.requestType}</div>
                    <div className="text-[11px] text-slate-500">{t.requestOrigin}</div>
                  </div>
                </div>

                <div className="px-4 py-3 border-b border-slate-100">
                  <div className="text-xs font-semibold text-slate-700 mb-2">{t.contactInfo}</div>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-slate-400" />
                      {selectedContact.client_phone ? (
                        <a href={`tel:${selectedContact.client_phone}`} className="text-slate-800">
                          {selectedContact.client_phone}
                        </a>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-slate-400" />
                      {selectedContact.client_email ? (
                        <a href={`mailto:${selectedContact.client_email}`} className="text-slate-800">
                          {selectedContact.client_email}
                        </a>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <MessageCircle className="w-4 h-4 text-slate-400" />
                      {selectedContact.client_phone ? (
                        <a
                          href={phoneToWhatsappUrl(selectedContact.client_phone)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-slate-800"
                        >
                          WhatsApp
                        </a>
                      ) : (
                        <span className="text-slate-400">WhatsApp</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="px-4 py-3 border-b border-slate-100">
                  <div className="text-xs font-semibold text-slate-700 mb-1">{t.clientNameLabel}</div>
                  <div className="text-sm text-slate-800">{selectedContact.client_name || "—"}</div>
                </div>

                {/* Bloc Avis + Réponses */}
                <div className="px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-xs font-semibold text-slate-700">{t.leaveReview}</div>

                    {reviewLoading ? (
                      <span className="text-[11px] text-slate-400">
                        {language === "fr" ? "Chargement..." : "Loading..."}
                      </span>
                    ) : existingReview ? (
                      <span className="text-[11px] text-green-600">{t.alreadyPublished}</span>
                    ) : null}
                  </div>

                  {reviewError && (
                    <div className="mt-2 text-xs text-red-600">
                      {t.reviewLoadError}
                      <div className="text-[11px] text-red-400">{reviewError}</div>
                    </div>
                  )}

                  {existingReview ? (
                    <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`w-4 h-4 ${
                                i < (existingReview.rating || 0) ? "text-orange-500 fill-orange-500" : "text-slate-300"
                              }`}
                            />
                          ))}
                        </div>
                        <div className="text-[11px] text-slate-400">{formatDate(existingReview.created_at)}</div>
                      </div>

                      {existingReview.title && (
                        <div className="mt-2 text-sm font-semibold text-slate-900">{existingReview.title}</div>
                      )}
                      <div className="mt-1 text-sm text-slate-700 whitespace-pre-line">{existingReview.content}</div>

                      <div className="mt-2 text-[11px] text-slate-500">
                        {existingReview.is_published ? t.publicLabel : t.privateLabel}
                      </div>

                      {/* Réponses + Votes */}
                      <div className="mt-4 border-t border-slate-200 pt-3">
                        <div className="text-xs font-semibold text-slate-700 mb-2">{t.repliesTitle}</div>

                        {repliesError && (
                          <div className="mb-2 text-xs text-red-600">
                            {t.repliesLoadError}
                            <div className="text-[11px] text-red-400">{repliesError}</div>
                          </div>
                        )}

                        {repliesLoading && <div className="text-xs text-slate-500">{t.repliesLoading}</div>}

                        {!repliesLoading && !repliesError && reviewReplies.length === 0 && (
                          <div className="text-xs text-slate-500">{t.repliesEmpty}</div>
                        )}

                        {!repliesLoading && reviewReplies.length > 0 && (
                          <div className="space-y-3">
                            {reviewReplies.map((rep) => {
                              const isClient = rep.sender_role === "client";
                              const myVote = myVoteByReplyId[rep.id] ?? null;
                              const counts = countsByReplyId[rep.id] ?? { like: 0, useful: 0, not_useful: 0 };

                              return (
                                <div
                                  key={rep.id}
                                  className={`rounded-lg border px-3 py-2 ${
                                    isClient ? "bg-white border-slate-100" : "bg-blue-50 border-blue-100"
                                  }`}
                                >
                                  <div className="text-[11px] text-slate-400">
                                    {isClient ? t.client : t.you} • {formatDateTime(rep.created_at)}
                                  </div>
                                  <div className="text-sm text-slate-700 whitespace-pre-line mt-1">
                                    {rep.content || ""}
                                  </div>

                                  {/* Votes */}
                                  <div className="mt-3 flex flex-wrap gap-2">
                                    <Button
                                      type="button"
                                      variant={myVote === "like" ? "default" : "outline"}
                                      className="h-8 px-3 text-xs"
                                      onClick={() => toggleVote(rep.id, "like")}
                                    >
                                      {t.like} ({counts.like})
                                    </Button>

                                    <Button
                                      type="button"
                                      variant={myVote === "useful" ? "default" : "outline"}
                                      className="h-8 px-3 text-xs"
                                      onClick={() => toggleVote(rep.id, "useful")}
                                    >
                                      {t.useful} ({counts.useful})
                                    </Button>

                                    <Button
                                      type="button"
                                      variant={myVote === "not_useful" ? "default" : "outline"}
                                      className="h-8 px-3 text-xs"
                                      onClick={() => toggleVote(rep.id, "not_useful")}
                                    >
                                      {t.notUseful} ({counts.not_useful})
                                    </Button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Zone "réagir" côté ouvrier */}
                        <div className="mt-4">
                          <div className="text-xs font-semibold text-slate-700 mb-2">{t.replyAsWorkerTitle}</div>

                          {workerReplyError && (
                            <div className="mb-2 text-xs text-red-600">
                              {t.replySendError}
                              <div className="text-[11px] text-red-400">{workerReplyError}</div>
                            </div>
                          )}

                          <Textarea
                            rows={2}
                            className="text-sm bg-white"
                            placeholder={t.replyHere}
                            value={workerReplyContent}
                            onChange={(e) => setWorkerReplyContent(e.target.value)}
                            disabled={!worker?.id || workerReplySending}
                          />
                          <div className="mt-2 flex justify-end">
                            <Button
                              type="button"
                              className="flex items-center gap-1 bg-orange-500 hover:bg-orange-600"
                              onClick={handleSendWorkerReply}
                              disabled={!worker?.id || !workerReplyContent.trim() || workerReplySending}
                            >
                              <Send className="w-4 h-4" />
                              {workerReplySending ? t.sendingReply : t.sendReply}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      className="mt-3 w-full bg-orange-500 hover:bg-orange-600"
                      onClick={openReviewModal}
                      disabled={!worker || !selectedContact?.client_id}
                    >
                      {t.leaveReview}
                    </Button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {messagesError && (
          <div className="mt-4 bg-red-600 text-white text-sm px-4 py-3 rounded-lg max-w-lg ml-auto">
            <div className="font-semibold">{t.loadingErrorTitle}</div>
            <div>{t.loadMessagesError}</div>
            <div className="text-xs opacity-80 mt-1">{messagesError}</div>
          </div>
        )}
      </div>

      {/* Modal Avis */}
      {reviewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={closeReviewModal} />
          <div className="relative w-full max-w-lg mx-4 bg-white rounded-2xl border border-slate-200 shadow-xl">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <div className="text-sm font-semibold text-slate-900">{t.leaveReview}</div>
              <button
                type="button"
                onClick={closeReviewModal}
                className="p-2 rounded-lg hover:bg-slate-50"
                aria-label={t.close}
              >
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <div className="text-xs font-semibold text-slate-700 mb-2">{t.ratingLabel}</div>
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, i) => {
                    const value = i + 1;
                    const active = value <= reviewRating;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setReviewRating(value)}
                        className="p-1"
                        aria-label={`${value} / 5`}
                      >
                        <Star className={`w-6 h-6 ${active ? "text-orange-500" : "text-slate-300"}`} />
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="text-xs font-semibold text-slate-700 mb-2">{t.reviewTitle}</div>
                <input
                  value={reviewTitle}
                  onChange={(e) => setReviewTitle(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                  placeholder={language === "fr" ? "Ex: Client sérieux" : "e.g. Reliable client"}
                />
              </div>

              <div>
                <div className="text-xs font-semibold text-slate-700 mb-2">{t.reviewContent}</div>
                <Textarea
                  rows={5}
                  className="text-sm"
                  value={reviewContent}
                  onChange={(e) => setReviewContent(e.target.value)}
                  placeholder={
                    language === "fr" ? "Décrivez votre expérience avec ce client…" : "Describe your experience with this client…"
                  }
                  disabled={reviewSaving}
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  id="publishReview"
                  type="checkbox"
                  className="h-4 w-4"
                  checked={reviewPublish}
                  onChange={(e) => setReviewPublish(e.target.checked)}
                  disabled={reviewSaving}
                />
                <label htmlFor="publishReview" className="text-sm text-slate-700">
                  {t.publishReview}
                </label>
              </div>

              {reviewError && <div className="text-sm text-red-600">{reviewError}</div>}
            </div>

            <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <Button type="button" variant="outline" onClick={closeReviewModal}>
                {t.close}
              </Button>
              <Button
                type="button"
                className="bg-orange-500 hover:bg-orange-600"
                onClick={saveReview}
                disabled={reviewSaving || !reviewContent.trim()}
              >
                {reviewSaving ? t.savingReview : t.saveReview}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkerMessagesPage;
