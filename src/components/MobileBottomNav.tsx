import React from 'react';
import { 
  Activity, 
  Cpu, 
  TrendingUp, 
  Radio, 
  Terminal 
} from 'lucide-react';
import { ActiveTabType, UiModeType } from './Header';

interface MobileBottomNavProps {
  activeTab: ActiveTabType;
  onSelectTab: (tab: ActiveTabType) => void;
  uiMode?: UiModeType;
  onToggleUiMode?: (mode: UiModeType) => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ 
  activeTab, 
  onSelectTab,
  uiMode = 'advanced',
  onToggleUiMode
}) => {
  const tabs = [
    { 
      id: 'mempool', 
      icon: Activity, 
      label: 'Scanner',
      badge: 'LIVE'
    },
    { 
      id: 'builder', 
      icon: Cpu, 
      label: 'Route Builder',
      badge: null
    },
    { 
      id: 'performance', 
      icon: TrendingUp, 
      label: 'Analytics',
      badge: null
    },
    { 
      id: 'console', 
      icon: Radio, 
      label: 'Relays',
      badge: 'MEV'
    },
    { 
      id: 'daemon', 
      icon: Terminal, 
      label: 'Daemon',
      badge: null
    },
  ] as const;

  const handleTabClick = (tabId: ActiveTabType) => {
    // If user is currently in simple mode and clicks a deep pro tool, switch seamlessly to advanced
    if (uiMode === 'simple' && onToggleUiMode && tabId !== 'mempool') {
      onToggleUiMode('advanced');
    }
    onSelectTab(tabId);
  };

  return (
    <nav 
      aria-label="Mobile Navigation"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-slate-950/90 backdrop-blur-2xl border-t border-slate-800/80 px-2 pt-1.5 pb-safe shadow-[0_-8px_30px_rgba(0,0,0,0.6)]"
    >
      <div className="grid grid-cols-5 gap-1 max-w-md mx-auto">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id as ActiveTabType)}
              className={`relative flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all duration-200 ${
                isActive 
                  ? 'text-cyan-400 font-semibold' 
                  : 'text-slate-400 hover:text-slate-200 active:scale-95'
              }`}
            >
              {/* Active illuminated glow indicator */}
              {isActive && (
                <span className="absolute -top-1.5 w-8 h-1 bg-gradient-to-r from-cyan-500 to-emerald-400 rounded-full shadow-[0_0_12px_rgba(6,182,212,0.8)]" />
              )}

              <div className="relative">
                <Icon className={`w-5 h-5 transition-transform duration-200 ${isActive ? 'scale-110 text-cyan-400' : 'text-slate-400'}`} />
                {tab.badge && (
                  <span className={`absolute -top-1 -right-3 text-[8px] font-mono px-1 py-0.2 rounded-full font-bold ${
                    tab.badge === 'LIVE' 
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 animate-pulse' 
                      : 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </div>

              <span className={`text-[10px] tracking-tight mt-1 truncate max-w-full ${
                isActive ? 'text-cyan-300' : 'text-slate-400'
              }`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
