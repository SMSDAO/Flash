import React, { useState, useEffect } from 'react';
import { NetworkConfig, NetworkId, RelayLatencyInfo } from '../types/arbitrage';
import { NETWORKS } from '../config/networks';
import { mempoolStream } from '../services/mempoolStreamService';
import { 
  X, 
  Globe, 
  Search, 
  Check, 
  Save, 
  RefreshCw, 
  ExternalLink,
  ShieldCheck,
  Server,
  Activity,
  Zap,
  Wifi
} from 'lucide-react';

interface NetworkManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentNetwork: NetworkConfig;
  onSelectNetwork: (networkId: NetworkId) => void;
  onUpdateNetworkConfig: (networkId: NetworkId, updates: Partial<NetworkConfig>) => void;
  embedded?: boolean;
}

export const NetworkManagerModal: React.FC<NetworkManagerModalProps> = ({
  isOpen,
  onClose,
  currentNetwork,
  onSelectNetwork,
  onUpdateNetworkConfig,
  embedded = false
}) => {
  const [activeNetworkId, setActiveNetworkId] = useState<NetworkId>(currentNetwork.id);
  const [rpcUrlInput, setRpcUrlInput] = useState<string>(currentNetwork.rpcUrl);
  const [aavePoolInput, setAavePoolInput] = useState<string>(currentNetwork.aavePoolAddress);
  const [contractAddressInput, setContractAddressInput] = useState<string>(currentNetwork.defaultContractAddress);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [chainlistSearch, setChainlistSearch] = useState<string>('');
  const [relayLatencies, setRelayLatencies] = useState<Record<NetworkId, RelayLatencyInfo[]>>(() => mempoolStream.getRelayLatencies());
  const [isPinging, setIsPinging] = useState<boolean>(false);

  useEffect(() => {
    const unsub = mempoolStream.subscribeRelayLatencies((latencies) => {
      setRelayLatencies(latencies);
    });
    return unsub;
  }, []);

  const handlePingRelays = async () => {
    setIsPinging(true);
    try {
      const updated = await mempoolStream.pingAllRelays();
      setRelayLatencies(updated);
    } finally {
      setIsPinging(false);
    }
  };

  if (!isOpen) return null;

  const activeConf = NETWORKS[activeNetworkId];

  const handleSwitchNetwork = (netId: NetworkId) => {
    setActiveNetworkId(netId);
    const conf = NETWORKS[netId];
    setRpcUrlInput(conf.rpcUrl);
    setAavePoolInput(conf.aavePoolAddress);
    setContractAddressInput(conf.defaultContractAddress);
  };

  const handleSave = () => {
    onUpdateNetworkConfig(activeNetworkId, {
      rpcUrl: rpcUrlInput,
      aavePoolAddress: aavePoolInput,
      defaultContractAddress: contractAddressInput
    });
    onSelectNetwork(activeNetworkId);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1000);
  };

  const filteredNetworks = Object.values(NETWORKS).filter(n => 
    n.name.toLowerCase().includes(chainlistSearch.toLowerCase()) ||
    n.chainId.toString().includes(chainlistSearch)
  );

  if (embedded) {
    return (
      <div className="space-y-5 font-mono text-xs">
        {/* Chainlist Network Selector */}
        <div>
          <label className="block text-slate-400 text-xs mb-1.5 flex items-center justify-between">
            <span>Select EVM Blockchain (Chainlist)</span>
            <span className="text-cyan-400 text-[10px]">Verified Aave V3</span>
          </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {filteredNetworks.map(net => {
                const relays = relayLatencies[net.id] || [];
                const primary = relays[0];
                return (
                  <button
                    key={net.id}
                    onClick={() => handleSwitchNetwork(net.id)}
                    className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                      activeNetworkId === net.id
                        ? 'bg-cyan-950/60 border-cyan-500 text-cyan-300 font-bold'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div>
                        <div>{net.name}</div>
                        <div className="text-[10px] text-slate-500 font-normal">
                          Chain ID: {net.chainId} &middot; {net.currency}
                        </div>
                      </div>
                      {activeNetworkId === net.id && <Check className="w-4 h-4 text-cyan-400 shrink-0" />}
                    </div>

                    {primary && (
                      <div className="flex items-center justify-between w-full mt-2 pt-1.5 border-t border-slate-900 text-[10px] font-normal">
                        <span className="text-slate-400 flex items-center gap-1">
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            primary.status === 'optimal' ? 'bg-emerald-400 animate-pulse' :
                            primary.status === 'good' ? 'bg-cyan-400' :
                            primary.status === 'degraded' ? 'bg-amber-400' : 'bg-rose-500'
                          }`} />
                          <span className="truncate max-w-[110px]">{primary.relayName}</span>
                        </span>
                        <span className={`font-mono font-bold ${
                          primary.latencyMs < 35 ? 'text-emerald-400' :
                          primary.latencyMs < 75 ? 'text-cyan-400' : 'text-amber-400'
                        }`}>
                          {primary.latencyMs}ms
                        </span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Config overrides */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="text-slate-300 font-bold flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5 text-indigo-400" />
                <span>Network Parameters for {activeConf.name}</span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                <Wifi className="w-3 h-3 text-emerald-400" />
                <span>Active Link</span>
              </div>
            </div>

            {/* MEV Relays Latency Telemetry */}
            <div className="bg-slate-900/60 border border-slate-800/90 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-slate-300 font-bold text-[11px]">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>MEV Private Relays & Sequencer Latency</span>
                </div>
                <button
                  onClick={handlePingRelays}
                  disabled={isPinging}
                  className="px-2 py-0.5 rounded bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white flex items-center gap-1 text-[10px] cursor-pointer transition-colors"
                  title="Ping MEV endpoints to measure latency"
                >
                  <RefreshCw className={`w-3 h-3 ${isPinging ? 'animate-spin text-cyan-400' : ''}`} />
                  <span>{isPinging ? 'Pinging Relays...' : 'Ping All Relays'}</span>
                </button>
              </div>

              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {(relayLatencies[activeNetworkId] || []).map((relay, idx) => (
                  <div 
                    key={idx}
                    className="bg-slate-950 border border-slate-800/80 rounded-lg px-2.5 py-1.5 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-white font-medium text-[11px] truncate">{relay.relayName}</span>
                        <span className={`px-1 py-0.2 rounded text-[9px] uppercase font-bold ${
                          relay.status === 'optimal' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
                          relay.status === 'good' ? 'bg-cyan-950 text-cyan-400 border border-cyan-800' :
                          relay.status === 'degraded' ? 'bg-amber-950 text-amber-400 border border-amber-800' :
                          'bg-rose-950 text-rose-400 border border-rose-800'
                        }`}>
                          {relay.status}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500 truncate font-mono">
                        {relay.endpoint}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="flex items-center gap-1 justify-end font-mono">
                        <Activity className={`w-3 h-3 ${relay.latencyMs < 35 ? 'text-emerald-400' : 'text-cyan-400'}`} />
                        <span className={`text-xs font-bold ${
                          relay.latencyMs < 35 ? 'text-emerald-400' :
                          relay.latencyMs < 75 ? 'text-cyan-400' :
                          relay.latencyMs < 200 ? 'text-amber-400' : 'text-rose-400'
                        }`}>
                          {relay.latencyMs} ms
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Custom RPC */}
            <div>
              <label className="block text-slate-400 text-[11px] mb-1">
                JSON-RPC Endpoint URL (HTTP / WSS)
              </label>
              <input
                type="text"
                value={rpcUrlInput}
                onChange={(e) => setRpcUrlInput(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Aave V3 Pool */}
            <div>
              <label className="block text-slate-400 text-[11px] mb-1">
                Aave V3 Core Pool Contract Address
              </label>
              <input
                type="text"
                value={aavePoolInput}
                onChange={(e) => setAavePoolInput(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Contract Address */}
            <div>
              <label className="block text-slate-400 text-[11px] mb-1">
                EnterpriseFlashLoanArbitrage Contract Instance
              </label>
              <input
                type="text"
                value={contractAddressInput}
                onChange={(e) => setContractAddressInput(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between">
          <div className="text-[11px] text-slate-500">
            Stored in persistent storage
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg bg-slate-900 text-slate-400 hover:text-white cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold flex items-center gap-1.5 cursor-pointer shadow-md shadow-cyan-950"
            >
              {savedSuccess ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
              <span>{savedSuccess ? 'Saved & Activated' : 'Save & Switch Network'}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm font-mono text-xs">
      <div className="bg-[#0c1017] border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold text-white">Network & RPC Endpoint Management</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
          <div className="text-[11px] text-slate-500">Stored in browser storage</div>
          <button onClick={onClose} className="px-3 py-1.5 rounded-lg bg-slate-900 text-slate-400 hover:text-white">Close</button>
        </div>
      </div>
    </div>
  );
};
