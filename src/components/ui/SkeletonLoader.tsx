"use client";

/**
 * Skeleton Loader Components
 * Loading state için animasyonlu placeholder'lar
 */

interface SkeletonProps {
  className?: string;
}

// Temel skeleton
export function Skeleton({ className = "" }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 bg-[length:200%_100%] rounded ${className}`}
      style={{ animation: "shimmer 1.5s infinite" }}
    />
  );
}

// Kart skeleton
export function SkeletonCard() {
  return (
    <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-800">
      <div className="flex items-center gap-3 mb-4">
        <Skeleton className="w-10 h-10 rounded-full" />
        <div className="flex-1">
          <Skeleton className="h-4 w-24 mb-2" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
      <Skeleton className="h-8 w-32 mb-2" />
      <Skeleton className="h-3 w-20" />
    </div>
  );
}

// Bakiye kartı skeleton
export function SkeletonBalanceCard() {
  return (
    <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 border border-slate-700">
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="w-8 h-8 rounded-full" />
      </div>
      <Skeleton className="h-10 w-48 mb-2" />
      <Skeleton className="h-4 w-24" />
    </div>
  );
}

// Portfolio grid skeleton
export function SkeletonPortfolioGrid() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {[...Array(8)].map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

// Tablo satırı skeleton
export function SkeletonTableRow() {
  return (
    <div className="flex items-center gap-4 p-4 border-b border-slate-800">
      <Skeleton className="w-10 h-10 rounded-full" />
      <div className="flex-1">
        <Skeleton className="h-4 w-24 mb-2" />
        <Skeleton className="h-3 w-32" />
      </div>
      <Skeleton className="h-6 w-20" />
    </div>
  );
}

// Transaction history skeleton
export function SkeletonTransactionHistory() {
  return (
    <div className="bg-slate-900/50 rounded-xl border border-slate-800 overflow-hidden">
      <div className="p-4 border-b border-slate-800">
        <Skeleton className="h-6 w-40" />
      </div>
      {[...Array(5)].map((_, i) => (
        <SkeletonTableRow key={i} />
      ))}
    </div>
  );
}

// Action button skeleton
export function SkeletonActionButtons() {
  return (
    <div className="flex gap-3">
      {[...Array(6)].map((_, i) => (
        <Skeleton key={i} className="h-12 w-24 rounded-xl" />
      ))}
    </div>
  );
}

// Tam sayfa skeleton
export function WalletPageSkeleton() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <div className="border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-5">
              <Skeleton className="h-12 w-40" />
              <div className="flex gap-2">
                <Skeleton className="h-8 w-24 rounded-lg" />
                <Skeleton className="h-8 w-20 rounded-lg" />
                <Skeleton className="h-8 w-20 rounded-lg" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Skeleton className="h-8 w-20 rounded-lg" />
              <Skeleton className="h-10 w-10 rounded-lg" />
              <Skeleton className="h-10 w-36 rounded-lg" />
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Description */}
        <div className="mb-6">
          <Skeleton className="h-6 w-64 mb-2" />
          <Skeleton className="h-4 w-full max-w-lg" />
        </div>

        {/* Action Buttons */}
        <SkeletonActionButtons />

        {/* Balance Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <SkeletonBalanceCard />
          <SkeletonBalanceCard />
          <SkeletonBalanceCard />
        </div>

        {/* Portfolio */}
        <SkeletonPortfolioGrid />

        {/* Transaction History */}
        <SkeletonTransactionHistory />
      </div>
    </main>
  );
}

// CSS animasyon (global.css'e eklenebilir)
export const shimmerKeyframes = `
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
`;
