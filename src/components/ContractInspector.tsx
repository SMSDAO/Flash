import React, { useState } from 'react';
import { 
  SOLIDITY_SOURCE_CODE, 
  CONTRACT_ABI, 
  FOUNDRY_DEPLOY_SCRIPT, 
  HARDHAT_DEPLOY_SCRIPT 
} from '../contracts/contractData';
import { 
  Copy, 
  Check, 
  Download, 
  FileCode, 
  Code2, 
  Terminal, 
  ExternalLink, 
  ShieldCheck,
  CheckCircle2,
  BookOpen,
  Cloud
} from 'lucide-react';
import { NetworkConfig } from '../types/arbitrage';

interface ContractInspectorProps {
  currentNetwork: NetworkConfig;
}

export const ContractInspector: React.FC<ContractInspectorProps> = ({ currentNetwork }) => {
  const [activeTab, setActiveTab] = useState<'phase4_master' | 'solidity' | 'abi' | 'foundry' | 'hardhat' | 'docs'>('phase4_master');
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  const MASTER_PROMPT_TEXT = `Role: Principal Smart Contract & MEV Systems Architect.
Task: Generate the complete production workspace for an autonomous multi-chain Flash Loan Arbitrage system. 

Provide fully written, production-ready code files without placeholders for:
1. Foundry smart contract (EnterpriseFlashLoanArbitrage.sol) featuring Aave V3 flash loans, Uniswap V2/V3, Curve V2, and Balancer V2 execution routing, strict profit checks, and dynamic block.coinbase MEV builder tips.
2. Node.js automated background worker (daemon.js) featuring WebSocket mempool transaction sniffing, static-call simulation checks (staticCall), and EIP-1559 gas optimization.
3. Complete Docker configuration (Dockerfile and docker-compose.yml) optimized for 24/7 uninterrupted cloud container execution on Arbitrum and Optimism to maintain minimal gas overhead (<$0.05 per trade).`;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(MASTER_PROMPT_TEXT);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  const downloadTextFile = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadSol = () => {
    downloadTextFile('EnterpriseFlashLoanArbitrage.sol', SOLIDITY_SOURCE_CODE);
  };

  const handleDownloadAbi = () => {
    downloadTextFile('EnterpriseFlashLoanArbitrage.json', JSON.stringify(CONTRACT_ABI, null, 2));
  };

  return (
    <div className="space-y-4 font-mono">
      {/* Top Banner */}
      <div className="bg-[#0b0e14] border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <FileCode className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-bold text-white">EnterpriseFlashLoanArbitrage.sol</h2>
            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
              Solidity ^0.8.20
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Single-source-of-truth production smart contract powering atomic cross-protocol flash loan arbitrage.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleCopy(SOLIDITY_SOURCE_CODE)}
            className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-200 text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedCode ? 'Copied' : 'Copy Contract'}</span>
          </button>

          <button
            onClick={handleDownloadSol}
            className="px-3 py-1.5 rounded-lg bg-cyan-950 border border-cyan-800 text-cyan-300 hover:bg-cyan-900 text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download .sol</span>
          </button>
        </div>
      </div>

      {/* Contract Viewer Container */}
      <div className="bg-[#090b10] border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
        {/* Navigation Tabs */}
        <div className="px-4 py-2 border-b border-slate-800 flex items-center justify-between bg-slate-950/80 text-xs flex-wrap gap-2">
          <div className="flex items-center gap-1 overflow-x-auto">
            <button
              onClick={() => setActiveTab('phase4_master')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'phase4_master'
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-600 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Terminal className="w-3.5 h-3.5 text-emerald-400" />
              <span>Phase 4: Master AI Studio Deployment</span>
              <span className="px-1.5 py-0.2 rounded text-[9px] bg-emerald-900 text-emerald-200 border border-emerald-700">
                PRODUCTION
              </span>
            </button>
            <button
              onClick={() => setActiveTab('solidity')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                activeTab === 'solidity'
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Solidity Source
            </button>
            <button
              onClick={() => setActiveTab('abi')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                activeTab === 'abi'
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Contract ABI
            </button>
            <button
              onClick={() => setActiveTab('foundry')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                activeTab === 'foundry'
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Foundry Deploy Script
            </button>
            <button
              onClick={() => setActiveTab('hardhat')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                activeTab === 'hardhat'
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Hardhat Deploy Script
            </button>
            <button
              onClick={() => setActiveTab('docs')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                activeTab === 'docs'
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Architecture & Security
            </button>
          </div>

          <div className="text-[11px] text-slate-500 hidden sm:block">
            Target Pool: {currentNetwork.aavePoolAddress.slice(0, 10)}...
          </div>
        </div>

        {/* Content Tabs */}
        <div className="p-4 overflow-x-auto max-h-[640px] text-xs">
          {activeTab === 'phase4_master' && (
            <div className="space-y-6">
              {/* Master Prompt Block */}
              <div className="bg-[#06080d] border border-emerald-900/80 rounded-xl p-5 shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-emerald-400" />
                    <span className="text-sm font-bold text-white font-mono">
                      Phase 4: Master AI Studio Deployment Prompt
                    </span>
                  </div>
                  <button
                    onClick={handleCopyPrompt}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-700 text-xs font-mono transition-colors self-start sm:self-auto cursor-pointer"
                  >
                    {copiedPrompt ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedPrompt ? 'Copied Prompt to Clipboard' : 'Copy Master Prompt'}</span>
                  </button>
                </div>

                <div className="mt-3 bg-slate-950 p-4 rounded-lg border border-slate-900 font-mono text-xs text-emerald-300 leading-relaxed whitespace-pre-wrap select-all">
                  {MASTER_PROMPT_TEXT}
                </div>
              </div>

              {/* Three Verified Production Deliverables */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Deliverable 1 */}
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-cyan-400 font-bold font-mono flex items-center gap-1.5">
                        <FileCode className="w-4 h-4" />
                        1. Foundry Smart Contract
                      </span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 font-bold uppercase">
                        Verified
                      </span>
                    </div>
                    <div className="text-white font-mono text-xs mt-1">
                      EnterpriseFlashLoanArbitrage.sol
                    </div>
                    <ul className="text-slate-400 text-[11px] list-disc list-inside mt-2 space-y-1 font-sans">
                      <li>Aave V3 Flash Loan simple receiver</li>
                      <li>Uniswap V2, V3, Curve V2, Balancer V2 routing</li>
                      <li>Strict profit checks with custom errors</li>
                      <li>Dynamic <code className="text-cyan-300 font-mono">block.coinbase</code> MEV tip</li>
                      <li>EIP-1559 gas circuit breaker + Chainlink freshness</li>
                    </ul>
                  </div>

                  <div className="pt-2 border-t border-slate-900 flex items-center gap-2">
                    <button
                      onClick={handleDownloadSol}
                      className="w-full py-1.5 rounded bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-800 text-xs font-mono flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download .sol</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('solidity')}
                      className="px-2.5 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-mono transition-colors"
                      title="View Source"
                    >
                      View
                    </button>
                  </div>
                </div>

                {/* Deliverable 2 */}
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-purple-400 font-bold font-mono flex items-center gap-1.5">
                        <Terminal className="w-4 h-4" />
                        2. Node.js Worker Daemon
                      </span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 font-bold uppercase">
                        Verified
                      </span>
                    </div>
                    <div className="text-white font-mono text-xs mt-1">
                      daemon.js
                    </div>
                    <ul className="text-slate-400 text-[11px] list-disc list-inside mt-2 space-y-1 font-sans">
                      <li>Ethers.js v6 WebSocket mempool stream listener</li>
                      <li>Mandatory local <code className="text-purple-300 font-mono">staticCall</code> dry-run</li>
                      <li>Dynamic EIP-1559 gas optimization</li>
                      <li>Private MEV relay bundle broadcast</li>
                      <li>HTTP /health endpoint & graceful shutdown</li>
                    </ul>
                  </div>

                  <div className="pt-2 border-t border-slate-900 flex items-center gap-2">
                    <button
                      onClick={() => {
                        // Trigger daemon.js download via window or custom fetch
                        const script = document.createElement('a');
                        script.href = '/daemon.js';
                        script.download = 'daemon.js';
                        script.click();
                      }}
                      className="w-full py-1.5 rounded bg-purple-950 hover:bg-purple-900 text-purple-300 border border-purple-800 text-xs font-mono flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download daemon.js</span>
                    </button>
                  </div>
                </div>

                {/* Deliverable 3 */}
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-blue-400 font-bold font-mono flex items-center gap-1.5">
                        <Cloud className="w-4 h-4" />
                        3. Cloud Containerization
                      </span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 font-bold uppercase">
                        Verified
                      </span>
                    </div>
                    <div className="text-white font-mono text-xs mt-1">
                      Dockerfile & docker-compose.yml
                    </div>
                    <ul className="text-slate-400 text-[11px] list-disc list-inside mt-2 space-y-1 font-sans">
                      <li>Multi-stage Node.js 20 Alpine with <code className="text-blue-300 font-mono">dumb-init</code></li>
                      <li><code className="text-emerald-400 font-mono">restart: always</code> 24/7 crash recovery</li>
                      <li><code className="text-amber-400 font-mono">json-file</code> log rotation (10m x 3)</li>
                      <li>Optimized for Arbitrum & Optimism L2 gas (&lt;$0.05/tx)</li>
                      <li>Isolated non-root container security</li>
                    </ul>
                  </div>

                  <div className="pt-2 border-t border-slate-900 flex items-center gap-2">
                    <button
                      onClick={() => {
                        const script = document.createElement('a');
                        script.href = '/docker-compose.yml';
                        script.download = 'docker-compose.yml';
                        script.click();
                      }}
                      className="w-full py-1.5 rounded bg-blue-950 hover:bg-blue-900 text-blue-300 border border-blue-800 text-xs font-mono flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download Compose</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Architecture Blueprint */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-xs">
                <span className="text-cyan-400 font-bold block mb-2">Atomic Execution & MEV Flow:</span>
                <div className="p-3 bg-[#06080d] rounded-lg border border-slate-900 text-slate-300 leading-relaxed font-mono">
                  [Mempool WebSocket] ➔ [Detect DEX Spread] ➔ [Mandatory staticCall Dry-Run] ➔ [Dynamic EIP-1559 Gas Pricing] ➔ [Private MEV Relay] ➔ [Aave V3 flashLoanSimple] ➔ [Uniswap V2/V3 / Curve / Balancer Swaps] ➔ [Strict Profit Verification: balance &gt;= debt + minProfit] ➔ [block.coinbase MEV Tip] ➔ [Repay Debt + Premium] ➔ [Net Profit Retained in Contract]
                </div>
              </div>
            </div>
          )}

          {activeTab === 'solidity' && (
            <pre className="text-slate-300 leading-relaxed font-mono whitespace-pre selection:bg-cyan-800/60 selection:text-white">
              {SOLIDITY_SOURCE_CODE}
            </pre>
          )}

          {activeTab === 'abi' && (
            <div>
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
                <span className="text-slate-400">Complete JSON Application Binary Interface (ABI)</span>
                <button
                  onClick={handleDownloadAbi}
                  className="px-2.5 py-1 rounded bg-slate-800 text-slate-300 hover:text-white flex items-center gap-1.5 text-xs transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download ABI JSON</span>
                </button>
              </div>
              <pre className="text-cyan-300 leading-relaxed font-mono whitespace-pre">
                {JSON.stringify(CONTRACT_ABI, null, 2)}
              </pre>
            </div>
          )}

          {activeTab === 'foundry' && (
            <div>
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
                <span className="text-slate-400">Foundry Deploy Script (`script/Deploy.s.sol`)</span>
                <button
                  onClick={() => handleCopy(FOUNDRY_DEPLOY_SCRIPT)}
                  className="px-2.5 py-1 rounded bg-slate-800 text-slate-300 hover:text-white flex items-center gap-1 text-xs"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Script</span>
                </button>
              </div>
              <pre className="text-emerald-300 leading-relaxed font-mono whitespace-pre">
                {FOUNDRY_DEPLOY_SCRIPT}
              </pre>
            </div>
          )}

          {activeTab === 'hardhat' && (
            <div>
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
                <span className="text-slate-400">Hardhat Deployment Script (`scripts/deploy.ts`)</span>
                <button
                  onClick={() => handleCopy(HARDHAT_DEPLOY_SCRIPT)}
                  className="px-2.5 py-1 rounded bg-slate-800 text-slate-300 hover:text-white flex items-center gap-1 text-xs"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Script</span>
                </button>
              </div>
              <pre className="text-amber-300 leading-relaxed font-mono whitespace-pre">
                {HARDHAT_DEPLOY_SCRIPT}
              </pre>
            </div>
          )}

          {activeTab === 'docs' && (
            <div className="space-y-4 text-slate-300 font-sans text-xs">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <h4 className="text-sm font-bold text-white flex items-center gap-2 font-mono">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Production MEV Security & Execution Architecture</span>
                </h4>
                <p className="text-slate-400">
                  The <code className="text-cyan-300 font-mono">EnterpriseFlashLoanArbitrage</code> contract implements an atomic flash loan lifecycle on Aave V3.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                  <h5 className="font-bold text-white font-mono text-xs text-cyan-300">1. ReentrancyGuard & Owner Authorization</h5>
                  <p className="text-slate-400">
                    Only <code className="text-slate-200 font-mono">onlyOwner</code> can initiate flash loans. Inside <code className="text-slate-200 font-mono">executeOperation</code>, strict validation ensures the caller is exclusively <code className="text-slate-200 font-mono">AAVE_POOL</code> and the initiator is this contract, defending against unauthorized spoofing.
                  </p>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                  <h5 className="font-bold text-white font-mono text-xs text-emerald-300">2. Hard Revert Profit Gate</h5>
                  <p className="text-slate-400">
                    If <code className="text-slate-200 font-mono">currentBalance &lt; totalRepayment + arbParams.minProfit</code>, the transaction reverts with custom error <code className="text-slate-200 font-mono">InsufficientProfit(...)</code>. In an atomic transaction, the entire bundle reverts and zero loan fee or loss is incurred.
                  </p>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                  <h5 className="font-bold text-white font-mono text-xs text-purple-300">3. Direct Coinbase Builder Bribe</h5>
                  <p className="text-slate-400">
                    For private MEV relays (Flashbots, Titan, BeaverBuild), transferring a portion of profit directly to <code className="text-slate-200 font-mono">block.coinbase</code> guarantees top-of-block priority inclusion without leaking alpha to the public mempool.
                  </p>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                  <h5 className="font-bold text-white font-mono text-xs text-amber-300">4. Universal DEX Route Engine</h5>
                  <p className="text-slate-400">
                    Encodes polymorphic hops across Uniswap V2, Uniswap V3, Balancer V2 Vaults, and Curve V2 within a single calldata payload.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
