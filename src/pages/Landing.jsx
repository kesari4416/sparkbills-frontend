import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Store, UtensilsCrossed, Stethoscope, Pill, Briefcase, Warehouse,
  ArrowRight, ShieldCheck, Zap, Receipt, BarChart3, IndianRupee, ArrowUpRight,
} from "lucide-react";

const INDUSTRIES = [
  {
    icon: Store, label: "Retail & POS",
    img: "https://images.unsplash.com/photo-1731801612800-9cc3df4dab07?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDQ2NDF8MHwxfHNlYXJjaHw0fHxtb2Rlcm4lMjBpbmRpYW4lMjByZXRhaWwlMjBzaG9wJTIwb3duZXIlMjB1c2luZyUyMHRhYmxldHxlbnwwfHx8fDE3ODQzMTc0Mzh8MA&ixlib=rb-4.1.0&q=85",
  },
  {
    icon: UtensilsCrossed, label: "Restaurant & Café",
    img: "https://images.unsplash.com/photo-1647427017067-8f33ccbae493?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDQ2MzR8MHwxfHNlYXJjaHwzfHxyZXN0YXVyYW50JTIwcG9zJTIwbWFjaGluZXxlbnwwfHx8fDE3ODQzMTc0NTB8MA&ixlib=rb-4.1.0&q=85",
  },
  {
    icon: Stethoscope, label: "Hospitals & Clinics",
    img: "https://images.unsplash.com/photo-1764727291644-5dcb0b1a0375",
  },
  {
    icon: Pill, label: "Pharmacies",
    img: "https://images.unsplash.com/photo-1642055514517-7b52288890ec",
  },
  { icon: Briefcase, label: "Service Businesses", img: null },
  { icon: Warehouse, label: "Wholesale & Distribution", img: null },
];

const FEATURES = [
  { icon: IndianRupee, title: "India GST Compliant", desc: "CGST • SGST • IGST auto-split. HSN/SAC codes. GSTR-1 & GSTR-3B summaries out of the box." },
  { icon: Zap, title: "Fast POS Billing", desc: "Barcode scanning, hotkeys, thermal printer output. Bill in under 3 seconds." },
  { icon: Receipt, title: "Every Document Type", desc: "Tax invoices, quotations, proforma, credit/debit notes, sales & purchase returns." },
  { icon: BarChart3, title: "Actionable Reports", desc: "Real-time dashboard, profit margin, HSN summary, customer ledgers." },
  { icon: ShieldCheck, title: "Role-Based Access", desc: "Owner, manager, cashier, accountant, doctor, pharmacist — controlled." },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A]">
      {/* Nav */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/70 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center gap-4">
          <Link to="/" className="flex items-center gap-2" data-testid="landing-logo">
            <div className="w-9 h-9 bg-[#1E3A8A] flex items-center justify-center rounded-sm">
              <span className="text-white font-heading font-bold text-lg">V</span>
            </div>
            <div>
              <div className="font-heading font-bold text-lg leading-none tracking-tight">Vyapari</div>
              <div className="text-[10px] uppercase tracking-widest text-slate-500">GST Billing OS</div>
            </div>
          </Link>
          <nav className="hidden md:flex items-center gap-6 ml-8 text-sm text-slate-600">
            <a href="#industries" className="hover:text-slate-900">Industries</a>
            <a href="#features" className="hover:text-slate-900">Features</a>
            <a href="#pricing" className="hover:text-slate-900">Pricing</a>
          </nav>
          <div className="flex-1" />
          <Link to="/login" data-testid="landing-login-btn">
            <Button variant="ghost" size="sm" className="rounded-sm">Sign In</Button>
          </Link>
          <Link to="/register" data-testid="landing-register-btn">
            <Button size="sm" className="rounded-sm bg-[#1E3A8A] hover:bg-[#1E40AF]">
              Start Free
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 grid-lines opacity-40" />
        <div className="absolute -top-24 -right-24 w-[500px] h-[500px] rounded-full bg-[#1E3A8A]/10 blur-3xl" />
        <div className="max-w-7xl mx-auto px-6 pt-24 pb-32 relative grid lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 text-white text-xs mb-8">
              <span className="w-1.5 h-1.5 rounded-full bg-[#1E3A8A] animate-pulse" />
              One platform. Seven industries. Zero compromise.
            </div>
            <h1 className="font-heading text-5xl lg:text-7xl font-bold tracking-tighter leading-[0.95]">
              GST billing built for <span className="text-[#1E3A8A]">every kind of business</span> in India.
            </h1>
            <p className="mt-8 text-lg lg:text-xl text-slate-600 max-w-2xl leading-relaxed">
              Retail, restaurants, hospitals, pharmacies, service firms and wholesalers —
              all running on the same billing core. Invoice in seconds, file GST with
              confidence, and see your business in one dashboard.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link to="/register" data-testid="hero-cta-register">
                <Button size="lg" className="rounded-sm bg-[#0F172A] hover:bg-slate-800 gap-2 h-12 px-6">
                  Start billing free <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link to="/login" data-testid="hero-cta-demo">
                <Button size="lg" variant="outline" className="rounded-sm h-12 px-6 border-slate-300">
                  Try demo account
                </Button>
              </Link>
            </div>
            <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-8 text-sm text-slate-600 max-w-3xl">
              {[
                ["10+", "Document types"],
                ["7", "Industry modes"],
                ["GSTR-1/3B", "Auto reports"],
                ["₹0", "To start"],
              ].map(([n, l]) => (
                <div key={l}>
                  <div className="font-heading text-3xl font-bold text-[#0F172A]">{n}</div>
                  <div className="uppercase tracking-widest text-[10px] mt-1">{l}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Floating dashboard preview card */}
          <div className="lg:col-span-5 relative hidden lg:block">
            <div className="absolute -inset-4 rounded-lg bg-gradient-to-br from-[#1E3A8A]/20 to-blue-500/10 blur-2xl" />
            <div className="relative bg-white border border-slate-200 rounded-sm p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-[#1E3A8A] rounded-sm flex items-center justify-center text-white font-bold">V</div>
                  <div className="text-xs uppercase tracking-widest text-slate-500 font-semibold">Live Dashboard</div>
                </div>
                <span className="text-[10px] px-2 py-1 rounded-sm bg-green-100 text-green-700 uppercase tracking-widest">Real-time</span>
              </div>
              <div className="text-[10px] uppercase tracking-widest text-slate-500">Today Sales</div>
              <div className="font-heading text-4xl font-bold text-[#0F172A] tabular mt-1">₹ 1,84,320</div>
              <div className="text-xs text-green-600 mt-1 flex items-center gap-1">
                <ArrowUpRight className="w-3 h-3" /> 24 invoices · +12% vs yesterday
              </div>
              <div className="mt-6 grid grid-cols-3 gap-2">
                {[
                  ["CGST", "₹ 9,216"],
                  ["SGST", "₹ 9,216"],
                  ["Net", "₹ 1,65,888"],
                ].map(([l, v]) => (
                  <div key={l} className="p-3 border border-slate-100 rounded-sm bg-slate-50/50">
                    <div className="text-[9px] uppercase tracking-widest text-slate-500">{l}</div>
                    <div className="tabular font-bold text-[#0F172A] mt-1">{v}</div>
                  </div>
                ))}
              </div>
              <div className="mt-4 h-24 flex items-end gap-1">
                {[35, 60, 45, 80, 55, 92, 70, 88, 62, 100, 78, 95].map((h, i) => (
                  <div
                    key={i}
                    style={{ height: `${h}%` }}
                    className={`flex-1 rounded-sm ${i === 11 ? "bg-[#1E3A8A]" : "bg-slate-200"}`}
                  />
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-slate-600">GSTR-3B on track</span>
                </div>
                <span className="text-[10px] uppercase tracking-widest text-slate-500 font-mono">INV/25-26/00248</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Industries Bento */}
      <section id="industries" className="py-24 border-t border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-[10px] uppercase tracking-[0.3em] text-[#1E3A8A]">Industries</div>
          <h2 className="font-heading text-4xl lg:text-5xl font-bold tracking-tight mt-2 max-w-3xl">
            One codebase. Every workflow.
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mt-16">
            {INDUSTRIES.map((ind, i) => {
              const Icon = ind.icon;
              const wide = i === 0 || i === 3;
              return (
                <div
                  key={ind.label}
                  data-testid={`landing-industry-${i}`}
                  className={`${wide ? "md:col-span-8" : "md:col-span-4"} group relative overflow-hidden border border-slate-200 hover:border-slate-900 transition-colors bg-white`}
                  style={{ minHeight: 260 }}
                >
                  {ind.img && (
                    <div
                      className="absolute inset-0 bg-cover bg-center opacity-40 group-hover:opacity-60 transition-opacity"
                      style={{ backgroundImage: `url(${ind.img})` }}
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-white via-white/60 to-white/0" />
                  <div className="relative p-8 h-full flex flex-col justify-end">
                    <Icon className="w-8 h-8 mb-4 text-[#1E3A8A]" strokeWidth={1.5} />
                    <div className="font-heading text-2xl font-semibold tracking-tight">{ind.label}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-[10px] uppercase tracking-[0.3em] text-[#1E3A8A]">Feature set</div>
          <h2 className="font-heading text-4xl lg:text-5xl font-bold tracking-tight mt-2 max-w-3xl">
            Every billing tool your accountant will thank you for.
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-16">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.title}
                  className="p-8 bg-white border border-slate-200 hover:border-[#1E3A8A] transition-colors"
                >
                  <Icon className="w-6 h-6 text-[#1E3A8A]" strokeWidth={1.5} />
                  <div className="mt-6 font-heading text-xl font-semibold">{f.title}</div>
                  <p className="mt-2 text-sm text-slate-600 leading-relaxed">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="pricing" className="py-24 bg-[#0F172A] text-white border-t border-slate-800">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="font-heading text-4xl lg:text-6xl font-bold tracking-tighter">
            Ready to replace your billing chaos?
          </h2>
          <p className="mt-6 text-slate-400 text-lg">
            Set up your business, add your first item, and print your first GST invoice in under 5 minutes.
          </p>
          <div className="mt-10 flex flex-wrap gap-3 justify-center">
            <Link to="/register" data-testid="cta-register">
              <Button size="lg" className="rounded-sm bg-[#1E3A8A] hover:bg-[#1E40AF] h-12 px-6 gap-2">
                Create your business <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <footer className="py-8 text-center text-xs text-slate-500 border-t border-slate-200 bg-white">
        © 2026 Vyapari Billing Suite • Built for Indian businesses
      </footer>
    </div>
  );
}
