import React, { useEffect, useState } from 'react';
import { api, fmtDate } from '@/lib/api';
import { toast } from 'sonner';
import { Bell, CheckCheck } from 'lucide-react';

export default function Notifications() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try { const { data } = await api.get('/notifications'); setItems(data.notifications); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const markAll = async () => {
    try { await api.post('/notifications/read-all'); toast.success('All marked as read'); load(); }
    catch { toast.error('Failed'); }
  };

  const markOne = async (id) => {
    try { await api.post(`/notifications/${id}/read`); load(); } catch {}
  };

  return (
    <div className="space-y-6" data-testid="notifications-page">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs tracking-[0.2em] text-gold-600 font-semibold">NOTIFICATIONS</p>
          <h1 className="font-display text-2xl lg:text-3xl text-navy-900 mt-1">All notifications</h1>
        </div>
        <button onClick={markAll} data-testid="mark-all-read" className="inline-flex items-center gap-2 px-4 py-2 border border-border rounded-sm text-sm">
          <CheckCheck size={14} /> Mark all as read
        </button>
      </div>
      <div className="bg-white border border-border rounded-sm">
        {loading ? <p className="p-10 text-center text-muted-foreground">Loading…</p> : items.length === 0 ? (
          <div className="p-16 text-center">
            <Bell size={32} className="mx-auto text-muted-foreground/50" />
            <p className="mt-3 text-muted-foreground">No notifications yet.</p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {items.map(n => (
              <li key={n.id} onClick={() => !n.read && markOne(n.id)}
                className={`p-4 ${!n.read ? 'bg-gold-100/30 cursor-pointer' : ''}`} data-testid={`notif-${n.id}`}>
                <div className="flex justify-between">
                  <p className="text-sm font-semibold text-navy-900">{n.title} {!n.read && <span className="ml-2 w-2 h-2 bg-gold-500 rounded-full inline-block"></span>}</p>
                  <span className="text-xs text-muted-foreground">{fmtDate(n.created_at)}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">{n.message}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
