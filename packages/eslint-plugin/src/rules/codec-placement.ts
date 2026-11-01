import { AST_NODE_TYPES, TSESTree } from "@typescript-eslint/utils";
import { createRule } from "../create-rule.js";
import { getLayerFromPath, isTestFile } from "../layers.js";
import type { LayerName } from "../layers.js";

type Options = Record<string, never>;
const defaultOptions: Options = {};

type MessageId = "codecOutsideAdapter" | "displayTextOutsideAdapter";

const TYPES_PACKAGE = "@luma-layered-ts/types";

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
        "String representations are produced in adapter: functions named serialize*/deserialize*/encode*/decode*/parse* are defined only in adapter (or infra), and DisplayText.make is called only in adapter.",
    },
    messages: {
      codecOutsideAdapter:
        "'{{name}}' is named as a codec (canonical <-> encoded). Define it in adapter, not in '{{layer}}'.",
      displayTextOutsideAdapter:
        "DisplayText.make is for display formatters in adapter. In '{{layer}}', receive DisplayText from adapter instead of creating it.",
    },
    schema: [],
  },
  defaultOptions: [defaultOptions],
  create(context) {
    const filePath = context.filename;
    if (isTestFile(filePath)) return {};
    const layer = getLayerFromPath(filePath);
    if (!layer) return {};
    const checkCodecs = !CODEC_LAYERS.has(layer);
    const checkDisplayText = layer !== "adapter";
    if (!checkCodecs && !checkDisplayText) return {};

    // Local names bound to DisplayText, or to the whole types package (namespace import)
    const displayTextLocals = new Set<string>();
    const typesNamespaces = new Set<string>();

    function reportDisplayText(node: TSESTree.Node): void {
      context.report({
        node,
        messageId: "displayTextOutsideAdapter",
        data: { layer },
      });
    }

    function check(node: TSESTree.Node, name: string | null): void {
      if (!checkCodecs || name === null || !CODEC_NAME.test(name)) return;
      context.report({
        node,
        messageId: "codecOutsideAdapter",
        data: { name, layer },
      });
    }

    return {
      ImportDeclaration(node): void {
        if (!checkDisplayText || node.source.value !== TYPES_PACKAGE) return;
        for (const specifier of node.specifiers) {
          if (specifier.type === AST_NODE_TYPES.ImportNamespaceSpecifier) {
            typesNamespaces.add(specifier.local.name);
          } else if (
            specifier.type === AST_NODE_TYPES.ImportSpecifier &&
            keyName(specifier.imported) === "DisplayText"
          ) {
            displayTextLocals.add(specifier.local.name);
          }
        }
      },
      // DisplayText.make(...) / Types.DisplayText.make(...)
      MemberExpression(node): void {
        if (
          !checkDisplayText ||
          node.computed ||
          keyName(node.property) !== "make"
        ) {
          return;
        }
        const target = node.object;
        if (
          (target.type === AST_NODE_TYPES.Identifier &&
            displayTextLocals.has(target.name)) ||
          (target.type === AST_NODE_TYPES.MemberExpression &&
            !target.computed &&
            keyName(target.property) === "DisplayText" &&
            target.object.type === AST_NODE_TYPES.Identifier &&
            typesNamespaces.has(target.object.name))
        ) {
          reportDisplayText(node);
        }
      },
      FunctionDeclaration(node): void {
        if (node.id) check(node.id, node.id.name);
      },
      VariableDeclarator(node): void {
        // const { make } = DisplayText
        if (
          checkDisplayText &&
          node.id.type === AST_NODE_TYPES.ObjectPattern &&
          node.init?.type === AST_NODE_TYPES.Identifier &&
          displayTextLocals.has(node.init.name) &&
          node.id.properties.some(
            (p) =>
              p.type === AST_NODE_TYPES.Property &&
              !p.computed &&
              keyName(p.key) === "make",
          )
        ) {
          reportDisplayText(node);
        }
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
