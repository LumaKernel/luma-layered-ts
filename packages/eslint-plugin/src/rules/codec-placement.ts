import { AST_NODE_TYPES, TSESTree } from "@typescript-eslint/utils";
import { createRule } from "../create-rule.js";
import { getLayerFromPath, isTestFile } from "../layers.js";
import type { LayerName } from "../layers.js";

type Options = Record<string, never>;
const defaultOptions: Options = {};

type MessageId = "codecOutsideAdapter";

// Layers that convert between canonical and encoded representations
const CODEC_LAYERS = new Set<LayerName>(["adapter", "infra"]);

// `parse`, `parseMove`, `decode_v2` match; `parsed`, `decoder`, `parser` do not
const CODEC_NAME =
  /^(?:serialize|deserialize|encode|decode|parse)(?=[A-Z0-9_]|$)/;

function isFunctionNode(node: TSESTree.Node | null | undefined): boolean {
  return (
    node?.type === AST_NODE_TYPES.ArrowFunctionExpression ||
    node?.type === AST_NODE_TYPES.FunctionExpression
  );
}

function keyName(key: TSESTree.Node): string | null {
  if (key.type === AST_NODE_TYPES.Identifier) return key.name;
  if (key.type === AST_NODE_TYPES.Literal && typeof key.value === "string") {
    return key.value;
  }
  return null;
}

export default createRule<[Options], MessageId>({
  name: "codec-placement",
  meta: {
    type: "problem",
    docs: {
      description:
        "Functions named serialize*/deserialize*/encode*/decode*/parse* convert between canonical and encoded representations. Define them only in adapter (or infra).",
    },
    messages: {
      codecOutsideAdapter:
        "'{{name}}' is named as a codec (canonical <-> encoded). Define it in adapter, not in '{{layer}}'.",
    },
    schema: [],
  },
  defaultOptions: [defaultOptions],
  create(context) {
    const filePath = context.filename;
    if (isTestFile(filePath)) return {};
    const layer = getLayerFromPath(filePath);
    if (!layer || CODEC_LAYERS.has(layer)) return {};

    function check(node: TSESTree.Node, name: string | null): void {
      if (name === null || !CODEC_NAME.test(name)) return;
      context.report({
        node,
        messageId: "codecOutsideAdapter",
        data: { name, layer },
      });
    }

    return {
      FunctionDeclaration(node): void {
        if (node.id) check(node.id, node.id.name);
      },
      VariableDeclarator(node): void {
        if (
          node.id.type === AST_NODE_TYPES.Identifier &&
          isFunctionNode(node.init)
        ) {
          check(node.id, node.id.name);
        }
      },
      MethodDefinition(node): void {
        if (!node.computed) check(node.key, keyName(node.key));
      },
      PropertyDefinition(node): void {
        if (!node.computed && isFunctionNode(node.value)) {
          check(node.key, keyName(node.key));
        }
      },
      Property(node): void {
        if (
          !node.computed &&
          node.parent.type === AST_NODE_TYPES.ObjectExpression &&
          isFunctionNode(node.value)
        ) {
          check(node.key, keyName(node.key));
        }
      },
      // interface Codec { serializeItem(i: Item): string }
      TSMethodSignature(node): void {
        if (!node.computed) check(node.key, keyName(node.key));
      },
      TSPropertySignature(node): void {
        if (
          !node.computed &&
          node.typeAnnotation?.typeAnnotation.type ===
            AST_NODE_TYPES.TSFunctionType
        ) {
          check(node.key, keyName(node.key));
        }
      },
    };
  },
});
