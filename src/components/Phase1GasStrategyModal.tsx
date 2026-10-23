import React from 'react';
import { NetworkConfig, NetworkId, OperationalGasWallet } from '../types/arbitrage';
import { NETWORKS } from '../config/networks';
import { 
  X, 
  Flame, 
  ShieldAlert, 
  ShieldCheck, 
  Zap, 
  ArrowRight, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  PlusCircle, 
  Layers, 
  Wallet,
  Sparkles,
  Info
} from 'lucide-react';

interface Phase1GasStrategyModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentNetwork: NetworkConfig;
  onSelectNetwork: (networkId: NetworkId) => void;
  operationalGasWallets: Record<NetworkId, OperationalGasWallet>;
  onTopUpGasWallet: (networkId: NetworkId, amount: number) => void;
}

export const Phase1GasStrategyModal: React.FC<Phase1GasStrategyModalProps> = ({
  isOpen,
  onClose,
  currentNetwork,
  onSelectNetwork,
  operationalGasWallets,
  onTopUpGasWallet
}) => {
  if (!isOpen) return null;

  const currentWallet = operationalGasWallets[currentNetwork.id];
  const isCurrentLow = currentWallet?.isLowReserve;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md font-mono text-xs">
      <div className="bg-[#0b0e14] border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-600/40 flex items-center justify-center">
              <Flame className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">Phase 1: Minimum Gas Fees & Network Strategy</h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-950 text-cyan-300 border border-cyan-800">
                  L2-Priority Protocol
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Layer-2 ultra-low execution economics & operational gas reserve protection against simulation reverts.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-5 overflow-y-auto flex-1">
          {/* Executive Strategy Banner */}
          <div className="bg-gradient-to-r from-cyan-950/40 via-indigo-950/30 to-purple-950/20 border border-cyan-850 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2 text-cyan-300 font-bold text-xs uppercase tracking-wider">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span>Core Economic Thesis: High L1 Barrier vs High-Yield L2s</span>
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              Running flash loans on <span className="text-amber-300 font-semibold">Ethereum Mainnet</span> requires heavy capital for gas (<span className="text-rose-400 font-semibold">$20–$100+ per transaction</span>), rendering smaller arbitrage spreads unprofitable. To maximize net yields, our engine executes primarily on <span className="text-emerald-400 font-semibold">Layer-2 networks</span> where gas is virtually negligible.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
              <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-2.5">
                <div className="text-[10px] text-slate-400">Arbitrum One & Optimism</div>
                <div className="text-emerald-400 font-bold text-sm font-mono mt-0.5">$0.02 – $0.10</div>
                <div className="text-[10px] text-slate-500 mt-0.5">Average multi-hop swap cost</div>
              </div>

              <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-2.5">
                <div className="text-[10px] text-slate-400">Polygon PoS</div>
                <div className="text-emerald-400 font-bold text-sm font-mono mt-0.5">$0.005 – $0.02</div>
                <div className="text-[10px] text-slate-500 mt-0.5">Sub-cent micro transaction fee</div>
              </div>

              <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-2.5">
                <div className="text-[10px] text-slate-400">Ethereum Mainnet</div>
                <div className="text-rose-400 font-bold text-sm font-mono mt-0.5">$20.00 – $100.00+</div>
                <div className="text-[10px] text-slate-500 mt-0.5">High capital capital barrier</div>
              </div>
            </div>
          </div>

          {/* Operational Gas Wallet Status for Current Active Network */}
          <div className={`border rounded-xl p-4 space-y-3 ${
            isCurrentLow 
              ? 'bg-rose-950/20 border-rose-800/80 shadow-lg shadow-rose-950/20' 
              : 'bg-slate-950 border-slate-800'
          }`}>
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-850 pb-2.5">
              <div className="flex items-center gap-2">
                <Wallet className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-bold text-white">
                  Active Bot Gas Wallet &middot; {currentNetwork.name}
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                  isCurrentLow
                    ? 'bg-rose-950 text-rose-300 border border-rose-800 animate-pulse'
                    : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                }`}>
                  {isCurrentLow ? 'Low Gas Reserve Warning' : 'Operational Reserve Healthy'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => onTopUpGasWallet(currentNetwork.id, currentNetwork.id === 'polygon' ? 50 : 0.05)}
                  className="px-2.5 py-1 rounded-lg bg-emerald-950 hover:bg-emerald-900 border border-emerald-800 text-emerald-300 flex items-center gap-1.5 text-[11px] cursor-pointer transition-colors"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Top-Up {currentNetwork.id === 'polygon' ? '+50 POL' : '+0.05 ETH'}</span>
                </button>
              </div>
            </div>

            {/* Current Network Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-2.5">
                <span className="text-[10px] text-slate-400 block mb-0.5">Current Balance</span>
                <span className="text-sm font-bold text-white font-mono">
                  {currentWallet?.balance.toFixed(3)} {currentNetwork.currency}
                </span>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  Bot operational wallet
                </div>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-2.5">
                <span className="text-[10px] text-slate-400 block mb-0.5">Required Min Reserve</span>
                <span className={`text-sm font-bold font-mono ${isCurrentLow ? 'text-rose-400' : 'text-amber-400'}`}>
                  {currentNetwork.minOperationalGasReserve} {currentNetwork.minOperationalGasReserveCurrency}
                </span>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  {currentNetwork.isL2 ? 'Layer-2 Minimum' : 'Mainnet Minimum'}
                </div>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-2.5">
                <span className="text-[10px] text-slate-400 block mb-0.5">Est. Revert Buffer Capacity</span>
                <span className="text-sm font-bold text-emerald-400 font-mono">
                  ~{currentWallet?.revertCapacityCount.toLocaleString()} Reverts
                </span>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  Simulation failed buffer
                </div>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-2.5">
                <span className="text-[10px] text-slate-400 block mb-0.5">Average Swap Cost</span>
                <span className="text-sm font-bold text-cyan-400 font-mono">
                  {currentNetwork.avgGasCostRangeUsd}
                </span>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  {currentNetwork.gasEfficiencyRating}
                </div>
              </div>
            </div>

            {/* Revert Safety Notice */}
            <div className="bg-slate-900/90 border border-slate-800/80 rounded-lg p-2.5 flex items-start gap-2.5 text-[11px] text-slate-400">
              <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <div>
                <span className="text-slate-200 font-semibold">Why Maintain 0.05 ETH (L2) / 0.3 ETH (Mainnet)? </span>
                During competitive MEV block battles or sudden volatility, AMM slippage bounds can cause `executeOperation` to revert. Having a buffer ensures the bot does not run dry on gas during volatile trading windows.
              </div>
            </div>
          </div>

          {/* Network-by-Network Operational Matrix */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h4 className="text-xs uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-cyan-400" />
                <span>Multi-Chain Operational Gas Wallet Matrix</span>
              </h4>
              <span className="text-[11px] text-slate-500">Live Balance & Capacity Status</span>
            </div>

            <div className="space-y-2">
              {Object.values(NETWORKS).map((net) => {
                const w = operationalGasWallets[net.id];
                const isSelected = net.id === currentNetwork.id;
                const isLow = w?.isLowReserve;

                return (
                  <div
                    key={net.id}
                    className={`p-3 rounded-xl border flex flex-wrap items-center justify-between gap-3 transition-all ${
                      isSelected
                        ? 'bg-slate-900/90 border-cyan-600/80 shadow-md'
                        : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-[200px]">
                      <div className={`w-3 h-3 rounded-full ${
                        isLow ? 'bg-rose-500 animate-pulse' : 'bg-emerald-400'
                      }`} />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-white font-bold text-xs">{net.name}</span>
                          <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                            net.isL2 ? 'bg-cyan-950 text-cyan-400 border border-cyan-800' : 'bg-slate-800 text-slate-400'
                          }`}>
                            {net.isL2 ? 'L2 Priority' : 'L1 Base'}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                          Avg Swap Gas: <span className="text-slate-300 font-semibold">{net.avgGasCostRangeUsd}</span>
                        </div>
                      </div>
                    </div>

                    {/* Balance & Threshold */}
                    <div className="flex items-center gap-4 text-xs font-mono">
                      <div>
                        <div className="text-[10px] text-slate-500">Reserve Balance</div>
                        <div className={`font-bold ${isLow ? 'text-rose-400' : 'text-white'}`}>
                          {w?.balance.toFixed(3)} {net.currency}
                        </div>
                      </div>

                      <div>
                        <div className="text-[10px] text-slate-500">Required Min</div>
                        <div className="text-amber-400 font-semibold">
                          &ge; {net.minOperationalGasReserve} {net.minOperationalGasReserveCurrency}
                        </div>
                      </div>

                      <div className="hidden sm:block">
                        <div className="text-[10px] text-slate-500">Revert Buffer</div>
                        <div className="text-emerald-400 font-semibold">
                          ~{w?.revertCapacityCount.toLocaleString()} txs
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onTopUpGasWallet(net.id, net.id === 'polygon' ? 50 : 0.05)}
                        className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white text-[10px] flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <PlusCircle className="w-3 h-3 text-emerald-400" />
                        <span>Top-Up</span>
                      </button>

                      {isSelected ? (
                        <span className="px-2.5 py-1 rounded bg-cyan-950 text-cyan-300 border border-cyan-700 font-bold text-[10px]">
                          Active Network
                        </span>
                      ) : (
                        <button
                          onClick={() => {
                            onSelectNetwork(net.id);
                            onClose();
                          }}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-cyan-600 hover:text-white text-slate-300 text-[10px] font-bold cursor-pointer transition-colors"
                        >
                          Switch &rarr;
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer with Quick L2 Switch Recommendation */}
        <div className="px-5 py-3.5 border-t border-slate-800 bg-slate-950 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Phase 1 Strategy: Maintain minimum 0.05 ETH on L2 / 0.3 ETH on Mainnet.</span>
          </div>

          <div className="flex items-center gap-2">
            {!currentNetwork.isL2 && (
              <button
                onClick={() => {
                  onSelectNetwork('arbitrum');
                  onClose();
                }}
                className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-lg"
              >
                <span>Switch to Arbitrum One (L2 $0.02 Gas)</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white text-xs cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
