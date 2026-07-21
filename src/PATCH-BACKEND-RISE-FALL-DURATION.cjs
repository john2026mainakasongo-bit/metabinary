const fs = require("node:fs");
const path = require("node:path");

const projectRoot = process.cwd();
const serverPath = path.join(projectRoot, "backend", "server.js");

if (!fs.existsSync(serverPath)) {
  console.error(`backend/server.js was not found at: ${serverPath}`);
  process.exit(1);
}

let source = fs.readFileSync(serverPath, "utf8");
const original = source;

const oldOpenClamp = 'const ticks = Math.min(10, Math.max(1, Math.floor(Number(req.body?.ticks || 5))));';
const newOpenClamp = `const requestedTicks = Math.max(1, Math.floor(Number(req.body?.ticks || 5)));
    const ticks = Math.min(type === "Rise/Fall" ? 300 : 10, requestedTicks);`;

if (source.includes(oldOpenClamp)) {
  source = source.replace(oldOpenClamp, newOpenClamp);
} else if (!source.includes('type === "Rise/Fall" ? 300 : 10')) {
  console.error("Could not find the trade-duration clamp in /api/trades/open. No changes were written.");
  process.exit(1);
}

const oldTickClamp = 'const totalTicks = Math.min(10, Math.max(1, Number(trade.ticks || 1)));';
const newTickClamp = 'const totalTicks = Math.min(trade.type === "Rise/Fall" ? 300 : 10, Math.max(1, Number(trade.ticks || 1)));';

if (source.includes(oldTickClamp)) {
  source = source.replace(oldTickClamp, newTickClamp);
} else if (!source.includes('trade.type === "Rise/Fall" ? 300 : 10')) {
  console.error("Could not find the running-trade tick clamp. No changes were written.");
  process.exit(1);
}

if (source === original) {
  console.log("Rise/Fall duration backend support is already installed. Nothing to change.");
  process.exit(0);
}

const backupPath = `${serverPath}.before-rise-fall-duration-v159.bak`;
if (!fs.existsSync(backupPath)) fs.writeFileSync(backupPath, original, "utf8");
fs.writeFileSync(serverPath, source, "utf8");

console.log("Rise/Fall duration backend patch installed successfully.");
console.log("Supported: 1-60 seconds and 1-5 minutes (maximum 300 seconds).");
console.log(`Backup: ${backupPath}`);
