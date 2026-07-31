/**
 * Owner bot -> existing MetaBinary runBinaryTrade adapter.
 *
 * This does NOT create or settle trades itself.
 * It calls the existing real-account runBinaryTrade function.
 */
export async function executeOwnerBotEntry(runBinaryTrade, request) {
  if (typeof runBinaryTrade !== "function") {
    throw new Error("runBinaryTrade is unavailable");
  }

  const type = request?.type;
  const action = request?.action;

  if (!type || !action) {
    throw new Error("Owner bot request is missing type/action");
  }

  return runBinaryTrade(type, action, {
    stake: Number(request.stake),
    prediction: Number(request.prediction ?? 0),
    durationTicks: Number(request.ticks ?? 5),
    durationUnit: type === "Rise/Fall" ? "seconds" : "ticks",
    durationValue: Number(request.ticks ?? 5),
    source: "owner-analysis-bot",
  });
}
