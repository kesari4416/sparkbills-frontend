import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  ArrowRight, ShieldCheck, Sparkles,
  Store, Utensils, Scissors, Pill, Wrench, Tv, Mail, Lock, Eye, EyeOff,
} from "lucide-react";

const industries = [
  { icon: Store, label: "Retail" },
  { icon: Utensils, label: "Restaurant" },
  { icon: Scissors, label: "Textile" },
  { icon: Pill, label: "Pharmacy" },
  { icon: Wrench, label: "Hardware" },
  { icon: Tv, label: "Electronics" },
];

const stats = [
  { label: "GSTR-1 · GSTR-3B", sub: "Auto-generated monthly" },
  { label: "80mm Thermal + A4", sub: "One-tap receipts" },
  { label: "P&L · Balance Sheet", sub: "Live financials" },
];

export default function Login() {
  const { user, login, formatApiError } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      if (user.platform_role === "super_admin") navigate("/platform", { replace: true });
      else navigate("/app", { replace: true });
    }
  }, [user, navigate]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await login(email, password);
      toast.success("Welcome back!");
      if (data?.platform_role === "super_admin") navigate("/platform");
      else navigate("/app");
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid md:grid-cols-2 bg-[#F8FAFC] overflow-hidden">
      {/* ============================================================
           LEFT — Cinematic hero
           ============================================================ */}
      <div className="hidden md:flex relative overflow-hidden text-white bg-[#050B1E]">
        {/* Animated aurora gradient blobs */}
        <motion.div
          className="absolute -top-40 -left-40 w-[520px] h-[520px] rounded-full"
          style={{
            background: "radial-gradient(circle at 30% 30%, rgba(37,99,235,0.55), transparent 60%)",
            filter: "blur(60px)",
          }}
          animate={{ x: [0, 60, -20, 0], y: [0, 40, -30, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute -bottom-40 -right-32 w-[600px] h-[600px] rounded-full"
          style={{
            background: "radial-gradient(circle at 70% 70%, rgba(30,58,138,0.65), transparent 60%)",
            filter: "blur(80px)",
          }}
          animate={{ x: [0, -50, 40, 0], y: [0, -30, 20, 0] }}
          transition={{ duration: 24, repeat: Infinity, ease: "easeInOut" }}
        />
        {/* Grid lines */}
        <div
          className="absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(148,163,184,0.6) 1px,transparent 1px),linear-gradient(90deg,rgba(148,163,184,0.6) 1px,transparent 1px)",
            backgroundSize: "48px 48px",
            maskImage: "radial-gradient(ellipse at center, black 40%, transparent 80%)",
            WebkitMaskImage: "radial-gradient(ellipse at center, black 40%, transparent 80%)",
          }}
        />
        {/* Noise grain */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.06] mix-blend-overlay"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
          }}
        />

        {/* Floating orbiting logo */}
        <motion.div
          className="absolute right-8 top-1/3 w-48 h-48 lg:w-56 lg:h-56 flex items-center justify-center pointer-events-none"
          animate={{ y: [0, -22, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        >
          {/* Halo rings */}
          <motion.div
            className="absolute inset-0 rounded-full border border-blue-500/25"
            animate={{ rotate: 360 }}
            transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
          />
          <motion.div
            className="absolute inset-4 rounded-full border border-blue-400/15"
            animate={{ rotate: -360 }}
            transition={{ duration: 22, repeat: Infinity, ease: "linear" }}
          />
          <motion.div
            className="absolute inset-8 rounded-full"
            style={{ background: "radial-gradient(circle,rgba(59,130,246,0.35),transparent 70%)", filter: "blur(24px)" }}
            animate={{ scale: [1, 1.15, 1], opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.img
            src="/brand/sparkcurv-icon.png"
            alt="SparkCurv Logo"
            className="w-40 h-40 relative z-10 drop-shadow-[0_0_35px_rgba(37,99,235,0.5)]"
            initial={{ scale: 0.4, opacity: 0, rotate: -60 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          />
        </motion.div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between w-full p-12 lg:p-14">
          <motion.div
            className="flex items-center gap-3"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            data-testid="login-logo"
          >
            <div className="w-10 h-10 flex items-center justify-center">
              <img src="/brand/sparkcurv-icon.png" alt="Sparkbills" className="w-full h-full object-contain" />
            </div>
            <div>
              <div className="font-heading font-bold text-xl tracking-tight leading-none">Sparkbills</div>
              <div className="text-[10px] uppercase tracking-[0.25em] text-blue-300/70 mt-1">
                by SparkCurv Technologies
              </div>
            </div>
          </motion.div>

          <div className="max-w-lg">
            <motion.div
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-blue-400/30 bg-blue-400/5 text-[10px] uppercase tracking-[0.25em] text-blue-200 mb-6"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.15 }}
            >
              <Sparkles className="w-3 h-3" /> India-first · GST · Multi-industry
            </motion.div>

            <h2 className="font-heading text-5xl lg:text-[64px] font-bold tracking-[-0.03em] leading-[1.02]">
              <RevealWord text="Bill" delay={0.3} />{" "}
              <RevealWord text="smart." delay={0.45} />
              <br />
              <span className="bg-gradient-to-r from-blue-400 via-sky-300 to-blue-500 bg-clip-text text-transparent">
                <RevealWord text="Ship" delay={0.7} />{" "}
                <RevealWord text="faster." delay={0.85} />
              </span>
            </h2>

            <motion.p
              className="mt-6 text-slate-300/80 text-base leading-relaxed max-w-md"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 1.1 }}
            >
              One suite for retail, restaurants, textiles, pharmacies, hardware and electronics.
              GST-compliant invoices, KOTs, e-Way Bill, IRN, P&amp;L, cashier shifts &mdash; all in a single dashboard.
            </motion.p>

            {/* Industry tags */}
            <motion.div
              className="mt-8 flex flex-wrap gap-2"
              initial="hidden"
              animate="visible"
              variants={{
                hidden: { opacity: 0 },
                visible: { opacity: 1, transition: { delayChildren: 1.2, staggerChildren: 0.08 } },
              }}
            >
              {industries.map((i) => (
                <motion.div
                  key={i.label}
                  className="flex items-center gap-2 px-3 py-2 rounded-md bg-white/[0.04] border border-white/10 backdrop-blur-sm text-xs text-slate-200 hover:bg-white/[0.08] hover:border-blue-400/40 transition-colors cursor-default"
                  variants={{
                    hidden: { opacity: 0, y: 10 },
                    visible: { opacity: 1, y: 0 },
                  }}
                  whileHover={{ y: -2 }}
                >
                  <i.icon className="w-3.5 h-3.5 text-blue-300" />
                  {i.label}
                </motion.div>
              ))}
            </motion.div>

            {/* Stat pills */}
            <div className="mt-10 grid grid-cols-3 gap-3">
              {stats.map((s, i) => (
                <motion.div
                  key={s.label}
                  className="p-3 rounded-md bg-white/[0.03] border border-white/10 backdrop-blur-sm"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 1.5 + i * 0.1 }}
                >
                  <div className="text-xs font-semibold text-white">{s.label}</div>
                  <div className="text-[10px] text-slate-400 mt-1">{s.sub}</div>
                </motion.div>
              ))}
            </div>
          </div>

          <motion.div
            className="flex items-center justify-between text-[11px] text-slate-500"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2 }}
          >
            <div>© 2026 Sparkbills · SparkCurv Technologies Pvt. Ltd.</div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              256-bit encrypted
            </div>
          </motion.div>
        </div>
      </div>

      {/* ============================================================
           RIGHT — Login form
           ============================================================ */}
      <div className="relative flex items-center justify-center p-6 lg:p-12 min-h-screen">
        {/* subtle radial gradient behind form */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(circle at 70% 30%, rgba(30,58,138,0.06), transparent 60%)",
          }}
        />
        {/* Mobile brand strip */}
        <div className="md:hidden absolute top-6 left-6 flex items-center gap-2">
          <img src="/brand/sparkcurv-icon.png" alt="" className="w-8 h-8" />
          <div className="font-heading font-bold">Sparkbills</div>
        </div>

        <AnimatePresence>
          <motion.form
            key="loginform"
            onSubmit={onSubmit}
            className="relative w-full max-w-md mx-auto space-y-6"
            data-testid="login-form"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div>
              <motion.div
                className="text-[10px] uppercase tracking-[0.3em] text-primary"
                initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
              >
                Welcome back
              </motion.div>
              <motion.h1
                className="font-heading text-4xl lg:text-5xl font-bold tracking-[-0.03em] mt-2"
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
              >
                Sign in.
              </motion.h1>
              <motion.p
                className="text-slate-600 mt-2 text-sm"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                transition={{ delay: 0.45 }}
              >
                Or <Link to="/register" className="text-primary font-semibold hover:underline underline-offset-4">create a new business</Link>.
              </motion.p>
            </div>

            <div className="space-y-4">
              <FloatingField
                icon={Mail}
                label="Email"
                value={email}
                onChange={setEmail}
                type="email"
                testid="login-email"
                delay={0.5}
              />
              <FloatingField
                icon={Lock}
                label="Password"
                value={password}
                onChange={setPassword}
                type={showPw ? "text" : "password"}
                testid="login-password"
                delay={0.6}
                right={
                  <button
                    type="button"
                    onClick={() => setShowPw((s) => !s)}
                    className="text-slate-400 hover:text-primary transition-colors"
                    tabIndex={-1}
                    aria-label="Toggle password visibility"
                  >
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                }
              />
            </div>

            <motion.div
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
            >
              <Button
                type="submit"
                disabled={loading}
                data-testid="login-submit"
                className="w-full h-12 rounded-md bg-gradient-to-r from-[#0F172A] to-[#1E3A8A] hover:from-[#1E293B] hover:to-[#1D4ED8] gap-2 relative overflow-hidden group text-white font-semibold shadow-lg shadow-blue-900/20"
              >
                <span className="relative z-10 flex items-center gap-2">
                  {loading ? (
                    <>
                      <motion.div
                        className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                      />
                      Signing in…
                    </>
                  ) : (
                    <>
                      Sign in
                      <motion.span
                        animate={{ x: [0, 4, 0] }}
                        transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                      >
                        <ArrowRight className="w-4 h-4" />
                      </motion.span>
                    </>
                  )}
                </span>
                {/* Sheen sweep */}
                <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
              </Button>
            </motion.div>

            <motion.div
              className="flex items-center gap-4 text-xs text-slate-400"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              transition={{ delay: 0.9 }}
            >
              <div className="h-px flex-1 bg-slate-200" />
              <div className="uppercase tracking-widest text-[10px]">Secure sign in</div>
              <div className="h-px flex-1 bg-slate-200" />
            </motion.div>

            <motion.div
              className="text-[11px] text-center text-slate-500"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              transition={{ delay: 1.2 }}
            >
              By signing in you agree to our{" "}
              <span className="text-primary hover:underline cursor-pointer">Terms</span>{" "}
              &amp;{" "}
              <span className="text-primary hover:underline cursor-pointer">Privacy Policy</span>.
            </motion.div>
          </motion.form>
        </AnimatePresence>
      </div>
    </div>
  );
}

// ============================================================
// Helpers
// ============================================================
function RevealWord({ text, delay = 0 }) {
  return (
    <span className="inline-block overflow-hidden align-bottom pb-1">
      <motion.span
        className="inline-block"
        initial={{ y: "110%" }}
        animate={{ y: 0 }}
        transition={{ duration: 0.9, delay, ease: [0.16, 1, 0.3, 1] }}
      >
        {text}
      </motion.span>
    </span>
  );
}

function FloatingField({ icon: Icon, label, value, onChange, type, testid, delay = 0, right }) {
  const [focused, setFocused] = useState(false);
  const filled = value && value.length > 0;
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="relative"
    >
      <Label
        className={`absolute left-10 top-1/2 -translate-y-1/2 pointer-events-none transition-all duration-200 ${
          focused || filled
            ? "text-[10px] uppercase tracking-widest text-primary top-2 translate-y-0"
            : "text-sm text-slate-500"
        }`}
      >
        {label}
      </Label>
      <Icon className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${focused ? "text-primary" : "text-slate-400"}`} />
      {right && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 z-10">{right}</div>
      )}
      <Input
        type={type}
        required
        data-testid={testid}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className={`h-14 rounded-md pl-10 pr-10 pt-6 pb-1 bg-white border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all ${
          focused ? "shadow-sm" : ""
        }`}
      />
    </motion.div>
  );
}
