import * as React from 'react';

import { cn } from '../lib/utils';

/**
 * Skeleton — a pulsing placeholder used to indicate loading state.
 *
 * Apply `className` to control the width and height, matching the
 * approximate dimensions of the content it replaces.
 *
 * @example
 * ```tsx
 * // Text placeholder
 * <Skeleton className="h-4 w-[250px]" />
 *
 * // Avatar placeholder
 * <Skeleton className="h-12 w-12 rounded-full" />
 *
 * // Card placeholder
 * <div className="flex items-center space-x-4">
 *   <Skeleton className="h-12 w-12 rounded-full" />
 *   <div className="space-y-2">
 *     <Skeleton className="h-4 w-[250px]" />
 *     <Skeleton className="h-4 w-[200px]" />
 *   </div>
 * </div>
 * ```
 */
function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('animate-pulse rounded-2xl bg-muted', className)}
      aria-hidden="true"
      {...props}
    />
  );
}

export { Skeleton };
