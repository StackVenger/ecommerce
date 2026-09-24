import { cva, type VariantProps } from 'class-variance-authority';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, type LucideIcon } from 'lucide-react';
import * as React from 'react';

import { cn } from '../lib/utils';

const alertVariants = cva(
  'relative w-full rounded-2xl border p-4 text-sm font-medium [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground',
  {
    variants: {
      variant: {
        default: 'bg-background text-foreground',
        destructive:
          'border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive',
        success:
          'border-green-500/50 bg-green-50 text-green-900 dark:bg-green-950 dark:text-green-100 [&>svg]:text-green-600 dark:[&>svg]:text-green-400',
        warning:
          'border-yellow-500/50 bg-yellow-50 text-yellow-900 dark:bg-yellow-950 dark:text-yellow-100 [&>svg]:text-yellow-600 dark:[&>svg]:text-yellow-400',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

const variantIconMap: Record<string, LucideIcon> = {
  default: Info,
  destructive: AlertCircle,
  success: CheckCircle2,
  warning: AlertTriangle,
};

export interface AlertProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof alertVariants> {
  /**
   * Optional custom icon. If omitted, a sensible default is chosen
   * based on the `variant`.
   */
  icon?: LucideIcon;
}

/**
 * Alert — contextual feedback messages for user actions.
 *
 * @example
 * ```tsx
 * <Alert variant="success">
 *   <AlertTitle>Order placed!</AlertTitle>
 *   <AlertDescription>
 *     Your order #1234 has been confirmed.
 *   </AlertDescription>
 * </Alert>
 *
 * <Alert variant="destructive">
 *   <AlertTitle>Payment failed</AlertTitle>
 *   <AlertDescription>
 *     Your card was declined. Please try again.
 *   </AlertDescription>
 * </Alert>
 * ```
 */
const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant = 'default', icon, children, ...props }, ref) => {
    const Icon = icon ?? variantIconMap[variant ?? 'default'] ?? Info;

    return (
      <div ref={ref} role="alert" className={cn(alertVariants({ variant }), className)} {...props}>
        <Icon className="h-4 w-4" />
        {children}
      </div>
    );
  },
);
Alert.displayName = 'Alert';

/**
 * AlertTitle — heading within an Alert.
 */
const AlertTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h5
      ref={ref}
      className={cn('mb-1 font-medium leading-none tracking-tight', className)}
      {...props}
    />
  ),
);
AlertTitle.displayName = 'AlertTitle';

/**
 * AlertDescription — secondary text within an Alert.
 */
const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('text-sm [&_p]:leading-relaxed', className)} {...props} />
));
AlertDescription.displayName = 'AlertDescription';

export { Alert, AlertTitle, AlertDescription, alertVariants };
