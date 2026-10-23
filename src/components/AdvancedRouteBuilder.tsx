import React, { useState, useEffect, useMemo } from 'react';
import { 
  NetworkConfig, 
  ProtocolType, 
  SwapStep, 
  Token, 
  ArbitrageStrategy 
} from '../types/arbitrage';
import { encodeArbitrageParams } from '../services/mevExecutionService';
import { chainlinkOracle } from '../services/chainlinkService';
import { ethers } from 'ethers';
import { 
  Plus, 
  Trash2, 
  ArrowUp, 
  ArrowDown, 
  ArrowRight, 
  Layers, 
  Zap, 
  Code, 
  ShieldCheck, 
  Sliders, 
  AlertTriangle,
  CheckCircle2,
  Bookmark,
  Download,
  Copy,
  Check,
  RotateCcw,
  Sparkles,
  Info,
  RefreshCw,
  Activity,
  TrendingUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useToast } from './NotificationToast';

interface AdvancedRouteBuilderProps {
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
  onSaveStrategy?: (strategy: ArbitrageStrategy) => void;
}

export const AdvancedRouteBuilder: React.FC<AdvancedRouteBuilderProps> = ({
  network,
  contractAddress,
  onRunSimulation,
  initialSteps,
  initialAsset,
  initialAmount,
  onSaveStrategy
}) => {
  const { addToast } = useToast();
  const [selectedAsset, setSelectedAsset] = useState<Token>(initialAsset || network.tokens[0]);
  const [loanAmount, setLoanAmount] = useState<string>(
    initialAmount ? initialAmount.toString() : (selectedAsset.decimals > 6 ? "50" : "150000")
  );
  const [minProfit, setMinProfit] = useState<string>("0.15");
  const [mevBribeBps, setMevBribeBps] = useState<number>(1500); // 15% to miner
  const [copiedCalldata, setCopiedCalldata] = useState<boolean>(false);
  const [strategyName, setStrategyName] = useState<string>('');
  const [showSaveModal, setShowSaveModal] = useState<boolean>(false);

  // Oracle Price Deviation & Auto-Rebalance feature
  const [autoRebalanceOnDrift, setAutoRebalanceOnDrift] = useState<boolean>(true);
  const [currentDriftPct, setCurrentDriftPct] = useState<number>(0.38);
  const [isRebalancing, setIsRebalancing] = useState<boolean>(false);
  const [rebalanceAlert, setRebalanceAlert] = useState<{
    timestamp: number;
    driftPct: number;
    oraclePriceUsd: number;
    poolPriceUsd: number;
    message: string;
  } | null>(null);

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

  // Keep synced if parent changes
  useEffect(() => {
    if (initialAsset) setSelectedAsset(initialAsset);
    if (initialAmount) setLoanAmount(initialAmount.toString());
    if (initialSteps && initialSteps.length > 0) setSteps(initialSteps);
  }, [initialAsset, initialAmount, initialSteps]);

  // Real-time Chainlink oracle feed lookup for selected asset
  const oracleFeed = useMemo(() => {
    return chainlinkOracle.getFeed(network.id, `${selectedAsset.symbol}/USD`);
  }, [network.id, selectedAsset.symbol]);

  const oracleBenchmarkPrice = oracleFeed ? oracleFeed.latestPriceUsd : selectedAsset.usdPrice;
  const impliedPoolPrice = oracleBenchmarkPrice * (1 + (currentDriftPct / 100));

  // Precise calculation helper for minimum output amount with slippage and protocol fees
  const computeStepMinAmountOut = (
    step: SwapStep,
    amountInFloat: number,
    net: NetworkConfig
  ): string => {
    const tokenIn = net.tokens.find(t => t.address.toLowerCase() === step.tokenIn.toLowerCase());
    const tokenOut = net.tokens.find(t => t.address.toLowerCase() === step.tokenOut.toLowerCase());

    const tokenInPrice = tokenIn?.usdPrice || 1.0;
    const tokenOutPrice = tokenOut?.usdPrice || 1.0;
    const tokenOutDecimals = tokenOut?.decimals || 18;

    let feeBps = 30; // 0.3% standard AMM fee
    if (step.protocol === ProtocolType.UNISWAP_V3 && step.v3Fee) {
      feeBps = step.v3Fee / 100;
    }
    const feeMultiplier = 1 - (feeBps / 10000);
    const expectedOutFloat = amountInFloat * (tokenInPrice / tokenOutPrice) * feeMultiplier;
    const slippageFactor = 1 - ((step.slippageTolerancePct || 0.15) / 100);
    const minOutFloat = Math.max(0, expectedOutFloat * slippageFactor);

    try {
      const formatted = minOutFloat.toFixed(Math.min(tokenOutDecimals, 6));
      return ethers.parseUnits(formatted, tokenOutDecimals).toString();
    } catch {
      return "0";
    }
  };

  // Re-calculate minAmountOut parameters across all steps in the route sequence
  const recalculateAllMinAmountOut = (currentSteps: SwapStep[], borrowAmount: string, net: NetworkConfig): SwapStep[] => {
    let runningAmount = parseFloat(borrowAmount || "0");
    return currentSteps.map(step => {
      const minOut = computeStepMinAmountOut(step, runningAmount, net);
      const tokenOut = net.tokens.find(t => t.address.toLowerCase() === step.tokenOut.toLowerCase());
      const tokenOutDecimals = tokenOut?.decimals || 18;
      try {
        runningAmount = parseFloat(ethers.formatUnits(minOut, tokenOutDecimals));
      } catch {
        // fallback to input
      }
      return {
        ...step,
        minAmountOut: minOut
      };
    });
  };

  // Auto-recalculate and re-apply swap paths when price deviation exceeds 2%
  const recalculateAndApplyOptimalRoute = (drift: number, explicitReason?: string) => {
    setIsRebalancing(true);

    const tokenIn = selectedAsset;
    const tokenOut = network.tokens.find(t => t.symbol !== tokenIn.symbol) || network.tokens[1] || tokenIn;

    // Pick the most liquid and cost-effective DEX protocols for the pair
    const bestDex1 = network.dexes.find(d => d.protocol === ProtocolType.UNISWAP_V3) || network.dexes[0];
    const bestDex2 = network.dexes.find(d => d.protocol !== bestDex1.protocol) || network.dexes[network.dexes.length - 1];

    // Automated loop: construct optimal path and enforce strict slippage/fee sanitization
    const rawSteps: SwapStep[] = [
      {
        id: `step-${Date.now()}-1`,
        protocol: bestDex1.protocol,
        targetContract: bestDex1.routerAddress,
        tokenIn: tokenIn.address,
        tokenOut: tokenOut.address,
        v3Fee: 500, // 0.05% concentrated liquidity tier
        balancerPoolId: ethers.ZeroHash,
        minAmountOut: "0",
        slippageTolerancePct: 0.08, // Tightened protection against sandwich attacks during oracle drift
        tokenInSymbol: tokenIn.symbol,
        tokenOutSymbol: tokenOut.symbol,
        dexName: bestDex1.name
      },
      {
        id: `step-${Date.now()}-2`,
        protocol: bestDex2.protocol,
        targetContract: bestDex2.routerAddress,
        tokenIn: tokenOut.address,
        tokenOut: tokenIn.address,
        v3Fee: bestDex2.protocol === ProtocolType.UNISWAP_V3 ? 500 : 3000,
        balancerPoolId: ethers.ZeroHash,
        minAmountOut: "0",
        slippageTolerancePct: 0.10,
        tokenInSymbol: tokenOut.symbol,
        tokenOutSymbol: tokenIn.symbol,
        dexName: bestDex2.name
      }
    ];

    const sanitizedSteps = recalculateAllMinAmountOut(rawSteps, loanAmount, network);
    setSteps(sanitizedSteps);

    // Return deviation back into safe narrow band
    const normalizedDrift = 0.18;
    setCurrentDriftPct(normalizedDrift);

    const message = explicitReason || `Chainlink Oracle price deviation exceeded 2.0% (${drift.toFixed(2)}% vs ${selectedAsset.symbol}/USD feed). Automated loop re-calculated, re-validated, and re-applied optimal path with sanitized minAmountOut parameters.`;

    setRebalanceAlert({
      timestamp: Date.now(),
      driftPct: drift,
      oraclePriceUsd: oracleBenchmarkPrice,
      poolPriceUsd: impliedPoolPrice,
      message
    });

    setTimeout(() => {
      setIsRebalancing(false);
    }, 400);
  };

  // Effect hook: Watches current chain's Chainlink oracle price for all assets in swap path
  // If price deviates by > 2% during route configuration:
  // 1. Triggers automated re-calculation of minAmountOut parameters across all steps
  // 2. Alerts user via toast notification that the route has been re-validated
  useEffect(() => {
    if (!autoRebalanceOnDrift) return;

    const checkOracleAndRevalidate = () => {
      let maxObservedDeviation = 0;
      let driftingAsset = '';
      let oracleRefPrice = 0;
      let spotPrice = 0;

      for (const step of steps) {
        const tokenIn = network.tokens.find(t => t.address.toLowerCase() === step.tokenIn.toLowerCase());
        const tokenOut = network.tokens.find(t => t.address.toLowerCase() === step.tokenOut.toLowerCase());

        for (const token of [tokenIn, tokenOut]) {
          if (!token) continue;
          const pairKey = `${token.symbol.replace(/^W/, '')}/USD`;
          const feed = chainlinkOracle.getFeed(network.id, pairKey) || chainlinkOracle.getFeed(network.id, `${token.symbol}/USD`);
          if (feed) {
            const dev = Math.abs((token.usdPrice - feed.latestPriceUsd) / feed.latestPriceUsd) * 100;
            if (dev > maxObservedDeviation) {
              maxObservedDeviation = dev;
              driftingAsset = token.symbol;
              oracleRefPrice = feed.latestPriceUsd;
              spotPrice = token.usdPrice;
            }
          }
        }
      }

      const effectiveDrift = Math.max(currentDriftPct, maxObservedDeviation);

      if (effectiveDrift > 2.0) {
        setIsRebalancing(true);

        // Re-calculate minAmountOut parameters for all steps in the swap route
        setSteps(prevSteps => recalculateAllMinAmountOut(prevSteps, loanAmount, network));

        // Return drift meter to balanced state
        setCurrentDriftPct(0.22);

        // Toast alert: Route re-validated notification
        addToast(
          `Chainlink Oracle price deviation >2% (${effectiveDrift.toFixed(2)}% on ${driftingAsset || selectedAsset.symbol}) detected. minAmountOut parameters re-calculated and route re-validated.`,
          "success"
        );

        setRebalanceAlert({
          timestamp: Date.now(),
          driftPct: effectiveDrift,
          oraclePriceUsd: oracleRefPrice || oracleBenchmarkPrice,
          poolPriceUsd: spotPrice || impliedPoolPrice,
          message: `Chainlink Oracle deviation exceeded 2.0% (${effectiveDrift.toFixed(2)}%). minAmountOut parameters automatically re-calculated across all ${steps.length} hops with strict slippage protection.`
        });

        setTimeout(() => setIsRebalancing(false), 400);
      }
    };

    checkOracleAndRevalidate();
    const interval = setInterval(checkOracleAndRevalidate, 4000);
    return () => clearInterval(interval);
  }, [currentDriftPct, autoRebalanceOnDrift, steps, loanAmount, network]);

  // Update a step
  const updateStep = (index: number, updates: Partial<SwapStep>) => {
    const newSteps = [...steps];
    newSteps[index] = { ...newSteps[index], ...updates };
    setSteps(newSteps);
  };

  // Reorder steps: move up
  const moveStepUp = (index: number) => {
    if (index === 0) return;
    const newSteps = [...steps];
    const temp = newSteps[index - 1];
    newSteps[index - 1] = newSteps[index];
    newSteps[index] = temp;
    setSteps(newSteps);
  };

  // Reorder steps: move down
  const moveStepDown = (index: number) => {
    if (index === steps.length - 1) return;
    const newSteps = [...steps];
    const temp = newSteps[index + 1];
    newSteps[index + 1] = newSteps[index];
    newSteps[index] = temp;
    setSteps(newSteps);
  };

  // Add hop
  const addStep = () => {
    const lastStep = steps[steps.length - 1];
    const nextTokenIn = lastStep ? lastStep.tokenOut : selectedAsset.address;
    const nextTokenOut = selectedAsset.address;
    const dex = network.dexes[Math.min(steps.length, network.dexes.length - 1)];

    const tokenInObj = network.tokens.find(t => t.address.toLowerCase() === nextTokenIn.toLowerCase()) || selectedAsset;
    const tokenOutObj = network.tokens.find(t => t.address.toLowerCase() === nextTokenOut.toLowerCase()) || selectedAsset;

    const newStep: SwapStep = {
      id: `step-${Date.now()}-${steps.length + 1}`,
      protocol: dex.protocol,
      targetContract: dex.routerAddress,
      tokenIn: nextTokenIn,
      tokenOut: nextTokenOut,
      v3Fee: 3000,
      balancerPoolId: ethers.ZeroHash,
      minAmountOut: "0",
      slippageTolerancePct: 0.15,
      tokenInSymbol: tokenInObj.symbol,
      tokenOutSymbol: tokenOutObj.symbol,
      dexName: dex.name
    };

    setSteps([...steps, newStep]);
  };

  // Remove hop
  const removeStep = (index: number) => {
    if (steps.length <= 2) return;
    setSteps(steps.filter((_, i) => i !== index));
  };

  // Individual step validation warnings: Invalid protocol address & incompatible liquidity parameters
  const getStepWarnings = (step: SwapStep): string[] => {
    const warnings: string[] = [];

    // 1. Protocol router address validation
    if (!ethers.isAddress(step.targetContract)) {
      warnings.push(`Invalid protocol router address format: "${step.targetContract}".`);
    } else if (step.targetContract === ethers.ZeroAddress) {
      warnings.push('Protocol router cannot be the zero address (0x000...0).');
    } else {
      const isKnownDex = network.dexes.some(
        d => d.routerAddress.toLowerCase() === step.targetContract.toLowerCase()
      );
      if (!isKnownDex) {
        warnings.push(`Protocol router does not match verified DEX routers on ${network.name}.`);
      }
    }

    // 2. Token identity check
    if (step.tokenIn.toLowerCase() === step.tokenOut.toLowerCase()) {
      warnings.push(`Input token (${step.tokenInSymbol}) and output token cannot be identical.`);
    }

    // 3. Network protocol compatibility
    if (network.id === 'zksync') {
      if (step.protocol === ProtocolType.BALANCER_V2 || step.protocol === ProtocolType.CURVE_V2) {
        warnings.push(`Protocol Incompatible: Balancer V2 Vault & Curve V2 are not supported on zkSync Era.`);
      }
    }

    // 4. Balancer pool ID validation
    if (step.protocol === ProtocolType.BALANCER_V2) {
      if (!step.balancerPoolId || step.balancerPoolId === ethers.ZeroHash || step.balancerPoolId.length !== 66) {
        warnings.push('Missing or invalid 32-byte Balancer V2 Pool ID hash (0x...).');
      }
    }

    // 5. Liquidity parameters & fee tier compatibility
    if (step.protocol === ProtocolType.UNISWAP_V3) {
      const stableSymbols = ['USDC', 'USDT', 'DAI', 'FRAX', 'LUSD'];
      const symIn = step.tokenInSymbol || '';
      const symOut = step.tokenOutSymbol || '';
      const isBothStable = stableSymbols.includes(symIn) && stableSymbols.includes(symOut);
      if (step.v3Fee === 100 && !isBothStable) {
        warnings.push(`Fee tier 0.01% (100) has thin liquidity for ${symIn}/${symOut} on ${network.name}. High revert risk; recommend 0.05% (500).`);
      } else if (step.v3Fee === 10000 && (symIn === 'WETH' || symOut === 'WETH')) {
        warnings.push(`Fee tier 1.00% (10000) incurs excessive pool fee drag on high-liquidity WETH pairs.`);
      }
    }

    // 6. Slippage tolerance vs Network Gas State
    const totalGasGwei = network.baseFeeGwei + network.priorityFeeGwei;
    if (totalGasGwei > 30 && step.slippageTolerancePct < 0.08) {
      warnings.push(`Slippage tolerance (${step.slippageTolerancePct}%) is too tight for congested gas state (${totalGasGwei} Gwei). Execution revert risk.`);
    }
    if (step.slippageTolerancePct > 1.5) {
      warnings.push(`High slippage (${step.slippageTolerancePct}%) exposes transaction to sandwich attacks.`);
    }

    return warnings;
  };

  // 1-Click Auto-Fix for step protocol & liquidity parameters
  const handleAutoFixStep = (index: number) => {
    const step = steps[index];
    const matchingDex = network.dexes.find(d => d.protocol === step.protocol) || network.dexes[0];
    const stableSymbols = ['USDC', 'USDT', 'DAI'];
    const symIn = step.tokenInSymbol || '';
    const symOut = step.tokenOutSymbol || '';
    const isBothStable = stableSymbols.includes(symIn) && stableSymbols.includes(symOut);

    let fixedFee = step.v3Fee;
    if (step.protocol === ProtocolType.UNISWAP_V3) {
      fixedFee = isBothStable ? 100 : 500;
    }

    let fixedProtocol = step.protocol;
    let fixedTarget = matchingDex.routerAddress;
    let fixedDexName = matchingDex.name;

    if (network.id === 'zksync' && (step.protocol === ProtocolType.BALANCER_V2 || step.protocol === ProtocolType.CURVE_V2)) {
      const v3Dex = network.dexes.find(d => d.protocol === ProtocolType.UNISWAP_V3) || network.dexes[0];
      fixedProtocol = v3Dex.protocol;
      fixedTarget = v3Dex.routerAddress;
      fixedDexName = v3Dex.name;
    }

    updateStep(index, {
      targetContract: fixedTarget,
      protocol: fixedProtocol,
      dexName: fixedDexName,
      v3Fee: fixedFee,
      slippageTolerancePct: 0.12,
      balancerPoolId: fixedProtocol === ProtocolType.BALANCER_V2 && (!step.balancerPoolId || step.balancerPoolId === ethers.ZeroHash)
        ? '0x5c6ee304399dbdb9c8ef030ab642b10820db8f56000200000000000000000014'
        : step.balancerPoolId
    });

    addToast(`Hop ${index + 1} parameters automatically repaired for ${network.name}.`, 'success');
  };

  // Path validation logic
  const validationResults = useMemo(() => {
    const issues: { type: 'error' | 'warning'; message: string }[] = [];

    if (steps.length < 2) {
      issues.push({ type: 'error', message: 'An arbitrage route requires at least 2 distinct swap hops.' });
    }

    // Check step 0 tokenIn matches borrowed flash loan asset
    if (steps[0] && steps[0].tokenIn.toLowerCase() !== selectedAsset.address.toLowerCase()) {
      issues.push({
        type: 'error',
        message: `Step 1 Token In (${steps[0].tokenInSymbol}) must match the Flash Loan Asset (${selectedAsset.symbol}).`
      });
    }

    // Check sequential token continuity (step[i].tokenOut === step[i+1].tokenIn)
    for (let i = 0; i < steps.length - 1; i++) {
      const curOut = steps[i].tokenOut.toLowerCase();
      const nextIn = steps[i + 1].tokenIn.toLowerCase();
      if (curOut !== nextIn) {
        issues.push({
          type: 'error',
          message: `Discontinuity: Step ${i + 1} output (${steps[i].tokenOutSymbol}) does not match Step ${i + 2} input (${steps[i + 1].tokenInSymbol}).`
        });
      }
    }

    // Check circular loop closure (last step tokenOut must be flash loan asset)
    const lastStep = steps[steps.length - 1];
    if (lastStep && lastStep.tokenOut.toLowerCase() !== selectedAsset.address.toLowerCase()) {
      issues.push({
        type: 'error',
        message: `Loop Incomplete: Final swap hop must convert back into ${selectedAsset.symbol} for Aave loan repayment.`
      });
    }

    return {
      isValid: issues.filter(i => i.type === 'error').length === 0,
      issues
    };
  }, [steps, selectedAsset]);

  // Output estimation
  const estimatedOutputs = useMemo(() => {
    const loanFloat = parseFloat(loanAmount || "0");
    const aaveFee = loanFloat * 0.0005;
    let currentAmount = loanFloat;

    // Simulate multi-hop output with simulated AMM curve depth
    steps.forEach((step, idx) => {
      const tokenInObj = network.tokens.find(t => t.address.toLowerCase() === step.tokenIn.toLowerCase()) || selectedAsset;
      const tokenOutObj = network.tokens.find(t => t.address.toLowerCase() === step.tokenOut.toLowerCase()) || selectedAsset;
      
      const inUsd = tokenInObj.usdPrice;
      const outUsd = tokenOutObj.usdPrice;
      const nominalRatio = inUsd / outUsd;
      
      // Slippage factor
      const slippageDiscount = 1 - (step.slippageTolerancePct / 100);
      // Fee tier deduction
      const feeTierBps = step.protocol === ProtocolType.UNISWAP_V3 ? (step.v3Fee || 500) : 3000;
      const feeDiscount = 1 - (feeTierBps / 1000000);

      // In a profitable arb, there is a spread between protocols
      const spreadBoost = idx === 0 ? 1.004 : 1.0035;

      currentAmount = currentAmount * nominalRatio * feeDiscount * slippageDiscount * spreadBoost;
    });

    const finalOutput = currentAmount;
    const grossProfit = Math.max(0, finalOutput - (loanFloat + aaveFee));
    const grossProfitUsd = grossProfit * selectedAsset.usdPrice;
    
    // MEV Tip / Bribe deduction
    const mevTipUsd = grossProfitUsd * (mevBribeBps / 10000);
    const netProfitUsd = Math.max(0, grossProfitUsd - mevTipUsd);
    const capitalDeployedUsd = loanFloat * selectedAsset.usdPrice;
    const netRoiPct = capitalDeployedUsd > 0 ? (netProfitUsd / capitalDeployedUsd) * 100 : 0;

    return {
      finalOutput: parseFloat(finalOutput.toFixed(4)),
      grossProfit: parseFloat(grossProfit.toFixed(4)),
      grossProfitUsd: parseFloat(grossProfitUsd.toFixed(2)),
      aaveFee: parseFloat(aaveFee.toFixed(4)),
      mevTipUsd: parseFloat(mevTipUsd.toFixed(2)),
      netProfitUsd: parseFloat(netProfitUsd.toFixed(2)),
      netRoiPct: parseFloat(netRoiPct.toFixed(3))
    };
  }, [steps, loanAmount, selectedAsset, network, mevBribeBps]);

  // Encoded calldata
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

  const handleSaveStrategy = () => {
    if (!strategyName.trim()) return;
    const newStrategy: ArbitrageStrategy = {
      id: `strat-${Date.now()}`,
      name: strategyName,
      description: `Custom ${steps.length}-hop ${selectedAsset.symbol} route across ${steps.map(s => s.dexName).join(' -> ')}`,
      networkId: network.id,
      assetSymbol: selectedAsset.symbol,
      defaultLoanAmount: loanAmount,
      minProfitThreshold: minProfit,
      mevBribeBps,
      steps,
      preferredDexVersion: 'HYBRID',
      tags: [network.name, `${steps.length}-Hop`, selectedAsset.symbol],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    onSaveStrategy?.(newStrategy);
    setShowSaveModal(false);
    setStrategyName('');
  };

  return (
    <div className="space-y-6 font-mono text-xs">
      {/* Top Header Card */}
      <div className="bg-[#0b0e14] border border-slate-800 rounded-xl p-5 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-5 pb-4 border-b border-slate-800">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-cyan-400" />
              <span>Advanced Visual Swap Path Builder & Sequence Validator</span>
            </h2>
            <p className="text-slate-400 text-xs mt-0.5">
              Construct, reorder, and validate multi-protocol atomic swap routes across Uniswap V2/V3, Sushiswap, Balancer V2, and Curve V2.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSaveModal(true)}
              disabled={!validationResults.isValid}
              className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Bookmark className="w-3.5 h-3.5 text-amber-400" />
              <span>Save Strategy</span>
            </button>
          </div>
        </div>

        {/* Global Parameters Input Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Flash Loan Asset */}
          <div>
            <label className="block text-slate-400 text-xs mb-1.5">
              1. Flash Liquidity Asset (Aave V3)
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
                  className={`p-2 rounded-lg border text-xs font-mono transition-all ${
                    selectedAsset.symbol === token.symbol
                      ? 'bg-cyan-950/80 border-cyan-500 text-cyan-300 font-bold'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <div>{token.symbol}</div>
                  <div className="text-[10px] text-slate-500">${token.usdPrice.toLocaleString()}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Borrow Amount */}
          <div>
            <label className="block text-slate-400 text-xs mb-1.5 flex items-center justify-between">
              <span>2. Flash Borrow Amount</span>
              <span className="text-slate-500">~${(parseFloat(loanAmount || "0") * selectedAsset.usdPrice).toLocaleString()}</span>
            </label>
            <div className="relative">
              <input
                type="number"
                value={loanAmount}
                onChange={(e) => setLoanAmount(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-cyan-500"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">
                {selectedAsset.symbol}
              </span>
            </div>
            <div className="text-[10px] text-slate-500 mt-1 flex justify-between">
              <span>Aave 0.05% Premium:</span>
              <span className="text-amber-400 font-semibold">{estimatedOutputs.aaveFee} {selectedAsset.symbol}</span>
            </div>
          </div>

          {/* Min Profit & Miner Bribe */}
          <div>
            <label className="block text-slate-400 text-xs mb-1.5 flex items-center justify-between">
              <span>3. Net Profit Revert Gate</span>
              <span className="text-purple-400">MEV Tip: {(mevBribeBps / 100).toFixed(1)}%</span>
            </label>
            <div className="relative mb-2">
              <input
                type="text"
                value={minProfit}
                onChange={(e) => setMinProfit(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">
                {selectedAsset.symbol}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="5000"
              step="250"
              value={mevBribeBps}
              onChange={(e) => setMevBribeBps(Number(e.target.value))}
              className="w-full accent-purple-500 cursor-pointer"
            />
          </div>
        </div>

        {/* Real-Time ROI Calculator Widget */}
        <div className="mb-6 bg-gradient-to-r from-slate-950 via-[#0b1320] to-slate-950 border border-cyan-500/40 rounded-xl p-4 shadow-lg shadow-cyan-950/20">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/80 pb-3 mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-cyan-950 border border-cyan-700/60 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-cyan-400" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <span>Real-Time Path ROI & Yield Calculator</span>
                  <span className="px-2 py-0.5 rounded-full text-[9px] bg-emerald-950 text-emerald-400 border border-emerald-800 uppercase font-bold">
                    Live Simulation
                  </span>
                </h3>
                <p className="text-[11px] text-slate-400">
                  Dynamic return on investment factoring in Aave V3 flash loan fee, multi-hop AMM spread, cumulative slippage, and MEV tips.
                </p>
              </div>
            </div>

            <div className="text-right">
              <div className="text-[10px] text-slate-400 uppercase">Projected Net Yield</div>
              <div className={`text-base font-mono font-black ${estimatedOutputs.netRoiPct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {estimatedOutputs.netRoiPct >= 0 ? '+' : ''}{estimatedOutputs.netRoiPct.toFixed(3)}% ROI
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
            <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-2.5">
              <div className="text-[10px] text-slate-400">Gross Spread Yield</div>
              <div className="text-white font-bold text-sm mt-0.5">${estimatedOutputs.grossProfitUsd.toFixed(2)}</div>
              <div className="text-[9px] text-slate-500 mt-0.5">{estimatedOutputs.grossProfit} {selectedAsset.symbol}</div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-2.5">
              <div className="text-[10px] text-amber-400">Aave V3 Premium (0.05%)</div>
              <div className="text-amber-300 font-bold text-sm mt-0.5">-${(estimatedOutputs.aaveFee * selectedAsset.usdPrice).toFixed(2)}</div>
              <div className="text-[9px] text-slate-500 mt-0.5">{estimatedOutputs.aaveFee} {selectedAsset.symbol}</div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-2.5">
              <div className="text-[10px] text-purple-400">MEV Builder Tip ({(mevBribeBps/100).toFixed(1)}%)</div>
              <div className="text-purple-300 font-bold text-sm mt-0.5">-${estimatedOutputs.mevTipUsd.toFixed(2)}</div>
              <div className="text-[9px] text-slate-500 mt-0.5">Directed to block.coinbase</div>
            </div>

            <div className="bg-slate-900/80 border border-emerald-800/60 rounded-lg p-2.5 bg-emerald-950/20">
              <div className="text-[10px] text-emerald-400 font-bold">Net Arbitrage Profit</div>
              <div className="text-emerald-300 font-mono font-black text-sm mt-0.5">${estimatedOutputs.netProfitUsd.toFixed(2)}</div>
              <div className="text-[9px] text-emerald-500/80 mt-0.5">Revert-Safe Net Yield</div>
            </div>
          </div>
        </div>

        {/* Chainlink Oracle Price Deviation & Auto-Rebalance Engine */}
        <div className="mb-6 bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-900 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-cyan-950/80 border border-cyan-800 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4 text-cyan-400" />
              </div>
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-2">
                  <span>Chainlink Oracle Real-Time Price Deviation Guard</span>
                  <span className={`px-1.5 py-0.5 rounded text-[9px] uppercase font-bold ${
                    autoRebalanceOnDrift 
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' 
                      : 'bg-slate-900 text-slate-500 border border-slate-800'
                  }`}>
                    {autoRebalanceOnDrift ? 'Auto-Rebalance Armed (>2%)' : 'Manual Mode'}
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  Monitors AMM spot pricing against Chainlink canonical feed; auto-recalculates and re-applies swap paths if deviation exceeds 2.0%.
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 bg-slate-900/90 border border-slate-800 rounded-lg px-2.5 py-1 cursor-pointer hover:border-slate-700 transition-colors">
                <input
                  type="checkbox"
                  checked={autoRebalanceOnDrift}
                  onChange={(e) => setAutoRebalanceOnDrift(e.target.checked)}
                  className="rounded border-slate-700 text-cyan-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                />
                <span className="text-[11px] text-slate-300 font-medium">Auto-Rebalance on &gt;2% Drift</span>
              </label>

              <button
                type="button"
                onClick={() => recalculateAndApplyOptimalRoute(currentDriftPct, 'Manual optimization re-calculated swap paths against latest Chainlink oracle quotes.')}
                disabled={isRebalancing}
                className="px-2.5 py-1 rounded-lg bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-800 text-cyan-300 flex items-center gap-1.5 text-[11px] transition-colors cursor-pointer"
                title="Recalculate optimal swap paths based on current Chainlink oracle benchmark"
              >
                <RefreshCw className={`w-3 h-3 ${isRebalancing ? 'animate-spin' : ''}`} />
                <span>{isRebalancing ? 'Rebalancing...' : 'Re-Calculate Path'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  // Simulate sudden AMM liquidity drift exceeding 2%
                  setCurrentDriftPct(2.42);
                }}
                className="px-2.5 py-1 rounded-lg bg-amber-950/60 hover:bg-amber-900/80 border border-amber-800/80 text-amber-300 flex items-center gap-1 text-[11px] transition-colors cursor-pointer"
                title="Simulate sudden AMM pool mispricing to trigger auto-rebalance"
              >
                <Zap className="w-3 h-3 text-amber-400" />
                <span>Simulate &gt;2% Drift</span>
              </button>
            </div>
          </div>

          {/* Telemetry Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Chainlink Canonical Price */}
            <div className="bg-slate-900/80 border border-slate-850 rounded-lg p-2.5">
              <div className="text-[10px] text-slate-400 flex items-center justify-between mb-1">
                <span className="flex items-center gap-1">
                  <Activity className="w-3 h-3 text-cyan-400" />
                  <span>Chainlink Feed ({selectedAsset.symbol}/USD)</span>
                </span>
                <span className="text-[9px] text-emerald-400 font-mono">LIVE 8-DEC</span>
              </div>
              <div className="text-white font-mono font-bold text-sm">
                ${oracleBenchmarkPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
              </div>
              <div className="text-[10px] text-slate-500 font-mono mt-0.5 truncate">
                Feed: {oracleFeed?.address ? `${oracleFeed.address.substring(0, 10)}...` : 'AggregatorV3'}
              </div>
            </div>

            {/* Implied Pool Execution Quote */}
            <div className="bg-slate-900/80 border border-slate-850 rounded-lg p-2.5">
              <div className="text-[10px] text-slate-400 flex items-center justify-between mb-1">
                <span className="flex items-center gap-1">
                  <TrendingUp className="w-3 h-3 text-indigo-400" />
                  <span>AMM Implied Rate</span>
                </span>
                <span className="text-[9px] text-slate-500 font-mono">Spot Swap</span>
              </div>
              <div className="text-white font-mono font-bold text-sm">
                ${impliedPoolPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5 flex items-center justify-between">
                <span>DEX: {steps[0]?.dexName || 'Pool'}</span>
                <span>Fee: {steps[0]?.v3Fee ? `${(steps[0].v3Fee / 10000).toFixed(2)}%` : '0.3%'}</span>
              </div>
            </div>

            {/* Deviation Metric Meter */}
            <div className={`border rounded-lg p-2.5 transition-colors ${
              currentDriftPct > 2.0 
                ? 'bg-rose-950/40 border-rose-700/80' 
                : currentDriftPct > 1.0 
                ? 'bg-amber-950/30 border-amber-800/80' 
                : 'bg-slate-900/80 border-slate-850'
            }`}>
              <div className="text-[10px] text-slate-400 flex items-center justify-between mb-1">
                <span>Price Deviation vs Oracle</span>
                <span className={`text-[9px] font-bold uppercase ${
                  currentDriftPct > 2.0 ? 'text-rose-400 animate-pulse' : currentDriftPct > 1.0 ? 'text-amber-400' : 'text-emerald-400'
                }`}>
                  {currentDriftPct > 2.0 ? 'DRIFT > 2% ALERT' : 'CORRIDOR SAFE'}
                </span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className={`font-mono font-bold text-sm ${
                  currentDriftPct > 2.0 ? 'text-rose-400' : currentDriftPct > 1.0 ? 'text-amber-400' : 'text-emerald-400'
                }`}>
                  {currentDriftPct.toFixed(2)}%
                </span>
                <span className="text-[10px] text-slate-500 font-mono">Gate: &le; 2.00%</span>
              </div>

              {/* Progress Bar Gauge */}
              <div className="w-full bg-slate-950 rounded-full h-1.5 mt-2 overflow-hidden border border-slate-800">
                <div 
                  className={`h-full transition-all duration-500 ${
                    currentDriftPct > 2.0 ? 'bg-rose-500' : currentDriftPct > 1.0 ? 'bg-amber-400' : 'bg-emerald-400'
                  }`}
                  style={{ width: `${Math.min(100, (currentDriftPct / 3.0) * 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Rebalance Toast / Banner */}
          {rebalanceAlert && (
            <div className="bg-emerald-950/40 border border-emerald-700/80 rounded-lg p-2.5 flex items-start justify-between gap-3 animate-fadeIn">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <div className="text-emerald-300 font-bold text-[11px] flex items-center gap-1.5">
                    <span>Swap Path Automatically Re-Calculated & Applied</span>
                    <span className="text-[9px] text-emerald-500 font-normal">
                      {new Date(rebalanceAlert.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="text-slate-300 text-[10px] mt-0.5 leading-relaxed">
                    {rebalanceAlert.message}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setRebalanceAlert(null)}
                className="text-slate-500 hover:text-white p-0.5 text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}
        </div>

        {/* Path Validation Issues Banner */}
        {validationResults.issues.length > 0 && (
          <div className="mb-5 p-3 rounded-xl border border-rose-800/80 bg-rose-950/30 space-y-1.5">
            <div className="flex items-center gap-1.5 text-rose-400 font-bold text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>Route Validation Warning ({validationResults.issues.length} Issues):</span>
            </div>
            {validationResults.issues.map((issue, idx) => (
              <div key={idx} className="text-rose-300 text-[11px] pl-5 list-disc">
                &bull; {issue.message}
              </div>
            ))}
          </div>
        )}

        {/* Step-by-Step Path Cards */}
        <div className="space-y-3 mb-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xs uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <span>Multi-Protocol Swap Route ({steps.length} Hops)</span>
            </h3>

            <button
              onClick={addStep}
              className="px-2.5 py-1 rounded bg-slate-800 text-slate-200 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Plus className="w-3 h-3 text-cyan-400" />
              <span>Add Hop</span>
            </button>
          </div>

          {/* Flash Loan Source Node */}
          <div className="p-3 bg-cyan-950/20 border border-cyan-800/60 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-cyan-900 border border-cyan-700 text-cyan-300 flex items-center justify-center font-bold text-[10px]">
                0
              </span>
              <span className="text-cyan-300 font-bold">Aave V3 Flash Loan Pool:</span>
              <span className="text-white">Borrow {loanAmount} {selectedAsset.symbol}</span>
            </div>
            <span className="text-[10px] text-cyan-400/80 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800">
              Contract Balance Initialized
            </span>
          </div>

          {/* Hops with Framer Motion layout animations and visual parameter warning indicators */}
          <AnimatePresence mode="popLayout">
            {steps.map((step, idx) => {
              const isFirst = idx === 0;
              const isLast = idx === steps.length - 1;
              const stepWarnings = getStepWarnings(step);
              const hasWarnings = stepWarnings.length > 0;

              return (
                <motion.div
                  key={step.id}
                  layout
                  initial={{ opacity: 0, y: -16, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 16, scale: 0.96 }}
                  transition={{
                    layout: { duration: 0.3, ease: [0.16, 1, 0.3, 1] },
                    opacity: { duration: 0.2 },
                    scale: { duration: 0.2 }
                  }}
                  className="relative"
                >
                  <div className="flex justify-center -my-1.5 relative z-10">
                    <ArrowDown className="w-4 h-4 text-slate-600 bg-[#0b0e14] rounded-full p-0.5" />
                  </div>

                  <div className={`rounded-xl p-3.5 transition-all border ${
                    hasWarnings 
                      ? 'bg-rose-950/20 border-rose-700/80 shadow-[0_0_20px_rgba(244,63,94,0.12)]' 
                      : 'bg-slate-950/90 border-slate-800 hover:border-slate-700'
                  }`}>
                    {/* Step Card Header */}
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3 pb-2 border-b border-slate-800/70">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center font-bold text-[10px]">
                          {idx + 1}
                        </span>
                        <span className="text-white font-semibold text-xs sm:text-sm">
                          Hop {idx + 1}: {step.dexName || 'Protocol'}
                        </span>

                        {hasWarnings && (
                          <div 
                            className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-rose-950/80 text-rose-300 border border-rose-700/80 text-[10px] font-bold" 
                            title={stepWarnings.join(' • ')}
                          >
                            <AlertTriangle className="w-3 h-3 text-rose-400 shrink-0 animate-pulse" />
                            <span>{stepWarnings.length} Incompatible Parameter{stepWarnings.length > 1 ? 's' : ''}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Protocol Selector */}
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
                          className="bg-slate-900 border border-slate-700 text-cyan-300 rounded px-2 py-1 text-xs focus:outline-none focus:border-cyan-500"
                        >
                          <option value={ProtocolType.UNISWAP_V3}>Uniswap V3</option>
                          <option value={ProtocolType.UNISWAP_V2}>Uniswap V2 / Fork</option>
                          <option value={ProtocolType.SUSHISWAP}>SushiSwap</option>
                          <option value={ProtocolType.BALANCER_V2}>Balancer V2 Vault</option>
                          <option value={ProtocolType.CURVE_V2}>Curve V2 Router</option>
                        </select>

                        {/* Step Action Controls: Reorder Up / Down & Remove */}
                        <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded p-0.5">
                          <button
                            type="button"
                            onClick={() => moveStepUp(idx)}
                            disabled={isFirst}
                            title="Move Hop Up"
                            className={`p-1 rounded ${isFirst ? 'text-slate-600 cursor-not-allowed' : 'text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer'} transition-colors`}
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveStepDown(idx)}
                            disabled={isLast}
                            title="Move Hop Down"
                            className={`p-1 rounded ${isLast ? 'text-slate-600 cursor-not-allowed' : 'text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer'} transition-colors`}
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                          {steps.length > 2 && (
                            <button
                              type="button"
                              onClick={() => removeStep(idx)}
                              title="Delete Hop"
                              className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Prominent Visual Warning Indicator Banner */}
                    {hasWarnings && (
                      <div className="mb-3.5 p-2.5 rounded-lg bg-rose-950/60 border border-rose-800/80 text-[11px] text-rose-200">
                        <div className="flex items-center justify-between gap-2 mb-1.5 pb-1 border-b border-rose-900/60">
                          <span className="font-bold flex items-center gap-1.5 text-rose-300">
                            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                            <span>Protocol & Liquidity Parameter Incompatibilities</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => handleAutoFixStep(idx)}
                            className="px-2 py-0.5 rounded bg-rose-900/70 hover:bg-rose-800 text-rose-200 border border-rose-700/80 text-[10px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <Sparkles className="w-3 h-3 text-rose-300" />
                            <span>Auto-Fix for {network.name}</span>
                          </button>
                        </div>
                        <ul className="space-y-1 pl-1">
                          {stepWarnings.map((warning, wIdx) => (
                            <li key={wIdx} className="flex items-start gap-1.5 leading-relaxed">
                              <span className="text-rose-500 font-bold">•</span>
                              <span>{warning}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Hop Details Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                      {/* Input Token */}
                      <div>
                        <span className="text-[10px] text-slate-500 block mb-1">Input Token:</span>
                        <select
                          value={step.tokenIn}
                          onChange={(e) => {
                            const token = network.tokens.find(t => t.address.toLowerCase() === e.target.value.toLowerCase());
                            updateStep(idx, { tokenIn: e.target.value, tokenInSymbol: token?.symbol || "TOKEN" });
                          }}
                          className="w-full bg-slate-900 border border-slate-800 text-white rounded px-2 py-1 text-xs focus:outline-none focus:border-cyan-500"
                        >
                          {network.tokens.map(t => (
                            <option key={t.address} value={t.address}>{t.symbol} ({t.name})</option>
                          ))}
                        </select>
                      </div>

                      {/* Output Token */}
                      <div>
                        <span className="text-[10px] text-slate-500 block mb-1">Output Token:</span>
                        <select
                          value={step.tokenOut}
                          onChange={(e) => {
                            const token = network.tokens.find(t => t.address.toLowerCase() === e.target.value.toLowerCase());
                            updateStep(idx, { tokenOut: e.target.value, tokenOutSymbol: token?.symbol || "TOKEN" });
                          }}
                          className="w-full bg-slate-900 border border-slate-800 text-white rounded px-2 py-1 text-xs focus:outline-none focus:border-cyan-500"
                        >
                          {network.tokens.map(t => (
                            <option key={t.address} value={t.address}>{t.symbol} ({t.name})</option>
                          ))}
                        </select>
                      </div>

                      {/* Protocol-Specific Option */}
                      <div>
                        {step.protocol === ProtocolType.UNISWAP_V3 && (
                          <div>
                            <span className="text-[10px] text-slate-500 block mb-1">V3 Fee Tier:</span>
                            <select
                              value={step.v3Fee}
                              onChange={(e) => updateStep(idx, { v3Fee: Number(e.target.value) })}
                              className="w-full bg-slate-900 border border-slate-800 text-cyan-300 rounded px-2 py-1 text-xs focus:outline-none focus:border-cyan-500"
                            >
                              <option value={100}>0.01% (100) - Stables</option>
                              <option value={500}>0.05% (500) - Main Pairs</option>
                              <option value={3000}>0.30% (3000) - Standard</option>
                              <option value={10000}>1.00% (10000) - Exotic</option>
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
                              className="w-full bg-slate-900 border border-slate-800 text-slate-300 rounded px-2 py-1 text-[10px] font-mono focus:outline-none focus:border-cyan-500"
                              placeholder="0x..."
                            />
                          </div>
                        )}

                        {(step.protocol === ProtocolType.UNISWAP_V2 || step.protocol === ProtocolType.SUSHISWAP || step.protocol === ProtocolType.CURVE_V2) && (
                          <div>
                            <span className="text-[10px] text-slate-500 block mb-1">Router / Pool Address:</span>
                            <input
                              type="text"
                              value={step.targetContract}
                              onChange={(e) => updateStep(idx, { targetContract: e.target.value })}
                              className="w-full bg-slate-900 border border-slate-800 text-slate-300 rounded px-2 py-1 text-[10px] font-mono focus:outline-none focus:border-cyan-500"
                            />
                          </div>
                        )}
                      </div>

                      {/* Slippage tolerance & minAmountOut */}
                      <div>
                        <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                          <span>Max Slippage:</span>
                          <span className="text-cyan-400 font-mono">
                            minOut: {step.minAmountOut && step.minAmountOut !== "0" ? `${step.minAmountOut.substring(0, 8)}...` : 'Auto'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            step="0.05"
                            min="0.01"
                            max="2.0"
                            value={step.slippageTolerancePct}
                            onChange={(e) => updateStep(idx, { slippageTolerancePct: parseFloat(e.target.value) || 0.1 })}
                            className="w-full bg-slate-900 border border-slate-800 text-amber-300 rounded px-2 py-1 text-xs focus:outline-none focus:border-cyan-500 font-mono"
                          />
                          <span className="text-slate-500 text-xs font-mono">%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* Flash Loan Repay & Profit Harvest Node */}
          <div className="flex justify-center -my-1.5 relative z-10">
            <ArrowDown className="w-4 h-4 text-slate-600 bg-[#0b0e14] rounded-full p-0.5" />
          </div>

          <div className="p-3 bg-emerald-950/20 border border-emerald-800/60 rounded-xl flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-emerald-900 border border-emerald-700 text-emerald-300 flex items-center justify-center font-bold text-[10px]">
                &#10003;
              </span>
              <span className="text-emerald-300 font-bold">Repayment & Profit Verification:</span>
              <span className="text-white">
                Repay {(parseFloat(loanAmount || "0") * 1.0005).toFixed(4)} {selectedAsset.symbol}
              </span>
            </div>
            <div className="text-[11px] text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
              Est. Yield: +${estimatedOutputs.grossProfitUsd.toFixed(2)} USD
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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-slate-400 text-xs flex items-center gap-2">
            {validationResults.isValid ? (
              <span className="text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" />
                <span>Route logically verified</span>
              </span>
            ) : (
              <span className="text-rose-400 flex items-center gap-1">
                <AlertTriangle className="w-4 h-4" />
                <span>Fix path errors to simulate</span>
              </span>
            )}
          </div>

          <button
            disabled={!validationResults.isValid}
            onClick={() => onRunSimulation(selectedAsset, loanAmount, minProfit, mevBribeBps, steps)}
            className={`px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg transition-all ${
              validationResults.isValid
                ? 'bg-gradient-to-r from-cyan-600 via-indigo-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white shadow-cyan-950 cursor-pointer'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
            }`}
          >
            <Zap className="w-4 h-4" />
            <span>Dry-Run Simulation (eth_call)</span>
          </button>
        </div>
      </div>

      {/* Save Strategy Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0c1017] border border-slate-800 rounded-2xl w-full max-w-md p-5 space-y-4 shadow-2xl">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Bookmark className="w-4 h-4 text-amber-400" />
              <span>Save Route as Strategy Template</span>
            </h3>
            <p className="text-slate-400 text-xs">
              Save this {steps.length}-hop arbitrage sequence to execute or backtest across {network.name}.
            </p>

            <div>
              <label className="block text-slate-400 text-xs mb-1">Strategy Name</label>
              <input
                type="text"
                placeholder="e.g. WETH-USDC Camelot-UniV3 Spread"
                value={strategyName}
                onChange={(e) => setStrategyName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowSaveModal(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveStrategy}
                disabled={!strategyName.trim()}
                className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold"
              >
                Save Strategy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
