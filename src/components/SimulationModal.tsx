import React, { useState } from 'react';
import { SimulationResult, NetworkConfig, OperationalGasWallet } from '../types/arbitrage';
import { 
  X, 
  CheckCircle2, 
  AlertOctagon, 
  Layers, 
  Flame, 
  DollarSign, 
  Send, 
  ArrowRight, 
  Copy, 
  Check, 
  ShieldCheck,
  Terminal,
  Zap,
  Wallet,
  AlertTriangle
} from 'lucide-react';

interface SimulationModalProps {
  simulation: SimulationResult | null;
  isOpen: boolean;
  onClose: () => void;
  network: NetworkConfig;
  onBroadcastToRelay: (simulation: SimulationResult) => void;
  operationalGasWallet?: OperationalGasWallet;
  onOpenGasStrategy?: () => void;
}

export const SimulationModal: React.FC<SimulationModalProps> = ({
  simulation,
  isOpen,
  onClose,
  network,
  onBroadcastToRelay,
  operationalGasWallet,
  onOpenGasStrategy
}) => {
  const [copiedCalldata, setCopiedCalldata] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'trace' | 'calldata'>('overview');

  if (!isOpen || !simulation) return null;

  const handleCopyCalldata = () => {
    navigator.clipboard.writeText(simulation.encodedCalldata);
    setCopiedCalldata(true);
    setTimeout(() => setCopiedCalldata(false), 2000);
  };

  const isProfitable = simulation.success && simulation.netProfitUsd > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#0c1017] border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden font-mono">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${
              isProfitable 
                ? 'bg-emerald-950/80 border border-emerald-700/60 text-emerald-400' 
                : 'bg-rose-950/80 border border-rose-800/60 text-rose-400'
            }`}>
              {isProfitable ? <CheckCircle2 className="w-5 h-5" /> : <AlertOctagon className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">
                  Dry-Run Simulation (eth_call)
                </h3>
                <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                  isProfitable
                    ? 'bg-emerald-950 border border-emerald-800 text-emerald-300'
                    : 'bg-rose-950 border border-rose-800 text-rose-300'
                }`}>
                  {isProfitable ? 'Yield Viable' : 'Condition Unviable'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Target Block #{simulation.blockNumber} &middot; Network: {network.name} &middot; State Pre-validation
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Tabs */}
        <div className="px-5 border-b border-slate-800 flex items-center gap-2 bg-slate-950/40 text-xs">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-2.5 px-3 border-b-2 font-medium transition-all ${
              activeTab === 'overview'
                ? 'border-cyan-500 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Economic Breakdown
          </button>
          <button
            onClick={() => setActiveTab('trace')}
            className={`py-2.5 px-3 border-b-2 font-medium transition-all flex items-center gap-1.5 ${
              activeTab === 'trace'
                ? 'border-cyan-500 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>EVM Execution Trace ({simulation.traces.length} Calls)</span>
          </button>
          <button
            onClick={() => setActiveTab('calldata')}
            className={`py-2.5 px-3 border-b-2 font-medium transition-all flex items-center gap-1.5 ${
              activeTab === 'calldata'
                ? 'border-cyan-500 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Payload Calldata</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {activeTab === 'overview' && (
            <div className="space-y-4">
              {/* Summary Banner */}
              <div className={`p-4 rounded-xl border flex flex-wrap items-center justify-between gap-4 ${
                isProfitable
                  ? 'bg-gradient-to-r from-emerald-950/40 via-cyan-950/30 to-slate-900 border-emerald-800/60'
                  : 'bg-rose-950/30 border-rose-800/60'
              }`}>
                <div>
                  <div className="text-xs text-slate-400">Projected Net Arbitrage Return</div>
                  <div className={`text-2xl font-bold flex items-baseline gap-2 ${
                    isProfitable ? 'text-emerald-400' : 'text-rose-400'
                  }`}>
                    <span>
                      {isProfitable ? `+$${simulation.netProfitUsd.toFixed(2)}` : `-$${Math.abs(simulation.netProfitUsd).toFixed(2)}`}
                    </span>
                    <span className="text-xs font-normal text-slate-400">
                      ({simulation.netProfit > 0 ? '+' : ''}{simulation.netProfit.toFixed(4)} {simulation.flashAsset.symbol})
                    </span>
                  </div>
                </div>

                <div className="text-right text-xs">
                  <div className="text-slate-400">Aave Loan Principal</div>
                  <div className="text-white font-semibold">
                    {simulation.flashAmount.toLocaleString()} {simulation.flashAsset.symbol}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    (~${(simulation.flashAmount * simulation.flashAsset.usdPrice).toLocaleString()})
                  </div>
                </div>
              </div>

              {/* Math Waterfall Table */}
              <div className="bg-slate-950 border border-slate-800/80 rounded-xl overflow-hidden text-xs">
                <div className="p-3 bg-slate-900/60 border-b border-slate-800 font-semibold text-slate-300">
                  Execution Yield Waterfall
                </div>
                <div className="p-4 space-y-3">
                  {/* Gross Revenue */}
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                      Gross Arbitrage Revenue (Pre-fees)
                    </span>
                    <span className="text-emerald-400 font-semibold">
                      +{simulation.grossProfit.toFixed(4)} {simulation.flashAsset.symbol}
                      <span className="text-slate-500 text-[11px] ml-1.5">
                        (+${(simulation.grossProfit * simulation.flashAsset.usdPrice).toFixed(2)})
                      </span>
                    </span>
                  </div>

                  {/* Aave Premium */}
                  <div className="flex items-center justify-between border-t border-slate-900 pt-2">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                      Aave V3 Flash Loan Fee (0.05% / 5 bps)
                    </span>
                    <span className="text-amber-400 font-semibold">
                      -{simulation.aaveFeeAmount.toFixed(4)} {simulation.flashAsset.symbol}
                      <span className="text-slate-500 text-[11px] ml-1.5">
                        (-${(simulation.aaveFeeAmount * simulation.flashAsset.usdPrice).toFixed(2)})
                      </span>
                    </span>
                  </div>

                  {/* Miner MEV Bribe */}
                  <div className="flex items-center justify-between border-t border-slate-900 pt-2">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-purple-400"></span>
                      Miner / Builder Tip (Coinbase Bribe)
                    </span>
                    <span className="text-purple-400 font-semibold">
                      -{simulation.mevBribeAmount.toFixed(4)} {simulation.flashAsset.symbol}
                      <span className="text-slate-500 text-[11px] ml-1.5">
                        (-${simulation.mevBribeUsd.toFixed(2)})
                      </span>
                    </span>
                  </div>

                  {/* Gas Fee */}
                  <div className="flex items-center justify-between border-t border-slate-900 pt-2">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                      EIP-1559 Dynamic Gas Cost ({simulation.gasLimit.toLocaleString()} units @ {simulation.gasPriceGwei.toFixed(1)} Gwei)
                    </span>
                    <span className="text-blue-400 font-semibold">
                      -${simulation.estimatedGasCostUsd.toFixed(2)} USD
                    </span>
                  </div>

                  {/* Net Profit */}
                  <div className="flex items-center justify-between border-t border-slate-800 pt-3 text-sm font-bold">
                    <span className="text-white">Net Yield (Post All Protocol & Miner Deductions)</span>
                    <span className={isProfitable ? 'text-emerald-400' : 'text-rose-400'}>
                      {isProfitable ? `+$${simulation.netProfitUsd.toFixed(2)}` : `-$${Math.abs(simulation.netProfitUsd).toFixed(2)}`}
                    </span>
                  </div>
                </div>
              </div>

              {/* Operational Gas Reserve & Revert Protection Card */}
              {operationalGasWallet && (
                <div className={`p-3 rounded-xl border flex flex-wrap items-center justify-between gap-3 text-xs ${
                  operationalGasWallet.isLowReserve 
                    ? 'bg-rose-950/30 border-rose-800/80' 
                    : 'bg-slate-950/80 border-slate-800'
                }`}>
                  <div className="flex items-center gap-2.5">
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                      operationalGasWallet.isLowReserve ? 'bg-rose-950 text-rose-400' : 'bg-emerald-950 text-emerald-400'
                    }`}>
                      <Wallet className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 font-bold text-white">
                        <span>Operational Gas Reserve:</span>
                        <span className={operationalGasWallet.isLowReserve ? 'text-rose-400' : 'text-emerald-400'}>
                          {operationalGasWallet.balance.toFixed(3)} {network.currency}
                        </span>
                        <span className={`px-1.5 py-0.2 rounded text-[9px] uppercase font-bold ${
                          operationalGasWallet.isLowReserve 
                            ? 'bg-rose-950 text-rose-300 border border-rose-800' 
                            : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        }`}>
                          {operationalGasWallet.isLowReserve ? 'Reserve Low!' : 'Revert-Protected'}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Minimum required: {network.minOperationalGasReserve} {network.minOperationalGasReserveCurrency} &middot; Absorbs ~{operationalGasWallet.revertCapacityCount.toLocaleString()} simulation reverts without running dry.
                      </div>
                    </div>
                  </div>

                  {onOpenGasStrategy && (
                    <button
                      onClick={onOpenGasStrategy}
                      className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white text-[11px] cursor-pointer"
                    >
                      Inspect Gas Strategy
                    </button>
                  )}
                </div>
              )}

              {/* Safety & Pre-check Notes */}
              <div className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl flex items-start gap-2.5 text-xs text-slate-400">
                <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <div>
                  <span className="text-white font-medium">Atomic Safety Assurance: </span>
                  Contract enforces <code className="text-cyan-300">revert InsufficientProfit(...)</code>. If pool reserves shift by even 1 wei before bundle inclusion, the transaction reverts internally within the flash loan callback and incurs zero pool debt.
                </div>
              </div>
            </div>
          )}

          {activeTab === 'trace' && (
            <div className="space-y-3">
              <div className="text-xs text-slate-400 mb-2">
                Simulated EVM Call Stack Frame Trace (Dry-Run via <code className="text-cyan-300">executeArbitrage.staticCall</code>)
              </div>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2 text-xs">
                {simulation.traces.map((trace, idx) => {
                  const depthIndent = trace.depth * 18;
                  return (
                    <div 
                      key={idx}
                      style={{ marginLeft: `${depthIndent}px` }}
                      className="p-2.5 rounded-lg bg-slate-900/70 border border-slate-800/80 hover:border-slate-700 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${trace.status === 'SUCCESS' ? 'bg-emerald-400' : 'bg-rose-400'}`}></span>
                          <span className="text-slate-400 font-mono text-[11px]">{trace.target.slice(0, 10)}...</span>
                          <ArrowRight className="w-3 h-3 text-slate-600" />
                          <span className="text-cyan-300 font-bold">{trace.method}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-amber-400 bg-amber-950/50 px-1.5 py-0.5 rounded border border-amber-900/50">
                            {trace.gasUsed.toLocaleString()} gas
                          </span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                            trace.status === 'SUCCESS' ? 'text-emerald-300 bg-emerald-950' : 'text-rose-300 bg-rose-950'
                          }`}>
                            {trace.status}
                          </span>
                        </div>
                      </div>

                      <div className="text-[11px] text-slate-400 bg-black/40 p-2 rounded border border-slate-900 mt-1">
                        <div className="text-slate-500 mb-0.5 font-semibold text-[10px] uppercase">Input Parameters:</div>
                        <pre className="text-slate-300 whitespace-pre-wrap">{JSON.stringify(trace.params, null, 2)}</pre>
                        {trace.output && (
                          <div className="mt-1 pt-1 border-t border-slate-800 text-emerald-400 text-[11px]">
                            &rarr; {trace.output}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'calldata' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">
                  Full Encoded ABI Calldata for <code className="text-cyan-300">executeArbitrage(address asset, uint256 amount, bytes params)</code>
                </span>
                <button
                  onClick={handleCopyCalldata}
                  className="px-2.5 py-1 rounded bg-slate-800 text-slate-200 hover:text-white flex items-center gap-1.5 text-xs transition-colors"
                >
                  {copiedCalldata ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCalldata ? 'Copied' : 'Copy Calldata'}</span>
                </button>
              </div>

              <div className="bg-black/80 border border-slate-800 rounded-xl p-3 text-[11px] text-cyan-300 break-all leading-relaxed max-h-72 overflow-y-auto">
                {simulation.encodedCalldata}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-400 flex items-center gap-2">
            <span>Primary Relay:</span>
            <span className="text-cyan-300 font-semibold">{network.relays[0].name}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 text-xs transition-colors cursor-pointer"
            >
              Close
            </button>
            <button
              disabled={!isProfitable}
              onClick={() => {
                onBroadcastToRelay(simulation);
                onClose();
              }}
              className={`px-5 py-2 rounded-lg font-bold text-xs flex items-center gap-2 shadow-lg transition-all cursor-pointer ${
                isProfitable
                  ? 'bg-gradient-to-r from-cyan-600 via-indigo-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white shadow-cyan-950'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              <span>Broadcast MEV Bundle to Builders</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
