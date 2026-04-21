import { useCallback, useEffect, useRef, useState } from 'react';
import useSWR from 'swr';
import { deleteAllNotifications, fetchNotifications, markAllNotificationsRead } from '@/lib/api';
import type { NotificationItem, NotificationType } from '@/types';

const TYPE_META: Record<NotificationType, { icon: string; color: string }> = {
  goal_achieved: { icon: '🎯', color: '#06B6D4' },
  goal_milestone: { icon: '📊', color: '#60A5FA' },
  high_return:  { icon: '📈', color: '#EF4444' },
  high_loss:    { icon: '📉', color: '#60A5FA' },
};

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return '방금 전';
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  return `${Math.floor(h / 24)}일 전`;
}

function NotificationRow({ item }: { item: NotificationItem }) {
  const meta = TYPE_META[item.type] ?? { icon: '🔔', color: '#9CA3AF' };
  return (
    <div style={{
      padding: '12px 16px',
      borderBottom: '1px solid #1f2937',
      background: item.is_read ? 'transparent' : 'rgba(6,182,212,0.05)',
      display: 'flex', gap: 12, alignItems: 'flex-start',
    }}>
      <span style={{ fontSize: 18, lineHeight: 1, flexShrink: 0 }}>{meta.icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 13, fontWeight: item.is_read ? 400 : 600,
          color: item.is_read ? '#9CA3AF' : '#F9FAFB',
          marginBottom: 2, lineHeight: 1.4,
        }}>
          {item.title}
        </div>
        <div style={{ fontSize: 12, color: '#6B7280', lineHeight: 1.5 }}>
          {item.message}
        </div>
        <div style={{ fontSize: 11, color: '#4B5563', marginTop: 4 }}>
          {formatRelative(item.created_at)}
        </div>
      </div>
      {!item.is_read && (
        <div style={{ width: 7, height: 7, borderRadius: '50%', background: meta.color, flexShrink: 0, marginTop: 4 }}/>
      )}
    </div>
  );
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const { data, mutate } = useSWR('notifications', fetchNotifications, {
    refreshInterval: 30000,
    revalidateOnFocus: true,
  });

  const unread = data?.unread_count ?? 0;

  const handleOpen = useCallback(() => setOpen(v => !v), []);

  const handleMarkAllRead = useCallback(async () => {
    await markAllNotificationsRead();
    mutate();
  }, [mutate]);

  const handleDeleteAll = useCallback(async () => {
    await deleteAllNotifications();
    mutate();
  }, [mutate]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={panelRef} style={{ position: 'relative' }}>
      {/* Bell button */}
      <button
        onClick={handleOpen}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 10,
          padding: '9px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
          background: open ? 'rgba(6,182,212,0.10)' : 'transparent',
          color: open ? '#22D3EE' : '#9CA3AF', fontSize: 13, fontWeight: 500,
          position: 'relative',
        }}
        onMouseEnter={e => {
          if (!open) {
            (e.currentTarget as HTMLElement).style.background = '#1f2937';
            (e.currentTarget as HTMLElement).style.color = '#fff';
          }
        }}
        onMouseLeave={e => {
          if (!open) {
            (e.currentTarget as HTMLElement).style.background = 'transparent';
            (e.currentTarget as HTMLElement).style.color = '#9CA3AF';
          }
        }}
      >
        <span style={{ flexShrink: 0, position: 'relative', display: 'inline-flex' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
          {unread > 0 && (
            <span style={{
              position: 'absolute', top: -5, right: -5,
              background: '#EF4444', color: '#fff',
              fontSize: 9, fontWeight: 700, borderRadius: '50%',
              width: 14, height: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
              lineHeight: 1,
            }}>
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </span>
        <span>알림</span>
      </button>

      {/* Dropdown panel */}
      {open && (
        <div style={{
          position: 'absolute', left: '100%', bottom: 0, marginLeft: 8,
          width: 340, background: '#111827',
          border: '1px solid #1f2937', borderRadius: 10,
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          zIndex: 200, overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 16px', borderBottom: '1px solid #1f2937',
          }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#F9FAFB' }}>
              알림 {unread > 0 && <span style={{ color: '#06B6D4', fontSize: 12 }}>({unread})</span>}
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              {unread > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  style={{
                    fontSize: 11, color: '#06B6D4', background: 'none',
                    border: 'none', cursor: 'pointer', padding: '2px 4px',
                  }}
                >
                  모두 읽음
                </button>
              )}
              {(data?.items.length ?? 0) > 0 && (
                <button
                  onClick={handleDeleteAll}
                  style={{
                    fontSize: 11, color: '#6B7280', background: 'none',
                    border: 'none', cursor: 'pointer', padding: '2px 4px',
                  }}
                >
                  전체 삭제
                </button>
              )}
            </div>
          </div>

          {/* List */}
          <div style={{ maxHeight: 400, overflowY: 'auto' }}>
            {!data || data.items.length === 0 ? (
              <div style={{
                padding: '32px 16px', textAlign: 'center',
                color: '#4B5563', fontSize: 13,
              }}>
                알림이 없습니다
              </div>
            ) : (
              data.items.map(item => <NotificationRow key={item.id} item={item} />)
            )}
          </div>
        </div>
      )}
    </div>
  );
}
