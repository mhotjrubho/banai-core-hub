/**
 * Notification Utilities
 * Helper functions for creating notifications across the app
 */

import { supabase } from "@/integrations/supabase/client";

type NotificationType =
  | "student_added"
  | "student_updated"
  | "student_deleted"
  | "staff_added"
  | "staff_updated"
  | "staff_deleted"
  | "event_created"
  | "event_updated"
  | "event_cancelled"
  | "graphic_task_assigned"
  | "graphic_revision_requested"
  | "form_submission"
  | "inspector_report_filed"
  | "vendor_added"
  | "community_event"
  | "system_alert";

interface NotificationParams {
  user_id: string;
  notification_type: NotificationType;
  title: string;
  message: string;
  action_url?: string;
  action_type?: string;
  action_id?: string;
}

/**
 * Create a single notification
 */
export async function createNotification(params: NotificationParams) {
  try {
    const { data, error } = await supabase
      .from("notifications")
      .insert({
        user_id: params.user_id,
        notification_type: params.notification_type,
        title: params.title,
        message: params.message,
        action_url: params.action_url,
        action_type: params.action_type,
        action_id: params.action_id,
      })
      .select("*")
      .single();

    if (error) {
      console.error("Failed to create notification:", error);
      return null;
    }

    return data;
  } catch (err) {
    console.error("Error creating notification:", err);
    return null;
  }
}

/**
 * Create notifications for multiple users
 */
export async function notifyUsers(
  user_ids: string[],
  notification_type: NotificationType,
  title: string,
  message: string,
  action_url?: string,
  action_type?: string,
  action_id?: string
) {
  if (!user_ids.length) return [];

  try {
    const notifications = user_ids.map((user_id) => ({
      user_id,
      notification_type,
      title,
      message,
      action_url,
      action_type,
      action_id,
    }));

    const { data, error } = await supabase
      .from("notifications")
      .insert(notifications)
      .select("*");

    if (error) {
      console.error("Failed to create notifications:", error);
      return [];
    }

    return data ?? [];
  } catch (err) {
    console.error("Error creating notifications:", err);
    return [];
  }
}

/**
 * Specific notification helpers
 */

export async function notifyStudentAdded(
  admin_id: string,
  student_name: string,
  student_id: string,
  notify_user_ids: string[] = []
) {
  const title = `תלמיד חדש: ${student_name}`;
  const message = `${student_name} נוסף למערכת`;
  const action_url = `/students/${student_id}`;

  return notifyUsers(
    notify_user_ids.length > 0 ? notify_user_ids : [admin_id],
    "student_added",
    title,
    message,
    action_url,
    "view_student",
    student_id
  );
}

export async function notifyEventCreated(
  organizer_id: string,
  event_name: string,
  event_id: string,
  notify_user_ids: string[] = []
) {
  const title = `אירוע חדש: ${event_name}`;
  const message = `אירוע חדש "${event_name}" נוצר`;
  const action_url = `/events/${event_id}`;

  return notifyUsers(
    notify_user_ids.length > 0 ? notify_user_ids : [organizer_id],
    "event_created",
    title,
    message,
    action_url,
    "view_event",
    event_id
  );
}

export async function notifyGraphicTaskAssigned(
  assigned_to_id: string,
  task_title: string,
  task_id: string,
  assigned_by_name?: string
) {
  const title = `משימת גרפיקה חדשה: ${task_title}`;
  const message = `הוקצתה לך משימת גרפיקה "${task_title}"${assigned_by_name ? ` על ידי ${assigned_by_name}` : ""}`;
  const action_url = `/graphics/${task_id}`;

  return createNotification({
    user_id: assigned_to_id,
    notification_type: "graphic_task_assigned",
    title,
    message,
    action_url,
    action_type: "view_task",
    action_id: task_id,
  });
}

export async function notifyFormSubmitted(
  admin_ids: string[],
  form_name: string,
  submission_id: string,
  submitted_by: string
) {
  const title = `טופס חדש: ${form_name}`;
  const message = `${submitted_by} הגיש את הטופס "${form_name}"`;
  const action_url = `/forms/submission/${submission_id}`;

  return notifyUsers(
    admin_ids,
    "form_submission",
    title,
    message,
    action_url,
    "view_submission",
    submission_id
  );
}

export async function notifyInspectorReportFiled(
  admin_ids: string[],
  inspector_name: string,
  report_id: string,
  location?: string
) {
  const title = `דיווח בקרה חדש מ-${inspector_name}`;
  const message = `דיווח בקרה חדש הוגש${location ? ` מ-${location}` : ""}`;
  const action_url = `/inspectors/${report_id}`;

  return notifyUsers(
    admin_ids,
    "inspector_report_filed",
    title,
    message,
    action_url,
    "view_report",
    report_id
  );
}

export async function notifySystemAlert(
  user_ids: string[],
  title: string,
  message: string
) {
  return notifyUsers(user_ids, "system_alert", title, message);
}

/**
 * Get unread notification count
 */
export async function getUnreadCount(user_id: string): Promise<number> {
  try {
    const { data, error } = await supabase.rpc("get_unread_notifications_count", {
      p_user_id: user_id,
    });

    if (error) {
      console.error("Failed to get unread count:", error);
      return 0;
    }

    return data ?? 0;
  } catch (err) {
    console.error("Error getting unread count:", err);
    return 0;
  }
}

/**
 * Mark notification as read
 */
export async function markNotificationAsRead(notification_id: string) {
  try {
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("id", notification_id);

    if (error) {
      console.error("Failed to mark notification as read:", error);
      return false;
    }

    return true;
  } catch (err) {
    console.error("Error marking notification as read:", err);
    return false;
  }
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllNotificationsAsRead(user_id: string) {
  try {
    const { error } = await supabase.rpc("mark_notifications_read", {
      p_user_id: user_id,
    });

    if (error) {
      console.error("Failed to mark all notifications as read:", error);
      return false;
    }

    return true;
  } catch (err) {
    console.error("Error marking all notifications as read:", err);
    return false;
  }
}

/**
 * Delete notification
 */
export async function deleteNotification(notification_id: string) {
  try {
    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("id", notification_id);

    if (error) {
      console.error("Failed to delete notification:", error);
      return false;
    }

    return true;
  } catch (err) {
    console.error("Error deleting notification:", err);
    return false;
  }
}
