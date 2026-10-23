import React, { useState } from 'react';
import { 
  MempoolOpportunity, 
  NetworkConfig, 
  ProtocolType 
} from '../types/arbitrage';
import { 
  Play, 
  Search, 
  ArrowRight, 
  Filter, 
  Sparkles, 
  Clock, 
  DollarSign, 
  Layers, 
  TrendingUp, 
  ExternalLink,
  Flame,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Zap
} from 'lucide-react';

import { OperationalGasWallet, NetworkId } from '../types/arbitrage';

interface MempoolMonitorProps {
  opportunities: MempoolOpportunity[];
  currentNetwork: NetworkConfig;
  onSelectOpportunity: (opp: MempoolOpportunity) => void;
  onSimulateOpportunity: (opp: MempoolOpportunity) => void;
  onForceNewOpportunity: () => void;
  operationalGasWallet?: OperationalGasWallet;
  onOpenGasStrategy?: () => void;
  onSelectNetwork?: (networkId: NetworkId) => void;
}

export const MempoolMonitor: React.FC<MempoolMonitorProps> = ({
  opportunities,
  currentNetwork,
  onSelectOpportunity,
  onSimulateOpportunity,
  onForceNewOpportunity,
  operationalGasWallet,
  onOpenGasStrategy,
  onSelectNetwork
}) => {
  const [filterText, setFilterText] = useState('');
  const [minProfitFilter, setMinProfitFilter] = useState<'all' | 'profitable' | 'high'>('all');
  const [selectedPair, setSelectedPair] = useState<string>('all');
  const [l2OnlyFilter, setL2OnlyFilter] = useState<boolean>(false);

  const filtered = opportunities.filter((opp) => {
    // Check network filter or show current network preferentially
    const matchesNetwork = opp.networkId === currentNetwork.id;
    const matchesSearch = 
      opp.pair.toLowerCase().includes(filterText.toLowerCase()) ||
      opp.route.dex1Name.toLowerCase().includes(filterText.toLowerCase()) ||
      opp.route.dex2Name.toLowerCase().includes(filterText.toLowerCase());
    
    let matchesProfit = true;
    if (minProfitFilter === 'profitable') {
      matchesProfit = opp.estimatedNetProfitUsd > 0;
    } else if (minProfitFilter === 'high') {
      matchesProfit = opp.estimatedNetProfitUsd > 100;
    }

    const matchesPair = selectedPair === 'all' || opp.pair === selectedPair;

    return matchesNetwork && matchesSearch && matchesProfit && matchesPair;
  });

  const getProtocolBadge = (protocol: ProtocolType, name: string) => {
    switch (protocol) {
      case ProtocolType.UNISWAP_V3:
        return <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-pink-950/70 border border-pink-700/50 text-pink-300">{name}</span>;
      case ProtocolType.UNISWAP_V2:
        return <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-950/70 border border-cyan-700/50 text-cyan-300">{name}</span>;
      case ProtocolType.BALANCER_V2:
        return <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-950/70 border border-amber-700/50 text-amber-300">{name}</span>;
      case ProtocolType.CURVE_V2:
        return <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-950/70 border border-blue-700/50 text-blue-300">{name}</span>;
      default:
        return <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">{name}</span>;
    }
  };

  const uniquePairs = Array.from(new Set(opportunities.filter(o => o.networkId === currentNetwork.id).map(o => o.pair)));

  return (
    <div className="space-y-4">
      {/* Phase 1: Minimum Gas Fees & Network Strategy Banner */}
      {!currentNetwork.isL2 ? (
        <div className="bg-gradient-to-r from-amber-950/40 to-rose-950/30 border border-amber-700/60 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 font-mono">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-950 border border-amber-700 text-amber-400 flex items-center justify-center shrink-0">
              <Flame className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-2">
                <span>Phase 1 Strategy Warning: High L1 Gas Fees ({currentNetwork.avgGasCostRangeUsd})</span>
                <span className="px-1.5 py-0.2 rounded text-[9px] uppercase font-bold bg-rose-950 text-rose-300 border border-rose-800">
                  L1 Capital Barrier
                </span>
              </div>
              <p className="text-[11px] text-slate-300 mt-0.5">
                Flash loans on Ethereum Mainnet require $20–$100+ for gas, destroying smaller spreads ($15–$60). Switch to Layer-2 (Arbitrum One, Optimism, Polygon) to capture 100% of micro-arbitrage yields with $0.005–$0.10 gas.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onSelectNetwork?.('arbitrum')}
              className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md"
            >
              <span>Switch to Arbitrum One ($0.02 Gas)</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            {onOpenGasStrategy && (
              <button
                onClick={onOpenGasStrategy}
                className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 hover:text-white text-xs cursor-pointer"
              >
                Gas Matrix
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-gradient-to-r from-emerald-950/30 via-slate-950 to-cyan-950/20 border border-emerald-800/60 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 font-mono">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-emerald-950 border border-emerald-700 text-emerald-400 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-2">
                <span>Phase 1 L2 Network Strategy Active: {currentNetwork.name}</span>
                <span className="px-1.5 py-0.2 rounded text-[9px] uppercase font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">
                  {currentNetwork.avgGasCostRangeUsd} Avg Gas
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Ultra-low multi-hop transaction overhead maximizes net yields on micro-spreads. Operational Gas Reserve: <span className="text-white font-semibold">{operationalGasWallet?.balance.toFixed(3)} {currentNetwork.currency}</span> (Absorbs ~{operationalGasWallet?.revertCapacityCount.toLocaleString()} simulation reverts).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onOpenGasStrategy && (
              <button
                onClick={onOpenGasStrategy}
                className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-cyan-300 hover:text-white text-xs flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                <span>Manage Gas Reserve</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Search & Filter Toolbar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[240px]">
          <div className="relative w-full max-w-xs">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search pair or DEX router..."
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
            />
          </div>

          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs font-mono">
            <button
              onClick={() => setMinProfitFilter('all')}
              className={`px-2 py-1 rounded ${minProfitFilter === 'all' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              All
            </button>
            <button
              onClick={() => setMinProfitFilter('profitable')}
              className={`px-2 py-1 rounded ${minProfitFilter === 'profitable' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'text-slate-400 hover:text-white'}`}
            >
              Net Profit &gt; $0
            </button>
            <button
              onClick={() => setMinProfitFilter('high')}
              className={`px-2 py-1 rounded ${minProfitFilter === 'high' ? 'bg-cyan-950 text-cyan-300 border border-cyan-800' : 'text-slate-400 hover:text-white'}`}
            >
              High Yield &gt; $100
            </button>
          </div>

          {uniquePairs.length > 0 && (
            <select
              aria-label="Filter by Token Pair"
              value={selectedPair}
              onChange={(e) => setSelectedPair(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-xs text-slate-300 rounded-lg px-2.5 py-1.5 font-mono focus:outline-none focus:border-cyan-500"
            >
              <option value="all">All Pairs ({uniquePairs.length})</option>
              {uniquePairs.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onForceNewOpportunity}
            className="px-3 py-1.5 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white text-xs font-mono rounded-lg flex items-center gap-1.5 shadow-md shadow-cyan-950 transition-all cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Simulate Volatility Spike</span>
          </button>
        </div>
      </div>

      {/* Main Mempool Opportunities Table */}
      <div className="bg-[#0b0e14] border border-slate-800/90 rounded-xl overflow-hidden shadow-2xl">
        <div className="p-3.5 border-b border-slate-800/80 bg-slate-950/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></div>
            <h2 className="text-sm font-semibold text-white tracking-wide">
              Live {currentNetwork.name} Pending Arbitrage Stream
            </h2>
            <span className="text-[11px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
              {filtered.length} Discrepancies Detected
            </span>
          </div>
          <div className="text-xs font-mono text-slate-400 flex items-center gap-3">
            <span>Aave V3 Fee: <strong className="text-slate-200">5 BPS</strong></span>
            <span>Miner Tip: <strong className="text-slate-200">15%</strong></span>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto mb-2 opacity-80" />
            <p className="text-sm text-slate-300 font-medium">No live opportunities match the active filter criteria</p>
            <p className="text-xs text-slate-500 mt-1">Adjust filters or click &quot;Simulate Volatility Spike&quot; to inject an opportunity.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800/80">
                <tr>
                  <th className="py-2.5 px-3">Age / Target Block</th>
                  <th className="py-2.5 px-3">Pair & Loan Size</th>
                  <th className="py-2.5 px-3">Execution Route</th>
                  <th className="py-2.5 px-3 text-right">Spread</th>
                  <th className="py-2.5 px-3 text-right">Gross Profit</th>
                  <th className="py-2.5 px-3 text-right">Aave Fee (0.05%)</th>
                  <th className="py-2.5 px-3 text-right">Gas + MEV Tip</th>
                  <th className="py-2.5 px-3 text-right font-bold text-slate-300">Net Profit (Est.)</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filtered.map((opp) => {
                  const ageSec = Math.max(1, Math.floor((Date.now() - opp.timestamp) / 1000));
                  const isProfitable = opp.estimatedNetProfitUsd > 0;
                  const isHighProfit = opp.estimatedNetProfitUsd > 100;

                  return (
                    <tr 
                      key={opp.id} 
                      className={`hover:bg-slate-900/50 transition-colors group ${
                        isHighProfit ? 'bg-cyan-950/10' : ''
                      }`}
                    >
                      {/* Age / Block */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-slate-400">
                          <Clock className="w-3 h-3 text-slate-500" />
                          <span>{ageSec}s ago</span>
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          Target #{opp.targetBlock}
                        </div>
                      </td>

                      {/* Pair & Loan Size */}
                      <td className="py-3 px-3">
                        <div className="font-semibold text-white flex items-center gap-1.5">
                          <span>{opp.pair}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          Borrow: <span className="text-cyan-300">{opp.loanAmount.toLocaleString()} {opp.tokenIn.symbol}</span>
                          <span className="text-slate-500 text-[10px] ml-1">
                            (~${(opp.loanAmount * opp.tokenIn.usdPrice).toLocaleString()})
                          </span>
                        </div>
                      </td>

                      {/* Route */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5">
                          {getProtocolBadge(opp.route.protocol1, opp.route.dex1Name)}
                          <ArrowRight className="w-3 h-3 text-slate-600" />
                          {getProtocolBadge(opp.route.protocol2, opp.route.dex2Name)}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-1 truncate max-w-[200px]" title={opp.poolDiscrepancy}>
                          {opp.poolDiscrepancy}
                        </div>
                      </td>

                      {/* Spread */}
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <span className={`font-semibold ${opp.spreadPct > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {opp.spreadPct > 0 ? `+${opp.spreadPct}%` : `${opp.spreadPct}%`}
                        </span>
                      </td>

                      {/* Gross Profit */}
                      <td className="py-3 px-3 text-right whitespace-nowrap text-slate-200">
                        ${opp.estimatedGrossProfitUsd.toFixed(2)}
                      </td>

                      {/* Aave 0.05% Fee */}
                      <td className="py-3 px-3 text-right whitespace-nowrap text-slate-400">
                        -${opp.estimatedAaveFeeUsd.toFixed(2)}
                      </td>

                      {/* Gas + MEV Bribe */}
                      <td className="py-3 px-3 text-right whitespace-nowrap text-slate-400">
                        {opp.estimatedGasFeeUsd < 0.20 ? (
                          <div>
                            <div className="text-emerald-400 font-semibold">
                              -${opp.estimatedGasFeeUsd < 0.01 ? opp.estimatedGasFeeUsd.toFixed(3) : opp.estimatedGasFeeUsd.toFixed(2)} (gas)
                            </div>
                            <span className="text-[9px] text-cyan-400/90 block font-mono">L2 Micro Gas</span>
                          </div>
                        ) : (
                          <div>
                            <div className="text-rose-400 font-semibold">
                              -${opp.estimatedGasFeeUsd.toFixed(2)} (gas)
                            </div>
                            <span className="text-[9px] text-amber-500 block font-mono">L1 Capital Heavy</span>
                          </div>
                        )}
                        {opp.estimatedBribeUsd > 0 && (
                          <div className="text-[10px] text-purple-400">-${opp.estimatedBribeUsd.toFixed(2)} (bribe)</div>
                        )}
                      </td>

                      {/* Net Yield */}
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <div className={`font-bold text-sm ${
                          opp.estimatedNetProfitUsd > 80 
                            ? 'text-emerald-400' 
                            : opp.estimatedNetProfitUsd > 0 
                            ? 'text-cyan-300' 
                            : 'text-rose-400'
                        }`}>
                          {opp.estimatedNetProfitUsd > 0 ? `+$${opp.estimatedNetProfitUsd.toFixed(2)}` : `-$${Math.abs(opp.estimatedNetProfitUsd).toFixed(2)}`}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {opp.tokenIn.symbol} yield
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        {opp.status === 'profitable' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-950 border border-emerald-700/60 text-emerald-300">
                            <CheckCircle2 className="w-3 h-3" />
                            VIABLE
                          </span>
                        ) : opp.status === 'marginal' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-950 border border-amber-700/60 text-amber-300">
                            <AlertTriangle className="w-3 h-3" />
                            MARGINAL
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-950 border border-rose-800/60 text-rose-400">
                            <XCircle className="w-3 h-3" />
                            UNVIABLE
                          </span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => onSimulateOpportunity(opp)}
                            title="Run eth_call dry-run simulation for this opportunity"
                            className="px-2.5 py-1 bg-cyan-600/80 hover:bg-cyan-500 text-white rounded font-medium text-[11px] flex items-center gap-1 shadow-sm transition-all"
                          >
                            <Zap className="w-3 h-3" />
                            <span>Dry-Run</span>
                          </button>
                          <button
                            onClick={() => onSelectOpportunity(opp)}
                            title="Load Route into Custom Builder"
                            className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
                          >
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
