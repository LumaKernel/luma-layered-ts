import { createRule } from "../create-rule.js";
import { getLayerFromPath, isTestFile } from "../layers.js";

type Options = Record<string, never>;
const defaultOptions: Options = {};

type MessageId = "noLayer";

export default createRule<[Options], MessageId>({
  name: "require-layer",
  meta: {
    type: "problem",
    docs: {
      description:
        "Require all source files under src/ to belong to a recognized layer directory. Files outside layer directories bypass all layer constraint checks.",
    },
    messages: {
      noLayer:
        "This file is not in a recognized layer directory (src/{core,service,adapter,infra,ui/{hooks,components,pages},app/}). Move it to the appropriate layer so that import and encoding constraints are enforced.",
    },
    schema: [],
  },
  defaultOptions: [defaultOptions],
  create(context) {
    const filePath = context.filename;

    // Only check files under src/
    if (!filePath.match(/\/src\//)) return {};

    // Skip test files (they need cross-layer imports for fixtures)
    if (isTestFile(filePath)) return {};

    // Skip src/main.ts (composition root)
    if (filePath.match(/\/src\/main\.[^/]+$/)) return {};

    const layer = getLayerFromPath(filePath);
    if (layer) return {};

    // File is under src/ but not in any layer — report on Program node
    return {
      Program(node) {
        context.report({
          node,
          messageId: "noLayer",
        });
      },
    };
  },
});
