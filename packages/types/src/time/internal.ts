import { Option, ParseResult, Schema } from "effect";

// Temporal throws RangeError on invalid input; every constructor here returns Option instead.
export const attempt = <A>(f: () => A): Option.Option<A> =>
  Option.liftThrowable(f)();

export const sign = (n: number): -1 | 0 | 1 => (n < 0 ? -1 : n > 0 ? 1 : 0);

// Strict ISO 8601 string <-> canonical value. `pattern` rejects the looser forms Temporal accepts.
export const isoStringSchema = <A, I>(
  target: Schema.Schema<A, I>,
  label: string,
  pattern: RegExp,
  parse: (s: string) => Option.Option<A>,
  format: (a: A) => string,
): Schema.Schema<A, string> =>
  Schema.transformOrFail(Schema.String, Schema.typeSchema(target), {
    strict: true,
    decode: (s, _, ast) =>
      Option.match(pattern.test(s) ? parse(s) : Option.none(), {
        onNone: () =>
          ParseResult.fail(new ParseResult.Type(ast, s, `Expected ${label}`)),
        onSome: (a) => ParseResult.succeed(a),
      }),
    encode: (a) => ParseResult.succeed(format(a)),
  });
