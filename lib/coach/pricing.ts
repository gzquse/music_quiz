// Claude list prices in USD per million tokens, used to estimate what each analysis cost.
// Your Anthropic invoice is the source of truth; update this table if prices change.

const PRICES: Record<string, { input: number; output: number }> = {
  "claude-opus-5": { input: 5, output: 25 },
  "claude-opus-5-5": { input: 4, output: 20 },
  "claude-opus-4-8": { input: 5, output: 25 }, // a common server-side fallback
  "claude-fable-5-1": { input: 10, output: 50 },
  "claude-sonnet-5": { input: 2, output: 10 },
  "claude-haiku-4-5": { input: 1, output: 5 },
};

// Prompt caching: a 5-minute cache write costs 1.25× input; a cache read 0.1×.
const CACHE_WRITE = 1.25;
const CACHE_READ = 0.1;

export type TokenUsage = {
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens?: number | null;
  cache_read_input_tokens?: number | null;
};

export function costUsd(model: string, usage: TokenUsage) {
  const price = PRICES[model] ?? PRICES["claude-opus-5"];
  const input =
    usage.input_tokens +
    (usage.cache_creation_input_tokens ?? 0) * CACHE_WRITE +
    (usage.cache_read_input_tokens ?? 0) * CACHE_READ;
  return (input * price.input + usage.output_tokens * price.output) / 1_000_000;
}
