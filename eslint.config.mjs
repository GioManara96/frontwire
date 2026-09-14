// @ts-check
import prettier from "eslint-config-prettier";
import withNuxt from "./.nuxt/eslint.config.mjs";

// Prettier comes last so it switches off every rule that would fight the formatter.
export default withNuxt(prettier);
