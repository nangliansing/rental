export const parseRealtimeHint = (rawMessage) => {
  if (typeof rawMessage !== "string" || rawMessage.trim().length === 0) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawMessage);
    if (parsed == null || typeof parsed !== "object" || Array.isArray(parsed)) {
      return null;
    }

    const userId =
      typeof parsed.userId === "string" ? parsed.userId.trim() : "";
    const notificationId =
      typeof parsed.notificationId === "string"
        ? parsed.notificationId.trim()
        : "";

    if (!userId || !notificationId) {
      return null;
    }

    return { userId, notificationId };
  } catch {
    return null;
  }
};
