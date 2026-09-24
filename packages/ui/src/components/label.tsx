'use client';

import * as LabelPrimitive from '@radix-ui/react-label';
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '../lib/utils';

const labelVariants = cva(
  'text-xs font-bold leading-none text-gray-700 peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
);

export interface LabelProps
  extends
    React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>,
    VariantProps<typeof labelVariants> {
  /**
   * If `true`, renders a red asterisk after the label text.
   */
  required?: boolean;
  /**
   * If `true`, applies error styling (red text).
   */
  error?: boolean;
}

/**
 * Label component built on Radix UI Label primitive.
 *
 * @example
 * ```tsx
 * <Label htmlFor="email">Email</Label>
 * <Label htmlFor="name" required>Name</Label>
 * <Label error>This field has an error</Label>
 * ```
 */
const Label = React.forwardRef<React.ElementRef<typeof LabelPrimitive.Root>, LabelProps>(
  ({ className, required, error, children, ...props }, ref) => (
    <LabelPrimitive.Root
      ref={ref}
      className={cn(labelVariants(), error && 'text-destructive', className)}
      {...props}
    >
      {children}
      {required && (
        <span className="ml-1 text-destructive" aria-hidden="true">
          *
        </span>
      )}
    </LabelPrimitive.Root>
  ),
);
Label.displayName = LabelPrimitive.Root.displayName;

export { Label, labelVariants };
