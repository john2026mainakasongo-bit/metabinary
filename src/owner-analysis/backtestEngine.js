function pct(n){return Number.isFinite(n)?n*100:0;}
function wilsonLowerBound(wins,total,z=1.96){
  if(!total)return 0;
  const p=wins/total,z2=z*z,denom=1+z2/total;
  const center=p+z2/(2*total);
  const margin=z*Math.sqrt((p*(1-p)+z2/(4*total))/total);
  return Math.max(0,(center-margin)/denom);
}
function validateResult({name,action,wins,samples,baseline,minSamples=25,minEdge=.04,reason=""}){
  const hitRate=samples?wins/samples:0,edge=hitRate-baseline,lowerBound=wilsonLowerBound(wins,samples);
  const approved=samples>=minSamples&&edge>=minEdge&&lowerBound>baseline;
  return {name,action:approved?action:"WAIT",candidate:action,approved,wins,samples,hitRate:pct(hitRate),baseline:pct(baseline),edge:pct(edge),lowerBound:pct(lowerBound),
    reason:approved?`${action} validated: ${pct(hitRate).toFixed(1)}% over ${samples} historical setups`:(reason||`WAIT: ${samples} samples, ${pct(hitRate).toFixed(1)}% hit rate`)};
}
function parityCandidate(ds){if(!ds.length)return null;const even=ds.filter(d=>d%2===0).length/ds.length;return even>=.56?"EVEN":even<=.44?"ODD":null;}
function thresholdCandidate(ds,b=2){
  if(!ds.length)return null;
  const over=ds.filter(d=>d>b).length/ds.length,under=ds.filter(d=>d<b).length/ds.length;
  const overBase=(9-b)/10,underBase=b/10;
  return over>=overBase+.06?"OVER 2":under>=underBase+.06?"UNDER 2":null;
}
function matchDiffCandidate(ds){
  if(!ds.length)return null;
  const counts=Array(10).fill(0); for(const d of ds)counts[d]++;
  const rates=counts.map((count,digit)=>({digit,rate:count/ds.length}));
  const hot=[...rates].sort((a,b)=>b.rate-a.rate||a.digit-b.digit)[0];
  const cold=[...rates].sort((a,b)=>a.rate-b.rate||a.digit-b.digit)[0];
  if(hot.rate>=.15)return{type:"MATCH",digit:hot.digit};
  if(cold.rate<=.05)return{type:"DIFFERS",digit:cold.digit};
  return null;
}
function slopeDirection(prices){
  if(!prices||prices.length<8)return null;
  const first=Number(prices[0]),last=Number(prices[prices.length-1]);
  if(!Number.isFinite(first)||!Number.isFinite(last)||first===0)return null;
  const change=(last-first)/Math.abs(first);
  return change>=.00045?"RISE":change<=-.00045?"FALL":null;
}
function backtestParity(digits,w=60){
  const current=parityCandidate(digits.slice(-w));
  if(!current)return validateResult({name:"Even / Odd",action:"WAIT",wins:0,samples:0,baseline:.5,reason:"WAIT: current parity is too balanced"});
  let wins=0,samples=0;
  for(let i=w;i<digits.length;i++){const c=parityCandidate(digits.slice(i-w,i));if(c!==current)continue;samples++;const a=digits[i]%2===0?"EVEN":"ODD";if(a===current)wins++;}
  return validateResult({name:"Even / Odd",action:current,wins,samples,baseline:.5,minSamples:25,minEdge:.05,reason:`WAIT: ${current} has not proved an edge yet`});
}
function backtestThreshold(digits,w=60){
  const current=thresholdCandidate(digits.slice(-w),2);
  if(!current)return validateResult({name:"Over / Under 2",action:"WAIT",wins:0,samples:0,baseline:.7,reason:"WAIT: current distribution is near its natural base-rate"});
  const baseline=current==="OVER 2"?.7:.2;let wins=0,samples=0;
  for(let i=w;i<digits.length;i++){const c=thresholdCandidate(digits.slice(i-w,i),2);if(c!==current)continue;samples++;const win=current==="OVER 2"?digits[i]>2:digits[i]<2;if(win)wins++;}
  return validateResult({name:"Over / Under 2",action:current,wins,samples,baseline,minSamples:25,minEdge:current==="OVER 2"?.04:.06,reason:`WAIT: ${current} has not beaten its natural base-rate`});
}
function backtestMatchDiff(digits,w=80){
  const current=matchDiffCandidate(digits.slice(-w));
  if(!current)return validateResult({name:"Matches / Differs",action:"WAIT",wins:0,samples:0,baseline:.1,reason:"WAIT: no unusually hot or cold digit"});
  const baseline=current.type==="MATCH"?.1:.9;let wins=0,samples=0;
  for(let i=w;i<digits.length;i++){const c=matchDiffCandidate(digits.slice(i-w,i));if(!c||c.type!==current.type||c.digit!==current.digit)continue;samples++;const win=current.type==="MATCH"?digits[i]===current.digit:digits[i]!==current.digit;if(win)wins++;}
  const action=current.type==="MATCH"?`MATCH ${current.digit}`:`DIFFERS ${current.digit}`;
  return validateResult({name:"Matches / Differs",action,wins,samples,baseline,minSamples:current.type==="MATCH"?20:30,minEdge:current.type==="MATCH"?.05:.025,reason:`WAIT: ${action} has not proved enough edge`});
}
function backtestRiseFall(prices,lookback=20,horizon=5){
  if(!Array.isArray(prices)||prices.length<lookback+horizon+20)return validateResult({name:"Rise / Fall",action:"WAIT",wins:0,samples:0,baseline:.5,reason:"WAIT: not enough price history"});
  const current=slopeDirection(prices.slice(-lookback));
  if(!current)return validateResult({name:"Rise / Fall",action:"WAIT",wins:0,samples:0,baseline:.5,reason:"WAIT: current price trend is too weak"});
  let wins=0,samples=0;
  for(let i=lookback;i+horizon<prices.length;i+=horizon){
    const c=slopeDirection(prices.slice(i-lookback,i)); if(c!==current)continue;
    const entry=Number(prices[i]),exit=Number(prices[i+horizon]); if(!Number.isFinite(entry)||!Number.isFinite(exit)||entry===exit)continue;
    samples++; const actual=exit>entry?"RISE":"FALL"; if(actual===current)wins++;
  }
  return validateResult({name:"Rise / Fall",action:current,wins,samples,baseline:.5,minSamples:20,minEdge:.07,reason:`WAIT: ${current} trend has not shown a reliable historical edge`});
}
export function buildValidatedSignals(snapshot={}){
  const digits=Array.isArray(snapshot.digitHistory)?snapshot.digitHistory.map(Number).filter(Number.isInteger):[];
  const prices=Array.isArray(snapshot.prices)?snapshot.prices.map(Number).filter(Number.isFinite):[];
  const signals=[backtestParity(digits),backtestThreshold(digits),backtestMatchDiff(digits),backtestRiseFall(prices)];
  const approved=signals.filter(s=>s.approved);
  const best=approved.sort((a,b)=>b.lowerBound-a.lowerBound||b.edge-a.edge||b.samples-a.samples)[0]||null;
  return {signals,best,approvedCount:approved.length,note:"Validated signals use walk-forward historical testing. Past hit-rate does not guarantee the next trade."};
}
