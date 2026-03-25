import { supabase } from "@/lib/supabase";
import { networkService } from "@/services/networkService";
import { offlineQueue } from "@/services/offlineQueue";
import type { OfflineQueueItem } from "@/services/offlineQueue.types";

async function processItem(item: OfflineQueueItem) {
  switch (item.action_type) {
    case "UPDATE_PROFILE": {
      const { userId, values } = item.payload_json;
      const { error } = await supabase
        .from("op_users")
        .update(values)
        .eq("id", userId);

      if (error) throw error;
      return;
    }

    case "CREATE_CONTACT_REQUEST": {
      const { error } = await supabase
        .from("op_ouvrier_contacts")
        .insert(item.payload_json);

      if (error) throw error;
      return;
    }

    case "SEND_CLIENT_MESSAGE": {
      const { error } = await supabase
        .from("op_client_worker_messages")
        .insert(item.payload_json);

      if (error) throw error;
      return;
    }

    case "ADD_FAVORITE": {
      const payload = item.payload_json;
      const { error } = await supabase
        .from("op_ouvrier_favorites")
        .insert({
          user_id: payload.userId,
          worker_id: payload.workerId,
          worker_name: payload.workerName ?? null,
          profession: payload.profession ?? null,
        });

      if (error) throw error;
      return;
    }

    case "REMOVE_FAVORITE": {
      const payload = item.payload_json;
      const { error } = await supabase
        .from("op_ouvrier_favorites")
        .delete()
        .eq("user_id", payload.userId)
        .eq("worker_id", payload.workerId);

      if (error) throw error;
      return;
    }

    case "SEND_REVIEW_REPLY": {
      const { error } = await supabase
        .from("op_worker_client_review_replies")
        .insert(item.payload_json);

      if (error) throw error;
      return;
    }

    default:
      throw new Error(`Unsupported action: ${item.action_type}`);
  }
}

export const syncEngine = {
  async syncNow() {
    const { connected } = networkService.getStatus();
    if (!connected) return;

    const items = await offlineQueue.list();
    const pending = items
      .filter((item) => item.status === "pending" || item.status === "failed")
      .sort((a, b) => a.created_at.localeCompare(b.created_at));

    for (const item of pending) {
      try {
        await offlineQueue.update(item.id, { status: "processing" });
        await processItem(item);
        await offlineQueue.update(item.id, { status: "done", last_error: null });
      } catch (error: any) {
        await offlineQueue.update(item.id, {
          status: "failed",
          retry_count: (item.retry_count ?? 0) + 1,
          last_error: String(error?.message ?? error ?? "Sync failed"),
        });
      }
    }
  },
};
