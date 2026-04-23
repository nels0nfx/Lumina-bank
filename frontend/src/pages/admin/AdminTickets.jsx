import React, { useEffect, useState } from 'react';
import { api, fmtDate } from '@/lib/api';
import { toast } from 'sonner';
import { Send } from 'lucide-react';

export default function AdminTickets() {
  const [tickets, setTickets] = useState([]);
  const [selected, setSelected] = useState(null);
  const [reply, setReply] = useState('');

  const load = async () => { const { data } = await api.get('/admin/tickets'); setTickets(data.tickets); };
  useEffect(() => { load(); }, []);

  const send = async (e, status) => {
    e?.preventDefault?.();
    if (!reply.trim() && !status) return;
    try {
      const { data } = await api.post(`/admin/tickets/${selected.id}/reply`, { message: reply || '(status update)', status });
      toast.success('Reply sent');
      setReply(''); setSelected(data.ticket); load();
    } catch { toast.error('Failed'); }
  };

  return (
    <div className="space-y-6" data-testid="admin-tickets-page">
      <div>
        <p className="text-xs tracking-[0.2em] text-gold-600 font-semibold">SUPPORT TICKETS</p>
        <h1 className="font-display text-2xl lg:text-3xl text-navy-900 mt-1">Dispute & support management</h1>
      </div>
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-white border border-border rounded-sm max-h-[600px] overflow-y-auto">
          {tickets.length === 0 ? <p className="p-6 text-center text-muted-foreground">No tickets</p> : (
            <ul className="divide-y divide-border">
              {tickets.map(t => (
                <li key={t.id}>
                  <button onClick={() => setSelected(t)} data-testid={`ticket-${t.id}`}
                    className={`w-full text-left p-4 ${selected?.id === t.id ? 'bg-[#FBFAF5]' : 'hover:bg-gray-50'}`}>
                    <p className="text-sm font-medium text-navy-900 line-clamp-1">{t.subject}</p>
                    <p className="text-xs text-muted-foreground">{t.user_name} · {t.status}</p>
                    <p className="text-xs text-muted-foreground mt-1">{fmtDate(t.created_at)}</p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="lg:col-span-2 bg-white border border-border rounded-sm flex flex-col min-h-[400px]">
          {!selected ? (
            <p className="p-10 text-center text-muted-foreground flex-1 flex items-center justify-center">Select a ticket</p>
          ) : (
            <>
              <div className="p-5 border-b border-border">
                <p className="font-display text-lg text-navy-900">{selected.subject}</p>
                <p className="text-xs text-muted-foreground">{selected.user_email} · Status: {selected.status}</p>
              </div>
              <div className="flex-1 overflow-y-auto p-5 space-y-3">
                {(selected.messages || []).map((m, i) => (
                  <div key={i} className={`flex ${m.role === 'admin' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] px-4 py-2.5 rounded-sm text-sm ${m.role === 'admin' ? 'bg-navy-900 text-white' : 'bg-[#F8F9FA] text-navy-900 border border-border'}`}>
                      {m.message}
                      <p className={`mt-1 text-[10px] ${m.role === 'admin' ? 'text-white/50' : 'text-muted-foreground'}`}>{fmtDate(m.created_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
              <form onSubmit={send} className="p-3 border-t border-border flex gap-2">
                <input value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Reply…" data-testid="ticket-reply"
                  className="flex-1 px-4 py-2.5 border border-border rounded-sm" />
                <button type="submit" className="px-4 py-2.5 bg-navy-900 text-white rounded-sm inline-flex items-center gap-2" data-testid="ticket-send">
                  <Send size={14} />
                </button>
                <button type="button" onClick={(e) => send(e, 'resolved')} data-testid="ticket-resolve"
                  className="px-4 py-2.5 bg-emerald-600 text-white rounded-sm text-sm">Resolve</button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
