import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCheck } from 'lucide-react';
import api from '../utils/api';
import { formatDateTime } from '../utils/format';

const TYPE_ICON = { FEE_REMINDER: '💰', ABSENCE_ALERT: '🚫', ANNOUNCEMENT: '📢', CORRECTION_DECIDED: '📝' };

const NotificationPanel = ({ open, onClose }) => {
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get('/notifications').then((r) => r.data),
    enabled: open,
  });

  const markAll = useMutation({
    mutationFn: () => api.put('/notifications/read-all'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markOne = useMutation({
    mutationFn: (id) => api.put(`/notifications/${id}/read`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60]" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30" />
      <div
        className="absolute right-0 top-0 flex h-full w-full max-w-sm flex-col bg-white shadow-xl sm:rounded-l-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-brand-600" />
            <h2 className="font-semibold">Notifications</h2>
          </div>
          <div className="flex items-center gap-3">
            <button
              className="flex items-center gap-1 text-xs text-brand-600 hover:underline"
              onClick={() => markAll.mutate()}
              disabled={markAll.isPending}
            >
              <CheckCheck className="h-4 w-4" /> Mark all read
            </button>
            <button onClick={onClose} className="text-2xl leading-none text-slate-400 hover:text-slate-600">×</button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {!data || data.notifications.length === 0 ? (
            <p className="py-16 text-center text-sm text-slate-400">You're all caught up 🎉</p>
          ) : (
            data.notifications.map((n) => (
              <button
                key={n.id}
                onClick={() => !n.readAt && markOne.mutate(n.id)}
                className={`block w-full px-4 py-3 text-left transition hover:bg-slate-50 ${n.readAt ? '' : 'bg-brand-50/50'}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm font-medium">
                    {TYPE_ICON[n.type] || '🔔'} {n.title}
                  </span>
                  {!n.readAt && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-brand-500" />}
                </div>
                {n.body && <p className="mt-1 line-clamp-3 text-xs text-slate-500">{n.body}</p>}
                <p className="mt-1 text-[10px] text-slate-400">{formatDateTime(n.createdAt)}</p>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationPanel;
