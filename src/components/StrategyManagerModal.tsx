import React, { useState } from 'react';
import { ArbitrageStrategy, NetworkConfig } from '../types/arbitrage';
import { 
  X, 
  Bookmark, 
  Trash2, 
  Play, 
  Download, 
  Upload, 
  Sparkles, 
  Check, 
  Copy,
  Layers,
  ArrowRight
} from 'lucide-react';

interface StrategyManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  strategies: ArbitrageStrategy[];
  onSelectStrategy: (strat: ArbitrageStrategy) => void;
  onDeleteStrategy: (id: string) => void;
  onImportStrategies: (strats: ArbitrageStrategy[]) => void;
  network: NetworkConfig;
  embedded?: boolean;
}

export const StrategyManagerModal: React.FC<StrategyManagerModalProps> = ({
  isOpen,
  onClose,
  strategies,
  onSelectStrategy,
  onDeleteStrategy,
  onImportStrategies,
  network,
  embedded = false
}) => {
  const [filterText, setFilterText] = useState('');

  if (!isOpen) return null;

  const handleExportJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(strategies, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", `arbitrage_strategies_${network.id}.json`);
    dlAnchorElem.click();
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (Array.isArray(parsed)) {
          onImportStrategies(parsed);
        }
      } catch (err) {
        alert("Invalid JSON strategy file format.");
      }
    };
    reader.readAsText(file);
  };

  const filtered = strategies.filter(s => 
    s.name.toLowerCase().includes(filterText.toLowerCase()) ||
    s.assetSymbol.toLowerCase().includes(filterText.toLowerCase())
  );

  const content = (
    <div className="space-y-4 font-mono text-xs">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
        <input
          type="text"
          placeholder="Search saved strategies..."
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
          className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 flex-1 max-w-xs"
        />

        <div className="flex items-center gap-2">
          <label className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 text-xs flex items-center gap-1 cursor-pointer">
            <Upload className="w-3.5 h-3.5 text-cyan-400" />
            <span>Import</span>
            <input type="file" accept=".json" onChange={handleImportJson} className="hidden" />
          </label>
          <button
            onClick={handleExportJson}
            className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 text-xs flex items-center gap-1 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Strategy List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            No strategies found. Save routes from Advanced Builder.
          </div>
        ) : (
          filtered.map(strat => (
            <div
              key={strat.id}
              className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-700 transition-colors"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white text-xs">{strat.name}</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                    {strat.steps.length} hops
                  </span>
                </div>
                <div className="text-slate-400 text-[11px] mt-1">
                  {strat.description}
                </div>
                <div className="text-[10px] text-slate-500 mt-1">
                  Default: <span className="text-white">{strat.defaultLoanAmount} {strat.assetSymbol}</span> &middot; Min Profit: <span className="text-emerald-400">{strat.minProfitThreshold}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center">
                <button
                  onClick={() => {
                    onSelectStrategy(strat);
                    onClose();
                  }}
                  className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <span>Load</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => onDeleteStrategy(strat.id)}
                  className="p-1.5 rounded text-slate-500 hover:text-rose-400 hover:bg-slate-800 cursor-pointer"
                  title="Delete strategy"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  if (embedded) {
    return content;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm font-mono text-xs">
      <div className="bg-[#0c1017] border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center gap-2">
            <Bookmark className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold text-white">Arbitrage Strategy Templates ({strategies.length})</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto flex-1">
          {content}
        </div>
      </div>
    </div>
  );
};
