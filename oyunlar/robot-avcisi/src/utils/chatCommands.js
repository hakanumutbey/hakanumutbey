const CANONICAL_COMMANDS = new Map([
  ["/dans", "/dans"],
  ["/dance", "/dans"],
  ["/çak", "/çak"],
  ["/cak", "/çak"],
  ["/highfive", "/çak"],
  ["/high-five", "/çak"],
  ["/sarılma", "/sarılma"],
  ["/sarilma", "/sarılma"],
  ["/hug", "/sarılma"],
  ["/ölümsüzlük", "/ölümsüzlük"],
  ["/olumsuzluk", "/ölümsüzlük"],
  ["/godmode", "/ölümsüzlük"],
  ["/god", "/ölümsüzlük"]
]);

export function normalizeChatCommand(command = "") {
  const normalized = String(command).trim().toLocaleLowerCase("tr-TR");
  return CANONICAL_COMMANDS.get(normalized) || normalized;
}

export function chatCommandEmote(command = "") {
  const normalized = normalizeChatCommand(command);
  if (normalized === "/dans") return "dance";
  if (normalized === "/çak") return "highFive";
  if (normalized === "/sarılma") return "hug";
  return "";
}
