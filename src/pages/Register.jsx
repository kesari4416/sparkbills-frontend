import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function Register() {
  const { register, formatApiError } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "", business_name: "", email: "", password: "",
    gstin: "", state: "Karnataka",
  });
  const [loading, setLoading] = useState(false);

  const upd = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await register(form);
      toast.success("Business created!");
      navigate("/app");
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-2xl bg-white p-8 border border-slate-200 space-y-6"
        data-testid="register-form"
      >
        <div>
          <Link to="/" className="text-[10px] uppercase tracking-[0.3em] text-[#1E3A8A]" data-testid="register-back">
            Sparkbills • Sign up
          </Link>
          <h1 className="font-heading text-4xl font-bold tracking-tighter mt-2">Start your business</h1>
          <p className="text-slate-600 mt-2 text-sm">
            Or <Link to="/login" className="text-[#1E3A8A] font-medium">sign in</Link> to an existing account.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label>Your name</Label>
            <Input required data-testid="reg-name" value={form.name} onChange={upd("name")} className="rounded-sm mt-1.5" />
          </div>
          <div>
            <Label>Business name</Label>
            <Input required data-testid="reg-biz" value={form.business_name} onChange={upd("business_name")} className="rounded-sm mt-1.5" />
          </div>
          <div>
            <Label>Email</Label>
            <Input required type="email" data-testid="reg-email" value={form.email} onChange={upd("email")} className="rounded-sm mt-1.5" />
          </div>
          <div>
            <Label>Password</Label>
            <Input required type="password" data-testid="reg-password" value={form.password} onChange={upd("password")} className="rounded-sm mt-1.5" />
          </div>
          <div>
            <Label>GSTIN (optional)</Label>
            <Input data-testid="reg-gstin" value={form.gstin} onChange={upd("gstin")} className="rounded-sm mt-1.5" placeholder="29ABCDE1234F1Z5" />
          </div>
          <div>
            <Label>State</Label>
            <Input data-testid="reg-state" value={form.state} onChange={upd("state")} className="rounded-sm mt-1.5" />
          </div>
        </div>

        <Button
          type="submit" disabled={loading} data-testid="register-submit"
          className="w-full rounded-sm h-11 bg-[#1E3A8A] hover:bg-[#1E40AF]"
        >
          {loading ? "Creating…" : "Create business"}
        </Button>
      </form>
    </div>
  );
}
