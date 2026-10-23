export type NetworkId = 'ethereum' | 'arbitrum' | 'polygon' | 'optimism' | 'zksync';

export enum ProtocolType {
  UNISWAP_V2 = 0,
  UNISWAP_V3 = 1,
  BALANCER_V2 = 2,
  CURVE_V2 = 3,
  SUSHISWAP = 4
}

export interface Token {
  symbol: string;
  name: string;
  address: string;
  decimals: number;
  icon?: string;
  usdPrice: number;
  chainlinkFeedAddress?: string;
}

export interface ChainlinkFeedInfo {
  pair: string;
  address: string;
  decimals: number;
  latestPriceUsd: number;
  updatedAt: number;
  roundId: string;
  heartbeatSec: number;
  isStale: boolean;
}

export interface RelayLatencyInfo {
  networkId: NetworkId;
  relayName: string;
  endpoint: string;
  latencyMs: number;
  status: 'optimal' | 'good' | 'degraded' | 'offline';
  lastPingTimestamp: number;
}

export interface NetworkConfig {
  id: NetworkId;
  name: string;
  chainId: number;
  currency: string;
  explorerUrl: string;
  rpcUrl: string;
  aavePoolAddress: string;
  defaultContractAddress: string;
  relays: { name: string; endpoint: string; description: string }[];
  dexes: {
    protocol: ProtocolType;
    name: string;
    routerAddress: string;
    vaultAddress?: string;
  }[];
  tokens: Token[];
  avgBlockTime: number; // in seconds
  baseFeeGwei: number;
  priorityFeeGwei: number;
  chainlinkFeeds?: Record<string, ChainlinkFeedInfo>;
  isCustom?: boolean;
  isL2?: boolean;
  minOperationalGasReserve: number; // 0.05 ETH on L2s, 0.3 ETH on Mainnet
  minOperationalGasReserveCurrency: string;
  avgGasCostRangeUsd: string;
  gasEfficiencyRating: string;
}

export interface OperationalGasWallet {
  networkId: NetworkId;
  address: string;
  balance: number;
  currency: string;
  minRequiredReserve: number;
  isLowReserve: boolean;
  revertCapacityCount: number;
  avgGasPerTxUsd: number;
  lastTopUpTimestamp?: number;
}

export interface SwapStep {
  id: string;
  protocol: ProtocolType;
  targetContract: string;
  tokenIn: string;
  tokenOut: string;
  v3Fee: number; // e.g. 100, 500, 3000, 10000
  balancerPoolId: string;
  minAmountOut: string; // BigNumberish string
  slippageTolerancePct: number; // e.g. 0.1% = 0.1
  // UI helper annotations
  tokenInSymbol?: string;
  tokenOutSymbol?: string;
  dexName?: string;
  estimatedAmountOut?: string;
}

export interface RiskConfig {
  maxLoanAmountUsd: number;
  maxGasPriceCircuitBreakerGwei: number;
  maxSlippagePerDexBps: Record<string, number>;
  enforceOraclePriceBounds: boolean;
  maxOracleDeviationPct: number;
}

export interface ArbitrageStrategy {
  id: string;
  name: string;
  description: string;
  networkId: NetworkId;
  assetSymbol: string;
  defaultLoanAmount: string;
  minProfitThreshold: string;
  mevBribeBps: number;
  steps: SwapStep[];
  preferredDexVersion: 'V2' | 'V3' | 'HYBRID';
  tags: string[];
  createdAt: number;
  updatedAt: number;
}

export interface ArbitrageParams {
  minProfit: string; // in loan asset units
  mevBribeBps: number; // basis points, e.g. 1500 = 15%
  steps: SwapStep[];
}

export interface MempoolOpportunity {
  id: string;
  timestamp: number;
  networkId: NetworkId;
  pair: string;
  tokenIn: Token;
  tokenOut: Token;
  loanAmount: number;
  loanAmountRaw: string;
  route: {
    protocol1: ProtocolType;
    dex1Name: string;
    protocol2: ProtocolType;
    dex2Name: string;
  };
  spreadPct: number;
  estimatedGrossProfitUsd: number;
  estimatedAaveFeeUsd: number;
  estimatedGasFeeUsd: number;
  estimatedBribeUsd: number;
  estimatedNetProfitUsd: number;
  status: 'profitable' | 'marginal' | 'unviable';
  poolDiscrepancy: string;
  targetBlock: number;
  steps: SwapStep[];
  chainlinkBenchmarkPriceUsd?: number;
  oracleDeviationPct?: number;
}

export interface SimulationTraceStep {
  depth: number;
  target: string;
  method: string;
  params: Record<string, any>;
  gasUsed: number;
  status: 'SUCCESS' | 'REVERTED';
  output?: string;
}

export interface SimulationResult {
  success: boolean;
  blockNumber: number;
  flashAsset: Token;
  flashAmount: number;
  totalRepayment: number;
  aaveFeeAmount: number;
  grossProfit: number;
  gasLimit: number;
  gasPriceGwei: number;
  estimatedGasCostUsd: number;
  mevBribeAmount: number;
  mevBribeUsd: number;
  netProfit: number;
  netProfitUsd: number;
  traces: SimulationTraceStep[];
  error?: string;
  revertReason?: string;
  encodedCalldata: string;
  timestamp: number;
  circuitBreakerTriggered?: boolean;
}

export interface ExecutionReceipt {
  txHash: string;
  status: 'pending' | 'mined' | 'reverted';
  networkId?: NetworkId;
  blockNumber?: number;
  gasUsed?: number;
  effectiveGasPriceGwei?: number;
  netProfitRealizedUsd?: number;
  gasCostUsd?: number;
  relayUsed: string;
  timestamp: number;
  explorerUrl: string;
  logs: string[];
}

// Performance & Analytics Types
export interface PerformanceTimelinePoint {
  date: string;
  timestamp: number;
  netProfitUsd: number;
  gasCostUsd: number;
  cumulativeNetProfitUsd: number;
  cumulativeGasCostUsd: number;
  tradeCount: number;
  winRate: number;
}

export interface ChainPerformanceStat {
  networkId: NetworkId;
  chainName: string;
  totalNetProfitUsd: number;
  totalGasCostUsd: number;
  tradeCount: number;
  successfulTrades: number;
  efficiencyRatio: number; // net profit / gas
  avgProfitPerTradeUsd: number;
}

// Backtesting Types
export interface BacktestConfig {
  strategyId?: string;
  networkId: NetworkId;
  dateRange: '7d' | '30d' | '90d' | 'high_volatility_dencun';
  initialBalanceUsd: number;
  maxConcurrentLoans: number;
  simulatedSlippageModel: 'fixed' | 'dynamic_depth';
}

export interface BacktestTrade {
  id: string;
  blockNumber: number;
  timestamp: number;
  pair: string;
  route: string;
  loanAmountUsd: number;
  grossProfitUsd: number;
  aaveFeeUsd: number;
  gasCostUsd: number;
  mevBribeUsd: number;
  netProfitUsd: number;
  status: 'PROFIT' | 'LOSS' | 'REVERT_SAVED';
}

export interface BacktestResult {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRatePct: number;
  totalGrossProfitUsd: number;
  totalGasSpentUsd: number;
  totalNetProfitUsd: number;
  maxDrawdownPct: number;
  sharpeRatio: number;
  profitFactor: number;
  trades: BacktestTrade[];
  equityCurve: { timestamp: number; equityUsd: number; date: string }[];
}

// ERC-4337 Account Abstraction Types
export interface UserOperation {
  sender: string;
  nonce: string;
  initCode: string;
  callData: string;
  callGasLimit: string;
  verificationGasLimit: string;
  preVerificationGas: string;
  maxFeePerGas: string;
  maxPriorityFeePerGas: string;
  paymasterAndData: string;
  signature: string;
}

export interface AccountAbstractionConfig {
  enabled: boolean;
  entryPointAddress: string;
  smartAccountAddress: string;
  bundlerRpcUrl: string;
  paymasterSponsor: boolean;
  paymasterAddress: string;
  batchedOperationsCount: number;
}

// Dynamic Gas Optimization
export type GasOptimizationMode = 'cost_saver' | 'balanced_mev' | 'aggressive_preemption';

export interface DynamicGasRecommendation {
  mode: GasOptimizationMode;
  maxFeePerGasGwei: number;
  maxPriorityFeePerGasGwei: number;
  suggestedGasLimit: number;
  inclusionProbabilityPct: number;
  estimatedWaitMs: number;
  expectedGrossYieldUsd: number;
  estimatedGasCostUsd: number;
  projectedNetYieldUsd: number;
}

// Phase 2: Autonomous Backend Execution Daemon Types
export interface DaemonLogEntry {
  id: string;
  timestamp: number;
  level: 'info' | 'success' | 'warn' | 'error' | 'trace';
  prefix: 'DAEMON ACTIVE' | 'MEMPOOL SCAN' | 'SIMULATION PASSED' | 'DYNAMIC GAS' | 'EXECUTING' | 'SUCCESS' | 'MINED' | 'SKIPPED/REVERTED' | 'RECONNECT' | 'CONFIG';
  message: string;
  details?: Record<string, any>;
}

export interface DaemonTelemetryMetrics {
  status: 'running' | 'paused' | 'stopped' | 'reconnecting';
  uptimeSeconds: number;
  mempoolTxsScanned: number;
  simulationsRun: number;
  simulationsPassed: number;
  simulationsReverted: number;
  broadcastCount: number;
  minedCount: number;
  totalNetProfitUsd: number;
  totalNetProfitEth: number;
  revertGasSavedUsd: number;
  lastBlockNumber: number;
  relayLatencyMs: number;
  lastOpportunityTimestamp?: number;
}

export interface DaemonConfigState {
  rpcWss: string;
  contractAddress: string;
  relayEndpoint: string;
  minProfitEth: string;
  mevBribeBps: number;
  dryRun: boolean;
  selectedNetworkId: NetworkId;
  healthPort: number;
}
