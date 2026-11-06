import {
  Effect,
  Option,
  Schema,
  SchemaIssue,
  SchemaTransformation,
} from "effect";

// Temporal throws RangeError on invalid input; every constructor here returns Option instead.
export const attempt = <A>(f: () => A): Option.Option<A> =>
  Option.liftThrowable(f)();

export const sign = (n: number): -1 | 0 | 1 => (n < 0 ? -1 : n > 0 ? 1 : 0);

export const intBetween = (minimum: number, maximum: number) =>
  Schema.Int.pipe(Schema.check(Schema.isBetween({ minimum, maximum })));

// Strict ISO 8601 string <-> canonical value. `pattern` rejects the looser forms Temporal accepts.
export const isoStringSchema = <A>(
  target: Schema.Codec<A, unknown>,
  label: string,
  pattern: RegExp,
  parse: (s: string) => Option.Option<A>,
  format: (a: A) => string,
): Schema.Codec<A, string> =>
  Schema.String.pipe(
    Schema.decodeTo(
      Schema.toType(target),
      SchemaTransformation.transformEffect({
        decode: (s: string, options) =>
          Option.match(pattern.test(s) ? parse(s) : Option.none(), {
            onNone: () =>
              Effect.fail(
                new SchemaIssue.InvalidValue(
                  { message: `Expected ${label}` },
                  s,
                  options,
                ),
              ),
            onSome: (a) => Effect.succeed(a),
          }),
        encode: (a: A) => Effect.succeed(format(a)),
      }),
    ),
  );
