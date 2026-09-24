import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import * as React from 'react';

import { cn } from '../lib/utils';

const buttonVariants = cva(
  'inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-2xl text-sm font-black transition-all duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/20 active:scale-95 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:scale-[1.02] hover:bg-primary/90',
        destructive:
          'bg-destructive text-destructive-foreground shadow-lg shadow-destructive/20 hover:bg-destructive/90',
        outline:
          'border border-foreground/[0.06] bg-card text-foreground shadow-sm hover:bg-secondary',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-accent',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-11 px-5 py-2.5',
        sm: 'h-9 px-4 text-xs',
        lg: 'h-12 px-8',
        icon: 'h-11 w-11',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  /**
   * If `true`, the button will render as its child element (using Radix Slot),
   * merging the button's props and styles into the child.
   *
   * Useful for composing with `<Link>` or other navigational components.
   */
  asChild?: boolean;
  /**
   * If `true`, shows a loading spinner and disables the button.
   */
  loading?: boolean;
}

/**
 * Button component with multiple variants and sizes.
 *
 * @example
 * ```tsx
 * <Button variant="default">Click me</Button>
 * <Button variant="destructive" size="sm">Delete</Button>
 * <Button loading>Saving...</Button>
 * <Button asChild>
 *   <Link href="/shop">Go to shop</Link>
 * </Button>
 * ```
 */
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant, size, asChild = false, loading = false, disabled, children, ...props },
    ref,
  ) => {
    const Comp = asChild ? Slot : 'button';

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {asChild ? (
          children
        ) : (
          <>
            {loading && <Loader2 className="animate-spin" />}
            {children}
          </>
        )}
      </Comp>
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
