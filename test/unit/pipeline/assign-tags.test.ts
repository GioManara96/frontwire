import { describe, expect, it } from "vitest";
import { assignTags, categoryOf, topicOf } from "../../../pipeline/assign-tags";
import { SOURCES } from "../../../shared/utils/sources";

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
    expect(assignTags("HTML5 games in 2026", [])).toEqual([]);
  });

  it("returns no tags when there are no defaults and no keywords", () => {
    expect(assignTags("I can't stop thinking about Papua New Guinea", [])).toEqual([]);
  });

  it("puts TypeScript, JavaScript and the web platform in vocabulary order", () => {
    expect(assignTags("CSS, JavaScript and TypeScript", [])).toEqual(["typescript", "javascript", "web-platform"]);
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
    ["Shipping less JavaScript with Baseline", "javascript"],
    ["HTML Can Do That", "web-platform"],
    ["Ambient CSS v3 – Blender meets CSS", "web-platform"],
    ["It took a year to ship WebAssembly in Anubis", "web-platform"],
    ["Wasm GC lands in every browser", "web-platform"],
  ] as const)("tags %j with %s", (title, tag) => {
    expect(assignTags(title, ["release"])).toContain(tag);
  });
});

describe("categoryOf", () => {
  it("is ai when at least one tag is an AI company or model", () => {
    expect(categoryOf(["react", "anthropic"])).toBe("ai");
    for (const tag of ["openai", "anthropic", "deepseek", "huggingface", "gemini", "deepmind"] as const) {
      expect(categoryOf([tag]), tag).toBe("ai");
    }
  });

  it("is frontend otherwise", () => {
    expect(categoryOf(["react"])).toBe("frontend");
    expect(categoryOf(["web-platform", "javascript"])).toBe("frontend");
  });
});

describe("topicOf", () => {
  it("keeps a fixed category and adds keyword tags to the default ones", () => {
    expect(topicOf("Next.js and Claude", SOURCES["nextjs-blog"])).toEqual({
      category: "frontend",
      tags: ["nextjs", "anthropic"],
    });
  });

  it("reads tags and category from the title when the source fixes neither", () => {
    expect(topicOf("Claude Fable 5.1 builds a React app", SOURCES.hackernews)).toEqual({
      category: "ai",
      tags: ["react", "anthropic"],
    });
    expect(topicOf("HTML Can Do That", SOURCES["simon-willison"])).toEqual({
      category: "frontend",
      tags: ["web-platform"],
    });
  });

  it("returns undefined when a title-only source's title has no keyword", () => {
    expect(topicOf("I can't stop thinking about Papua New Guinea", SOURCES.hackernews)).toBeUndefined();
  });
});
