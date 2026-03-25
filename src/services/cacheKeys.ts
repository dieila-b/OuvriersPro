export const cacheKeys = {
  profile: (userId: string) => `profile:${userId}`,
  clientDb: (userId: string) => `client-db:${userId}`,
  workerProfile: (workerId: string) => `worker-profile:${workerId}`,
  workerReviews: (workerId: string) => `worker-reviews:${workerId}`,
  workerPhotos: (workerId: string) => `worker-photos:${workerId}`,
  clientReviews: (clientId: string) => `client-reviews:${clientId}`,
  clientReplies: (clientId: string) => `client-replies:${clientId}`,
  favorites: (userId: string) => `favorites:${userId}`,
  requests: (userId: string) => `requests:${userId}`,
  messages: (conversationId: string) => `messages:${conversationId}`,
};
