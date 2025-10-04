'use client';

import { ReactNode } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

/**
 * WalletGateProps - Props interface for wallet gate component
 * Used to conditionally render content based on wallet connection status
 */
interface WalletGateProps {
  children: ReactNode; // Content to display when wallet is connected
}

/**
 * WalletGate - React component for wallet connection management
 * 
 * This component implements a common pattern in Web3 applications where
 * certain features require wallet connection. It acts as a gate that:
 * 
 * - Shows wallet connection prompt when not connected
 * - Renders protected content when wallet is connected
 * - Provides seamless user experience with clear call-to-action
 * 
 * Features:
 * - Automatic wallet connection detection
 * - Professional UI with clear messaging
 * - Integration with Solana wallet adapter
 * - Responsive design with dark theme
 * 
 * @param props - Component props including children to render
 * @returns JSX element with conditional rendering based on wallet state
 */
export default function WalletGate({ children }: WalletGateProps) {
  // Hook to access wallet connection state from Solana wallet adapter
  const { connected } = useWallet();

  // If wallet is not connected, show connection prompt
  if (!connected) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-lg border border-neutral-800 bg-neutral-900/80 p-4 text-sm text-neutral-400">
        {/* Clear instruction for user */}
        <span>Connect a Solana wallet to continue.</span>
        
        {/* Wallet connection button with custom styling */}
        <WalletMultiButton className="wallet-adapter-button wallet-adapter-button-trigger" />
      </div>
    );
  }

  // If wallet is connected, render the protected content
  return <>{children}</>;
}
