import Link from "next/link";
import type { ComponentProps } from "react";

type Variant = "primary" | "secondary" | "ghost" | "lamp" | "night" | "danger" | "night-outline";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 font-semibold whitespace-nowrap transition-[background-color,border-color,color,transform] duration-150 active:translate-y-px disabled:pointer-events-none disabled:opacity-55 select-none";

const variants: Record<Variant, string> = {
  primary: "bg-pine text-white hover:bg-pine-dark",
  secondary: "border border-line-strong bg-surface text-ink hover:border-pine hover:text-pine",
  ghost: "text-pine hover:bg-pine-soft",
  lamp: "bg-lamp text-night hover:bg-[#ffcf6e]",
  night: "bg-night text-lamp hover:bg-night-2",
  danger: "border border-coral/40 bg-surface text-coral hover:bg-coral-soft",
  "night-outline": "border border-night-3 text-night-ink hover:border-lamp hover:text-lamp",
};

const sizes: Record<Size, string> = {
  sm: "min-h-9 rounded-[10px] px-3.5 text-sm",
  md: "min-h-11 rounded-[var(--radius-control)] px-5 text-[0.95rem]",
  lg: "min-h-13 rounded-[14px] px-6 text-base",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", extra = "") {
  return `${base} ${variants[variant]} ${sizes[size]} ${extra}`;
}

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: ComponentProps<"button"> & { variant?: Variant; size?: Size }) {
  return <button className={buttonClass(variant, size, className)} {...props} />;
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return <Link className={buttonClass(variant, size, className)} {...props} />;
}
