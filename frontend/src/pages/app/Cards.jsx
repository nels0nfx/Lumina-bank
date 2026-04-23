import React, { useEffect, useState } from 'react';
import { api, fmtUSD, fmtDate } from '@/lib/api';
import { toast } from 'sonner';
import { Loader2, Plus, Eye, EyeOff, Snowflake, KeyRound, RotateCcw, CreditCard as CCIcon } from 'lucide-react';

const GOLD_BG = "url('https://images.unsplash.com/photo-1690192715829-db4e65d65dd7?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1OTV8MHwxfHNlYXJjaHwxfHxhYnN0cmFjdCUyMGJsdWUlMjBhbmQlMjBnb2xkJTIwcHJlbWl1bSUyMHRleHR1cmV8ZW58MHx8fHwxNzc2OTc1MDMwfDA&ixlib=rb-4.1.0&q=85')";

const Card = ({ c, onFreeze, onPin, onReplace, onReveal, revealed }) => (
  <div className={`relative aspect-[1.6] rounded-sm overflow-hidden text-white p-6 flex flex-col justify-between ${c.is_frozen ? 'opacity-75' : ''}`}
    style={{ background: c.is_frozen ? '#475569' : `linear-gradient(135deg, #0B132B 0%, #1C2541 60%, #3A506B 100%)` }}
    data-testid={`card-${c.id}`}>
    <div className="absolute inset-0 opacity-20" style={{ backgroundImage: GOLD_BG, backgroundSize: 'cover', backgroundPosition: 'center' }}></div>
    <div className="relative flex items-start justify-between">
      <div>
        <p className="text-[10px] tracking-[0.3em] text-gold-500 font-bold">LUMINA {c.card_type === 'virtual' ? 'VIRTUAL' : 'CARD'}</p>
        <p className="mt-1 text-[10px] text-white/60 uppercase tracking-widest">{c.status}{c.is_frozen ? ' · FROZEN' : ''}</p>
      </div>
      <CCIcon size={22} className="text-gold-500" />
    </div>
    <div className="relative">
      <p className="card-number-font text-lg sm:text-xl" data-testid={`card-number-${c.id}`}>
        {revealed ? c.number?.replace(/(.{4})/g, '$1 ').trim() : c.number_masked}
      </p>
      <div className="mt-4 flex justify-between items-end text-xs">
        <div>
          <p className="text-white/50 text-[9px] tracking-widest uppercase">Cardholder</p>
          <p className="text-white">{c.holder_name || '—'}</p>
        </div>
        <div>
          <p className="text-white/50 text-[9px] tracking-widest uppercase">Expires</p>
          <p className="text-white">{c.expiry}</p>
        </div>
        <div>
          <p className="text-white/50 text-[9px] tracking-widest uppercase">CVV</p>
          <p className="text-white">{revealed ? c.cvv : '•••'}</p>
        </div>
      </div>
    </div>
  </div>
);

export default function Cards() {
  const [cards, setCards] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showReveal, setShowReveal] = useState({});
  const [pinModal, setPinModal] = useState(null);
  const [pinForm, setPinForm] = useState({ pin: '', current_password: '' });
  const [requesting, setRequesting] = useState(false);

  const load = async () => {
    const [c, a] = await Promise.all([api.get('/cards'), api.get('/accounts')]);
    setCards(c.data.cards); setAccounts(a.data.accounts); setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const reveal = async (id) => {
    if (showReveal[id]) { setShowReveal({ ...showReveal, [id]: null }); return; }
    try {
      const { data } = await api.get(`/cards/${id}/reveal`);
      setShowReveal({ ...showReveal, [id]: true });
      setCards(cards.map(c => c.id === id ? { ...c, ...data.card } : c));
    } catch { toast.error('Could not reveal'); }
  };

  const request = async () => {
    if (!accounts[0]) return;
    setRequesting(true);
    try {
      await api.post('/cards/request', { account_id: accounts[0].id, card_type: 'virtual' });
      toast.success('Virtual card issued');
      load();
    } catch (err) { toast.error(err?.response?.data?.detail || 'Failed'); }
    finally { setRequesting(false); }
  };

  const requestPhysical = async () => {
    if (!accounts[0]) return;
    setRequesting(true);
    try {
      await api.post('/cards/request', { account_id: accounts[0].id, card_type: 'physical' });
      toast.success('Physical card requested. Delivery will be arranged by our team.');
      load();
    } catch (err) { toast.error(err?.response?.data?.detail || 'Failed'); }
    finally { setRequesting(false); }
  };

  const freeze = async (id) => {
    try { const { data } = await api.post(`/cards/${id}/freeze`); toast.success(data.is_frozen ? 'Card frozen' : 'Card unfrozen'); load(); }
    catch { toast.error('Action failed'); }
  };

  const setPin = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/cards/${pinModal}/pin`, { card_id: pinModal, ...pinForm });
      toast.success('PIN set');
      setPinModal(null); setPinForm({ pin: '', current_password: '' });
    } catch (err) { toast.error(err?.response?.data?.detail || 'Failed'); }
  };

  const replace = async (id) => {
    if (!window.confirm('Replace this card? The current one will be deactivated.')) return;
    try { await api.post(`/cards/${id}/replace`); toast.success('New card issued'); load(); }
    catch { toast.error('Failed'); }
  };

  return (
    <div className="space-y-6" data-testid="cards-page">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs tracking-[0.2em] text-gold-600 font-semibold">CARDS</p>
          <h1 className="font-display text-2xl lg:text-3xl text-navy-900 mt-1">Your cards</h1>
        </div>
        <div className="flex gap-2">
          <button onClick={request} disabled={requesting} data-testid="request-card-btn"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gold-500 hover:bg-gold-600 text-navy-900 font-semibold rounded-sm disabled:opacity-60">
            <Plus size={15} /> Virtual card
          </button>
          <button onClick={requestPhysical} disabled={requesting} data-testid="request-physical-card-btn"
            className="inline-flex items-center gap-2 px-5 py-2.5 border border-navy-900 text-navy-900 hover:bg-navy-900 hover:text-white font-semibold rounded-sm disabled:opacity-60">
            <Plus size={15} /> Physical card
          </button>
        </div>
      </div>

      {loading ? <p className="text-muted-foreground">Loading…</p> : cards.length === 0 ? (
        <div className="border border-dashed border-border p-16 text-center rounded-sm">
          <CCIcon size={36} className="mx-auto text-muted-foreground/50" />
          <p className="mt-3 text-muted-foreground">You don't have a card yet.</p>
          <button onClick={request} className="mt-6 px-5 py-2.5 bg-navy-900 text-white rounded-sm" data-testid="empty-request-card">Request your first card</button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {cards.map(c => (
            <div key={c.id} className="space-y-3">
              <Card c={c} revealed={showReveal[c.id]} />
              <div className="grid grid-cols-4 gap-2">
                <button onClick={() => reveal(c.id)} data-testid={`reveal-${c.id}`}
                  className="inline-flex flex-col items-center gap-1 px-3 py-2 border border-border hover:border-navy-900 rounded-sm text-xs text-navy-900">
                  {showReveal[c.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                  {showReveal[c.id] ? 'Hide' : 'Reveal'}
                </button>
                <button onClick={() => freeze(c.id)} data-testid={`freeze-${c.id}`}
                  className={`inline-flex flex-col items-center gap-1 px-3 py-2 border rounded-sm text-xs ${c.is_frozen ? 'border-emerald-300 text-emerald-700' : 'border-border hover:border-navy-900 text-navy-900'}`}>
                  <Snowflake size={14} /> {c.is_frozen ? 'Unfreeze' : 'Freeze'}
                </button>
                <button onClick={() => setPinModal(c.id)} data-testid={`pin-${c.id}`}
                  className="inline-flex flex-col items-center gap-1 px-3 py-2 border border-border hover:border-navy-900 rounded-sm text-xs text-navy-900">
                  <KeyRound size={14} /> PIN
                </button>
                <button onClick={() => replace(c.id)} data-testid={`replace-${c.id}`}
                  className="inline-flex flex-col items-center gap-1 px-3 py-2 border border-border hover:border-navy-900 rounded-sm text-xs text-navy-900">
                  <RotateCcw size={14} /> Replace
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {pinModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <form onSubmit={setPin} className="bg-white rounded-sm p-6 w-full max-w-md" data-testid="pin-modal">
            <h3 className="font-display text-xl text-navy-900">Set card PIN</h3>
            <p className="text-sm text-muted-foreground mt-1">4-6 digits. Confirm with your account password.</p>
            <div className="mt-5 space-y-4">
              <input type="password" inputMode="numeric" maxLength={6} pattern="[0-9]{4,6}" required value={pinForm.pin}
                onChange={(e) => setPinForm({ ...pinForm, pin: e.target.value })} data-testid="pin-input"
                placeholder="New PIN" className="w-full px-4 py-3 border border-border rounded-sm" />
              <input type="password" required value={pinForm.current_password}
                onChange={(e) => setPinForm({ ...pinForm, current_password: e.target.value })} data-testid="pin-password"
                placeholder="Account password" className="w-full px-4 py-3 border border-border rounded-sm" />
            </div>
            <div className="mt-6 flex gap-3">
              <button type="button" onClick={() => setPinModal(null)} className="flex-1 px-4 py-2.5 border border-border rounded-sm">Cancel</button>
              <button type="submit" className="flex-1 px-4 py-2.5 bg-gold-500 text-navy-900 font-semibold rounded-sm" data-testid="pin-submit">Save PIN</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
