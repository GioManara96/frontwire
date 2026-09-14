import { defineConfig } from "vitest/config";

// Pin a zone far from UTC (+14h) so date code that silently depends on the machine's time zone fails loudly.
// Set before the config is returned: Vitest's worker processes inherit this environment.
process.env.TZ = "Pacific/Kiritimati";

export default defineConfig({
  test: {
    environment: "node",
    include: ["test/**/*.test.ts"],
  },
});
