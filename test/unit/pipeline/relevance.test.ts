import { describe, expect, it } from "vitest";
import { isDeveloperRelevant } from "../../../pipeline/relevance";

describe("isDeveloperRelevant", () => {
  it.each([
    "GPT-6 Astra: A new generation of intelligence",
    "GPT 5.6 Sol is the best vision model OpenAI ever released",
    "Advancing price-performance with GPT‑5.6 in Kiro",
    "What o3 still gets wrong",
    "Claude 5 system card",
    "Introducing Claude Opus 5",
    "Claude Fable 5.1 and Claude Mythos 5.1",
    "Breaking Opus 5 auto mode",
    "Sonnet 5 is faster",
    "Haiku 4.5 costs less",
    "Introducing Gemini 3.8 Flash and 3.8 Flash Cyber",
    "Gemini Omni 1.1 Flash lets you build with more control",
    "Gemma 4 runs on a phone",
    "DeepSeek v4.1 Flash",
    "DeepSeek-R2 reasons longer",
    "Llama 5 is out",
    "Qwen 3.8 27B is excellent",
  ])("keeps %j, which names a model version", (title) => {
    expect(isDeveloperRelevant(title)).toBe(true);
  });

  it.each([
    "Introducing the Agents API",
    "New APIs for voice",
    "The OpenAI SDK for Go",
    "A CLI for Gemini",
    "Codex now reviews pull requests",
    "Breaking Claude Code auto mode",
    "Give Your Coding Agents a Memory You Own",
    "Anthropic for developers",
    "What every developer should know about Claude",
    "Claude and MCP servers",
    "Introducing @huggingface/kernels: 200+ WebGPU Kernels for Local AI",
    "Calling Gemini from JavaScript",
    "An OpenAI client in TypeScript",
    "Our position on open-weights models",
    "Open weights from DeepSeek",
    "Claude, change the button in React",
    "Gemini in a Vue app",
    "Nuxt meets ChatGPT",
    "Next.js and Claude",
    "A Vite plugin for Claude",
    "SvelteKit and Gemini",
  ])("keeps %j, which has a developer term", (title) => {
    expect(isDeveloperRelevant(title)).toBe(true);
  });

  // Titles the filter must drop, from the real feeds of 2026-09-15.
  it.each([
    "AlphaGenome Atlas: A predictive map of every possible DNA letter change in the human genome",
    "Introducing WeatherNext 3, our most advanced and accurate global weather AI model",
    "Introducing ChatGPT for Financial Services",
    "Nvidia to acquire Hugging Face",
    "I resigned from Anthropic today",
    "Pentagon's blacklisting of Anthropic was unlawful, US judge rules",
    "Async GRPO with LoRA across HF Jobs: a bucket, a proxy, and no NCCL",
    "Improving our alignment and security efforts",
  ])("drops %j", (title) => {
    expect(isDeveloperRelevant(title)).toBe(false);
  });

  it("matches whole words only", () => {
    for (const title of ["OpenAI raises capital", "Therapists and ChatGPT", "Recoding society", "GPT-style chatbots"]) {
      expect(isDeveloperRelevant(title), title).toBe(false);
    }
  });
});
