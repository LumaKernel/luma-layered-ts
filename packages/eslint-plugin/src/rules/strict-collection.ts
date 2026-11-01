import { AST_NODE_TYPES, TSESTree } from "@typescript-eslint/utils";
import { createRule } from "../create-rule.js";

type Options = Record<string, never>;
const defaultOptions: Options = {};

type MessageId = "useStrictCollection" | "noMutableCollection";

// ReadonlyMap#get returns `V | undefined`, and ReadonlyMap/ReadonlySet can be upcast to Map/Set
const STRICT_REPLACEMENTS: ReadonlyMap<string, string> = new Map([
  ["ReadonlyMap", "StrictReadonlyMap"],
  ["ReadonlySet", "StrictReadonlySet"],
  ["Map", "StrictReadonlyMap"],
  ["Set", "StrictReadonlySet"],
]);

// No strict counterpart: keep them as inferred locals inside the module that mutates them
const MUTABLE_ONLY = new Set(["WeakMap", "WeakSet"]);

// `ReadonlyMap` or `globalThis.ReadonlyMap`; other qualified names are different types
function collectionName(typeName: TSESTree.EntityName): string | null {
  if (typeName.type === AST_NODE_TYPES.Identifier) return typeName.name;
  if (
    typeName.type === AST_NODE_TYPES.TSQualifiedName &&
    typeName.left.type === AST_NODE_TYPES.Identifier &&
    typeName.left.name === "globalThis"
  ) {
    return typeName.right.name;
  }
  return null;
}

export default createRule<[Options], MessageId>({
  name: "strict-collection",
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow Map/Set/ReadonlyMap/ReadonlySet/WeakMap/WeakSet types. Use StrictReadonlyMap/StrictReadonlySet from @luma-layered-ts/types.",
    },
    messages: {
      useStrictCollection:
        "'{{name}}' is mutable or can be upcast to a mutable collection. Use '{{replacement}}' from @luma-layered-ts/types (convert with to{{replacement}}).",
      noMutableCollection:
        "'{{name}}' is mutable and has no strict counterpart. Do not expose it as a type; keep it an inferred local inside the module that mutates it.",
    },
    schema: [],
  },
  defaultOptions: [defaultOptions],
  create(context) {
    return {
      TSTypeReference(node): void {
        const name = collectionName(node.typeName);
        if (name === null) return;
        const replacement = STRICT_REPLACEMENTS.get(name);
        if (replacement !== undefined) {
          context.report({
            node,
            messageId: "useStrictCollection",
            data: { name, replacement },
          });
        } else if (MUTABLE_ONLY.has(name)) {
          context.report({
            node,
            messageId: "noMutableCollection",
            data: { name },
          });
        }
      },
    };
  },
});
