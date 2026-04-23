import React, { useEffect, useState } from 'react';
import { api, fmtUSD, fmtDate } from '@/lib/api';
import { Link } from 'react-router-dom';
import { Search, Eye } from 'lucide-react';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try { const { data } = await api.get('/admin/users', { params: { q } }); setUsers(data.users); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);
  useEffect(() => { const t = setTimeout(load, 400); return () => clearTimeout(t); /* eslint-disable-next-line */ }, [q]);

  return (
    <div className="space-y-6" data-testid="admin-users-page">
      <div>
        <p className="text-xs tracking-[0.2em] text-gold-600 font-semibold">USERS</p>
        <h1 className="font-display text-2xl lg:text-3xl text-navy-900 mt-1">User management</h1>
      </div>
      <div className="relative">
        <Search size={15} className="absolute left-3 top-3.5 text-muted-foreground" />
        <input placeholder="Search by name, email, or phone…" value={q} onChange={(e)=>setQ(e.target.value)}
          data-testid="users-search"
          className="w-full pl-9 pr-4 py-2.5 border border-border rounded-sm focus:outline-none focus:ring-2 focus:ring-gold-500/40" />
      </div>
      <div className="bg-white border border-border rounded-sm overflow-hidden">
        {loading ? <p className="p-10 text-center text-muted-foreground">Loading…</p> : users.length === 0 ? (
          <p className="p-10 text-center text-muted-foreground">No users found</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#F8F9FA] text-xs uppercase tracking-[0.1em] text-muted-foreground">
                <tr>
                  <th className="text-left p-3">Name</th>
                  <th className="text-left p-3">Email</th>
                  <th className="text-left p-3">KYC</th>
                  <th className="text-right p-3">Balance</th>
                  <th className="text-center p-3">Joined</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-[#FBFAF5]" data-testid={`user-row-${u.id}`}>
                    <td className="p-3 text-navy-900 font-medium">{u.full_name}</td>
                    <td className="p-3 text-muted-foreground">{u.email}</td>
                    <td className="p-3">
                      <span className={`text-xs uppercase px-2 py-0.5 rounded-sm ${
                        u.kyc_status === 'approved' ? 'bg-emerald-50 text-emerald-700' :
                        u.kyc_status === 'pending' ? 'bg-amber-50 text-amber-700' :
                        u.kyc_status === 'rejected' ? 'bg-red-50 text-red-700' : 'bg-gray-50 text-gray-700'
                      }`}>{u.kyc_status}</span>
                    </td>
                    <td className="p-3 text-right text-navy-900 font-semibold">{fmtUSD(u.total_balance)}</td>
                    <td className="p-3 text-center text-xs text-muted-foreground">{fmtDate(u.created_at)}</td>
                    <td className="p-3 text-right">
                      <Link to={`/admin/users/${u.id}`} data-testid={`view-user-${u.id}`} className="inline-flex items-center gap-1 text-navy-900 hover:text-gold-600">
                        <Eye size={14} /> View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
