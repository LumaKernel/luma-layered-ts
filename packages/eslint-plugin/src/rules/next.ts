import { AST_NODE_TYPES, TSESTree } from "@typescript-eslint/utils";
import { createRule } from "../create-rule.js";
import {
  getLayerFromPath,
  getLayerFromImport,
  canImport,
  isTestFile,
  ENCODING_GLOBALS,
  SCHEMA_BOUNDARY_METHODS,
  STRING_INTERPRETATION_METHODS,
} from "../layers.js";
import type { LayerName } from "../layers.js";

type Options = Record<string, never>;
const defaultOptions: Options = {};

const NEXT_LAYERS = new Set<LayerName>(["app/api", "app/pages"]);

type MessageId =
  "importViolation" | "encodedGlobal" | "schemaBoundary" | "encodedMethod";

export default createRule<[Options], MessageId>({
  name: "next",
  meta: {
    type: "problem",
    docs: {
      description:
        "Enforce layered architecture for Next.js app router files. app/api/ has server wiring root constraints (import matrix only). app/ pages/layouts have ui/pages-equivalent constraints.",
    },
    messages: {
      importViolation: "'{{fromLayer}}' cannot import from '{{toLayer}}'.",
      encodedGlobal:
        "'{{name}}' is an encoded representation API. Not allowed in '{{layer}}'. Use canonical types (Effect.ts) instead.",
      schemaBoundary:
        "Schema.{{method}}() crosses the canonical/encoded boundary. Not allowed in '{{layer}}'. Decoding belongs in adapter.",
      encodedMethod:
        "'.{{method}}()' interprets encoded representation. Not allowed in '{{layer}}'.",
    },
    schema: [],
  },
  defaultOptions: [defaultOptions],
  create(context) {
    const filePath = context.filename;
    if (isTestFile(filePath)) return {};
    const layer = getLayerFromPath(filePath);
    if (!layer || !NEXT_LAYERS.has(layer)) return {};

    const isApiRoute = layer === "app/api";

    function checkImport(importPath: string, node: TSESTree.Node): void {
      const toLayer = getLayerFromImport(importPath);
      if (!toLayer) return;
      if (!canImport(layer as LayerName, toLayer)) {
        context.report({
          node,
          messageId: "importViolation",
          data: { fromLayer: layer, toLayer },
        });
      }
    }

    // app/api: import matrix only (server-side wiring root)
    if (isApiRoute) {
      return {
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
      };
    }

    // app/pages: same constraints as ui/pages
    return {
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

      // Encoding globals
      Identifier(node: TSESTree.Identifier): void {
        if (!ENCODING_GLOBALS.has(node.name)) return;
        if (
          node.parent?.type === AST_NODE_TYPES.MemberExpression &&
          node.parent.property === node &&
          !node.parent.computed
        ) {
          return;
        }
        if (isInTypeContext(node)) return;

        context.report({
          node,
          messageId: "encodedGlobal",
          data: { name: node.name, layer },
        });
      },

      // Schema boundary + string interpretation
      CallExpression(node: TSESTree.CallExpression): void {
        if (
          node.callee.type !== AST_NODE_TYPES.MemberExpression ||
          node.callee.property.type !== AST_NODE_TYPES.Identifier
        ) {
          return;
        }

        const method = node.callee.property.name;

        if (SCHEMA_BOUNDARY_METHODS.has(method)) {
          context.report({
            node,
            messageId: "schemaBoundary",
            data: { method, layer },
          });
          return;
        }

        if (method === "toString") return;

        if (STRING_INTERPRETATION_METHODS.has(method)) {
          context.report({
            node,
            messageId: "encodedMethod",
            data: { method, layer },
          });
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
