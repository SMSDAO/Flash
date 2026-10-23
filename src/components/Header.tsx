import React from 'react';
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
  Play, 
  Pause,
  ExternalLink,
  Wallet,
  TrendingUp,
  History,
  Bookmark,
  Globe,
  Settings,
  Sparkles,
  AlertTriangle,
  Terminal,
  Zap,
  Sliders,
  Check,
  ChevronDown,
  ChevronRight,
  Menu,
  X
} from 'lucide-react';

import { RiskAlertCriteria } from '../utils/riskAlertService';
import { useState } from 'react';

export type ActiveTabType = 'mempool' | 'builder' | 'performance' | 'backtesting' | 'abstraction' | 'console' | 'contract' | 'daemon';

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
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navTabs = [
    { id: 'mempool', label: 'Live Mempool Scanner', icon: Activity },
    { id: 'builder', label: 'Advanced Swap Path Builder', icon: Cpu },
    { id: 'performance', label: 'Performance & Gas Telemetry', icon: TrendingUp },
    { id: 'backtesting', label: 'Strategy Backtesting', icon: History },
    { id: 'abstraction', label: 'ERC-4337 & Dynamic Gas', icon: ShieldCheck },
    { id: 'console', label: 'MEV Relay Submitter', icon: Radio },
    { id: 'daemon', label: 'Phase 2 Daemon (daemon.js)', icon: Terminal },
    { id: 'contract', label: 'Solidity Contract & Scripts', icon: Layers }
  ] as const;

  const handleTabSelect = (tab: ActiveTabType) => {
    onSelectTab(tab);
    setIsMenuOpen(false);
  };

  return (
    <header className="border-b border-slate-800 bg-[#0c1017]/95 backdrop-blur sticky top-0 z-50">
      {/* Top micro-bar for market conditions & MEV relay status */}
      <div className="px-4 py-1.5 border-b border-slate-800/80 bg-slate-950/70 text-[10px] flex items-center justify-between text-slate-400 gap-2 font-mono uppercase tracking-widest">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-emerald-400">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
            </span>
            <span>Relay Active</span>
          </div>
          <div className="flex items-center gap-1 text-slate-300">
            <Radio className="w-3 h-3 text-cyan-400" />
            <span>Feed: {isStreaming ? "ONLINE" : "PAUSED"}</span>
          </div>
          <div className="hidden sm:flex items-center gap-1 text-slate-300">
            <Layers className="w-3 h-3 text-indigo-400" />
            <span>Block: #{currentBlock.toLocaleString()}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-amber-400">
            <Flame className="w-3 h-3" />
            <span>Gas: {currentNetwork.baseFeeGwei.toFixed(1)} Gwei</span>
          </div>
        </div>
      </div>

      {/* Main Header Bar */}
      <div className="px-4 lg:px-6 py-3 flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-500 to-indigo-600 p-[1px]">
            <div className="w-full h-full bg-[#090b10] rounded-[7px] flex items-center justify-center">
              <Cpu className="w-5 h-5 text-cyan-400" />
            </div>
          </div>
          <h1 className="text-sm font-bold text-white tracking-tight hidden sm:block">
            Flash Loan Arbitrage <span className="text-cyan-500 font-mono">V1.1.0</span>
          </h1>
        </div>

        {/* Desktop Mode Switcher & Controls */}
        <div className="hidden lg:flex items-center gap-4">
          <div className="flex items-center p-0.5 rounded-lg bg-slate-950 border border-slate-800 shadow-inner">
            <button
              onClick={() => onToggleUiMode('simple')}
              className={`px-3 py-1.5 rounded text-[11px] font-bold tracking-wider uppercase transition-all ${
                uiMode === 'simple' ? 'bg-cyan-600 text-white shadow-md' : 'text-slate-500 hover:text-white'
              }`}
            >
              Simple
            </button>
            <button
              onClick={() => onToggleUiMode('advanced')}
              className={`px-3 py-1.5 rounded text-[11px] font-bold tracking-wider uppercase transition-all ${
                uiMode === 'advanced' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-500 hover:text-white'
              }`}
            >
              Advanced
            </button>
          </div>
        </div>

        {/* Mobile Menu Toggle */}
        <button className="lg:hidden p-2 text-slate-300" onClick={() => setIsMenuOpen(!isMenuOpen)}>
          {isMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Mobile Slide-in Menu */}
      {isMenuOpen && (
        <div className="lg:hidden absolute top-full left-0 w-full bg-[#0c1017] border-b border-slate-800 p-4 space-y-4">
           {navTabs.map(tab => (
             <button
               key={tab.id}
               onClick={() => handleTabSelect(tab.id)}
               className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium ${
                 activeTab === tab.id ? 'bg-cyan-950 text-cyan-400' : 'text-slate-300 hover:bg-slate-800'
               }`}
             >
               <tab.icon className="w-5 h-5" />
               {tab.label}
             </button>
           ))}
        </div>
      )}

      {/* Advanced Navigation Slider */}
      {uiMode === 'advanced' && (
        <div className="hidden lg:flex px-6 border-t border-slate-800/60 overflow-x-auto scrollbar-thin scrollbar-thumb-slate-700">
           {navTabs.map(tab => (
             <button
               key={tab.id}
               onClick={() => onSelectTab(tab.id)}
               className={`flex items-center gap-2 px-4 py-3 text-[11px] font-bold uppercase tracking-wider border-b-2 transition-all whitespace-nowrap ${
                 activeTab === tab.id
                   ? 'border-cyan-500 text-cyan-400'
                   : 'border-transparent text-slate-500 hover:text-slate-300 hover:border-slate-700'
               }`}
             >
               <tab.icon className="w-3.5 h-3.5" />
               {tab.label}
             </button>
           ))}
        </div>
      )}
    </header>
  );
};
