'use client';
import { useEffect, useState, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  AlertTriangle,
  Timer,
  ShieldCheck,
  Wallet,
  Search,
  Plus,
  Copy,
  Check,
  Inbox,
  ArrowUpRight,
  Menu,
  Sparkles,
  RefreshCw,
  Clock,
  ShieldAlert,
  Bell,
  CheckCircle2,
} from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';
import { ReturnRow, ReturnCase } from '@/components/ReturnRow';

function DashboardContent() {
  const searchParams = useSearchParams();
  const currentTab = searchParams.get('tab');
  const isDashboard = !currentTab;
  const isAllPurchases = currentTab === 'all';
  const isCompleted = currentTab === 'completed';
  const isNotifications = currentTab === 'notifications';

  const [items, setItems] = useState<ReturnCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<string>('all');
  const [isGmailConnected, setIsGmailConnected] = useState(false);
  const [hasLoadedAuth, setHasLoadedAuth] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    // Check if redirected with success query or already stored
    if (searchParams.get('gmail_connected') === 'true') {
      setIsGmailConnected(true);
      localStorage.setItem('return_radar_gmail_connected', 'true');
    } else if (localStorage.getItem('return_radar_gmail_connected') === 'true') {
      setIsGmailConnected(true);
    }
    setHasLoadedAuth(true);
  }, [searchParams]);

  const fetchItems = async () => {
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080';
      const res = await fetch(`${backendUrl}/api/returns`);
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setItems(data.data);
      }
    } catch (err) {
      console.error('Failed to load returns:', err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchItems();
    const interval = setInterval(fetchItems, 5000);
    return () => clearInterval(interval);
  }, []);

  // Sync tab from URL
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'all') setFilterTab('all');
    else if (tab === 'completed') setFilterTab('completed');
    else if (tab === 'critical') setFilterTab('critical');
    else if (tab === 'notifications') setFilterTab('notifications');
    else setFilterTab('all');
  }, [searchParams]);

  const handleDelete = async (id: string) => {
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080';
      await fetch(`${backendUrl}/api/returns/${id}`, { method: 'DELETE' });
      setItems(prev => prev.filter(item => item.id !== id));
    } catch (err) {
      console.error('Failed to delete item:', err);
    }
  };

  const handleComplete = async (id: string) => {
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080';
      const res = await fetch(`${backendUrl}/api/returns/${id}`, { 
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Completed' })
      });
      if (!res.ok) {
        // Fallback to POST /complete if PUT is not supported
        await fetch(`${backendUrl}/api/returns/${id}/complete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
      }
      setItems(prev => prev.map(item => item.id === id ? { ...item, status: 'Completed' } : item));
    } catch (err) {
      console.error('Failed to complete item:', err);
    }
  };

  const handleReactivate = async (id: string) => {
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080';
      await fetch(`${backendUrl}/api/returns/${id}`, { 
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Monitoring' })
      });
      setItems(prev => prev.map(item => item.id === id ? { ...item, status: 'Monitoring' } : item));
    } catch (err) {
      console.error('Failed to reactivate item:', err);
    }
  };

  // Calculations
  const activeItems = useMemo(() => items.filter(i => i.status !== "Completed"), [items]);
  const urgentItems = useMemo(() => items.filter(i => i.daysRemaining <= 7 && i.daysRemaining >= 0 && i.status !== "Completed"), [items]);
  const safeItems = useMemo(() => items.filter(i => i.daysRemaining > 7 && i.status !== "Completed"), [items]);
  const completedItems = useMemo(() => items.filter(i => i.status === "Completed"), [items]);

  const totalValueTracked = useMemo(() => {
    const sum = activeItems
      .filter(i => i.daysRemaining >= 0)
      .reduce((acc, curr) => acc + (curr.price || 0), 0);
    return sum > 0 ? `$${sum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '$0.00';
  }, [activeItems]);

  // Most urgent item for hero callout
  const mostUrgentItem = useMemo(() => {
    if (urgentItems.length > 0) {
      return [...urgentItems].sort((a, b) => a.daysRemaining - b.daysRemaining)[0];
    }
    return null;
  }, [urgentItems]);

  // Filtered display list
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesSearch =
        item.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.retailer.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (filterTab === 'critical') return item.daysRemaining <= 7 && item.daysRemaining >= 0 && item.status !== "Completed";
      if (filterTab === 'monitoring') return item.daysRemaining > 7 && item.status !== "Completed";
      if (filterTab === 'completed') return item.status === "Completed";
      return item.status !== "Completed";
    });
  }, [items, searchQuery, filterTab]);

  const stats = [
    {
      label: "Action needed",
      value: String(urgentItems.length),
      hint: urgentItems.length === 1 ? "1 item due this week" : `${urgentItems.length} items due this week`,
      icon: AlertTriangle,
      tone: "text-critical",
      wash: "bg-critical-soft",
    },
    {
      label: "Monitoring",
      value: String(safeItems.length),
      hint: "safe return window",
      icon: ShieldCheck,
      tone: "text-safe",
      wash: "bg-safe-soft",
    },
    {
      label: "Value tracked",
      value: totalValueTracked,
      hint: `across ${items.filter(i => i.daysRemaining >= 0).length} active items`,
      icon: Wallet,
      tone: "text-primary",
      wash: "bg-sidebar-accent",
    },
  ];

  if (!hasLoadedAuth) return null;

  if (!isGmailConnected) {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080';
    return (
      <div className="flex min-h-screen bg-gradient-to-br from-[#ffffff] to-[#fff3d4] overflow-hidden relative selection:bg-black selection:text-white">
        
        {/* Subtle animated background shapes */}
        <div className="absolute top-[0%] left-[-10%] w-[50%] h-[50%] rounded-full bg-orange-900/5 blur-[120px] mix-blend-multiply animate-pulse" style={{ animationDuration: '10s' }} />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-teal-900/5 blur-[120px] mix-blend-multiply animate-pulse" style={{ animationDuration: '7s' }} />

        <div className="flex flex-col w-full max-w-[1400px] mx-auto z-10 p-6 lg:p-16 xl:p-24 items-center justify-center">
          
          {/* CENTERED LOGO SECTION ABOVE COLUMNS */}
          <div className="flex flex-col md:flex-row items-center justify-center gap-5 sm:gap-8 mb-16 sm:mb-24 w-full animate-in fade-in slide-in-from-top-8 duration-1000 ease-out fill-mode-both">
            <img src="/logo.png?v=3" alt="ReturnMinder Logo" className="w-24 h-24 sm:w-32 sm:h-32 lg:w-40 lg:h-40 object-contain hover:scale-105 transition-transform duration-700 ease-out" />
            <div className="flex flex-col justify-center text-center md:text-left mt-2 md:mt-0">
              <span className="font-bold text-[#1e2329] text-[40px] sm:text-[56px] lg:text-[64px] tracking-tight leading-[1.05]">ReturnMinder</span>
              <span className="text-[12px] sm:text-[14px] uppercase tracking-[0.3em] font-bold text-muted-foreground leading-tight mt-2 sm:mt-3">Returns made easy</span>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row w-full items-center">
            
            {/* Left Block: Headline, Action */}
            <div className="flex-1 flex flex-col justify-center max-w-2xl lg:pr-16 w-full animate-in fade-in slide-in-from-left-8 duration-1000 delay-300 ease-out fill-mode-both text-center lg:text-left items-center lg:items-start">
              
              {/* Main Headline */}
              <div className="mb-12">
                <h1 className="text-[32px] sm:text-[48px] lg:text-[56px] leading-[1.15] font-light text-[#1e2329] tracking-tight">
                  Every deadline you'd otherwise forget, kept in one calm ledger.
                </h1>
              </div>

              {/* Auth Action */}
              <div className="w-full max-w-[280px]">
                <a
                  href={`${backendUrl}/api/auth/google`}
                  className="group flex w-full items-center justify-center gap-3 h-14 rounded-full bg-black text-[16px] font-medium text-white hover:bg-gray-900 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300"
                >
                  Continue with Google
                </a>
                
                <p className="text-[13px] text-muted-foreground mt-4 ml-1">
                  Start for free. No credit card required.
                </p>
              </div>
            </div>

            {/* Right Block: Features (Moving Blocks) */}
            <div className="flex-1 w-full flex flex-col justify-center mt-16 lg:mt-0 lg:pl-16 relative">
              <div className="space-y-8">
                
                {/* Feature 1 */}
                <div className="flex items-start gap-5 animate-in fade-in slide-in-from-right-8 duration-1000 delay-300 ease-out fill-mode-both group hover:-translate-x-1 transition-transform">
                  <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[#e6efeb] text-[#1e5256] shadow-sm group-hover:scale-110 transition-transform">
                    <Timer className="size-6" />
                  </div>
                  <div className="pt-1">
                    <h3 className="text-[17px] font-bold text-[#1e2329] mb-1">Never miss a window</h3>
                    <p className="text-[15px] text-muted-foreground leading-relaxed">Countdowns on every purchase, down to the last day.</p>
                  </div>
                </div>

                {/* Feature 2 */}
                <div className="flex items-start gap-5 animate-in fade-in slide-in-from-right-8 duration-1000 delay-500 ease-out fill-mode-both group hover:-translate-x-1 transition-transform">
                  <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[#e6efeb] text-[#1e5256] shadow-sm group-hover:scale-110 transition-transform">
                    <Sparkles className="size-6" />
                  </div>
                  <div className="pt-1">
                    <h3 className="text-[17px] font-bold text-[#1e2329] mb-1">Receipts read for you</h3>
                    <p className="text-[15px] text-muted-foreground leading-relaxed">Forward an email — the fine print is extracted instantly.</p>
                  </div>
                </div>

                {/* Feature 3 */}
                <div className="flex items-start gap-5 animate-in fade-in slide-in-from-right-8 duration-1000 delay-700 ease-out fill-mode-both group hover:-translate-x-1 transition-transform">
                  <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[#e6efeb] text-[#1e5256] shadow-sm group-hover:scale-110 transition-transform">
                    <Bell className="size-6" />
                  </div>
                  <div className="pt-1">
                    <h3 className="text-[17px] font-bold text-[#1e2329] mb-1">Notifications sent</h3>
                    <p className="text-[15px] text-muted-foreground leading-relaxed">Get an automated warning email before your window closes.</p>
                  </div>
                </div>

              </div>
            </div>

          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar Navigation */}
      <Sidebar
        urgentCount={urgentItems.length}
        totalCount={activeItems.length}
        completedCount={completedItems.length}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top Header */}
        <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-border bg-background/90 px-4 py-3 backdrop-blur-md sm:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="grid size-9 place-items-center rounded-lg border border-border bg-surface-1 text-muted-foreground transition hover:text-foreground lg:hidden"
              aria-label="Open sidebar"
            >
              <Menu className="size-4" strokeWidth={2} />
            </button>
            <div className="flex items-center gap-2.5">
              <h2 className="font-display text-base sm:text-lg font-semibold tracking-tight text-foreground">
                {isCompleted ? 'Completed Returns' : isNotifications ? 'Notifications' : isAllPurchases ? 'All Purchases' : 'Dashboard'}
              </h2>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-safe-soft px-2.5 py-0.5 text-[11px] font-medium text-safe border border-safe/20">
                <span className="size-1.5 rounded-full bg-safe animate-pulse" />
                Live Sync
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Search Input */}
            <div className="relative hidden sm:block">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                strokeWidth={1.75}
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search purchases or retailers…"
                className="h-9 w-48 md:w-64 lg:w-72 rounded-full border border-border bg-surface-1 pl-9 pr-4 text-xs md:text-sm outline-none transition-all placeholder:text-muted-foreground focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
              />
            </div>

            {/* Add Purchase Button */}
            <Link
              href="/upload"
              className="inline-flex h-9 items-center gap-1.5 rounded-full bg-primary px-3.5 sm:px-4 text-xs sm:text-sm font-medium text-primary-foreground shadow-sm transition hover:opacity-90 shrink-0"
            >
              <Plus className="size-4" strokeWidth={2} />
              <span className="hidden sm:inline">Add purchase</span>
              <span className="sm:hidden">Add</span>
            </Link>
          </div>
        </header>

        {/* Main Body */}
        <main className="mx-auto w-full max-w-6xl flex-1 space-y-8 px-4 py-8 sm:px-6 lg:py-10">
          {filterTab === 'notifications' ? (
            <section className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="space-y-3">
                <p className="label-mono text-accent">Inbox</p>
                <h1 className="max-w-2xl text-3xl font-semibold leading-[1.1] sm:text-4xl text-foreground">
                  Notifications
                </h1>
                <p className="max-w-xl text-[15px] leading-relaxed text-muted-foreground">
                  Important updates about your connected accounts and active return windows.
                </p>
              </div>

              <div className="space-y-3 mt-8">
                {isGmailConnected && (
                  <div className="panel p-4 flex gap-4 items-start border-l-4 border-l-safe">
                    <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-safe/10 text-safe">
                      <ShieldCheck className="size-5" strokeWidth={2} />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">Gmail Auto-Ingestion Active</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        ReturnMinder is autonomously monitoring your incoming receipts via Google Cloud Pub/Sub.
                      </p>
                    </div>
                  </div>
                )}
                {urgentItems.length > 0 ? urgentItems.map(item => (
                  <div key={'notif-'+item.id} className="panel p-4 flex gap-4 items-start border-l-4 border-l-critical">
                    <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-critical/10 text-critical">
                      <AlertTriangle className="size-5" strokeWidth={2} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-foreground">Action Needed: {item.productName}</h3>
                        <span className="text-[11px] text-muted-foreground font-mono">{item.deadlineDate}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        You have {item.daysRemaining} days left to return this item to {item.retailer}.
                      </p>
                    </div>
                  </div>
                )) : (
                  !isGmailConnected && (
                    <div className="panel p-12 text-center text-muted-foreground text-sm flex flex-col items-center gap-3">
                      <Bell className="size-8 opacity-20" />
                      <p>You&apos;re all caught up! Connect your Gmail or upload a receipt to get started.</p>
                    </div>
                  )
                )}
              </div>
            </section>
          ) : (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
              {/* Intro Section */}
              {isCompleted ? (
                <section className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="label-mono text-safe">Archive & History</span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-safe-soft px-2 py-0.5 text-[10px] font-semibold text-safe border border-safe/20">
                      {completedItems.length} {completedItems.length === 1 ? 'Return' : 'Returns'} Settled
                    </span>
                  </div>
                  <h1 className="max-w-2xl text-3xl font-semibold leading-[1.1] sm:text-4xl text-foreground">
                    Completed returns
                  </h1>
                  <p className="max-w-xl text-[15px] leading-relaxed text-muted-foreground">
                    Items you have successfully returned or marked as completed. Kept here as a permanent record of all settled purchases.
                  </p>
                </section>
              ) : isAllPurchases ? (
                <section className="space-y-3">
                  <p className="label-mono text-accent">Purchase Ledger</p>
                  <h1 className="max-w-2xl text-3xl font-semibold leading-[1.1] sm:text-4xl text-foreground">
                    All purchases
                  </h1>
                  <p className="max-w-xl text-[15px] leading-relaxed text-muted-foreground">
                    A complete ledger of all active purchases and return deadlines currently tracked by ReturnMinder.
                  </p>
                </section>
              ) : (
                <>
                  <section className="space-y-3">
                    <p className="label-mono text-accent">Command center</p>
                    <h1 className="max-w-2xl text-3xl font-semibold leading-[1.1] sm:text-4xl text-foreground">
                      Everything you can still send back
                    </h1>
                    <p className="max-w-xl text-[15px] leading-relaxed text-muted-foreground">
                      ReturnMinder reads your receipts, extracts the fine print and counts down every return window so you never lose money to a missed deadline.
                    </p>
                  </section>

                  {/* Dynamic Critical Hero Alert */}
                  {!loading && (
                    <>
                      {mostUrgentItem ? (
                        <section className="hero-wash relative overflow-hidden rounded-xl border border-critical/25 bg-surface-1 p-5 shadow-[var(--shadow-panel)] sm:p-6">
                          <span className="absolute inset-y-0 left-0 w-1 bg-critical" aria-hidden />
                          <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
                            <div className="grid size-11 shrink-0 place-items-center rounded-lg bg-critical-soft text-critical">
                              <AlertTriangle className="size-5" strokeWidth={1.75} />
                            </div>
                            <div className="space-y-4 flex-1">
                              <div className="space-y-1.5">
                                <div className="flex items-center gap-2">
                                  <span className="rounded-full bg-critical-soft px-2.5 py-0.5 text-xs font-semibold text-critical border border-critical/20">
                                    Urgent Return
                                  </span>
                                  <span className="text-xs text-muted-foreground font-mono">
                                    Deadline: {mostUrgentItem.deadlineDate}
                                  </span>
                                </div>
                                <h2 className="text-lg font-semibold sm:text-xl text-foreground">
                                  {mostUrgentItem.productName} return closes in {mostUrgentItem.daysRemaining} {mostUrgentItem.daysRemaining === 1 ? 'day' : 'days'}
                                </h2>
                                <p className="text-sm text-muted-foreground">
                                  Purchased at {mostUrgentItem.retailer} {mostUrgentItem.price ? `for $${mostUrgentItem.price.toFixed(2)}` : ''}. Make sure original packaging and tags are ready.
                                </p>
                              </div>
                              <div className="flex flex-wrap items-center gap-2">
                                <a
                                  href={`https://www.google.com/search?q=${encodeURIComponent(mostUrgentItem.retailer + ' return policy initiate return')}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex h-9 items-center gap-1.5 rounded-full bg-critical px-4 text-sm font-medium text-white shadow-sm transition-opacity hover:opacity-90"
                                >
                                  Start return
                                  <ArrowUpRight className="size-4" strokeWidth={2} />
                                </a>
                                <button
                                  onClick={() => handleComplete(mostUrgentItem.id)}
                                  className="inline-flex h-9 items-center gap-1.5 rounded-full border border-safe/30 bg-safe-soft px-4 text-sm font-semibold text-safe transition hover:bg-safe hover:text-white shadow-xs cursor-pointer"
                                  title="Mark this return as completed"
                                >
                                  <CheckCircle2 className="size-4" strokeWidth={2} />
                                  Returned
                                </button>
                              </div>
                            </div>
                          </div>
                        </section>
                      ) : (
                        <section className="relative overflow-hidden rounded-xl border border-safe/25 bg-safe-soft/50 p-5 shadow-[var(--shadow-panel)] sm:p-6">
                          <span className="absolute inset-y-0 left-0 w-1 bg-safe" aria-hidden />
                          <div className="flex items-center gap-4">
                            <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-safe text-white shadow-sm">
                              <ShieldCheck className="size-5" strokeWidth={1.75} />
                            </div>
                            <div>
                              <h3 className="text-base font-semibold text-foreground">All purchases are within safe return windows</h3>
                              <p className="text-sm text-muted-foreground">
                                Gemini 3.5 Flash is continuously monitoring your receipt inbox and will notify you when any item is 7 days from closing.
                              </p>
                            </div>
                          </div>
                        </section>
                      )}

                      {/* Stats Grid */}
                      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                        {stats.map((s) => (
                          <div key={s.label} className="panel p-4 transition hover:border-border-strong">
                            <div className="flex items-center gap-2.5">
                              <span className={`grid size-7 place-items-center rounded-md ${s.wash} ${s.tone}`}>
                                <s.icon className="size-3.5" strokeWidth={1.75} />
                              </span>
                              <span className="text-[13px] text-muted-foreground font-medium">{s.label}</span>
                            </div>
                            <p className={`mt-4 font-display text-2xl font-semibold tabular-nums sm:text-3xl ${s.tone}`}>
                              {s.value}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">{s.hint}</p>
                          </div>
                        ))}
                      </section>
                    </>
                  )}
                </>
              )}

              {/* Purchases Section */}
              <section className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
                  <div className="flex items-center gap-3">
                    <h2 className="text-base font-semibold text-foreground">
                      {isCompleted ? 'Completed Returns' : isAllPurchases ? 'All Purchases' : 'Monitored Purchases'}
                    </h2>
                    {isDashboard && (
                      <div className="flex items-center rounded-lg bg-surface-2 p-0.5 text-xs border border-border overflow-x-auto whitespace-nowrap">
                        <button
                          onClick={() => setFilterTab('all')}
                          className={`px-2.5 py-1 rounded-md font-medium transition ${filterTab === 'all' ? 'bg-surface-1 text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                          All ({activeItems.length})
                        </button>
                        <button
                          onClick={() => setFilterTab('critical')}
                          className={`px-2.5 py-1 rounded-md font-medium transition ${filterTab === 'critical' ? 'bg-surface-1 text-critical shadow-xs' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                          Action needed ({urgentItems.length})
                        </button>
                        <button
                          onClick={() => setFilterTab('monitoring')}
                          className={`px-2.5 py-1 rounded-md font-medium transition ${filterTab === 'monitoring' ? 'bg-surface-1 text-safe shadow-xs' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                          Monitoring ({safeItems.length})
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={fetchItems}
                      className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition p-1.5 rounded-md hover:bg-secondary"
                      title="Force Refresh"
                    >
                      <RefreshCw className="size-3.5" />
                      Refresh
                    </button>
                    <Link
                      href="/upload"
                      className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:text-accent transition"
                    >
                      Scan receipt
                      <ArrowUpRight className="size-3.5" strokeWidth={2} />
                    </Link>
                  </div>
                </div>

                {/* List */}
                {loading ? (
                  <div className="panel p-12 text-center text-muted-foreground">
                    <div className="inline-block size-6 animate-spin rounded-full border-2 border-primary border-t-transparent mb-3" />
                    <p className="text-sm">Connecting to ReturnMinder autonomous tracker...</p>
                  </div>
                ) : filteredItems.length === 0 ? (
                  <div className="panel p-12 text-center space-y-3">
                    <div className="mx-auto grid size-12 place-items-center rounded-full bg-secondary text-muted-foreground">
                      {isCompleted ? (
                        <CheckCircle2 className="size-6 text-safe" strokeWidth={1.5} />
                      ) : (
                        <Inbox className="size-6" strokeWidth={1.5} />
                      )}
                    </div>
                    <div className="space-y-1">
                      <p className="font-semibold text-foreground">
                        {isCompleted 
                          ? 'No completed returns yet' 
                          : isAllPurchases 
                          ? 'No purchases tracked yet' 
                          : 'No purchases in this view'}
                      </p>
                      <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                        {isCompleted
                          ? 'When you return an item, click the "Returned" button on any purchase to log it here.'
                          : 'Connect your Gmail above or upload a paper receipt to start autonomous deadline tracking.'}
                      </p>
                    </div>
                    {!isCompleted && (
                      <div className="pt-2">
                        <Link
                          href="/upload"
                          className="inline-flex h-9 items-center gap-1.5 rounded-full bg-primary px-4 text-xs font-medium text-primary-foreground shadow-sm transition hover:opacity-90"
                        >
                          <Plus className="size-3.5" strokeWidth={2} />
                          Upload a receipt now
                        </Link>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredItems.map((item) => (
                      <ReturnRow
                        key={item.id}
                        item={item}
                        onDelete={handleDelete}
                        onComplete={handleComplete}
                        onReactivate={handleReactivate}
                      />
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default function Dashboard() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <DashboardContent />
    </Suspense>
  );
}
