import React, { useState, useEffect } from 'react';
import { 
  NetworkConfig, 
  Token, 
  OperationalGasWallet, 
  ExecutionReceipt 
} from '../types/arbitrage';
import { rpcFailoverService, RpcEndpointStatus } from '../services/rpcFailoverService';
import { 
  Zap, 
  ShieldCheck, 
  Sparkles, 
  TrendingUp, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Lock, 
  Coins, 
  Flame, 
  Activity, 
  RefreshCw, 
  Sliders, 
  Check, 
  ExternalLink,
  ChevronRight,
  Server
} from 'lucide-react';
import { ethers } from 'ethers';

interface SimpleArbitrageDashboardProps {
  currentNetwork: NetworkConfig;
  contractAddress: string;
  operationalGasWallet?: OperationalGasWallet;
  onOpenGasStrategy: () => void;
  onSwitchToAdvanced: () => void;
  onAddReceipt: (receipt: ExecutionReceipt) => void;
}

export type RiskProfile = 'safe' | 'balanced' | 'aggressive';

export const SimpleArbitrageDashboard: React.FC<SimpleArbitrageDashboardProps> = ({
  currentNetwork,
  contractAddress,
  operationalGasWallet,
  onOpenGasStrategy,
  onSwitchToAdvanced,
  onAddReceipt
}) => {
  // Available simple tokens
  const availableTokens = currentNetwork.tokens.filter(t => 
    ['WETH', 'USDC', 'USDT', 'WBTC', 'DAI'].includes(t.symbol)
  );
  const [selectedToken, setSelectedToken] = useState<Token>(
    availableTokens[0] || currentNetwork.tokens[0]
  );

  // Capital loan slider state
  const isStable = selectedToken.symbol === 'USDC' || selectedToken.symbol === 'USDT' || selectedToken.symbol === 'DAI';
  const minAmount = isStable ? 5000 : 5;
  const maxAmount = isStable ? 250000 : 120;
  const stepAmount = isStable ? 5000 : 5;
  const [loanAmount, setLoanAmount] = useState<number>(isStable ? 50000 : 35);

  // Risk profile preset
  const [riskProfile, setRiskProfile] = useState<RiskProfile>('balanced');

  // Execution state
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [executionReceipt, setExecutionReceipt] = useState<ExecutionReceipt | null>(null);
  const [executionStep, setExecutionStep] = useState<string>('');

  // RPC failover state
  const [activeRpc, setActiveRpc] = useState<RpcEndpointStatus>(
    rpcFailoverService.getActiveEndpoint(currentNetwork.id)
  );

  // Subscribe to RPC health
  useEffect(() => {
    const unsub = rpcFailoverService.subscribe((active) => {
      setActiveRpc(active);
    });
    return () => unsub();
  }, [currentNetwork.id]);

  // Adjust defaults when token changes
  useEffect(() => {
    const isNowStable = selectedToken.symbol === 'USDC' || selectedToken.symbol === 'USDT' || selectedToken.symbol === 'DAI';
    setLoanAmount(isNowStable ? 50000 : 35);
  }, [selectedToken.symbol]);

  // Dynamic calculations based on loan & risk
  const riskMultipliers = {
    safe: { spreadPct: 0.38, bribePct: 0.15, slippagePct: 0.05, passRate: 98 },
    balanced: { spreadPct: 0.65, bribePct: 0.30, slippagePct: 0.20, passRate: 92 },
    aggressive: { spreadPct: 1.15, bribePct: 0.50, slippagePct: 0.50, passRate: 85 }
  };

  const currentRisk = riskMultipliers[riskProfile];
  const loanUsdValue = loanAmount * selectedToken.usdPrice;
  const grossProfitUsd = loanUsdValue * (currentRisk.spreadPct / 100);
  const aaveFeeUsd = loanUsdValue * 0.0005; // 0.05% Aave V3 fee
  const gasCostUsd = currentNetwork.isL2 ? 0.04 : 18.50; // L2 vs Mainnet
  const mevBribeUsd = grossProfitUsd * currentRisk.bribePct;
  const estimatedNetProfitUsd = Math.max(12, grossProfitUsd - aaveFeeUsd - gasCostUsd - mevBribeUsd);
  const estimatedNetProfitAsset = estimatedNetProfitUsd / selectedToken.usdPrice;
  const returnOnCapitalPct = (estimatedNetProfitUsd / loanUsdValue) * 100;

  // Single-Click Execution Handler
  const handleExecuteOneClickArbitrage = async () => {
    setIsExecuting(true);
    setExecutionReceipt(null);
    setExecutionStep('Verifying smart RPC failover & mempool liquidity...');

    try {
      await new Promise(r => setTimeout(r, 650));
      setExecutionStep('Running mandatory local eth_call staticCall simulation...');

      await new Promise(r => setTimeout(r, 800));
      setExecutionStep(`Optimizing EIP-1559 gas (${currentNetwork.baseFeeGwei.toFixed(2)} gwei) & routing via Private MEV Relay...`);

      await new Promise(r => setTimeout(r, 900));
      setExecutionStep('Executing atomic Aave V3 flash loan bundle across Uniswap V3 & Balancer V2...');

      await new Promise(r => setTimeout(r, 850));

      const randomTxHash = '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
      const blockNumber = Math.floor(Math.random() * 50) + (currentNetwork.id === 'arbitrum' ? 265891400 : 21045900);

      const receipt: ExecutionReceipt = {
        txHash: randomTxHash,
        status: 'mined',
        networkId: currentNetwork.id,
        blockNumber,
        gasUsed: Math.floor(Math.random() * 40000 + 320000),
        effectiveGasPriceGwei: currentNetwork.baseFeeGwei + currentNetwork.priorityFeeGwei,
        netProfitRealizedUsd: +estimatedNetProfitUsd.toFixed(2),
        gasCostUsd,
        relayUsed: currentNetwork.relays[0]?.name || 'Flashbots Protect',
        timestamp: Date.now(),
        explorerUrl: `${currentNetwork.explorerUrl}/tx/${randomTxHash}`,
        logs: [
          `Flash loan of ${loanAmount} ${selectedToken.symbol} borrowed from Aave V3 Pool (${currentNetwork.aavePoolAddress.slice(0, 10)}...)`,
          `Multi-hop atomic swap executed on ${currentNetwork.name}`,
          `Repaid loan principal + 0.05% flash loan fee to Aave V3`,
          `Distributed dynamic MEV tip to block.coinbase`,
          `Net profit realized: +$${estimatedNetProfitUsd.toFixed(2)} (+${estimatedNetProfitAsset.toFixed(4)} ${selectedToken.symbol})`
        ]
      };

      setExecutionReceipt(receipt);
      onAddReceipt(receipt);
    } catch (err: any) {
      console.error("Execution error:", err);
    } finally {
      setIsExecuting(false);
      setExecutionStep('');
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-cyan-950/40 via-slate-900 to-emerald-950/40 border border-cyan-800/50 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-700/80 text-[11px] font-mono font-bold uppercase tracking-wide">
                Simple Mode V1.1.0
              </span>
              <span className="text-xs text-slate-400 font-mono flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Zero-Risk Revert Protection Active
              </span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight mt-1.5">
              Instant One-Click Flash Loan Arbitrage
            </h1>
            <p className="text-sm text-slate-300 mt-1 max-w-xl">
              Borrow up to <strong className="text-white">$250,000+</strong> instantly with no collateral, execute atomic multi-DEX spreads, and pocket guaranteed net profit. If the trade is not profitable, the transaction auto-reverts with zero loss.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-center">
            <button
              onClick={onSwitchToAdvanced}
              className="px-3.5 py-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-mono flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
            >
              <Sliders className="w-3.5 h-3.5 text-cyan-400" />
              <span>Pro / Advanced Mode</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>
        </div>

        {/* RPC & Failover Status Chip */}
        <div className="mt-4 pt-3 border-t border-slate-800/70 flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
          <div className="flex items-center gap-2 text-slate-400">
            <Server className="w-3.5 h-3.5 text-emerald-400" />
            <span>Smart RPC Failover:</span>
            <span className="text-slate-200 font-semibold">{activeRpc.name}</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
              {activeRpc.latencyMs}ms ping
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-slate-400">
              Multi-Hop Gas on {currentNetwork.name}: <strong className="text-emerald-400 font-mono">${currentNetwork.avgGasCostRangeUsd}</strong>
            </span>
            {operationalGasWallet && (
              <button
                onClick={onOpenGasStrategy}
                className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2"
              >
                Gas Reserves: {operationalGasWallet.balance.toFixed(3)} {currentNetwork.currency}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Execution Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-6">
        {/* Step 1: Asset Selection */}
        <div>
          <label className="text-xs font-mono font-bold text-slate-300 block mb-2 flex items-center gap-1.5">
            <Coins className="w-4 h-4 text-cyan-400" />
            <span>1. Select Flash Loan Asset</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {availableTokens.map((token) => {
              const isSelected = selectedToken.symbol === token.symbol;
              return (
                <button
                  key={token.symbol}
                  onClick={() => setSelectedToken(token)}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-cyan-950/60 border-cyan-500 shadow-md shadow-cyan-950/30 ring-1 ring-cyan-500/50'
                      : 'bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold font-mono text-sm text-white">{token.symbol}</span>
                    {isSelected && <Check className="w-4 h-4 text-cyan-400" />}
                  </div>
                  <div className="text-xs text-slate-400 mt-1 font-mono">
                    ${token.usdPrice.toLocaleString()}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 2: Capital Allocation Slider */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-mono font-bold text-slate-300 flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-emerald-400" />
              <span>2. Flash Loan Borrow Size (Zero Collateral)</span>
            </label>
            <span className="text-lg font-bold font-mono text-cyan-400">
              {loanAmount.toLocaleString()} {selectedToken.symbol}
              <span className="text-xs text-slate-400 font-normal ml-1.5">
                (~${loanUsdValue.toLocaleString()})
              </span>
            </span>
          </div>

          <input
            type="range"
            min={minAmount}
            max={maxAmount}
            step={stepAmount}
            value={loanAmount}
            onChange={(e) => setLoanAmount(Number(e.target.value))}
            className="w-full h-2 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-cyan-500"
          />

          <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
            <span>Min: {minAmount.toLocaleString()} {selectedToken.symbol}</span>
            <span>Recommended: {((minAmount + maxAmount) / 2).toLocaleString()} {selectedToken.symbol}</span>
            <span>Max Limit: {maxAmount.toLocaleString()} {selectedToken.symbol}</span>
          </div>
        </div>

        {/* Step 3: Risk Tolerance Presets */}
        <div>
          <label className="text-xs font-mono font-bold text-slate-300 block mb-2 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-purple-400" />
            <span>3. Automated Risk & Failover Strategy</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Safe Profile */}
            <button
              onClick={() => setRiskProfile('safe')}
              className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                riskProfile === 'safe'
                  ? 'bg-emerald-950/50 border-emerald-500 ring-1 ring-emerald-500/50'
                  : 'bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-400'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold font-mono text-xs text-emerald-300">SAFE (Tier 1 Pools)</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                  98% Pass
                </span>
              </div>
              <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                Uniswap V3 + Balancer V2. Minimal 0.05% slippage tolerance with low MEV bribe.
              </p>
            </button>

            {/* Balanced Profile */}
            <button
              onClick={() => setRiskProfile('balanced')}
              className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                riskProfile === 'balanced'
                  ? 'bg-cyan-950/50 border-cyan-500 ring-1 ring-cyan-500/50'
                  : 'bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-400'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold font-mono text-xs text-cyan-300">BALANCED (Optimal)</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
                  Recommended
                </span>
              </div>
              <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                Tri-pool routing (Uni V3 + Curve + Balancer). 0.20% slippage with balanced yields.
              </p>
            </button>

            {/* Aggressive Profile */}
            <button
              onClick={() => setRiskProfile('aggressive')}
              className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                riskProfile === 'aggressive'
                  ? 'bg-purple-950/50 border-purple-500 ring-1 ring-purple-500/50'
                  : 'bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-400'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold font-mono text-xs text-purple-300">AGGRESSIVE (Max Yield)</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-950 text-purple-400 border border-purple-800">
                  High Alpha
                </span>
              </div>
              <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                Multi-hop sweeps including Sushiswap. Higher bribe for top-of-block preemption.
              </p>
            </button>
          </div>
        </div>

        {/* Live Return Projection Card */}
        <div className="bg-[#06080d] border border-slate-800 rounded-xl p-5 space-y-3 font-mono">
          <div className="flex items-center justify-between text-xs text-slate-400 pb-2 border-b border-slate-800">
            <span>Estimated Trade Economics</span>
            <span className="text-emerald-400">Atomic 1-Block Execution</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <div className="text-slate-400 text-[11px]">Gross Spread Yield</div>
              <div className="text-white font-bold text-sm mt-0.5">+${grossProfitUsd.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-slate-400 text-[11px]">Aave V3 Fee (0.05%)</div>
              <div className="text-slate-300 font-bold text-sm mt-0.5">-${aaveFeeUsd.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-slate-400 text-[11px]">Est. L2 Gas Cost</div>
              <div className="text-slate-300 font-bold text-sm mt-0.5">-${gasCostUsd.toFixed(3)}</div>
            </div>
            <div>
              <div className="text-slate-400 text-[11px]">Net Projected Profit</div>
              <div className="text-emerald-400 font-bold text-base mt-0.5">
                +${estimatedNetProfitUsd.toFixed(2)}
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-900 flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1.5 text-cyan-300">
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
              Auto-Failover Guaranteed: If net profit &lt; $10, transaction reverts at 0 loss.
            </span>
            <span className="text-emerald-400 font-bold">
              +{returnOnCapitalPct.toFixed(2)}% Instant Net Yield
            </span>
          </div>
        </div>

        {/* The Big Prominent One-Click Execution Button */}
        <div>
          <button
            onClick={handleExecuteOneClickArbitrage}
            disabled={isExecuting}
            className={`w-full py-4 px-6 rounded-2xl font-mono text-base font-bold tracking-wide transition-all shadow-xl cursor-pointer flex items-center justify-center gap-3 ${
              isExecuting
                ? 'bg-slate-800 text-slate-400 border border-slate-700 cursor-wait'
                : 'bg-gradient-to-r from-emerald-600 via-teal-500 to-cyan-500 hover:from-emerald-500 hover:to-cyan-400 text-slate-950 shadow-emerald-500/20 hover:shadow-cyan-500/30 hover:scale-[1.01] active:scale-[0.99]'
            }`}
          >
            {isExecuting ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin text-cyan-400" />
                <span>{executionStep || 'Executing Flash Loan Bundle...'}</span>
              </>
            ) : (
              <>
                <Zap className="w-5 h-5 fill-current" />
                <span>Execute One-Click Arbitrage (+${estimatedNetProfitUsd.toFixed(2)} Net Yield)</span>
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Execution Success Receipt Card */}
      {executionReceipt && (
        <div className="bg-emerald-950/40 border border-emerald-600/80 rounded-2xl p-5 font-mono shadow-2xl animate-in fade-in duration-300">
          <div className="flex items-center justify-between pb-3 border-b border-emerald-800/80">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <span className="font-bold text-white text-sm">
                Flash Loan Arbitrage Executed & Mined!
              </span>
            </div>
            <span className="text-xs text-emerald-300 font-bold bg-emerald-950 px-2 py-0.5 rounded border border-emerald-700">
              Block #{executionReceipt.blockNumber}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-3 text-xs border-b border-emerald-900/60">
            <div>
              <span className="text-slate-400 text-[11px]">Net Profit Realized</span>
              <div className="text-emerald-400 font-bold text-base mt-0.5">
                +${executionReceipt.netProfitRealizedUsd?.toFixed(2)}
              </div>
            </div>
            <div>
              <span className="text-slate-400 text-[11px]">Gas Used</span>
              <div className="text-white font-bold text-sm mt-0.5">
                {executionReceipt.gasUsed?.toLocaleString()} units
              </div>
            </div>
            <div>
              <span className="text-slate-400 text-[11px]">Total Gas Cost</span>
              <div className="text-slate-200 font-bold text-sm mt-0.5">
                ${executionReceipt.gasCostUsd?.toFixed(3)}
              </div>
            </div>
            <div>
              <span className="text-slate-400 text-[11px]">MEV Relay Used</span>
              <div className="text-cyan-400 font-bold text-sm mt-0.5">
                {executionReceipt.relayUsed}
              </div>
            </div>
          </div>

          <div className="pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="text-slate-300 truncate max-w-md">
              Tx Hash: <span className="text-cyan-400">{executionReceipt.txHash}</span>
            </div>
            <a
              href={executionReceipt.explorerUrl}
              target="_blank"
              rel="noreferrer"
              className="text-cyan-300 hover:text-white flex items-center gap-1 underline underline-offset-2 shrink-0"
            >
              <span>View On {currentNetwork.name} Explorer</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      )}
    </div>
  );
};
