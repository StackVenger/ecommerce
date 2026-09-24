import { Loader2, type LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

// ──────────────────────────────────────────────────────────
// Bento design-system primitives
//
// Thin wrappers over the `.bento-*` / `.eyebrow` / `.pill` classes in
// app/globals.css so pages compose the same surfaces, headings and
// states instead of re-typing long class strings. All are plain
// (server-safe) components.
// ──────────────────────────────────────────────────────────

type Tone =
  | 'brand'
  | 'blue'
  | 'emerald'
  | 'orange'
  | 'purple'
  | 'rose'
  | 'indigo'
  | 'amber'
  | 'gray';

/** Soft background + foreground pairs for icon tiles, matching the reference palette. */
export const TONE_CLASSES: Record<Tone, string> = {
  brand: 'bg-brand-50 text-brand-600',
  blue: 'bg-blue-50 text-blue-500',
  emerald: 'bg-emerald-50 text-emerald-500',
  orange: 'bg-orange-50 text-orange-500',
  purple: 'bg-purple-50 text-purple-500',
  rose: 'bg-rose-50 text-rose-500',
  indigo: 'bg-indigo-50 text-indigo-500',
  amber: 'bg-amber-50 text-amber-500',
  gray: 'bg-gray-100 text-gray-600',
};

export type BentoTone = Tone;

// ─── Surfaces ─────────────────────────────────────────────

interface BentoCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** `default` white tile, `primary` coral tile, `dark` ink tile, `muted` inset tile. */
  variant?: 'default' | 'primary' | 'dark' | 'muted';
  /** Adds the lift-on-hover treatment for clickable tiles. */
  interactive?: boolean;
  /** Padding preset; `none` for tiles that manage their own spacing (tables, media). */
  padding?: 'none' | 'sm' | 'md' | 'lg';
  as?: 'div' | 'section' | 'article' | 'aside';
}

const PADDING = {
  none: '',
  sm: 'p-5',
  md: 'p-6 sm:p-8',
  lg: 'p-6 sm:p-10',
};

export function BentoCard({
  variant = 'default',
  interactive = false,
  padding = 'md',
  as: Comp = 'div',
  className,
  children,
  ...props
}: BentoCardProps) {
  return (
    <Comp
      className={cn(
        variant === 'default' && 'bento-card',
        variant === 'primary' && 'bento-primary',
        variant === 'dark' && 'bento-dark',
        variant === 'muted' && 'bento-tile',
        interactive && 'bento-card-hover',
        PADDING[padding],
        className,
      )}
      {...props}
    >
      {(variant === 'primary' || variant === 'dark') && <BentoGlow variant={variant} />}
      {variant === 'primary' || variant === 'dark' ? (
        <div className="relative z-10 h-full">{children}</div>
      ) : (
        children
      )}
    </Comp>
  );
}

/** Decorative blurred blobs used behind coral / ink tiles. */
export function BentoGlow({ variant = 'primary' }: { variant?: 'primary' | 'dark' }) {
  return variant === 'dark' ? (
    <>
      <div className="bento-glow -right-10 -top-10 h-64 w-64 bg-primary/20" aria-hidden />
      <div className="bento-glow -bottom-10 -left-10 h-48 w-48 bg-blue-500/10" aria-hidden />
    </>
  ) : (
    <>
      <div className="bento-glow -right-12 -top-12 h-48 w-48 bg-white/10" aria-hidden />
      <div className="bento-glow -bottom-12 -left-12 h-48 w-48 bg-black/10" aria-hidden />
    </>
  );
}

// ─── Typography ───────────────────────────────────────────

export function Eyebrow({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('eyebrow', className)} {...props} />;
}

interface PageHeaderProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Right-aligned actions (buttons, search). Wraps under the title on small screens. */
  actions?: React.ReactNode;
  /** Optional element above the title (breadcrumb / back link). */
  eyebrow?: React.ReactNode;
  className?: string;
}

/** Page-level heading block: heavy tight title + muted bold subtitle + actions. */
export function PageHeader({ title, description, actions, eyebrow, className }: PageHeaderProps) {
  return (
    <div
      className={cn(
        'mb-6 flex flex-col gap-4 sm:mb-8 md:flex-row md:items-center md:justify-between',
        className,
      )}
    >
      <div className="flex min-w-0 flex-col gap-1">
        {eyebrow}
        <h1 className="page-title">{title}</h1>
        {description && <p className="page-subtitle">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 sm:gap-3">{actions}</div>}
    </div>
  );
}

interface SectionHeaderProps {
  title: React.ReactNode;
  /** Small uppercase caption under the title. */
  caption?: React.ReactNode;
  action?: React.ReactNode;
  icon?: LucideIcon;
  className?: string;
  as?: 'h2' | 'h3';
}

/** Card-level heading: `text-xl font-black` title + eyebrow caption + trailing action. */
export function SectionHeader({
  title,
  caption,
  action,
  icon: Icon,
  className,
  as: Heading = 'h3',
}: SectionHeaderProps) {
  return (
    <div className={cn('mb-6 flex items-start justify-between gap-4', className)}>
      <div className="flex min-w-0 items-center gap-3">
        {Icon && (
          <div className="icon-tile h-10 w-10 rounded-xl bg-brand-50 text-brand-600">
            <Icon className="h-5 w-5" strokeWidth={2.25} />
          </div>
        )}
        <div className="flex min-w-0 flex-col gap-1">
          <Heading className="section-title truncate">{title}</Heading>
          {caption && <p className="eyebrow">{caption}</p>}
        </div>
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </div>
  );
}

// ─── Data display ─────────────────────────────────────────

interface IconTileProps {
  icon: LucideIcon;
  tone?: Tone;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function IconTile({ icon: Icon, tone = 'brand', size = 'md', className }: IconTileProps) {
  return (
    <div
      className={cn(
        'icon-tile',
        size === 'sm' && 'h-10 w-10 rounded-xl',
        size === 'lg' && 'h-16 w-16',
        TONE_CLASSES[tone],
        className,
      )}
    >
      <Icon
        className={cn(size === 'sm' ? 'h-5 w-5' : size === 'lg' ? 'h-8 w-8' : 'h-6 w-6')}
        strokeWidth={2.25}
      />
    </div>
  );
}

interface StatCardProps {
  label: React.ReactNode;
  value: React.ReactNode;
  icon?: LucideIcon;
  tone?: Tone;
  /** Percentage change; positive renders an emerald pill, negative a rose pill. */
  change?: number | null;
  /** Caption shown next to the change pill ("vs last month"). */
  hint?: React.ReactNode;
  /** `center` mirrors the reference quick-stat tiles; `left` suits denser grids. */
  align?: 'center' | 'left';
  className?: string;
  loading?: boolean;
}

/** Quick-stat bento tile: icon tile, heavy tabular number, eyebrow label. */
export function StatCard({
  label,
  value,
  icon,
  tone = 'brand',
  change,
  hint,
  align = 'center',
  className,
  loading = false,
}: StatCardProps) {
  const centered = align === 'center';
  return (
    <div
      className={cn(
        'bento-card bento-card-hover group flex flex-col p-6',
        centered ? 'items-center justify-center text-center' : 'items-start',
        className,
      )}
    >
      {icon && (
        <IconTile
          icon={icon}
          tone={tone}
          className={cn('group-hover:scale-110', centered ? 'mb-5' : 'mb-4')}
        />
      )}
      {loading ? (
        <div className="mb-2 h-8 w-24 animate-pulse rounded-xl bg-gray-100" />
      ) : (
        <p className="stat-value mb-1 text-2xl sm:text-3xl">{value}</p>
      )}
      <p className="eyebrow">{label}</p>
      {(change !== undefined && change !== null) || hint ? (
        <div className={cn('mt-3 flex items-center gap-2', centered && 'justify-center')}>
          {change !== undefined && change !== null && <TrendPill value={change} />}
          {hint && <span className="text-[11px] font-bold text-gray-400">{hint}</span>}
        </div>
      ) : null}
    </div>
  );
}

/** Emerald / rose percentage pill used next to KPIs. */
export function TrendPill({ value, className }: { value: number; className?: string }) {
  const up = value >= 0;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-xl px-2.5 py-1 text-[10px] font-black tabular-nums',
        up ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600',
        className,
      )}
    >
      {up ? '↑' : '↓'} {Math.abs(value).toFixed(1)}%
    </span>
  );
}

type PillTone = 'success' | 'warning' | 'danger' | 'info' | 'brand' | 'neutral' | 'purple';

// Literal class names so Tailwind's content scan keeps every variant.
const PILL_TONES: Record<PillTone, string> = {
  success: 'pill-success',
  warning: 'pill-warning',
  danger: 'pill-danger',
  info: 'pill-info',
  brand: 'pill-brand',
  neutral: 'pill-neutral',
  purple: 'pill-purple',
};

export function StatusPill({
  tone = 'neutral',
  className,
  children,
}: {
  tone?: PillTone;
  className?: string;
  children: React.ReactNode;
}) {
  return <span className={cn('pill', PILL_TONES[tone], className)}>{children}</span>;
}

// ─── States ───────────────────────────────────────────────

interface EmptyStateProps {
  icon?: LucideIcon;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  /** Render without the surrounding bento card (when already inside one). */
  bare?: boolean;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  bare = false,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center px-6 py-14 text-center',
        !bare && 'bento-card',
        className,
      )}
    >
      {Icon && (
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
          <Icon className="h-8 w-8" strokeWidth={2.25} />
        </div>
      )}
      <h3 className="text-lg font-black tracking-tight text-gray-900">{title}</h3>
      {description && (
        <p className="mt-2 max-w-sm text-sm font-medium text-gray-500">{description}</p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function LoadingState({
  label = 'Loading…',
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div
      className={cn('flex flex-col items-center justify-center gap-3 py-16', className)}
      role="status"
    >
      <Loader2 className="h-8 w-8 animate-spin text-primary" strokeWidth={2.5} />
      <p className="eyebrow">{label}</p>
    </div>
  );
}

/** Rounded shimmer block for skeleton layouts. */
export function SkeletonBlock({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-2xl bg-gray-100', className)} />;
}
