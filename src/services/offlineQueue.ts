import { localStore } from "@/services/localStore";
import type { OfflineQueueItem, OfflineActionType } from "./offlineQueue.types";

const OFFLINE_QUEUE_KEY = "offline_queue_v2";

function makeId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

async function readQueue(): Promise<OfflineQueueItem[]> {
  return (await localStore.get<OfflineQueueItem[]>(OFFLINE_QUEUE_KEY)) ?? [];
}

async function writeQueue(items: OfflineQueueItem[]) {
  await localStore.set(OFFLINE_QUEUE_KEY, items);
}

export const offlineQueue = {
  async list() {
    return readQueue();
  },

  async enqueue(params: {
    actionType: OfflineActionType;
    entityType: string;
    entityId?: string | null;
    userId: string;
    payload: Record<string, any>;
  }) {
    const items = await readQueue();
    const now = new Date().toISOString();

    const item: OfflineQueueItem = {
      id: makeId("queue"),
      action_type: params.actionType,
      entity_type: params.entityType,
      entity_id: params.entityId ?? null,
      user_id: params.userId,
      payload_json: params.payload,
      created_at: now,
      updated_at: now,
      status: "pending",
      retry_count: 0,
      last_error: null,
    };

    await writeQueue([item, ...items]);
    return item;
  },

  async update(itemId: string, patch: Partial<OfflineQueueItem>) {
    const items = await readQueue();
    const next = items.map((item) =>
      item.id === itemId
        ? {
            ...item,
            ...patch,
            updated_at: new Date().toISOString(),
          }
        : item
    );
    await writeQueue(next);
  },

  async remove(itemId: string) {
    const items = await readQueue();
    await writeQueue(items.filter((item) => item.id !== itemId));
  },

  async clearDone() {
    const items = await readQueue();
    await writeQueue(items.filter((item) => item.status !== "done"));
  },
};
