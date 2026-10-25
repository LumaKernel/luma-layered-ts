import { AST_NODE_TYPES, TSESTree } from "@typescript-eslint/utils";
import { createRule } from "../create-rule.js";
import {
  getLayerFromPath,
  getLayerFromImport,
  canImport,
  isTestFile,
  isNonLayerAliasImport,
  ENCODING_GLOBALS,
  SCHEMA_BOUNDARY_METHODS,
  STRING_INTERPRETATION_METHODS,
} from "../layers.js";
import type { LayerName } from "../layers.js";

type Options = Record<string, never>;
const defaultOptions: Options = {};

const UI_LAYERS = new Set<LayerName>(["ui/hooks", "ui/components", "ui/pages"]);

// components can call .display(), .trim(), .toString() — these don't interpret structure
const COMPONENT_ALLOWED_METHODS = new Set(["display", "trim", "toString"]);

type MessageId =
  | "importViolation"
  | "importNonLayer"
  | "encodedGlobal"
  | "schemaBoundary"
  | "encodedMethod"
  | "componentParseMethod";

export default createRule<[Options], MessageId>({
  name: "react",
  meta: {
    type: "problem",
    docs: {
      description:
        "Enforce layered architecture for React UI layers (ui/hooks, ui/components, ui/pages). Checks imports, encoded representation globals, Schema boundary, and string interpretation.",
    },
    messages: {
      importViolation: "'{{fromLayer}}' cannot import from '{{toLayer}}'.",
      importNonLayer:
        "Import '{{importPath}}' does not resolve to a recognized layer. Move the target into a layer directory.",
      encodedGlobal:
        "'{{name}}' is an encoded representation API. Not allowed in '{{layer}}'. Use canonical types (Effect.ts) instead.",
      schemaBoundary:
        "Schema.{{method}}() crosses the canonical/encoded boundary. Not allowed in '{{layer}}'. Decoding belongs in adapter.",
      encodedMethod:
        "'.{{method}}()' interprets encoded representation. Not allowed in '{{layer}}'.",
      componentParseMethod:
        "'.{{method}}()' interprets string structure. Components may only call .display() and .trim().",
    },
    schema: [],
  },
  defaultOptions: [defaultOptions],
  create(context) {
    const filePath = context.filename;
    if (isTestFile(filePath)) return {};
    const layer = getLayerFromPath(filePath);
    if (!layer || !UI_LAYERS.has(layer)) return {};

    const isComponent = layer === "ui/components";

    function checkImport(importPath: string, node: TSESTree.Node): void {
      const toLayer = getLayerFromImport(importPath);
      if (!toLayer) {
        if (isNonLayerAliasImport(importPath)) {
          context.report({
            node,
            messageId: "importNonLayer",
            data: { importPath },
          });
        }
        return;
      }
      if (!canImport(layer as LayerName, toLayer)) {
        context.report({
          node,
          messageId: "importViolation",
          data: { fromLayer: layer, toLayer },
        });
      }
    }

    return {
      // --- Import checks ---
      ImportDeclaration(node: TSESTree.ImportDeclaration): void {
        checkImport(node.source.value, node);
      },
      ImportExpression(node: TSESTree.ImportExpression): void {
        if (
          node.source.type === AST_NODE_TYPES.Literal &&
          typeof node.source.value === "string"
        ) {
          checkImport(node.source.value, node);
        }
      },
      TSExternalModuleReference(
        node: TSESTree.TSExternalModuleReference,
      ): void {
        if (
          node.expression.type === AST_NODE_TYPES.Literal &&
          typeof node.expression.value === "string"
        ) {
          checkImport(node.expression.value, node);
        }
      },

      // --- Encoding globals (all UI layers) ---
      Identifier(node: TSESTree.Identifier): void {
        if (!ENCODING_GLOBALS.has(node.name)) return;

        // Skip property access right-hand side
        if (
          node.parent?.type === AST_NODE_TYPES.MemberExpression &&
          node.parent.property === node &&
          !node.parent.computed
        ) {
          return;
        }
        // Skip type contexts
        if (isInTypeContext(node)) return;

        context.report({
          node,
          messageId: "encodedGlobal",
          data: { name: node.name, layer },
        });
      },

      // --- Schema boundary + string interpretation ---
      CallExpression(node: TSESTree.CallExpression): void {
        if (
          node.callee.type !== AST_NODE_TYPES.MemberExpression ||
          node.callee.property.type !== AST_NODE_TYPES.Identifier
        ) {
          return;
        }

        const method = node.callee.property.name;

        // Schema boundary (all UI layers)
        if (SCHEMA_BOUNDARY_METHODS.has(method)) {
          context.report({
            node,
            messageId: "schemaBoundary",
            data: { method, layer },
          });
          return;
        }

        // toString is always allowed
        if (method === "toString") return;

        if (isComponent) {
          // Components: display/trim allowed, parse methods forbidden
          if (COMPONENT_ALLOWED_METHODS.has(method)) return;
          if (STRING_INTERPRETATION_METHODS.has(method)) {
            context.report({
              node,
              messageId: "componentParseMethod",
              data: { method },
            });
          }
        } else {
          // hooks/pages: all string interpretation forbidden
          if (STRING_INTERPRETATION_METHODS.has(method)) {
            context.report({
              node,
              messageId: "encodedMethod",
              data: { method, layer },
            });
          }
        }
      },
    };

    function isInTypeContext(node: TSESTree.Node): boolean {
      let current: TSESTree.Node | undefined = node.parent;
      while (current) {
        if (
          current.type.startsWith("TS") &&
          current.type !== AST_NODE_TYPES.TSAsExpression &&
          current.type !== AST_NODE_TYPES.TSSatisfiesExpression
        ) {
          return true;
        }
        current = current.parent;
      }
      return false;
    }
  },
});
