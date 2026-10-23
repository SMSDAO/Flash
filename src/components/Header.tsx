import React, { useState, useRef, useEffect } from 'react';
import { NetworkConfig, NetworkId, OperationalGasWallet } from '../types/arbitrage';
import { NETWORKS } from '../config/networks';
import { 
  Activity, 
  Cpu, 
  Flame, 
  Radio, 
  Volume2, 
  VolumeX, 
  ShieldCheck, 
  Layers, 
  Wallet, 
  TrendingUp, 
  History, 
  Bookmark, 
  Globe, 
  Sparkles, 
  Terminal, 
  Zap, 
  ChevronDown, 
  Check, 
  Copy,
  ExternalLink
} from 'lucide-react';
import { RiskAlertCriteria } from '../utils/riskAlertService';

export type ActiveTabType = 
  | 'mempool' 
  | 'builder' 
  | 'performance' 
  | 'backtesting' 
  | 'abstraction' 
  | 'console' 
  | 'contract' 
  | 'daemon';

export type UiModeType = 'simple' | 'advanced';

interface HeaderProps {
  currentNetwork: NetworkConfig;
  onSelectNetwork: (networkId: NetworkId) => void;
  currentBlock: number;
  isStreaming: boolean;
  onToggleStreaming: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  activeTab: ActiveTabType;
  onSelectTab: (tab: ActiveTabType) => void;
  connectedWallet: string;
  onOpenNetworkManager: () => void;
  onOpenStrategyManager: () => void;
  onOpenRiskThresholds: () => void;
  riskCriteria: RiskAlertCriteria;
  operationalGasWallet?: OperationalGasWallet;
  onOpenGasStrategy: () => void;
  uiMode: UiModeType;
  onToggleUiMode: (mode: UiModeType) => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentNetwork,
  onSelectNetwork,
  currentBlock,
  isStreaming,
  onToggleStreaming,
  soundEnabled,
  onToggleSound,
  activeTab,
  onSelectTab,
  connectedWallet,
  onOpenNetworkManager,
  onOpenStrategyManager,
  onOpenRiskThresholds,
  riskCriteria,
  operationalGasWallet,
  onOpenGasStrategy,
  uiMode,
  onToggleUiMode
}) => {
  const [isChainDropdownOpen, setIsChainDropdownOpen] = useState(false);
  const [copiedWallet, setCopiedWallet] = useState(false);
  const chainDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (chainDropdownRef.current && !chainDropdownRef.current.contains(e.target as Node)) {
        setIsChainDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCopyWallet = () => {
    navigator.clipboard.writeText(connectedWallet);
    setCopiedWallet(true);
    setTimeout(() => setCopiedWallet(false), 1800);
  };

  const navTabs = [
    { id: 'mempool', label: 'Mempool Scanner', icon: Activity },
    { id: 'builder', label: 'Route Builder', icon: Cpu },
    { id: 'performance', label: 'Analytics', icon: TrendingUp },
    { id: 'console', label: 'Relays & Submitter', icon: Radio },
    { id: 'daemon', label: 'Daemon (24/7)', icon: Terminal },
    { id: 'backtesting', label: 'Backtester', icon: History },
    { id: 'abstraction', label: 'ERC-4337 Gas', icon: ShieldCheck },
    { id: 'contract', label: 'Smart Contract', icon: Layers }
  ] as const;

  // Gas status dynamic pill: Optimal vs Spike
  const isGasOptimal = currentNetwork.baseFeeGwei < 30;

  return (
    <header className="border-b border-slate-800/80 bg-[#0c1017]/95 backdrop-blur-2xl sticky top-0 z-40">
      {/* 1. Ultra-compact, high-density telemetry strip */}
      <div className="px-3 sm:px-6 py-1.5 border-b border-slate-800/80 bg-slate-950/80 text-[10px] flex items-center justify-between text-slate-400 gap-2 font-mono uppercase tracking-wider">
        <div className="flex items-center gap-3 sm:gap-5 overflow-x-auto scrollbar-none py-0.5">
          {/* MEV Relay Status */}
          <div className="flex items-center gap-1.5 text-emerald-400 font-semibold shrink-0">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
            </span>
            <span className="tracking-widest">MEV PROTECT ON</span>
          </div>

          {/* WSS Mempool Stream Feed */}
          <button 
            onClick={onToggleStreaming}
            className="flex items-center gap-1.5 text-slate-300 hover:text-cyan-400 transition-colors shrink-0"
            title="Toggle Live WebSocket Mempool Stream"
          >
            <Radio className={`w-3 h-3 ${isStreaming ? 'text-cyan-400 animate-pulse' : 'text-slate-500'}`} />
            <span>Feed: <strong className={isStreaming ? "text-cyan-400" : "text-slate-500"}>{isStreaming ? "LIVE" : "PAUSED"}</strong></span>
          </button>

          {/* Block Height */}
          <div className="hidden md:flex items-center gap-1 text-slate-300 shrink-0">
            <Layers className="w-3 h-3 text-indigo-400" />
            <span>Block: <strong className="text-white">#{currentBlock.toLocaleString()}</strong></span>
          </div>

          {/* Operational Gas Reserve */}
          {operationalGasWallet && (
            <button
              onClick={onOpenGasStrategy}
              className={`hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded border transition-all shrink-0 ${
                operationalGasWallet.isLowReserve 
                  ? 'bg-rose-950/50 border-rose-500/50 text-rose-300 hover:bg-rose-900/50' 
                  : 'bg-slate-900/80 border-slate-700/60 text-slate-300 hover:border-slate-500'
              }`}
            >
              <Flame className={`w-3 h-3 ${operationalGasWallet.isLowReserve ? 'text-rose-400 animate-bounce' : 'text-amber-400'}`} />
              <span>Reserve: <strong className="text-white">{operationalGasWallet.balance} {operationalGasWallet.currency}</strong></span>
            </button>
          )}
        </div>

        {/* Dynamic Gwei Gas Indicator with color pills */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5">
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-white font-bold">{currentNetwork.baseFeeGwei.toFixed(1)} <span className="text-slate-400 font-normal">Gwei</span></span>
          </div>
          
          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold tracking-widest border shadow-sm ${
            isGasOptimal 
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.2)]' 
              : 'bg-rose-500/10 text-rose-400 border-rose-500/30 shadow-[0_0_10px_rgba(244,63,94,0.2)]'
          }`}>
            {isGasOptimal ? '● OPTIMAL' : '▲ GAS SPIKE'}
          </span>
        </div>
      </div>

      {/* 2. Main High-Density Header Bar */}
      <div className="px-3 sm:px-6 py-2.5 flex items-center justify-between gap-3 sm:gap-6">
        {/* Brand & Terminal Identity */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-cyan-500 via-indigo-600 to-emerald-500 p-[1px] shadow-[0_0_15px_rgba(6,182,212,0.3)]">
            <div className="w-full h-full bg-[#090b10] rounded-[11px] flex items-center justify-center">
              <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-black text-white tracking-tight">ARBITRAGE</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-cyan-950/80 border border-cyan-500/40 text-cyan-400 font-bold">PRO V1.1.0</span>
            </div>
            <p className="text-[10px] text-slate-400 hidden sm:block">Aave V3 Flash Liquidity & Multi-DEX HFT</p>
          </div>
        </div>

        {/* Center: Live Chain Selector Dropdown & Quick Drawer Triggers */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Live Chain Dropdown */}
          <div className="relative" ref={chainDropdownRef}>
            <button
              onClick={() => setIsChainDropdownOpen(!isChainDropdownOpen)}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-900/90 border border-slate-700/80 hover:border-cyan-500/60 transition-all text-xs font-semibold text-white shadow-sm"
            >
              <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.8)]" />
              <span className="font-mono">{currentNetwork.name}</span>
              {currentNetwork.isL2 && (
                <span className="text-[9px] px-1 py-0.2 rounded bg-purple-950 text-purple-300 border border-purple-800">L2</span>
              )}
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {isChainDropdownOpen && (
              <div className="absolute top-full left-0 mt-1.5 w-60 rounded-xl bg-slate-950/95 backdrop-blur-2xl border border-slate-800 shadow-[0_15px_35px_rgba(0,0,0,0.8)] p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="text-[10px] font-mono font-bold text-slate-400 px-2 py-1 tracking-wider uppercase border-b border-slate-800/80 mb-1">
                  Active Execution Networks
                </div>
                {Object.values(NETWORKS).map((net) => {
                  const isSelected = net.id === currentNetwork.id;
                  return (
                    <button
                      key={net.id}
                      onClick={() => {
                        onSelectNetwork(net.id);
                        setIsChainDropdownOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-mono transition-all ${
                        isSelected 
                          ? 'bg-cyan-500/15 text-cyan-300 font-bold border border-cyan-500/30' 
                          : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-cyan-400' : 'bg-slate-600'}`} />
                        <span>{net.name}</span>
                        {net.isL2 && (
                          <span className="text-[9px] px-1 py-0.2 rounded bg-purple-950/80 text-purple-300 border border-purple-800/60">L2</span>
                        )}
                      </div>
                      {isSelected && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick Drawer Action Buttons (Desktop/Tablet) */}
          <div className="hidden md:flex items-center gap-1.5 bg-slate-950/70 p-1 rounded-xl border border-slate-800/80">
            <button
              onClick={onOpenNetworkManager}
              className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-slate-900 transition-colors"
              title="Network & RPC Failover Config"
            >
              <Globe className="w-4 h-4" />
            </button>
            <button
              onClick={onOpenStrategyManager}
              className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-400 hover:bg-slate-900 transition-colors"
              title="Arbitrage Strategy Templates"
            >
              <Bookmark className="w-4 h-4" />
            </button>
            <button
              onClick={onOpenRiskThresholds}
              className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-slate-900 transition-colors"
              title="Risk Guard & Circuit Breakers"
            >
              <ShieldCheck className="w-4 h-4" />
            </button>
            <button
              onClick={onToggleSound}
              className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-slate-900 transition-colors"
              title={soundEnabled ? "Mute Opportunity Audio Alerts" : "Unmute Opportunity Audio Alerts"}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-amber-400" /> : <VolumeX className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Right: Sleek Mode Switcher + Connected Wallet Badge */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Sleek Simple Mode vs. Advanced Mode Toggle Switch */}
          <div className="flex items-center p-0.5 rounded-xl bg-slate-950 border border-slate-800 shadow-inner">
            <button
              onClick={() => onToggleUiMode('simple')}
              className={`px-2.5 sm:px-3 py-1 rounded-lg text-[11px] font-bold tracking-wider uppercase transition-all duration-200 ${
                uiMode === 'simple'
                  ? 'bg-gradient-to-r from-emerald-600 to-cyan-600 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)]'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              Simple
            </button>
            <button
              onClick={() => onToggleUiMode('advanced')}
              className={`px-2.5 sm:px-3 py-1 rounded-lg text-[11px] font-bold tracking-wider uppercase transition-all duration-200 ${
                uiMode === 'advanced'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-[0_0_15px_rgba(147,51,234,0.4)]'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              Advanced
            </button>
          </div>

          {/* Connected Wallet Badge */}
          <button
            onClick={handleCopyWallet}
            className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-700/80 hover:border-slate-500 transition-all text-xs font-mono text-slate-300 group"
            title="Click to copy connected wallet address"
          >
            <span className="relative flex h-2 w-2">
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
            </span>
            <Wallet className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline font-bold text-white">
              {connectedWallet.slice(0, 6)}...{connectedWallet.slice(-4)}
            </span>
            {copiedWallet ? (
              <span className="text-[10px] text-emerald-400 font-sans font-bold">Copied!</span>
            ) : (
              <Copy className="w-3 h-3 text-slate-500 group-hover:text-slate-300 transition-colors" />
            )}
          </button>
        </div>
      </div>

      {/* 3. Advanced Navigation Slider (Institutional Trading Terminal Style) */}
      {uiMode === 'advanced' && (
        <div className="hidden lg:flex px-6 border-t border-slate-800/60 bg-slate-950/40 overflow-x-auto scrollbar-none">
          <div className="flex items-center gap-1">
            {navTabs.map((tab) => {
              const isActive = activeTab === tab.id;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => onSelectTab(tab.id)}
                  className={`flex items-center gap-2 px-3.5 py-2.5 text-[11px] font-mono font-bold uppercase tracking-wider border-b-2 transition-all duration-200 whitespace-nowrap ${
                    isActive
                      ? 'border-cyan-400 text-cyan-400 bg-cyan-950/20 shadow-[0_2px_10px_rgba(6,182,212,0.15)]'
                      : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-cyan-400' : 'text-slate-500'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </header>
  );
};
