/**
 * Solana Configuration and Constants
 * 
 * This module contains all Solana-related configuration, constants, and utilities
 * used throughout the application. It centralizes blockchain configuration
 * and provides type-safe access to environment variables.
 */

// ============================================================================
// RPC ENDPOINTS
// ============================================================================

/**
 * Default Solana RPC endpoint
 * Falls back to devnet if not specified in environment
 */
export const DEFAULT_SOLANA_RPC = process.env.NEXT_PUBLIC_SOLANA_RPC ?? "https://api.devnet.solana.com";

/**
 * Solana blockchain explorer base URL
 * Used for generating links to transaction and account details
 */
export const EXPLORER_BASE = process.env.NEXT_PUBLIC_CHAIN_EXPLORER_BASE ?? "https://solscan.io";

// ============================================================================
// SMART CONTRACT PROGRAM IDs
// ============================================================================

/**
 * Reward Vault Program ID
 * Handles SOL and SPL token reward distribution
 * Falls back to System Program ID if not configured
 */
export const REWARD_VAULT_PROGRAM_ID = process.env.NEXT_PUBLIC_REWARD_VAULT_PROGRAM_ID ?? "11111111111111111111111111111112";

/**
 * Merkle Distributor Program ID
 * Manages secure reward claiming using Merkle proofs
 * Prevents double-spending and ensures fair distribution
 */
export const MERKLE_DISTRIBUTOR_PROGRAM_ID = process.env.NEXT_PUBLIC_MERKLE_DISTRIBUTOR_PROGRAM_ID ?? "11111111111111111111111111111112";

/**
 * Platform Router Program ID
 * Handles fee routing and platform revenue distribution
 * Manages automated fee collection and splitting
 */
export const PLATFORM_ROUTER_PROGRAM_ID = process.env.NEXT_PUBLIC_PLATFORM_ROUTER_PROGRAM_ID ?? "11111111111111111111111111111112";

// ============================================================================
// FEATURE FLAGS
// ============================================================================

/**
 * Feature flag for reward claiming functionality
 * Allows toggling of on-chain reward claiming features
 */
export const ENABLE_CLAIMS = process.env.NEXT_PUBLIC_ENABLE_CLAIMS === "true";

/**
 * Feature flag for user profile functionality
 * Controls access to profile creation and management
 */
export const ENABLE_PROFILE = process.env.NEXT_PUBLIC_ENABLE_PROFILE === "true";

/**
 * Feature flag for leaderboard functionality
 * Controls visibility of trading leaderboard and rankings
 */
export const ENABLE_LEADERBOARD = process.env.NEXT_PUBLIC_ENABLE_LEADERBOARD === "true";

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Validates if a string is a valid Solana public key
 * @param address - String to validate
 * @returns boolean indicating if address is valid
 */
export function isValidSolanaAddress(address: string): boolean {
  try {
    // Basic validation for Solana address format
    return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
  } catch {
    return false;
  }
}

/**
 * Converts lamports to SOL
 * @param lamports - Amount in lamports (smallest SOL unit)
 * @returns Amount in SOL with 9 decimal places
 */
export function lamportsToSol(lamports: number): number {
  return lamports / 1_000_000_000;
}

/**
 * Converts SOL to lamports
 * @param sol - Amount in SOL
 * @returns Amount in lamports
 */
export function solToLamports(sol: number): number {
  return Math.floor(sol * 1_000_000_000);
}

/**
 * Formats SOL amount for display
 * @param sol - Amount in SOL
 * @param decimals - Number of decimal places (default: 4)
 * @returns Formatted string with appropriate precision
 */
export function formatSol(sol: number, decimals: number = 4): string {
  return sol.toFixed(decimals);
}

/**
 * Generates explorer URL for a transaction
 * @param signature - Transaction signature
 * @returns Full URL to transaction on explorer
 */
export function getTransactionUrl(signature: string): string {
  return `${EXPLORER_BASE}/tx/${signature}`;
}

/**
 * Generates explorer URL for an account
 * @param address - Account address
 * @returns Full URL to account on explorer
 */
export function getAccountUrl(address: string): string {
  return `${EXPLORER_BASE}/account/${address}`;
}
