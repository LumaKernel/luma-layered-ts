import {
  AST_NODE_TYPES,
  AST_TOKEN_TYPES,
  TSESTree,
} from "@typescript-eslint/utils";
import { createRule } from "../create-rule.js";

type Options = Record<string, never>;
const defaultOptions: Options = {};

type MessageId =
  | "directiveOutsideUnsafeDir"
  | "effectOutsideUnsafeDir"
  | "lifecycleOutsideUnsafeDir"
  | "effectEscape"
  | "reactReexportAll"
  | "dynamicReactAccess";

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

// Class component counterparts of effect hooks
const LIFECYCLE_METHODS = new Set([
  "componentDidMount",
  "componentDidUpdate",
  "componentWillUnmount",
  "getSnapshotBeforeUpdate",
  "componentWillMount",
  "componentWillReceiveProps",
  "componentWillUpdate",
  "UNSAFE_componentWillMount",
  "UNSAFE_componentWillReceiveProps",
  "UNSAFE_componentWillUpdate",
]);

function staticName(node: TSESTree.Node): string | null {
  if (node.type === AST_NODE_TYPES.Identifier) return node.name;
  if (node.type === AST_NODE_TYPES.Literal && typeof node.value === "string") {
    return node.value;
  }
  return null;
}

function isCallee(node: TSESTree.Node): boolean {
  return (
    node.parent?.type === AST_NODE_TYPES.CallExpression &&
    node.parent.callee === node
  );
}

export default createRule<[Options], MessageId>({
  name: "require-unsafe-dir",
  meta: {
    type: "problem",
    docs: {
      description:
        "Allow unsafe constructs only in files under a _unsafe_/ directory: check-suppressing directives (eslint-disable, @ts-ignore, coverage ignore, etc.), React effect hooks and class component lifecycle methods.",
    },
    messages: {
      directiveOutsideUnsafeDir:
        "'{{directive}}' suppresses checks. Move the code that needs it into a _unsafe_/ directory.",
      effectOutsideUnsafeDir:
        "'{{name}}' is an escape hatch. Move the code that needs it into a _unsafe_/ directory.",
      lifecycleOutsideUnsafeDir:
        "'{{name}}' is the class component counterpart of an effect. Move the code that needs it into a _unsafe_/ directory.",
      effectEscape:
        "'{{name}}' must be called directly. Re-exporting or aliasing it lets effects leave _unsafe_/.",
      reactReexportAll:
        "Re-exporting all of '{{source}}' lets effect hooks leave _unsafe_/. Export by name.",
      dynamicReactAccess:
        "Computed access on '{{name}}' hides which React API is used. Access it by name.",
    },
    schema: [],
  },
  defaultOptions: [defaultOptions],
  create(context) {
    const inUnsafeDir = isUnsafeDirFile(context.filename);
    // Local names bound to the React module itself (default / namespace imports)
    const reactNamespaces = new Set<string>();

    // Outside _unsafe_/: any use is reported. Inside: only uses other than a direct call.
    function checkEffectUse(
      node: TSESTree.Node,
      name: string,
      calledDirectly: boolean,
    ): void {
      if (!inUnsafeDir) {
        context.report({
          node,
          messageId: "effectOutsideUnsafeDir",
          data: { name },
        });
      } else if (!calledDirectly) {
        context.report({ node, messageId: "effectEscape", data: { name } });
      }
    }

    function checkLifecycle(key: TSESTree.Node, computed: boolean): void {
      if (inUnsafeDir || computed) return;
      const name = staticName(key);
      if (name === null || !LIFECYCLE_METHODS.has(name)) return;
      context.report({
        node: key,
        messageId: "lifecycleOutsideUnsafeDir",
        data: { name },
      });
    }

    return {
      Program(): void {
        if (inUnsafeDir) return;
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
      ImportDeclaration(node): void {
        if (!REACT_MODULES.has(node.source.value)) return;
        for (const specifier of node.specifiers) {
          if (specifier.type !== AST_NODE_TYPES.ImportSpecifier) {
            reactNamespaces.add(specifier.local.name);
            continue;
          }
          const name = staticName(specifier.imported);
          if (name === null || !EFFECT_HOOKS.has(name)) continue;
          if (!inUnsafeDir) {
            checkEffectUse(specifier, name, false);
            continue;
          }
          // import { useEffect } from "react" in _unsafe_/: every reference must be a call
          for (const variable of context.sourceCode.getDeclaredVariables(
            specifier,
          )) {
            for (const reference of variable.references) {
              // `typeof useEffect` is a value reference but only reads the type
              if (
                !reference.isValueReference ||
                reference.identifier.parent?.type === AST_NODE_TYPES.TSTypeQuery
              ) {
                continue;
              }
              checkEffectUse(
                reference.identifier,
                name,
                isCallee(reference.identifier),
              );
            }
          }
        }
      },
      // export { useEffect } from "react"
      ExportNamedDeclaration(node): void {
        if (node.source === null || !REACT_MODULES.has(node.source.value)) {
          return;
        }
        for (const specifier of node.specifiers) {
          const name = staticName(specifier.local);
          if (name !== null && EFFECT_HOOKS.has(name)) {
            context.report({
              node: specifier,
              messageId: "effectEscape",
              data: { name },
            });
          }
        }
      },
      // export * from "react"
      ExportAllDeclaration(node): void {
        if (!REACT_MODULES.has(node.source.value)) return;
        context.report({
          node,
          messageId: "reactReexportAll",
          data: { source: node.source.value },
        });
      },
      // React.useEffect / React["useEffect"] / React[key]
      MemberExpression(node): void {
        const name = staticName(node.property);
        if (
          name !== null &&
          (!node.computed || node.property.type === AST_NODE_TYPES.Literal)
        ) {
          if (EFFECT_HOOKS.has(name))
            checkEffectUse(node, name, isCallee(node));
          return;
        }
        if (
          node.computed &&
          node.object.type === AST_NODE_TYPES.Identifier &&
          reactNamespaces.has(node.object.name)
        ) {
          context.report({
            node,
            messageId: "dynamicReactAccess",
            data: { name: node.object.name },
          });
        }
      },
      // const { useEffect } = React
      "ObjectPattern > Property"(node: TSESTree.Property): void {
        if (node.computed) return;
        const name = staticName(node.key);
        if (name !== null && EFFECT_HOOKS.has(name)) {
          checkEffectUse(node, name, false);
        }
      },
      MethodDefinition(node): void {
        checkLifecycle(node.key, node.computed);
      },
      PropertyDefinition(node): void {
        checkLifecycle(node.key, node.computed);
      },
    };
  },
});
