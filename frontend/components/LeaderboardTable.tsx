import Link from "next/link";
import { EXPLORER_BASE } from "@/lib/solana";

/**
 * LeaderboardRow - Type definition for leaderboard data structure
 * Represents a single row in the trading leaderboard with ranking and volume data
 */
export type LeaderboardRow = {
  rank: number;           // User's current ranking position
  wallet: string;         // User's wallet address
  volToken: number;       // Trading volume in tokens
  volSol: number;         // Trading volume in SOL
  volUsd?: number;        // Optional USD volume conversion
  rewardLamports: string; // Reward amount in lamports (smallest SOL unit)
};

/**
 * LeaderboardTableProps - Props interface for the leaderboard component
 * Handles pagination, loading states, and data display
 */
interface LeaderboardTableProps {
  rows: LeaderboardRow[];     // Array of leaderboard entries
  isLoading?: boolean;        // Loading state indicator
  page: number;               // Current page number
  pageSize: number;           // Number of items per page
  total: number;              // Total number of entries
  onPageChange: (page: number) => void; // Page change handler
}

/**
 * Utility function to shorten wallet addresses for display
 * Shows first 4 and last 4 characters with ellipsis
 * @param address - Full wallet address
 * @returns Shortened address string
 */
function shortAddress(address: string): string {
  return address.slice(0, 4) + '...' + address.slice(-4);
}

/**
 * LeaderboardTable - React component for displaying trading leaderboard
 * 
 * Features:
 * - Responsive table design with mobile optimization
 * - Pagination controls with navigation
 * - Loading and empty states
 * - Clickable wallet addresses linking to Solana explorer
 * - Hover effects and professional styling
 * 
 * @param props - Component props including data and handlers
 * @returns JSX element representing the leaderboard table
 */
export default function LeaderboardTable({ 
  rows, 
  isLoading, 
  page, 
  pageSize, 
  total, 
  onPageChange 
}: LeaderboardTableProps) {
  // Calculate total pages for pagination
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // Loading state - show skeleton while data is being fetched
  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center text-neutral-500">
        Loading leaderboard...
      </div>
    );
  }

  // Empty state - show message when no data is available
  if (rows.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-neutral-600">
        No trades recorded this epoch.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Responsive table container with horizontal scroll */}
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          {/* Table header with column definitions */}
          <thead className="bg-neutral-900/60 text-left uppercase text-neutral-400">
            <tr>
              <th className="px-3 py-2">Rank</th>
              <th className="px-3 py-2">Wallet</th>
              <th className="px-3 py-2 text-right">Token</th>
              <th className="px-3 py-2 text-right">SOL</th>
              <th className="px-3 py-2 text-right">Reward (lamports)</th>
            </tr>
          </thead>
          
          {/* Table body with leaderboard data */}
          <tbody className="divide-y divide-neutral-800">
            {rows.map((row) => (
              <tr key={row.wallet} className="hover:bg-neutral-900/40">
                {/* Rank column with highlighting */}
                <td className="px-3 py-2 font-semibold text-neutral-200">
                  #{row.rank}
                </td>
                
                {/* Wallet address with explorer link */}
                <td className="px-3 py-2 font-mono text-xs text-neutral-400">
                  <Link 
                    href={EXPLORER_BASE + "/account/" + row.wallet} 
                    className="hover:text-neutral-100" 
                    target="_blank" 
                    rel="noreferrer"
                  >
                    {shortAddress(row.wallet)}
                  </Link>
                </td>
                
                {/* Trading volume columns with number formatting */}
                <td className="px-3 py-2 text-right">
                  {row.volToken.toLocaleString()}
                </td>
                <td className="px-3 py-2 text-right">
                  {row.volSol.toLocaleString()}
                </td>
                <td className="px-3 py-2 text-right">
                  {row.rewardLamports}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Pagination controls */}
      <div className="flex items-center justify-between text-xs text-neutral-500">
        {/* Page information */}
        <span>
          Page {page} / {totalPages}
        </span>
        
        {/* Navigation buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="rounded border border-neutral-700 px-2 py-1 disabled:opacity-50"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
          >
            Previous
          </button>
          <button
            type="button"
            className="rounded border border-neutral-700 px-2 py-1 disabled:opacity-50"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
