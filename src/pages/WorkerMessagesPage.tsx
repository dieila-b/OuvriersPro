// src/pages/WorkerMessagesPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Mail, Phone, MessageCircle, Clock, Info, Send } from "lucide-react";

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

type FilterKey = "all" | "unread";

const WorkerMessagesPage: React.FC = () => {
  const { language } = useLanguage();

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

  // Libellés
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
    requestOrigin: language === "fr" ? "Demande de devis via OuvrierPro" : "Request via OuvrierPro",
    contactInfo: language === "fr" ? "Informations de contact" : "Contact information",
    clientNameLabel: language === "fr" ? "Nom du client" : "Client name",
    noClientSelected:
      language === "fr"
        ? "Sélectionnez un client à gauche pour voir la conversation."
        : "Select a client on the left to view the conversation.",
    you: language === "fr" ? "Vous" : "You",
    client: language === "fr" ? "Client" : "Client",
    loadingErrorTitle: language === "fr" ? "Erreur de chargement" : "Loading error",
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
    if (filter === "unread") {
      return contacts.filter((c) => (c.status || "new") === "new");
    }
    return contacts;
  }, [contacts, filter]);

  const selectedContact = useMemo(
    () => contacts.find((c) => c.id === selectedContactId) || null,
    [contacts, selectedContactId]
  );

  // Récupération du worker + des contacts
  useEffect(() => {
    const loadContacts = async () => {
      setContactsLoading(true);
      setContactsError(null);

      try {
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError || !userData?.user) {
          throw new Error(language === "fr" ? "Vous devez être connecté." : "You must be logged in.");
        }

        // Worker
        const { data: workerData, error: workerError } = await supabase
          .from("op_ouvriers")
          .select(
            `
            id,
            user_id,
            first_name,
            last_name,
            email,
            phone
          `
          )
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

        // Contacts pour ce worker
        const { data: contactsData, error: contactsErr } = await supabase
          .from("op_ouvrier_contacts")
          .select(
            `
            id,
            worker_id,
            client_id,
            client_name,
            client_email,
            client_phone,
            message,
            status,
            origin,
            created_at
          `
          )
          .eq("worker_id", w.id)
          .order("created_at", { ascending: false });

        if (contactsErr) throw contactsErr;

        const list = (contactsData || []) as ContactRow[];
        setContacts(list);

        // Sélection initiale : 1er de la liste filtrée "all"
        if (list.length > 0) {
          setSelectedContactId(list[0].id);
        } else {
          setSelectedContactId(null);
        }
      } catch (e: any) {
        console.error("Error loading contacts", e);
        setContactsError(
          e?.message ||
            (language === "fr" ? "Impossible de charger vos clients." : "Unable to load your clients.")
        );
      } finally {
        setContactsLoading(false);
      }
    };

    loadContacts();
  }, [language]);

  // Marquer une conversation comme lue (status: new -> in_progress)
  const markContactAsRead = async (contactId: string) => {
    const current = contacts.find((c) => c.id === contactId);
    if (!current) return;
    if ((current.status || "new") !== "new") return;

    // Optimistic UI
    setContacts((prev) =>
      prev.map((c) => (c.id === contactId ? { ...c, status: "in_progress" } : c))
    );

    const { error } = await supabase
      .from("op_ouvrier_contacts")
      .update({ status: "in_progress" })
      .eq("id", contactId);

    if (error) {
      // rollback si besoin
      setContacts((prev) =>
        prev.map((c) => (c.id === contactId ? { ...c, status: "new" } : c))
      );
      console.error("markContactAsRead error", error);
    }
  };

  // Récupération des messages pour le contact sélectionné
  useEffect(() => {
    const loadMessages = async () => {
      if (!selectedContactId) {
        setMessages([]);
        return;
      }

      setMessagesLoading(true);
      setMessagesError(null);

      try {
        // IMPORTANT: table correcte
        const { data, error } = await supabase
          .from("op_client_worker_messages")
          .select(
            `
            id,
            contact_id,
            worker_id,
            client_id,
            sender_role,
            message,
            created_at
          `
          )
          .eq("contact_id", selectedContactId)
          .order("created_at", { ascending: true });

        if (error) throw error;

        setMessages((data || []) as MessageRow[]);
      } catch (e: any) {
        console.error("Error loading messages", e);
        setMessagesError(
          e?.message ||
            (language === "fr" ? "Impossible de charger les messages." : "Unable to load messages.")
        );
      } finally {
        setMessagesLoading(false);
      }
    };

    loadMessages();
  }, [selectedContactId, language]);

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
        .select(
          `
          id,
          contact_id,
          worker_id,
          client_id,
          sender_role,
          message,
          created_at
        `
        )
        .single();

      if (error) throw error;

      setMessages((prev) => [...prev, data as MessageRow]);
      setNewMessage("");

      // Optionnel : passer la demande en "in_progress" si ce n'est pas déjà le cas
      if ((selectedContact.status || "new") === "new") {
        await markContactAsRead(selectedContact.id);
      }
    } catch (e: any) {
      console.error("Error sending message", e);
      setMessagesError(
        e?.message || (language === "fr" ? "Impossible d'envoyer votre message." : "Unable to send your message.")
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-6">
      <div className="max-w-6xl mx-auto px-4">
        <h1 className="text-2xl font-bold text-slate-900 mb-4">{t.title}</h1>

        {/* Layout 3 colonnes comme ta capture : 3 / 6 / 3 */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Colonne 1 : liste des clients */}
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
              {contactsLoading && (
                <div className="p-4 text-sm text-slate-500">{t.loadingContacts}</div>
              )}

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

          {/* Colonne 2 : historique + saisie */}
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

                  {/* Message initial du formulaire */}
                  {selectedContact.message && (
                    <div className="mb-4 flex justify-start">
                      <div className="max-w-[85%] rounded-2xl bg-slate-100 px-3 py-2 text-sm text-slate-800">
                        <div className="text-[11px] font-semibold text-slate-500 mb-1">{t.client}</div>
                        <div className="whitespace-pre-line">{selectedContact.message}</div>
                      </div>
                    </div>
                  )}

                  {/* Messages internes */}
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
                              isWorker
                                ? "bg-blue-600 text-white rounded-br-sm"
                                : "bg-slate-100 text-slate-800 rounded-bl-sm"
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

            {/* Zone de saisie */}
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

          {/* Colonne 3 : fiche client */}
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

                <div className="px-4 py-3">
                  <div className="text-xs font-semibold text-slate-700 mb-1">{t.clientNameLabel}</div>
                  <div className="text-sm text-slate-800">{selectedContact.client_name || "—"}</div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Bandeau d'erreur global pour les messages */}
        {messagesError && (
          <div className="mt-4 bg-red-600 text-white text-sm px-4 py-3 rounded-lg max-w-lg ml-auto">
            <div className="font-semibold">{t.loadingErrorTitle}</div>
            <div>{t.loadMessagesError}</div>
            <div className="text-xs opacity-80 mt-1">{messagesError}</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkerMessagesPage;
