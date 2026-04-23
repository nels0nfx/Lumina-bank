import React, { useEffect, useState } from 'react';
import { api, fmtDate } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { ShieldCheck, Upload, Loader2, Clock, XCircle, CheckCircle2 } from 'lucide-react';

export default function KYC() {
  const { user, refreshUser } = useAuth();
  const [status, setStatus] = useState(user?.kyc_status || 'not_started');
  const [submission, setSubmission] = useState(null);
  const [form, setForm] = useState({ dob: '', address: '', next_of_kin_name: '', next_of_kin_phone: '', account_type: 'both' });
  const [idDoc, setIdDoc] = useState(null);
  const [selfie, setSelfie] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    try {
      const { data } = await api.get('/kyc/status');
      setStatus(data.status); setSubmission(data.submission);
    } catch {}
  };
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (!idDoc || !selfie) return toast.error('Upload ID document and selfie');
    setLoading(true);
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => fd.append(k, v));
    fd.append('id_document', idDoc);
    fd.append('selfie', selfie);
    try {
      await api.post('/kyc/submit', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('KYC submitted. We\'ll review within 24 hours.');
      refreshUser(); load();
    } catch (err) { toast.error(err?.response?.data?.detail || 'Failed'); }
    finally { setLoading(false); }
  };

  const StatusCard = () => {
    const cfg = {
      not_started: { I: Upload, c: 'bg-gold-100 text-gold-700 border-gold-500/40', label: 'Not started' },
      pending: { I: Clock, c: 'bg-amber-50 text-amber-700 border-amber-300', label: 'Under review' },
      approved: { I: CheckCircle2, c: 'bg-emerald-50 text-emerald-700 border-emerald-300', label: 'Approved' },
      rejected: { I: XCircle, c: 'bg-red-50 text-red-700 border-red-300', label: 'Rejected — please resubmit' },
    }[status] || { I: Clock, c: 'bg-gray-50', label: status };
    const I = cfg.I;
    return (
      <div className={`p-5 border ${cfg.c} rounded-sm flex items-start gap-3`} data-testid="kyc-status-card">
        <I size={18} />
        <div>
          <p className="font-semibold">{cfg.label}</p>
          {submission && <p className="text-xs mt-1">Submitted {fmtDate(submission.submitted_at)}</p>}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6" data-testid="kyc-page">
      <div>
        <p className="text-xs tracking-[0.2em] text-gold-600 font-semibold">KYC</p>
        <h1 className="font-display text-2xl lg:text-3xl text-navy-900 mt-1">Verify your identity</h1>
        <p className="mt-2 text-muted-foreground">Verification is required to transfer funds, apply for loans, and use investments.</p>
      </div>

      <StatusCard />

      {(status === 'not_started' || status === 'rejected') && (
        <form onSubmit={submit} className="bg-white border border-border rounded-sm p-6 space-y-5 max-w-2xl" data-testid="kyc-form">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs uppercase tracking-[0.15em] text-muted-foreground">Date of birth</label>
              <input required type="date" value={form.dob} onChange={(e)=>setForm({...form, dob: e.target.value})} data-testid="kyc-dob"
                className="mt-2 w-full px-4 py-3 border border-border rounded-sm" />
            </div>
            <div>
              <label className="text-xs uppercase tracking-[0.15em] text-muted-foreground">Preferred account</label>
              <select value={form.account_type} onChange={(e)=>setForm({...form, account_type: e.target.value})} data-testid="kyc-account-type"
                className="mt-2 w-full px-4 py-3 border border-border rounded-sm bg-white">
                <option value="both">Savings + Checking</option>
                <option value="savings">Savings only</option>
                <option value="checking">Checking only</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs uppercase tracking-[0.15em] text-muted-foreground">Address</label>
            <textarea required rows={2} value={form.address} onChange={(e)=>setForm({...form, address: e.target.value})}
              data-testid="kyc-address" className="mt-2 w-full px-4 py-3 border border-border rounded-sm" />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs uppercase tracking-[0.15em] text-muted-foreground">Next of kin — name</label>
              <input required value={form.next_of_kin_name} onChange={(e)=>setForm({...form, next_of_kin_name: e.target.value})}
                data-testid="kyc-nok-name" className="mt-2 w-full px-4 py-3 border border-border rounded-sm" />
            </div>
            <div>
              <label className="text-xs uppercase tracking-[0.15em] text-muted-foreground">Next of kin — phone</label>
              <input required value={form.next_of_kin_phone} onChange={(e)=>setForm({...form, next_of_kin_phone: e.target.value})}
                data-testid="kyc-nok-phone" className="mt-2 w-full px-4 py-3 border border-border rounded-sm" />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs uppercase tracking-[0.15em] text-muted-foreground">Government ID</label>
              <input required type="file" accept="image/*,application/pdf" onChange={(e)=>setIdDoc(e.target.files[0])} data-testid="kyc-id"
                className="mt-2 w-full text-sm" />
            </div>
            <div>
              <label className="text-xs uppercase tracking-[0.15em] text-muted-foreground">Selfie</label>
              <input required type="file" accept="image/*" onChange={(e)=>setSelfie(e.target.files[0])} data-testid="kyc-selfie"
                className="mt-2 w-full text-sm" />
            </div>
          </div>
          <button disabled={loading} type="submit" data-testid="kyc-submit"
            className="px-6 py-3.5 bg-gold-500 hover:bg-gold-600 text-navy-900 font-semibold rounded-sm inline-flex items-center gap-2 disabled:opacity-60">
            {loading && <Loader2 size={15} className="animate-spin" />} <ShieldCheck size={15} /> Submit for review
          </button>
        </form>
      )}

      {status === 'pending' && (
        <div className="max-w-2xl p-8 border border-border bg-[#FBFAF5] text-navy-900 rounded-sm">
          <p>Your documents are being reviewed. You'll receive a notification and email when the decision is made.</p>
        </div>
      )}
      {status === 'approved' && (
        <div className="max-w-2xl p-8 border border-emerald-300 bg-emerald-50 text-emerald-800 rounded-sm">
          <p>Congratulations — you're fully verified. All features are unlocked.</p>
        </div>
      )}
    </div>
  );
}
