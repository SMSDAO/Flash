import React from 'react';
import { Activity, Cpu, TrendingUp, Radio, Terminal } from 'lucide-react';
import { ActiveTabType } from './Header';

interface MobileBottomNavProps {
  activeTab: ActiveTabType;
  onSelectTab: (tab: ActiveTabType) => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ activeTab, onSelectTab }) => {
  const tabs = [
    { id: 'mempool', icon: Activity, label: 'Scanner' },
    { id: 'builder', icon: Cpu, label: 'Builder' },
    { id: 'performance', icon: TrendingUp, label: 'Stats' },
    { id: 'console', icon: Radio, label: 'Relay' },
    { id: 'daemon', icon: Terminal, label: 'Daemon' },
  ] as const;

  return (
    <div className="lg:hidden fixed bottom-0 left-0 w-full bg-[#0c1017] border-t border-slate-800 flex justify-around p-2 z-[60]">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onSelectTab(tab.id as ActiveTabType)}
          className={`flex flex-col items-center gap-1 p-2 rounded-lg ${
            activeTab === tab.id ? 'text-cyan-400' : 'text-slate-500'
          }`}
        >
          <tab.icon className="w-5 h-5" />
          <span className="text-[10px] font-medium">{tab.label}</span>
        </button>
      ))}
    </div>
  );
};
