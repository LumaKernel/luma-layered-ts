import {
  AST_NODE_TYPES,
  AST_TOKEN_TYPES,
  TSESTree,
} from "@typescript-eslint/utils";
import { createRule } from "../create-rule.js";

type Options = Record<string, never>;
const defaultOptions: Options = {};

type MessageId = "directiveOutsideUnsafeDir" | "effectOutsideUnsafeDir";

export function isUnsafeDirFile(filePath: string): boolean {
  return /\/_unsafe_\//.test(filePath);
}

// Directives that suppress static checks or coverage.
// `eslint <rule>: <severity>` inline config is only recognized in block comments.
const DIRECTIVE_PATTERNS: readonly {
  readonly pattern: RegExp;
  readonly blockOnly: boolean;
}[] = [
  { pattern: /^eslint-disable(?:-line|-next-line)?(?=\s|$)/, blockOnly: false },
  { pattern: /^eslint(?=\s)/, blockOnly: true },
  { pattern: /^@ts-(?:ignore|expect-error|nocheck)\b/, blockOnly: false },
  { pattern: /^(?:istanbul|c8|v8)\s+ignore\b/, blockOnly: false },
  { pattern: /^node:coverage\s+(?:ignore|disable)\b/, blockOnly: false },
  { pattern: /^biome-ignore\S*/, blockOnly: false },
  { pattern: /^oxlint-disable\S*/, blockOnly: false },
];

export function findDirective(comment: TSESTree.Comment): string | null {
  // Leading `/` covers `/// @ts-ignore`, leading `*` covers `/** @ts-ignore */`
  const text = comment.value.replace(/^[/*\s]+/, "");
  const isBlock = comment.type === AST_TOKEN_TYPES.Block;
  for (const { pattern, blockOnly } of DIRECTIVE_PATTERNS) {
    if (blockOnly && !isBlock) continue;
    const match = text.match(pattern);
    if (match) return match[0];
  }
  return null;
}

// React effect hooks: escape hatches that synchronize with the outside of React.
// Derived state, event handling and data fetching have safer alternatives.
const EFFECT_HOOKS = new Set([
  "useEffect",
  "useLayoutEffect",
  "useInsertionEffect",
]);
const REACT_MODULES = new Set(["react", "preact/hooks", "preact/compat"]);

export default createRule<[Options], MessageId>({
  name: "require-unsafe-dir",
  meta: {
    type: "problem",
    docs: {
      description:
        "Allow unsafe constructs only in files under a _unsafe_/ directory: check-suppressing directives (eslint-disable, @ts-ignore, coverage ignore, etc.) and React effect hooks.",
    },
    messages: {
      directiveOutsideUnsafeDir:
        "'{{directive}}' suppresses checks. Move the code that needs it into a _unsafe_/ directory.",
      effectOutsideUnsafeDir:
        "'{{name}}' is an escape hatch. Move the code that needs it into a _unsafe_/ directory.",
    },
    schema: [],
  },
  defaultOptions: [defaultOptions],
  create(context) {
    if (isUnsafeDirFile(context.filename)) return {};

    function reportEffect(node: TSESTree.Node, name: string): void {
      context.report({
        node,
        messageId: "effectOutsideUnsafeDir",
        data: { name },
      });
    }

    return {
      Program(): void {
        for (const comment of context.sourceCode.getAllComments()) {
          const directive = findDirective(comment);
          if (directive === null) continue;
          context.report({
            loc: comment.loc,
            messageId: "directiveOutsideUnsafeDir",
            data: { directive },
          });
        }
      },
      // import { useEffect } from "react"
      ImportSpecifier(node): void {
        if (
          node.parent.type !== AST_NODE_TYPES.ImportDeclaration ||
          !REACT_MODULES.has(node.parent.source.value)
        ) {
          return;
        }
        const name =
          node.imported.type === AST_NODE_TYPES.Identifier
            ? node.imported.name
            : node.imported.value;
        if (EFFECT_HOOKS.has(name)) reportEffect(node, name);
      },
      // React.useEffect
      MemberExpression(node): void {
        if (
          !node.computed &&
          node.property.type === AST_NODE_TYPES.Identifier &&
          EFFECT_HOOKS.has(node.property.name)
        ) {
          reportEffect(node, node.property.name);
        }
      },
      // const { useEffect } = React
      "ObjectPattern > Property"(node: TSESTree.Property): void {
        if (
          !node.computed &&
          node.key.type === AST_NODE_TYPES.Identifier &&
          EFFECT_HOOKS.has(node.key.name)
        ) {
          reportEffect(node, node.key.name);
        }
      },
    };
  },
});
