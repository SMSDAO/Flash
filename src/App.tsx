/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { NETWORKS } from './config/networks';
import { 
  NetworkConfig, 
  NetworkId, 
  MempoolOpportunity, 
  SimulationResult, 
  ExecutionReceipt, 
  SwapStep, 
  Token,
  ArbitrageStrategy,
  OperationalGasWallet
} from './types/arbitrage';
import { mempoolStream } from './services/mempoolStreamService';
import { simulateArbitrageDryRun } from './services/mevExecutionService';
import { playOpportunityChime } from './utils/audioAlert';
import { Header, ActiveTabType, UiModeType } from './components/Header';
import { SimpleArbitrageDashboard } from './components/SimpleArbitrageDashboard';
import { AnalyticsBar } from './components/AnalyticsBar';
import { MempoolMonitor } from './components/MempoolMonitor';
import { AdvancedRouteBuilder } from './components/AdvancedRouteBuilder';
import { PerformanceDashboard } from './components/PerformanceDashboard';
import { BacktestingConsole } from './components/BacktestingConsole';
import { AccountAbstractionConsole } from './components/AccountAbstractionConsole';
import { SimulationModal } from './components/SimulationModal';
import { ContractInspector } from './components/ContractInspector';
import { ExecutionConsole } from './components/ExecutionConsole';
import { DaemonExecutionConsole } from './components/DaemonExecutionConsole';
import { NetworkManagerModal } from './components/NetworkManagerModal';
import { StrategyManagerModal } from './components/StrategyManagerModal';
import { RiskThresholdModal } from './components/RiskThresholdModal';
import { Phase1GasStrategyModal } from './components/Phase1GasStrategyModal';
import { SideDrawer } from './components/SideDrawer';
import { ToastProvider } from './components/NotificationToast';
import { MobileBottomNav } from './components/MobileBottomNav';
import { 
  RiskAlertCriteria, 
  DEFAULT_RISK_ALERT_CRITERIA, 
  evaluateOpportunityAgainstRiskCriteria, 
  playRiskAlertChime, 
  dispatchRiskNotification 
} from './utils/riskAlertService';
import { ethers } from 'ethers';

// Initial default operational gas wallets across chains (Phase 1 Strategy: >=0.05 ETH on L2, >=0.3 ETH on Mainnet)
const INITIAL_GAS_WALLETS: Record<NetworkId, OperationalGasWallet> = {
  ethereum: {
    networkId: 'ethereum',
    address: '0x71C8F7965F2e5241e72C8928B3f4d0E7d337A612',
    balance: 0.385, // > 0.3 ETH required reserve
    currency: 'ETH',
    minRequiredReserve: 0.3,
    isLowReserve: false,
    revertCapacityCount: 28,
    avgGasPerTxUsd: 42.50
  },
  arbitrum: {
    networkId: 'arbitrum',
    address: '0x71C8F7965F2e5241e72C8928B3f4d0E7d337A612',
    balance: 0.082, // > 0.05 ETH required reserve
    currency: 'ETH',
    minRequiredReserve: 0.05,
    isLowReserve: false,
    revertCapacityCount: 3120,
    avgGasPerTxUsd: 0.05
  },
  polygon: {
    networkId: 'polygon',
    address: '0x71C8F7965F2e5241e72C8928B3f4d0E7d337A612',
    balance: 145.0, // > 100 POL required reserve
    currency: 'POL',
    minRequiredReserve: 100,
    isLowReserve: false,
    revertCapacityCount: 7250,
    avgGasPerTxUsd: 0.012
  },
  optimism: {
    networkId: 'optimism',
    address: '0x71C8F7965F2e5241e72C8928B3f4d0E7d337A612',
    balance: 0.065, // > 0.05 ETH required reserve
    currency: 'ETH',
    minRequiredReserve: 0.05,
    isLowReserve: false,
    revertCapacityCount: 2600,
    avgGasPerTxUsd: 0.06
  },
  zksync: {
    networkId: 'zksync',
    address: '0x71C8F7965F2e5241e72C8928B3f4d0E7d337A612',
    balance: 0.074, // > 0.05 ETH required reserve
    currency: 'ETH',
    minRequiredReserve: 0.05,
    isLowReserve: false,
    revertCapacityCount: 1850,
    avgGasPerTxUsd: 0.08
  }
};

// Initial default strategies across chains
const DEFAULT_STRATEGIES: ArbitrageStrategy[] = [
  {
    id: 'strat-weth-usdc-tri',
    name: 'WETH-USDC Tri-Pool Sandwich',
    description: 'Rapid triangular arb borrowing WETH, routing via Uniswap V3 (5 bps) into USDC, then Balancer V2 Vault back to WETH.',
    networkId: 'ethereum',
    assetSymbol: 'WETH',
    defaultLoanAmount: '75',
    minProfitThreshold: '0.18',
    mevBribeBps: 1500,
    preferredDexVersion: 'HYBRID',
    tags: ['Ethereum', 'Triangular', 'WETH'],
    createdAt: Date.now() - 86400000,
    updatedAt: Date.now() - 86400000,
    steps: [
      {
        id: 's-1',
        protocol: 1, // Uniswap V3
        targetContract: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
        tokenIn: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
        tokenOut: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        v3Fee: 500,
        balancerPoolId: ethers.ZeroHash,
        minAmountOut: '0',
        slippageTolerancePct: 0.15,
        tokenInSymbol: 'WETH',
        tokenOutSymbol: 'USDC',
        dexName: 'Uniswap V3'
      },
      {
        id: 's-2',
        protocol: 2, // Balancer V2
        targetContract: '0xBA12222222228d8Ba5359726c66A106831701349',
        tokenIn: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        tokenOut: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
        v3Fee: 3000,
        balancerPoolId: ethers.ZeroHash,
        minAmountOut: '0',
        slippageTolerancePct: 0.20,
        tokenInSymbol: 'USDC',
        tokenOutSymbol: 'WETH',
        dexName: 'Balancer V2 Vault'
      }
    ]
  },
  {
    id: 'strat-arb-camelot-v3',
    name: 'Arbitrum Camelot -> UniV3 High-Speed Arb',
    description: 'Sub-second volatility capture on Arbitrum One between Camelot AMM and Uniswap V3 concentrated liquidity.',
    networkId: 'arbitrum',
    assetSymbol: 'WETH',
    defaultLoanAmount: '120',
    minProfitThreshold: '0.22',
    mevBribeBps: 1200,
    preferredDexVersion: 'HYBRID',
    tags: ['Arbitrum', 'Sub-second', 'L2'],
    createdAt: Date.now() - 172800000,
    updatedAt: Date.now() - 172800000,
    steps: [
      {
        id: 's-arb-1',
        protocol: 0, // Uniswap V2 / Camelot
        targetContract: '0xc873fEcbd354f5A56E00E710B90EF4201db2448d',
        tokenIn: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
        tokenOut: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
        v3Fee: 500,
        balancerPoolId: ethers.ZeroHash,
        minAmountOut: '0',
        slippageTolerancePct: 0.12,
        tokenInSymbol: 'WETH',
        tokenOutSymbol: 'USDC',
        dexName: 'Camelot V2 Router'
      },
      {
        id: 's-arb-2',
        protocol: 1, // Uniswap V3
        targetContract: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
        tokenIn: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
        tokenOut: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
        v3Fee: 500,
        balancerPoolId: ethers.ZeroHash,
        minAmountOut: '0',
        slippageTolerancePct: 0.15,
        tokenInSymbol: 'USDC',
        tokenOutSymbol: 'WETH',
        dexName: 'Uniswap V3 (Arb)'
      }
    ]
  }
];

export default function App() {
  // Load persistent network selection
  const [currentNetworkId, setCurrentNetworkId] = useState<NetworkId>(() => {
    const saved = localStorage.getItem('active_network_id');
    return (saved as NetworkId) || 'ethereum';
  });

  // Networks map with overrides
  const [networkMap, setNetworkMap] = useState<Record<string, NetworkConfig>>(() => {
    try {
      const savedOverrides = localStorage.getItem('network_overrides');
      if (savedOverrides) {
        const parsed = JSON.parse(savedOverrides);
        return { ...NETWORKS, ...parsed };
      }
    } catch {
      // Fallback
    }
    return NETWORKS;
  });

  const currentNetwork: NetworkConfig = networkMap[currentNetworkId] || NETWORKS.ethereum;

  // Mode State: Simple vs Advanced (Pro MEV)
  const [uiMode, setUiMode] = useState<UiModeType>(() => {
    try {
      const saved = localStorage.getItem('arbitrage_ui_mode');
      if (saved === 'simple' || saved === 'advanced') return saved;
    } catch {}
    return 'simple';
  });

  const handleToggleUiMode = (mode: UiModeType) => {
    setUiMode(mode);
    try {
      localStorage.setItem('arbitrage_ui_mode', mode);
    } catch {}
  };

  // Navigation tab state
  const [activeTab, setActiveTab] = useState<ActiveTabType>('mempool');
  const [contractAddress, setContractAddress] = useState<string>(currentNetwork.defaultContractAddress);
  const [connectedWallet] = useState<string>('0x71C8F7965F2e5241e72C8928B3f4d0E7d337A612');

  // Modals state
  const [isNetworkModalOpen, setIsNetworkModalOpen] = useState(false);
  const [isStrategyModalOpen, setIsStrategyModalOpen] = useState(false);
  const [isRiskModalOpen, setIsRiskModalOpen] = useState(false);
  const [isGasStrategyModalOpen, setIsGasStrategyModalOpen] = useState(false);

  // Phase 1: Operational Gas Wallets state
  const [operationalGasWallets, setOperationalGasWallets] = useState<Record<NetworkId, OperationalGasWallet>>(() => {
    try {
      const saved = localStorage.getItem('mev_gas_wallets');
      if (saved) return JSON.parse(saved);
    } catch {}
    return INITIAL_GAS_WALLETS;
  });

  const handleTopUpGasWallet = (networkId: NetworkId, amount: number) => {
    setOperationalGasWallets(prev => {
      const current = prev[networkId];
      if (!current) return prev;
      const newBal = current.balance + amount;
      const netConfig = NETWORKS[networkId];
      const isLow = newBal < netConfig.minOperationalGasReserve;
      const price = networkId === 'polygon' ? 0.48 : 3120;
      const revertCostUsd = netConfig.isL2 ? (networkId === 'polygon' ? 0.012 : 0.05) : 42.50;
      const totalUsd = newBal * price;
      const capacity = Math.max(1, Math.floor(totalUsd / revertCostUsd));

      const updated = {
        ...prev,
        [networkId]: {
          ...current,
          balance: parseFloat(newBal.toFixed(3)),
          isLowReserve: isLow,
          revertCapacityCount: capacity,
          lastTopUpTimestamp: Date.now()
        }
      };
      try {
        localStorage.setItem('mev_gas_wallets', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  // Risk Thresholds & Alerts state
  const [riskCriteria, setRiskCriteria] = useState<RiskAlertCriteria>(() => {
    try {
      const saved = localStorage.getItem('mev_risk_alert_criteria');
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return DEFAULT_RISK_ALERT_CRITERIA;
  });
  const [recentRiskAlert, setRecentRiskAlert] = useState<{
    opportunity: MempoolOpportunity;
    timestamp: number;
  } | null>(null);

  // Streaming & sounds
  const [isStreaming, setIsStreaming] = useState<boolean>(true);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [currentBlock, setCurrentBlock] = useState<number>(mempoolStream.getCurrentBlock('ethereum'));

  // Data streams
  const [opportunities, setOpportunities] = useState<MempoolOpportunity[]>(() => mempoolStream.getInitialBatch(12));
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
  const [isSimulationModalOpen, setIsSimulationModalOpen] = useState<boolean>(false);

  // Saved Strategies
  const [strategies, setStrategies] = useState<ArbitrageStrategy[]>(() => {
    try {
      const saved = localStorage.getItem('arbitrage_strategies');
      if (saved) return JSON.parse(saved);
    } catch {
      // Ignore
    }
    return DEFAULT_STRATEGIES;
  });

  // Advanced Route Builder State
  const [builderAsset, setBuilderAsset] = useState<Token>(currentNetwork.tokens[0]);
  const [builderAmount, setBuilderAmount] = useState<string>("50");
  const [builderMinProfit, setBuilderMinProfit] = useState<string>("0.15");
  const [builderMevBribeBps, setBuilderMevBribeBps] = useState<number>(1500);
  const [builderSteps, setBuilderSteps] = useState<SwapStep[]>([]);

  // Execution Receipts History
  const [receipts, setReceipts] = useState<ExecutionReceipt[]>([
    {
      txHash: '0x4f128c8de15c893240e87da6a1476d05f319a3b6807d4fae23b2c9ad3e8b4e71',
      status: 'mined',
      networkId: 'ethereum',
      blockNumber: 21045918,
      gasUsed: 284500,
      effectiveGasPriceGwei: 18.5,
      netProfitRealizedUsd: 1420.50,
      gasCostUsd: 16.40,
      relayUsed: 'https://relay.flashbots.net',
      timestamp: Date.now() - 3600000,
      explorerUrl: 'https://etherscan.io/tx/0x4f128c8de15c893240e87da6a1476d05f319a3b6807d4fae23b2c9ad3e8b4e71',
      logs: [
        '[RELAY] Bundle acknowledged by Flashbots Protect',
        '[SIMULATION SUCCESS] Verified positive yield threshold: +0.455 WETH',
        '[MINED] Included in block #21045918 position 0'
      ]
    },
    {
      txHash: '0x9b319c8de15c893240e87da6a1476d05f319a3b6807d4fae23b2c9ad3e8a9102',
      status: 'mined',
      networkId: 'arbitrum',
      blockNumber: 265891390,
      gasUsed: 198000,
      effectiveGasPriceGwei: 0.15,
      netProfitRealizedUsd: 890.20,
      gasCostUsd: 0.12,
      relayUsed: 'https://arbitrum.mev-share.flashbots.net',
      timestamp: Date.now() - 7200000,
      explorerUrl: 'https://arbiscan.io/tx/0x9b319c8de15c893240e87da6a1476d05f319a3b6807d4fae23b2c9ad3e8a9102',
      logs: [
        '[RELAY] Sequencer Fast-Path Inclusion confirmed',
        '[MINED] Included in block #265891390'
      ]
    }
  ]);

  // Persist strategies to localStorage
  useEffect(() => {
    localStorage.setItem('arbitrage_strategies', JSON.stringify(strategies));
  }, [strategies]);

  // Subscribe to mempool stream with Risk Threshold Monitor
  useEffect(() => {
    const unsubOpp = mempoolStream.subscribe((opp) => {
      setOpportunities((prev) => {
        const next = [opp, ...prev.slice(0, 45)];
        return next;
      });

      // 1. Evaluate opportunity against user-defined risk criteria
      const currentGasPriceGwei = currentNetwork.baseFeeGwei + currentNetwork.priorityFeeGwei;
      const riskEvaluation = evaluateOpportunityAgainstRiskCriteria(opp, riskCriteria, currentGasPriceGwei);

      if (riskEvaluation.matches) {
        // Trigger high-priority Risk Alert
        setRecentRiskAlert({
          opportunity: opp,
          timestamp: Date.now()
        });

        // Audio chime if enabled
        if (riskCriteria.audioAlerts && soundEnabled) {
          playRiskAlertChime();
        }

        // Native browser notification if enabled
        if (riskCriteria.browserNotifications) {
          dispatchRiskNotification(opp);
        }
      } else if (opp.status === 'profitable' && opp.estimatedNetProfitUsd > 80 && soundEnabled) {
        // Standard profit chime if general sound enabled but below full risk criteria
        playOpportunityChime();
      }
    });

    const unsubBlock = mempoolStream.subscribeBlocks((blk, netId) => {
      if (netId === currentNetworkId) {
        setCurrentBlock(blk);
      }
    });

    return () => {
      unsubOpp();
      unsubBlock();
    };
  }, [currentNetworkId, soundEnabled, riskCriteria, currentNetwork.baseFeeGwei, currentNetwork.priorityFeeGwei]);

  // Switch network
  const handleSelectNetwork = (netId: NetworkId) => {
    setCurrentNetworkId(netId);
    localStorage.setItem('active_network_id', netId);
    const newNet = networkMap[netId] || NETWORKS[netId];
    setContractAddress(newNet.defaultContractAddress);
    setBuilderAsset(newNet.tokens[0]);
    setCurrentBlock(mempoolStream.getCurrentBlock(netId));
  };

  // Update persistent network config overrides
  const handleUpdateNetworkConfig = (netId: NetworkId, updates: Partial<NetworkConfig>) => {
    const updated = {
      ...networkMap,
      [netId]: { ...networkMap[netId], ...updates }
    };
    setNetworkMap(updated);
    localStorage.setItem('network_overrides', JSON.stringify(updated));
  };

  const handleToggleStreaming = () => {
    const next = !isStreaming;
    setIsStreaming(next);
    mempoolStream.setStreaming(next);
  };

  const handleToggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    mempoolStream.setSoundEnabled(next);
  };

  // Force new opportunity injection
  const handleForceNewOpportunity = () => {
    const opp = mempoolStream.generateOpportunity(currentNetworkId, true);
    setOpportunities(prev => [opp, ...prev]);
    if (soundEnabled) playOpportunityChime();
  };

  // Load opportunity into builder
  const handleSelectOpportunity = (opp: MempoolOpportunity) => {
    setBuilderAsset(opp.tokenIn);
    setBuilderAmount(opp.loanAmount.toString());
    setBuilderSteps(opp.steps);
    setActiveTab('builder');
  };

  // Run dry run directly from an opportunity
  const handleSimulateOpportunity = async (opp: MempoolOpportunity) => {
    try {
      const minProfitRaw = ethers.parseUnits(
        (opp.loanAmount * 0.002).toFixed(opp.tokenIn.decimals > 6 ? 6 : opp.tokenIn.decimals),
        opp.tokenIn.decimals
      ).toString();

      const result = await simulateArbitrageDryRun(
        {
          rpcUrl: currentNetwork.rpcUrl,
          contractAddress,
          flashAssetAddress: opp.tokenIn.address,
          flashAmountRaw: opp.loanAmountRaw,
          minProfitRaw,
          mevBribeBps: 1500,
          swapSteps: opp.steps,
          relayEndpoint: currentNetwork.relays[0].endpoint,
          network: currentNetwork
        },
        opp.tokenIn.decimals,
        opp.tokenIn.usdPrice
      );

      setSimulationResult(result);
      setIsSimulationModalOpen(true);
    } catch (err: any) {
      console.error("Simulation failed:", err);
    }
  };

  // Run dry run from custom Route Builder
  const handleRunBuilderSimulation = async (
    asset: Token,
    amountStr: string,
    minProfitStr: string,
    mevBribeBps: number,
    steps: SwapStep[]
  ) => {
    try {
      const flashAmountRaw = ethers.parseUnits(amountStr || "1", asset.decimals).toString();
      const minProfitRaw = ethers.parseUnits(minProfitStr || "0.01", asset.decimals).toString();

      const result = await simulateArbitrageDryRun(
        {
          rpcUrl: currentNetwork.rpcUrl,
          contractAddress,
          flashAssetAddress: asset.address,
          flashAmountRaw,
          minProfitRaw,
          mevBribeBps,
          swapSteps: steps,
          relayEndpoint: currentNetwork.relays[0].endpoint,
          network: currentNetwork
        },
        asset.decimals,
        asset.usdPrice
      );

      setSimulationResult(result);
      setIsSimulationModalOpen(true);
    } catch (err: any) {
      console.error("Builder simulation error:", err);
    }
  };

  // Broadcast from simulation modal into execution console
  const handleBroadcastFromSimulation = (sim: SimulationResult) => {
    setBuilderAsset(sim.flashAsset);
    setBuilderAmount(sim.flashAmount.toString());
    setActiveTab('console');
  };

  // Strategy operations
  const handleSaveStrategy = (newStrat: ArbitrageStrategy) => {
    setStrategies(prev => [newStrat, ...prev.filter(s => s.id !== newStrat.id)]);
  };

  const handleDeleteStrategy = (id: string) => {
    setStrategies(prev => prev.filter(s => s.id !== id));
  };

  const handleImportStrategies = (imported: ArbitrageStrategy[]) => {
    setStrategies(imported);
  };

  const handleLoadStrategyIntoBuilder = (strat: ArbitrageStrategy) => {
    if (strat.networkId !== currentNetwork.id) {
      handleSelectNetwork(strat.networkId);
    }
    const token = currentNetwork.tokens.find(t => t.symbol === strat.assetSymbol) || currentNetwork.tokens[0];
    setBuilderAsset(token);
    setBuilderAmount(strat.defaultLoanAmount);
    setBuilderMinProfit(strat.minProfitThreshold);
    setBuilderMevBribeBps(strat.mevBribeBps);
    setBuilderSteps(strat.steps);
    setActiveTab('builder');
  };

  const viableCount = opportunities.filter(o => o.networkId === currentNetworkId && o.status === 'profitable').length;

  return (
    <ToastProvider>
      <div className="min-h-screen bg-[#090b10] text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200 pb-20 lg:pb-0">
        {/* Enterprise Header */}
        <Header
          currentNetwork={currentNetwork}
          onSelectNetwork={handleSelectNetwork}
          currentBlock={currentBlock}
          isStreaming={isStreaming}
          onToggleStreaming={handleToggleStreaming}
          soundEnabled={soundEnabled}
          onToggleSound={handleToggleSound}
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          connectedWallet={connectedWallet}
          onOpenNetworkManager={() => setIsNetworkModalOpen(true)}
          onOpenStrategyManager={() => setIsStrategyModalOpen(true)}
          onOpenRiskThresholds={() => setIsRiskModalOpen(true)}
          riskCriteria={riskCriteria}
          operationalGasWallet={operationalGasWallets[currentNetwork.id]}
          onOpenGasStrategy={() => setIsGasStrategyModalOpen(true)}
          uiMode={uiMode}
          onToggleUiMode={handleToggleUiMode}
        />

        {/* Main Content Container */}
        <main className="flex-1 max-w-7xl w-full mx-auto p-2 sm:p-6 lg:p-8">
          {uiMode === 'simple' ? (
            <SimpleArbitrageDashboard
              currentNetwork={currentNetwork}
              contractAddress={contractAddress}
              operationalGasWallet={operationalGasWallets[currentNetwork.id]}
              onOpenGasStrategy={() => setIsGasStrategyModalOpen(true)}
              onSwitchToAdvanced={() => handleToggleUiMode('advanced')}
              onAddReceipt={(rcpt) => setReceipts(prev => [rcpt, ...prev])}
            />
          ) : (
            <>
              <AnalyticsBar
                currentNetwork={currentNetwork}
                totalOpportunitiesCount={opportunities.length}
                totalViableCount={viableCount}
              />
              {activeTab === 'mempool' && <MempoolMonitor opportunities={opportunities} currentNetwork={currentNetwork} onSelectOpportunity={handleSelectOpportunity} onSimulateOpportunity={handleSimulateOpportunity} onForceNewOpportunity={handleForceNewOpportunity} operationalGasWallet={operationalGasWallets[currentNetwork.id]} onOpenGasStrategy={() => setIsGasStrategyModalOpen(true)} onSelectNetwork={handleSelectNetwork} />}
              {activeTab === 'builder' && <AdvancedRouteBuilder network={currentNetwork} contractAddress={contractAddress} onRunSimulation={handleRunBuilderSimulation} initialAsset={builderAsset} initialAmount={parseFloat(builderAmount)} initialSteps={builderSteps.length > 0 ? builderSteps : undefined} onSaveStrategy={handleSaveStrategy} />}
              {activeTab === 'performance' && <PerformanceDashboard receipts={receipts} currentNetwork={currentNetwork} />}
              {activeTab === 'backtesting' && <BacktestingConsole network={currentNetwork} strategies={strategies} onSelectStrategyToLoad={handleLoadStrategyIntoBuilder} />}
              {activeTab === 'abstraction' && <AccountAbstractionConsole network={currentNetwork} contractAddress={contractAddress} />}
              {activeTab === 'console' && <ExecutionConsole currentNetwork={currentNetwork} contractAddress={contractAddress} onUpdateContractAddress={setContractAddress} activeAsset={builderAsset} loanAmount={builderAmount} minProfit={builderMinProfit} mevBribeBps={builderMevBribeBps} steps={builderSteps.length > 0 ? builderSteps : opportunities[0]?.steps || []} receipts={receipts} onAddReceipt={(rcpt) => setReceipts(prev => [rcpt, ...prev])} />}
              {activeTab === 'daemon' && <DaemonExecutionConsole currentNetwork={currentNetwork} contractAddress={contractAddress} operationalGasWallet={operationalGasWallets[currentNetwork.id]} onSelectNetwork={handleSelectNetwork} onOpenGasStrategy={() => setIsGasStrategyModalOpen(true)} />}
              {activeTab === 'contract' && <ContractInspector currentNetwork={currentNetwork} />}
            </>
          )}
        </main>

        <MobileBottomNav activeTab={activeTab} onSelectTab={setActiveTab} />
        
        {/* Modals & Drawers */}
        <SimulationModal isOpen={isSimulationModalOpen} simulation={simulationResult} onClose={() => setIsSimulationModalOpen(false)} network={currentNetwork} onBroadcastToRelay={handleBroadcastFromSimulation} operationalGasWallet={operationalGasWallets[currentNetwork.id]} onOpenGasStrategy={() => setIsGasStrategyModalOpen(true)} />
        <SideDrawer isOpen={isNetworkModalOpen} onClose={() => setIsNetworkModalOpen(false)} title="Network & RPC Manager">
          <NetworkManagerModal isOpen={true} onClose={() => setIsNetworkModalOpen(false)} currentNetwork={currentNetwork} onSelectNetwork={handleSelectNetwork} onUpdateNetworkConfig={handleUpdateNetworkConfig} />
        </SideDrawer>
        <SideDrawer isOpen={isStrategyModalOpen} onClose={() => setIsStrategyModalOpen(false)} title="Strategy Templates">
          <StrategyManagerModal isOpen={true} onClose={() => setIsStrategyModalOpen(false)} strategies={strategies} onSelectStrategy={handleLoadStrategyIntoBuilder} onDeleteStrategy={handleDeleteStrategy} onImportStrategies={handleImportStrategies} network={currentNetwork} />
        </SideDrawer>
        <SideDrawer isOpen={isRiskModalOpen} onClose={() => setIsRiskModalOpen(false)} title="Risk Alerts & Thresholds">
          <RiskThresholdModal isOpen={true} onClose={() => setIsRiskModalOpen(false)} criteria={riskCriteria} onUpdateCriteria={setRiskCriteria} currentGasPriceGwei={currentNetwork.baseFeeGwei + currentNetwork.priorityFeeGwei} opportunities={opportunities} currentNetwork={currentNetwork} />
        </SideDrawer>
        <Phase1GasStrategyModal isOpen={isGasStrategyModalOpen} onClose={() => setIsGasStrategyModalOpen(false)} currentNetwork={currentNetwork} onSelectNetwork={handleSelectNetwork} operationalGasWallets={operationalGasWallets} onTopUpGasWallet={handleTopUpGasWallet} />
      </div>
    </ToastProvider>
  );
}
