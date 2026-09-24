import { SkeletonBlock } from '@/components/ui/bento';

export default function AdminLoading() {
  return (
    <div role="status" aria-label="Loading">
      <div className="mb-8 flex flex-col gap-2">
        <SkeletonBlock className="h-8 w-48" />
        <SkeletonBlock className="h-4 w-72" />
      </div>

      {/* Bento skeleton — mirrors the dashboard rhythm */}
      <div className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-6 xl:grid-cols-12">
        <SkeletonBlock className="col-span-2 h-72 rounded-[2rem] md:col-span-6 xl:col-span-4" />
        <SkeletonBlock className="h-72 rounded-[2rem] md:col-span-3 xl:col-span-2" />
        <SkeletonBlock className="h-72 rounded-[2rem] md:col-span-3 xl:col-span-2" />
        <SkeletonBlock className="col-span-2 h-72 rounded-[2rem] md:col-span-6 xl:col-span-4" />
        <SkeletonBlock className="col-span-2 h-96 rounded-[2rem] md:col-span-6 xl:col-span-8" />
        <SkeletonBlock className="col-span-2 h-96 rounded-[2rem] md:col-span-6 xl:col-span-4" />
      </div>
    </div>
  );
}
