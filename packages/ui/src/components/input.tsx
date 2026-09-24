import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '../lib/utils';

const inputVariants = cva(
  'flex w-full rounded-2xl border border-foreground/[0.06] bg-card text-sm font-medium shadow-sm file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground/70 focus-visible:outline-none focus-visible:border-primary/40 focus-visible:ring-4 focus-visible:ring-ring/10 disabled:cursor-not-allowed disabled:opacity-50 transition-all',
  {
    variants: {
      inputSize: {
        default: 'h-12 px-4 py-2',
        sm: 'h-10 px-4 py-1 text-xs',
        lg: 'h-14 px-5 py-2',
      },
    },
    defaultVariants: {
      inputSize: 'default',
    },
  },
);

export interface InputProps
  extends
    Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof inputVariants> {
  /**
   * If `true`, applies error styling (red border & focus ring).
   */
  error?: boolean;
  /**
   * Optional icon rendered at the start (left side) of the input.
   */
  startIcon?: React.ReactNode;
  /**
   * Optional icon rendered at the end (right side) of the input.
   */
  endIcon?: React.ReactNode;
}

/**
 * Input component with size variants, error state, and icon support.
 *
 * @example
 * ```tsx
 * <Input placeholder="Email" />
 * <Input inputSize="sm" error />
 * <Input startIcon={<Search className="h-4 w-4" />} placeholder="Search..." />
 * ```
 */
const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, inputSize, error, startIcon, endIcon, ...props }, ref) => {
    if (startIcon || endIcon) {
      return (
        <div className="relative">
          {startIcon && (
            <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
              {startIcon}
            </div>
          )}
          <input
            type={type}
            className={cn(
              inputVariants({ inputSize }),
              error && 'border-destructive focus-visible:ring-destructive',
              startIcon && 'pl-11',
              endIcon && 'pr-11',
              className,
            )}
            ref={ref}
            aria-invalid={error || undefined}
            {...props}
          />
          {endIcon && (
            <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground">
              {endIcon}
            </div>
          )}
        </div>
      );
    }

    return (
      <input
        type={type}
        className={cn(
          inputVariants({ inputSize }),
          error && 'border-destructive focus-visible:ring-destructive',
          className,
        )}
        ref={ref}
        aria-invalid={error || undefined}
        {...props}
      />
    );
  },
);
Input.displayName = 'Input';

export { Input, inputVariants };
