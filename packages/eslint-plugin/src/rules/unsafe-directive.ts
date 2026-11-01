import { AST_TOKEN_TYPES, TSESTree } from "@typescript-eslint/utils";
import { createRule } from "../create-rule.js";

type Options = Record<string, never>;
const defaultOptions: Options = {};

type MessageId = "outsideUnsafeDir";

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

export default createRule<[Options], MessageId>({
  name: "unsafe-directive",
  meta: {
    type: "problem",
    docs: {
      description:
        "Allow check-suppressing directives (eslint-disable, @ts-ignore, coverage ignore, etc.) only in files under a _unsafe_/ directory.",
    },
    messages: {
      outsideUnsafeDir:
        "'{{directive}}' suppresses checks. Move the code that needs it into a _unsafe_/ directory.",
    },
    schema: [],
  },
  defaultOptions: [defaultOptions],
  create(context) {
    if (isUnsafeDirFile(context.filename)) return {};

    return {
      Program(): void {
        for (const comment of context.sourceCode.getAllComments()) {
          const directive = findDirective(comment);
          if (directive === null) continue;
          context.report({
            loc: comment.loc,
            messageId: "outsideUnsafeDir",
            data: { directive },
          });
        }
      },
    };
  },
});
