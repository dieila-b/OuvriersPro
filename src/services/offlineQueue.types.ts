export type OfflineActionType =
  | "UPDATE_PROFILE"
  | "CREATE_CONTACT_REQUEST"
  | "SEND_CLIENT_MESSAGE"
  | "SEND_WORKER_MESSAGE"
  | "ADD_FAVORITE"
  | "REMOVE_FAVORITE"
  | "SEND_REVIEW_REPLY";

export type OfflineQueueStatus = "pending" | "processing" | "done" | "failed";

export type OfflineQueueItem = {
  id: string;
  action_type: OfflineActionType;
  entity_type: string;
  entity_id?: string | null;
  user_id: string;
  payload_json: Record<string, any>;
  created_at: string;
  updated_at: string;
  status: OfflineQueueStatus;
  retry_count: number;
  last_error?: string | null;
};
