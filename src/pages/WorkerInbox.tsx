// src/pages/WorkerInbox.tsx
import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import {
  Mail,
  Phone,
  MessageCircle,
  Clock,
  CheckCheck,
} from "lucide-react";

type ContactThread = {
  id: string;
  worker_id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  message: string | null;
  status: string | null;
  created_at: string;
  origin: string | null;
  client_name: string | null;
  worker_name: string | null;
  client_email: string | null;
  client_phone: string | null;
  client_id: string | null;
};

type InternalMessage = {
  id: string;
  contact_id: string;
  sender_type: "worker" | "client";
  content: string;
  created_at: string;
};

type WorkerProfile = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  profession: string | null;
};

const WorkerInbox: React.FC = () => {
  const { language } = useLanguage();
  const { toast } = useToast();

  const [worker, setWorker] = useState<WorkerProfile | null>(null);

  const [contacts, setContacts] = useState<ContactThread[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [contactsError, setContactsError] = useState<string | null>(null);

  const [selectedContactId, setSelectedContactId] = useState<string | null>(
    null
  );
  const [selectedContact, setSelectedContact] =
    useState<ContactThread | null>(null);

  const [messages, setMessages] = useState<InternalMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const [internalMessage, setInternalMessage] = useState("");
  const [sendingInternal, setSendingInternal] = useState(false);

  const [filter, setFilter] = useState<"all" | "unread">("all");

  // --------------------------------------------------
  // Helpers
  // --------------------------------------------------
  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString(
        language === "fr" ? "fr-FR" : "en-GB",
        {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }
      );
    } catch {
      return iso;
    }
  };

  const formatTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleTimeString(
        language === "fr" ? "fr-FR" : "en-GB",
        {
          hour: "2-digit",
          minute: "2-digit",
        }
      );
    } catch {
      return "";
    }
  };

  const initials = (name: string | null): string => {
    if (!name) return "C";
    return name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((n) => n[0].toUpperCase())
      .join("");
  };

  // --------------------------------------------------
  // Chargement du worker + des conversations
  // --------------------------------------------------
  useEffect(() => {
    const loadWorkerAndContacts = async () => {
      setLoadingContacts(true);
      setContactsError(null);

      try {
        const { data: authData, error: authError } =
          await supabase.auth.getUser();
        const user = authData?.user;

        if (authError || !user) {
          throw new Error(
            language === "fr"
              ? "Vous devez être connecté pour accéder à votre messagerie."
              : "You must be logged in to access your inbox."
          );
        }

        // Récupération du profil ouvrier à partir du user_id
        const { data: workerRow, error: workerError } = await supabase
          .from("op_ouvriers")
          .select("id, first_name, last_name, profession")
          .eq("user_id", user.id)
          .maybeSingle();

        if (workerError || !workerRow) {
          throw new Error(
            language === "fr"
              ? "Impossible de trouver votre profil ouvrier."
              : "Unable to find your worker profile."
          );
        }

        setWorker(workerRow as WorkerProfile);

        // Récupération des formulaires de contact associés à cet ouvrier
        const { data: contactRows, error: contactError } = await supabase
          .from("op_ouvrier_contacts")
          .select(
            `id, worker_id, full_name, email, phone, message,
             status, created_at, origin,
             client_name, worker_name, client_email, client_phone, client_id`
          )
          .eq("worker_id", workerRow.id)
          .order("created_at", { ascending: false });

        if (contactError) {
          console.error("load contacts error", contactError);
          throw new Error(
            language === "fr"
              ? "Impossible de charger vos conversations."
              : "Unable to load your conversations."
          );
        }

        const list = (contactRows || []) as ContactThread[];
        setContacts(list);
        if (list.length > 0) {
          setSelectedContactId(list[0].id);
          setSelectedContact(list[0]);
        }
      } catch (err: any) {
        console.error(err);
        setContacts([]);
        setContactsError(err.message || "Error");
      } finally {
        setLoadingContacts(false);
      }
    };

    loadWorkerAndContacts();
  }, [language]);

  // --------------------------------------------------
  // Chargement des messages pour la conversation sélectionnée
  // --------------------------------------------------
  useEffect(() => {
    const loadMessages = async () => {
      if (!selectedContactId) {
        setMessages([]);
        setSelectedContact(null);
        return;
      }

      setLoadingMessages(true);

      try {
        // Recharger la fiche de contact pour avoir les infos à jour
        const { data: contactRow, error: contactError } = await supabase
          .from("op_ouvrier_contacts")
          .select(
            `id, worker_id, full_name, email, phone, message,
             status, created_at, origin,
             client_name, worker_name, client_email, client_phone, client_id`
          )
          .eq("id", selectedContactId)
          .maybeSingle();

        if (contactError || !contactRow) {
          throw new Error(
            language === "fr"
              ? "Impossible de charger cette conversation."
              : "Unable to load this conversation."
          );
        }

        const contact = contactRow as ContactThread;
        setSelectedContact(contact);

        // Charger les messages internes from op_client_worker_messages table
        const { data: msgRows, error: msgError } = await supabase
          .from("op_client_worker_messages")
          .select("id, contact_id, sender_role, message, created_at")
          .eq("contact_id", contact.id)
          .order("created_at", { ascending: true });

        if (msgError) {
          console.error("load messages error", msgError);
          throw new Error(
            language === "fr"
              ? "Impossible de charger les messages."
              : "Unable to load messages."
          );
        }

        // Map the data to InternalMessage format
        const msgs: InternalMessage[] = (msgRows || []).map((row: any) => ({
          id: row.id,
          contact_id: row.contact_id,
          sender_type: row.sender_role === "worker" ? "worker" : "client",
          content: row.message,
          created_at: row.created_at,
        }));

        // On ajoute le message initial du formulaire comme premier message client
        const allMessages: InternalMessage[] = [];

        if (contact.message) {
          allMessages.push({
            id: "initial-" + contact.id,
            contact_id: contact.id,
            sender_type: "client",
            content: contact.message,
            created_at: contact.created_at,
          });
        }

        allMessages.push(...msgs);

        setMessages(allMessages);
      } catch (err: any) {
        console.error(err);
        toast({
          variant: "destructive",
          title:
            language === "fr"
              ? "Erreur de chargement"
              : "Loading error",
          description: err.message || "Error",
        });
      } finally {
        setLoadingMessages(false);
      }
    };

    loadMessages();
  }, [selectedContactId, language, toast]);

  // --------------------------------------------------
  // Envoi d’un message interne
  // --------------------------------------------------
  const handleSendInternalReply = async () => {
    if (!internalMessage.trim() || !selectedContact) return;

    setSendingInternal(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      const user = authData?.user;

      if (authError || !user) {
        throw new Error(
          language === "fr"
            ? "Vous devez être connecté pour envoyer une réponse."
            : "You must be logged in to send a reply."
        );
      }

      const { data, error } = await supabase
        .from("op_client_worker_messages")
        .insert({
          contact_id: selectedContact.id,
          client_id: selectedContact.client_id || "",
          worker_id: selectedContact.worker_id,
          sender_role: "worker",
          message: internalMessage.trim(),
        })
        .select("id, contact_id, sender_role, message, created_at")
        .maybeSingle();

      if (error || !data) {
        console.error("insert internal message error", error);
        throw new Error(
          language === "fr"
            ? "Impossible d’enregistrer votre réponse."
            : "Unable to save your reply."
        );
      }

      const newMsg: InternalMessage = {
        id: data.id,
        contact_id: data.contact_id || "",
        sender_type: "worker",
        content: data.message,
        created_at: data.created_at,
      };
      setMessages((prev) => [...prev, newMsg]);
      setInternalMessage("");

      toast({
        title:
          language === "fr"
            ? "Réponse envoyée"
            : "Reply sent",
        description:
          language === "fr"
            ? "Votre réponse interne a bien été enregistrée."
            : "Your internal reply has been saved.",
      });
    } catch (err: any) {
      console.error(err);
      toast({
        variant: "destructive",
        title:
          language === "fr"
            ? "Erreur lors de l’envoi"
            : "Error while sending",
        description: err.message || "Error",
      });
    } finally {
      setSendingInternal(false);
    }
  };

  // --------------------------------------------------
  // Filtres sur les conversations
  // --------------------------------------------------
  const filteredContacts = useMemo(() => {
    if (filter === "unread") {
      return contacts.filter((c) => c.status === "new");
    }
    return contacts;
  }, [contacts, filter]);

  // --------------------------------------------------
  // Texte
  // --------------------------------------------------
  const text = {
    title:
      language === "fr"
        ? "Messagerie"
        : "Inbox",
    aboutSeller:
      language === "fr"
        ? "À propos de ce client"
        : "About this client",
    memberSince:
      language === "fr"
        ? "Client depuis"
        : "Client since",
    all: language === "fr" ? "Tout" : "All",
    unread: language === "fr" ? "Non lus" : "Unread",
    writeMessage:
      language === "fr"
        ? "Écrivez votre message"
        : "Write your message",
    noConversation:
      language === "fr"
        ? "Aucune conversation pour le moment."
        : "No conversations yet.",
    selectConversation:
      language === "fr"
        ? "Sélectionnez une conversation dans la liste."
        : "Select a conversation from the list.",
    lastActivity:
      language === "fr"
        ? "Dernière activité"
        : "Last activity",
    ad:
      language === "fr"
        ? "Demande de devis"
        : "Quote request",
    send:
      language === "fr"
        ? "Envoyer"
        : "Send",
    originWeb:
      language === "fr"
        ? "Formulaire site web"
        : "Website form",
  };

  // --------------------------------------------------
  // Rendu
  // --------------------------------------------------
  return (
    <div className="min-h-screen bg-slate-50 py-6">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-4">
          {text.title}
        </h1>

        <div className="bg-white border border-slate-200 rounded-xl shadow-sm grid grid-cols-1 md:grid-cols-[320px_minmax(0,1fr)_280px] min-h-[540px]">
          {/* COLONNE 1 : liste des conversations */}
          <div className="border-b md:border-b-0 md:border-r border-slate-200 flex flex-col">
            <div className="px-4 pt-4 pb-2 flex items-center justify-between">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setFilter("all")}
                  className={`px-3 py-1.5 text-sm rounded-full border ${
                    filter === "all"
                      ? "bg-pro-blue text-white border-pro-blue"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {text.all}
                </button>
                <button
                  type="button"
                  onClick={() => setFilter("unread")}
                  className={`px-3 py-1.5 text-sm rounded-full border ${
                    filter === "unread"
                      ? "bg-pro-blue text-white border-pro-blue"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {text.unread}
                </button>
              </div>
            </div>

            <div className="px-4 pb-2 text-xs text-slate-500">
              {language === "fr" ? "Sélectionner" : "Select"}
            </div>

            <div className="flex-1 overflow-y-auto">
              {contactsError && (
                <div className="px-4 py-3 text-xs text-red-600">
                  {contactsError}
                </div>
              )}

              {!contactsError && loadingContacts && (
                <div className="px-4 py-3 text-xs text-slate-500">
                  {language === "fr"
                    ? "Chargement des conversations..."
                    : "Loading conversations..."}
                </div>
              )}

              {!contactsError &&
                !loadingContacts &&
                filteredContacts.length === 0 && (
                  <div className="px-4 py-3 text-xs text-slate-500">
                    {text.noConversation}
                  </div>
                )}

              {!contactsError &&
                !loadingContacts &&
                filteredContacts.map((c) => {
                  const active = c.id === selectedContactId;
                  const displayName =
                    c.client_name || c.full_name || "Client";
                  const lastMsg = c.message || "";

                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setSelectedContactId(c.id)}
                      className={`w-full text-left px-4 py-3 flex gap-3 items-start border-l-4 ${
                        active
                          ? "bg-orange-50 border-orange-500"
                          : "border-transparent hover:bg-slate-50"
                      }`}
                    >
                      <div className="w-12 h-12 rounded-md bg-slate-100 flex items-center justify-center text-sm font-semibold text-slate-700">
                        {initials(displayName)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium text-slate-900 truncate">
                            {displayName}
                          </p>
                          <span className="text-[11px] text-slate-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDate(c.created_at)}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-slate-500 truncate">
                          {lastMsg}
                        </p>
                      </div>
                    </button>
                  );
                })}
            </div>
          </div>

          {/* COLONNE 2 : messages */}
          <div className="border-b md:border-b-0 md:border-r border-slate-200 flex flex-col">
            {/* Entête conversation */}
            <div className="px-6 py-4 border-b border-slate-200">
              {selectedContact ? (
                <>
                  <div className="font-semibold text-slate-900">
                    {text.aboutSeller}
                  </div>
                  <div className="mt-1 text-xs text-slate-500 flex items-center gap-2">
                    <span>
                      {text.memberSince}{" "}
                      {formatDate(selectedContact.created_at)}
                    </span>
                    {selectedContact.origin === "web" && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] bg-slate-100 text-slate-600">
                        {text.originWeb}
                      </span>
                    )}
                  </div>
                </>
              ) : (
                <div className="text-sm text-slate-500">
                  {text.selectConversation}
                </div>
              )}
            </div>

            {/* Zone messages */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {selectedContact && (
                <div className="text-center text-[11px] text-slate-400 mb-2">
                  {formatDate(selectedContact.created_at)}
                </div>
              )}

              {loadingMessages && selectedContact && (
                <div className="text-xs text-slate-500">
                  {language === "fr"
                    ? "Chargement des messages..."
                    : "Loading messages..."}
                </div>
              )}

              {selectedContact &&
                !loadingMessages &&
                messages.map((m) => {
                  const isWorker = m.sender_type === "worker";
                  return (
                    <div
                      key={m.id}
                      className={`flex ${
                        isWorker ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
                          isWorker
                            ? "bg-orange-100 text-slate-900"
                            : "bg-slate-100 text-slate-900"
                        }`}
                      >
                        <p className="whitespace-pre-line">{m.content}</p>
                        <div className="mt-1 flex items-center justify-end gap-1 text-[10px] text-slate-500">
                          <span>{formatTime(m.created_at)}</span>
                          {isWorker && (
                            <CheckCheck className="w-3 h-3 text-orange-400" />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

              {!selectedContact && (
                <div className="text-sm text-slate-500">
                  {text.selectConversation}
                </div>
              )}
            </div>

            {/* Zone de saisie */}
            {selectedContact && (
              <div className="border-t border-slate-200 px-4 py-3 flex items-center gap-3">
                <Textarea
                  rows={2}
                  className="flex-1 resize-none text-sm"
                  placeholder={text.writeMessage}
                  value={internalMessage}
                  onChange={(e) => setInternalMessage(e.target.value)}
                />
                <Button
                  size="icon"
                  className="rounded-full bg-orange-500 hover:bg-orange-600 flex-shrink-0"
                  type="button"
                  onClick={handleSendInternalReply}
                  disabled={
                    sendingInternal || !internalMessage.trim() || !selectedContact
                  }
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="w-5 h-5 text-white"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M22 2L11 13" />
                    <path d="M22 2L15 22L11 13L2 9L22 2Z" />
                  </svg>
                </Button>
              </div>
            )}
          </div>

          {/* COLONNE 3 : profil / contact */}
          <div className="hidden md:flex flex-col">
            {selectedContact ? (
              <>
                <div className="px-5 py-4 border-b border-slate-200 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-sm font-semibold text-slate-700">
                    {initials(
                      selectedContact.client_name ||
                        selectedContact.full_name ||
                        "Client"
                    )}
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900 text-sm">
                      {selectedContact.client_name ||
                        selectedContact.full_name ||
                        "Client"}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {text.lastActivity}: {formatDate(selectedContact.created_at)}
                    </div>
                  </div>
                </div>

                <div className="px-5 py-4 border-b border-slate-200 flex items-center gap-3">
                  <div className="w-16 h-16 rounded-md bg-slate-100 overflow-hidden flex items-center justify-center text-[11px] text-slate-500">
                    {text.ad}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-900 truncate">
                      {text.ad}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {language === "fr"
                        ? "Demande de devis via OuvrierPro"
                        : "Quote request via OuvrierPro"}
                    </div>
                  </div>
                </div>

                <div className="px-5 py-4 space-y-3">
                  <div className="text-xs font-semibold text-slate-700 mb-1">
                    {language === "fr"
                      ? "Informations de contact"
                      : "Contact details"}
                  </div>

                  {selectedContact.client_phone && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-start text-xs"
                      asChild
                    >
                      <a href={`tel:${selectedContact.client_phone}`}>
                        <Phone className="w-3 h-3 mr-2" />
                        {selectedContact.client_phone}
                      </a>
                    </Button>
                  )}

                  {selectedContact.client_email && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-start text-xs"
                      asChild
                    >
                      <a href={`mailto:${selectedContact.client_email}`}>
                        <Mail className="w-3 h-3 mr-2" />
                        {selectedContact.client_email}
                      </a>
                    </Button>
                  )}

                  {selectedContact.client_phone && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-start text-xs"
                      asChild
                    >
                      <a
                        href={`https://wa.me/${selectedContact.client_phone.replace(
                          /\s+/g,
                          ""
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <MessageCircle className="w-3 h-3 mr-2" />
                        WhatsApp
                      </a>
                    </Button>
                  )}

                  {/* Champs éditables au besoin */}
                  <div className="mt-4 space-y-2">
                    <label className="block text-[11px] text-slate-500">
                      {language === "fr" ? "Nom du client" : "Client name"}
                    </label>
                    <Input
                      size={12 as any}
                      value={
                        selectedContact.client_name ||
                        selectedContact.full_name ||
                        ""
                      }
                      disabled
                      className="text-xs"
                    />
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-xs text-slate-500 px-4 text-center">
                {text.selectConversation}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkerInbox;
