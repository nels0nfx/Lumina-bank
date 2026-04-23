import React, { useEffect, useState } from 'react';
import { api, fmtUSD, fmtDate } from '@/lib/api';
import { toast } from 'sonner';
import { TrendingUp, TrendingDown, Loader2 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const genSeries = (base) => {
  const out = [];
  for (let i = 0; i < 12; i++) {
    out.push({ m: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][i], v: +(base * (1 + Math.sin(i * 0.6 + base) * 0.08 + i * 0.007)).toFixed(2) });
  }
  return out;
};

const PIE_COLORS = ['#0B132B', '#D4AF37', '#1C2541', '#3A506B', '#B8962E', '#8E7324', '#D4A84B'];

export default function Investments() {
  const [assets, setAssets] = useState([]);
  const [portfolio, setPortfolio] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [trade, setTrade] = useState(null); // {symbol, side, qty, price}
  const [accountId, setAccountId] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const [a, p, ac] = await Promise.all([api.get('/investments/assets'), api.get('/investments/portfolio'), api.get('/accounts')]);
    setAssets(a.data.assets); setPortfolio(p.data); setAccounts(ac.data.accounts);
    if (ac.data.accounts[0] && !accountId) setAccountId(ac.data.accounts[0].id);
    setLoading(false);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const execute = async (e) => {
    e.preventDefault();
    try {
      const ep = trade.side === 'buy' ? '/investments/buy' : '/investments/sell';
      await api.post(ep, { symbol: trade.symbol, quantity: parseFloat(trade.qty), account_id: accountId });
      toast.success(`${trade.side === 'buy' ? 'Bought' : 'Sold'} ${trade.qty} ${trade.symbol}`);
      setTrade(null); load();
    } catch (err) { toast.error(err?.response?.data?.detail || 'Failed'); }
  };

  const allocation = (portfolio?.holdings || []).map(h => ({ name: h.symbol, value: h.value }));

  return (
    <div className="space-y-6" data-testid="investments-page">
      <div>
        <p className="text-xs tracking-[0.2em] text-gold-600 font-semibold">INVESTMENTS</p>
        <h1 className="font-display text-2xl lg:text-3xl text-navy-900 mt-1">Portfolio</h1>
      </div>

      {/* Portfolio summary */}
      <div className="grid lg:grid-cols-3 gap-5">
        <div className="p-7 bg-navy-900 text-white rounded-sm" data-testid="portfolio-summary">
          <p className="text-xs tracking-[0.2em] text-gold-500 font-semibold">PORTFOLIO VALUE</p>
          <p className="font-display text-4xl font-semibold mt-3" data-testid="portfolio-value">{fmtUSD(portfolio?.total_value || 0)}</p>
          <div className="mt-5 space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-white/60">Cost basis</span><span>{fmtUSD(portfolio?.total_cost || 0)}</span></div>
            <div className="flex justify-between"><span className="text-white/60">P/L</span><span className={`font-semibold ${(portfolio?.total_pnl || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{fmtUSD(portfolio?.total_pnl || 0)}</span></div>
          </div>
        </div>
        <div className="lg:col-span-2 p-5 bg-white border border-border rounded-sm">
          <p className="text-xs tracking-[0.2em] text-gold-600 font-semibold mb-2">PERFORMANCE (12M SIMULATED)</p>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={genSeries((portfolio?.total_value || 1000) / 12)}>
                <XAxis dataKey="m" stroke="#9CA3AF" fontSize={11} />
                <YAxis stroke="#9CA3AF" fontSize={11} />
                <Tooltip />
                <Line type="monotone" dataKey="v" stroke="#D4AF37" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Holdings */}
      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 bg-white border border-border rounded-sm" data-testid="holdings-list">
          <div className="p-5 border-b border-border flex items-center justify-between">
            <h2 className="font-display text-navy-900">Holdings</h2>
            <span className="text-xs text-muted-foreground">{portfolio?.holdings?.length || 0} positions</span>
          </div>
          {loading ? <p className="p-10 text-center text-muted-foreground">Loading…</p> : (portfolio?.holdings?.length || 0) === 0 ? (
            <p className="p-10 text-center text-muted-foreground">No holdings yet. Browse assets below to start investing.</p>
          ) : (
            <ul className="divide-y divide-border">
              {portfolio.holdings.map(h => (
                <li key={h.id} className="p-4 flex items-center justify-between" data-testid={`holding-${h.symbol}`}>
                  <div>
                    <p className="font-display text-navy-900">{h.symbol} · <span className="text-sm text-muted-foreground">{h.name}</span></p>
                    <p className="text-xs text-muted-foreground">{h.quantity} @ avg {fmtUSD(h.avg_price)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-navy-900 font-semibold">{fmtUSD(h.value)}</p>
                    <p className={`text-xs ${h.pnl >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>{h.pnl >= 0 ? '+' : ''}{h.pnl_pct}% · {fmtUSD(h.pnl)}</p>
                  </div>
                  <button onClick={() => setTrade({ symbol: h.symbol, side: 'sell', qty: h.quantity, price: h.current_price })} data-testid={`sell-${h.symbol}`}
                    className="ml-4 px-3 py-1.5 border border-border rounded-sm text-xs">Sell</button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="p-5 bg-white border border-border rounded-sm" data-testid="allocation-chart">
          <p className="text-xs tracking-[0.2em] text-gold-600 font-semibold mb-2">ALLOCATION</p>
          <div className="h-52">
            {allocation.length === 0 ? <p className="text-sm text-muted-foreground text-center pt-16">No allocations</p> : (
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={allocation} dataKey="value" nameKey="name" innerRadius={40} outerRadius={70}>
                    {allocation.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v) => fmtUSD(v)} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Asset list */}
      <div className="bg-white border border-border rounded-sm" data-testid="asset-list">
        <div className="p-5 border-b border-border"><h2 className="font-display text-navy-900">Available assets</h2></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#F8F9FA] text-xs uppercase tracking-[0.1em] text-muted-foreground">
              <tr><th className="text-left p-3">Symbol</th><th className="text-left p-3">Name</th><th className="text-right p-3">Price</th><th className="text-right p-3">24h</th><th className="p-3"></th></tr>
            </thead>
            <tbody className="divide-y divide-border">
              {assets.map(a => (
                <tr key={a.symbol} className="hover:bg-[#FBFAF5]" data-testid={`asset-${a.symbol}`}>
                  <td className="p-3 font-display text-navy-900 font-semibold">{a.symbol}</td>
                  <td className="p-3 text-muted-foreground">{a.name}</td>
                  <td className="p-3 text-right text-navy-900">{fmtUSD(a.current_price)}</td>
                  <td className={`p-3 text-right ${a.change_pct >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                    <span className="inline-flex items-center gap-1">{a.change_pct >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />} {a.change_pct}%</span>
                  </td>
                  <td className="p-3 text-right">
                    <button onClick={() => setTrade({ symbol: a.symbol, side: 'buy', qty: 1, price: a.current_price })} data-testid={`buy-${a.symbol}`}
                      className="px-3 py-1.5 bg-gold-500 hover:bg-gold-600 text-navy-900 font-semibold rounded-sm text-xs">Buy</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Trade modal */}
      {trade && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <form onSubmit={execute} className="bg-white rounded-sm p-6 w-full max-w-md" data-testid="trade-modal">
            <h3 className="font-display text-xl text-navy-900">{trade.side === 'buy' ? 'Buy' : 'Sell'} {trade.symbol}</h3>
            <p className="text-sm text-muted-foreground mt-1">Price: {fmtUSD(trade.price)}</p>
            <div className="mt-5 space-y-4">
              <div>
                <label className="text-xs uppercase tracking-[0.15em] text-muted-foreground">Settlement account</label>
                <select required value={accountId} onChange={(e) => setAccountId(e.target.value)} data-testid="trade-account"
                  className="mt-2 w-full px-4 py-3 border border-border rounded-sm bg-white">
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.type.toUpperCase()} · {fmtUSD(a.balance)}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.15em] text-muted-foreground">Quantity</label>
                <input required type="number" step="0.0001" min="0.0001" value={trade.qty}
                  onChange={(e) => setTrade({ ...trade, qty: e.target.value })} data-testid="trade-qty"
                  className="mt-2 w-full px-4 py-3 border border-border rounded-sm focus:outline-none focus:ring-2 focus:ring-gold-500/40" />
                <p className="text-xs text-muted-foreground mt-1">Estimated total: {fmtUSD((parseFloat(trade.qty) || 0) * trade.price)}</p>
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              <button type="button" onClick={() => setTrade(null)} className="flex-1 px-4 py-2.5 border border-border rounded-sm">Cancel</button>
              <button type="submit" className="flex-1 px-4 py-2.5 bg-gold-500 text-navy-900 font-semibold rounded-sm" data-testid="trade-submit">
                Confirm {trade.side}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
