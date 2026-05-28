import React, { useState, useEffect } from 'react';
import { Search, Calendar, ShoppingBag, Home as HomeIcon, User, Star, Clock, MapPin, Plus, Minus, X, ChevronRight, Check, Lock, LogOut, TrendingUp, Package, Edit3, Trash2, Scissors, ArrowLeft, Bell, Upload, Image as ImageIcon, Settings as SettingsIcon, DollarSign, FileText, Briefcase, ClipboardList, Download, History, ArrowRight, Truck, BadgeCheck, Wallet, PieChart, Users as UsersIcon, MessageCircle, Send, Eye, EyeOff, CreditCard } from 'lucide-react';
import { supabase } from './lib/supabase';

const n = (v) => (Number(v) || 0).toLocaleString('en-NG');
const ORDER_STAGES = ['new', 'confirmed', 'processing', 'ready', 'completed'];
const STAGE_LABEL = { new: 'New', confirmed: 'Confirmed', processing: 'Processing', ready: 'Ready', completed: 'Completed', cancelled: 'Cancelled' };
const STAGE_COLOR = {
  new: 'bg-amber-100 text-amber-700', confirmed: 'bg-sky-100 text-sky-700',
  processing: 'bg-indigo-100 text-indigo-700', ready: 'bg-teal-100 text-teal-700',
  completed: 'bg-green-100 text-green-700', cancelled: 'bg-red-100 text-red-700',
};
const defaultSettings = { depositPercent: 50, cancellationFeePercent: 20, peakEnabled: true, peakDays: ['FR','SA','SU'], peakPricingMultiplier: 1.25 };

// ── Supabase app_data helpers (single source of truth) ──────────────────────
const sbGet = async (key, fallback) => {
  try {
    const { data } = await supabase.from('app_data').select('value').eq('key', key).maybeSingle();
    return data?.value ?? fallback;
  } catch { return fallback; }
};
const sbSet = async (key, value) => {
  try {
    await supabase.from('app_data').upsert({ key, value }, { onConflict: 'key' });
  } catch (e) { console.error(`sbSet(${key}):`, e); }
};

// ── EmailJS notification helper ───────────────────────────────────────────
const sendAdminEmail = async (templateId, params) => {
  try {
    const svcId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
    const pubKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;
    if (!svcId || !pubKey || !templateId || !window.emailjs) return;
    await window.emailjs.send(svcId, templateId, params);
  } catch (e) { console.warn('EmailJS send failed:', e); }
};

const DEFAULT_SERVICES = [
  { id: 's1', category: 'Hair', name: 'Box Braids', duration: 240, price: 25000, desc: 'Classic box braids, any length', popular: true },
  { id: 's2', category: 'Hair', name: 'Knotless Braids', duration: 300, price: 35000, desc: 'Lightweight, no tension knotless style', popular: true },
  { id: 's3', category: 'Hair', name: 'Cornrows', duration: 120, price: 10000, desc: 'Straight-back or freestyle patterns' },
  { id: 's4', category: 'Hair', name: 'Hair Wash & Style', duration: 75, price: 8000, desc: 'Deep cleanse & professional styling' },
  { id: 's5', category: 'Nails', name: 'Classic Manicure', duration: 45, price: 5000, desc: 'Shape, cuticle care & polish' },
  { id: 's6', category: 'Nails', name: 'Gel Manicure', duration: 60, price: 8000, desc: 'Long-lasting gel finish' },
  { id: 's7', category: 'Nails', name: 'Acrylic Full Set', duration: 90, price: 12000, desc: 'Full set with shape of choice', popular: true },
  { id: 's8', category: 'Feet', name: 'Classic Pedicure', duration: 60, price: 7000, desc: 'Foot soak, scrub & polish' },
  { id: 's9', category: 'Feet', name: 'Luxury Spa Pedicure', duration: 90, price: 11000, desc: 'Hot stones, mask & massage', popular: true },
  { id: 's10', category: 'Packages', name: 'Full Glow Package', duration: 360, price: 45000, desc: 'Hair + mani + pedi combo' },
];
const DEFAULT_PRODUCTS = [
  { id: 'p1', name: 'Pre-Stretched Braiding Hair 26"', price: 3500, cost: 1600, stock: 120, category: 'Hair Extensions', emoji: '💇🏾‍♀️' },
  { id: 'p2', name: 'Human Hair Bundle 20"', price: 25000, cost: 14000, stock: 25, category: 'Hair Extensions', emoji: '✨' },
  { id: 'p3', name: 'Edge Control Gel', price: 2500, cost: 1100, stock: 7, category: 'Styling', emoji: '💆🏾‍♀️' },
  { id: 'p4', name: 'Shine n Jam', price: 2000, cost: 900, stock: 60, category: 'Styling', emoji: '💫' },
  { id: 'p5', name: 'Gel Polish Set (12 colours)', price: 6000, cost: 3200, stock: 30, category: 'Nails', emoji: '💅' },
  { id: 'p6', name: 'Cuticle Oil Treatment', price: 1500, cost: 600, stock: 4, category: 'Nails', emoji: '🫧' },
];
const DEFAULT_STAFF = [
  { id: 'st1', name: 'Uchenna', role: 'Owner & Lead Stylist', specialty: 'Hair', rating: 4.9, initial: 'U' },
  { id: 'st2', name: 'Chiamaka', role: 'Senior Nail Tech', specialty: 'Nails', rating: 4.8, initial: 'C' },
  { id: 'st3', name: 'Blessing', role: 'Braider', specialty: 'Hair', rating: 5.0, initial: 'B' },
  { id: 'st4', name: 'Any professional', role: 'First available', specialty: 'Any', rating: 4.9, initial: '✨' },
];
const DEFAULT_ANNOUNCEMENTS = [
  { id: 'a1', title: 'New summer braids in stock! 🌴', body: 'Fresh colours just arrived — book early for the weekend.', audience: 'customer', active: true, createdAt: new Date().toISOString() },
];
const DEFAULT_MESSAGES = [
  { id: 'm1', from: 'support', text: 'Hi! 👋 Welcome to Uchis Beauty Salon. How can we help you today?', at: new Date().toISOString(), read: false },
];

export default function UchisApp() {
  const [view, setView] = useState('home');
  const [role, setRole] = useState(null);
  const [authUser, setAuthUser] = useState(null);
  const [selectedServices, setSelectedServices] = useState([]);
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [customerUser, setCustomerUser] = useState(null);
  const [customerProfile, setCustomerProfile] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authInitialTab, setAuthInitialTab] = useState('signin');

  const [services, setServices] = useState([]);
  const [products, setProducts] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [orders, setOrders] = useState([]);
  const [staff, setStaff] = useState([]);
  const [priceLog, setPriceLog] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [messages, setMessages] = useState([]);
  const [settings, setSettings] = useState(defaultSettings);

  // ── Boot: load everything from Supabase ────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        // 1. Restore auth session — distinguish staff vs customer
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const { data: staffProf } = await supabase.from('profiles').select('role').eq('id', session.user.id).maybeSingle();
          if (staffProf?.role) {
            setAuthUser(session.user); setRole(staffProf.role);
          } else {
            setCustomerUser(session.user);
            const { data: custProf } = await supabase.from('customer_profiles').select('*').eq('id', session.user.id).maybeSingle();
            if (custProf) setCustomerProfile(custProf);
          }
        }

        // 2. Load all app data in parallel
        const [svcs, prods, bkgs, ords, stf, anns, msgs, plg, cfg] = await Promise.all([
          sbGet('services',      DEFAULT_SERVICES),
          sbGet('products',      DEFAULT_PRODUCTS),
          sbGet('bookings',      []),
          sbGet('orders',        []),
          sbGet('staff',         DEFAULT_STAFF),
          sbGet('announcements', DEFAULT_ANNOUNCEMENTS),
          sbGet('messages',      DEFAULT_MESSAGES),
          sbGet('priceLog',      []),
          sbGet('settings',      null),
        ]);

        setServices(Array.isArray(svcs) && svcs.length ? svcs : DEFAULT_SERVICES);
        setProducts(Array.isArray(prods) && prods.length ? prods : DEFAULT_PRODUCTS);
        setBookings(Array.isArray(bkgs) ? bkgs : []);
        setOrders(Array.isArray(ords) ? ords : []);
        setStaff(Array.isArray(stf) && stf.length ? stf : DEFAULT_STAFF);
        setAnnouncements(Array.isArray(anns) ? anns : DEFAULT_ANNOUNCEMENTS);
        setMessages(Array.isArray(msgs) && msgs.length ? msgs : DEFAULT_MESSAGES);
        setPriceLog(Array.isArray(plg) ? plg : []);
        if (cfg && typeof cfg === 'object') {
          setSettings({
            ...defaultSettings, ...cfg,
            peakDays: Array.isArray(cfg.peakDays)
              ? cfg.peakDays
              : String(cfg.peakDays || '').split(',').map(x => x.trim()).filter(Boolean),
          });
        }

        // 3. First-run seed: write defaults to DB if services key is missing
        const { data: exists } = await supabase.from('app_data').select('key').eq('key', 'services').maybeSingle();
        if (!exists) {
          await Promise.all([
            sbSet('services', DEFAULT_SERVICES), sbSet('products', DEFAULT_PRODUCTS),
            sbSet('staff', DEFAULT_STAFF), sbSet('announcements', DEFAULT_ANNOUNCEMENTS),
            sbSet('messages', DEFAULT_MESSAGES), sbSet('bookings', []),
            sbSet('orders', []), sbSet('priceLog', []), sbSet('settings', defaultSettings),
          ]);
        }
      } catch (err) {
        console.error('Boot load error:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ── Auth state listener (staff + customer) ────────────────────────────────
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        const { data: staffProf } = await supabase.from('profiles').select('role').eq('id', session.user.id).maybeSingle();
        if (staffProf?.role) {
          setAuthUser(session.user); setRole(staffProf.role);
        } else {
          setCustomerUser(session.user);
          const { data: cp } = await supabase.from('customer_profiles').select('*').eq('id', session.user.id).maybeSingle();
          if (cp) setCustomerProfile(cp);
        }
      }
      if (event === 'SIGNED_OUT') {
        setAuthUser(null); setRole(null);
        setCustomerUser(null); setCustomerProfile(null);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // ── Paystack script loader ─────────────────────────────────────────────────
  useEffect(() => {
    if (document.querySelector('script[src*="paystack"]')) return;
    const s = document.createElement('script');
    s.src = 'https://js.paystack.co/v1/inline.js'; s.async = true;
    document.head.appendChild(s);
  }, []);

  // ── EmailJS script loader ──────────────────────────────────────────────────
  useEffect(() => {
    if (document.querySelector('script[src*="emailjs"]')) return;
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js';
    s.async = true;
    s.onload = () => {
      const pubKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;
      if (pubKey && window.emailjs) window.emailjs.init({ publicKey: pubKey });
    };
    document.head.appendChild(s);
  }, []);

  // ── Realtime — live chat updates ───────────────────────────────────────────
  useEffect(() => {
    const ch = supabase.channel('uchis-messages')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'app_data', filter: 'key=eq.messages' },
        (payload) => { if (payload.new?.value) setMessages(payload.new.value); })
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, []);

  // ── Save functions — single write to Supabase ──────────────────────────────
  const save = {
    services:      async (d) => { setServices(d);       await sbSet('services', d); },
    products:      async (d) => { setProducts(d);       await sbSet('products', d); },
    bookings:      async (d) => { setBookings(d);       await sbSet('bookings', d); },
    orders:        async (d) => { setOrders(d);         await sbSet('orders', d); },
    staff:         async (d) => { setStaff(d);          await sbSet('staff', d); },
    priceLog:      async (d) => { setPriceLog(d);       await sbSet('priceLog', d); },
    announcements: async (d) => { setAnnouncements(d);  await sbSet('announcements', d); },
    messages:      async (d) => { setMessages(d);       await sbSet('messages', d); },
    settings:      async (d) => { setSettings(d);       await sbSet('settings', d); },
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setRole(null); setAuthUser(null); setView('home');
  };
  const handleCustomerSignOut = async () => {
    await supabase.auth.signOut();
    setCustomerUser(null); setCustomerProfile(null);
  };

  if (loading) return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-3xl italic" style={{ fontFamily: "'Fraunces', serif" }}>Uchis</div>
    </div>
  );

  const fontStyle = { fontFamily: "'Inter', system-ui, sans-serif" };
  const styleBlock = (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,600;0,9..144,700;0,9..144,900;1,9..144,400&family=Inter:wght@300;400;500;600;700&display=swap');
      .font-display { font-family: 'Fraunces', serif; }
      .brand-teal { color: #0D9488; } .bg-brand-teal { background-color: #0D9488; }
      .bg-brand-teal-soft { background-color: #F0FDFA; } .border-brand-teal { border-color: #0D9488; }
      .bg-brand-black { background-color: #0A0A0A; }
      .hover-lift { transition: all 0.2s ease; } .hover-lift:hover { transform: translateY(-2px); box-shadow: 0 10px 30px rgba(0,0,0,0.08); }
      .no-scrollbar::-webkit-scrollbar { display: none; } .no-scrollbar { scrollbar-width: none; }
      input:focus, textarea:focus, select:focus { outline: none; border-color: #0D9488 !important; }
    `}</style>
  );

  // STAFF LOGIN GATE
  if (view === 'staff-gate') {
    return (
      <div className="min-h-screen bg-neutral-50" style={fontStyle}>{styleBlock}
        <StaffLogin
          currentUser={authUser} currentRole={role}
          onLogin={(r) => { setRole(r); setView('home'); }}
          onBack={() => setView('home')}
          onSignOut={handleSignOut}
        />
      </div>
    );
  }

  // STAFF PORTALS
  if (role === 'owner') {
    return <div className="min-h-screen bg-neutral-50" style={fontStyle}>{styleBlock}
      <OwnerPortal services={services} products={products} bookings={bookings} orders={orders} staff={staff} settings={settings} priceLog={priceLog} announcements={announcements} messages={messages} save={save} exit={() => { setRole(null); setView('home'); }} onSignOut={handleSignOut} />
    </div>;
  }
  if (role === 'manager') {
    return <div className="min-h-screen bg-neutral-50" style={fontStyle}>{styleBlock}
      <ManagerPortal services={services} products={products} bookings={bookings} orders={orders} staff={staff} priceLog={priceLog} announcements={announcements} messages={messages} save={save} exit={() => { setRole(null); setView('home'); }} onSignOut={handleSignOut} />
    </div>;
  }
  if (role === 'accountant') {
    return <div className="min-h-screen bg-neutral-50" style={fontStyle}>{styleBlock}
      <AccountantPortal products={products} bookings={bookings} orders={orders} services={services} settings={settings} exit={() => { setRole(null); setView('home'); }} onSignOut={handleSignOut} />
    </div>;
  }

  // CUSTOMER APP
  return (
    <div className="min-h-screen bg-neutral-50" style={fontStyle}>
      {styleBlock}
      <div className="pb-24 w-full max-w-lg mx-auto bg-white min-h-screen shadow-xl relative">
        {view === 'home' && <HomeScreen setView={setView} services={services} staff={staff} announcements={announcements} customerUser={customerUser} customerProfile={customerProfile} onOpenAuth={() => { setAuthInitialTab('signin'); setShowAuthModal(true); }} />}
        {view === 'services' && <ServicesScreen services={services} selectedServices={selectedServices} setSelectedServices={setSelectedServices} setView={setView} />}
        {view === 'shop' && <ShopScreen products={products} cart={cart} setCart={setCart} setView={setView} />}
        {view === 'bookings' && <BookingsScreen bookings={bookings} saveBookings={save.bookings} setView={setView} customerId={customerUser?.id} />}
        {view === 'orders' && <OrdersScreen orders={orders} customerId={customerUser?.id} setView={setView} />}
        {view === 'profile' && <ProfileScreen setView={setView} bookings={bookings} orders={orders} customerUser={customerUser} customerProfile={customerProfile} onOpenAuth={(tab) => { setAuthInitialTab(tab || 'signin'); setShowAuthModal(true); }} onSignOut={handleCustomerSignOut} />}
        {view === 'chat' && <ChatScreen messages={messages} saveMessages={save.messages} setView={setView} />}
        {view === 'checkout-booking' && <CheckoutBooking selectedServices={selectedServices} setSelectedServices={setSelectedServices} staff={staff} bookings={bookings} saveBookings={save.bookings} settings={settings} setView={setView} customerProfile={customerProfile} customerId={customerUser?.id} />}
        {view === 'checkout-shop' && <CheckoutShop cart={cart} setCart={setCart} orders={orders} saveOrders={save.orders} products={products} saveProducts={save.products} setView={setView} customerProfile={customerProfile} customerId={customerUser?.id} />}

        {!['checkout-booking', 'checkout-shop'].includes(view) && (
          <div className="fixed bottom-0 left-0 right-0 z-40"><div className="max-w-lg mx-auto bg-white border-t border-neutral-200"><div className="grid grid-cols-5">
            {[{ id: 'home', label: 'Home', icon: HomeIcon }, { id: 'services', label: 'Services', icon: Scissors }, { id: 'shop', label: 'Shop', icon: ShoppingBag }, { id: 'bookings', label: 'Bookings', icon: Calendar }, { id: 'profile', label: 'Profile', icon: User }].map(t => {
              const Icon = t.icon; const active = view === t.id;
              return <button key={t.id} onClick={() => setView(t.id)} className="flex flex-col items-center py-3 gap-1"><Icon className={`w-5 h-5 ${active ? 'brand-teal' : 'text-neutral-400'}`} strokeWidth={active ? 2.5 : 2} /><span className={`text-[10px] font-medium ${active ? 'brand-teal' : 'text-neutral-500'}`}>{t.label}</span></button>;
            })}
          </div></div></div>
        )}

        {selectedServices.length > 0 && view !== 'checkout-booking' && (
          <div className="fixed bottom-16 left-0 right-0 z-30"><div className="max-w-lg mx-auto px-4 pb-2">
            <button onClick={() => setView('checkout-booking')} className="w-full bg-brand-black text-white rounded-full py-4 px-6 flex items-center justify-between shadow-2xl">
              <div className="flex items-center gap-3"><div className="w-8 h-8 bg-brand-teal rounded-full flex items-center justify-center text-xs font-bold">{selectedServices.length}</div><span className="font-semibold">Continue</span></div>
              <div className="flex items-center gap-1"><span className="font-bold">₦{n(selectedServices.reduce((s,x)=>s+x.price,0))}</span><ChevronRight className="w-5 h-5" /></div>
            </button>
          </div></div>
        )}

        {!['chat', 'checkout-booking', 'checkout-shop'].includes(view) && selectedServices.length === 0 && (
          <div className="fixed bottom-0 left-0 right-0 z-30 pointer-events-none"><div className="max-w-lg mx-auto relative">
            <button onClick={() => setView('chat')} className="pointer-events-auto absolute right-4 bottom-20 w-14 h-14 bg-brand-teal text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-105 transition" aria-label="Chat with us">
              <MessageCircle className="w-6 h-6" />
              {messages.some(m => m.from === 'support' && !m.read) && <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-red-500 rounded-full border-2 border-white" />}
            </button>
          </div></div>
        )}

        {showAuthModal && (
          <AuthModal initialTab={authInitialTab} onClose={() => setShowAuthModal(false)} onSuccess={(user, profile) => { setCustomerUser(user); if (profile) setCustomerProfile(profile); setShowAuthModal(false); }} />
        )}
      </div>
    </div>
  );
}

/* =============== STAFF LOGIN (Supabase Auth) =============== */
function StaffLogin({ currentUser, currentRole, onLogin, onBack, onSignOut }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  // Already signed in — offer quick portal entry
  if (currentUser && currentRole) {
    const label = { owner: 'Owner', manager: 'Manager', accountant: 'Accountant' }[currentRole] || currentRole;
    return (
      <div className="min-h-screen flex flex-col max-w-md mx-auto bg-white">
        <div className="px-5 pt-6 pb-4">
          <button onClick={onBack} className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center"><ArrowLeft className="w-5 h-5" /></button>
        </div>
        <div className="flex-1 px-6 pt-6">
          <div className="w-16 h-16 rounded-2xl bg-brand-teal-soft flex items-center justify-center mb-6"><BadgeCheck className="w-8 h-8 brand-teal" /></div>
          <h1 className="font-display text-3xl font-bold mb-1">Welcome back</h1>
          <p className="text-sm text-neutral-500 mb-8">Signed in as <span className="font-semibold">{currentUser.email}</span></p>
          <button onClick={() => onLogin(currentRole)} className="w-full bg-brand-teal text-white rounded-full py-4 font-semibold mb-3">
            Enter {label} portal
          </button>
          <button onClick={onSignOut} className="w-full bg-neutral-100 text-neutral-700 rounded-full py-4 font-semibold flex items-center justify-center gap-2">
            <LogOut className="w-4 h-4" /> Sign out
          </button>
        </div>
      </div>
    );
  }

  const submit = async (e) => {
    e?.preventDefault();
    if (!email.trim() || !password) return;
    setBusy(true); setErr('');
    try {
      const { data, error: authErr } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (authErr) throw authErr;
      const { data: prof, error: profErr } = await supabase.from('profiles').select('role').eq('id', data.user.id).maybeSingle();
      if (profErr || !prof?.role) {
        await supabase.auth.signOut();
        throw new Error('No staff profile found. Ask the owner to set up your access.');
      }
      onLogin(prof.role);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col max-w-md mx-auto bg-white">
      <div className="px-5 pt-6 pb-4">
        <button onClick={onBack} className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center"><ArrowLeft className="w-5 h-5" /></button>
      </div>
      <div className="flex-1 px-6 pt-6">
        <div className="w-16 h-16 rounded-2xl bg-brand-teal-soft flex items-center justify-center mb-6"><Lock className="w-8 h-8 brand-teal" /></div>
        <h1 className="font-display text-3xl font-bold mb-1">Staff sign in</h1>
        <p className="text-sm text-neutral-500 mb-8">Enter your email and password to access your portal</p>
        <form onSubmit={submit} className="space-y-3">
          <input type="email" value={email} onChange={e => { setEmail(e.target.value); setErr(''); }} placeholder="Email address" autoComplete="email" className="w-full bg-neutral-50 border-2 border-neutral-200 rounded-2xl px-4 py-4 text-sm" />
          <input type="password" value={password} onChange={e => { setPassword(e.target.value); setErr(''); }} placeholder="Password" autoComplete="current-password" className="w-full bg-neutral-50 border-2 border-neutral-200 rounded-2xl px-4 py-4 text-sm" />
          {err && <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 text-sm text-red-700">{err}</div>}
          <button type="submit" disabled={busy || !email.trim() || !password} className="w-full bg-brand-teal text-white rounded-full py-4 font-semibold disabled:opacity-50">
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <p className="text-xs text-neutral-400 text-center mt-8 leading-relaxed">
          Staff access only. Contact the salon owner to get your login credentials.
        </p>
      </div>
    </div>
  );
}

/* =============== HOME =============== */
function HomeScreen({ setView, services, staff, announcements, customerUser, customerProfile, onOpenAuth }) {
  const popular = services.filter(s => s.popular).slice(0, 4);
  const categories = [{ name: 'Hair', emoji: '💇🏾‍♀️' }, { name: 'Nails', emoji: '💅' }, { name: 'Feet', emoji: '🌸' }, { name: 'Packages', emoji: '✨' }];
  const liveAnnouncements = (announcements || []).filter(a => a.active && (a.audience === 'customer' || a.audience === 'both'));
  const [dismissed, setDismissed] = useState([]);
  const visible = liveAnnouncements.filter(a => !dismissed.includes(a.id));
  return (
    <div>
      <div className="px-5 pt-6 pb-4 bg-white"><div className="flex items-center justify-between mb-1">
        <div><div className="text-xs text-neutral-500">Welcome to</div><div className="font-display text-2xl italic">Uchis Beauty Salon</div></div>
        <button onClick={customerUser ? () => setView('profile') : onOpenAuth} className="w-10 h-10 rounded-full overflow-hidden bg-brand-teal-soft flex items-center justify-center shrink-0">
          {customerUser ? (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white font-bold text-sm">
              {(customerProfile?.name || customerUser.email)?.[0]?.toUpperCase() || 'U'}
            </div>
          ) : <User className="w-5 h-5 brand-teal" />}
        </button>
      </div></div>
      {visible.length > 0 && (
        <div className="px-5 pb-2 space-y-2">{visible.map(a => (
          <div key={a.id} className="relative rounded-2xl bg-gradient-to-r from-teal-600 to-teal-700 text-white p-4 pr-10 overflow-hidden">
            <div className="absolute inset-0 opacity-20" style={{ background: 'radial-gradient(circle at 90% 10%, #FFFFFF 0%, transparent 45%)' }} />
            <div className="relative flex items-start gap-2"><Bell className="w-4 h-4 mt-0.5 shrink-0" /><div><div className="font-semibold text-sm leading-snug">{a.title}</div>{a.body && <div className="text-xs text-white/85 mt-0.5">{a.body}</div>}</div></div>
            <button onClick={() => setDismissed([...dismissed, a.id])} className="absolute top-2.5 right-2.5 w-6 h-6 rounded-full bg-white/15 flex items-center justify-center"><X className="w-3.5 h-3.5" /></button>
          </div>
        ))}</div>
      )}
      <div className="px-5 pb-4 bg-white"><button onClick={() => setView('services')} className="w-full flex items-center gap-3 bg-neutral-100 rounded-full px-4 py-3.5 text-left"><Search className="w-4 h-4 text-neutral-400" /><span className="text-sm text-neutral-500">Search services...</span></button></div>
      <div className="px-5 pb-5"><div className="relative rounded-3xl overflow-hidden bg-brand-black p-6 h-48">
        <div className="absolute inset-0 opacity-40" style={{ background: 'radial-gradient(circle at 100% 0%, #2DD4BF 0%, transparent 50%)' }} />
        <div className="relative z-10 h-full flex flex-col justify-between">
          <div><div className="text-xs text-white/60 tracking-widest uppercase mb-1">New Client Offer</div><div className="font-display text-white text-2xl italic leading-tight">Get your<br/>glow on ✨</div></div>
          <div className="flex items-center justify-between"><div className="text-white/80 text-xs max-w-[60%]">20% off your first booking with code GLOW20</div><button onClick={() => setView('services')} className="bg-brand-teal text-white text-xs font-bold px-4 py-2 rounded-full">Book now</button></div>
        </div>
      </div></div>
      <div className="px-5 pb-5"><button onClick={() => setView('services')} className="w-full bg-brand-teal-soft rounded-2xl p-4 text-left hover-lift flex items-center justify-between">
        <div className="flex items-center gap-3"><Calendar className="w-6 h-6 brand-teal" /><div><div className="font-semibold text-sm">Book an appointment</div><div className="text-xs text-neutral-600">Choose from {services.length} services</div></div></div><ChevronRight className="w-5 h-5 brand-teal" />
      </button></div>
      <div className="px-5 pb-6">
        <div className="flex items-center justify-between mb-3"><h2 className="font-display text-lg font-bold">Categories</h2><button onClick={() => setView('services')} className="text-xs brand-teal font-semibold">See all</button></div>
        <div className="grid grid-cols-4 gap-2">{categories.map(c => <button key={c.name} onClick={() => setView('services')} className="bg-brand-teal-soft rounded-2xl p-3 flex flex-col items-center gap-1 hover-lift"><div className="text-2xl">{c.emoji}</div><div className="text-[11px] font-semibold">{c.name}</div></button>)}</div>
      </div>
      <div className="px-5 pb-6">
        <div className="flex items-center justify-between mb-3"><h2 className="font-display text-lg font-bold">Popular services</h2><button onClick={() => setView('services')} className="text-xs brand-teal font-semibold">See all</button></div>
        <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-5 px-5 pb-2">{popular.map(s => <button key={s.id} onClick={() => setView('services')} className="min-w-[200px] bg-white border border-neutral-200 rounded-2xl p-4 text-left hover-lift">
          <div className="h-20 bg-brand-teal-soft rounded-xl flex items-center justify-center text-3xl mb-3">{s.category === 'Hair' ? '💇🏾‍♀️' : s.category === 'Nails' ? '💅' : s.category === 'Feet' ? '🌸' : '✨'}</div>
          <div className="text-[10px] text-neutral-500 uppercase tracking-wider">{s.category}</div><div className="font-semibold text-sm mt-0.5 line-clamp-1">{s.name}</div>
          <div className="flex items-center justify-between mt-2"><div className="text-xs text-neutral-500">{s.duration}min</div><div className="font-bold text-sm">₦{n(s.price)}</div></div>
        </button>)}</div>
      </div>
      <div className="px-5 pb-6">
        <h2 className="font-display text-lg font-bold mb-3">Meet the team</h2>
        <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-5 px-5 pb-2">{staff.filter(s => s.specialty !== 'Any').map(p => <div key={p.id} className="min-w-[120px] text-center">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 mx-auto flex items-center justify-center text-white text-2xl font-display font-bold mb-2">{p.initial}</div>
          <div className="text-sm font-semibold">{p.name}</div><div className="text-[10px] text-neutral-500 mb-1">{p.role}</div>
          <div className="flex items-center justify-center gap-1"><Star className="w-3 h-3 fill-amber-500 text-amber-500" /><span className="text-xs font-semibold">{p.rating}</span></div>
        </div>)}</div>
      </div>
    </div>
  );
}

/* =============== SERVICES =============== */
function ServicesScreen({ services, selectedServices, setSelectedServices, setView }) {
  const [activeCat, setActiveCat] = useState('All');
  const [search, setSearch] = useState('');
  const categories = ['All', ...Array.from(new Set(services.map(s => s.category)))];
  const filtered = services.filter(s => (activeCat === 'All' || s.category === activeCat) && (search === '' || s.name.toLowerCase().includes(search.toLowerCase())));
  const toggle = (s) => { selectedServices.find(x => x.id === s.id) ? setSelectedServices(selectedServices.filter(x => x.id !== s.id)) : setSelectedServices([...selectedServices, s]); };
  return (
    <div>
      <div className="sticky top-0 bg-white z-20 border-b border-neutral-100">
        <div className="px-5 pt-6 pb-3"><div className="flex items-center justify-between mb-3"><button onClick={() => setView('home')} className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center"><ArrowLeft className="w-5 h-5" /></button><h1 className="font-display text-lg font-bold">Services</h1><div className="w-10" /></div>
          <div className="flex items-center gap-2 bg-neutral-100 rounded-full px-4 py-3"><Search className="w-4 h-4 text-neutral-400" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search services..." className="flex-1 bg-transparent text-sm placeholder:text-neutral-400" /></div>
        </div>
        <div className="flex gap-2 overflow-x-auto no-scrollbar px-5 pb-3">{categories.map(c => <button key={c} onClick={() => setActiveCat(c)} className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap border ${activeCat === c ? 'bg-brand-black text-white border-brand-black' : 'bg-white text-neutral-600 border-neutral-200'}`}>{c}</button>)}</div>
      </div>
      <div className="px-5 py-4 space-y-2">
        {filtered.map(s => { const sel = !!selectedServices.find(x => x.id === s.id); return (
          <div key={s.id} className={`bg-white border rounded-2xl p-4 flex items-center justify-between ${sel ? 'border-brand-teal' : 'border-neutral-200'}`}>
            <div className="flex-1 min-w-0 pr-3"><div className="flex items-center gap-2 mb-0.5"><div className="font-semibold text-sm">{s.name}</div>{s.popular && <span className="text-[9px] font-bold brand-teal bg-brand-teal-soft px-1.5 py-0.5 rounded">POPULAR</span>}</div>
              <div className="text-xs text-neutral-500 line-clamp-1">{s.desc}</div>
              <div className="flex items-center gap-3 mt-1.5"><div className="text-xs text-neutral-500 flex items-center gap-1"><Clock className="w-3 h-3" /> {s.duration}min</div><div className="text-sm font-bold">₦{n(s.price)}</div></div>
            </div>
            <button onClick={() => toggle(s)} className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${sel ? 'bg-brand-teal text-white' : 'bg-neutral-100 text-neutral-700'}`}>{sel ? <Check className="w-5 h-5" /> : <Plus className="w-5 h-5" />}</button>
          </div>
        ); })}
        {filtered.length === 0 && <div className="text-center text-sm text-neutral-500 py-12">No services found.</div>}
      </div>
    </div>
  );
}

/* =============== CHECKOUT BOOKING =============== */
function CheckoutBooking({ selectedServices, setSelectedServices, staff, bookings, saveBookings, settings, setView, customerProfile, customerId }) {
  const [step, setStep] = useState(1);
  const [selectedStaff, setSelectedStaff] = useState(staff[staff.length - 1]);
  const [date, setDate] = useState(''); const [time, setTime] = useState('');
  const [customer, setCustomer] = useState({ name: customerProfile?.name || '', phone: customerProfile?.phone || '', email: customerProfile?.email || '', notes: '' });
  const [confirmed, setConfirmed] = useState(null);
  const total = selectedServices.reduce((s, x) => s + x.price, 0);
  const totalMin = selectedServices.reduce((s, x) => s + x.duration, 0);
  const times = ['09:00', '10:30', '12:00', '13:30', '15:00', '16:30'];
  const today = new Date().toISOString().split('T')[0];
  const isPeak = () => { if (!settings?.peakEnabled || !date) return false; const d = new Date(date + 'T00:00:00'); if (isNaN(d)) return false; return (settings.peakDays || []).includes(['SU','MO','TU','WE','TH','FR','SA'][d.getDay()]); };
  const peak = isPeak();
  const depositPct = settings?.depositPercent || 0;
  const depositAmount = peak ? Math.round(total * depositPct / 100) : 0;
  const cancelPct = settings?.cancellationFeePercent || 0;
  const cancelFee = peak ? Math.round(depositAmount * cancelPct / 100) : 0;
  const remove = (id) => { const next = selectedServices.filter(x => x.id !== id); setSelectedServices(next); if (next.length === 0) setView('services'); };
  const confirm = async (depositPaidViaPaystack = false) => {
    if (!customer.name || !customer.phone) return alert('Please fill in your name and phone');
    const booking = { id: 'bk_' + Date.now(), customerId: customerId || null, services: selectedServices, staff: selectedStaff, staffId: selectedStaff.id, date, time, total, totalMin, peak, depositAmount, depositPaid: depositAmount > 0 || depositPaidViaPaystack, cancellationFeePercent: cancelPct, cancellationFee: cancelFee, customer, status: 'pending', createdAt: new Date().toISOString() };
    await saveBookings([...bookings, booking]);
    // Email admin notification
    sendAdminEmail(import.meta.env.VITE_EMAILJS_TEMPLATE_BOOKING, {
      customer_name: customer.name,
      customer_phone: customer.phone,
      customer_email: customer.email || 'N/A',
      services: selectedServices.map(s => s.name).join(', '),
      staff_name: selectedStaff.name,
      date, time,
      total: `₦${(Number(total)||0).toLocaleString('en-NG')}`,
      deposit: depositAmount > 0 ? `₦${(Number(depositAmount)||0).toLocaleString('en-NG')}` : 'None',
      notes: customer.notes || 'None',
      booking_id: booking.id,
    });
    setConfirmed(booking); setSelectedServices([]);
  };
  if (confirmed) return (
    <div className="min-h-screen flex flex-col"><div className="flex-1 px-6 pt-16 text-center">
      <div className="w-20 h-20 rounded-full bg-amber-500 flex items-center justify-center mx-auto mb-6"><Clock className="w-10 h-10 text-white" strokeWidth={2.5} /></div>
      <h1 className="font-display text-3xl font-bold mb-2">Request received!</h1><p className="text-neutral-500 text-sm mb-8">Awaiting confirmation — we'll text you once approved</p>
      <div className="bg-neutral-50 rounded-2xl p-5 text-left mb-6"><div className="text-xs text-neutral-500 mb-1">Booking ID</div><div className="font-mono text-sm mb-4">{confirmed.id}</div>
        <div className="space-y-3"><div className="flex justify-between text-sm"><span className="text-neutral-500">Date & time</span><span className="font-semibold">{confirmed.date} • {confirmed.time}</span></div>
          <div className="flex justify-between text-sm"><span className="text-neutral-500">With</span><span className="font-semibold">{confirmed.staff.name}</span></div>
          {confirmed.depositAmount > 0 && <div className="flex justify-between text-sm"><span className="text-neutral-500">Deposit paid</span><span className="brand-teal font-semibold">₦{n(confirmed.depositAmount)}</span></div>}
          <div className="border-t pt-3 flex justify-between"><span className="font-semibold">Total</span><span className="font-bold text-lg">₦{n(confirmed.total)}</span></div></div>
        {confirmed.depositAmount > 0 && confirmed.cancellationFeePercent > 0 && <div className="text-[11px] text-neutral-500 mt-4 leading-relaxed">Cancellation policy: {confirmed.cancellationFeePercent}% of your deposit (₦{n(confirmed.cancellationFee)}) is non-refundable if you cancel this peak-day booking.</div>}
      </div></div><div className="p-5"><button onClick={() => { setConfirmed(null); setView('bookings'); }} className="w-full bg-brand-black text-white rounded-full py-4 font-semibold">See my bookings</button></div></div>
  );
  return (
    <div className="min-h-screen flex flex-col">
      <div className="sticky top-0 bg-white z-20 border-b border-neutral-100">
        <div className="px-5 pt-6 pb-4 flex items-center justify-between"><button onClick={() => step === 1 ? setView('services') : setStep(step - 1)} className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center"><ArrowLeft className="w-5 h-5" /></button><div className="text-sm font-semibold">Step {step} of 3</div><div className="w-10" /></div>
        <div className="h-1 bg-neutral-100"><div className="h-full bg-brand-teal transition-all" style={{ width: `${(step/3)*100}%` }} /></div>
      </div>
      <div className="flex-1 px-5 py-5">
        {step === 1 && (<div>
          <h1 className="font-display text-2xl font-bold mb-1">Your services</h1><p className="text-sm text-neutral-500 mb-5">Review and add more if you'd like</p>
          <div className="space-y-2 mb-6">{selectedServices.map(s => <div key={s.id} className="bg-white border border-neutral-200 rounded-2xl p-4 flex items-center justify-between"><div><div className="font-semibold text-sm">{s.name}</div><div className="text-xs text-neutral-500">{s.duration}min • ₦{n(s.price)}</div></div><button onClick={() => remove(s.id)} className="w-9 h-9 bg-neutral-100 rounded-full flex items-center justify-center"><X className="w-4 h-4" /></button></div>)}</div>
          <button onClick={() => setView('services')} className="w-full border-2 border-dashed border-neutral-300 rounded-2xl py-4 text-sm font-semibold text-neutral-600 hover:border-brand-teal hover:text-brand-teal transition flex items-center justify-center gap-2 mb-6"><Plus className="w-4 h-4" /> Add another service</button>
          <h2 className="font-display text-lg font-bold mb-3">Choose professional</h2>
          <div className="space-y-2">{staff.map(p => <button key={p.id} onClick={() => setSelectedStaff(p)} className={`w-full bg-white border rounded-2xl p-3 flex items-center gap-3 ${selectedStaff.id === p.id ? 'border-brand-teal' : 'border-neutral-200'}`}>
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white font-bold">{p.initial}</div>
            <div className="flex-1 text-left"><div className="font-semibold text-sm">{p.name}</div><div className="text-xs text-neutral-500">{p.role}</div></div>
            {p.specialty !== 'Any' && <div className="flex items-center gap-1 text-xs"><Star className="w-3 h-3 fill-amber-500 text-amber-500" /> {p.rating}</div>}
            {selectedStaff.id === p.id && <div className="w-5 h-5 rounded-full bg-brand-teal flex items-center justify-center"><Check className="w-3 h-3 text-white" strokeWidth={3} /></div>}
          </button>)}</div>
        </div>)}
        {step === 2 && (<div>
          <h1 className="font-display text-2xl font-bold mb-1">Pick date & time</h1><p className="text-sm text-neutral-500 mb-5">When would you like to come in?</p>
          <label className="text-xs font-semibold text-neutral-600 mb-2 block">Date</label>
          <input type="date" min={today} value={date} onChange={e => setDate(e.target.value)} className="w-full bg-neutral-50 border border-neutral-200 rounded-2xl px-4 py-4 mb-2 text-sm" />
          {peak && <div className="text-xs brand-teal font-semibold mb-4">⚠ This is a peak day — a {depositPct}% deposit applies{cancelPct > 0 ? `, and ${cancelPct}% of it is non-refundable if you cancel` : ''}.</div>}
          <label className="text-xs font-semibold text-neutral-600 mb-2 block mt-3">Available times</label>
          <div className="grid grid-cols-3 gap-2">{times.map(t => <button key={t} onClick={() => setTime(t)} className={`py-3 rounded-2xl border text-sm font-semibold ${time === t ? 'bg-brand-black text-white border-brand-black' : 'bg-white text-neutral-700 border-neutral-200'}`}>{t}</button>)}</div>
        </div>)}
        {step === 3 && (<div>
          <h1 className="font-display text-2xl font-bold mb-1">Your details</h1><p className="text-sm text-neutral-500 mb-5">So we can confirm your booking</p>
          <div className="space-y-3 mb-6">
            <input value={customer.name} onChange={e => setCustomer({...customer, name: e.target.value})} className="w-full bg-neutral-50 border border-neutral-200 rounded-2xl px-4 py-3.5 text-sm" placeholder="Your full name" />
            <input value={customer.phone} onChange={e => setCustomer({...customer, phone: e.target.value})} className="w-full bg-neutral-50 border border-neutral-200 rounded-2xl px-4 py-3.5 text-sm" placeholder="Phone number" />
            <input value={customer.email} onChange={e => setCustomer({...customer, email: e.target.value})} className="w-full bg-neutral-50 border border-neutral-200 rounded-2xl px-4 py-3.5 text-sm" placeholder="Email (optional)" />
            <textarea value={customer.notes} onChange={e => setCustomer({...customer, notes: e.target.value})} rows={3} className="w-full bg-neutral-50 border border-neutral-200 rounded-2xl px-4 py-3.5 text-sm resize-none" placeholder="Any special requests?" />
          </div>
          {peak && depositAmount > 0 && <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-4"><div className="text-sm font-bold text-amber-900">Peak day — deposit required</div><div className="bg-white rounded-xl p-3 mt-2"><div className="flex justify-between text-sm mb-1"><span className="text-neutral-600">Deposit now ({depositPct}%)</span><span className="font-bold">₦{n(depositAmount)}</span></div><div className="flex justify-between text-sm"><span className="text-neutral-600">Balance at appointment</span><span>₦{n(total - depositAmount)}</span></div></div>{cancelPct > 0 && <div className="flex items-start gap-1.5 mt-2.5 text-xs text-amber-800"><X className="w-3.5 h-3.5 mt-0.5 shrink-0" /><span>Cancellation policy: if you cancel, {cancelPct}% of your deposit (₦{n(cancelFee)}) is kept as a fee. You'd be refunded ₦{n(depositAmount - cancelFee)}.</span></div>}</div>}
          <div className="bg-neutral-50 rounded-2xl p-4 mb-4"><div className="text-xs font-semibold text-neutral-600 mb-3">BOOKING SUMMARY</div>{selectedServices.map(s => <div key={s.id} className="flex justify-between text-sm py-1"><span>{s.name}</span><span>₦{n(s.price)}</span></div>)}<div className="border-t border-neutral-200 mt-2 pt-2 flex justify-between text-sm font-bold"><span>Total</span><span>₦{n(total)}</span></div>{peak && depositAmount > 0 && <div className="flex justify-between text-sm brand-teal font-bold mt-1"><span>Pay now (deposit)</span><span>₦{n(depositAmount)}</span></div>}</div>
        </div>)}
      </div>
      <div className="p-5 bg-white border-t border-neutral-100">
        {step < 3 ? (
          <button onClick={() => setStep(step + 1)} disabled={(step === 2 && (!date || !time))} className="w-full bg-brand-black text-white rounded-full py-4 font-semibold disabled:opacity-40">Continue • ₦{n(total)}</button>
        ) : peak && depositAmount > 0 ? (
          <PaystackButton amount={depositAmount} email={customer.email} name={customer.name} phone={customer.phone} orderId={'bk_' + Date.now()} label={`Pay deposit ₦${n(depositAmount)} & request`} disabled={!customer.name || !customer.phone} onSuccess={() => confirm(true)} />
        ) : (
          <button onClick={() => confirm(false)} className="w-full bg-brand-teal text-white rounded-full py-4 font-semibold">Request booking • ₦{n(total)}</button>
        )}
      </div>
    </div>
  );
}

/* =============== SHOP =============== */
function ShopScreen({ products, cart, setCart, setView }) {
  const [activeCat, setActiveCat] = useState('All');
  const categories = ['All', ...Array.from(new Set(products.map(p => p.category)))];
  const filtered = products.filter(p => activeCat === 'All' || p.category === activeCat);
  const add = (p) => { const e = cart.find(c => c.id === p.id); e ? setCart(cart.map(c => c.id === p.id ? { ...c, qty: c.qty + 1 } : c)) : setCart([...cart, { ...p, qty: 1 }]); };
  const qty = (id) => cart.find(c => c.id === id)?.qty || 0;
  const cartTotal = cart.reduce((s, c) => s + c.price * c.qty, 0);
  const cartCount = cart.reduce((s, c) => s + c.qty, 0);
  return (
    <div>
      <div className="sticky top-0 bg-white z-20 border-b border-neutral-100">
        <div className="px-5 pt-6 pb-3 flex items-center justify-between"><h1 className="font-display text-2xl font-bold">Shop</h1>{cartCount > 0 && <button onClick={() => setView('checkout-shop')} className="relative w-10 h-10 bg-brand-black rounded-full flex items-center justify-center text-white"><ShoppingBag className="w-5 h-5" /><span className="absolute -top-1 -right-1 w-5 h-5 bg-brand-teal rounded-full text-[10px] font-bold flex items-center justify-center">{cartCount}</span></button>}</div>
        <div className="flex gap-2 overflow-x-auto no-scrollbar px-5 pb-3">{categories.map(c => <button key={c} onClick={() => setActiveCat(c)} className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap border ${activeCat === c ? 'bg-brand-black text-white border-brand-black' : 'bg-white text-neutral-600 border-neutral-200'}`}>{c}</button>)}</div>
      </div>
      <div className="px-5 py-4 grid grid-cols-2 gap-3">{filtered.map(p => (
        <div key={p.id} className="bg-white border border-neutral-200 rounded-2xl overflow-hidden">
          <div className="aspect-square bg-brand-teal-soft flex items-center justify-center overflow-hidden">{p.image ? <img src={p.image} alt={p.name} className="w-full h-full object-cover" /> : <span className="text-5xl">{p.emoji}</span>}</div>
          <div className="p-3"><div className="text-[10px] text-neutral-500 uppercase tracking-wider mb-0.5">{p.category}</div><div className="text-xs font-semibold line-clamp-2 min-h-[32px]">{p.name}</div>
            <div className="flex items-center justify-between mt-2"><div className="font-bold text-sm">₦{n(p.price)}</div>
              {qty(p.id) > 0 ? <div className="flex items-center gap-1 bg-brand-teal-soft rounded-full"><button onClick={() => { const e = cart.find(c => c.id === p.id); e.qty === 1 ? setCart(cart.filter(c => c.id !== p.id)) : setCart(cart.map(c => c.id === p.id ? {...c, qty: c.qty - 1} : c)); }} className="w-7 h-7 flex items-center justify-center"><Minus className="w-3 h-3" /></button><span className="text-xs font-bold w-4 text-center">{qty(p.id)}</span><button onClick={() => add(p)} disabled={qty(p.id) >= p.stock} className="w-7 h-7 flex items-center justify-center disabled:opacity-40"><Plus className="w-3 h-3" /></button></div> : <button onClick={() => add(p)} disabled={p.stock === 0} className="w-8 h-8 bg-brand-black text-white rounded-full flex items-center justify-center disabled:opacity-30"><Plus className="w-4 h-4" /></button>}
            </div>
            {p.stock < 10 && p.stock > 0 && <div className="text-[10px] text-amber-600 mt-1">Only {p.stock} left</div>}{p.stock === 0 && <div className="text-[10px] text-red-500 mt-1">Sold out</div>}
          </div>
        </div>
      ))}</div>
      {cartCount > 0 && <div className="fixed bottom-16 left-0 right-0 z-30"><div className="max-w-md mx-auto px-4 pb-2"><button onClick={() => setView('checkout-shop')} className="w-full bg-brand-black text-white rounded-full py-4 px-6 flex items-center justify-between shadow-2xl"><div className="flex items-center gap-3"><div className="w-8 h-8 bg-brand-teal rounded-full flex items-center justify-center text-xs font-bold">{cartCount}</div><span className="font-semibold">View cart</span></div><div className="flex items-center gap-1"><span className="font-bold">₦{n(cartTotal)}</span><ChevronRight className="w-5 h-5" /></div></button></div></div>}
    </div>
  );
}

/* =============== CHECKOUT SHOP =============== */
function CheckoutShop({ cart, setCart, orders, saveOrders, products, saveProducts, setView, customerProfile, customerId }) {
  const [customer, setCustomer] = useState({ name: customerProfile?.name || '', phone: customerProfile?.phone || '', email: customerProfile?.email || '', address: '' });
  const [confirmed, setConfirmed] = useState(null);
  const [fulfill, setFulfill] = useState('pickup');
  const subtotal = cart.reduce((s, c) => s + c.price * c.qty, 0);
  const deliveryFee = fulfill === 'delivery' ? 1500 : 0;
  const total = subtotal + deliveryFee;
  const place = async (paid = false) => {
    if (!customer.name || !customer.phone) return alert('Please fill in your name and phone');
    if (fulfill === 'delivery' && !customer.address) return alert('Please enter a delivery address');
    const now = new Date().toISOString();
    const order = { id: 'ord_' + Date.now(), customerId: customerId || null, items: cart, subtotal, deliveryFee, total, customer, fulfill, stage: 'new', paid, history: [{ stage: 'new', at: now }], date: now };
    await saveOrders([...orders, order]);
    await saveProducts(products.map(p => { const ci = cart.find(c => c.id === p.id); return ci ? { ...p, stock: Math.max(0, p.stock - ci.qty) } : p; }));
    // Email admin notification
    sendAdminEmail(import.meta.env.VITE_EMAILJS_TEMPLATE_ORDER, {
      customer_name: customer.name,
      customer_phone: customer.phone,
      customer_email: customer.email || 'N/A',
      items: cart.map(c => `${c.qty}× ${c.name}`).join(', '),
      subtotal: `₦${(Number(subtotal)||0).toLocaleString('en-NG')}`,
      delivery_fee: `₦${(Number(deliveryFee)||0).toLocaleString('en-NG')}`,
      total: `₦${(Number(total)||0).toLocaleString('en-NG')}`,
      fulfill,
      address: customer.address || 'N/A',
      paid: paid ? 'Paid via Paystack' : 'Unpaid (cash/pickup)',
      order_id: order.id,
    });
    setConfirmed(order); setCart([]);
  };
  if (confirmed) return (
    <div className="min-h-screen flex flex-col"><div className="flex-1 px-6 pt-16 text-center"><div className="w-20 h-20 rounded-full bg-green-500 flex items-center justify-center mx-auto mb-6"><Check className="w-10 h-10 text-white" strokeWidth={3} /></div><h1 className="font-display text-3xl font-bold mb-2">Order received!</h1><p className="text-neutral-500 text-sm mb-8">We'll contact you on {confirmed.customer.phone} as we process it</p><div className="bg-neutral-50 rounded-2xl p-5 text-left"><div className="text-xs text-neutral-500">Order ID</div><div className="font-mono text-sm mb-3">{confirmed.id}</div><div className="flex justify-between text-sm"><span>Total</span><span className="font-bold">₦{n(confirmed.total)}</span></div></div></div><div className="p-5"><button onClick={() => { setConfirmed(null); setView('shop'); }} className="w-full bg-brand-black text-white rounded-full py-4 font-semibold">Back to shop</button></div></div>
  );
  if (cart.length === 0) return <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center"><ShoppingBag className="w-16 h-16 text-neutral-300 mb-4" /><div className="font-display text-xl font-bold mb-2">Your cart is empty</div><button onClick={() => setView('shop')} className="bg-brand-black text-white px-6 py-3 rounded-full font-semibold mt-4">Shop now</button></div>;
  return (
    <div className="min-h-screen flex flex-col">
      <div className="sticky top-0 bg-white z-20 border-b border-neutral-100 px-5 pt-6 pb-4 flex items-center justify-between"><button onClick={() => setView('shop')} className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center"><ArrowLeft className="w-5 h-5" /></button><h1 className="font-display text-lg font-bold">Checkout</h1><div className="w-10" /></div>
      <div className="flex-1 px-5 py-5">
        <h2 className="font-display text-lg font-bold mb-3">Your order</h2>
        <div className="space-y-2 mb-6">{cart.map(c => <div key={c.id} className="bg-white border border-neutral-200 rounded-2xl p-3 flex items-center gap-3"><div className="w-14 h-14 bg-brand-teal-soft rounded-xl flex items-center justify-center overflow-hidden">{c.image ? <img src={c.image} alt={c.name} className="w-full h-full object-cover" /> : <span className="text-2xl">{c.emoji}</span>}</div><div className="flex-1 min-w-0"><div className="text-xs font-semibold line-clamp-1">{c.name}</div><div className="text-xs text-neutral-500">Qty: {c.qty}</div></div><div className="font-bold text-sm">₦{n(c.price * c.qty)}</div></div>)}</div>
        <h2 className="font-display text-lg font-bold mb-3">Fulfillment</h2>
        <div className="grid grid-cols-2 gap-2 mb-6"><button onClick={() => setFulfill('pickup')} className={`p-4 rounded-2xl border text-left ${fulfill === 'pickup' ? 'border-brand-teal bg-brand-teal-soft' : 'border-neutral-200 bg-white'}`}><div className="text-sm font-semibold mb-0.5">Pickup</div><div className="text-xs text-neutral-500">At the salon</div></button><button onClick={() => setFulfill('delivery')} className={`p-4 rounded-2xl border text-left ${fulfill === 'delivery' ? 'border-brand-teal bg-brand-teal-soft' : 'border-neutral-200 bg-white'}`}><div className="text-sm font-semibold mb-0.5">Delivery</div><div className="text-xs text-neutral-500">+₦1,500</div></button></div>
        <h2 className="font-display text-lg font-bold mb-3">Your details</h2>
        <div className="space-y-3 mb-6"><input value={customer.name} onChange={e => setCustomer({...customer, name: e.target.value})} placeholder="Full name" className="w-full bg-neutral-50 border border-neutral-200 rounded-2xl px-4 py-3.5 text-sm" /><input value={customer.phone} onChange={e => setCustomer({...customer, phone: e.target.value})} placeholder="Phone" className="w-full bg-neutral-50 border border-neutral-200 rounded-2xl px-4 py-3.5 text-sm" />{fulfill === 'delivery' && <textarea value={customer.address} onChange={e => setCustomer({...customer, address: e.target.value})} placeholder="Delivery address" rows={2} className="w-full bg-neutral-50 border border-neutral-200 rounded-2xl px-4 py-3.5 text-sm resize-none" />}</div>
        <div className="bg-neutral-50 rounded-2xl p-4"><div className="flex justify-between text-sm mb-1"><span className="text-neutral-500">Subtotal</span><span>₦{n(subtotal)}</span></div><div className="flex justify-between text-sm mb-1"><span className="text-neutral-500">{fulfill === 'delivery' ? 'Delivery' : 'Pickup'}</span><span>₦{n(deliveryFee)}</span></div><div className="border-t border-neutral-200 pt-2 mt-2 flex justify-between font-bold"><span>Total</span><span>₦{n(total)}</span></div></div>
      </div>
      <div className="p-5 bg-white border-t border-neutral-100 space-y-2">
        <PaystackButton amount={total} email={customer.email} name={customer.name} phone={customer.phone} orderId={'ord_' + Date.now()} label={`Pay ₦${n(total)} securely`} onSuccess={() => place(true)} onClose={() => {}} />
        <button onClick={() => place(false)} className="w-full border-2 border-neutral-200 text-neutral-600 rounded-full py-3 text-sm font-semibold">Pay at pickup / cash on delivery</button>
      </div>
    </div>
  );
}

/* =============== MY BOOKINGS =============== */
function BookingsScreen({ bookings, saveBookings, setView, customerId }) {
  const [tab, setTab] = useState('upcoming');
  const now = new Date().toISOString().split('T')[0];
  // If signed in, show only their bookings; otherwise show all (guest flow)
  const myBookings = customerId ? bookings.filter(b => b.customerId === customerId || !b.customerId) : bookings;
  const upcoming = myBookings.filter(b => b.date >= now && b.status !== 'cancelled' && b.status !== 'completed');
  const past = myBookings.filter(b => b.date < now || b.status === 'cancelled' || b.status === 'completed');
  const list = tab === 'upcoming' ? upcoming : past;

  const cancelBooking = (b) => {
    let msg = `Cancel your ${b.services?.map(s => s.name).join(', ')} booking on ${b.date}?`;
    let fee = 0, refund = 0;
    if (b.depositPaid && b.cancellationFee > 0) {
      fee = b.cancellationFee; refund = b.depositAmount - fee;
      msg += `\n\nThis is a peak-day booking. ₦${n(fee)} of your ₦${n(b.depositAmount)} deposit (${b.cancellationFeePercent}%) is non-refundable. You'll be refunded ₦${n(refund)}.`;
    } else if (b.depositPaid) {
      refund = b.depositAmount;
      msg += `\n\nYour ₦${n(b.depositAmount)} deposit will be fully refunded.`;
    }
    if (!window.confirm(msg)) return;
    saveBookings(bookings.map(x => x.id === b.id ? { ...x, status: 'cancelled', cancelledBy: 'customer', cancelledAt: new Date().toISOString(), cancellationFeeCharged: fee, refundedAmount: refund } : x));
  };

  return (
    <div>
      <div className="px-5 pt-6 pb-3 bg-white"><h1 className="font-display text-2xl font-bold">My bookings</h1></div>
      <div className="flex gap-2 px-5 pb-4 bg-white border-b border-neutral-100">{['upcoming', 'past'].map(t => <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-full text-xs font-semibold capitalize ${tab === t ? 'bg-brand-black text-white' : 'bg-neutral-100 text-neutral-600'}`}>{t} ({t === 'upcoming' ? upcoming.length : past.length})</button>)}</div>
      <div className="px-5 py-4 space-y-3">
        {list.length === 0 && <div className="text-center py-16"><Calendar className="w-16 h-16 text-neutral-200 mx-auto mb-3" /><div className="font-semibold mb-1">No {tab} bookings</div><p className="text-sm text-neutral-500 mb-4">Book a service to get started</p><button onClick={() => setView('services')} className="bg-brand-black text-white px-6 py-3 rounded-full text-sm font-semibold">Browse services</button></div>}
        {list.map(b => { const canCancel = tab === 'upcoming' && (b.status === 'pending' || b.status === 'confirmed'); return (
          <div key={b.id} className="bg-white border border-neutral-200 rounded-2xl p-4">
            <div className="flex items-start justify-between mb-2"><div><div className="text-xs brand-teal font-semibold mb-1">{b.date} • {b.time}</div><div className="font-semibold text-sm">{b.services?.map(s => s.name).join(', ')}</div><div className="text-xs text-neutral-500 mt-0.5">With {b.staff?.name || 'any professional'}</div></div><div className={`text-[10px] font-bold px-2 py-1 rounded-full ${b.status === 'confirmed' ? 'bg-green-100 text-green-700' : b.status === 'completed' ? 'bg-blue-100 text-blue-700' : b.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{b.status?.toUpperCase()}</div></div>
            <div className="flex items-center justify-between pt-2 border-t border-neutral-100"><div className="text-sm font-bold">₦{n(b.total)}</div><div className="text-xs text-neutral-500">#{b.id.slice(-6)}</div></div>
            {b.status === 'cancelled' && b.refundedAmount != null && <div className="mt-2 text-[11px] text-neutral-500">{b.cancellationFeeCharged > 0 ? `Cancelled — ₦${n(b.cancellationFeeCharged)} fee kept, ₦${n(b.refundedAmount)} refunded.` : b.refundedAmount > 0 ? `Cancelled — ₦${n(b.refundedAmount)} refunded.` : 'Cancelled.'}</div>}
            {canCancel && <button onClick={() => cancelBooking(b)} className="w-full mt-3 py-2.5 bg-red-50 text-red-700 rounded-full text-xs font-semibold">Cancel booking</button>}
          </div>
        ); })}
      </div>
    </div>
  );
}

/* =============== PROFILE =============== */
function ProfileScreen({ setView, bookings, orders, customerUser, customerProfile, onOpenAuth, onSignOut }) {
  if (!customerUser) {
    return (
      <div>
        <div className="px-5 pt-6 pb-5 bg-white">
          <h1 className="font-display text-2xl font-bold mb-6">Profile</h1>
          <div className="text-center py-6">
            <div className="w-20 h-20 rounded-full bg-brand-teal-soft flex items-center justify-center mx-auto mb-4"><User className="w-10 h-10 brand-teal" /></div>
            <h2 className="font-display text-xl font-bold mb-2">Join Uchis Beauty</h2>
            <p className="text-sm text-neutral-500 mb-6 px-4">Sign up to track your bookings, manage your orders, and get exclusive offers.</p>
            <button onClick={() => onOpenAuth('signup')} className="w-full bg-brand-teal text-white rounded-full py-4 font-semibold mb-3">Create account</button>
            <button onClick={() => onOpenAuth('signin')} className="w-full bg-neutral-100 text-neutral-700 rounded-full py-4 font-semibold">Sign in</button>
          </div>
        </div>
        <div className="px-5 py-3">
          <button onClick={() => setView('staff-gate')} className="w-full bg-white border border-neutral-200 rounded-2xl p-4 flex items-center gap-3"><div className="w-9 h-9 rounded-full bg-neutral-100 flex items-center justify-center"><Lock className="w-4 h-4 text-neutral-600" /></div><span className="flex-1 text-sm font-medium text-left">Staff sign in</span><ChevronRight className="w-4 h-4 text-neutral-400" /></button>
        </div>
        <div className="text-center py-6 text-xs text-neutral-400">Uchis Beauty Salon</div>
      </div>
    );
  }

  const myBookings = bookings.filter(b => b.customerId === customerUser.id);
  const myOrders = orders.filter(o => o.customerId === customerUser.id);
  const initial = (customerProfile?.name || customerUser.email)?.[0]?.toUpperCase() || 'U';

  return (
    <div>
      <div className="px-5 pt-6 pb-5 bg-white">
        <h1 className="font-display text-2xl font-bold mb-4">My profile</h1>
        <div className="flex items-center gap-4 mb-5">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white text-2xl font-bold">{initial}</div>
          <div><div className="font-semibold">{customerProfile?.name || 'Customer'}</div><div className="text-xs text-neutral-500">{customerUser.email}</div>{customerProfile?.phone && <div className="text-xs text-neutral-500 mt-0.5">{customerProfile.phone}</div>}</div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-brand-teal-soft rounded-2xl p-4 text-center"><div className="font-display text-2xl font-bold brand-teal">{myBookings.length}</div><div className="text-xs text-neutral-500 mt-0.5">Bookings</div></div>
          <div className="bg-neutral-50 rounded-2xl p-4 text-center"><div className="font-display text-2xl font-bold">{myOrders.length}</div><div className="text-xs text-neutral-500 mt-0.5">Orders</div></div>
        </div>
      </div>
      <div className="px-5 py-3">
        <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden">
          {[{ icon: Calendar, label: 'My bookings', sub: `${myBookings.length} total`, onClick: () => setView('bookings') }, { icon: ShoppingBag, label: 'My orders', sub: `${myOrders.length} total`, onClick: () => setView('orders') }, { icon: MessageCircle, label: 'Chat with us', sub: 'Live support', onClick: () => setView('chat') }].map((it, i) => {
            const Icon = it.icon;
            return <button key={i} onClick={it.onClick} className="w-full flex items-center gap-3 p-4 border-b last:border-b-0 border-neutral-100 text-left"><div className="w-9 h-9 rounded-full bg-brand-teal-soft flex items-center justify-center"><Icon className="w-4 h-4 brand-teal" /></div><div className="flex-1"><div className="text-sm font-medium">{it.label}</div><div className="text-xs text-neutral-400">{it.sub}</div></div><ChevronRight className="w-4 h-4 text-neutral-400" /></button>;
          })}
        </div>
      </div>
      <div className="px-5 py-3 space-y-2">
        <button onClick={onSignOut} className="w-full bg-white border border-neutral-200 rounded-2xl p-4 flex items-center gap-3"><div className="w-9 h-9 rounded-full bg-red-50 flex items-center justify-center"><LogOut className="w-4 h-4 text-red-500" /></div><span className="flex-1 text-sm font-medium text-left text-red-600">Sign out</span></button>
        <button onClick={() => setView('staff-gate')} className="w-full bg-white border border-neutral-200 rounded-2xl p-4 flex items-center gap-3"><div className="w-9 h-9 rounded-full bg-neutral-100 flex items-center justify-center"><Lock className="w-4 h-4 text-neutral-600" /></div><span className="flex-1 text-sm font-medium text-left">Staff sign in</span><ChevronRight className="w-4 h-4 text-neutral-400" /></button>
      </div>
      <div className="text-center py-6 text-xs text-neutral-400">Uchis Beauty Salon</div>
    </div>
  );
}

/* =============== CUSTOMER SERVICE CHAT =============== */
function ChatScreen({ messages, saveMessages, setView }) {
  const [text, setText] = useState('');
  const endRef = React.useRef(null);
  React.useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages.length]);
  React.useEffect(() => {
    // mark support messages as read on open
    if (messages.some(m => m.from === 'support' && !m.read)) {
      saveMessages(messages.map(m => m.from === 'support' ? { ...m, read: true } : m));
    }
  // eslint-disable-next-line
  }, []);

  const send = () => {
    const t = text.trim(); if (!t) return;
    const mine = { id: 'm' + Date.now(), from: 'customer', text: t, at: new Date().toISOString(), read: true };
    const updated = [...messages, mine];
    saveMessages(updated);
    setText('');
    // auto-acknowledgement from support (demo). In production this is a real agent.
    setTimeout(() => {
      saveMessages([...updated, { id: 'm' + (Date.now() + 1), from: 'support', text: "Thanks for your message! Our team will reply shortly. For urgent help you can also call us on the salon line.", at: new Date().toISOString(), read: false }]);
    }, 900);
  };

  return (
    <div className="min-h-screen flex flex-col bg-neutral-50">
      <div className="sticky top-0 bg-white z-20 border-b border-neutral-100 px-5 pt-6 pb-3 flex items-center gap-3">
        <button onClick={() => setView('home')} className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center"><ArrowLeft className="w-5 h-5" /></button>
        <div className="flex items-center gap-3 flex-1">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white"><MessageCircle className="w-5 h-5" /></div>
          <div><div className="font-display font-bold leading-tight">Uchis Support</div><div className="text-[11px] text-green-600 flex items-center gap-1"><span className="w-1.5 h-1.5 bg-green-500 rounded-full inline-block" /> Typically replies within an hour</div></div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 pb-28">
        <div className="text-center text-[11px] text-neutral-400 mb-2">This is the start of your conversation with Uchis Beauty Salon</div>
        {messages.map(m => {
          const mine = m.from === 'customer';
          return (
            <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[78%] rounded-2xl px-4 py-2.5 ${mine ? 'bg-brand-teal text-white rounded-br-md' : 'bg-white border border-neutral-200 rounded-bl-md'}`}>
                <div className="text-sm whitespace-pre-wrap">{m.text}</div>
                <div className={`text-[10px] mt-1 ${mine ? 'text-white/70' : 'text-neutral-400'}`}>{new Date(m.at).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })}</div>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-20"><div className="max-w-md mx-auto bg-white border-t border-neutral-100 px-3 py-3 flex items-center gap-2">
        <input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} placeholder="Type a message..." className="flex-1 bg-neutral-100 rounded-full px-4 py-3 text-sm" />
        <button onClick={send} disabled={!text.trim()} className="w-11 h-11 bg-brand-teal text-white rounded-full flex items-center justify-center disabled:opacity-40 shrink-0"><Send className="w-5 h-5" /></button>
      </div></div>
    </div>
  );
}


/* =============== SUPPORT INBOX (owner/manager) =============== */
function SupportInbox({ messages, saveMessages }) {
  const [text, setText] = useState('');
  const endRef = React.useRef(null);
  React.useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages.length]);
  const reply = () => {
    const t = text.trim(); if (!t) return;
    saveMessages([...messages, { id: 'm' + Date.now(), from: 'support', text: t, at: new Date().toISOString(), read: false }]);
    setText('');
  };
  return (
    <div>
      <div className="mb-4"><h2 className="font-display text-2xl font-bold">Customer messages</h2><p className="text-sm text-neutral-500">Reply to customers chatting from the app</p></div>
      <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden flex flex-col" style={{ height: '60vh', maxHeight: 560 }}>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 && <div className="text-center text-sm text-neutral-500 py-10">No messages yet.</div>}
          {messages.map(m => { const support = m.from === 'support'; return (
            <div key={m.id} className={`flex ${support ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[78%] rounded-2xl px-4 py-2.5 ${support ? 'bg-brand-teal text-white rounded-br-md' : 'bg-neutral-100 rounded-bl-md'}`}>
                <div className="text-[10px] font-semibold mb-0.5 opacity-70">{support ? 'You (support)' : 'Customer'}</div>
                <div className="text-sm whitespace-pre-wrap">{m.text}</div>
                <div className={`text-[10px] mt-1 ${support ? 'text-white/70' : 'text-neutral-400'}`}>{new Date(m.at).toLocaleString('en-NG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
              </div>
            </div>
          ); })}
          <div ref={endRef} />
        </div>
        <div className="border-t border-neutral-100 p-3 flex items-center gap-2">
          <input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === 'Enter' && reply()} placeholder="Type a reply..." className="flex-1 bg-neutral-100 rounded-full px-4 py-3 text-sm" />
          <button onClick={reply} disabled={!text.trim()} className="w-11 h-11 bg-brand-teal text-white rounded-full flex items-center justify-center disabled:opacity-40 shrink-0"><Send className="w-5 h-5" /></button>
        </div>
      </div>
    </div>
  );
}

function OwnerPortal({ services, products, bookings, orders, staff, settings, priceLog, announcements, messages, save, exit, onSignOut }) {
  const [tab, setTab] = useState('overview');
  const newOrders = orders.filter(o => o.stage === 'new').length;
  const pendingBookings = bookings.filter(b => b.status === 'pending').length;
  const unreadMsgs = (messages || []).some(m => m.from === 'customer');
  const tabs = [
    { k: 'overview', l: 'Overview', icon: HomeIcon },
    { k: 'orders', l: `Orders${newOrders ? ` (${newOrders})` : ''}`, icon: ClipboardList, badge: newOrders > 0 },
    { k: 'approvals', l: `Bookings${pendingBookings ? ` (${pendingBookings})` : ''}`, icon: Calendar, badge: pendingBookings > 0 },
    { k: 'messages', l: 'Messages', icon: MessageCircle, badge: unreadMsgs },
    { k: 'announce', l: 'Announcements', icon: Bell },
    { k: 'products', l: 'Products', icon: Package },
    { k: 'prices', l: 'Prices', icon: DollarSign },
    { k: 'services', l: 'Services', icon: Scissors },
    { k: 'staff', l: 'Staff', icon: UsersIcon },
    { k: 'finance', l: 'Finance', icon: PieChart },
    { k: 'settings', l: 'Settings', icon: SettingsIcon },
  ];
  return (
    <div className="min-h-screen md:flex">
      <div className="hidden md:flex md:flex-col md:w-60 bg-brand-black text-white p-4 shrink-0 min-h-screen">
        <div className="px-2 mb-1"><div className="font-display italic text-2xl">Uchis</div><div className="text-[10px] tracking-widest uppercase" style={{ color: '#2DD4BF' }}>Owner</div></div>
        <div className="flex flex-col gap-1 mt-6">{tabs.map(t => { const Icon = t.icon; return <button key={t.k} onClick={() => setTab(t.k)} className={`px-3 py-2.5 rounded-xl text-sm flex items-center gap-3 ${tab === t.k ? 'bg-brand-teal text-white' : 'text-white/65 hover:text-white'}`}><Icon className="w-4 h-4" />{t.l}{t.badge && <span className="ml-auto w-2 h-2 bg-red-500 rounded-full" />}</button>; })}</div>
        <div className="mt-auto flex flex-col gap-1">
          <button onClick={exit} className="px-3 py-2.5 rounded-xl text-sm flex items-center gap-3 text-white/65 hover:text-white"><ArrowLeft className="w-4 h-4" /> Customer view</button>
          <button onClick={onSignOut} className="px-3 py-2.5 rounded-xl text-sm flex items-center gap-3 text-white/65 hover:text-white"><LogOut className="w-4 h-4" /> Sign out</button>
        </div>
      </div>
      <div className="flex-1 min-w-0 max-w-md mx-auto md:max-w-none w-full">
        <div className="md:hidden bg-brand-black text-white px-5 pt-6 pb-5">
          <div className="flex items-center justify-between mb-4"><div><div className="text-xs uppercase tracking-widest" style={{ color: '#2DD4BF' }}>Owner</div><h1 className="font-display text-2xl font-bold">Dashboard</h1></div><button onClick={exit} className="px-4 py-2 rounded-full bg-white/10 flex items-center gap-2 text-sm"><ArrowLeft className="w-4 h-4" /> Exit</button></div>
          <div className="grid grid-cols-3 gap-2"><div className="bg-white/10 rounded-2xl p-3"><div className="text-[10px] text-white/60">New orders</div><div className="font-bold text-lg">{newOrders}</div></div><div className="bg-white/10 rounded-2xl p-3"><div className="text-[10px] text-white/60">Bookings</div><div className="font-bold text-lg">{pendingBookings}</div></div><div className="bg-brand-teal rounded-2xl p-3"><div className="text-[10px] text-white/90">Staff</div><div className="font-bold text-lg">{staff.filter(s=>s.specialty!=='Any').length}</div></div></div>
        </div>
        <div className="md:hidden sticky top-0 bg-white z-10 border-b border-neutral-100 flex gap-1 px-3 overflow-x-auto no-scrollbar">{tabs.map(t => <button key={t.k} onClick={() => setTab(t.k)} className={`px-3 py-3 text-xs font-semibold whitespace-nowrap border-b-2 ${tab === t.k ? 'border-brand-teal brand-teal' : 'border-transparent text-neutral-500'}`}>{t.l}{t.badge && <span className="ml-1 w-2 h-2 bg-red-500 rounded-full inline-block" />}</button>)}</div>
        <div className="px-5 py-5 md:px-8 md:py-8 md:max-w-5xl">
          {tab === 'overview' && <OwnerOverview orders={orders} bookings={bookings} products={products} services={services} staff={staff} setTab={setTab} />}
          {tab === 'orders' && <MgrOrders orders={orders} saveOrders={save.orders} products={products} saveProducts={save.products} />}
          {tab === 'approvals' && <MgrApprovals bookings={bookings} saveBookings={save.bookings} />}
          {tab === 'messages' && <SupportInbox messages={messages} saveMessages={save.messages} />}
          {tab === 'announce' && <OwnerAnnouncements announcements={announcements} saveAnnouncements={save.announcements} />}
          {tab === 'products' && <MgrProducts products={products} saveProducts={save.products} priceLog={priceLog} savePriceLog={save.priceLog} />}
          {tab === 'prices' && <MgrPrices products={products} saveProducts={save.products} services={services} saveServices={save.services} priceLog={priceLog} savePriceLog={save.priceLog} />}
          {tab === 'services' && <MgrServices services={services} saveServices={save.services} />}
          {tab === 'staff' && <MgrStaff staff={staff} saveStaff={save.staff} bookings={bookings} />}
          {tab === 'finance' && <OwnerFinance orders={orders} bookings={bookings} />}
          {tab === 'settings' && <AdminSettings settings={settings} saveSettings={save.settings} />}
        </div>
      </div>
    </div>
  );
}

function OwnerOverview({ orders, bookings, products, services, staff, setTab }) {
  const today = new Date().toISOString().split('T')[0];
  const newOrders = orders.filter(o => o.stage === 'new');
  const inProgress = orders.filter(o => ['confirmed','processing','ready'].includes(o.stage));
  const lowStock = products.filter(p => p.stock < 10);
  const todayBookings = bookings.filter(b => b.date === today && b.status !== 'cancelled');
  const orderRev = orders.filter(o => o.stage === 'completed').reduce((s,o) => s + o.total, 0);
  const bookingRev = bookings.filter(b => b.status === 'completed').reduce((s,b) => s + b.total, 0);
  return (
    <div className="space-y-6">
      <div><h2 className="font-display text-2xl font-bold">Welcome back, Uchenna</h2><p className="text-sm text-neutral-500">Your full overview of the business</p></div>
      <div className="bg-gradient-to-br from-teal-600 to-teal-800 rounded-2xl p-6 text-white"><div className="text-xs text-white/70 uppercase tracking-widest mb-1">Total revenue (completed)</div><div className="font-display text-4xl font-bold">₦{n(orderRev + bookingRev)}</div><div className="text-xs text-white/70 mt-2">Orders ₦{n(orderRev)} + Services ₦{n(bookingRev)}</div></div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[{ l: 'New orders', v: newOrders.length, i: ClipboardList, c: 'bg-amber-50 text-amber-600', act: () => setTab('orders') },
          { l: 'In progress', v: inProgress.length, i: Truck, c: 'bg-indigo-50 text-indigo-600', act: () => setTab('orders') },
          { l: 'Pending bookings', v: bookings.filter(b=>b.status==='pending').length, i: Calendar, c: 'bg-sky-50 text-sky-600', act: () => setTab('approvals') },
          { l: 'Low stock', v: lowStock.length, i: TrendingUp, c: 'bg-red-50 text-red-600', act: () => setTab('products') }].map((s, i) => { const Icon = s.i; return (
          <button key={i} onClick={s.act} className="bg-white rounded-2xl p-4 border border-neutral-200 text-left hover-lift"><div className={`w-8 h-8 rounded-full ${s.c} flex items-center justify-center mb-3`}><Icon className="w-4 h-4" /></div><div className="text-2xl font-bold">{s.v}</div><div className="text-xs text-neutral-500">{s.l}</div></button>
        ); })}
      </div>
      <div className="grid md:grid-cols-2 gap-5">
        <div><h3 className="font-display text-lg font-bold mb-3">Today's appointments</h3><div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
          {todayBookings.length === 0 && <div className="p-6 text-center text-sm text-neutral-500">No appointments today.</div>}
          {todayBookings.map(b => <div key={b.id} className="p-4 border-b last:border-0 border-neutral-100 flex items-center gap-3"><div className="text-xs font-bold brand-teal w-12">{b.time}</div><div className="flex-1"><div className="font-semibold text-sm">{b.customer.name}</div><div className="text-xs text-neutral-500">{b.services?.map(s=>s.name).join(', ')}</div></div></div>)}
        </div></div>
        <div><h3 className="font-display text-lg font-bold mb-3">Quick actions</h3><div className="grid grid-cols-2 gap-2">
          {[{ l: 'Post announcement', i: Bell, t: 'announce' }, { l: 'Change prices', i: DollarSign, t: 'prices' }, { l: 'Manage staff', i: UsersIcon, t: 'staff' }, { l: 'View finances', i: PieChart, t: 'finance' }].map((q, i) => { const Icon = q.i; return <button key={i} onClick={() => setTab(q.t)} className="bg-white rounded-2xl p-4 border border-neutral-200 text-left hover-lift"><Icon className="w-5 h-5 brand-teal mb-2" /><div className="text-xs font-semibold">{q.l}</div></button>; })}
        </div></div>
      </div>
    </div>
  );
}

/* ---- ANNOUNCEMENTS (owner) ---- */
function OwnerAnnouncements({ announcements, saveAnnouncements }) {
  const [editing, setEditing] = useState(null);
  const addNew = () => setEditing({ id: 'a' + Date.now(), title: '', body: '', audience: 'customer', active: true, isNew: true, createdAt: new Date().toISOString() });
  const doSave = () => { if (!editing.title) return alert('Give your announcement a title'); const { isNew, ...a } = editing; saveAnnouncements(isNew ? [...announcements, a] : announcements.map(x => x.id === a.id ? a : x)); setEditing(null); };
  const toggle = (id) => saveAnnouncements(announcements.map(a => a.id === id ? { ...a, active: !a.active } : a));
  const del = (id) => confirm('Delete this announcement?') && saveAnnouncements(announcements.filter(a => a.id !== id));
  const audienceLabel = { customer: 'Customers', staff: 'Staff', both: 'Everyone' };
  return (
    <div>
      <div className="flex items-center justify-between mb-1"><h2 className="font-display text-2xl font-bold">Announcements</h2><button onClick={addNew} className="bg-brand-black text-white rounded-full px-4 py-2.5 text-sm font-semibold flex items-center gap-2"><Plus className="w-4 h-4" /> New</button></div>
      <p className="text-sm text-neutral-500 mb-4">Post a banner to customers, staff, or both</p>

      {/* live preview */}
      {announcements.filter(a => a.active && (a.audience === 'customer' || a.audience === 'both')).slice(0,1).map(a => (
        <div key={a.id} className="mb-5"><div className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-2">Customer preview</div>
          <div className="relative rounded-2xl bg-gradient-to-r from-teal-600 to-teal-700 text-white p-4 overflow-hidden"><div className="absolute inset-0 opacity-20" style={{ background: 'radial-gradient(circle at 90% 10%, #FFFFFF 0%, transparent 45%)' }} /><div className="relative flex items-start gap-2"><Bell className="w-4 h-4 mt-0.5 shrink-0" /><div><div className="font-semibold text-sm">{a.title}</div>{a.body && <div className="text-xs text-white/85 mt-0.5">{a.body}</div>}</div></div></div>
        </div>
      ))}

      <div className="space-y-2 md:grid md:grid-cols-2 md:gap-2 md:space-y-0">
        {announcements.length === 0 && <div className="bg-white rounded-2xl border border-neutral-200 p-6 text-center text-sm text-neutral-500 md:col-span-2">No announcements yet. Post your first to greet customers.</div>}
        {[...announcements].reverse().map(a => (
          <div key={a.id} className={`bg-white rounded-2xl p-4 border ${a.active ? 'border-brand-teal' : 'border-neutral-200'}`}>
            <div className="flex items-start justify-between gap-2 mb-2"><div className="flex-1 min-w-0"><div className="font-semibold text-sm">{a.title}</div>{a.body && <div className="text-xs text-neutral-500 mt-0.5">{a.body}</div>}</div>
              <span className={`text-[9px] font-bold px-2 py-1 rounded-full shrink-0 ${a.active ? 'bg-green-100 text-green-700' : 'bg-neutral-100 text-neutral-500'}`}>{a.active ? 'LIVE' : 'OFF'}</span></div>
            <div className="flex items-center gap-2 mb-3"><span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-brand-teal-soft brand-teal">{audienceLabel[a.audience]}</span><span className="text-[10px] text-neutral-400">{new Date(a.createdAt).toLocaleDateString('en-NG', { day:'numeric', month:'short' })}</span></div>
            <div className="flex gap-2"><button onClick={() => toggle(a.id)} className={`flex-1 py-2 rounded-full text-xs font-semibold ${a.active ? 'bg-neutral-100 text-neutral-600' : 'bg-green-50 text-green-700'}`}>{a.active ? 'Turn off' : 'Make live'}</button><button onClick={() => setEditing(a)} className="px-3 py-2 bg-neutral-100 rounded-full text-xs font-semibold"><Edit3 className="w-3 h-3" /></button><button onClick={() => del(a.id)} className="px-3 py-2 bg-red-50 text-red-600 rounded-full text-xs font-semibold"><Trash2 className="w-3 h-3" /></button></div>
          </div>
        ))}
      </div>

      {editing && (
        <Modal onClose={() => setEditing(null)}>
          <h3 className="font-display text-xl font-bold mb-4">{editing.isNew ? 'New' : 'Edit'} announcement</h3>
          <div className="space-y-3">
            <div><label className="text-xs font-semibold text-neutral-600 mb-1.5 block">Title</label><input value={editing.title} onChange={e => setEditing({...editing, title: e.target.value})} placeholder="e.g. Closed for the public holiday" className="w-full bg-neutral-50 border border-neutral-200 rounded-2xl px-4 py-3 text-sm" /></div>
            <div><label className="text-xs font-semibold text-neutral-600 mb-1.5 block">Message (optional)</label><textarea value={editing.body} onChange={e => setEditing({...editing, body: e.target.value})} rows={2} placeholder="Add more detail..." className="w-full bg-neutral-50 border border-neutral-200 rounded-2xl px-4 py-3 text-sm resize-none" /></div>
            <div><label className="text-xs font-semibold text-neutral-600 mb-1.5 block">Show to</label><div className="grid grid-cols-3 gap-2">{[{ k: 'customer', l: 'Customers' }, { k: 'staff', l: 'Staff' }, { k: 'both', l: 'Everyone' }].map(o => <button key={o.k} onClick={() => setEditing({...editing, audience: o.k})} className={`py-2.5 rounded-xl text-xs font-semibold ${editing.audience === o.k ? 'bg-brand-teal text-white' : 'bg-neutral-100 text-neutral-600'}`}>{o.l}</button>)}</div></div>
            <label className="flex items-center gap-2 text-sm pt-1"><input type="checkbox" checked={editing.active} onChange={e => setEditing({...editing, active: e.target.checked})} /> Make this live immediately</label>
          </div>
          <button onClick={doSave} className="w-full mt-5 bg-brand-teal text-white rounded-full py-3 font-semibold">Save announcement</button>
        </Modal>
      )}
    </div>
  );
}

/* ---- FINANCE (owner, full read+context) ---- */
function OwnerFinance({ orders, bookings }) {
  const orderRev = orders.filter(o => o.stage === 'completed').reduce((s,o) => s + o.total, 0);
  const productCost = orders.filter(o => o.stage === 'completed').reduce((s,o) => s + o.items.reduce((c,it) => c + (it.cost||0)*it.qty, 0), 0);
  const bookingRev = bookings.filter(b => b.status === 'completed').reduce((s,b) => s + b.total, 0);
  const outstanding = orders.filter(o => o.stage !== 'cancelled' && !o.paid).reduce((s,o) => s + o.total, 0);
  const depositsHeld = bookings.filter(b => b.status === 'confirmed' && b.depositPaid).reduce((s,b) => s + (b.depositAmount||0), 0);
  const grossProfit = orderRev - productCost + bookingRev;
  const total = orderRev + bookingRev;
  return (
    <div className="space-y-5 md:max-w-3xl">
      <div><h2 className="font-display text-2xl font-bold">Finance</h2><p className="text-sm text-neutral-500">Full financial picture — owner view</p></div>
      <div className="bg-gradient-to-br from-teal-600 to-teal-800 rounded-2xl p-6 text-white"><div className="text-xs text-white/70 uppercase tracking-widest mb-1">Gross profit</div><div className="font-display text-4xl font-bold">₦{n(grossProfit)}</div><div className="text-xs text-white/70 mt-2">Revenue ₦{n(total)} − product cost ₦{n(productCost)}</div></div>
      <div className="grid grid-cols-2 gap-3">
        {[{ l: 'Order revenue', v: orderRev, c: 'text-green-600' }, { l: 'Service revenue', v: bookingRev, c: 'brand-teal' }, { l: 'Outstanding (unpaid)', v: outstanding, c: 'text-amber-600' }, { l: 'Deposits held', v: depositsHeld, c: 'text-sky-600' }].map((x,i) => <div key={i} className="bg-white rounded-2xl p-4 border border-neutral-200"><div className={`text-xl font-bold ${x.c}`}>₦{n(x.v)}</div><div className="text-xs text-neutral-500 mt-1">{x.l}</div></div>)}
      </div>
      <div className="bg-white rounded-2xl border border-neutral-200 p-5"><h3 className="font-display text-lg font-bold mb-3">Revenue split</h3>
        {[{ l: 'Orders', v: orderRev, c: '#0D9488' }, { l: 'Services', v: bookingRev, c: '#2DD4BF' }].map((x,i) => { const pct = total ? Math.round(x.v/total*100) : 0; return <div key={i} className="mb-3 last:mb-0"><div className="flex justify-between text-sm mb-1"><span>{x.l}</span><span className="font-semibold">₦{n(x.v)} ({pct}%)</span></div><div className="h-2 bg-neutral-100 rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: `${pct}%`, background: x.c }} /></div></div>; })}
      </div>
      <div className="bg-brand-teal-soft rounded-2xl p-4 text-xs text-neutral-600 flex items-start gap-2"><PieChart className="w-4 h-4 mt-0.5 shrink-0 brand-teal" /><div>This is your owner summary. The Accountant role has a dedicated portal with CSV export and reconciliation tools.</div></div>
    </div>
  );
}

/* =============== MANAGER PORTAL (operations only) =============== */
function ManagerPortal({ services, products, bookings, orders, staff, priceLog, announcements, messages, save, exit, onSignOut }) {
  const [tab, setTab] = useState('overview');
  const newOrders = orders.filter(o => o.stage === 'new').length;
  const pendingBookings = bookings.filter(b => b.status === 'pending').length;
  const staffNotices = (announcements || []).filter(a => a.active && (a.audience === 'staff' || a.audience === 'both'));
  const unreadMsgs = (messages || []).some(m => m.from === 'customer');
  const tabs = [
    { k: 'overview', l: 'Overview', icon: HomeIcon },
    { k: 'orders', l: `Orders${newOrders ? ` (${newOrders})` : ''}`, icon: ClipboardList, badge: newOrders > 0 },
    { k: 'approvals', l: `Bookings${pendingBookings ? ` (${pendingBookings})` : ''}`, icon: Calendar, badge: pendingBookings > 0 },
    { k: 'messages', l: 'Messages', icon: MessageCircle, badge: unreadMsgs },
    { k: 'announce', l: 'Announcements', icon: Bell },
    { k: 'products', l: 'Products', icon: Package },
    { k: 'prices', l: 'Prices', icon: DollarSign },
    { k: 'services', l: 'Services', icon: Scissors },
    { k: 'staff', l: 'Staff', icon: UsersIcon },
    { k: 'finance', l: 'Finance', icon: PieChart },
  ];
  return (
    <div className="min-h-screen md:flex">
      <div className="hidden md:flex md:flex-col md:w-60 bg-brand-black text-white p-4 shrink-0 min-h-screen">
        <div className="px-2 mb-1"><div className="font-display italic text-2xl">Uchis</div><div className="text-[10px] tracking-widest uppercase" style={{ color: '#2DD4BF' }}>Manager</div></div>
        <div className="flex flex-col gap-1 mt-6">{tabs.map(t => { const Icon = t.icon; return <button key={t.k} onClick={() => setTab(t.k)} className={`px-3 py-2.5 rounded-xl text-sm flex items-center gap-3 ${tab === t.k ? 'bg-brand-teal text-white' : 'text-white/65 hover:text-white'}`}><Icon className="w-4 h-4" />{t.l}{t.badge && <span className="ml-auto w-2 h-2 bg-red-500 rounded-full" />}</button>; })}</div>
        <div className="mt-auto flex flex-col gap-1">
          <button onClick={exit} className="px-3 py-2.5 rounded-xl text-sm flex items-center gap-3 text-white/65 hover:text-white"><ArrowLeft className="w-4 h-4" /> Customer view</button>
          <button onClick={onSignOut} className="px-3 py-2.5 rounded-xl text-sm flex items-center gap-3 text-white/65 hover:text-white"><LogOut className="w-4 h-4" /> Sign out</button>
        </div>
      </div>
      <div className="flex-1 min-w-0 max-w-md mx-auto md:max-w-none w-full">
        <div className="md:hidden bg-brand-black text-white px-5 pt-6 pb-5">
          <div className="flex items-center justify-between mb-4"><div><div className="text-xs text-white/60 uppercase tracking-widest">Manager</div><h1 className="font-display text-2xl font-bold">Dashboard</h1></div><button onClick={exit} className="px-4 py-2 rounded-full bg-white/10 flex items-center gap-2 text-sm"><ArrowLeft className="w-4 h-4" /> Exit</button></div>
          <div className="grid grid-cols-3 gap-2"><div className="bg-white/10 rounded-2xl p-3"><div className="text-[10px] text-white/60">New orders</div><div className="font-bold text-lg">{newOrders}</div></div><div className="bg-white/10 rounded-2xl p-3"><div className="text-[10px] text-white/60">Bookings</div><div className="font-bold text-lg">{pendingBookings}</div></div><div className="bg-brand-teal rounded-2xl p-3"><div className="text-[10px] text-white/90">Products</div><div className="font-bold text-lg">{products.length}</div></div></div>
        </div>
        <div className="md:hidden sticky top-0 bg-white z-10 border-b border-neutral-100 flex gap-1 px-3 overflow-x-auto no-scrollbar">{tabs.map(t => <button key={t.k} onClick={() => setTab(t.k)} className={`px-3 py-3 text-xs font-semibold whitespace-nowrap border-b-2 ${tab === t.k ? 'border-brand-teal brand-teal' : 'border-transparent text-neutral-500'}`}>{t.l}{t.badge && <span className="ml-1 w-2 h-2 bg-red-500 rounded-full inline-block" />}</button>)}</div>
        <div className="px-5 py-5 md:px-8 md:py-8 md:max-w-5xl">
          {/* staff-facing announcements notice */}
          {staffNotices.length > 0 && (
            <div className="mb-5 space-y-2">{staffNotices.map(a => <div key={a.id} className="rounded-2xl bg-amber-50 border border-amber-200 p-4 flex items-start gap-2"><Bell className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" /><div><div className="font-semibold text-sm text-amber-900">{a.title}</div>{a.body && <div className="text-xs text-amber-800 mt-0.5">{a.body}</div>}</div></div>)}</div>
          )}
          {tab === 'overview' && <MgrOpsOverview orders={orders} bookings={bookings} products={products} setTab={setTab} />}
          {tab === 'orders' && <MgrOrders orders={orders} saveOrders={save.orders} products={products} saveProducts={save.products} />}
          {tab === 'approvals' && <MgrApprovals bookings={bookings} saveBookings={save.bookings} />}
          {tab === 'messages' && <SupportInbox messages={messages} saveMessages={save.messages} />}
          {tab === 'announce' && <OwnerAnnouncements announcements={announcements} saveAnnouncements={save.announcements} />}
          {tab === 'products' && <MgrProducts products={products} saveProducts={save.products} priceLog={priceLog} savePriceLog={save.priceLog} />}
          {tab === 'prices' && <MgrPrices products={products} saveProducts={save.products} services={services} saveServices={save.services} priceLog={priceLog} savePriceLog={save.priceLog} />}
          {tab === 'services' && <MgrServices services={services} saveServices={save.services} />}
          {tab === 'staff' && <MgrStaff staff={staff} saveStaff={save.staff} bookings={bookings} />}
          {tab === 'finance' && <OwnerFinance orders={orders} bookings={bookings} />}
        </div>
      </div>
    </div>
  );
}

function MgrOpsOverview({ orders, bookings, products, setTab }) {
  const today = new Date().toISOString().split('T')[0];
  const newOrders = orders.filter(o => o.stage === 'new');
  const inProgress = orders.filter(o => ['confirmed','processing','ready'].includes(o.stage));
  const lowStock = products.filter(p => p.stock < 10);
  const todayBookings = bookings.filter(b => b.date === today && b.status !== 'cancelled');
  return (
    <div className="space-y-6">
      <div><h2 className="font-display text-2xl font-bold">Operations</h2><p className="text-sm text-neutral-500">Orders, bookings and stock to handle today</p></div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[{ l: 'New orders', v: newOrders.length, i: ClipboardList, c: 'bg-amber-50 text-amber-600', act: () => setTab('orders') },
          { l: 'In progress', v: inProgress.length, i: Truck, c: 'bg-indigo-50 text-indigo-600', act: () => setTab('orders') },
          { l: 'Pending bookings', v: bookings.filter(b=>b.status==='pending').length, i: Calendar, c: 'bg-sky-50 text-sky-600', act: () => setTab('approvals') },
          { l: 'Low stock', v: lowStock.length, i: TrendingUp, c: 'bg-red-50 text-red-600', act: () => setTab('products') }].map((s, i) => { const Icon = s.i; return (
          <button key={i} onClick={s.act} className="bg-white rounded-2xl p-4 border border-neutral-200 text-left hover-lift"><div className={`w-8 h-8 rounded-full ${s.c} flex items-center justify-center mb-3`}><Icon className="w-4 h-4" /></div><div className="text-2xl font-bold">{s.v}</div><div className="text-xs text-neutral-500">{s.l}</div></button>
        ); })}
      </div>
      <div className="grid md:grid-cols-2 gap-5">
        <div><h3 className="font-display text-lg font-bold mb-3">Orders to process</h3><div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
          {newOrders.length === 0 && <div className="p-6 text-center text-sm text-neutral-500">No new orders 🎉</div>}
          {newOrders.slice(0,5).map(o => <button key={o.id} onClick={() => setTab('orders')} className="w-full p-4 border-b last:border-0 border-neutral-100 flex items-center justify-between text-left"><div><div className="font-semibold text-sm">{o.customer.name}</div><div className="text-xs text-neutral-500">{o.items.length} item{o.items.length>1?'s':''} • {o.fulfill}</div></div><div className="font-bold text-sm">₦{n(o.total)}</div></button>)}
        </div></div>
        <div><h3 className="font-display text-lg font-bold mb-3">Today's appointments</h3><div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
          {todayBookings.length === 0 && <div className="p-6 text-center text-sm text-neutral-500">No appointments today.</div>}
          {todayBookings.map(b => <div key={b.id} className="p-4 border-b last:border-0 border-neutral-100 flex items-center gap-3"><div className="text-xs font-bold brand-teal w-12">{b.time}</div><div className="flex-1"><div className="font-semibold text-sm">{b.customer.name}</div><div className="text-xs text-neutral-500">{b.services?.map(s=>s.name).join(', ')}</div></div></div>)}
        </div></div>
      </div>
    </div>
  );
}

/* ---- ORDER PROCESSING PIPELINE ---- */
function MgrOrders({ orders, saveOrders, products, saveProducts }) {
  const [filter, setFilter] = useState('active');
  const [openId, setOpenId] = useState(null);
  const filters = [
    { k: 'active', l: 'Active' }, { k: 'new', l: 'New' }, { k: 'processing', l: 'Processing' },
    { k: 'ready', l: 'Ready' }, { k: 'completed', l: 'Completed' }, { k: 'cancelled', l: 'Cancelled' }, { k: 'all', l: 'All' },
  ];
  const match = (o) => filter === 'all' ? true : filter === 'active' ? !['completed','cancelled'].includes(o.stage) : o.stage === filter;
  const list = [...orders].reverse().filter(match);

  const advance = (o) => {
    const idx = ORDER_STAGES.indexOf(o.stage);
    if (idx < 0 || idx >= ORDER_STAGES.length - 1) return;
    const next = ORDER_STAGES[idx + 1];
    saveOrders(orders.map(x => x.id === o.id ? { ...x, stage: next, history: [...(x.history||[]), { stage: next, at: new Date().toISOString() }] } : x));
  };
  const cancel = (o) => {
    if (!confirm(`Cancel order for ${o.customer.name}? Stock will be returned.`)) return;
    saveProducts(products.map(p => { const ci = o.items.find(c => c.id === p.id); return ci ? { ...p, stock: p.stock + ci.qty } : p; }));
    saveOrders(orders.map(x => x.id === o.id ? { ...x, stage: 'cancelled', history: [...(x.history||[]), { stage: 'cancelled', at: new Date().toISOString() }] } : x));
  };
  const togglePaid = (o) => saveOrders(orders.map(x => x.id === o.id ? { ...x, paid: !x.paid } : x));

  const nextLabel = (stage) => { const i = ORDER_STAGES.indexOf(stage); return i >= 0 && i < ORDER_STAGES.length - 1 ? STAGE_LABEL[ORDER_STAGES[i+1]] : null; };

  if (orders.length === 0) return <div className="text-center py-16"><ClipboardList className="w-16 h-16 text-neutral-200 mx-auto mb-3" /><div className="font-semibold mb-1">No orders yet</div><p className="text-sm text-neutral-500">Orders placed in the shop will appear here to process.</p></div>;
  return (
    <div>
      <h2 className="font-display text-2xl font-bold mb-1">Orders</h2><p className="text-sm text-neutral-500 mb-4">Move each order through the pipeline as you fulfill it</p>
      <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar">{filters.map(f => <button key={f.k} onClick={() => setFilter(f.k)} className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap ${filter === f.k ? 'bg-brand-black text-white' : 'bg-neutral-100 text-neutral-600'}`}>{f.l}</button>)}</div>
      <div className="space-y-3 md:grid md:grid-cols-2 md:gap-3 md:space-y-0">
        {list.length === 0 && <div className="text-center py-10 text-sm text-neutral-500 md:col-span-2">No orders in this view.</div>}
        {list.map(o => { const open = openId === o.id; const nl = nextLabel(o.stage); return (
          <div key={o.id} className="bg-white rounded-2xl border border-neutral-200 overflow-hidden self-start">
            <button onClick={() => setOpenId(open ? null : o.id)} className="w-full p-4 text-left">
              <div className="flex items-start justify-between mb-2">
                <div><div className="font-semibold">{o.customer.name}</div><div className="text-xs text-neutral-500">{o.customer.phone}</div></div>
                <div className="flex flex-col items-end gap-1"><span className={`text-[10px] font-bold px-2 py-1 rounded-full ${STAGE_COLOR[o.stage]}`}>{STAGE_LABEL[o.stage]}</span><span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${o.paid ? 'bg-green-100 text-green-700' : 'bg-neutral-100 text-neutral-500'}`}>{o.paid ? 'PAID' : 'UNPAID'}</span></div>
              </div>
              <div className="flex items-center justify-between"><div className="text-xs text-neutral-500">{o.items.length} item{o.items.length>1?'s':''} • {o.fulfill === 'delivery' ? 'Delivery' : 'Pickup'} • #{o.id.slice(-6)}</div><div className="font-bold">₦{n(o.total)}</div></div>
              {/* progress track */}
              <div className="flex items-center gap-1 mt-3">{ORDER_STAGES.map((st, i) => { const ci = ORDER_STAGES.indexOf(o.stage); const done = o.stage !== 'cancelled' && i <= ci; return <React.Fragment key={st}><div className={`h-1.5 flex-1 rounded-full ${done ? 'bg-brand-teal' : 'bg-neutral-200'}`} /></React.Fragment>; })}</div>
            </button>
            {open && (
              <div className="px-4 pb-4 border-t border-neutral-100 pt-3">
                <div className="bg-neutral-50 rounded-xl p-3 mb-3">{o.items.map(it => <div key={it.id} className="flex justify-between text-xs py-0.5"><span>{it.qty} × {it.name}</span><span>₦{n(it.price * it.qty)}</span></div>)}<div className="border-t border-neutral-200 mt-2 pt-2 flex justify-between text-xs"><span className="text-neutral-500">Subtotal</span><span>₦{n(o.subtotal)}</span></div>{o.deliveryFee > 0 && <div className="flex justify-between text-xs"><span className="text-neutral-500">Delivery</span><span>₦{n(o.deliveryFee)}</span></div>}<div className="flex justify-between text-sm font-bold mt-1"><span>Total</span><span>₦{n(o.total)}</span></div></div>
                {o.fulfill === 'delivery' && o.customer.address && <div className="text-xs text-neutral-600 mb-3 flex items-start gap-1"><MapPin className="w-3 h-3 mt-0.5 shrink-0" /> {o.customer.address}</div>}
                {/* history */}
                <div className="mb-3"><div className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-1">Timeline</div>{(o.history||[]).map((h, i) => <div key={i} className="flex items-center gap-2 text-xs py-0.5"><div className={`w-1.5 h-1.5 rounded-full ${h.stage === 'cancelled' ? 'bg-red-500' : 'bg-brand-teal'}`} /><span className="font-medium">{STAGE_LABEL[h.stage]}</span><span className="text-neutral-400">{new Date(h.at).toLocaleString('en-NG', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' })}</span></div>)}</div>
                <button onClick={() => togglePaid(o)} className={`w-full mb-2 py-2 rounded-full text-xs font-semibold ${o.paid ? 'bg-neutral-100 text-neutral-600' : 'bg-green-50 text-green-700'}`}>{o.paid ? 'Mark as unpaid' : 'Mark as paid'}</button>
                <div className="flex gap-2">{nl && o.stage !== 'cancelled' && <button onClick={() => advance(o)} className="flex-1 py-2.5 bg-brand-teal text-white rounded-full text-xs font-semibold flex items-center justify-center gap-1">Move to {nl} <ArrowRight className="w-3 h-3" /></button>}{!['completed','cancelled'].includes(o.stage) && <button onClick={() => cancel(o)} className="px-4 py-2.5 bg-red-50 text-red-700 rounded-full text-xs font-semibold">Cancel</button>}</div>
              </div>
            )}
          </div>
        ); })}
      </div>
    </div>
  );
}

function MgrApprovals({ bookings, saveBookings }) {
  const pending = bookings.filter(b => b.status === 'pending');
  const approve = (b) => saveBookings(bookings.map(x => x.id === b.id ? { ...x, status: 'confirmed', approvedAt: new Date().toISOString() } : x));
  const decline = (b) => { if (confirm(`Decline booking for ${b.customer.name}?`)) saveBookings(bookings.map(x => x.id === b.id ? { ...x, status: 'cancelled' } : x)); };
  const complete = (b) => saveBookings(bookings.map(x => x.id === b.id ? { ...x, status: 'completed' } : x));
  const confirmed = bookings.filter(b => b.status === 'confirmed');
  return (
    <div>
      <h2 className="font-display text-2xl font-bold mb-1">Bookings</h2><p className="text-sm text-neutral-500 mb-4">Approve requests and mark appointments complete</p>
      <h3 className="font-display text-lg font-bold mb-3">Awaiting approval ({pending.length})</h3>
      {pending.length === 0 ? <div className="bg-white rounded-2xl border border-neutral-200 p-6 text-center text-sm text-neutral-500 mb-6">All caught up 🎉</div> : (
        <div className="space-y-3 mb-6 md:grid md:grid-cols-2 md:gap-3 md:space-y-0">{pending.map(b => (
          <div key={b.id} className="bg-white rounded-2xl p-4 border-2 border-amber-200">
            <div className="flex items-start justify-between mb-3"><div><div className="font-semibold">{b.customer.name}</div><div className="text-xs text-neutral-500">{b.customer.phone}</div></div><div className="text-[10px] font-bold px-2 py-1 rounded-full bg-amber-100 text-amber-700">PENDING</div></div>
            <div className="bg-brand-teal-soft rounded-xl p-3 mb-3"><div className="text-xs brand-teal font-bold mb-1">{b.date} • {b.time}</div><div className="text-sm font-semibold">{b.services?.map(s => s.name).join(', ')}</div><div className="text-xs text-neutral-600 mt-1">With {b.staff?.name} • ₦{n(b.total)}{b.depositPaid ? ` • Deposit ₦${n(b.depositAmount)} paid` : ''}</div>{b.customer.notes && <div className="text-xs text-neutral-600 mt-2 italic">"{b.customer.notes}"</div>}</div>
            <div className="flex gap-2"><button onClick={() => approve(b)} className="flex-1 py-3 bg-green-600 text-white rounded-full text-sm font-semibold flex items-center justify-center gap-1"><Check className="w-4 h-4" /> Approve</button><button onClick={() => decline(b)} className="flex-1 py-3 bg-red-50 text-red-700 rounded-full text-sm font-semibold">Decline</button></div>
          </div>
        ))}</div>
      )}
      {confirmed.length > 0 && <><h3 className="font-display text-lg font-bold mb-3">Confirmed — upcoming</h3><div className="space-y-2 md:grid md:grid-cols-2 md:gap-2 md:space-y-0">{confirmed.map(b => <div key={b.id} className="bg-white rounded-2xl p-4 border border-neutral-200 flex items-center justify-between"><div><div className="font-semibold text-sm">{b.customer.name}</div><div className="text-xs text-neutral-500">{b.date} • {b.time} • {b.services?.map(s=>s.name).join(', ')}</div></div><button onClick={() => complete(b)} className="px-3 py-2 bg-blue-50 text-blue-700 rounded-full text-xs font-semibold shrink-0">Mark done</button></div>)}</div></>}
    </div>
  );
}

/* ---- PRODUCTS with upload ---- */
function MgrProducts({ products, saveProducts, priceLog, savePriceLog }) {
  const [editing, setEditing] = useState(null);
  const [restock, setRestock] = useState(null);
  const addNew = () => setEditing({ id: 'p' + Date.now(), name: '', category: '', price: 0, cost: 0, stock: 0, emoji: '✨', image: '', isNew: true });
  const handleImage = (e) => { const file = e.target.files?.[0]; if (!file) return; if (file.size > 2*1024*1024) return alert('Image must be under 2MB'); const r = new FileReader(); r.onload = () => setEditing({ ...editing, image: r.result }); r.readAsDataURL(file); };
  const doSave = () => {
    if (!editing.name) return alert('Name required');
    const { isNew, ...c } = editing;
    if (!isNew) { const prev = products.find(p => p.id === c.id); if (prev && prev.price !== c.price) savePriceLog([...(priceLog||[]), { id: 'pl'+Date.now(), itemId: c.id, name: c.name, type: 'product', from: prev.price, to: c.price, at: new Date().toISOString() }]); }
    saveProducts(isNew ? [...products, c] : products.map(p => p.id === c.id ? c : p)); setEditing(null);
  };
  const del = (id) => confirm('Delete this product?') && saveProducts(products.filter(p => p.id !== id));
  const doRestock = () => { saveProducts(products.map(p => p.id === restock.id ? { ...p, stock: p.stock + (+restock.add || 0) } : p)); setRestock(null); };
  return (
    <div>
      <div className="flex items-center justify-between mb-4"><div><h2 className="font-display text-2xl font-bold">Products</h2><p className="text-sm text-neutral-500">Upload items, manage stock</p></div><button onClick={addNew} className="bg-brand-black text-white rounded-full px-4 py-2.5 text-sm font-semibold flex items-center gap-2"><Upload className="w-4 h-4" /> Upload</button></div>
      <div className="space-y-2 md:grid md:grid-cols-2 md:gap-2 md:space-y-0">{products.map(p => (
        <div key={p.id} className="bg-white rounded-2xl p-3 border border-neutral-200 flex items-center gap-3">
          <div className="w-16 h-16 rounded-xl bg-brand-teal-soft flex items-center justify-center overflow-hidden shrink-0">{p.image ? <img src={p.image} alt={p.name} className="w-full h-full object-cover" /> : <span className="text-2xl">{p.emoji}</span>}</div>
          <div className="flex-1 min-w-0"><div className="text-[10px] text-neutral-500 uppercase tracking-wider">{p.category}</div><div className="font-semibold text-sm truncate">{p.name}</div><div className="text-xs mt-0.5">₦{n(p.price)} • <span className={p.stock < 10 ? 'text-red-500 font-semibold' : 'text-neutral-500'}>Stock {p.stock}</span></div>
            <div className="flex gap-2 mt-2"><button onClick={() => setEditing(p)} className="px-2.5 py-1 bg-neutral-100 rounded-full text-[11px] font-semibold flex items-center gap-1"><Edit3 className="w-3 h-3" /> Edit</button><button onClick={() => setRestock({ ...p, add: '' })} className="px-2.5 py-1 bg-brand-teal-soft brand-teal rounded-full text-[11px] font-semibold flex items-center gap-1"><Plus className="w-3 h-3" /> Restock</button><button onClick={() => del(p.id)} className="px-2.5 py-1 bg-red-50 text-red-600 rounded-full text-[11px] font-semibold"><Trash2 className="w-3 h-3" /></button></div>
          </div>
        </div>
      ))}</div>
      {editing && (
        <Modal onClose={() => setEditing(null)}>
          <h3 className="font-display text-xl font-bold mb-4">{editing.isNew ? 'Upload' : 'Edit'} product</h3>
          <label className="block mb-4"><div className="w-full aspect-square bg-neutral-50 border-2 border-dashed border-neutral-300 rounded-2xl flex flex-col items-center justify-center overflow-hidden cursor-pointer hover:border-brand-teal transition">{editing.image ? <img src={editing.image} alt="preview" className="w-full h-full object-cover" /> : <><ImageIcon className="w-10 h-10 text-neutral-400 mb-2" /><span className="text-xs text-neutral-500">Tap to upload photo</span><span className="text-[10px] text-neutral-400 mt-1">JPG / PNG, max 2MB</span></>}</div><input type="file" accept="image/*" onChange={handleImage} className="hidden" /></label>
          {editing.image && <button onClick={() => setEditing({...editing, image: ''})} className="w-full mb-3 py-2 bg-red-50 text-red-600 rounded-xl text-xs font-semibold">Remove photo</button>}
          <div className="space-y-3">
            <input value={editing.name} onChange={e => setEditing({...editing, name: e.target.value})} placeholder="Product name" className="w-full bg-neutral-50 border border-neutral-200 rounded-2xl px-4 py-3 text-sm" />
            <input value={editing.category} onChange={e => setEditing({...editing, category: e.target.value})} placeholder="Category" className="w-full bg-neutral-50 border border-neutral-200 rounded-2xl px-4 py-3 text-sm" />
            <input value={editing.emoji} onChange={e => setEditing({...editing, emoji: e.target.value})} placeholder="Fallback emoji" maxLength={2} className="w-full bg-neutral-50 border border-neutral-200 rounded-2xl px-4 py-3 text-sm" />
            <div className="grid grid-cols-3 gap-2"><div><label className="text-[10px] text-neutral-500 mb-1 block">Sell ₦</label><input type="number" value={editing.price} onChange={e => setEditing({...editing, price: +e.target.value})} className="w-full bg-neutral-50 border border-neutral-200 rounded-2xl px-3 py-3 text-sm" /></div><div><label className="text-[10px] text-neutral-500 mb-1 block">Cost ₦</label><input type="number" value={editing.cost} onChange={e => setEditing({...editing, cost: +e.target.value})} className="w-full bg-neutral-50 border border-neutral-200 rounded-2xl px-3 py-3 text-sm" /></div><div><label className="text-[10px] text-neutral-500 mb-1 block">Stock</label><input type="number" value={editing.stock} onChange={e => setEditing({...editing, stock: +e.target.value})} className="w-full bg-neutral-50 border border-neutral-200 rounded-2xl px-3 py-3 text-sm" /></div></div>
            {editing.price > 0 && editing.cost > 0 && <div className="text-xs text-neutral-500">Margin: <span className="font-semibold brand-teal">{Math.round((1 - editing.cost/editing.price)*100)}%</span> (₦{n(editing.price - editing.cost)} per unit)</div>}
          </div>
          <button onClick={doSave} className="w-full mt-5 bg-brand-teal text-white rounded-full py-3 font-semibold">Save product</button>
        </Modal>
      )}
      {restock && (
        <Modal onClose={() => setRestock(null)}>
          <h3 className="font-display text-xl font-bold mb-1">Restock</h3><p className="text-sm text-neutral-500 mb-4">{restock.name}</p>
          <div className="bg-neutral-50 rounded-xl p-3 mb-4 text-sm flex justify-between"><span className="text-neutral-500">Current stock</span><span className="font-bold">{restock.stock}</span></div>
          <label className="text-xs font-semibold text-neutral-600 mb-2 block">Add quantity</label>
          <input autoFocus type="number" value={restock.add} onChange={e => setRestock({ ...restock, add: e.target.value })} placeholder="e.g. 50" className="w-full bg-neutral-50 border border-neutral-200 rounded-2xl px-4 py-3 text-sm mb-2" />
          {restock.add > 0 && <div className="text-xs text-neutral-500 mb-4">New stock will be <span className="font-bold brand-teal">{restock.stock + (+restock.add)}</span></div>}
          <button onClick={doRestock} className="w-full bg-brand-teal text-white rounded-full py-3 font-semibold mt-2">Add to stock</button>
        </Modal>
      )}
    </div>
  );
}

/* ---- PRICE MANAGEMENT ---- */
function MgrPrices({ products, saveProducts, services, saveServices, priceLog, savePriceLog }) {
  const [drafts, setDrafts] = useState(() => { const d = {}; [...products, ...services].forEach(i => d[i.id] = i.price); return d; });
  const [tab, setTab] = useState('products');
  const items = tab === 'products' ? products : services;
  const dirty = items.filter(i => +drafts[i.id] !== i.price);
  const applyAll = () => {
    const stamp = new Date().toISOString();
    const logs = [];
    if (tab === 'products') { saveProducts(products.map(p => { if (+drafts[p.id] !== p.price) { logs.push({ id: 'pl'+Date.now()+p.id, itemId: p.id, name: p.name, type: 'product', from: p.price, to: +drafts[p.id], at: stamp }); return { ...p, price: +drafts[p.id] }; } return p; })); }
    else { saveServices(services.map(s => { if (+drafts[s.id] !== s.price) { logs.push({ id: 'pl'+Date.now()+s.id, itemId: s.id, name: s.name, type: 'service', from: s.price, to: +drafts[s.id], at: stamp }); return { ...s, price: +drafts[s.id] }; } return s; })); }
    if (logs.length) savePriceLog([...(priceLog||[]), ...logs]);
    alert(`${logs.length} price${logs.length===1?'':'s'} updated`);
  };
  const bump = (pct) => { const d = { ...drafts }; items.forEach(i => { d[i.id] = Math.round(i.price * (1 + pct/100)); }); setDrafts(d); };
  return (
    <div>
      <div className="flex items-center justify-between mb-4"><div><h2 className="font-display text-2xl font-bold">Price manager</h2><p className="text-sm text-neutral-500">Adjust prices, apply bulk changes</p></div></div>
      <div className="flex gap-2 mb-4"><button onClick={() => setTab('products')} className={`px-4 py-2 rounded-full text-xs font-semibold ${tab === 'products' ? 'bg-brand-black text-white' : 'bg-neutral-100 text-neutral-600'}`}>Products ({products.length})</button><button onClick={() => setTab('services')} className={`px-4 py-2 rounded-full text-xs font-semibold ${tab === 'services' ? 'bg-brand-black text-white' : 'bg-neutral-100 text-neutral-600'}`}>Services ({services.length})</button></div>
      <div className="bg-brand-teal-soft rounded-2xl p-3 mb-4 flex items-center gap-2 flex-wrap"><span className="text-xs font-semibold text-neutral-600">Quick bulk:</span>{[-10, -5, 5, 10].map(p => <button key={p} onClick={() => bump(p)} className="px-3 py-1.5 bg-white rounded-full text-xs font-semibold">{p > 0 ? '+' : ''}{p}%</button>)}<button onClick={() => { const d = {}; items.forEach(i => d[i.id] = i.price); setDrafts(prev => ({ ...prev, ...d })); }} className="px-3 py-1.5 bg-white rounded-full text-xs font-semibold text-neutral-500">Reset</button></div>
      <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden mb-4">
        {items.map((i, idx) => { const changed = +drafts[i.id] !== i.price; return (
          <div key={i.id} className={`flex items-center gap-3 p-3 ${idx < items.length-1 ? 'border-b border-neutral-100' : ''} ${changed ? 'bg-teal-50/40' : ''}`}>
            <div className="flex-1 min-w-0"><div className="font-semibold text-sm truncate">{i.name}</div><div className="text-[11px] text-neutral-500">{i.category}{tab === 'products' && i.cost ? ` • cost ₦${n(i.cost)}` : ''}</div></div>
            {tab === 'products' && i.cost > 0 && <div className="text-[11px] text-neutral-400 hidden sm:block">{Math.round((1 - i.cost/(+drafts[i.id]||1))*100)}% margin</div>}
            <div className="flex items-center gap-1"><span className="text-sm text-neutral-400">₦</span><input type="number" value={drafts[i.id]} onChange={e => setDrafts({ ...drafts, [i.id]: e.target.value })} className={`w-24 bg-neutral-50 border rounded-xl px-3 py-2 text-sm text-right font-semibold ${changed ? 'border-brand-teal' : 'border-neutral-200'}`} /></div>
          </div>
        ); })}
      </div>
      {dirty.length > 0 && <button onClick={applyAll} className="w-full bg-brand-teal text-white rounded-full py-3.5 font-semibold mb-6">Apply {dirty.length} price change{dirty.length===1?'':'s'}</button>}
      {(priceLog||[]).length > 0 && <><h3 className="font-display text-lg font-bold mb-3 flex items-center gap-2"><History className="w-4 h-4" /> Recent changes</h3><div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">{[...priceLog].reverse().slice(0,10).map(l => <div key={l.id} className="p-3 border-b last:border-0 border-neutral-100 flex items-center justify-between"><div><div className="text-sm font-medium">{l.name}</div><div className="text-[10px] text-neutral-400">{new Date(l.at).toLocaleString('en-NG', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' })}</div></div><div className="text-xs flex items-center gap-1"><span className="text-neutral-400 line-through">₦{n(l.from)}</span><ArrowRight className="w-3 h-3 text-neutral-400" /><span className="font-bold brand-teal">₦{n(l.to)}</span></div></div>)}</div></>}
    </div>
  );
}

function MgrServices({ services, saveServices }) {
  const [editing, setEditing] = useState(null);
  const addNew = () => setEditing({ id: 's' + Date.now(), category: '', name: '', price: 0, duration: 60, desc: '', popular: false, isNew: true });
  const doSave = () => { if (!editing.name) return alert('Name required'); const { isNew, ...c } = editing; saveServices(isNew ? [...services, c] : services.map(s => s.id === c.id ? c : s)); setEditing(null); };
  const del = (id) => confirm('Delete?') && saveServices(services.filter(s => s.id !== id));
  return (
    <div>
      <div className="flex items-center justify-between mb-4"><h2 className="font-display text-2xl font-bold">Services</h2><button onClick={addNew} className="bg-brand-black text-white rounded-full px-4 py-2.5 text-sm font-semibold flex items-center gap-2"><Plus className="w-4 h-4" /> Add</button></div>
      <div className="space-y-2 md:grid md:grid-cols-2 md:gap-2 md:space-y-0">{services.map(s => <div key={s.id} className="bg-white rounded-2xl p-3 border border-neutral-200 flex items-center justify-between"><div className="flex-1 min-w-0"><div className="text-[10px] text-neutral-500 uppercase tracking-wider">{s.category}</div><div className="font-semibold text-sm truncate">{s.name}</div><div className="text-xs text-neutral-500">₦{n(s.price)} • {s.duration}min</div></div><div className="flex gap-1"><button onClick={() => setEditing(s)} className="w-8 h-8 bg-neutral-100 rounded-full flex items-center justify-center"><Edit3 className="w-3 h-3" /></button><button onClick={() => del(s.id)} className="w-8 h-8 bg-red-50 rounded-full flex items-center justify-center"><Trash2 className="w-3 h-3 text-red-500" /></button></div></div>)}</div>
      {editing && <Modal onClose={() => setEditing(null)}><h3 className="font-display text-xl font-bold mb-4">{editing.isNew ? 'New' : 'Edit'} service</h3><div className="space-y-3"><input value={editing.category} onChange={e => setEditing({...editing, category: e.target.value})} placeholder="Category (e.g. Hair)" className="w-full bg-neutral-50 border border-neutral-200 rounded-2xl px-4 py-3 text-sm" /><input value={editing.name} onChange={e => setEditing({...editing, name: e.target.value})} placeholder="Name" className="w-full bg-neutral-50 border border-neutral-200 rounded-2xl px-4 py-3 text-sm" /><textarea value={editing.desc} onChange={e => setEditing({...editing, desc: e.target.value})} placeholder="Description" rows={2} className="w-full bg-neutral-50 border border-neutral-200 rounded-2xl px-4 py-3 text-sm resize-none" /><div className="grid grid-cols-2 gap-2"><input type="number" value={editing.price} onChange={e => setEditing({...editing, price: +e.target.value})} placeholder="Price" className="w-full bg-neutral-50 border border-neutral-200 rounded-2xl px-4 py-3 text-sm" /><input type="number" value={editing.duration} onChange={e => setEditing({...editing, duration: +e.target.value})} placeholder="Duration" className="w-full bg-neutral-50 border border-neutral-200 rounded-2xl px-4 py-3 text-sm" /></div><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={editing.popular} onChange={e => setEditing({...editing, popular: e.target.checked})} /> Mark as popular</label></div><button onClick={doSave} className="w-full mt-5 bg-brand-teal text-white rounded-full py-3 font-semibold">Save</button></Modal>}
    </div>
  );
}

function MgrStaff({ staff, saveStaff, bookings }) {
  const [editing, setEditing] = useState(null);
  const addNew = () => setEditing({ id: 'st' + Date.now(), name: '', role: '', specialty: '', rating: 5.0, initial: '', isNew: true });
  const doSave = () => { if (!editing.name) return alert('Name required'); const { isNew, ...c } = editing; if (!c.initial) c.initial = c.name.charAt(0).toUpperCase(); saveStaff(isNew ? [...staff, c] : staff.map(s => s.id === c.id ? c : s)); setEditing(null); };
  const del = (id) => confirm('Delete?') && saveStaff(staff.filter(s => s.id !== id));
  const jobsFor = (id) => bookings.filter(b => b.staffId === id && (b.status === 'completed' || b.status === 'confirmed')).length;
  return (
    <div>
      <div className="flex items-center justify-between mb-4"><h2 className="font-display text-2xl font-bold">Staff</h2><button onClick={addNew} className="bg-brand-black text-white rounded-full px-4 py-2.5 text-sm font-semibold flex items-center gap-2"><Plus className="w-4 h-4" /> Add</button></div>
      <div className="space-y-2 md:grid md:grid-cols-2 md:gap-2 md:space-y-0">{staff.filter(s => s.specialty !== 'Any').map(s => <div key={s.id} className="bg-white rounded-2xl p-3 border border-neutral-200 flex items-center gap-3"><div className="w-12 h-12 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white font-bold">{s.initial}</div><div className="flex-1 min-w-0"><div className="font-semibold text-sm truncate">{s.name}</div><div className="text-xs text-neutral-500">{s.role} • ⭐ {s.rating} • {jobsFor(s.id)} jobs</div></div><div className="flex gap-1"><button onClick={() => setEditing(s)} className="w-8 h-8 bg-neutral-100 rounded-full flex items-center justify-center"><Edit3 className="w-3 h-3" /></button><button onClick={() => del(s.id)} className="w-8 h-8 bg-red-50 rounded-full flex items-center justify-center"><Trash2 className="w-3 h-3 text-red-500" /></button></div></div>)}</div>
      {editing && <Modal onClose={() => setEditing(null)}><h3 className="font-display text-xl font-bold mb-4">{editing.isNew ? 'New' : 'Edit'} team member</h3><div className="space-y-3"><input value={editing.name} onChange={e => setEditing({...editing, name: e.target.value})} placeholder="Full name" className="w-full bg-neutral-50 border border-neutral-200 rounded-2xl px-4 py-3 text-sm" /><input value={editing.role} onChange={e => setEditing({...editing, role: e.target.value})} placeholder="Role" className="w-full bg-neutral-50 border border-neutral-200 rounded-2xl px-4 py-3 text-sm" /><select value={editing.specialty} onChange={e => setEditing({...editing, specialty: e.target.value})} className="w-full bg-neutral-50 border border-neutral-200 rounded-2xl px-4 py-3 text-sm"><option value="">Specialty...</option><option value="Hair">Hair</option><option value="Nails">Nails</option><option value="Feet">Feet</option><option value="All">All services</option></select><div className="grid grid-cols-2 gap-2"><input value={editing.initial} onChange={e => setEditing({...editing, initial: e.target.value})} placeholder="Initial" maxLength={2} className="w-full bg-neutral-50 border border-neutral-200 rounded-2xl px-4 py-3 text-sm" /><input type="number" step="0.1" value={editing.rating} onChange={e => setEditing({...editing, rating: +e.target.value})} placeholder="Rating" className="w-full bg-neutral-50 border border-neutral-200 rounded-2xl px-4 py-3 text-sm" /></div></div><button onClick={doSave} className="w-full mt-5 bg-brand-teal text-white rounded-full py-3 font-semibold">Save</button></Modal>}
    </div>
  );
}

function AdminSettings({ settings, saveSettings }) {
  const [draft, setDraft] = useState(settings);
  const dayLabels = [{ k: 'MO', l: 'Mon' }, { k: 'TU', l: 'Tue' }, { k: 'WE', l: 'Wed' }, { k: 'TH', l: 'Thu' }, { k: 'FR', l: 'Fri' }, { k: 'SA', l: 'Sat' }, { k: 'SU', l: 'Sun' }];
  const toggleDay = (k) => setDraft({ ...draft, peakDays: draft.peakDays.includes(k) ? draft.peakDays.filter(d => d !== k) : [...draft.peakDays, k] });
  const doSave = async () => { await saveSettings(draft); alert('Settings saved'); };
  return (
    <div className="space-y-5 max-w-lg">
      <div><h2 className="font-display text-2xl font-bold">Settings</h2><p className="text-sm text-neutral-500">Deposit & cancellation policy</p></div>
      <div className="bg-white rounded-2xl border border-neutral-200 p-5"><div className="flex items-center justify-between mb-4"><div><div className="font-display font-bold">Peak period</div><div className="text-xs text-neutral-500">When deposits are required</div></div><label className="relative inline-flex items-center cursor-pointer"><input type="checkbox" checked={draft.peakEnabled} onChange={e => setDraft({...draft, peakEnabled: e.target.checked})} className="sr-only peer" /><div className="w-11 h-6 bg-neutral-200 peer-checked:bg-brand-teal rounded-full relative transition"><div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition ${draft.peakEnabled ? 'translate-x-5' : ''}`} /></div></label></div>{draft.peakEnabled && <div><label className="text-xs font-semibold text-neutral-600 mb-2 block">Peak days</label><div className="flex gap-1">{dayLabels.map(d => <button key={d.k} onClick={() => toggleDay(d.k)} className={`flex-1 py-2 rounded-xl text-xs font-bold ${draft.peakDays.includes(d.k) ? 'bg-brand-teal text-white' : 'bg-neutral-100 text-neutral-600'}`}>{d.l}</button>)}</div></div>}</div>
      <div className="bg-white rounded-2xl border border-neutral-200 p-5"><div className="font-display font-bold mb-1">Minimum deposit</div><div className="text-xs text-neutral-500 mb-4">% charged upfront during peak</div><div className="relative"><input type="number" min="0" max="100" value={draft.depositPercent} onChange={e => setDraft({...draft, depositPercent: Math.max(0, Math.min(100, +e.target.value))})} className="w-full bg-neutral-50 border-2 border-brand-teal rounded-2xl px-4 py-4 text-2xl font-bold text-center pr-12" /><span className="absolute right-5 top-1/2 -translate-y-1/2 text-2xl font-bold brand-teal">%</span></div><div className="grid grid-cols-4 gap-2 mt-3">{[25,50,75,100].map(v => <button key={v} onClick={() => setDraft({...draft, depositPercent: v})} className={`py-2 rounded-xl text-xs font-bold ${draft.depositPercent === v ? 'bg-brand-black text-white' : 'bg-neutral-100 text-neutral-600'}`}>{v}%</button>)}</div></div>
      <div className="bg-white rounded-2xl border border-neutral-200 p-5"><div className="font-display font-bold mb-1">Cancellation fee</div><div className="text-xs text-neutral-500 mb-4">% of deposit kept on cancellation</div><div className="relative"><input type="number" min="0" max="100" value={draft.cancellationFeePercent} onChange={e => setDraft({...draft, cancellationFeePercent: Math.max(0, Math.min(100, +e.target.value))})} className="w-full bg-neutral-50 border-2 border-brand-teal rounded-2xl px-4 py-4 text-2xl font-bold text-center pr-12" /><span className="absolute right-5 top-1/2 -translate-y-1/2 text-2xl font-bold brand-teal">%</span></div><div className="grid grid-cols-4 gap-2 mt-3">{[0,10,20,50].map(v => <button key={v} onClick={() => setDraft({...draft, cancellationFeePercent: v})} className={`py-2 rounded-xl text-xs font-bold ${draft.cancellationFeePercent === v ? 'bg-brand-black text-white' : 'bg-neutral-100 text-neutral-600'}`}>{v}%</button>)}</div></div>
      <button onClick={doSave} className="w-full bg-brand-teal text-white rounded-full py-4 font-semibold">Save settings</button>
    </div>
  );
}

/* =============== ACCOUNTANT PORTAL =============== */
function AccountantPortal({ products, bookings, orders, services, settings, exit, onSignOut }) {
  const [tab, setTab] = useState('summary');
  const [range, setRange] = useState('all');

  const inRange = (iso) => {
    if (range === 'all' || !iso) return true;
    const d = new Date(iso); const now = new Date();
    if (range === 'today') return d.toDateString() === now.toDateString();
    if (range === 'week') { const wk = new Date(now); wk.setDate(now.getDate() - 7); return d >= wk; }
    if (range === 'month') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    return true;
  };

  const paidOrders = orders.filter(o => o.stage !== 'cancelled' && inRange(o.date));
  const completedOrders = orders.filter(o => o.stage === 'completed' && inRange(o.date));
  const orderRevenue = completedOrders.reduce((s, o) => s + o.total, 0);
  const outstandingOrders = paidOrders.filter(o => !o.paid).reduce((s, o) => s + o.total, 0);
  const productCost = completedOrders.reduce((s, o) => s + o.items.reduce((c, it) => c + (it.cost || 0) * it.qty, 0), 0);
  const grossProfit = orderRevenue - productCost;

  const relevantBookings = bookings.filter(b => inRange(b.createdAt));
  const bookingRevenue = relevantBookings.filter(b => b.status === 'completed').reduce((s, b) => s + b.total, 0);
  const depositsHeld = relevantBookings.filter(b => b.status === 'confirmed' && b.depositPaid).reduce((s, b) => s + (b.depositAmount || 0), 0);
  const expectedBookingRev = relevantBookings.filter(b => b.status === 'confirmed').reduce((s, b) => s + b.total, 0);

  const totalRevenue = orderRevenue + bookingRevenue;

  const exportCSV = () => {
    const rows = [['Type', 'ID', 'Date', 'Customer', 'Status', 'Amount (NGN)', 'Paid']];
    orders.filter(o => inRange(o.date)).forEach(o => rows.push(['Order', o.id, new Date(o.date).toLocaleDateString('en-NG'), o.customer.name, o.stage, o.total, o.paid ? 'Yes' : 'No']));
    bookings.filter(b => inRange(b.createdAt)).forEach(b => rows.push(['Booking', b.id, b.date, b.customer.name, b.status, b.total, b.depositPaid ? 'Deposit' : 'No']));
    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a');
    a.href = url; a.download = `uchis-finance-${range}-${new Date().toISOString().split('T')[0]}.csv`; a.click(); URL.revokeObjectURL(url);
  };

  const tabs = [{ k: 'summary', l: 'Summary', icon: PieChart }, { k: 'orders', l: 'Order income', icon: ShoppingBag }, { k: 'bookings', l: 'Booking income', icon: Calendar }, { k: 'reconcile', l: 'Reconcile', icon: Wallet }];

  return (
    <div className="min-h-screen md:flex">
      <div className="hidden md:flex md:flex-col md:w-60 bg-brand-black text-white p-4 shrink-0 min-h-screen">
        <div className="px-2 mb-1"><div className="font-display italic text-2xl">Uchis</div><div className="text-[10px] tracking-widest uppercase" style={{ color: '#2DD4BF' }}>Accountant</div></div>
        <div className="flex flex-col gap-1 mt-6">{tabs.map(t => { const Icon = t.icon; return <button key={t.k} onClick={() => setTab(t.k)} className={`px-3 py-2.5 rounded-xl text-sm flex items-center gap-3 ${tab === t.k ? 'bg-brand-teal text-white' : 'text-white/65 hover:text-white'}`}><Icon className="w-4 h-4" />{t.l}</button>; })}</div>
        <div className="mt-auto flex flex-col gap-1">
          <button onClick={exit} className="px-3 py-2.5 rounded-xl text-sm flex items-center gap-3 text-white/65 hover:text-white"><ArrowLeft className="w-4 h-4" /> Customer view</button>
          <button onClick={onSignOut} className="px-3 py-2.5 rounded-xl text-sm flex items-center gap-3 text-white/65 hover:text-white"><LogOut className="w-4 h-4" /> Sign out</button>
        </div>
      </div>

      <div className="flex-1 min-w-0 max-w-md mx-auto md:max-w-none w-full">
        <div className="md:hidden bg-brand-black text-white px-5 pt-6 pb-5"><div className="flex items-center justify-between"><div><div className="text-xs text-white/60 uppercase tracking-widest">Accountant</div><h1 className="font-display text-2xl font-bold">Financials</h1></div><button onClick={exit} className="px-4 py-2 rounded-full bg-white/10 flex items-center gap-2 text-sm"><ArrowLeft className="w-4 h-4" /> Exit</button></div></div>
        <div className="md:hidden sticky top-0 bg-white z-10 border-b border-neutral-100 flex gap-1 px-3 overflow-x-auto no-scrollbar">{tabs.map(t => <button key={t.k} onClick={() => setTab(t.k)} className={`px-3 py-3 text-xs font-semibold whitespace-nowrap border-b-2 ${tab === t.k ? 'border-brand-teal brand-teal' : 'border-transparent text-neutral-500'}`}>{t.l}</button>)}</div>

        <div className="px-5 py-5 md:px-8 md:py-8 md:max-w-5xl">
          {/* date range + export */}
          <div className="flex items-center justify-between mb-5 gap-2 flex-wrap">
            <div className="flex gap-1">{['today','week','month','all'].map(r => <button key={r} onClick={() => setRange(r)} className={`px-3 py-1.5 rounded-full text-xs font-semibold capitalize ${range === r ? 'bg-brand-black text-white' : 'bg-neutral-100 text-neutral-600'}`}>{r === 'all' ? 'All time' : r}</button>)}</div>
            <button onClick={exportCSV} className="px-3 py-1.5 bg-brand-teal-soft brand-teal rounded-full text-xs font-semibold flex items-center gap-1.5"><Download className="w-3.5 h-3.5" /> Export CSV</button>
          </div>

          {tab === 'summary' && (
            <div className="space-y-5">
              <div className="bg-gradient-to-br from-teal-600 to-teal-800 rounded-2xl p-6 text-white"><div className="text-xs text-white/70 uppercase tracking-widest mb-1">Total revenue ({range === 'all' ? 'all time' : range})</div><div className="font-display text-4xl font-bold">₦{n(totalRevenue)}</div><div className="text-xs text-white/70 mt-2">Orders ₦{n(orderRevenue)} + Bookings ₦{n(bookingRevenue)}</div></div>
              <div className="grid grid-cols-2 gap-3">
                {[{ l: 'Gross profit (products)', v: '₦'+n(grossProfit), s: `after ₦${n(productCost)} cost`, c: 'text-green-600' },
                  { l: 'Deposits held', v: '₦'+n(depositsHeld), s: 'on confirmed bookings', c: 'brand-teal' },
                  { l: 'Outstanding (unpaid)', v: '₦'+n(outstandingOrders), s: 'orders not marked paid', c: 'text-amber-600' },
                  { l: 'Expected from bookings', v: '₦'+n(expectedBookingRev), s: 'confirmed, not completed', c: 'text-neutral-700' }].map((x, i) => (
                  <div key={i} className="bg-white rounded-2xl p-4 border border-neutral-200"><div className={`text-xl font-bold ${x.c}`}>{x.v}</div><div className="text-xs font-semibold text-neutral-700 mt-1">{x.l}</div><div className="text-[10px] text-neutral-400">{x.s}</div></div>
                ))}
              </div>
              <div className="bg-white rounded-2xl border border-neutral-200 p-5"><h3 className="font-display text-lg font-bold mb-3">Revenue breakdown</h3>
                {[{ l: 'Completed orders', v: orderRevenue, c: '#0D9488' }, { l: 'Completed bookings', v: bookingRevenue, c: '#2DD4BF' }].map((x, i) => { const pct = totalRevenue ? Math.round(x.v/totalRevenue*100) : 0; return (
                  <div key={i} className="mb-3 last:mb-0"><div className="flex justify-between text-sm mb-1"><span>{x.l}</span><span className="font-semibold">₦{n(x.v)} ({pct}%)</span></div><div className="h-2 bg-neutral-100 rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: `${pct}%`, background: x.c }} /></div></div>
                ); })}
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-800 flex items-start gap-2"><FileText className="w-4 h-4 mt-0.5 shrink-0" /><div>View-only access. To record payments or change orders, ask the manager. Export the CSV for your records or your accounting software.</div></div>
            </div>
          )}

          {tab === 'orders' && (
            <div>
              <h2 className="font-display text-xl font-bold mb-1">Order income</h2><p className="text-sm text-neutral-500 mb-4">{completedOrders.length} completed of {orders.filter(o=>inRange(o.date)).length} in range</p>
              <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
                {orders.filter(o => inRange(o.date)).length === 0 && <div className="p-6 text-center text-sm text-neutral-500">No orders in this range.</div>}
                {[...orders].reverse().filter(o => inRange(o.date)).map(o => <div key={o.id} className="p-4 border-b last:border-0 border-neutral-100 flex items-center justify-between"><div><div className="font-semibold text-sm">{o.customer.name}</div><div className="text-[11px] text-neutral-500">{new Date(o.date).toLocaleDateString('en-NG')} • {STAGE_LABEL[o.stage]} • #{o.id.slice(-6)}</div></div><div className="text-right"><div className="font-bold text-sm">₦{n(o.total)}</div><div className={`text-[9px] font-bold ${o.paid ? 'text-green-600' : 'text-amber-600'}`}>{o.paid ? 'PAID' : 'UNPAID'}</div></div></div>)}
              </div>
            </div>
          )}

          {tab === 'bookings' && (
            <div>
              <h2 className="font-display text-xl font-bold mb-1">Booking income</h2><p className="text-sm text-neutral-500 mb-4">Service revenue & deposits</p>
              <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
                {relevantBookings.length === 0 && <div className="p-6 text-center text-sm text-neutral-500">No bookings in this range.</div>}
                {[...relevantBookings].reverse().map(b => <div key={b.id} className="p-4 border-b last:border-0 border-neutral-100 flex items-center justify-between"><div><div className="font-semibold text-sm">{b.customer.name}</div><div className="text-[11px] text-neutral-500">{b.date} • {b.services?.map(s=>s.name).join(', ')}</div>{b.depositPaid && <div className="text-[10px] brand-teal font-semibold">Deposit ₦{n(b.depositAmount)} held</div>}</div><div className="text-right"><div className="font-bold text-sm">₦{n(b.total)}</div><div className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full inline-block ${b.status === 'completed' ? 'bg-green-100 text-green-700' : b.status === 'confirmed' ? 'bg-sky-100 text-sky-700' : b.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{b.status?.toUpperCase()}</div></div></div>)}
              </div>
            </div>
          )}

          {tab === 'reconcile' && (
            <div>
              <h2 className="font-display text-xl font-bold mb-1">Payment reconciliation</h2><p className="text-sm text-neutral-500 mb-4">Orders awaiting payment confirmation</p>
              {paidOrders.filter(o => !o.paid).length === 0 ? <div className="bg-white rounded-2xl border border-neutral-200 p-6 text-center text-sm text-neutral-500">Everything reconciled ✓</div> : (
                <><div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-4 flex items-center justify-between"><div><div className="text-xs text-amber-700">Total outstanding</div><div className="font-display text-2xl font-bold text-amber-900">₦{n(outstandingOrders)}</div></div><Wallet className="w-8 h-8 text-amber-400" /></div>
                <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">{paidOrders.filter(o => !o.paid).map(o => <div key={o.id} className="p-4 border-b last:border-0 border-neutral-100 flex items-center justify-between"><div><div className="font-semibold text-sm">{o.customer.name}</div><div className="text-[11px] text-neutral-500">{new Date(o.date).toLocaleDateString('en-NG')} • #{o.id.slice(-6)} • {STAGE_LABEL[o.stage]}</div></div><div className="font-bold text-sm text-amber-600">₦{n(o.total)}</div></div>)}</div>
                <div className="text-[11px] text-neutral-400 mt-3">Only the manager can mark an order paid. Flag these for follow-up.</div></>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* =============== ORDERS SCREEN (customer) =============== */
function OrdersScreen({ orders, customerId, setView }) {
  const myOrders = customerId ? [...orders].reverse().filter(o => o.customerId === customerId) : [];
  return (
    <div>
      <div className="sticky top-0 bg-white z-20 border-b border-neutral-100 px-5 pt-6 pb-4 flex items-center gap-3">
        <button onClick={() => setView('profile')} className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center"><ArrowLeft className="w-5 h-5" /></button>
        <h1 className="font-display text-xl font-bold">My orders</h1>
      </div>
      <div className="px-5 py-4 space-y-3">
        {myOrders.length === 0 && (
          <div className="text-center py-16"><ShoppingBag className="w-16 h-16 text-neutral-200 mx-auto mb-3" /><div className="font-semibold mb-1">No orders yet</div><p className="text-sm text-neutral-500 mb-4">Your orders will appear here once you shop</p><button onClick={() => setView('shop')} className="bg-brand-black text-white px-6 py-3 rounded-full text-sm font-semibold">Shop now</button></div>
        )}
        {myOrders.map(o => (
          <div key={o.id} className="bg-white border border-neutral-200 rounded-2xl p-4">
            <div className="flex items-start justify-between mb-2">
              <div><div className="text-xs text-neutral-500">{new Date(o.date).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}</div><div className="font-semibold text-sm mt-0.5">{o.items.length} item{o.items.length > 1 ? 's' : ''} • {o.fulfill}</div></div>
              <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${STAGE_COLOR[o.stage]}`}>{STAGE_LABEL[o.stage]}</span>
            </div>
            <div className="text-xs text-neutral-500 mb-2 line-clamp-1">{o.items.map(i => `${i.qty}× ${i.name}`).join(', ')}</div>
            <div className="flex items-center justify-between border-t border-neutral-100 pt-2">
              <div className="font-bold text-sm">₦{n(o.total)}</div>
              <div className="flex items-center gap-2">
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${o.paid ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{o.paid ? 'PAID' : 'UNPAID'}</span>
                <span className="text-xs text-neutral-400">#{o.id.slice(-6)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* =============== AUTH MODAL (customer sign up / sign in) =============== */
function AuthModal({ initialTab, onClose, onSuccess }) {
  const [tab, setTab] = useState(initialTab || 'signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const reset = () => { setErr(''); setSuccessMsg(''); };

  const signIn = async (e) => {
    e?.preventDefault();
    if (!email.trim() || !password) return;
    setBusy(true); reset();
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;
      const { data: staffProf } = await supabase.from('profiles').select('role').eq('id', data.user.id).maybeSingle();
      if (staffProf?.role) { await supabase.auth.signOut(); throw new Error('This is a staff account. Use the Staff sign-in option instead.'); }
      const { data: cp } = await supabase.from('customer_profiles').select('*').eq('id', data.user.id).maybeSingle();
      onSuccess(data.user, cp);
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };

  const signUp = async (e) => {
    e?.preventDefault();
    if (!email.trim() || !password || !name.trim()) return;
    if (password.length < 6) { setErr('Password must be at least 6 characters'); return; }
    setBusy(true); reset();
    try {
      const { data, error } = await supabase.auth.signUp({ email: email.trim(), password, options: { data: { name, phone } } });
      if (error) throw error;
      if (data.user) {
        await supabase.from('customer_profiles').upsert({ id: data.user.id, name: name.trim(), phone: phone.trim(), email: email.trim(), created_at: new Date().toISOString() }, { onConflict: 'id' });
        if (data.session) {
          const { data: cp } = await supabase.from('customer_profiles').select('*').eq('id', data.user.id).maybeSingle();
          onSuccess(data.user, cp);
        } else {
          setSuccessMsg('Account created! Check your email to confirm, then sign in.');
        }
      }
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };

  const pwdField = (ac) => (
    <div className="relative">
      <input type={showPwd ? 'text' : 'password'} value={password} onChange={e => { setPassword(e.target.value); reset(); }} placeholder={ac === 'new-password' ? 'Password (min. 6 chars)' : 'Password'} autoComplete={ac} className="w-full bg-neutral-50 border-2 border-neutral-200 rounded-2xl px-4 py-4 text-sm pr-12" />
      <button type="button" onClick={() => setShowPwd(v => !v)} className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400">{showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
    </div>
  );

  return (
    <Modal onClose={onClose}>
      <div className="flex gap-2 mb-5">
        {['signin', 'signup'].map(t => (
          <button key={t} onClick={() => { setTab(t); reset(); }} className={`flex-1 py-2.5 rounded-full text-sm font-semibold transition ${tab === t ? 'bg-brand-black text-white' : 'bg-neutral-100 text-neutral-600'}`}>
            {t === 'signin' ? 'Sign in' : 'Create account'}
          </button>
        ))}
      </div>
      {successMsg ? (
        <div className="text-center py-4">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4"><Check className="w-8 h-8 text-green-600" /></div>
          <p className="text-sm text-neutral-600 mb-4">{successMsg}</p>
          <button onClick={() => { setSuccessMsg(''); setTab('signin'); }} className="text-sm brand-teal font-semibold">Go to sign in →</button>
        </div>
      ) : tab === 'signin' ? (
        <form onSubmit={signIn} className="space-y-3">
          <input type="email" value={email} onChange={e => { setEmail(e.target.value); reset(); }} placeholder="Email address" autoComplete="email" className="w-full bg-neutral-50 border-2 border-neutral-200 rounded-2xl px-4 py-4 text-sm" />
          {pwdField('current-password')}
          {err && <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 text-sm text-red-700">{err}</div>}
          <button type="submit" disabled={busy || !email.trim() || !password} className="w-full bg-brand-teal text-white rounded-full py-4 font-semibold disabled:opacity-50">{busy ? 'Signing in…' : 'Sign in'}</button>
        </form>
      ) : (
        <form onSubmit={signUp} className="space-y-3">
          <input type="text" value={name} onChange={e => { setName(e.target.value); reset(); }} placeholder="Full name" autoComplete="name" className="w-full bg-neutral-50 border-2 border-neutral-200 rounded-2xl px-4 py-4 text-sm" />
          <input type="tel" value={phone} onChange={e => { setPhone(e.target.value); reset(); }} placeholder="Phone number" autoComplete="tel" className="w-full bg-neutral-50 border-2 border-neutral-200 rounded-2xl px-4 py-4 text-sm" />
          <input type="email" value={email} onChange={e => { setEmail(e.target.value); reset(); }} placeholder="Email address" autoComplete="email" className="w-full bg-neutral-50 border-2 border-neutral-200 rounded-2xl px-4 py-4 text-sm" />
          {pwdField('new-password')}
          {err && <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 text-sm text-red-700">{err}</div>}
          <button type="submit" disabled={busy || !email.trim() || !password || !name.trim()} className="w-full bg-brand-teal text-white rounded-full py-4 font-semibold disabled:opacity-50">{busy ? 'Creating account…' : 'Create account'}</button>
          <p className="text-[11px] text-neutral-400 text-center">By signing up you agree to our terms of service</p>
        </form>
      )}
    </Modal>
  );
}

/* =============== PAYSTACK PAYMENT BUTTON =============== */
function PaystackButton({ amount, email, name, phone, orderId, label, disabled, onSuccess, onClose: onCloseProp, className }) {
  const key = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;
  const pay = () => {
    if (!customer_validate()) return;
    if (!window.PaystackPop) { alert('Payment module not loaded yet — please wait a moment and try again.'); return; }
    if (!key) { alert('Online payment not configured. Please pay at the salon or select "Cash on delivery".'); return; }
    const handler = window.PaystackPop.setup({
      key,
      email: email || 'guest@uchisbeauty.com',
      amount: Math.round(amount) * 100,
      currency: 'NGN',
      ref: orderId || ('ub_' + Date.now()),
      metadata: { custom_fields: [{ display_name: 'Customer', variable_name: 'customer_name', value: name || '' }, { display_name: 'Phone', variable_name: 'phone', value: phone || '' }] },
      callback: (res) => onSuccess?.(res),
      onClose: () => onCloseProp?.(),
    });
    handler.openIframe();
  };
  function customer_validate() { return true; }
  return (
    <button onClick={pay} disabled={disabled} className={className || 'w-full bg-brand-teal text-white rounded-full py-4 font-semibold disabled:opacity-50 flex items-center justify-center gap-2'}>
      <CreditCard className="w-4 h-4" />{label || `Pay ₦${n(amount)}`}
    </button>
  );
}

/* =============== MODAL =============== */
function Modal({ children, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center p-0 md:items-center md:p-4" onClick={onClose}>
      <div className="bg-white w-full max-w-md rounded-t-3xl md:rounded-3xl p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>{children}</div>
    </div>
  );
}
