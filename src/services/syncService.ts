// src/services/syncService.ts
import { supabase } from "@/lib/supabase";
import { localStore, LocalKeys } from "@/services/localStore";

export type OfflineActionType =
  | "UPDATE_PROFILE"
  | "ADD_FAVORITE"
  | "REMOVE_FAVORITE"
  | "CREATE_CONTACT_REQUEST";

export type OfflineQueueItem = {
  id: string;
  type: OfflineActionType;
  payload: Record<string, any>;
  createdAt: string;
  status: "pending" | "syncing" | "done" | "error";
  retryCount: number;
  lastError?: string | null;
};

async function readQueue(): Promise<OfflineQueueItem[]> {
  return (await localStore.get<OfflineQueueItem[]>(LocalKeys.OFFLINE_QUEUE)) ?? [];
}

async function writeQueue(queue: OfflineQueueItem[]) {
  await localStore.set(LocalKeys.OFFLINE_QUEUE, queue);
}

export const syncService = {
  async getQueue() {
    return readQueue();
  },

  async enqueue(type: OfflineActionType, payload: Record<string, any>) {
    const queue = await readQueue();

    const item: OfflineQueueItem = {
      id: crypto.randomUUID(),
      type,
      payload,
      createdAt: new Date().toISOString(),
      status: "pending",
      retryCount: 0,
      lastError: null,
    };

    queue.push(item);
    await writeQueue(queue);

    return item;
  },

  async markAllPending() {
    const queue = await readQueue();
    const updated = queue.map((item) =>
      item.status === "done"
        ? item
        : {
            ...item,
            status: "pending" as const,
          }
    );
    await writeQueue(updated);
  },

  async processQueue() {
    const queue = await readQueue();
    if (!queue.length) return;

    const updated = [...queue];

    for (let i = 0; i < updated.length; i += 1) {
      const item = updated[i];
      if (item.status === "done") continue;

      updated[i] = {
        ...item,
        status: "syncing",
        lastError: null,
      };
      await writeQueue(updated);

      try {
        switch (item.type) {
          case "UPDATE_PROFILE": {
            const { userId, values } = item.payload;

            const { error } = await supabase
              .from("op_users")
              .update(values)
              .eq("id", userId);

            if (error) throw error;
            break;
          }

          case "ADD_FAVORITE": {
            const { error } = await supabase.from("favorites").insert(item.payload.row);
            if (error) throw error;
            break;
          }

          case "REMOVE_FAVORITE": {
            const { favoriteId } = item.payload;
            const { error } = await supabase.from("favorites").delete().eq("id", favoriteId);
            if (error) throw error;
            break;
          }

          case "CREATE_CONTACT_REQUEST": {
            const { error } = await supabase.from("contact_requests").insert(item.payload.row);
            if (error) throw error;
            break;
          }

          default:
            throw new Error(`Unsupported offline action: ${item.type}`);
        }

        updated[i] = {
          ...updated[i],
          status: "done",
          lastError: null,
        };
      } catch (error: any) {
        updated[i] = {
          ...updated[i],
          status: "error",
          retryCount: item.retryCount + 1,
          lastError: String(error?.message ?? "Unknown sync error"),
        };
      }

      await writeQueue(updated);
    }

    await localStore.set(LocalKeys.LAST_SYNC_AT, new Date().toISOString());
  },
};
