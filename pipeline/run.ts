// Entry point of `npm run pipeline`: one import run over data/articles.json.
// Warnings and errors are printed as GitHub Actions workflow commands, so they show up as annotations on the run.
import { readFileSync, writeFileSync } from "node:fs";
import type { Article } from "../shared/types/article";
import { fetchText } from "./fetch-text";
import { runPipeline } from "./pipeline";

// Relative to the working directory: npm scripts run from the repository root.
const ARCHIVE_PATH = "data/articles.json";

try {
  // The cast is safe for the same reason as in getArticles: test/unit/articles-data.test.ts validates the file.
  const existing = JSON.parse(readFileSync(ARCHIVE_PATH, "utf8")) as Article[];
  const result = await runPipeline({ existing, now: new Date(), fetchText });
  writeFileSync(ARCHIVE_PATH, `${JSON.stringify(result.articles, null, 2)}\n`);
  for (const warning of result.warnings) console.log(`::warning::${warning}`);
  console.log(
    `Archive: ${result.articles.length} articles (+${result.added} new, -${result.removed} dropped, ${result.skipped} feed items skipped)`,
  );
} catch (error) {
  console.log(`::error::${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
