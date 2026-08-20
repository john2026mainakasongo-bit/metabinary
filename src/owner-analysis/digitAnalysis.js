export function normalizeDigits(values = []) {
  return (Array.isArray(values) ? values : []).map(Number).filter((v) => Number.isInteger(v) && v >= 0 && v <= 9);
}
export function digitDistribution(values = []) {
  const digits = normalizeDigits(values), counts = Array(10).fill(0);
  digits.forEach((d)=>counts[d]++);
  const total=Math.max(1,digits.length);
  return counts.map((count,digit)=>({digit,count,percent:(count/total)*100}));
}
export function parityStats(values = []) {
  const digits=normalizeDigits(values), total=Math.max(1,digits.length);
  const evenCount=digits.filter((d)=>d%2===0).length, oddCount=digits.length-evenCount;
  return {evenCount,oddCount,evenPercent:(evenCount/total)*100,oddPercent:(oddCount/total)*100};
}
export function thresholdStats(values = [], barrier = 2) {
  const digits=normalizeDigits(values), total=Math.max(1,digits.length);
  const under=digits.filter((d)=>d<barrier).length, equal=digits.filter((d)=>d===barrier).length, over=digits.filter((d)=>d>barrier).length;
  return {barrier,under,equal,over,underPercent:(under/total)*100,equalPercent:(equal/total)*100,overPercent:(over/total)*100};
}
export function lastDigitStreak(values = []) {
  const digits=normalizeDigits(values); if(!digits.length) return {digit:null,length:0};
  const last=digits.at(-1); let length=0; for(let i=digits.length-1;i>=0;i--){if(digits[i]!==last)break;length++;}
  return {digit:last,length};
}
export function digitEntropy(values = []) {
  const dist=digitDistribution(values); let entropy=0;
  dist.forEach(({percent})=>{const p=percent/100;if(p>0)entropy-=p*Math.log2(p);});
  return {value:entropy,normalized:entropy/Math.log2(10)};
}
export function recentVsBaseline(values = [], recentSize = 20) {
  const digits=normalizeDigits(values), recent=digits.slice(-Math.max(5,recentSize)), baseline=digits.slice(0,Math.max(0,digits.length-recent.length));
  const r=digitDistribution(recent), b=digitDistribution(baseline.length?baseline:digits);
  return r.map((x)=>({digit:x.digit,recentPercent:x.percent,baselinePercent:b[x.digit]?.percent||0,delta:x.percent-(b[x.digit]?.percent||0)}));
}
