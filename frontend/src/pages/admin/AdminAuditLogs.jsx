import React, { useEffect, useState } from 'react';
import { api, fmtDate, fmtUSD } from '@/lib/api';

export default function AdminAuditLogs() {
  const [logs, setLogs] = useState([]);
  useEffect(() => { api.get('/admin/audit-logs').then(r => setLogs(r.data.logs)); }, []);

  return (
    <div className="space-y-6" data-testid="admin-audit-page">
      <div>
        <p className="text-xs tracking-[0.2em] text-gold-600 font-semibold">AUDIT</p>
        <h1 className="font-display text-2xl lg:text-3xl text-navy-900 mt-1">Immutable audit log</h1>
      </div>
      <div className="bg-white border border-border rounded-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#F8F9FA] text-xs uppercase tracking-[0.1em] text-muted-foreground">
              <tr>
                <th className="text-left p-3">Time</th>
                <th className="text-left p-3">Action</th>
                <th className="text-left p-3">Target user</th>
                <th className="text-right p-3">Amount</th>
                <th className="text-left p-3">Ref</th>
                <th className="text-left p-3">Reason</th>
                <th className="text-left p-3">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {logs.map(l => (
                <tr key={l.id} className="hover:bg-[#FBFAF5]" data-testid={`audit-${l.id}`}>
                  <td className="p-3 text-xs text-muted-foreground">{fmtDate(l.created_at)}</td>
                  <td className="p-3 text-navy-900">{(l.action || '').replace(/_/g, ' ')}</td>
                  <td className="p-3 text-xs font-mono">{l.target_user_id?.slice(0, 8) || '-'}</td>
                  <td className="p-3 text-right">{l.amount ? fmtUSD(l.amount) : '-'}</td>
                  <td className="p-3 font-mono text-xs">{l.reference || l.reversal_ref || '-'}</td>
                  <td className="p-3 text-xs text-muted-foreground max-w-xs truncate">{l.reason || l.note || '-'}</td>
                  <td className="p-3 text-xs text-muted-foreground">{l.ip}</td>
                </tr>
              ))}
              {logs.length === 0 && <tr><td colSpan="7" className="p-10 text-center text-muted-foreground">No audit entries yet</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
