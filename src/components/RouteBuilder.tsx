import React, { useState, useEffect } from 'react';
import { 
  NetworkConfig, 
  ProtocolType, 
  SwapStep, 
  Token 
} from '../types/arbitrage';
import { encodeArbitrageParams } from '../services/mevExecutionService';
import { ethers } from 'ethers';
import { 
  Plus, 
  Trash2, 
  ArrowDown, 
  Layers, 
  Zap, 
  Code, 
  ShieldCheck, 
  Sliders, 
  HelpCircle,
  Copy,
  Check,
  Percent,
  Play
} from 'lucide-react';

interface RouteBuilderProps {
  network: NetworkConfig;
  contractAddress: string;
  onRunSimulation: (
    asset: Token,
    amount: string,
    minProfit: string,
    mevBribeBps: number,
    steps: SwapStep[]
  ) => void;
  initialSteps?: SwapStep[];
  initialAsset?: Token;
  initialAmount?: number;
}

export const RouteBuilder: React.FC<RouteBuilderProps> = ({
  network,
  contractAddress,
  onRunSimulation,
  initialSteps,
  initialAsset,
  initialAmount
}) => {
  const [selectedAsset, setSelectedAsset] = useState<Token>(initialAsset || network.tokens[0]);
  const [loanAmount, setLoanAmount] = useState<string>(
    initialAmount ? initialAmount.toString() : (selectedAsset.decimals > 6 ? "50" : "150000")
  );
  const [minProfit, setMinProfit] = useState<string>("0.15");
  const [mevBribeBps, setMevBribeBps] = useState<number>(1500); // 15% to miner
  const [slippagePct, setSlippagePct] = useState<number>(0.2); // 0.2%
  const [copiedCalldata, setCopiedCalldata] = useState<boolean>(false);

  // Initialize steps
  const [steps, setSteps] = useState<SwapStep[]>(() => {
    if (initialSteps && initialSteps.length > 0) return initialSteps;
    const tokenIn = network.tokens[0];
    const tokenOut = network.tokens.length > 1 ? network.tokens[1] : network.tokens[0];
    const dex1 = network.dexes[0];
    const dex2 = network.dexes.length > 1 ? network.dexes[1] : network.dexes[0];

    return [
      {
        id: `step-${Date.now()}-1`,
        protocol: dex1.protocol,
        targetContract: dex1.routerAddress,
        tokenIn: tokenIn.address,
        tokenOut: tokenOut.address,
        v3Fee: 500,
        balancerPoolId: ethers.ZeroHash,
        minAmountOut: "0",
        slippageTolerancePct: 0.15,
        tokenInSymbol: tokenIn.symbol,
        tokenOutSymbol: tokenOut.symbol,
        dexName: dex1.name
      },
      {
        id: `step-${Date.now()}-2`,
        protocol: dex2.protocol,
        targetContract: dex2.routerAddress,
        tokenIn: tokenOut.address,
        tokenOut: tokenIn.address,
        v3Fee: 3000,
        balancerPoolId: ethers.ZeroHash,
        minAmountOut: "0",
        slippageTolerancePct: 0.20,
        tokenInSymbol: tokenOut.symbol,
        tokenOutSymbol: tokenIn.symbol,
        dexName: dex2.name
      }
    ];
  });

  // When props change
  useEffect(() => {
    if (initialAsset) setSelectedAsset(initialAsset);
    if (initialAmount) setLoanAmount(initialAmount.toString());
    if (initialSteps && initialSteps.length > 0) setSteps(initialSteps);
  }, [initialAsset, initialAmount, initialSteps]);

  // Update step
  const updateStep = (index: number, updates: Partial<SwapStep>) => {
    const newSteps = [...steps];
    newSteps[index] = { ...newSteps[index], ...updates };
    setSteps(newSteps);
  };

  const addStep = () => {
    const lastStep = steps[steps.length - 1];
    const nextTokenIn = lastStep ? lastStep.tokenOut : selectedAsset.address;
    const nextTokenOut = selectedAsset.address;
    const dex = network.dexes[Math.min(steps.length, network.dexes.length - 1)];

    setSteps([
      ...steps,
      {
        id: `step-${Date.now()}-${steps.length + 1}`,
        protocol: dex.protocol,
        targetContract: dex.routerAddress,
        tokenIn: nextTokenIn,
        tokenOut: nextTokenOut,
        v3Fee: 3000,
        balancerPoolId: ethers.ZeroHash,
        minAmountOut: "0",
        slippageTolerancePct: 0.15,
        tokenInSymbol: network.tokens.find(t => t.address === nextTokenIn)?.symbol || "TOKEN",
        tokenOutSymbol: network.tokens.find(t => t.address === nextTokenOut)?.symbol || selectedAsset.symbol,
        dexName: dex.name
      }
    ]);
  };

  const removeStep = (index: number) => {
    if (steps.length <= 2) return;
    setSteps(steps.filter((_, i) => i !== index));
  };

  // Compute raw values
  const loanAmountRaw = (() => {
    try {
      return ethers.parseUnits(loanAmount || "0", selectedAsset.decimals).toString();
    } catch {
      return "0";
    }
  })();

  const minProfitRaw = (() => {
    try {
      return ethers.parseUnits(minProfit || "0", selectedAsset.decimals).toString();
    } catch {
      return "0";
    }
  })();

  // Calldata preview
  const encodedCalldata = (() => {
    try {
      return encodeArbitrageParams({
        minProfit: minProfitRaw,
        mevBribeBps,
        steps
      });
    } catch {
      return "0x";
    }
  })();

  const handleCopyCalldata = () => {
    navigator.clipboard.writeText(encodedCalldata);
    setCopiedCalldata(true);
    setTimeout(() => setCopiedCalldata(false), 2000);
  };

  const aaveFee = (parseFloat(loanAmount || "0") * 0.0005).toFixed(4);
  const loanValueUsd = (parseFloat(loanAmount || "0") * selectedAsset.usdPrice).toLocaleString();

  return (
    <div className="space-y-6">
      {/* Configuration Header Card */}
      <div className="bg-[#0b0e14] border border-slate-800 rounded-xl p-5 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-5 pb-4 border-b border-slate-800/80">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-cyan-400" />
              <span>Multi-Protocol Swap Route Configurator</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Defines the atomic execution sequence invoked inside <code className="text-cyan-300">executeOperation(...)</code> on Aave V3.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="text-slate-400">Target Receiver:</span>
            <span className="text-slate-200 bg-slate-900 px-2.5 py-1 rounded border border-slate-800">
              {contractAddress.slice(0, 10)}...{contractAddress.slice(-6)}
            </span>
          </div>
        </div>

        {/* Loan Asset & Amount Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Asset Selection */}
          <div>
            <label className="block text-xs font-mono text-slate-400 mb-1.5">
              1. Flash Loan Asset (Aave V3 Pool)
            </label>
            <div className="grid grid-cols-3 gap-2">
              {network.tokens.slice(0, 3).map((token) => (
                <button
                  key={token.symbol}
                  onClick={() => {
                    setSelectedAsset(token);
                    if (steps[0]) {
                      updateStep(0, { tokenIn: token.address, tokenInSymbol: token.symbol });
                    }
                    if (steps[steps.length - 1]) {
                      updateStep(steps.length - 1, { tokenOut: token.address, tokenOutSymbol: token.symbol });
                    }
                  }}
                  className={`p-2 rounded-lg border text-xs font-mono font-medium transition-all ${
                    selectedAsset.symbol === token.symbol
                      ? 'bg-cyan-950/80 border-cyan-500 text-cyan-300 shadow-md shadow-cyan-950/40'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-900'
                  }`}
                >
                  <div className="font-bold">{token.symbol}</div>
                  <div className="text-[10px] text-slate-500 font-normal">${token.usdPrice.toLocaleString()}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Loan Amount */}
          <div>
            <label className="block text-xs font-mono text-slate-400 mb-1.5 flex items-center justify-between">
              <span>2. Borrow Amount</span>
              <span className="text-slate-500 font-normal">Est: ~${loanValueUsd}</span>
            </label>
            <div className="relative">
              <input
                type="number"
                value={loanAmount}
                onChange={(e) => setLoanAmount(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-cyan-500"
                placeholder="0.0"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-500">
                {selectedAsset.symbol}
              </span>
            </div>
            <div className="text-[11px] font-mono text-slate-500 mt-1 flex items-center justify-between">
              <span>Aave V3 Fee (5 bps):</span>
              <span className="text-amber-400 font-semibold">{aaveFee} {selectedAsset.symbol}</span>
            </div>
          </div>

          {/* Min Profit & MEV Bribe */}
          <div>
            <label className="block text-xs font-mono text-slate-400 mb-1.5 flex items-center justify-between">
              <span>3. Minimum Net Profit Gate</span>
              <span className="text-emerald-400 font-mono text-[10px]">revert protection</span>
            </label>
            <div className="relative mb-2">
              <input
                type="text"
                value={minProfit}
                onChange={(e) => setMinProfit(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-emerald-500"
                placeholder="0.0"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-500">
                {selectedAsset.symbol}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs font-mono text-slate-400">
              <span>Miner Tip (Bribe BPS):</span>
              <span className="text-purple-400 font-bold">{mevBribeBps} BPS ({(mevBribeBps / 100).toFixed(1)}%)</span>
            </div>
            <input
              type="range"
              min="0"
              max="5000"
              step="250"
              value={mevBribeBps}
              onChange={(e) => setMevBribeBps(Number(e.target.value))}
              className="w-full accent-purple-500 mt-1 cursor-pointer"
            />
          </div>
        </div>

        {/* Step-by-Step Swap Route Visualizer */}
        <div className="space-y-3 mb-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <span>Atomic Swap Sequence ({steps.length} Steps)</span>
            </h3>

            <button
              onClick={addStep}
              className="text-xs font-mono px-2.5 py-1 rounded bg-slate-800 text-slate-200 hover:text-white hover:bg-slate-700 flex items-center gap-1 transition-colors"
            >
              <Plus className="w-3 h-3 text-cyan-400" />
              <span>Add Hop</span>
            </button>
          </div>

          {/* Flash loan entry node */}
          <div className="p-3 bg-cyan-950/20 border border-cyan-800/50 rounded-lg flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-cyan-900 border border-cyan-700 text-cyan-300 flex items-center justify-center font-bold text-[10px]">
                0
              </span>
              <span className="text-cyan-300 font-semibold">Aave V3 Flash Loan Simple:</span>
              <span className="text-white">Borrow {loanAmount} {selectedAsset.symbol}</span>
            </div>
            <span className="text-[11px] text-cyan-400/80 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-900">
              zero upfront collateral
            </span>
          </div>

          {/* Steps */}
          {steps.map((step, idx) => (
            <div key={idx} className="relative">
              <div className="flex justify-center -my-1.5 relative z-10">
                <ArrowDown className="w-4 h-4 text-slate-600 bg-[#0b0e14] rounded-full p-0.5" />
              </div>

              <div className="bg-slate-950/90 border border-slate-800 rounded-lg p-3 text-xs font-mono hover:border-slate-700 transition-colors">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2 pb-2 border-b border-slate-800/60">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center font-bold text-[10px]">
                      {idx + 1}
                    </span>
                    <span className="text-white font-semibold">Step {idx + 1}: Swap via</span>
                    
                    {/* Protocol selector */}
                    <select
                      value={step.protocol}
                      onChange={(e) => {
                        const newProto = Number(e.target.value) as ProtocolType;
                        const matchingDex = network.dexes.find(d => d.protocol === newProto) || network.dexes[0];
                        updateStep(idx, { 
                          protocol: newProto, 
                          targetContract: matchingDex.routerAddress,
                          dexName: matchingDex.name
                        });
                      }}
                      className="bg-slate-900 border border-slate-700 text-cyan-300 rounded px-2 py-0.5 text-xs focus:outline-none"
                    >
                      <option value={ProtocolType.UNISWAP_V3}>Uniswap V3</option>
                      <option value={ProtocolType.UNISWAP_V2}>Uniswap V2 / Fork</option>
                      <option value={ProtocolType.BALANCER_V2}>Balancer V2 Vault</option>
                      <option value={ProtocolType.CURVE_V2}>Curve V2 Router</option>
                    </select>
                  </div>

                  {steps.length > 2 && (
                    <button
                      onClick={() => removeStep(idx)}
                      className="text-slate-500 hover:text-rose-400 p-1"
                      title="Remove Hop"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Token In */}
                  <div>
                    <span className="text-[10px] text-slate-500 block mb-1">Token In:</span>
                    <select
                      value={step.tokenIn}
                      onChange={(e) => {
                        const token = network.tokens.find(t => t.address.toLowerCase() === e.target.value.toLowerCase());
                        updateStep(idx, { tokenIn: e.target.value, tokenInSymbol: token?.symbol || "TOKEN" });
                      }}
                      className="w-full bg-slate-900 border border-slate-800 text-white rounded px-2 py-1 text-xs"
                    >
                      {network.tokens.map(t => (
                        <option key={t.address} value={t.address}>{t.symbol} ({t.name})</option>
                      ))}
                    </select>
                  </div>

                  {/* Token Out */}
                  <div>
                    <span className="text-[10px] text-slate-500 block mb-1">Token Out:</span>
                    <select
                      value={step.tokenOut}
                      onChange={(e) => {
                        const token = network.tokens.find(t => t.address.toLowerCase() === e.target.value.toLowerCase());
                        updateStep(idx, { tokenOut: e.target.value, tokenOutSymbol: token?.symbol || "TOKEN" });
                      }}
                      className="w-full bg-slate-900 border border-slate-800 text-white rounded px-2 py-1 text-xs"
                    >
                      {network.tokens.map(t => (
                        <option key={t.address} value={t.address}>{t.symbol} ({t.name})</option>
                      ))}
                    </select>
                  </div>

                  {/* Protocol-Specific Parameters */}
                  <div>
                    {step.protocol === ProtocolType.UNISWAP_V3 && (
                      <div>
                        <span className="text-[10px] text-slate-500 block mb-1">V3 Pool Fee Tier:</span>
                        <select
                          value={step.v3Fee}
                          onChange={(e) => updateStep(idx, { v3Fee: Number(e.target.value) })}
                          className="w-full bg-slate-900 border border-slate-800 text-cyan-300 rounded px-2 py-1 text-xs"
                        >
                          <option value={100}>0.01% (100)</option>
                          <option value={500}>0.05% (500)</option>
                          <option value={3000}>0.30% (3000)</option>
                          <option value={10000}>1.00% (10000)</option>
                        </select>
                      </div>
                    )}

                    {step.protocol === ProtocolType.BALANCER_V2 && (
                      <div>
                        <span className="text-[10px] text-slate-500 block mb-1">Balancer Pool ID:</span>
                        <input
                          type="text"
                          value={step.balancerPoolId}
                          onChange={(e) => updateStep(idx, { balancerPoolId: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-800 text-slate-300 rounded px-2 py-1 text-[11px]"
                          placeholder="0x..."
                        />
                      </div>
                    )}

                    {(step.protocol === ProtocolType.UNISWAP_V2 || step.protocol === ProtocolType.CURVE_V2) && (
                      <div>
                        <span className="text-[10px] text-slate-500 block mb-1">Target Router / Pool:</span>
                        <input
                          type="text"
                          value={step.targetContract}
                          onChange={(e) => updateStep(idx, { targetContract: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-800 text-slate-300 rounded px-2 py-1 text-[11px]"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Flash loan repayment exit node */}
          <div className="flex justify-center -my-1.5 relative z-10">
            <ArrowDown className="w-4 h-4 text-slate-600 bg-[#0b0e14] rounded-full p-0.5" />
          </div>

          <div className="p-3 bg-emerald-950/20 border border-emerald-800/50 rounded-lg flex flex-wrap items-center justify-between text-xs font-mono gap-2">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-emerald-900 border border-emerald-700 text-emerald-300 flex items-center justify-center font-bold text-[10px]">
                &#10003;
              </span>
              <span className="text-emerald-300 font-semibold">Repayment Verification & Profit Harvest:</span>
              <span className="text-white">
                Repay {loanAmount} + {aaveFee} {selectedAsset.symbol}
              </span>
            </div>
            <div className="text-[11px] text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-900">
              Min Net Profit &gt;= {minProfit} {selectedAsset.symbol}
            </div>
          </div>
        </div>

        {/* Encoded Params Calldata Preview */}
        <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg font-mono text-xs mb-5">
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="flex items-center gap-1.5 text-cyan-400">
              <Code className="w-3.5 h-3.5" />
              <span>ABI Encoded ArbitrageParams (bytes calldata params)</span>
            </span>
            <button
              onClick={handleCopyCalldata}
              className="text-slate-400 hover:text-white flex items-center gap-1 text-[11px] transition-colors"
            >
              {copiedCalldata ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copiedCalldata ? "Copied" : "Copy Calldata"}</span>
            </button>
          </div>
          <div className="break-all text-[11px] text-slate-400 bg-black/60 p-2 rounded max-h-16 overflow-y-auto border border-slate-900">
            {encodedCalldata}
          </div>
        </div>

        {/* Execution Triggers */}
        <div className="flex flex-wrap items-center justify-end gap-3">
          <button
            onClick={() => onRunSimulation(selectedAsset, loanAmount, minProfit, mevBribeBps, steps)}
            className="px-5 py-2.5 bg-gradient-to-r from-cyan-600 via-indigo-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white font-mono text-xs font-bold rounded-lg flex items-center gap-2 shadow-lg shadow-cyan-950 cursor-pointer transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>Dry-Run Simulation (eth_call)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
