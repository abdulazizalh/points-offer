"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useEffect, useId, useRef } from "react";
import { ArrowLeft, Check, CircleAlert, Info, LoaderCircle, Star, X } from "lucide-react";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

// ───────── Button ─────────
type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger" | "success" | "white";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary: "bg-navy text-white hover:bg-deep active:bg-navy shadow-[0_6px_16px_rgba(34,58,94,0.22)]",
  secondary: "bg-pale/70 text-navy hover:bg-pale",
  outline: "border border-line bg-white text-navy hover:border-light hover:bg-bg",
  ghost: "text-navy hover:bg-pale/50",
  danger: "bg-error text-white hover:brightness-95",
  success: "bg-success text-white hover:brightness-95",
  white: "bg-white text-navy hover:bg-bg",
};
const sizes: Record<Size, string> = {
  sm: "h-9 px-3.5 text-[13px] rounded-xl gap-1.5",
  md: "h-11 px-5 text-[14px] rounded-2xl gap-2",
  lg: "h-14 px-6 text-[15px] rounded-2xl gap-2",
};

type BtnProps = {
  variant?: Variant;
  size?: Size;
  full?: boolean;
  loading?: boolean;
  href?: string;
  icon?: React.ReactNode;
} & React.ButtonHTMLAttributes<HTMLButtonElement>;

export function Button({ variant = "primary", size = "md", full, loading, href, icon, className, children, disabled, ...rest }: BtnProps) {
  const cls = cn(
    "inline-flex select-none items-center justify-center font-semibold transition-all duration-150 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-45",
    variants[variant],
    sizes[size],
    full && "w-full",
    className,
  );
  const content = (
    <>
      {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : icon}
      {children}
    </>
  );
  if (href && !disabled)
    return (
      <Link href={href} className={cls}>
        {content}
      </Link>
    );
  return (
    <button type="button" className={cls} disabled={disabled || loading} {...rest}>
      {content}
    </button>
  );
}

export function IconButton({ label, children, className, href, ...rest }: { label: string; href?: string } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const cls = cn("grid h-10 w-10 place-items-center rounded-full text-navy transition hover:bg-pale/60 active:scale-95", className);
  if (href)
    return (
      <Link href={href} aria-label={label} className={cls}>
        {children}
      </Link>
    );
  return (
    <button type="button" aria-label={label} className={cls} {...rest}>
      {children}
    </button>
  );
}

// ───────── Card / Badge ─────────
export function Card({ className, children, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("rounded-[20px] border border-line/70 bg-white shadow-card", className)} {...rest}>
      {children}
    </div>
  );
}

type Tone = "navy" | "blue" | "success" | "warning" | "error" | "muted" | "white";
const tones: Record<Tone, string> = {
  navy: "bg-navy text-white",
  blue: "bg-pale/70 text-deep",
  success: "bg-success/10 text-success",
  warning: "bg-warning/15 text-[#a8711a]",
  error: "bg-error/10 text-error",
  muted: "bg-[#eef3f8] text-muted",
  white: "bg-white/15 text-white",
};

export function Badge({ tone = "blue", children, className, dot }: { tone?: Tone; children: React.ReactNode; className?: string; dot?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold", tones[tone], className)}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

export function DemoBadge({ className }: { className?: string }) {
  const { t } = useStore();
  return (
    <span title={t("demo.banner")} className={cn("inline-flex items-center rounded-md border border-warning/40 bg-warning/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#9a6514]", className)}>
      {t("demo.short")}
    </span>
  );
}

// ───────── Form ─────────
export function Field({ label, error, hint, children, htmlFor }: { label?: string; error?: string; hint?: string; children: React.ReactNode; htmlFor?: string }) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={htmlFor} className="block text-[13px] font-medium text-navy">
          {label}
        </label>
      )}
      {children}
      {error ? <p className="text-[12px] text-error" role="alert">{error}</p> : hint ? <p className="text-[12px] text-muted">{hint}</p> : null}
    </div>
  );
}

const inputCls =
  "w-full rounded-2xl border border-line bg-white px-4 text-[15px] text-navy placeholder:text-muted/70 outline-none transition focus:border-accent focus:ring-4 focus:ring-pale/60 disabled:bg-bg";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }>(function Input(
  { className, invalid, ...rest },
  ref,
) {
  return <input ref={ref} className={cn(inputCls, "h-12", invalid && "border-error focus:border-error focus:ring-error/10", className)} {...rest} />;
});

export function Textarea({ className, ...rest }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(inputCls, "min-h-[110px] py-3", className)} {...rest} />;
}

export function Select({ className, children, ...rest }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(inputCls, "h-12 appearance-none bg-[length:16px] pe-10", className)} {...rest}>
      {children}
    </select>
  );
}

export function Toggle({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn("relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-40", checked ? "bg-medium" : "bg-[#d6e0ea]")}
    >
      <span className={cn("absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all", checked ? "start-[22px]" : "start-0.5")} />
    </button>
  );
}

export function Segmented<T extends string>({ value, options, onChange, className }: { value: T; options: Array<{ value: T; label: React.ReactNode }>; onChange: (v: T) => void; className?: string }) {
  return (
    <div className={cn("inline-flex rounded-2xl bg-[#e8eff7] p-1", className)} role="tablist">
      {options.map((o) => (
        <button
          type="button"
          key={o.value}
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "flex-1 whitespace-nowrap rounded-xl px-4 py-2 text-[13px] font-semibold transition",
            value === o.value ? "bg-white text-navy shadow-soft" : "text-muted hover:text-navy",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Chip({ active, onClick, children, icon }: { active?: boolean; onClick?: () => void; children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-medium transition",
        active ? "border-navy bg-navy text-white" : "border-line bg-white text-navy hover:border-light",
      )}
    >
      {icon}
      {children}
    </button>
  );
}

// ───────── Stars ─────────
export function Stars({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${value} / 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} style={{ width: size, height: size }} className={i <= Math.round(value) ? "fill-warning text-warning" : "fill-line text-line"} />
      ))}
    </span>
  );
}

export function StarInput({ value, onChange, label }: { value: number; onChange: (n: number) => void; label: string }) {
  return (
    <div className="flex items-center gap-1" role="radiogroup" aria-label={label}>
      {[1, 2, 3, 4, 5].map((i) => (
        <button key={i} type="button" role="radio" aria-checked={value === i} aria-label={`${i}`} onClick={() => onChange(i)} className="p-1 transition active:scale-90">
          <Star className={cn("h-8 w-8 transition", i <= value ? "fill-warning text-warning" : "fill-[#eef3f8] text-line")} />
        </button>
      ))}
    </div>
  );
}

// ───────── Avatar / business logo ─────────
export function Avatar({ name, hue = 210, size = 40 }: { name: string; hue?: number; size?: number }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
  return (
    <span
      className="grid shrink-0 place-items-center rounded-full font-semibold text-white"
      style={{ width: size, height: size, fontSize: size * 0.36, background: `linear-gradient(135deg, hsl(${hue} 45% 42%), hsl(${hue} 50% 60%))` }}
      aria-hidden
    >
      {initials}
    </span>
  );
}

export function BizLogo({ initials, hue, size = 48, className }: { initials: string; hue: number; size?: number; className?: string }) {
  return (
    <span
      className={cn("grid shrink-0 place-items-center rounded-2xl font-bold text-white", className)}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.32,
        letterSpacing: "0.04em",
        background: `linear-gradient(140deg, hsl(${hue} 42% 34%), hsl(${hue} 48% 52%))`,
        fontFamily: "var(--font-inter)",
      }}
      aria-hidden
    >
      {initials}
    </span>
  );
}

// ───────── Modal / Sheet ─────────
export function Sheet({ open, onClose, title, children, footer, wide }: { open: boolean; onClose: () => void; title?: string; children: React.ReactNode; footer?: React.ReactNode; wide?: boolean }) {
  const titleId = useId();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.activeElement as HTMLElement | null;
    setTimeout(() => ref.current?.querySelector<HTMLElement>("input,textarea,select,button:not([data-close])")?.focus(), 50);
    return () => {
      document.removeEventListener("keydown", onKey);
      prev?.focus?.();
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-labelledby={title ? titleId : undefined}>
      <div className="absolute inset-0 animate-fade-in bg-navy/40 backdrop-blur-[2px]" onClick={onClose} />
      <div
        ref={ref}
        className={cn(
          "relative max-h-[92vh] w-full animate-sheet overflow-y-auto rounded-t-[28px] bg-white shadow-float sm:animate-pop sm:rounded-[28px]",
          wide ? "sm:max-w-2xl" : "sm:max-w-md",
        )}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between bg-white/95 px-5 pb-2 pt-4 backdrop-blur">
          <div className="absolute start-1/2 top-2 h-1 w-10 -translate-x-1/2 rounded-full bg-line sm:hidden rtl:translate-x-1/2" />
          {title ? (
            <h2 id={titleId} className="text-[17px] font-semibold text-navy">
              {title}
            </h2>
          ) : (
            <span />
          )}
          <IconButton label="Close" onClick={onClose} data-close className="-me-2">
            <X className="h-5 w-5" />
          </IconButton>
        </div>
        <div className="px-5 pb-5">{children}</div>
        {footer && <div className="sticky bottom-0 border-t border-line bg-white px-5 py-4">{footer}</div>}
      </div>
    </div>
  );
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  body,
  confirmLabel,
  cancelLabel,
  danger,
  icon,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  body: React.ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  danger?: boolean;
  icon?: React.ReactNode;
  loading?: boolean;
}) {
  const { t } = useStore();
  return (
    <Sheet open={open} onClose={onClose}>
      <div className="flex flex-col items-center pb-2 text-center">
        {icon && <div className={cn("mb-4 grid h-14 w-14 place-items-center rounded-full", danger ? "bg-error/10 text-error" : "bg-pale/70 text-deep")}>{icon}</div>}
        <h2 className="text-[19px] font-semibold text-navy">{title}</h2>
        <div className="mt-2 text-[14px] leading-relaxed text-muted">{body}</div>
        <div className="mt-6 grid w-full gap-2.5">
          <Button variant={danger ? "danger" : "primary"} size="lg" full onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
          <Button variant="ghost" size="lg" full onClick={onClose}>
            {cancelLabel ?? t("common.cancel")}
          </Button>
        </div>
      </div>
    </Sheet>
  );
}

// ───────── States ─────────
export function EmptyState({ icon, title, sub, action }: { icon: React.ReactNode; title: string; sub?: string; action?: React.ReactNode }) {
  return (
    <div className="flex animate-fade-in flex-col items-center px-6 py-14 text-center">
      <div className="relative mb-5 grid h-20 w-20 place-items-center rounded-[28px] bg-gradient-to-br from-pale to-bg text-deep">
        <div className="absolute inset-0 rounded-[28px] ring-1 ring-inset ring-light/40" />
        {icon}
      </div>
      <h3 className="text-[17px] font-semibold text-navy">{title}</h3>
      {sub && <p className="mt-1.5 max-w-[280px] text-[14px] leading-relaxed text-muted">{sub}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton rounded-xl", className)} />;
}

export function Spinner({ className }: { className?: string }) {
  return <LoaderCircle className={cn("h-5 w-5 animate-spin text-medium", className)} />;
}

// ───────── Toasts ─────────
export function ToastViewport() {
  const { toasts } = useStore();
  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-[60] flex flex-col items-center gap-2 px-4" aria-live="polite">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            "pointer-events-auto flex max-w-sm animate-slide-up items-center gap-2.5 rounded-2xl px-4 py-3 text-[13.5px] font-medium shadow-float",
            t.kind === "error" ? "bg-error text-white" : t.kind === "info" ? "bg-white text-navy" : "bg-navy text-white",
          )}
          role={t.kind === "error" ? "alert" : "status"}
        >
          {t.kind === "error" ? <CircleAlert className="h-4 w-4 shrink-0" /> : t.kind === "info" ? <Info className="h-4 w-4 shrink-0 text-medium" /> : <Check className="h-4 w-4 shrink-0" />}
          {t.text}
        </div>
      ))}
    </div>
  );
}

// ───────── Headers ─────────
export function BackButton({ href, className }: { href?: string; className?: string }) {
  const router = useRouter();
  const { t } = useStore();
  return (
    <IconButton
      label={t("common.back")}
      className={cn("-ms-2", className)}
      onClick={() => {
        if (href) router.push(href);
        else if (window.history.length > 1) router.back();
        else router.push("/home");
      }}
    >
      <ArrowLeft className="rtl-flip h-5 w-5" />
    </IconButton>
  );
}

export function PageHeader({ title, back = true, backHref, right, sub, transparent }: { title?: React.ReactNode; back?: boolean; backHref?: string; right?: React.ReactNode; sub?: React.ReactNode; transparent?: boolean }) {
  return (
    <header className={cn("sticky top-0 z-30 px-4 pb-2 pt-3", transparent ? "" : "bg-bg/90 backdrop-blur-md")}>
      <div className="flex min-h-11 items-center gap-1">
        {back && <BackButton href={backHref} />}
        <div className="min-w-0 flex-1">
          {title && <h1 className="truncate text-[18px] font-semibold text-navy">{title}</h1>}
          {sub && <p className="truncate text-[12px] text-muted">{sub}</p>}
        </div>
        {right}
      </div>
    </header>
  );
}

export function SectionTitle({ title, action, href }: { title: string; action?: string; href?: string }) {
  return (
    <div className="mb-3 flex items-end justify-between px-5">
      <h2 className="text-[16px] font-semibold text-navy">{title}</h2>
      {action && href && (
        <Link href={href} className="text-[13px] font-medium text-medium hover:text-deep">
          {action}
        </Link>
      )}
    </div>
  );
}
