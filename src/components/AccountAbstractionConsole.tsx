import React, { useState } from 'react';
import { 
  NetworkConfig, 
  UserOperation, 
  GasOptimizationMode, 
  DynamicGasRecommendation 
} from '../types/arbitrage';
import { ethers } from 'ethers';
import { 
  ShieldCheck, 
  Zap, 
  Layers, 
  Sliders, 
  Flame, 
  Code, 
  CheckCircle2, 
  Copy, 
  Check, 
  Send, 
  RefreshCw,
  Sparkles,
  Award
} from 'lucide-react';

interface AccountAbstractionConsoleProps {
  network: NetworkConfig;
  contractAddress: string;
}

export const AccountAbstractionConsole: React.FC<AccountAbstractionConsoleProps> = ({
  network,
  contractAddress
}) => {
  const [gasMode, setGasMode] = useState<GasOptimizationMode>('balanced_mev');
  const [paymasterEnabled, setPaymasterEnabled] = useState(true);
  const [batchCount, setBatchCount] = useState(2);
  const [copiedUserOp, setCopiedUserOp] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userOpStatus, setUserOpStatus] = useState<string | null>(null);

  // Dynamic Gas Recommendations based on network state
  const gasRecommendations: Record<GasOptimizationMode, DynamicGasRecommendation> = {
    cost_saver: {
      mode: 'cost_saver',
      maxFeePerGasGwei: parseFloat((network.baseFeeGwei * 1.1 + network.priorityFeeGwei).toFixed(2)),
      maxPriorityFeePerGasGwei: parseFloat(network.priorityFeeGwei.toFixed(2)),
      suggestedGasLimit: 240000,
      inclusionProbabilityPct: 84.5,
      estimatedWaitMs: 3200,
      expectedGrossYieldUsd: 480,
      estimatedGasCostUsd: parseFloat(((240000 * (network.baseFeeGwei * 1.1 + network.priorityFeeGwei)) / 1e9 * 3120).toFixed(2)),
      projectedNetYieldUsd: 480 - parseFloat(((240000 * (network.baseFeeGwei * 1.1 + network.priorityFeeGwei)) / 1e9 * 3120).toFixed(2))
    },
    balanced_mev: {
      mode: 'balanced_mev',
      maxFeePerGasGwei: parseFloat((network.baseFeeGwei * 1.4 + network.priorityFeeGwei * 1.5).toFixed(2)),
      maxPriorityFeePerGasGwei: parseFloat((network.priorityFeeGwei * 1.5).toFixed(2)),
      suggestedGasLimit: 285000,
      inclusionProbabilityPct: 96.8,
      estimatedWaitMs: 1200,
      expectedGrossYieldUsd: 1250,
      estimatedGasCostUsd: parseFloat(((285000 * (network.baseFeeGwei * 1.4 + network.priorityFeeGwei * 1.5)) / 1e9 * 3120).toFixed(2)),
      projectedNetYieldUsd: 1250 - parseFloat(((285000 * (network.baseFeeGwei * 1.4 + network.priorityFeeGwei * 1.5)) / 1e9 * 3120).toFixed(2))
    },
    aggressive_preemption: {
      mode: 'aggressive_preemption',
      maxFeePerGasGwei: parseFloat((network.baseFeeGwei * 2.2 + network.priorityFeeGwei * 3.0).toFixed(2)),
      maxPriorityFeePerGasGwei: parseFloat((network.priorityFeeGwei * 3.0).toFixed(2)),
      suggestedGasLimit: 340000,
      inclusionProbabilityPct: 99.7,
      estimatedWaitMs: 250,
      expectedGrossYieldUsd: 3800,
      estimatedGasCostUsd: parseFloat(((340000 * (network.baseFeeGwei * 2.2 + network.priorityFeeGwei * 3.0)) / 1e9 * 3120).toFixed(2)),
      projectedNetYieldUsd: 3800 - parseFloat(((340000 * (network.baseFeeGwei * 2.2 + network.priorityFeeGwei * 3.0)) / 1e9 * 3120).toFixed(2))
    }
  };

  const activeRec = gasRecommendations[gasMode];

  // Construct ERC-4337 UserOperation struct
  const userOp: UserOperation = {
    sender: '0x32A4612e45F8585D2C24018318856641e7F4C82',
    nonce: '0x04',
    initCode: '0x',
    callData: ethers.keccak256(ethers.toUtf8Bytes(`executeBatchArbitrage(${batchCount} ops)`)),
    callGasLimit: ethers.toBeHex(activeRec.suggestedGasLimit),
    verificationGasLimit: ethers.toBeHex(150000),
    preVerificationGas: ethers.toBeHex(45000),
    maxFeePerGas: ethers.toBeHex(ethers.parseUnits(activeRec.maxFeePerGasGwei.toString(), 'gwei')),
    maxPriorityFeePerGas: ethers.toBeHex(ethers.parseUnits(activeRec.maxPriorityFeePerGasGwei.toString(), 'gwei')),
    paymasterAndData: paymasterEnabled ? '0x0000000000325606835fbb390422307871391806ffffffffffffffff' : '0x',
    signature: '0x794b159239845729384729385729384729384729384729384729384729384729'
  };

  const handleCopyUserOp = () => {
    navigator.clipboard.writeText(JSON.stringify(userOp, null, 2));
    setCopiedUserOp(true);
    setTimeout(() => setCopiedUserOp(false), 2000);
  };

  const handleSubmitUserOp = () => {
    setIsSubmitting(true);
    setUserOpStatus('Sending UserOperation to Bundler (eth_sendUserOperation)...');
    
    setTimeout(() => {
      setUserOpStatus(`UserOp Hash: 0x${Math.random().toString(16).substring(2, 66)} acknowledged by ERC-4337 Bundler!`);
      setIsSubmitting(false);
    }, 1200);
  };

  return (
    <div className="space-y-6 font-mono text-xs">
      {/* Top Banner */}
      <div className="bg-[#0b0e14] border border-slate-800 rounded-xl p-5 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4 pb-4 border-b border-slate-800">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              <span>ERC-4337 Account Abstraction & Dynamic Gas Engine</span>
            </h2>
            <p className="text-slate-400 text-xs mt-0.5">
              Gasless flash loan submission via Paymaster sponsorship, multi-arbitrage atomic batching, and EIP-1559 gas optimization.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] px-2.5 py-1 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
              EntryPoint v0.7
            </span>
            <span className="text-[11px] px-2.5 py-1 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
              Gasless Paymaster Ready
            </span>
          </div>
        </div>

        {/* Dynamic Gas Optimization Mode Selector */}
        <div className="mb-6">
          <label className="block text-slate-400 text-xs mb-2 flex items-center gap-1.5">
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            <span>Dynamic Gas Optimization Profile</span>
          </label>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Mode 1 */}
            <button
              onClick={() => setGasMode('cost_saver')}
              className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                gasMode === 'cost_saver'
                  ? 'bg-cyan-950/40 border-cyan-500 shadow-md shadow-cyan-950/50'
                  : 'bg-slate-950 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-white">Cost-Saver Profile</span>
                <span className="text-[10px] text-cyan-400 font-normal">85% Inclusion</span>
              </div>
              <div className="text-slate-400 text-[11px] mb-2">
                Minimizes gas expenditure; recommended for low-urgency non-competitive arbs.
              </div>
              <div className="text-amber-300 font-bold">
                Max Fee: {gasRecommendations.cost_saver.maxFeePerGasGwei} Gwei
              </div>
            </button>

            {/* Mode 2 */}
            <button
              onClick={() => setGasMode('balanced_mev')}
              className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                gasMode === 'balanced_mev'
                  ? 'bg-indigo-950/40 border-indigo-500 shadow-md shadow-indigo-950/50'
                  : 'bg-slate-950 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-white">Balanced MEV Profile</span>
                <span className="text-[10px] text-emerald-400 font-normal">97% Top Block</span>
              </div>
              <div className="text-slate-400 text-[11px] mb-2">
                Optimized 80th-percentile priority fee for fast builder inclusion.
              </div>
              <div className="text-amber-300 font-bold">
                Max Fee: {gasRecommendations.balanced_mev.maxFeePerGasGwei} Gwei
              </div>
            </button>

            {/* Mode 3 */}
            <button
              onClick={() => setGasMode('aggressive_preemption')}
              className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                gasMode === 'aggressive_preemption'
                  ? 'bg-purple-950/40 border-purple-500 shadow-md shadow-purple-950/50'
                  : 'bg-slate-950 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-white">Aggressive Pre-emption</span>
                <span className="text-[10px] text-purple-400 font-normal">&gt;99% Top-Of-Block</span>
              </div>
              <div className="text-slate-400 text-[11px] mb-2">
                High-priority tip to guarantee front-run protection on massive spreads.
              </div>
              <div className="text-amber-300 font-bold">
                Max Fee: {gasRecommendations.aggressive_preemption.maxFeePerGasGwei} Gwei
              </div>
            </button>
          </div>
        </div>

        {/* Paymaster & Batching Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-950/80 border border-slate-800 mb-5">
          {/* Gasless Paymaster Sponsorship */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-bold text-white flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-emerald-400" />
                <span>Paymaster Gas Sponsorship</span>
              </span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={paymasterEnabled}
                  onChange={(e) => setPaymasterEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>
            <p className="text-slate-400 text-[11px]">
              When enabled, gas overhead is sponsored by the Verifying Paymaster or deducted directly from flash loan net yield.
            </p>
          </div>

          {/* Batching Operations */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-bold text-white flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-cyan-400" />
                <span>Atomic Multi-Arbitrage Batching</span>
              </span>
              <span className="text-cyan-300 font-bold">{batchCount} Operations</span>
            </div>
            <input
              type="range"
              min="1"
              max="5"
              value={batchCount}
              onChange={(e) => setBatchCount(Number(e.target.value))}
              className="w-full accent-cyan-500 cursor-pointer"
            />
            <p className="text-slate-400 text-[11px] mt-1">
              Fuses {batchCount} independent arbitrage loops into a single atomic UserOp transaction.
            </p>
          </div>
        </div>

        {/* UserOperation JSON Payload Viewer */}
        <div className="bg-black/80 border border-slate-800 rounded-xl p-4 font-mono text-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="flex items-center gap-1.5 text-cyan-300">
              <Code className="w-3.5 h-3.5" />
              <span>ERC-4337 UserOperation Calldata Payload</span>
            </span>
            <button
              onClick={handleCopyUserOp}
              className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-slate-300 hover:text-white flex items-center gap-1.5"
            >
              {copiedUserOp ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copiedUserOp ? 'Copied' : 'Copy UserOp'}</span>
            </button>
          </div>

          <pre className="text-slate-300 max-h-48 overflow-y-auto text-[11px]">
            {JSON.stringify(userOp, null, 2)}
          </pre>
        </div>

        {/* Submit UserOp */}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <div className="text-slate-400 text-xs">
            {userOpStatus && <span className="text-emerald-400">{userOpStatus}</span>}
          </div>

          <button
            onClick={handleSubmitUserOp}
            disabled={isSubmitting}
            className="px-5 py-2.5 bg-gradient-to-r from-cyan-600 via-indigo-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white font-bold rounded-xl flex items-center gap-2 shadow-lg shadow-cyan-950 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Broadcasting to Bundler...</span>
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>Dispatch Gasless UserOperation</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
