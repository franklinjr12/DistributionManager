import { create } from 'zustand'
import type { Notification } from '@/types/domain'
import { seedNotifications } from '@/mock/data/automation'
import { nowISO, uid } from '@/lib/utils'

interface NotificationState {
  notifications: Notification[]
  /** Adds a notification on top (unread). Returns it. */
  pushNotification: (n: Omit<Notification, 'id' | 'createdAt' | 'read'> & Partial<Pick<Notification, 'createdAt' | 'read'>>) => Notification
  markRead: (id: string) => void
  markAllRead: () => void
  removeNotification: (id: string) => void
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [...seedNotifications].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  pushNotification: (n) => {
    const item: Notification = { id: uid('nt'), createdAt: nowISO(), read: false, ...n }
    set((s) => ({ notifications: [item, ...s.notifications] }))
    return item
  },
  markRead: (id) => set((s) => ({ notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)) })),
  markAllRead: () => set((s) => ({ notifications: s.notifications.map((n) => ({ ...n, read: true })) })),
  removeNotification: (id) => set((s) => ({ notifications: s.notifications.filter((n) => n.id !== id) })),
}))

export const selectUnreadCount = (s: NotificationState) => s.notifications.filter((n) => !n.read).length
