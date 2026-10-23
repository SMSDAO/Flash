import React from 'react';
import { TrendingUp, ShieldAlert, Zap, DollarSign, Database, Server } from 'lucide-react';
import { NetworkConfig } from '../types/arbitrage';

interface AnalyticsBarProps {
  currentNetwork: NetworkConfig;
  totalOpportunitiesCount: number;
  totalViableCount: number;
}

export const AnalyticsBar: React.FC<AnalyticsBarProps> = ({
  currentNetwork,
  totalOpportunitiesCount,
  totalViableCount
}) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
      {/* Metric 1 */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3 relative overflow-hidden group hover:border-slate-700 transition-colors">
        <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
          <span>Aave V3 Flash Pool</span>
          <Database className="w-3.5 h-3.5 text-cyan-400" />
        </div>
        <div className="text-lg font-bold text-white font-mono flex items-baseline gap-1">
          <span>0.05%</span>
          <span className="text-[11px] font-normal text-slate-400">Fixed Fee</span>
        </div>
        <div className="text-[11px] text-emerald-400 flex items-center gap-1 mt-0.5 font-mono">
          <span>Instant Liquidity Pool</span>
        </div>
      </div>

      {/* Metric 2 */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3 relative overflow-hidden group hover:border-slate-700 transition-colors">
        <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
          <span>Scanned Pairs</span>
          <Zap className="w-3.5 h-3.5 text-amber-400" />
        </div>
        <div className="text-lg font-bold text-white font-mono flex items-baseline gap-1">
          <span>{totalOpportunitiesCount.toLocaleString()}</span>
          <span className="text-[11px] font-normal text-slate-400">Events</span>
        </div>
        <div className="text-[11px] text-cyan-400 font-mono mt-0.5">
          {totalViableCount} Viable Arbitrages
        </div>
      </div>

      {/* Metric 3 */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3 relative overflow-hidden group hover:border-slate-700 transition-colors">
        <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
          <span>Dry-Run Revert Rate</span>
          <ShieldAlert className="w-3.5 h-3.5 text-emerald-400" />
        </div>
        <div className="text-lg font-bold text-emerald-400 font-mono flex items-baseline gap-1">
          <span>0.00%</span>
          <span className="text-[11px] font-normal text-slate-400">On-Chain</span>
        </div>
        <div className="text-[11px] text-slate-400 font-mono mt-0.5">
          100% Pre-Filtered via eth_call
        </div>
      </div>

      {/* Metric 4 */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3 relative overflow-hidden group hover:border-slate-700 transition-colors">
        <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
          <span>Est. 24h Net Yield</span>
          <TrendingUp className="w-3.5 h-3.5 text-purple-400" />
        </div>
        <div className="text-lg font-bold text-white font-mono flex items-baseline gap-1">
          <span>$14,820</span>
          <span className="text-[11px] font-normal text-emerald-400">+18.4%</span>
        </div>
        <div className="text-[11px] text-slate-400 font-mono mt-0.5">
          Across {currentNetwork.name}
        </div>
      </div>

      {/* Metric 5 */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3 relative overflow-hidden group hover:border-slate-700 transition-colors">
        <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
          <span>Avg Block Time</span>
          <Server className="w-3.5 h-3.5 text-indigo-400" />
        </div>
        <div className="text-lg font-bold text-white font-mono flex items-baseline gap-1">
          <span>{currentNetwork.avgBlockTime}s</span>
          <span className="text-[11px] font-normal text-slate-400">Target</span>
        </div>
        <div className="text-[11px] text-slate-400 font-mono mt-0.5">
          Chain ID: {currentNetwork.chainId}
        </div>
      </div>

      {/* Metric 6 */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3 relative overflow-hidden group hover:border-slate-700 transition-colors">
        <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
          <span>Gas Saved (Prevented)</span>
          <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
        </div>
        <div className="text-lg font-bold text-emerald-400 font-mono flex items-baseline gap-1">
          <span>$2,940</span>
          <span className="text-[11px] font-normal text-slate-400">USD</span>
        </div>
        <div className="text-[11px] text-slate-400 font-mono mt-0.5">
          Zero wasted miner fees
        </div>
      </div>
    </div>
  );
};
