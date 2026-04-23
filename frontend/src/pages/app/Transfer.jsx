import React, { useEffect, useState } from 'react';
import { api, fmtUSD } from '@/lib/api';
import { toast } from 'sonner';
import { Loader2, Check, X, Users, Plus } from 'lucide-react';

export default function Transfer() {
  const [accounts, setAccounts] = useState([]);
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [form, setForm] = useState({
    from_account_id: '', recipient_type: 'email', recipient: '', amount: '',
    description: '', save_beneficiary: false, beneficiary_name: ''
  });
  const [step, setStep] = useState(1); // 1: form, 2: confirm, 3: done
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    (async () => {
      const [a, b] = await Promise.all([api.get('/accounts'), api.get('/beneficiaries')]);
      setAccounts(a.data.accounts);
      if (a.data.accounts[0]) setForm(f => ({ ...f, from_account_id: a.data.accounts[0].id }));
      setBeneficiaries(b.data.beneficiaries);
    })();
  }, []);

  const selectedAcc = accounts.find(a => a.id === form.from_account_id);

  const next = (e) => {
    e.preventDefault();
    const amt = parseFloat(form.amount);
    if (!amt || amt <= 0) return toast.error('Enter a valid amount');
    if (!selectedAcc) return toast.error('Select an account');
    if (selectedAcc.balance < amt) return toast.error('Insufficient funds');
    if (!form.recipient) return toast.error('Recipient is required');
    setStep(2);
  };

  const confirm = async () => {
    setLoading(true);
    try {
      const payload = { ...form, amount: parseFloat(form.amount) };
      const { data } = await api.post('/transfers', payload);
      setResult(data);
      setStep(3);
      toast.success('Transfer sent');
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Transfer failed');
    } finally { setLoading(false); }
  };

  const applyBeneficiary = (b) => {
    setForm(f => ({ ...f, recipient_type: b.identifier_type, recipient: b.identifier }));
  };

  const reset = () => {
    setForm({ from_account_id: accounts[0]?.id || '', recipient_type: 'email', recipient: '', amount: '', description: '', save_beneficiary: false, beneficiary_name: '' });
    setStep(1); setResult(null);
  };

  return (
    <div className="space-y-6" data-testid="transfer-page">
      <div>
        <p className="text-xs tracking-[0.2em] text-gold-600 font-semibold">TRANSFER</p>
        <h1 className="font-display text-2xl lg:text-3xl text-navy-900 mt-1">Send money</h1>
      </div>

      {step === 1 && (
        <div className="grid lg:grid-cols-3 gap-6">
          <form onSubmit={next} className="lg:col-span-2 bg-white border border-border rounded-sm p-6 space-y-5" data-testid="transfer-form">
            <div>
              <label className="text-xs uppercase tracking-[0.15em] text-muted-foreground">From account</label>
              <select required value={form.from_account_id} onChange={(e)=>setForm({...form, from_account_id: e.target.value})} data-testid="transfer-from"
                className="mt-2 w-full px-4 py-3 border border-border rounded-sm bg-white focus:outline-none focus:ring-2 focus:ring-gold-500/40">
                {accounts.map(a => (
                  <option key={a.id} value={a.id}>{a.type.toUpperCase()} · {a.account_number} — {fmtUSD(a.balance)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs uppercase tracking-[0.15em] text-muted-foreground">Send to</label>
              <div className="flex gap-2 mt-2">
                {[['email', 'Email'], ['phone', 'Phone'], ['account', 'Account #']].map(([v, l]) => (
                  <button key={v} type="button" onClick={()=>setForm({...form, recipient_type: v})}
                    data-testid={`recipient-type-${v}`}
                    className={`flex-1 px-4 py-2 text-sm rounded-sm border ${form.recipient_type === v ? 'border-navy-900 bg-navy-900 text-white' : 'border-border hover:border-navy-900'}`}>{l}</button>
                ))}
              </div>
              <input type={form.recipient_type === 'email' ? 'email' : 'text'} required value={form.recipient}
                onChange={(e)=>setForm({...form, recipient: e.target.value})} data-testid="transfer-recipient"
                placeholder={form.recipient_type === 'email' ? 'jane@example.com' : form.recipient_type === 'phone' ? '+1 555…' : '10-digit account number'}
                className="mt-3 w-full px-4 py-3 border border-border rounded-sm focus:outline-none focus:ring-2 focus:ring-gold-500/40 focus:border-gold-500" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs uppercase tracking-[0.15em] text-muted-foreground">Amount (USD)</label>
                <input type="number" step="0.01" min="0.01" required value={form.amount}
                  onChange={(e)=>setForm({...form, amount: e.target.value})} data-testid="transfer-amount"
                  className="mt-2 w-full px-4 py-3 border border-border rounded-sm focus:outline-none focus:ring-2 focus:ring-gold-500/40 focus:border-gold-500" />
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.15em] text-muted-foreground">Description (optional)</label>
                <input type="text" value={form.description} onChange={(e)=>setForm({...form, description: e.target.value})}
                  data-testid="transfer-description"
                  className="mt-2 w-full px-4 py-3 border border-border rounded-sm focus:outline-none focus:ring-2 focus:ring-gold-500/40 focus:border-gold-500" />
              </div>
            </div>
            <div className="pt-3 border-t border-border">
              <label className="flex items-center gap-2 text-sm text-navy-900">
                <input type="checkbox" checked={form.save_beneficiary} onChange={(e)=>setForm({...form, save_beneficiary: e.target.checked})}
                  data-testid="save-beneficiary" className="accent-gold-500" />
                Save as beneficiary
              </label>
              {form.save_beneficiary && (
                <input required={form.save_beneficiary} placeholder="Beneficiary name" value={form.beneficiary_name}
                  onChange={(e)=>setForm({...form, beneficiary_name: e.target.value})}
                  data-testid="beneficiary-name"
                  className="mt-3 w-full px-4 py-3 border border-border rounded-sm focus:outline-none focus:ring-2 focus:ring-gold-500/40 focus:border-gold-500" />
              )}
            </div>
            <button type="submit" data-testid="transfer-continue"
              className="w-full px-6 py-3.5 bg-navy-900 hover:bg-navy-800 text-white rounded-sm font-medium">Continue</button>
          </form>

          <div className="bg-white border border-border rounded-sm p-6" data-testid="beneficiaries-panel">
            <div className="flex items-center gap-2 mb-4"><Users size={16} className="text-gold-600" /><h3 className="font-display text-navy-900">Beneficiaries</h3></div>
            {beneficiaries.length === 0 ? (
              <p className="text-sm text-muted-foreground">No saved beneficiaries yet.</p>
            ) : (
              <ul className="space-y-2">
                {beneficiaries.map(b => (
                  <li key={b.id}>
                    <button onClick={() => applyBeneficiary(b)} data-testid={`benef-${b.id}`}
                      className="w-full text-left p-3 border border-border hover:border-gold-500 rounded-sm">
                      <p className="text-sm font-medium text-navy-900">{b.name}</p>
                      <p className="text-xs text-muted-foreground">{b.identifier} · {b.identifier_type}</p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="max-w-lg bg-white border border-border rounded-sm p-8" data-testid="transfer-confirm">
          <h2 className="font-display text-xl text-navy-900">Confirm transfer</h2>
          <dl className="mt-6 space-y-3 text-sm">
            <div className="flex justify-between"><dt className="text-muted-foreground">From</dt><dd className="text-navy-900">{selectedAcc?.type?.toUpperCase()} · {selectedAcc?.account_number}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">To ({form.recipient_type})</dt><dd className="text-navy-900">{form.recipient}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Amount</dt><dd className="text-navy-900 font-semibold">{fmtUSD(form.amount)}</dd></div>
            {form.description && <div className="flex justify-between"><dt className="text-muted-foreground">Description</dt><dd className="text-navy-900">{form.description}</dd></div>}
          </dl>
          <div className="mt-8 flex gap-3">
            <button onClick={() => setStep(1)} data-testid="transfer-back" className="flex-1 px-5 py-3 border border-border rounded-sm hover:bg-gray-50">Back</button>
            <button onClick={confirm} disabled={loading} data-testid="transfer-confirm-btn"
              className="flex-1 px-5 py-3 bg-gold-500 hover:bg-gold-600 text-navy-900 font-semibold rounded-sm disabled:opacity-60 inline-flex items-center justify-center gap-2">
              {loading && <Loader2 size={15} className="animate-spin" />}
              Confirm & Send
            </button>
          </div>
        </div>
      )}

      {step === 3 && result && (
        <div className="max-w-lg bg-white border border-border rounded-sm p-8 text-center" data-testid="transfer-success">
          <div className="mx-auto w-14 h-14 bg-emerald-50 text-emerald-700 rounded-full flex items-center justify-center"><Check size={28} /></div>
          <h2 className="mt-4 font-display text-2xl text-navy-900">Transfer sent</h2>
          <p className="mt-2 text-sm text-muted-foreground">Reference <span className="font-mono text-navy-900">{result.reference}</span></p>
          <div className="mt-8 flex gap-3 justify-center">
            <button onClick={reset} data-testid="transfer-new" className="px-5 py-2.5 border border-border rounded-sm">Send another</button>
          </div>
        </div>
      )}
    </div>
  );
}
