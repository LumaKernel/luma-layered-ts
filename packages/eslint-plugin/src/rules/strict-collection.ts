import { AST_NODE_TYPES } from "@typescript-eslint/utils";
import { createRule } from "../create-rule.js";

type Options = Record<string, never>;
const defaultOptions: Options = {};

type MessageId = "useStrictCollection";

// ReadonlyMap#get returns `V | undefined`, and both can be upcast to the mutable Map/Set
const REPLACEMENTS: ReadonlyMap<string, string> = new Map([
  ["ReadonlyMap", "StrictReadonlyMap"],
  ["ReadonlySet", "StrictReadonlySet"],
]);

export default createRule<[Options], MessageId>({
  name: "strict-collection",
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow ReadonlyMap/ReadonlySet types. Use StrictReadonlyMap/StrictReadonlySet from @luma-layered-ts/types.",
    },
    messages: {
      useStrictCollection:
        "'{{name}}' can be upcast to a mutable collection{{detail}}. Use '{{replacement}}' from @luma-layered-ts/types (convert with to{{replacement}}).",
    },
    schema: [],
  },
  defaultOptions: [defaultOptions],
  create(context) {
    return {
      TSTypeReference(node): void {
        if (node.typeName.type !== AST_NODE_TYPES.Identifier) return;
        const name = node.typeName.name;
        const replacement = REPLACEMENTS.get(name);
        if (replacement === undefined) return;
        context.report({
          node,
          messageId: "useStrictCollection",
          data: {
            name,
            replacement,
            detail:
              name === "ReadonlyMap" ? " and get() returns undefined" : "",
          },
        });
      },
    };
  },
});
