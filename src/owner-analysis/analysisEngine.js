import {digitDistribution,parityStats,thresholdStats,lastDigitStreak,digitEntropy,recentVsBaseline} from "./digitAnalysis";
import {priceMomentum,volatilityScore,confidenceScore,confidenceLabel} from "./marketScore";
export function analyzeMarket(snapshot={}){
  const digitHistory=Array.isArray(snapshot.digitHistory)?snapshot.digitHistory:[], prices=Array.isArray(snapshot.prices)?snapshot.prices:[];
  const distribution=digitDistribution(digitHistory), parity=parityStats(digitHistory), threshold2=thresholdStats(digitHistory,2), streak=lastDigitStreak(digitHistory), entropy=digitEntropy(digitHistory), recency=recentVsBaseline(digitHistory,20), momentum=priceMomentum(prices,35), volatility=volatilityScore(prices.slice(-180));
  const parityEdge=parity.evenPercent-parity.oddPercent, thresholdEdge=threshold2.overPercent-threshold2.underPercent;
  const confidence=confidenceScore({parityEdge,thresholdEdge,entropyNormalized:entropy.normalized,volatility:volatility.score,momentumPercent:momentum.percent});
  const bestDigit=[...distribution].sort((a,b)=>b.percent-a.percent||a.digit-b.digit)[0], coldDigit=[...distribution].sort((a,b)=>a.percent-b.percent||a.digit-b.digit)[0];
  const parityBias=parityEdge>=6?"EVEN":parityEdge<=-6?"ODD":"BALANCED";
  const thresholdBias=thresholdEdge>=10?"OVER 2":thresholdEdge<=-10?"UNDER 2":"BALANCED";
  const label=confidenceLabel(confidence), setup=label!=="LOW"&&(parityBias!=="BALANCED"||thresholdBias!=="BALANCED")?"POSSIBLE SETUP":"WAIT";
  return {sampleSize:digitHistory.length,currentPrice:Number(snapshot.currentPrice||0),lastDigit:Number.isInteger(Number(snapshot.lastDigit))?Number(snapshot.lastDigit):digitHistory.at(-1)??null,distribution,parity,threshold2,streak,entropy,recency,momentum,volatility,bestDigit,coldDigit,parityBias,thresholdBias,confidence,confidenceLabel:label,setup};
}
