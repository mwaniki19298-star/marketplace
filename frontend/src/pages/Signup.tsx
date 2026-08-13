import { Chrome, LockKeyhole, Mail, UserRound } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";

export default function Signup() {
  return (
    <div className="min-h-screen bg-surface-alt px-4 py-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md flex-col justify-center">
        <div className="mb-8 flex items-center justify-between lg:hidden">
          <Link to="/" className="font-display text-xl font-semibold tracking-tight text-ink">Create account</Link>
          <span className="rounded-full border border-border bg-surface px-3 py-1.5 text-[11px] font-semibold text-ink-faint">Sign up</span>
        </div>
        <div className="mt-8 rounded-2xl border border-border bg-surface p-6 shadow-card sm:p-8">
          <h1 className="font-display text-3xl text-ink">Create your account</h1>
          <p className="mt-1 text-sm text-ink-faint">Buy something useful or open your own store.</p>
          <button className="mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-border-strong bg-surface text-sm font-semibold text-ink hover:bg-surface-sunken"><Chrome className="h-4 w-4"/> Continue with Google</button>
          <div className="my-5 flex items-center gap-3 text-xs text-ink-faint"><span className="h-px flex-1 bg-border"/><span>or use email</span><span className="h-px flex-1 bg-border"/></div>
          <div className="space-y-4">
            <Field icon={UserRound} label="Full name"><input className="field" placeholder="Your name"/></Field>
            <Field icon={Mail} label="Email"><input className="field" type="email" placeholder="you@example.com"/></Field>
            <Field icon={LockKeyhole} label="Password"><input className="field" type="password" placeholder="At least 8 characters"/></Field>
            <button className="h-11 w-full rounded-lg bg-accent text-sm font-semibold text-white hover:bg-accent-strong">Create account</button>
          </div>
          <p className="mt-5 text-center text-sm text-ink-faint">Already have an account? <Link to="/login" className="font-semibold text-accent">Sign in</Link></p>
          <p className="mt-4 text-center text-[11px] leading-relaxed text-ink-faint">By continuing, you agree to the Marketplace community rules and terms.</p>
        </div>
      </div>
    </div>
  );
}
function Field({icon:Icon,label,children}:{icon:typeof Mail;label:string;children:ReactNode}){return <label className="block space-y-1.5"><span className="flex items-center gap-2 text-sm font-semibold text-ink"><Icon className="h-4 w-4 text-ink-faint"/>{label}</span>{children}</label>}
