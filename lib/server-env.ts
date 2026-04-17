import fs from "fs";
import path from "path";

function parseEnvFile(filePath: string): Record<string, string> {
  if (!fs.existsSync(filePath)) return {};

  const raw = fs.readFileSync(filePath, "utf8");
  const result: Record<string, string> = {};

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith("\"") && value.endsWith("\"")) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    result[key] = value;
  }

  return result;
}

export function getServerEnvVar(key: string) {
  const fromProcess = process.env[key];
  if (fromProcess && fromProcess.trim() !== "") return fromProcess;

  const root = process.cwd();
  const localEnv = parseEnvFile(path.join(root, ".env.local"));
  if (localEnv[key] && localEnv[key].trim() !== "") return localEnv[key];

  const baseEnv = parseEnvFile(path.join(root, ".env"));
  if (baseEnv[key] && baseEnv[key].trim() !== "") return baseEnv[key];

  return "";
}
