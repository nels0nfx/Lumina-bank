import React, { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { Send, Sparkles, Loader2, Plus } from 'lucide-react';

const genSid = () => 'sess-' + Math.random().toString(36).slice(2, 10);

export default function ChatSupport() {
  const [sessionId] = useState(() => localStorage.getItem('lumina_chat_sid') || (() => { const s = genSid(); localStorage.setItem('lumina_chat_sid', s); return s; })());
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [tickets, setTickets] = useState([]);
  const [showTicket, setShowTicket] = useState(false);
  const [ticketForm, setTicketForm] = useState({ subject: '', message: '', category: 'general' });
  const box = useRef(null);

  const scroll = () => { if (box.current) box.current.scrollTop = box.current.scrollHeight; };

  const load = async () => {
    try {
      const [h, t] = await Promise.all([
        api.get('/chat/history', { params: { session_id: sessionId } }),
        api.get('/support/tickets')
      ]);
      setMessages(h.data.messages);
      setTickets(t.data.tickets);
      setTimeout(scroll, 100);
    } catch {}
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const send = async (e) => {
    e?.preventDefault?.();
    const msg = input.trim();
    if (!msg) return;
    setInput('');
    setMessages(m => [...m, { id: 'u' + Date.now(), role: 'user', message: msg, created_at: new Date().toISOString() }]);
    setSending(true);
    setTimeout(scroll, 10);
    try {
      const { data } = await api.post('/chat/message', { session_id: sessionId, message: msg });
      setMessages(m => [...m, { id: 'a' + Date.now(), role: 'assistant', message: data.reply, created_at: new Date().toISOString() }]);
    } catch (err) {
      toast.error('Could not reach assistant');
    } finally { setSending(false); setTimeout(scroll, 50); }
  };

  const createTicket = async (e) => {
    e.preventDefault();
    try {
      await api.post('/support/tickets', ticketForm);
      toast.success('Ticket created');
      setShowTicket(false);
      setTicketForm({ subject: '', message: '', category: 'general' });
      load();
    } catch { toast.error('Failed to create ticket'); }
  };

  return (
    <div className="space-y-6" data-testid="chat-page">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs tracking-[0.2em] text-gold-600 font-semibold">SUPPORT</p>
          <h1 className="font-display text-2xl lg:text-3xl text-navy-900 mt-1">Chat with Aurum</h1>
        </div>
        <button onClick={() => setShowTicket(true)} data-testid="create-ticket-btn"
          className="inline-flex items-center gap-2 px-4 py-2.5 border border-navy-900 text-navy-900 hover:bg-navy-900 hover:text-white rounded-sm text-sm">
          <Plus size={14} /> New ticket
        </button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-border rounded-sm flex flex-col h-[65vh]" data-testid="chat-widget">
          <div className="p-4 border-b border-border bg-navy-900 text-white flex items-center gap-2 rounded-t-sm">
            <div className="w-8 h-8 bg-gold-500 text-navy-900 rounded-sm flex items-center justify-center"><Sparkles size={16} /></div>
            <div>
              <p className="font-display text-sm">Aurum · Banking Assistant</p>
              <p className="text-[10px] text-white/60">Powered by Gemini — not a substitute for regulated advice</p>
            </div>
          </div>
          <div ref={box} className="flex-1 overflow-y-auto p-5 space-y-3" data-testid="chat-messages">
            {messages.length === 0 && (
              <div className="text-center py-8">
                <Sparkles size={28} className="mx-auto text-gold-500" />
                <p className="mt-3 text-navy-900 font-display">Ask about transfers, cards, loans, KYC — I'm here to help.</p>
              </div>
            )}
            {messages.map(m => (
              <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] px-4 py-2.5 rounded-sm whitespace-pre-wrap text-sm ${m.role === 'user' ? 'bg-navy-900 text-white' : 'bg-[#F8F9FA] text-navy-900 border border-border'}`} data-testid={`chat-msg-${m.role}`}>
                  {m.message}
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex justify-start">
                <div className="px-4 py-2.5 bg-[#F8F9FA] text-navy-900 border border-border rounded-sm text-sm inline-flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin text-gold-500" /> Thinking…
                </div>
              </div>
            )}
          </div>
          <form onSubmit={send} className="p-3 border-t border-border flex gap-2">
            <input value={input} onChange={(e)=>setInput(e.target.value)} placeholder="Type a message…" data-testid="chat-input"
              className="flex-1 px-4 py-2.5 border border-border rounded-sm focus:outline-none focus:ring-2 focus:ring-gold-500/40 focus:border-gold-500" />
            <button type="submit" disabled={sending || !input.trim()} data-testid="chat-send"
              className="px-4 py-2.5 bg-gold-500 text-navy-900 font-semibold rounded-sm disabled:opacity-60 inline-flex items-center gap-2">
              <Send size={15} />
            </button>
          </form>
        </div>

        <div className="bg-white border border-border rounded-sm" data-testid="tickets-panel">
          <div className="p-4 border-b border-border"><h3 className="font-display text-navy-900">Your tickets</h3></div>
          {tickets.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">No tickets yet. For issues that need human review, create a ticket.</p>
          ) : (
            <ul className="divide-y divide-border">
              {tickets.map(t => (
                <li key={t.id} className="p-4">
                  <p className="text-sm font-medium text-navy-900">{t.subject}</p>
                  <p className="text-xs text-muted-foreground mt-1">{t.status}</p>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{t.message}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {showTicket && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <form onSubmit={createTicket} className="bg-white rounded-sm p-6 w-full max-w-md" data-testid="ticket-modal">
            <h3 className="font-display text-xl text-navy-900">Open a support ticket</h3>
            <div className="mt-5 space-y-4">
              <input required placeholder="Subject" value={ticketForm.subject} onChange={(e) => setTicketForm({...ticketForm, subject: e.target.value})}
                data-testid="ticket-subject" className="w-full px-4 py-3 border border-border rounded-sm" />
              <textarea required rows={4} placeholder="Describe your issue…" value={ticketForm.message}
                onChange={(e) => setTicketForm({...ticketForm, message: e.target.value})}
                data-testid="ticket-message" className="w-full px-4 py-3 border border-border rounded-sm" />
            </div>
            <div className="mt-6 flex gap-3">
              <button type="button" onClick={() => setShowTicket(false)} className="flex-1 px-4 py-2.5 border border-border rounded-sm">Cancel</button>
              <button type="submit" className="flex-1 px-4 py-2.5 bg-gold-500 text-navy-900 font-semibold rounded-sm" data-testid="ticket-submit">Create ticket</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
