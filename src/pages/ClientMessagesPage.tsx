// src/pages/ClientMessagesPage.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNetworkStatus } from "@/services/networkService";
import { localStore } from "@/services/localStore";
import { authCache } from "@/services/authCache";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Mail,
  Phone,
  MessageCircle,
  Clock,
  Info,
  Send,
  ArrowLeft,
  Camera,
  Image as ImageIcon,
  Loader2,
  WifiOff,
} from "lucide-react";

// Capacitor (mobile)
import { Capacitor } from "@capacitor/core";
import { Camera as CapCamera, CameraResultType, CameraSource } from "@capacitor/camera";

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
  message: string | null;
  status: string | null;
  origin: string | null;
  created_at: string;
  sync_status?: "pending" | "synced";

  worker?: {
    id: string | null;
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
  media_type?: string | null;
  media_path?: string | null;
  sync_status?: "pending" | "synced";
};

type ThreadFilter = "all" | "unread";

type OfflineQueueItem = {
  id: string;
  action_type:
    | "CREATE_CONTACT_REQUEST"
    | "ADD_FAVORITE"
    | "REMOVE_FAVORITE"
    | "SEND_CLIENT_MESSAGE";
  table_name: "op_ouvrier_contacts" | "op_ouvrier_favorites" | "op_client_worker_messages";
  payload_json: Record<string, any>;
  created_at: string;
  status: "pending";
  retry_count: number;
};

const BUCKET_CHAT = "chat-media";
const SIGNED_URL_TTL = 60 * 60;

const CLIENT_CACHE_PREFIX = "cached_client_profile";
const CONTACTS_CACHE_PREFIX = "cached_client_contacts";
const MESSAGES_CACHE_PREFIX = "cached_client_messages";
const OFFLINE_QUEUE_KEY = "offline_queue_v1";

const getClientCacheKey = (userId?: string | null) =>
  userId ? `${CLIENT_CACHE_PREFIX}:${userId}` : CLIENT_CACHE_PREFIX;

const getContactsCacheKey = (userId?: string | null) =>
  userId ? `${CONTACTS_CACHE_PREFIX}:${userId}` : CONTACTS_CACHE_PREFIX;

const getMessagesCacheKey = (contactId?: string | null) =>
  contactId ? `${MESSAGES_CACHE_PREFIX}:${contactId}` : MESSAGES_CACHE_PREFIX;

const createOfflineId = (prefix: string) =>
  `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

function extFromMime(mime?: string | null) {
  if (!mime) return "jpg";
  const m = mime.toLowerCase();
  if (m.includes("png")) return "png";
  if (m.includes("webp")) return "webp";
  return "jpg";
}

async function fileFromWebPick(): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = () => resolve(input.files?.[0] ?? null);
    input.click();
  });
}

async function blobFromCapacitorCamera(): Promise<{ blob: Blob; mimeType: string } | null> {
  const perm = await CapCamera.requestPermissions();
  if (perm.camera !== "granted" && perm.photos !== "granted") {
    throw new Error("Permission caméra/photos refusée");
  }

  const photo = await CapCamera.getPhoto({
    quality: 85,
    allowEditing: false,
    resultType: CameraResultType.Uri,
    source: CameraSource.Prompt,
  });

  if (!photo.webPath) return null;

  const res = await fetch(photo.webPath);
  const blob = await res.blob();
  const mimeType = blob.type || "image/jpeg";
  return { blob, mimeType };
}

async function uploadChatImage(params: {
  contactId: string;
  senderUserId: string;
}): Promise<{ storagePath: string; mediaType: "image" }> {
  const { contactId, senderUserId } = params;

  let blob: Blob | null = null;
  let mimeType = "image/jpeg";

  if (Capacitor.isNativePlatform()) {
    const cap = await blobFromCapacitorCamera();
    if (!cap) throw new Error("Aucune image sélectionnée");
    blob = cap.blob;
    mimeType = cap.mimeType;
  } else {
    const f = await fileFromWebPick();
    if (!f) throw new Error("Aucune image sélectionnée");
    blob = f;
    mimeType = f.type || "image/jpeg";
  }

  const ext = extFromMime(mimeType);
  const fileName = `${Date.now()}-${Math.random().toString(16).slice(2)}.${ext}`;
  const storagePath = `contacts/${contactId}/${senderUserId}/${fileName}`;

  const { error: upErr } = await supabase.storage
    .from(BUCKET_CHAT)
    .upload(storagePath, blob, { contentType: mimeType, upsert: false });

  if (upErr) throw upErr;

  return { storagePath, mediaType: "image" };
}

async function createSignedUrl(path: string): Promise<string | null> {
  try {
    const { data, error } = await supabase.storage
      .from(BUCKET_CHAT)
      .createSignedUrl(path, SIGNED_URL_TTL);
    if (error) return null;
    return data?.signedUrl ?? null;
  } catch {
    return null;
  }
}

const ClientMessagesList: React.FC = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const { connected, initialized } = useNetworkStatus();

  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [client, setClient] = useState<ClientRow | null>(null);

  const [contacts, setContacts] = useState<ContactRow[]>([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [contactsError, setContactsError] = useState<string | null>(null);
  const [contactsFromCache, setContactsFromCache] = useState(false);

  const [filter, setFilter] = useState<ThreadFilter>("all");
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);

  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesError, setMessagesError] = useState<string | null>(null);
  const [messagesFromCache, setMessagesFromCache] = useState(false);

  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);

  const [signedUrlByPath, setSignedUrlByPath] = useState<Record<string, string>>({});
  const signingInFlightRef = useRef<Record<string, boolean>>({});
  const reconcileTimerRef = useRef<number | null>(null);

  const t = {
    backToClientSpace: language === "fr" ? "Retour à l’espace client" : "Back to client space",
    title: language === "fr" ? "Messagerie" : "Messages",
    all: language === "fr" ? "Tout" : "All",
    unread: language === "fr" ? "Non lus" : "Unread",
    select: language === "fr" ? "Sélectionner" : "Select",
    loadingContacts: language === "fr" ? "Chargement des échanges…" : "Loading threads…",
    loadingMessages: language === "fr" ? "Chargement des messages…" : "Loading messages…",
    loadMessagesError: language === "fr" ? "Impossible de charger les messages." : "Unable to load messages.",
    loadContactsError: language === "fr" ? "Impossible de charger vos échanges." : "Unable to load your threads.",
    noContacts: language === "fr" ? "Aucun échange pour le moment." : "No conversation yet.",
    noUnread: language === "fr" ? "Aucun message non lu." : "No unread messages.",
    typeHere: language === "fr" ? "Écrivez votre message" : "Type your message",
    send: language === "fr" ? "Envoyer" : "Send",
    image: language === "fr" ? "Image" : "Image",
    aboutWorker: language === "fr" ? "À propos de cet ouvrier" : "About this worker",
    since: language === "fr" ? "Demande créée le" : "Request created on",
    contactInfo: language === "fr" ? "Informations de contact" : "Contact information",
    workerNameLabel: language === "fr" ? "Nom de l’ouvrier" : "Worker name",
    noSelected:
      language === "fr"
        ? "Sélectionnez une demande à gauche pour voir la conversation."
        : "Select a thread on the left to view the conversation.",
    you: language === "fr" ? "Vous" : "You",
    workerLabel: language === "fr" ? "Ouvrier" : "Worker",
    threadFallback: language === "fr" ? "Demande de devis" : "Quote request",
    offlineTitle: language === "fr" ? "Mode hors connexion" : "Offline mode",
    offlineDesc:
      language === "fr"
        ? "Vos derniers échanges restent consultables. Les nouveaux messages texte partent en attente de synchronisation."
        : "Your recent conversations remain available. New text messages stay pending until sync.",
    cacheThreads:
      language === "fr"
        ? "Échanges chargés depuis le cache local."
        : "Threads loaded from local cache.",
    cacheMessages:
      language === "fr"
        ? "Messages chargés depuis le cache local."
        : "Messages loaded from local cache.",
    pending: language === "fr" ? "En attente" : "Pending",
    synced: language === "fr" ? "Synchronisé" : "Synced",
    savedOffline:
      language === "fr"
        ? "Message enregistré localement. Il sera envoyé dès le retour du réseau."
        : "Message saved locally. It will be sent when the network returns.",
    imageOffline:
      language === "fr"
        ? "L’envoi d’image reste disponible uniquement en ligne pour le moment."
        : "Image sending is online-only for now.",
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

  const isUnreadThread = (c: ContactRow) => {
    const s = (c.status || "").toLowerCase().trim();
    return s === "new" || s === "unread" || s === "pending";
  };

  const getThreadTitle = (contact: ContactRow) => {
    const raw = (contact.message || "").replace(/\s+/g, " ").trim();
    if (raw) return raw;
    return t.threadFallback;
  };

  const readQueue = async (): Promise<OfflineQueueItem[]> => {
    return (await localStore.get<OfflineQueueItem[]>(OFFLINE_QUEUE_KEY)) || [];
  };

  const addQueueItem = async (item: OfflineQueueItem) => {
    const queue = await readQueue();
    await localStore.set(OFFLINE_QUEUE_KEY, [item, ...queue]);
  };

  const loadCachedMessages = async (contactId: string) => {
    return (await localStore.get<MessageRow[]>(getMessagesCacheKey(contactId))) || [];
  };

  const saveCachedMessages = async (contactId: string, items: MessageRow[]) => {
    await localStore.set(getMessagesCacheKey(contactId), items);
  };

  const mergeAndDeduplicateMessages = (items: MessageRow[]) => {
    const map = new Map<string, MessageRow>();

    for (const item of items) {
      const existing = map.get(item.id);

      if (!existing) {
        map.set(item.id, item);
        continue;
      }

      map.set(item.id, {
        ...existing,
        ...item,
        sync_status:
          item.sync_status === "pending" || existing.sync_status === "pending"
            ? "pending"
            : item.sync_status ?? existing.sync_status ?? "synced",
      });
    }

    return Array.from(map.values()).sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
  };

  const loadPendingQueueMessagesForContact = async (contactId: string): Promise<MessageRow[]> => {
    const queue = await readQueue();

    return queue
      .filter(
        (item) =>
          item.action_type === "SEND_CLIENT_MESSAGE" &&
          item.status === "pending" &&
          item.payload_json?.contact_id === contactId
      )
      .map((item) => ({
        id: String(item.payload_json?.local_message_id || item.id),
        contact_id: item.payload_json?.contact_id ?? null,
        worker_id: item.payload_json?.worker_id ?? null,
        client_id: item.payload_json?.client_id ?? null,
        sender_role: "client" as const,
        message: item.payload_json?.message ?? "",
        created_at: item.payload_json?.created_at || item.created_at,
        media_type: item.payload_json?.media_type ?? null,
        media_path: item.payload_json?.media_path ?? null,
        sync_status: "pending" as const,
      }));
  };

  const computeThreadSyncStatus = (items: MessageRow[]): "pending" | "synced" => {
    return items.some((m) => m.sync_status === "pending") ? "pending" : "synced";
  };

  const persistThreadSyncStatusFromMessages = async (
    contactId: string,
    threadMessages: MessageRow[],
    nextContactsOverride?: ContactRow[]
  ) => {
    const nextStatus = computeThreadSyncStatus(threadMessages);

    setContacts((prev) => {
      const base = nextContactsOverride ?? prev;
      const next = base.map((c) =>
        c.id === contactId ? { ...c, sync_status: nextStatus } : c
      );
      return next;
    });

    const currentUserId = authUserId || (await authCache.getUserId());
    if (!currentUserId) return;

    const baseContacts = nextContactsOverride ?? contacts;
    const nextContacts = baseContacts.map((c) =>
      c.id === contactId ? { ...c, sync_status: nextStatus } : c
    );
    await localStore.set(getContactsCacheKey(currentUserId), nextContacts);
  };

  const areMessagesLikelySame = (pendingMsg: MessageRow, serverMsg: MessageRow) => {
    if (pendingMsg.sender_role !== "client" || serverMsg.sender_role !== "client") return false;
    if ((pendingMsg.contact_id || "") !== (serverMsg.contact_id || "")) return false;
    if ((pendingMsg.worker_id || "") !== (serverMsg.worker_id || "")) return false;
    if ((pendingMsg.client_id || "") !== (serverMsg.client_id || "")) return false;

    const pendingText = (pendingMsg.message || "").trim();
    const serverText = (serverMsg.message || "").trim();

    if (pendingText !== serverText) return false;
    if ((pendingMsg.media_type || null) !== (serverMsg.media_type || null)) return false;

    const pendingTime = new Date(pendingMsg.created_at).getTime();
    const serverTime = new Date(serverMsg.created_at).getTime();
    const diff = Math.abs(serverTime - pendingTime);

    return diff <= 5 * 60 * 1000;
  };

  const reconcilePendingAgainstServer = async (
    contactId: string,
    serverMessages: MessageRow[]
  ): Promise<MessageRow[]> => {
    const queue = await readQueue();
    const queuedLocalIds = new Set(
      queue
        .filter(
          (item) =>
            item.action_type === "SEND_CLIENT_MESSAGE" &&
            item.status === "pending" &&
            item.payload_json?.contact_id === contactId
        )
        .map((item) => String(item.payload_json?.local_message_id || item.id))
    );

    const cached = await loadCachedMessages(contactId);
    const result: MessageRow[] = [];

    for (const msg of cached) {
      if (msg.sync_status !== "pending") {
        result.push(msg);
        continue;
      }

      const stillQueued = queuedLocalIds.has(msg.id);

      if (stillQueued) {
        result.push(msg);
        continue;
      }

      const matchedServer = serverMessages.some((serverMsg) => areMessagesLikelySame(msg, serverMsg));

      if (!matchedServer) {
        result.push(msg);
      }
    }

    return mergeAndDeduplicateMessages([
      ...result.filter((m) => m.sync_status !== "pending"),
      ...serverMessages.map((m) => ({ ...m, sync_status: "synced" as const })),
      ...result.filter((m) => m.sync_status === "pending"),
    ]);
  };

  const refreshPendingMessagesForCurrentThread = async (contactId: string) => {
    const cached = await loadCachedMessages(contactId);
    const pending = await loadPendingQueueMessagesForContact(contactId);

    const syncedOnly = cached.filter((m) => m.sync_status !== "pending");
    const merged = mergeAndDeduplicateMessages([...syncedOnly, ...pending]);

    await saveCachedMessages(contactId, merged);
    await persistThreadSyncStatusFromMessages(contactId, merged);

    if (selectedContactId === contactId) {
      setMessages(merged);
    }
  };

  const fetchServerMessagesForContact = async (contactId: string): Promise<MessageRow[]> => {
    const attempt1 = await supabase
      .from("op_client_worker_messages")
      .select(
        "id, contact_id, worker_id, client_id, sender_role, message, media_type, media_path, created_at"
      )
      .eq("contact_id", contactId)
      .order("created_at", { ascending: true });

    if (!attempt1.error) {
      return ((attempt1.data || []) as MessageRow[]).map((m) => ({
        ...m,
        sync_status: "synced",
      }));
    }

    const attempt2 = await supabase
      .from("op_client_worker_messages")
      .select("id, contact_id, worker_id, client_id, sender_role, message, created_at")
      .eq("contact_id", contactId)
      .order("created_at", { ascending: true });

    if (attempt2.error) throw attempt2.error;

    return ((attempt2.data || []) as MessageRow[]).map((m) => ({
      ...m,
      sync_status: "synced",
    }));
  };

  const reconcileThreadFromServer = async (contactId: string) => {
    if (!connected || !contactId) return;

    try {
      const serverMessages = await fetchServerMessagesForContact(contactId);
      const merged = await reconcilePendingAgainstServer(contactId, serverMessages);

      await saveCachedMessages(contactId, merged);
      await persistThreadSyncStatusFromMessages(contactId, merged);

      if (selectedContactId === contactId) {
        setMessages(merged);
        setMessagesFromCache(false);
      }
    } catch (e) {
      console.warn("[ClientMessagesPage] reconcileThreadFromServer error", e);
    }
  };

  const recomputeAllThreadSyncStatuses = async () => {
    const currentUserId = authUserId || (await authCache.getUserId());
    if (!currentUserId) return;

    const baseContacts = (await localStore.get<ContactRow[]>(getContactsCacheKey(currentUserId))) || contacts;
    if (!baseContacts.length) return;

    const nextContacts: ContactRow[] = [];

    for (const contact of baseContacts) {
      const cachedMessages = await loadCachedMessages(contact.id);
      const pendingQueueMessages = await loadPendingQueueMessagesForContact(contact.id);
      const merged = mergeAndDeduplicateMessages([...cachedMessages, ...pendingQueueMessages]);

      if (merged.length) {
        await saveCachedMessages(contact.id, merged);
      }

      nextContacts.push({
        ...contact,
        sync_status: computeThreadSyncStatus(merged),
      });
    }

    setContacts(nextContacts);
    await localStore.set(getContactsCacheKey(currentUserId), nextContacts);
  };

  // Auth user id
  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const { data } = await supabase.auth.getUser();
        const liveUserId = data.user?.id ?? null;

        if (!mounted) return;

        if (liveUserId) {
          setAuthUserId(liveUserId);
          return;
        }

        const cachedUserId = await authCache.getUserId();
        if (!mounted) return;
        setAuthUserId(cachedUserId ?? null);
      } catch {
        const cachedUserId = await authCache.getUserId();
        if (!mounted) return;
        setAuthUserId(cachedUserId ?? null);
      }
    };

    if (initialized) {
      void load();
    }

    return () => {
      mounted = false;
    };
  }, [initialized]);

  // Charger client + threads
  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setContactsLoading(true);
      setContactsError(null);
      setContactsFromCache(false);

      try {
        const currentUserId = authUserId || (await authCache.getUserId());

        if (!currentUserId) {
          throw new Error(language === "fr" ? "Vous devez être connecté." : "You must be logged in.");
        }

        const clientCacheKey = getClientCacheKey(currentUserId);
        const contactsCacheKey = getContactsCacheKey(currentUserId);

        const readCache = async () => {
          const cachedClient = await localStore.get<ClientRow>(clientCacheKey);
          const cachedContacts = (await localStore.get<ContactRow[]>(contactsCacheKey)) || [];

          if (!mounted) return;

          setClient(cachedClient ?? null);
          setContacts(cachedContacts);
          setContactsFromCache(true);

          const firstUnread = cachedContacts.find((x) => isUnreadThread(x));
          if (cachedContacts.length > 0) {
            setSelectedContactId(filter === "unread" ? firstUnread?.id ?? cachedContacts[0].id : cachedContacts[0].id);
          } else {
            setSelectedContactId(null);
          }
        };

        if (!connected) {
          await readCache();
          await recomputeAllThreadSyncStatuses();
          return;
        }

        const { data: clientData, error: clientError } = await supabase
          .from("op_clients")
          .select("id, user_id, first_name, last_name, email, phone")
          .eq("user_id", currentUserId)
          .maybeSingle();

        if (clientError) throw clientError;
        if (!clientData) {
          await readCache();
          await recomputeAllThreadSyncStatuses();
          return;
        }

        const currentClient = clientData as ClientRow;
        if (!mounted) return;
        setClient(currentClient);
        await localStore.set(clientCacheKey, currentClient);

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
          .eq("client_id", currentClient.id)
          .order("created_at", { ascending: false });

        if (contactsErr) throw contactsErr;

        const mapped: ContactRow[] = (contactsData || []).map((row: any) => ({
          ...row,
          worker: row.worker ?? null,
          sync_status: "synced",
        }));

        if (!mounted) return;

        setContacts(mapped);
        setContactsFromCache(false);
        await localStore.set(contactsCacheKey, mapped);

        const firstUnread = mapped.find((x) => isUnreadThread(x));
        if (mapped.length > 0) {
          setSelectedContactId((prev) =>
            prev && mapped.some((item) => item.id === prev)
              ? prev
              : filter === "unread"
              ? firstUnread?.id ?? mapped[0].id
              : mapped[0].id
          );
        } else {
          setSelectedContactId(null);
        }

        await recomputeAllThreadSyncStatuses();
      } catch (e: any) {
        console.error("ClientMessagesList load contacts error", e);
        if (!mounted) return;

        setContactsError(e?.message || t.loadContactsError);
        setContacts([]);
        setClient(null);
      } finally {
        if (mounted) setContactsLoading(false);
      }
    };

    if (initialized) {
      void load();
    }

    return () => {
      mounted = false;
    };
  }, [authUserId, connected, initialized, language, filter]);

  const selectedContact = useMemo(
    () => contacts.find((c) => c.id === selectedContactId) || null,
    [contacts, selectedContactId]
  );

  const unreadCount = useMemo(() => contacts.filter((c) => isUnreadThread(c)).length, [contacts]);

  const displayedContacts = useMemo(() => {
    if (filter === "unread") return contacts.filter((c) => isUnreadThread(c));
    return contacts;
  }, [contacts, filter]);

  const handleSelectThread = async (contactId: string) => {
    setSelectedContactId(contactId);

    const c = contacts.find((x) => x.id === contactId);
    if (!c) return;
    if (!isUnreadThread(c)) return;

    if (!connected) return;

    try {
      const { error } = await supabase
        .from("op_ouvrier_contacts")
        .update({ status: "read" })
        .eq("id", contactId)
        .in("status", ["new", "unread", "pending"]);

      if (!error) {
        const nextContacts = contacts.map((x) =>
          x.id === contactId ? { ...x, status: "read" } : x
        );
        setContacts(nextContacts);

        const currentUserId = authUserId || (await authCache.getUserId());
        if (currentUserId) {
          await localStore.set(getContactsCacheKey(currentUserId), nextContacts);
        }
      }
    } catch {}
  };

  // Charger messages du thread
  useEffect(() => {
    let mounted = true;

    const loadMessages = async () => {
      if (!selectedContactId) {
        setMessages([]);
        return;
      }

      setMessagesLoading(true);
      setMessagesError(null);
      setMessagesFromCache(false);

      try {
        const readCacheOnly = async () => {
          const cached = await loadCachedMessages(selectedContactId);
          const pendingQueueItems = await loadPendingQueueMessagesForContact(selectedContactId);
          const merged = mergeAndDeduplicateMessages([...cached, ...pendingQueueItems]);

          await saveCachedMessages(selectedContactId, merged);
          await persistThreadSyncStatusFromMessages(selectedContactId, merged);

          if (!mounted) return;
          setMessages(merged);
          setMessagesFromCache(true);
        };

        if (!connected) {
          await readCacheOnly();
          return;
        }

        const serverMessages = await fetchServerMessagesForContact(selectedContactId);
        const merged = await reconcilePendingAgainstServer(selectedContactId, serverMessages);

        if (!mounted) return;

        setMessages(merged);
        setMessagesFromCache(false);
        await saveCachedMessages(selectedContactId, merged);
        await persistThreadSyncStatusFromMessages(selectedContactId, merged);
      } catch (e) {
        console.error("ClientMessagesList load messages error", e);
        if (!mounted) return;

        const cached = await loadCachedMessages(selectedContactId);
        const pendingQueueItems = await loadPendingQueueMessagesForContact(selectedContactId);
        const merged = mergeAndDeduplicateMessages([...cached, ...pendingQueueItems]);

        setMessages(merged);
        setMessagesFromCache(true);

        await saveCachedMessages(selectedContactId, merged);
        await persistThreadSyncStatusFromMessages(selectedContactId, merged);

        if (!merged.length) {
          setMessagesError(t.loadMessagesError);
        }
      } finally {
        if (mounted) setMessagesLoading(false);
      }
    };

    void loadMessages();

    return () => {
      mounted = false;
    };
  }, [selectedContactId, connected, language]);

  useEffect(() => {
    const paths = Array.from(new Set(messages.map((m) => m.media_path).filter(Boolean))) as string[];
    if (paths.length === 0) return;

    (async () => {
      for (const p of paths) {
        if (!p) continue;
        if (signedUrlByPath[p]) continue;
        if (signingInFlightRef.current[p]) continue;
        signingInFlightRef.current[p] = true;

        const url = await createSignedUrl(p);
        if (url) setSignedUrlByPath((prev) => ({ ...prev, [p]: url }));

        signingInFlightRef.current[p] = false;
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.map((m) => `${m.id}:${m.media_path ?? ""}`).join("|")]);

  useEffect(() => {
    if (displayedContacts.length === 0) {
      setSelectedContactId(null);
      return;
    }
    const stillVisible = displayedContacts.some((c) => c.id === selectedContactId);
    if (!stillVisible) setSelectedContactId(displayedContacts[0].id);
  }, [filter, displayedContacts, selectedContactId]);

  useEffect(() => {
    const onSyncSignal = () => {
      void recomputeAllThreadSyncStatuses();

      if (!selectedContactId) return;

      if (!connected) {
        void refreshPendingMessagesForCurrentThread(selectedContactId);
        return;
      }

      void reconcileThreadFromServer(selectedContactId);
    };

    window.addEventListener("storage", onSyncSignal);
    window.addEventListener("focus", onSyncSignal);
    window.addEventListener("visibilitychange", onSyncSignal);

    return () => {
      window.removeEventListener("storage", onSyncSignal);
      window.removeEventListener("focus", onSyncSignal);
      window.removeEventListener("visibilitychange", onSyncSignal);
    };
  }, [selectedContactId, connected, authUserId, contacts]);

  useEffect(() => {
    if (!connected) return;

    if (reconcileTimerRef.current != null) {
      window.clearInterval(reconcileTimerRef.current);
      reconcileTimerRef.current = null;
    }

    reconcileTimerRef.current = window.setInterval(() => {
      void recomputeAllThreadSyncStatuses();

      if (selectedContactId) {
        void reconcileThreadFromServer(selectedContactId);
      }
    }, 4000);

    return () => {
      if (reconcileTimerRef.current != null) {
        window.clearInterval(reconcileTimerRef.current);
        reconcileTimerRef.current = null;
      }
    };
  }, [selectedContactId, connected, authUserId, contacts]);

  const persistMessageLocally = async (contactId: string, nextMessage: MessageRow) => {
    const cached = await loadCachedMessages(contactId);
    const merged = mergeAndDeduplicateMessages([...cached, nextMessage]);
    await saveCachedMessages(contactId, merged);
    await persistThreadSyncStatusFromMessages(contactId, merged);
    setMessages(merged);
  };

  const handleSend = async () => {
    if (!client || !selectedContact || !newMessage.trim()) return;

    const content = newMessage.trim();
    setSending(true);
    setMessagesError(null);

    try {
      if (!connected) {
        const localMessage: MessageRow = {
          id: createOfflineId("local_msg"),
          contact_id: selectedContact.id,
          worker_id: selectedContact.worker_id,
          client_id: client.id,
          sender_role: "client",
          message: content,
          created_at: new Date().toISOString(),
          sync_status: "pending",
        };

        await persistMessageLocally(selectedContact.id, localMessage);

        await addQueueItem({
          id: createOfflineId("queue"),
          action_type: "SEND_CLIENT_MESSAGE",
          table_name: "op_client_worker_messages",
          payload_json: {
            local_message_id: localMessage.id,
            user_id: authUserId,
            contact_id: selectedContact.id,
            worker_id: selectedContact.worker_id,
            client_id: client.id,
            sender_role: "client",
            message: content,
            created_at: localMessage.created_at,
          },
          created_at: localMessage.created_at,
          status: "pending",
          retry_count: 0,
        });

        await refreshPendingMessagesForCurrentThread(selectedContact.id);
        await recomputeAllThreadSyncStatuses();

        setNewMessage("");
        setMessagesError(t.savedOffline);
        return;
      }

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
        .select("id, contact_id, worker_id, client_id, sender_role, message, created_at")
        .single();

      if (error) throw error;

      const nextMessage = { ...(data as MessageRow), sync_status: "synced" as const };
      await persistMessageLocally(selectedContact.id, nextMessage);
      await recomputeAllThreadSyncStatuses();

      setNewMessage("");
      void reconcileThreadFromServer(selectedContact.id);
    } catch (e) {
      console.error("ClientMessagesList send error", e);
      setMessagesError(
        language === "fr"
          ? "Impossible d'envoyer votre message."
          : "Unable to send your message."
      );
    } finally {
      setSending(false);
    }
  };

  const [sendingImage, setSendingImage] = useState(false);

  const handleSendImage = async () => {
    if (!client || !selectedContact) return;

    if (!connected) {
      setMessagesError(t.imageOffline);
      return;
    }

    if (!authUserId) {
      setMessagesError(language === "fr" ? "Vous devez être connecté." : "You must be logged in.");
      return;
    }

    setSendingImage(true);
    setMessagesError(null);

    try {
      const up = await uploadChatImage({
        contactId: selectedContact.id,
        senderUserId: authUserId,
      });

      const payload: any = {
        contact_id: selectedContact.id,
        worker_id: selectedContact.worker_id,
        client_id: client.id,
        sender_role: "client",
        message: "",
        media_type: up.mediaType,
        media_path: up.storagePath,
      };

      const { data, error } = await supabase
        .from("op_client_worker_messages")
        .insert(payload)
        .select(
          "id, contact_id, worker_id, client_id, sender_role, message, media_type, media_path, created_at"
        )
        .single();

      if (error) {
        throw new Error(
          (language === "fr"
            ? "Impossible d’enregistrer l’image en base. Vérifie que la table op_client_worker_messages contient media_type et media_path."
            : "Unable to save image in DB. Ensure op_client_worker_messages has media_type and media_path.") +
            (error?.message ? ` (${error.message})` : "")
        );
      }

      const nextMessage = { ...(data as MessageRow), sync_status: "synced" as const };
      await persistMessageLocally(selectedContact.id, nextMessage);
      await recomputeAllThreadSyncStatuses();

      if (data?.media_path) {
        const url = await createSignedUrl(data.media_path);
        if (url) setSignedUrlByPath((prev) => ({ ...prev, [data.media_path as string]: url }));
      }

      void reconcileThreadFromServer(selectedContact.id);
    } catch (e: any) {
      console.error("ClientMessagesList send image error", e);
      setMessagesError(
        e?.message || (language === "fr" ? "Impossible d'envoyer l'image." : "Unable to send image.")
      );
    } finally {
      setSendingImage(false);
    }
  };

  const workerName = selectedContact?.worker
    ? fullName(selectedContact.worker.first_name, selectedContact.worker.last_name)
    : "—";
  const workerPhone = selectedContact?.worker?.phone || null;
  const workerEmail = selectedContact?.worker?.email || null;

  return (
    <div className="min-h-screen bg-slate-50 py-6">
      <div className="max-w-7xl mx-auto px-4">
        <div className="mb-3">
          <Button
            type="button"
            variant="ghost"
            className="gap-2 text-slate-700"
            onClick={() => navigate("/espace-client")}
          >
            <ArrowLeft className="w-4 h-4" />
            {t.backToClientSpace}
          </Button>
        </div>

        {!connected && initialized && (
          <div className="mb-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-900">
            <WifiOff className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <div className="font-medium">{t.offlineTitle}</div>
              <div className="text-xs text-amber-800 mt-1">{t.offlineDesc}</div>
            </div>
          </div>
        )}

        {contactsFromCache && (
          <div className="mb-3 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-800">
            {t.cacheThreads}
          </div>
        )}

        {messagesFromCache && selectedContactId && (
          <div className="mb-3 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-800">
            {t.cacheMessages}
          </div>
        )}

        <h1 className="text-2xl font-bold text-slate-900 mb-4">{t.title}</h1>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Colonne 1 : threads */}
          <div className="bg-white rounded-xl border border-slate-200 flex flex-col lg:col-span-3">
            <div className="px-4 pt-3 flex items-center gap-3 border-b border-slate-100">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setFilter("all")}
                  className={`px-3 py-1 text-xs font-medium rounded-full ${
                    filter === "all"
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {t.all}
                </button>

                <button
                  type="button"
                  onClick={() => setFilter("unread")}
                  className={`px-3 py-1 text-xs font-medium rounded-full inline-flex items-center gap-2 ${
                    filter === "unread"
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {t.unread}
                  {unreadCount > 0 && (
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full ${
                        filter === "unread"
                          ? "bg-white/20 text-white"
                          : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {unreadCount}
                    </span>
                  )}
                </button>
              </div>

              <div className="ml-auto text-[11px] text-slate-400">{t.select}</div>
            </div>

            <div className="flex-1 overflow-y-auto overflow-x-hidden">
              {contactsLoading && <div className="p-4 text-sm text-slate-500">{t.loadingContacts}</div>}

              {contactsError && (
                <div className="p-4 text-sm text-red-600">
                  {t.loadContactsError}
                  <br />
                  <span className="text-xs text-red-400">{contactsError}</span>
                </div>
              )}

              {!contactsLoading && !contactsError && displayedContacts.length === 0 && (
                <div className="p-4 text-sm text-slate-500">
                  {filter === "unread" ? t.noUnread : t.noContacts}
                </div>
              )}

              {!contactsLoading && !contactsError && displayedContacts.length > 0 && (
                <ul>
                  {displayedContacts.map((c) => {
                    const w = c.worker;
                    const name = w ? fullName(w.first_name, w.last_name) : "Ouvrier";
                    const threadTitle = getThreadTitle(c);
                    const unread = isUnreadThread(c);
                    const pendingThread = c.sync_status === "pending";

                    return (
                      <li key={c.id}>
                        <button
                          type="button"
                          onClick={() => handleSelectThread(c.id)}
                          className={`w-full flex items-center gap-3 px-4 py-3 text-left border-b border-slate-100 hover:bg-slate-50 ${
                            selectedContactId === c.id ? "bg-orange-50 border-l-4 border-l-orange-500" : ""
                          }`}
                        >
                          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-xs font-semibold text-slate-600">
                            {initials(name)}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 min-w-0">
                              <span className="text-sm font-semibold text-slate-900 truncate">{name}</span>

                              <span className="shrink-0 flex items-center gap-2">
                                {pendingThread ? (
                                  <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                                    {t.pending}
                                  </span>
                                ) : unread ? (
                                  <span className="inline-block w-2 h-2 rounded-full bg-orange-500" />
                                ) : null}

                                <span className="flex items-center gap-1 text-xs text-slate-400">
                                  <Clock className="w-3 h-3" />
                                  {formatDate(c.created_at)}
                                </span>
                              </span>
                            </div>

                            <div className="text-xs text-slate-500 truncate">{threadTitle}</div>
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
              <div className="text-sm font-semibold text-slate-900">{t.aboutWorker}</div>
              {selectedContact && (
                <div className="text-xs text-slate-500 mt-1">
                  {t.since} {formatDate(selectedContact.created_at)}
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-3">
              {!selectedContact && <div className="text-sm text-slate-500">{t.noSelected}</div>}

              {selectedContact && (
                <>
                  <div className="text-center text-[11px] text-slate-400 mb-4">
                    {formatDate(selectedContact.created_at)}
                  </div>

                  {selectedContact.message && (
                    <div className="mb-4 flex justify-end">
                      <div className="max-w-[85%] rounded-2xl bg-blue-600 text-white px-3 py-2 text-sm rounded-br-sm">
                        <div className="text-[11px] font-semibold opacity-80 mb-1">{t.you}</div>
                        <div className="whitespace-pre-line">{selectedContact.message}</div>
                      </div>
                    </div>
                  )}

                  {messagesLoading && <div className="text-sm text-slate-500">{t.loadingMessages}</div>}

                  {messagesError && (
                    <div className="text-sm text-red-600 mb-2 flex items-center gap-2">
                      <Info className="w-4 h-4" />
                      {messagesError}
                    </div>
                  )}

                  {!messagesLoading &&
                    messages.map((m) => {
                      const isClient = m.sender_role === "client";
                      const hasImage = (m.media_type || "") === "image" && !!m.media_path;
                      const imgUrl = hasImage && m.media_path ? signedUrlByPath[m.media_path] : null;
                      const isPending = m.sync_status === "pending";

                      return (
                        <div key={m.id} className={`mb-3 flex ${isClient ? "justify-end" : "justify-start"}`}>
                          <div
                            className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                              isClient
                                ? isPending
                                  ? "bg-amber-500 text-white rounded-br-sm"
                                  : "bg-blue-600 text-white rounded-br-sm"
                                : "bg-slate-100 text-slate-800 rounded-bl-sm"
                            }`}
                          >
                            <div className="text-[10px] opacity-80 mb-1 flex items-center gap-2 flex-wrap">
                              <span>
                                {isClient ? t.you : t.workerLabel} • {formatDateTime(m.created_at)}
                              </span>
                              {isPending && (
                                <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-medium">
                                  {t.pending}
                                </span>
                              )}
                            </div>

                            {hasImage ? (
                              <div className="space-y-2">
                                {!imgUrl ? (
                                  <div className="flex items-center gap-2 text-xs opacity-90">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    {language === "fr" ? "Chargement de l’image…" : "Loading image…"}
                                  </div>
                                ) : (
                                  <a href={imgUrl} target="_blank" rel="noreferrer">
                                    <img
                                      src={imgUrl}
                                      alt="image"
                                      className="max-w-[240px] sm:max-w-[320px] rounded-xl border border-white/20"
                                      loading="lazy"
                                    />
                                  </a>
                                )}
                                {m.message?.trim() ? <div className="whitespace-pre-line">{m.message}</div> : null}
                              </div>
                            ) : (
                              <div className="whitespace-pre-line">{m.message}</div>
                            )}
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
                disabled={!selectedContact || sending || sendingImage}
              />

              <div className="mt-2 flex items-center justify-between gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-full"
                  onClick={handleSendImage}
                  disabled={!selectedContact || sending || sendingImage || !connected}
                  title={!connected ? t.imageOffline : t.image}
                >
                  {sendingImage ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Camera className="w-4 h-4 mr-2" />
                      <span className="hidden sm:inline">{t.image}</span>
                      <ImageIcon className="w-4 h-4 sm:hidden" />
                    </>
                  )}
                </Button>

                <Button
                  type="button"
                  className={`flex items-center gap-1 rounded-full ${
                    connected
                      ? "bg-orange-500 hover:bg-orange-600"
                      : "bg-amber-500 hover:bg-amber-600"
                  }`}
                  onClick={handleSend}
                  disabled={!selectedContact || !newMessage.trim() || sending || sendingImage}
                >
                  <Send className="w-4 h-4" />
                  {!connected ? t.pending : t.send}
                </Button>
              </div>
            </div>
          </div>

          {/* Colonne 3 : fiche ouvrier */}
          <div className="bg-white rounded-xl border border-slate-200 flex flex-col lg:col-span-3">
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
              <div className="text-xs font-semibold text-slate-700 mb-2">{t.contactInfo}</div>

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
              <div className="text-xs font-semibold text-slate-700 mb-1">{t.workerNameLabel}</div>
              <div className="text-sm text-slate-800">{workerName}</div>

              {selectedContact?.worker?.profession && (
                <div className="mt-2 text-xs text-slate-500">{selectedContact.worker.profession}</div>
              )}

              <div className="mt-2 text-xs text-slate-500">
                {[selectedContact?.worker?.city, selectedContact?.worker?.commune, selectedContact?.worker?.district]
                  .filter(Boolean)
                  .join(" • ")}
              </div>
            </div>
          </div>
        </div>

        {messagesError && (
          <div className="mt-4 bg-red-600 text-white text-sm px-4 py-3 rounded-lg max-w-lg ml-auto">
            <div className="font-semibold">
              {language === "fr" ? "Erreur de chargement" : "Loading error"}
            </div>
            <div>{messagesError}</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClientMessagesList;
