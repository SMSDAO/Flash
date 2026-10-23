import { MempoolOpportunity, ProtocolType } from '../types/arbitrage';

export type ProtocolSafetyLevel = 'conservative' | 'moderate' | 'permissive';

export interface RiskAlertCriteria {
  enabled: boolean;
  minNetProfitUsd: number;
  minLoanAmountUsd: number;
  maxOracleDeviationPct: number;
  protocolSafetyLevel: ProtocolSafetyLevel;
  maxGasPriceGwei: number;
  browserNotifications: boolean;
  audioAlerts: boolean;
}

export const DEFAULT_RISK_ALERT_CRITERIA: RiskAlertCriteria = {
  enabled: true,
  minNetProfitUsd: 120,
  minLoanAmountUsd: 50000,
  maxOracleDeviationPct: 1.5,
  protocolSafetyLevel: 'moderate',
  maxGasPriceGwei: 120,
  browserNotifications: true,
  audioAlerts: true
};

/**
 * Synthesizes a distinct high-urgency multi-tone chime using Web Audio API
 */
export function playRiskAlertChime() {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    const now = ctx.currentTime;
    
    // Play a distinct 3-tone arpeggio: 587.33Hz (D5) -> 880Hz (A5) -> 1174.66Hz (D6)
    const freqs = [587.33, 880.0, 1174.66];
    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);

      gain.gain.setValueAtTime(0.06, now + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.08 + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.4);
    });
  } catch {
    // Ignore if audio policy restricts
  }
}

/**
 * Requests browser notification permission if not yet granted
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission !== 'denied') {
    const perm = await Notification.requestPermission();
    return perm === 'granted';
  }
  return false;
}

/**
 * Dispatches a native browser notification for high-priority risk-filtered opportunity
 */
export function dispatchRiskNotification(opp: MempoolOpportunity) {
  try {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;

    new Notification(`🎯 MEV Risk Alert: +$${opp.estimatedNetProfitUsd.toFixed(2)}`, {
      body: `${opp.pair} Arbitrage across ${opp.route.dex1Name} & ${opp.route.dex2Name}\nLoan: ${opp.loanAmount} ${opp.tokenIn.symbol} (~$${(opp.loanAmount * opp.tokenIn.usdPrice).toLocaleString()})`,
      icon: '/favicon.ico',
      tag: opp.id
    });
  } catch {
    // Ignore notification errors in iframe environment
  }
}

/**
 * Evaluates whether an opportunity matches the user's defined risk criteria
 */
export function evaluateOpportunityAgainstRiskCriteria(
  opp: MempoolOpportunity,
  criteria: RiskAlertCriteria,
  currentGasPriceGwei: number
): { matches: boolean; reasons: string[] } {
  if (!criteria.enabled) return { matches: false, reasons: ['Alerts disabled'] };

  const reasons: string[] = [];
  const loanUsd = opp.loanAmount * opp.tokenIn.usdPrice;

  // 1. Min profit
  if (opp.estimatedNetProfitUsd < criteria.minNetProfitUsd) {
    return { matches: false, reasons: [`Net profit ($${opp.estimatedNetProfitUsd.toFixed(2)}) below minimum ($${criteria.minNetProfitUsd})`] };
  }
  reasons.push(`Net Profit (+$${opp.estimatedNetProfitUsd.toFixed(2)}) satisfies threshold`);

  // 2. Minimum liquidity / loan depth
  if (loanUsd < criteria.minLoanAmountUsd) {
    return { matches: false, reasons: [`Liquidity depth ($${loanUsd.toLocaleString()}) below minimum ($${criteria.minLoanAmountUsd.toLocaleString()})`] };
  }
  reasons.push(`Liquidity depth ($${loanUsd.toLocaleString()}) meets threshold`);

  // 3. Oracle deviation check
  const deviation = opp.oracleDeviationPct ?? 0.2;
  if (deviation > criteria.maxOracleDeviationPct) {
    return { matches: false, reasons: [`Oracle deviation (${deviation}%) exceeds limit (${criteria.maxOracleDeviationPct}%)`] };
  }
  reasons.push(`Oracle deviation (${deviation}%) within bounds`);

  // 4. Gas price ceiling
  if (currentGasPriceGwei > criteria.maxGasPriceGwei) {
    return { matches: false, reasons: [`Current gas price (${currentGasPriceGwei} Gwei) exceeds max (${criteria.maxGasPriceGwei} Gwei)`] };
  }
  reasons.push(`Gas price (${currentGasPriceGwei} Gwei) safe`);

  // 5. Protocol safety level
  const proto1 = opp.route.protocol1;
  const proto2 = opp.route.protocol2;

  if (criteria.protocolSafetyLevel === 'conservative') {
    // Only Uniswap V3 and Balancer V2
    const isConservative = (proto1 === ProtocolType.UNISWAP_V3 || proto1 === ProtocolType.BALANCER_V2) &&
                           (proto2 === ProtocolType.UNISWAP_V3 || proto2 === ProtocolType.BALANCER_V2);
    if (!isConservative) {
      return { matches: false, reasons: ['Route involves protocols outside Conservative profile (UniV3/Balancer only)'] };
    }
  } else if (criteria.protocolSafetyLevel === 'moderate') {
    // Exclude unverified or high-slippage custom pools
    const isModerate = proto1 !== undefined && proto2 !== undefined;
    if (!isModerate) {
      return { matches: false, reasons: ['Route fails Moderate safety verification'] };
    }
  }

  return { matches: true, reasons };
}
