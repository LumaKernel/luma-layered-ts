import { Brand } from "effect";

/**
 * Text produced for display only: never parsed, compared by content, or decoded back.
 * Created only by display formatters in adapter (enforced by @luma-layered-ts/eslint-plugin codec-placement).
 * Rendered as is by UI components.
 */
export type DisplayText = string & Brand.Brand<"DisplayText">;

export const make: Brand.Constructor<DisplayText> =
  Brand.nominal<DisplayText>();
