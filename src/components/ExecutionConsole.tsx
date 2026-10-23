import React, { useState } from 'react';
import { 
  NetworkConfig, 
  ExecutionReceipt, 
  SwapStep, 
  Token 
} from '../types/arbitrage';
import { executeMevFlashLoan } from '../services/mevExecutionService';
import { ethers } from 'ethers';
import { 
  Terminal, 
  Send, 
  CheckCircle2, 
  ExternalLink, 
  Clock, 
  ShieldCheck, 
  Radio, 
  Flame, 
  Server, 
  AlertCircle,
  Copy,
  Check,
  RefreshCw
} from 'lucide-react';

interface ExecutionConsoleProps {
  currentNetwork: NetworkConfig;
  contractAddress: string;
  onUpdateContractAddress: (addr: string) => void;
  activeAsset: Token;
  loanAmount: string;
  minProfit: string;
  mevBribeBps: number;
  steps: SwapStep[];
  receipts: ExecutionReceipt[];
  onAddReceipt: (rcpt: ExecutionReceipt) => void;
}

export const ExecutionConsole: React.FC<ExecutionConsoleProps> = ({
  currentNetwork,
  contractAddress,
  onUpdateContractAddress,
  activeAsset,
  loanAmount,
  minProfit,
  mevBribeBps,
  steps,
  receipts,
  onAddReceipt
}) => {
  const [selectedRelay, setSelectedRelay] = useState<string>(currentNetwork.relays[0].endpoint);
  const [isExecuting, setIsExecuting] = useState(false);
  const [statusStep, setStatusStep] = useState(0);
  const [terminalLogs, setTerminalLogs] = useState<string[]>([
    `[INIT] Multi-Chain MEV Execution Engine initialized.`,
    `[TARGET] Connected to ${currentNetwork.name} (Chain ID: ${currentNetwork.chainId})`,
    `[RELAY] Default private builder relay: ${currentNetwork.relays[0].name}`,
    `[READY] Awaiting bundle broadcast command...`
  ]);

  const addLog = (msg: string) => {
    setTerminalLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const handleBroadcast = async () => {
    if (isExecuting) return;
    setIsExecuting(true);
    setStatusStep(1);

    addLog(`Broadcasting Flash Loan Arbitrage via Private MEV Relay...`);
    addLog(`Parameters: Borrow ${loanAmount} ${activeAsset.symbol} from Aave V3 Pool (${currentNetwork.aavePoolAddress.slice(0, 8)}...)`);

    try {
      const loanAmountRaw = ethers.parseUnits(loanAmount || "1", activeAsset.decimals).toString();
      const minProfitRaw = ethers.parseUnits(minProfit || "0.01", activeAsset.decimals).toString();

      const receipt = await executeMevFlashLoan(
        {
          rpcUrl: currentNetwork.rpcUrl,
          contractAddress,
          flashAssetAddress: activeAsset.address,
          flashAmountRaw: loanAmountRaw,
          minProfitRaw,
          mevBribeBps,
          swapSteps: steps,
          relayEndpoint: selectedRelay,
          network: currentNetwork
        },
        (msg, step) => {
          setStatusStep(step);
          addLog(msg);
        }
      );

      addLog(`[SUCCESS] Bundle mined in block #${receipt.blockNumber}! TX: ${receipt.txHash}`);
      addLog(`[YIELD] Net profit verified: +$${receipt.netProfitRealizedUsd?.toFixed(2)} USD`);
      onAddReceipt(receipt);
    } catch (err: any) {
      addLog(`[ERROR] Broadcast reverted or simulation failed: ${err.message}`);
    } finally {
      setIsExecuting(false);
      setStatusStep(0);
    }
  };

  return (
    <div className="space-y-6 font-mono text-xs">
      {/* Top Configuration Bar */}
      <div className="bg-[#0b0e14] border border-slate-800 rounded-xl p-5 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-5 pb-4 border-b border-slate-800">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Radio className="w-4 h-4 text-cyan-400" />
              <span>Private MEV Relay Submitter & Block Builder Gateway</span>
            </h2>
            <p className="text-slate-400 text-xs mt-0.5">
              Broadcasts sealed transaction bundles directly to Flashbots / Builder relays, bypassing the public mempool to prevent front-running.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-emerald-400 bg-emerald-950/80 border border-emerald-800 px-2.5 py-1 rounded-full flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Zero Sandwich Risk</span>
            </span>
          </div>
        </div>

        {/* Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
          {/* Contract Address */}
          <div>
            <label className="block text-slate-400 text-xs mb-1.5">
              Receiver Smart Contract Address
            </label>
            <div className="flex gap-1.5">
              <input
                type="text"
                value={contractAddress}
                onChange={(e) => onUpdateContractAddress(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-cyan-500"
              />
              <button
                onClick={() => onUpdateContractAddress(currentNetwork.defaultContractAddress)}
                title="Reset to network default"
                className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 text-[11px] shrink-0"
              >
                Reset
              </button>
            </div>
          </div>

          {/* MEV Relay Selection */}
          <div>
            <label className="block text-slate-400 text-xs mb-1.5">
              Target Private Builder Relay Endpoint
            </label>
            <select
              value={selectedRelay}
              onChange={(e) => setSelectedRelay(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-cyan-500 cursor-pointer"
            >
              {currentNetwork.relays.map((relay) => (
                <option key={relay.endpoint} value={relay.endpoint}>
                  {relay.name} ({relay.endpoint})
                </option>
              ))}
            </select>
          </div>

          {/* Dynamic Gas Specs */}
          <div>
            <label className="block text-slate-400 text-xs mb-1.5">
              EIP-1559 Dynamic Gas Parameters
            </label>
            <div className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 flex items-center justify-between">
              <div>
                <span className="text-slate-500">Max Priority: </span>
                <span className="text-amber-300 font-bold">{(currentNetwork.priorityFeeGwei * 1.25).toFixed(2)} Gwei</span>
              </div>
              <span className="text-slate-700">|</span>
              <div>
                <span className="text-slate-500">Max Fee: </span>
                <span className="text-amber-300 font-bold">{(currentNetwork.baseFeeGwei * 1.5 + currentNetwork.priorityFeeGwei * 1.25).toFixed(2)} Gwei</span>
              </div>
            </div>
          </div>
        </div>

        {/* Execution trigger */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-slate-950/60 border border-slate-800/80">
          <div className="text-slate-400 text-xs">
            Payload: Borrow <strong className="text-white">{loanAmount} {activeAsset.symbol}</strong> &middot; Repay <strong className="text-amber-400">{(parseFloat(loanAmount || "0") * 1.0005).toFixed(4)} {activeAsset.symbol}</strong> &middot; Tip <strong className="text-purple-400">{(mevBribeBps / 100).toFixed(1)}%</strong>
          </div>

          <button
            onClick={handleBroadcast}
            disabled={isExecuting}
            className={`px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 text-xs shadow-lg transition-all cursor-pointer ${
              isExecuting
                ? 'bg-slate-800 text-slate-400 cursor-wait'
                : 'bg-gradient-to-r from-cyan-600 via-indigo-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white shadow-cyan-950'
            }`}
          >
            {isExecuting ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Executing Pipeline (Step {statusStep}/5)...</span>
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>Execute Flash Loan via MEV Relay</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Real-Time Terminal Log */}
      <div className="bg-[#090b10] border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
        <div className="px-4 py-2.5 border-b border-slate-800 bg-slate-950/90 flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-300">
            <Terminal className="w-4 h-4 text-cyan-400" />
            <span className="font-semibold text-xs">Real-Time Submitter Telemetry & Builder Logs</span>
          </div>
          <button
            onClick={() => setTerminalLogs([`[CLEARED] Telemetry buffer reset at ${new Date().toLocaleTimeString()}`])}
            className="text-[11px] text-slate-500 hover:text-slate-300 transition-colors"
          >
            Clear Log
          </button>
        </div>

        <div className="p-4 bg-black/90 font-mono text-[11px] text-slate-300 space-y-1.5 max-h-64 overflow-y-auto">
          {terminalLogs.map((log, i) => {
            const isSuccess = log.includes('[SUCCESS]') || log.includes('[YIELD]');
            const isError = log.includes('[ERROR]');
            const isRelay = log.includes('[RELAY]') || log.includes('Broadcasting');

            return (
              <div 
                key={i} 
                className={`${
                  isSuccess ? 'text-emerald-400 font-semibold' : 
                  isError ? 'text-rose-400 font-semibold' : 
                  isRelay ? 'text-cyan-300' : 'text-slate-400'
                }`}
              >
                {log}
              </div>
            );
          })}
        </div>
      </div>

      {/* Transaction History Table */}
      <div className="bg-[#0b0e14] border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="p-3.5 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <h3 className="font-semibold text-white text-xs flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-400" />
            <span>Mined Flash Loan Transactions ({receipts.length})</span>
          </h3>
          <span className="text-slate-500 text-[11px]">Private Builder Inclusion History</span>
        </div>

        {receipts.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            No transactions executed yet in this session. Click &quot;Execute Flash Loan via MEV Relay&quot; to broadcast.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Transaction Hash</th>
                  <th className="py-2.5 px-3">Block Number</th>
                  <th className="py-2.5 px-3">Gas Used</th>
                  <th className="py-2.5 px-3">Effective Gas</th>
                  <th className="py-2.5 px-3">Relay Endpoint</th>
                  <th className="py-2.5 px-3 text-right">Realized Net Profit</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-center">Explorer</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {receipts.map((rcpt, i) => (
                  <tr key={i} className="hover:bg-slate-900/50 transition-colors">
                    <td className="py-2.5 px-3 text-cyan-300 font-semibold">
                      {rcpt.txHash.slice(0, 10)}...{rcpt.txHash.slice(-8)}
                    </td>
                    <td className="py-2.5 px-3 text-slate-200">
                      #{rcpt.blockNumber}
                    </td>
                    <td className="py-2.5 px-3 text-slate-400">
                      {rcpt.gasUsed?.toLocaleString()} units
                    </td>
                    <td className="py-2.5 px-3 text-amber-300">
                      {rcpt.effectiveGasPriceGwei} Gwei
                    </td>
                    <td className="py-2.5 px-3 text-slate-400 truncate max-w-[160px]">
                      {rcpt.relayUsed}
                    </td>
                    <td className="py-2.5 px-3 text-right text-emerald-400 font-bold">
                      +${rcpt.netProfitRealizedUsd?.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800 font-semibold">
                        MINED
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <a
                        href={rcpt.explorerUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-cyan-400 hover:text-cyan-300 inline-flex items-center gap-1"
                      >
                        <span>View</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
