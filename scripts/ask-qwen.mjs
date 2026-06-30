#!/usr/bin/env node
// ask-qwen.mjs — invoke local Qwen3.6-27B via the llama-server endpoint
// directly, bypassing Claude Code's tool-using prompt that confuses the model.
//
// Usage:
//   echo "prompt" | node scripts/ask-qwen.mjs
//   node scripts/ask-qwen.mjs "prompt here"
//   node scripts/ask-qwen.mjs --system "you are terse" --user "do thing"
//   node scripts/ask-qwen.mjs < prompt.txt
//   node scripts/ask-qwen.mjs --input src/main.tsx --user "audit this file"
//
// Output: writes a JSON file with {content, reasoning, usage, finish_reason}
//         and prints the content to stdout.

import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { basename, extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

// Defaults that work for Qwen3.6-27B thinking mode
const ENDPOINT = "http://100.94.120.109:1234/v1/chat/completions";
const MODEL = "C:\\Users\\geeko\\.lmstudio\\models\\unsloth\\Qwen3.6-27B-MTP-GGUF\\Qwen3.6-27B-Q4_K_S.gguf";

// Parse args
const args = process.argv.slice(2);
let systemPrompt = "You are a code reviewer. Be terse, specific, and concrete. No preamble, no closing remarks. Output only the answer.";
let userPrompt = null;
let inputFile = null;
let maxTokens = 1500;
let temperature = 0.2;
let outFile = null;

for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === "--system") systemPrompt = args[++i];
  else if (a === "--user") userPrompt = args[++i];
  else if (a === "--input") inputFile = args[++i];
  else if (a === "--max-tokens") maxTokens = parseInt(args[++i], 10);
  else if (a === "--temperature") temperature = parseFloat(args[++i]);
  else if (a === "--out") outFile = args[++i];
  else if (a === "--help" || a === "-h") {
    console.log("usage: node ask-qwen.mjs [options]");
    console.log("  --system PROMPT     system message");
    console.log("  --user PROMPT       user message");
    console.log("  --input FILE        read user message body from file");
    console.log("  --max-tokens N      default 1500");
    console.log("  --temperature N     default 0.2");
    console.log("  --out FILE          save raw response to JSON file");
    process.exit(0);
  } else if (!userPrompt) userPrompt = a;
}

if (inputFile) {
  if (!existsSync(inputFile)) {
    console.error(`input file not found: ${inputFile}`);
    process.exit(1);
  }
  userPrompt = readFileSync(inputFile, "utf8");
}

if (!userPrompt) {
  // Try stdin
  if (!process.stdin.isTTY) {
    userPrompt = readFileSync(0, "utf8");
  }
}

if (!userPrompt || !userPrompt.trim()) {
  console.error("no prompt provided. use --user, --input, or pipe via stdin.");
  process.exit(1);
}

userPrompt = userPrompt.trim();

const body = {
  model: MODEL,
  messages: [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ],
  max_tokens: maxTokens,
  temperature,
};

// Retry loop with exponential backoff for transient errors
async function call() {
  const attempt = async (n) => {
    try {
      const res = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(180_000),  // 3 min
      });
      if (!res.ok) {
        const text = await res.text();
        if (n < 3 && (res.status >= 500 || res.status === 429)) {
          console.error(`HTTP ${res.status}, retrying (${n + 1}/3): ${text.slice(0, 200)}`);
          await new Promise((r) => setTimeout(r, 2_000 * (n + 1)));
          return attempt(n + 1);
        }
        throw new Error(`HTTP ${res.status}: ${text}`);
      }
      return await res.json();
    } catch (err) {
      if (n < 3 && (err.name === "AbortError" || err.cause?.code === "ECONNRESET")) {
        console.error(`network error, retrying (${n + 1}/3): ${err.message}`);
        await new Promise((r) => setTimeout(r, 2_000 * (n + 1)));
        return attempt(n + 1);
      }
      throw err;
    }
  };
  return attempt(0);
}

try {
  const data = await call();
  const choice = data.choices?.[0];
  if (!choice) {
    console.error("no choices in response:", JSON.stringify(data).slice(0, 500));
    process.exit(1);
  }
  const content = choice.message?.content ?? "";
  const reasoning = choice.message?.reasoning_content ?? "";
  const finish = choice.finish_reason;
  const usage = data.usage;

  // Strip leading/trailing whitespace from content for cleaner display
  const cleanContent = content.trim();

  if (outFile) {
    writeFileSync(outFile, JSON.stringify({
      prompt: userPrompt,
      system: systemPrompt,
      content,
      reasoning,
      finish_reason: finish,
      usage,
      model: MODEL,
      timestamp: new Date().toISOString(),
    }, null, 2));
  }

  // Print content to stdout (for piping)
  process.stdout.write(cleanContent + "\n");

  // To stderr: brief usage line
  if (usage) {
    process.stderr.write(
      `[qwen] finish=${finish} prompt=${usage.prompt_tokens} completion=${usage.completion_tokens} total=${usage.total_tokens}\n`
    );
  }
} catch (err) {
  console.error("FAILED:", err.message);
  process.exit(1);
}
