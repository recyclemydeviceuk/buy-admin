import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, ShieldCheck } from 'lucide-react';
import { api } from '../api';
import { useAuth } from '../store/auth';
import { Button } from '../components/ui/Button';
import { Field } from '../components/ui/Field';
import { cn } from '../lib/cn';

export default function Login() {
  const { user, ready, signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [digits, setDigits] = useState<string[]>(Array(6).fill(''));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const refs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (!resendIn) return;
    const t = setTimeout(() => setResendIn((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  if (ready && user) return <Navigate to={(location.state as { from?: string } | null)?.from ?? '/'} replace />;

  async function sendCode(e?: FormEvent) {
    e?.preventDefault();
    setError(null);
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) return setError('Enter the email address on the admin list.');
    setBusy(true);
    try {
      await api.requestOtp(email.trim());
      setStep('code');
      setDigits(Array(6).fill(''));
      setResendIn(30);
      setTimeout(() => refs.current[0]?.focus(), 50);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send the code.');
    } finally {
      setBusy(false);
    }
  }

  async function verify(code = digits.join('')) {
    if (code.length !== 6) return setError('Enter all six digits.');
    setError(null);
    setBusy(true);
    try {
      const s = await api.verifyOtp(email.trim(), code);
      signIn(s.user, s.role);
      navigate((location.state as { from?: string } | null)?.from ?? '/', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not verify the code.');
      setBusy(false);
    }
  }

  function setDigit(i: number, v: string) {
    const clean = v.replace(/\D/g, '');
    if (clean.length > 1) {
      const next = [...digits];
      clean.split('').slice(0, 6 - i).forEach((d, j) => (next[i + j] = d));
      setDigits(next);
      const last = Math.min(5, i + clean.length - 1);
      refs.current[last]?.focus();
      if (next.every(Boolean)) void verify(next.join(''));
      return;
    }
    const next = [...digits];
    next[i] = clean;
    setDigits(next);
    if (clean && i < 5) refs.current[i + 1]?.focus();
    if (clean && next.every(Boolean)) void verify(next.join(''));
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-cream px-5 py-10">
      <div className="w-full max-w-[420px]">
        <div className="mb-8 flex items-center gap-3">
          <img src="/brand/cmm-logo.png" alt="CashMyMobile" className="h-8 w-auto" />
          <span className="rounded-full bg-ink px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white">Buy admin</span>
        </div>
        <div className="rounded-[32px] border border-line bg-white p-7 shadow-card md:p-9">
          {step === 'email' ? (
            <form onSubmit={sendCode} noValidate>
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-tint-mint text-success"><ShieldCheck size={20} /></span>
              <h1 className="mt-5 text-[26px] leading-tight">Sign in to the <span className="serif-accent text-ink-3">buy</span> admin</h1>
              <p className="mt-2 text-[14px] text-ink-3">We will email a six-digit code to your admin address. No passwords.</p>
              <Field label="Admin email" name="email" type="email" autoComplete="email" autoFocus className="mt-6" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@cashmymobile.co.uk" error={error ?? undefined} />
              <Button type="submit" className="mt-5 w-full" loading={busy}>Send code <ArrowRight size={16} /></Button>
            </form>
          ) : (
            <div>
              <button onClick={() => { setStep('email'); setError(null); }} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink-3 hover:text-ink"><ArrowLeft size={14} /> Use a different email</button>
              <h1 className="mt-5 text-[26px] leading-tight">Enter the code</h1>
              <p className="mt-2 text-[14px] text-ink-3">Sent to <b className="text-ink">{email}</b>. It expires in 10 minutes.</p>
              <div className="mt-6 flex justify-between gap-2" onPaste={(e) => { e.preventDefault(); setDigit(0, e.clipboardData.getData('text')); }}>
                {digits.map((d, i) => (
                  <input
                    key={i}
                    ref={(el) => (refs.current[i] = el)}
                    value={d}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    onChange={(e) => setDigit(i, e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Backspace' && !digits[i] && i > 0) refs.current[i - 1]?.focus(); }}
                    className={cn('h-14 w-full rounded-2xl border border-line bg-white text-center font-mono text-2xl font-medium transition-all focus:border-ink focus:outline-none focus:ring-4 focus:ring-ink/5', error && 'border-brand-600')}
                    aria-label={`Digit ${i + 1}`}
                  />
                ))}
              </div>
              {error && <p className="mt-3 text-xs font-semibold text-brand-600">{error}</p>}
              <Button onClick={() => void verify()} className="mt-5 w-full" loading={busy}>Verify and sign in</Button>
              <button disabled={resendIn > 0 || busy} onClick={() => void sendCode()} className="mt-4 w-full text-center text-[13px] font-semibold text-ink-3 hover:text-ink disabled:opacity-50">{resendIn > 0 ? `Resend code in ${resendIn}s` : 'Resend code'}</button>
            </div>
          )}
        </div>
        <p className="mt-6 text-center text-xs text-ink-3">Access is limited to the admin allowlist. Need access? Ask the account owner.</p>
      </div>
    </div>
  );
}
