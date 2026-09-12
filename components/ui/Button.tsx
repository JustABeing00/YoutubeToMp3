import { ButtonHTMLAttributes, forwardRef } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "translucent" | "ghost" | "danger";
  loading?: boolean;
};

/**
 * Framer buttons — every CTA is a pill.
 * primary: white pill on dark. secondary: charcoal pill. No bordered ghosts.
 */
export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = "primary", loading, className = "", disabled, children, ...rest },
  ref
) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-full px-[15px] py-2.5 text-sm font-medium tracking-[-0.14px] leading-none transition active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 min-h-[44px]";
  const styles = {
    primary: "bg-white text-black hover:bg-neutral-200",
    secondary: "bg-surface1 text-ink hover:bg-surface2",
    translucent: "bg-surface2 text-ink hover:brightness-125",
    ghost: "text-inkmuted hover:text-ink hover:bg-surface1",
    danger: "bg-surface1 text-[#ff8080] hover:bg-surface2",
  } as const;
  return (
    <button ref={ref} disabled={disabled || loading} className={`${base} ${styles[variant]} ${className}`} {...rest}>
      {loading && (
        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
          <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
      )}
      {children}
    </button>
  );
});
