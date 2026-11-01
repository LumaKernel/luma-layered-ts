import { AST_NODE_TYPES, TSESTree } from "@typescript-eslint/utils";
import { createRule } from "../create-rule.js";
import {
  getLayerFromPath,
  getLayerFromImport,
  canImport,
  isTestFile,
  isNonLayerAliasImport,
  resolveImportPath,
  ENCODING_GLOBALS,
  IO_GLOBALS,
  ADAPTER_IMPURE_GLOBALS,
  ADAPTER_IMPURE_MEMBERS,
  isNodeBuiltinImport,
  SCHEMA_BOUNDARY_METHODS,
  STRING_INTERPRETATION_METHODS,
} from "../layers.js";
import type { LayerName } from "../layers.js";

type Options = Record<string, never>;
const defaultOptions: Options = {};

const SERVER_LAYERS = new Set<LayerName>([
  "core",
  "service",
  "adapter",
  "infra",
]);
const INNER_LAYERS = new Set<LayerName>(["core", "service"]);

type MessageId =
  | "importViolation"
  | "importNonLayer"
  | "encodedGlobal"
  | "ioGlobal"
  | "schemaBoundary"
  | "encodedMethod"
  | "adapterImpure"
  | "adapterNodeBuiltin";

export default createRule<[Options], MessageId>({
  name: "server",
  meta: {
    type: "problem",
    docs: {
      description:
        "Enforce layered architecture for server-side layers (core, service, adapter, infra). Checks imports, encoded representation globals, Schema boundary, and string interpretation.",
    },
    messages: {
      importViolation: "'{{fromLayer}}' cannot import from '{{toLayer}}'.",
      importNonLayer:
        "Import '{{importPath}}' does not resolve to a recognized layer. Move the target into a layer directory.",
      encodedGlobal:
        "'{{name}}' is an encoded representation API. Not allowed in '{{layer}}'. Use canonical types (Effect.ts) instead.",
      ioGlobal:
        "'{{name}}' is an IO boundary API. Not allowed in '{{layer}}'. IO belongs in infra.",
      schemaBoundary:
        "Schema.{{method}}() crosses the canonical/encoded boundary. Only allowed in adapter/infra. Current layer: '{{layer}}'.",
      encodedMethod:
        "'.{{method}}()' interprets encoded representation. Not allowed in '{{layer}}'. Encoded interpretation belongs in adapter.",
      adapterImpure:
        "'{{name}}' is IO, environment-specific or non-deterministic. adapter is a pure codec shared by server and client. Move this to infra or ui/hooks.",
      adapterNodeBuiltin:
        "'{{importPath}}' is a Node.js built-in. adapter is a pure codec shared by server and client.",
    },
    schema: [],
  },
  defaultOptions: [defaultOptions],
  create(context) {
    const filePath = context.filename;
    if (isTestFile(filePath)) return {};
    const layer = getLayerFromPath(filePath);
    if (!layer || !SERVER_LAYERS.has(layer)) return {};

    const isInner = INNER_LAYERS.has(layer);
    const isAdapter = layer === "adapter";

    function checkImport(importPath: string, node: TSESTree.Node): void {
      if (isAdapter && isNodeBuiltinImport(importPath)) {
        context.report({
          node,
          messageId: "adapterNodeBuiltin",
          data: { importPath },
        });
        return;
      }
      const resolved = resolveImportPath(importPath, filePath);
      const toLayer = getLayerFromImport(resolved);
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
      // --- Import checks (all server layers) ---
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

      // --- adapter purity ---
      ...(isAdapter
        ? {
            Identifier(node: TSESTree.Identifier): void {
              if (!ADAPTER_IMPURE_GLOBALS.has(node.name)) return;
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
                messageId: "adapterImpure",
                data: { name: node.name },
              });
            },
            MemberExpression(node: TSESTree.MemberExpression): void {
              if (
                node.object.type !== AST_NODE_TYPES.Identifier ||
                node.property.type !== AST_NODE_TYPES.Identifier ||
                node.computed
              ) {
                return;
              }
              const name = `${node.object.name}.${node.property.name}`;
              if (
                ADAPTER_IMPURE_MEMBERS.get(node.object.name)?.has(
                  node.property.name,
                )
              ) {
                context.report({
                  node,
                  messageId: "adapterImpure",
                  data: { name },
                });
              }
            },
            // `new Date()` / `Date()` read the clock
            "NewExpression[callee.name='Date'][arguments.length=0], CallExpression[callee.name='Date']"(
              node: TSESTree.NewExpression | TSESTree.CallExpression,
            ): void {
              context.report({
                node,
                messageId: "adapterImpure",
                data: {
                  name:
                    node.type === AST_NODE_TYPES.NewExpression
                      ? "new Date()"
                      : "Date()",
                },
              });
            },
          }
        : {}),

      // --- Inner layer restrictions (core/service only) ---
      ...(isInner
        ? {
            // Restricted globals
            Identifier(node: TSESTree.Identifier): void {
              // Skip property access right-hand side (obj.JSON is fine)
              if (
                node.parent?.type === AST_NODE_TYPES.MemberExpression &&
                node.parent.property === node &&
                !node.parent.computed
              ) {
                return;
              }
              // Skip type contexts
              if (isInTypeContext(node)) return;

              if (ENCODING_GLOBALS.has(node.name)) {
                context.report({
                  node,
                  messageId: "encodedGlobal",
                  data: { name: node.name, layer },
                });
              } else if (IO_GLOBALS.has(node.name)) {
                context.report({
                  node,
                  messageId: "ioGlobal",
                  data: { name: node.name, layer },
                });
              }
            },

            // Schema boundary + string interpretation methods
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

              // toString is allowed (logging, debugging)
              if (method === "toString") return;

              if (STRING_INTERPRETATION_METHODS.has(method)) {
                context.report({
                  node,
                  messageId: "encodedMethod",
                  data: { method, layer },
                });
              }
            },
          }
        : {}),
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
