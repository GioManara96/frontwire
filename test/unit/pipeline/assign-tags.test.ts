import { describe, expect, it } from "vitest";
import { assignTags } from "../../../pipeline/assign-tags";

describe("assignTags", () => {
  it("starts from the source's default tags", () => {
    expect(assignTags("Our research roadmap", ["openai"])).toEqual(["openai"]);
  });

  it("appends the tags whose keywords appear in the title, in vocabulary order", () => {
    expect(assignTags("Deploying Vue and Nuxt apps", ["release"])).toEqual(["release", "nuxt", "vue"]);
  });

  it("does not repeat a default tag", () => {
    expect(assignTags("Nuxt v4.5.2", ["nuxt", "release"])).toEqual(["nuxt", "release"]);
  });

  it("ignores case", () => {
    expect(assignTags("NEXT.JS and SVELTEKIT", ["react"])).toEqual(["react", "nextjs", "svelte"]);
  });

  it("matches whole words only", () => {
    expect(assignTags("Vitest reactivity tips", ["typescript"])).toEqual(["typescript"]);
  });

  it.each([
    ["Introducing GPT-5.6 Sol", "openai"],
    ["GPT‑5 mini is here", "openai"],
    ["ChatGPT for teams", "openai"],
    ["OpenAI and the new API", "openai"],
    ["Claude Code 2.0", "anthropic"],
    ["Anthropic raises Series G", "anthropic"],
    ["DeepSeek V4 released", "deepseek"],
    ["Hugging Face Hub update", "huggingface"],
    ["HuggingFace datasets", "huggingface"],
    ["Gemini 3.5 Flash", "gemini"],
    ["Google DeepMind's AlphaGenome", "deepmind"],
    ["TypeScript 7.0", "typescript"],
    ["Vue.js 3.6 beta", "vue"],
    ["React Compiler 1.0", "react"],
    ["Vite 8 is out", "vite"],
    ["Svelte 6", "svelte"],
  ] as const)("tags %j with %s", (title, tag) => {
    expect(assignTags(title, ["release"])).toContain(tag);
  });
});
