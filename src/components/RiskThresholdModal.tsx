import React, { useState } from 'react';
import { 
  RiskAlertCriteria, 
  DEFAULT_RISK_ALERT_CRITERIA,
  playRiskAlertChime, 
  requestNotificationPermission,
  dispatchRiskNotification,
  evaluateOpportunityAgainstRiskCriteria,
  ProtocolSafetyLevel
} from '../utils/riskAlertService';
import { MempoolOpportunity, NetworkConfig } from '../types/arbitrage';
import { 
  ShieldCheck, 
  X, 
  Volume2, 
  Bell, 
  Flame, 
  TrendingUp, 
  Coins, 
  RotateCcw, 
  Check, 
  Sliders, 
  Layers
} from 'lucide-react';

interface RiskThresholdModalProps {
  isOpen: boolean;
  onClose: () => void;
  criteria: RiskAlertCriteria;
  onUpdateCriteria: (newCriteria: RiskAlertCriteria) => void;
  currentGasPriceGwei: number;
  opportunities: MempoolOpportunity[];
  currentNetwork: NetworkConfig;
}

export const RiskThresholdModal: React.FC<RiskThresholdModalProps> = ({
  isOpen,
  onClose,
  criteria,
  onUpdateCriteria,
  currentGasPriceGwei,
  opportunities,
  currentNetwork
}) => {
  const [localCriteria, setLocalCriteria] = useState<RiskAlertCriteria>(criteria);
  const [notificationStatus, setNotificationStatus] = useState<string>(
    typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'
  );
  const [testNotificationSent, setTestNotificationSent] = useState(false);
  const [testAudioPlayed, setTestAudioPlayed] = useState(false);

  // Sync state if opened with external update
  React.useEffect(() => {
    setLocalCriteria(criteria);
  }, [criteria, isOpen]);

  if (!isOpen) return null;

  const handleRequestPermission = async () => {
    const granted = await requestNotificationPermission();
    setNotificationStatus(granted ? 'granted' : 'denied');
    if (granted && opportunities.length > 0) {
      dispatchRiskNotification(opportunities[0]);
      setTestNotificationSent(true);
      setTimeout(() => setTestNotificationSent(false), 3000);
    }
  };

  const handleTestAudio = () => {
    playRiskAlertChime();
    setTestAudioPlayed(true);
    setTimeout(() => setTestAudioPlayed(false), 1500);
  };

  const handleSave = () => {
    onUpdateCriteria(localCriteria);
    localStorage.setItem('mev_risk_alert_criteria', JSON.stringify(localCriteria));
    onClose();
  };

  const handleReset = () => {
    setLocalCriteria(DEFAULT_RISK_ALERT_CRITERIA);
  };

  // Evaluate matching opportunities against draft criteria
  const matchingOpps = opportunities.filter((opp) => 
    evaluateOpportunityAgainstRiskCriteria(opp, localCriteria, currentGasPriceGwei).matches
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm font-mono overflow-y-auto">
      <div className="bg-[#090b10] border border-cyan-800/80 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-950 via-[#0d131f] to-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-950 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-wide">
                  MEV Risk Threshold & Alert Engine
                </h3>
                <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase font-bold border ${
                  localCriteria.enabled 
                    ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60' 
                    : 'bg-rose-950/80 text-rose-300 border-rose-700/60'
                }`}>
                  {localCriteria.enabled ? 'Active Monitoring' : 'Disabled'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Multi-factor risk filters for real-time opportunity discovery & automated notifications
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1 text-xs">
          {/* Master Enable/Disable Switch */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-slate-900/60 border border-slate-800">
            <div>
              <span className="text-sm font-semibold text-white block">Real-Time Risk Alert Daemon</span>
              <span className="text-slate-400 text-[11px]">
                Filter incoming mempool stream and trigger immediate synthesized chimes and notifications.
              </span>
            </div>
            <button
              onClick={() => setLocalCriteria(c => ({ ...c, enabled: !c.enabled }))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                localCriteria.enabled ? 'bg-cyan-500' : 'bg-slate-700'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  localCriteria.enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Grid of Risk Parameters */}
          <div className="space-y-5">
            {/* 1. Min Net Profit Threshold */}
            <div className="space-y-2 bg-[#0c1017] p-4 rounded-xl border border-slate-800">
              <div className="flex items-center justify-between">
                <label className="text-slate-300 font-semibold flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                  Minimum Net Realized Profit (USD)
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-emerald-400 font-bold text-sm">
                    +${localCriteria.minNetProfitUsd.toFixed(0)}
                  </span>
                  <span className="text-[10px] text-slate-500">(After MEV bribe & gas)</span>
                </div>
              </div>
              <input
                type="range"
                min="10"
                max="1000"
                step="10"
                value={localCriteria.minNetProfitUsd}
                onChange={(e) => setLocalCriteria(c => ({ ...c, minNetProfitUsd: parseFloat(e.target.value) }))}
                className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none"
              />
              <div className="flex items-center gap-2 pt-1">
                <span className="text-[10px] text-slate-500">Quick Select:</span>
                {[50, 100, 200, 500].map(val => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setLocalCriteria(c => ({ ...c, minNetProfitUsd: val }))}
                    className={`px-2 py-0.5 rounded text-[10px] border transition-colors ${
                      localCriteria.minNetProfitUsd === val
                        ? 'bg-emerald-950 text-emerald-300 border-emerald-600'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    +${val}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Minimum Liquidity Depth / Flash Loan Size */}
            <div className="space-y-2 bg-[#0c1017] p-4 rounded-xl border border-slate-800">
              <div className="flex items-center justify-between">
                <label className="text-slate-300 font-semibold flex items-center gap-1.5">
                  <Coins className="w-3.5 h-3.5 text-cyan-400" />
                  Minimum Liquidity Depth / Loan Principal (USD)
                </label>
                <span className="text-cyan-400 font-bold text-sm">
                  ${(localCriteria.minLoanAmountUsd).toLocaleString()}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Ignores low-liquidity micro-pools vulnerable to sandwich attacks or extreme slippage.
              </p>
              <input
                type="range"
                min="10000"
                max="500000"
                step="10000"
                value={localCriteria.minLoanAmountUsd}
                onChange={(e) => setLocalCriteria(c => ({ ...c, minLoanAmountUsd: parseFloat(e.target.value) }))}
                className="w-full accent-cyan-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none"
              />
              <div className="flex items-center gap-2 pt-1">
                <span className="text-[10px] text-slate-500">Presets:</span>
                {[25000, 50000, 100000, 250000].map(val => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setLocalCriteria(c => ({ ...c, minLoanAmountUsd: val }))}
                    className={`px-2 py-0.5 rounded text-[10px] border transition-colors ${
                      localCriteria.minLoanAmountUsd === val
                        ? 'bg-cyan-950 text-cyan-300 border-cyan-600'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    ${val / 1000}k
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Protocol Safety Level */}
            <div className="space-y-2 bg-[#0c1017] p-4 rounded-xl border border-slate-800">
              <label className="text-slate-300 font-semibold flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-indigo-400" />
                Protocol Safety Level
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                {(['conservative', 'moderate', 'permissive'] as ProtocolSafetyLevel[]).map((level) => {
                  const isSelected = localCriteria.protocolSafetyLevel === level;
                  return (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setLocalCriteria(c => ({ ...c, protocolSafetyLevel: level }))}
                      className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-950/40 border-indigo-500 text-white ring-1 ring-indigo-500/50'
                          : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold capitalize text-xs">
                          {level === 'moderate' ? 'Moderate (Rec.)' : level}
                        </span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1 leading-snug">
                        {level === 'conservative' && 'UniV3 & Balancer only. Deepest pools with low price impact.'}
                        {level === 'moderate' && 'UniV2/V3, Balancer, Sushiswap, Curve. Verified routers.'}
                        {level === 'permissive' && 'All DEXs & AMM pools. Highest arbitrage discovery frequency.'}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 4. Oracle Deviation Tolerance & Gas Price Ceiling */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Max Oracle Deviation */}
              <div className="bg-[#0c1017] p-4 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-slate-300 font-semibold flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                    Max Oracle Deviation
                  </label>
                  <span className="text-amber-400 font-bold">
                    {localCriteria.maxOracleDeviationPct}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.2"
                  max="4.0"
                  step="0.1"
                  value={localCriteria.maxOracleDeviationPct}
                  onChange={(e) => setLocalCriteria(c => ({ ...c, maxOracleDeviationPct: parseFloat(e.target.value) }))}
                  className="w-full accent-amber-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none"
                />
                <p className="text-[10px] text-slate-500">
                  Flags routes where pool price diverges drastically from Chainlink feed.
                </p>
              </div>

              {/* Max Gas Price Ceiling */}
              <div className="bg-[#0c1017] p-4 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-slate-300 font-semibold flex items-center gap-1">
                    <Flame className="w-3.5 h-3.5 text-rose-400" />
                    Gas Price Ceiling
                  </label>
                  <span className="text-rose-400 font-bold">
                    {localCriteria.maxGasPriceGwei} Gwei
                  </span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="350"
                  step="10"
                  value={localCriteria.maxGasPriceGwei}
                  onChange={(e) => setLocalCriteria(c => ({ ...c, maxGasPriceGwei: parseFloat(e.target.value) }))}
                  className="w-full accent-rose-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none"
                />
                <p className="text-[10px] text-slate-500">
                  Current Network: <span className="text-white font-semibold">{currentGasPriceGwei} Gwei</span>
                </p>
              </div>
            </div>

            {/* 5. Notification & Sound Channels */}
            <div className="bg-[#0c1017] p-4 rounded-xl border border-slate-800 space-y-3">
              <span className="text-slate-200 font-semibold block text-xs">Alert Channels</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Audio Chime */}
                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Volume2 className="w-4 h-4 text-cyan-400" />
                    <div>
                      <span className="font-semibold text-white block">Synthesized Audio Chime</span>
                      <span className="text-[10px] text-slate-400">Web Audio API 3-tone chime</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleTestAudio}
                      className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-cyan-300 border border-slate-700 transition-colors"
                    >
                      {testAudioPlayed ? 'Playing...' : 'Test'}
                    </button>
                    <input
                      type="checkbox"
                      checked={localCriteria.audioAlerts}
                      onChange={(e) => setLocalCriteria(c => ({ ...c, audioAlerts: e.target.checked }))}
                      className="w-4 h-4 accent-cyan-500 rounded cursor-pointer"
                    />
                  </div>
                </div>

                {/* Browser Push Notification */}
                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-amber-400" />
                    <div>
                      <span className="font-semibold text-white block">Browser Notification</span>
                      <span className="text-[10px] text-slate-400">
                        Status: <span className={notificationStatus === 'granted' ? 'text-emerald-400' : 'text-amber-400'}>{notificationStatus}</span>
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {notificationStatus !== 'granted' ? (
                      <button
                        type="button"
                        onClick={handleRequestPermission}
                        className="px-2 py-1 rounded bg-amber-950 hover:bg-amber-900 text-[10px] text-amber-300 border border-amber-800 transition-colors"
                      >
                        Grant
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          if (opportunities.length > 0) {
                            dispatchRiskNotification(opportunities[0]);
                            setTestNotificationSent(true);
                            setTimeout(() => setTestNotificationSent(false), 2500);
                          }
                        }}
                        className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-amber-300 border border-slate-700 transition-colors"
                      >
                        {testNotificationSent ? 'Sent!' : 'Test'}
                      </button>
                    )}
                    <input
                      type="checkbox"
                      checked={localCriteria.browserNotifications}
                      onChange={(e) => setLocalCriteria(c => ({ ...c, browserNotifications: e.target.checked }))}
                      className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Live Filter Telemetry Preview */}
            <div className="p-3 rounded-xl bg-cyan-950/20 border border-cyan-800/40 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                <span className="text-slate-300 font-semibold text-xs">
                  Stream Matching Telemetry:
                </span>
                <span className="text-cyan-300 font-bold">
                  {matchingOpps.length} of {opportunities.length}
                </span>
                <span className="text-slate-400 text-[11px]">
                  current {currentNetwork.name} opportunities satisfy this risk profile.
                </span>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                matchingOpps.length > 0 ? 'bg-emerald-950 text-emerald-300' : 'bg-slate-900 text-slate-400'
              }`}>
                {matchingOpps.length > 0 ? 'PASSING' : 'FILTERING STRICT'}
              </span>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <button
            type="button"
            onClick={handleReset}
            className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white text-xs flex items-center gap-1.5 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-slate-900 border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-cyan-500/20 transition-all cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Apply Risk Filter</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
