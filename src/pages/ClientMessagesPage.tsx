// src/pages/ClientMessagesPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Mail, Phone, MessageCircle, Clock, Info, Send } from "lucide-react";

type ClientRow = {
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
  message: string | null; // message initial (formulaire)
  status: string | null;
  origin: string | null;
  created_at: string;

  // jointure ouvrier
  worker?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    phone: string | null;
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
  sender_role: "worker" | "client";
  message: string | null;
  created_at: string;
};

const ClientMessagesPage: React.FC = () => {
  const { language } = useLanguage();

  const [client, setClient] = useState<ClientRow | null>(null);

  const [contacts, setContacts] = useState<ContactRow[]>([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [contactsError, setContactsError] = useState<string | null>(null);

  const [selectedContactId, setSelectedContactId] = useState<string | null>(
    null
  );

  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesError, setMessagesError] = useState<string | null>(null);

  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);

  const t = {
    title: language === "fr" ? "Messagerie" : "Messages",
    all: language === "fr" ? "Tout" : "All",
    unread: language === "fr" ? "Non lus" : "Unread",
    select: language === "fr" ? "Sélectionner" : "Select",
    loadingContacts:
      language === "fr" ? "Chargement des échanges…" : "Loading threads…",
    loadingMessages:
      language === "fr" ? "Chargement des messages…" : "Loading messages…",
    loadMessagesError:
      language === "fr"
        ? "Impossible de charger les messages."
        : "Unable to load messages.",
    loadContactsError:
      language === "fr"
        ? "Impossible de charger vos échanges."
        : "Unable to load your threads.",
    noContacts:
      language === "fr"
        ? "Aucun échange pour le moment."
        : "No conversation yet.",
    typeHere:
      language === "fr" ? "Écrivez votre message" : "Type your message",
    send: language === "fr" ? "Envoyer" : "Send",
    aboutWorker:
      language === "fr" ? "À propos de cet ouvrier" : "About this worker",
    since: language === "fr" ? "Demande créée le" : "Request created on",
    contactInfo:
      language === "fr" ? "Informations de contact" : "Contact information",
    workerNameLabel:
      language === "fr" ? "Nom de l’ouvrier" : "Worker name",
    noSelected:
      language === "fr"
        ? "Sélectionnez une demande à gauche pour voir la conversation."
        : "Select a thread on the left to view the conversation.",
    you: language === "fr" ? "Vous" : "You",
    workerLabel: language === "fr" ? "Ouvrier" : "Worker",
  };

  const initials = (name: string | null) =>
    (name || " ")
      .split(" ")
      .filter(Boolean)
      .map((n) => n[0])
      .join("")
      .toUpperCase() || "A";

  const fullName = (first?: string | null, last?: string | null) =>
    `${first || ""} ${last || ""}`.trim() || "—";

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

  const phoneToWhatsappUrl = (phone?: string | null, text?: string) => {
    if (!phone) return "";
    const clean = phone.replace(/\s+/g, "");
    if (!clean) return "";
    const normalized = clean.startsWith("+") ? clean.slice(1) : clean;
    let url = `https://wa.me/${normalized}`;
    if (text && text.trim()) url += `?text=${encodeURIComponent(text.trim())}`;
    return url;
  };

  // 1) Charger client + threads (contacts)
  useEffect(() => {
    const load = async () => {
      setContactsLoading(true);
      setContactsError(null);

      try {
        const { data: userData, error: userError } =
          await supabase.auth.getUser();
        if (userError || !userData?.user) {
          throw new Error(
            language === "fr"
              ? "Vous devez être connecté."
              : "You must be logged in."
          );
        }

        // Client profile
        const { data: clientData, error: clientError } = await supabase
          .from("op_clients")
          .select("id, user_id, first_name, last_name, email, phone")
          .eq("user_id", userData.user.id)
          .maybeSingle();

        if (clientError) throw clientError;
        if (!clientData) {
          throw new Error(
            language === "fr"
              ? "Aucun profil client associé à ce compte."
              : "No client profile for this account."
          );
        }
        const c = clientData as ClientRow;
        setClient(c);

        // Threads (contacts) : filtrage par client_id + jointure worker
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
            created_at,
            worker:op_ouvriers (
              id,
              first_name,
              last_name,
              email,
              phone,
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

        const list = (contactsData || []) as any[];
        const mapped: ContactRow[] = list.map((row) => ({
          ...row,
          worker: row.worker ?? null,
        }));

        setContacts(mapped);

        if (mapped.length > 0) setSelectedContactId(mapped[0].id);
      } catch (e: any) {
        console.error("ClientMessagesPage load contacts error", e);
        setContactsError(
          e?.message ||
            (language === "fr"
              ? "Impossible de charger vos échanges."
              : "Unable to load your threads.")
        );
      } finally {
        setContactsLoading(false);
      }
    };

    load();
  }, [language]);

  const selectedContact = useMemo(
    () => contacts.find((c) => c.id === selectedContactId) || null,
    [contacts, selectedContactId]
  );

  // 2) Charger les messages du thread sélectionné
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
      } catch (e) {
        console.error("ClientMessagesPage load messages error", e);
        setMessagesError(t.loadMessagesError);
      } finally {
        setMessagesLoading(false);
      }
    };

    loadMessages();
  }, [selectedContactId, language]); // t dépend de language

  const handleSend = async () => {
    if (!client || !selectedContact || !newMessage.trim()) return;

    const content = newMessage.trim();
    setSending(true);
    setMessagesError(null);

    try {
      const payload = {
        contact_id: selectedContact.id,
        worker_id: selectedContact.worker_id,
        client_id: client.id,
        sender_role: "client" as const,
        message: content,
      };

      const { data, error } = await supabase
        .from("op_client_worker_messages")
        .insert(payload)
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
    } catch (e) {
      console.error("ClientMessagesPage send error", e);
      setMessagesError(
        language === "fr"
          ? "Impossible d'envoyer votre message."
          : "Unable to send your message."
      );
    } finally {
      setSending(false);
    }
  };

  const workerName = selectedContact?.worker
    ? fullName(selectedContact.worker.first_name, selectedContact.worker.last_name)
    : "—";

  const workerPhone = selectedContact?.worker?.phone || null;
  const workerEmail = selectedContact?.worker?.email || null;

  return (
    <div className="min-h-screen bg-slate-50 py-6">
      <div className="max-w-6xl mx-auto px-4">
        <h1 className="text-2xl font-bold text-slate-900 mb-4">{t.title}</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Colonne 1 : threads */}
          <div className="bg-white rounded-xl border border-slate-200 flex flex-col">
            <div className="px-4 pt-3 flex items-center gap-3 border-b border-slate-100">
              <div className="flex gap-2">
                <button className="px-3 py-1 text-xs font-medium rounded-full bg-blue-600 text-white">
                  {t.all}
                </button>
                <button className="px-3 py-1 text-xs font-medium rounded-full bg-slate-100 text-slate-600">
                  {t.unread}
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
              {!contactsLoading && !contactsError && contacts.length === 0 && (
                <div className="p-4 text-sm text-slate-500">{t.noContacts}</div>
              )}

              {!contactsLoading && !contactsError && contacts.length > 0 && (
                <ul>
                  {contacts.map((c) => {
                    const w = c.worker;
                    const name = w ? fullName(w.first_name, w.last_name) : "Ouvrier";
                    return (
                      <li key={c.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedContactId(c.id)}
                          className={`w-full flex items-center gap-3 px-4 py-3 text-left border-b border-slate-100 hover:bg-slate-50 ${
                            selectedContactId === c.id
                              ? "bg-orange-50 border-l-4 border-l-orange-500"
                              : ""
                          }`}
                        >
                          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-xs font-semibold text-slate-600">
                            {initials(name)}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-sm font-semibold text-slate-900">
                                {name}
                              </span>
                              <span className="flex items-center gap-1 text-xs text-slate-400">
                                <Clock className="w-3 h-3" />
                                {formatDate(c.created_at)}
                              </span>
                            </div>
                            <div className="text-xs text-slate-500 truncate">
                              {c.message ||
                                (language === "fr"
                                  ? "Demande envoyée"
                                  : "Request sent")}
                            </div>
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
          <div className="bg-white rounded-xl border border-slate-200 flex flex-col">
            <div className="px-4 py-3 border-b border-slate-100">
              <div className="text-sm font-semibold text-slate-900">{t.aboutWorker}</div>
              {selectedContact && (
                <div className="text-xs text-slate-500 mt-1">
                  {t.since} {formatDate(selectedContact.created_at)}
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-3">
              {!selectedContact && (
                <div className="text-sm text-slate-500">{t.noSelected}</div>
              )}

              {selectedContact && (
                <>
                  <div className="text-center text-[11px] text-slate-400 mb-4">
                    {formatDate(selectedContact.created_at)}
                  </div>

                  {/* Message initial */}
                  {selectedContact.message && (
                    <div className="mb-4 flex justify-end">
                      <div className="max-w-[85%] rounded-2xl bg-blue-600 text-white px-3 py-2 text-sm rounded-br-sm">
                        <div className="text-[11px] font-semibold opacity-80 mb-1">
                          {t.you}
                        </div>
                        <div className="whitespace-pre-line">{selectedContact.message}</div>
                      </div>
                    </div>
                  )}

                  {/* Messages */}
                  {messagesLoading && (
                    <div className="text-sm text-slate-500">{t.loadingMessages}</div>
                  )}
                  {messagesError && (
                    <div className="text-sm text-red-600 mb-2 flex items-center gap-2">
                      <Info className="w-4 h-4" />
                      {t.loadMessagesError}
                    </div>
                  )}

                  {!messagesLoading && !messagesError && messages.map((m) => {
                    const isClient = m.sender_role === "client";
                    return (
                      <div
                        key={m.id}
                        className={`mb-3 flex ${isClient ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                            isClient
                              ? "bg-blue-600 text-white rounded-br-sm"
                              : "bg-slate-100 text-slate-800 rounded-bl-sm"
                          }`}
                        >
                          <div className="text-[10px] opacity-80 mb-0.5">
                            {isClient ? t.you : t.workerLabel} • {formatDateTime(m.created_at)}
                          </div>
                          <div className="whitespace-pre-line">{m.message}</div>
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>

            {/* Saisie */}
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

          {/* Colonne 3 : fiche ouvrier */}
          <div className="bg-white rounded-xl border border-slate-200 flex flex-col">
            <div className="px-4 py-3 border-b border-slate-100">
              <div className="text-sm font-semibold text-slate-900">{workerName}</div>
              {selectedContact && (
                <div className="text-[11px] text-slate-400">
                  {language === "fr"
                    ? `Dernière activité: ${formatDate(selectedContact.created_at)}`
                    : `Last activity: ${formatDate(selectedContact.created_at)}`}
                </div>
              )}
            </div>

            <div className="px-4 py-3 border-b border-slate-100">
              <div className="text-xs font-semibold text-slate-700 mb-2">
                {t.contactInfo}
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-slate-400" />
                  {workerPhone ? (
                    <a href={`tel:${workerPhone}`} className="text-slate-800">
                      {workerPhone}
                    </a>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-slate-400" />
                  {workerEmail ? (
                    <a href={`mailto:${workerEmail}`} className="text-slate-800">
                      {workerEmail}
                    </a>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <MessageCircle className="w-4 h-4 text-slate-400" />
                  {workerPhone ? (
                    <a
                      href={phoneToWhatsappUrl(workerPhone, newMessage)}
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
              <div className="text-xs font-semibold text-slate-700 mb-1">
                {t.workerNameLabel}
              </div>
              <div className="text-sm text-slate-800">{workerName}</div>

              {selectedContact?.worker?.profession && (
                <div className="mt-2 text-xs text-slate-500">
                  {selectedContact.worker.profession}
                </div>
              )}

              <div className="mt-2 text-xs text-slate-500">
                {[
                  selectedContact?.worker?.city,
                  selectedContact?.worker?.commune,
                  selectedContact?.worker?.district,
                ]
                  .filter(Boolean)
                  .join(" • ")}
              </div>
            </div>
          </div>
        </div>

        {/* Bandeau erreur messages */}
        {messagesError && (
          <div className="mt-4 bg-red-600 text-white text-sm px-4 py-3 rounded-lg max-w-lg ml-auto">
            <div className="font-semibold">
              {language === "fr" ? "Erreur de chargement" : "Loading error"}
            </div>
            <div>{t.loadMessagesError}</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClientMessagesPage;
