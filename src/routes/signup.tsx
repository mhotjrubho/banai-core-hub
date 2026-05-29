import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

export const Route = createFileRoute("/signup")({ component: SignupPage });

function SignupPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { emailRedirectTo: window.location.origin, data: { full_name: fullName } },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("נרשמת בהצלחה");
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-deep px-4">
      <Card className="w-full max-w-md p-8 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-brand-accent">הרשמה לבני חיל</h1>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2"><Label>שם מלא</Label><Input value={fullName} onChange={(e) => setFullName(e.target.value)} required /></div>
          <div className="space-y-2"><Label>דוא"ל</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required dir="ltr" /></div>
          <div className="space-y-2"><Label>סיסמה</Label><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} dir="ltr" /></div>
          <Button type="submit" className="w-full" disabled={loading}>{loading ? "..." : "הרשמה"}</Button>
        </form>
        <p className="text-center text-sm text-muted-foreground">
          כבר רשום? <Link to="/login" className="text-brand-accent font-semibold hover:underline">התחברות</Link>
        </p>
      </Card>
    </div>
  );
}
