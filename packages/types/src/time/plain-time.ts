import { Duration, Option, Order as Ord, Schema } from "effect";
import { Temporal } from "temporal-polyfill";
import { attempt, isoStringSchema, sign } from "./internal.js";

/** Wall-clock time without date or time zone, in milliseconds precision (same as effect DateTime). */
export class PlainTime extends Schema.TaggedClass<PlainTime>()("PlainTime", {
  hour: Schema.Int.pipe(Schema.between(0, 23)),
  minute: Schema.Int.pipe(Schema.between(0, 59)),
  second: Schema.Int.pipe(Schema.between(0, 59)),
  millisecond: Schema.Int.pipe(Schema.between(0, 999)),
}) {}

export type PlainTimeInput = Pick<PlainTime, "hour" | "minute"> &
  Partial<Pick<PlainTime, "second" | "millisecond">>;

export const make = (input: PlainTimeInput): Option.Option<PlainTime> =>
  attempt(
    () =>
      new PlainTime({
        hour: input.hour,
        minute: input.minute,
        second: input.second ?? 0,
        millisecond: input.millisecond ?? 0,
      }),
  );

export const midnight: PlainTime = new PlainTime({
  hour: 0,
  minute: 0,
  second: 0,
  millisecond: 0,
});

/** @internal */
export const toTemporal = (self: PlainTime): Temporal.PlainTime =>
  Temporal.PlainTime.from({
    hour: self.hour,
    minute: self.minute,
    second: self.second,
    millisecond: self.millisecond,
  });

/** @internal Sub-millisecond parts are truncated. */
export const fromTemporal = (t: Temporal.PlainTime): PlainTime =>
  new PlainTime({
    hour: t.hour,
    minute: t.minute,
    second: t.second,
    millisecond: t.millisecond,
  });

export const Order: Ord.Order<PlainTime> = Ord.make((a, b) =>
  sign(Temporal.PlainTime.compare(toTemporal(a), toTemporal(b))),
);

/** Adds an exact duration, wrapping around midnight. None for an infinite duration. */
export const addDuration = (
  self: PlainTime,
  duration: Duration.DurationInput,
): Option.Option<PlainTime> =>
  attempt(() =>
    fromTemporal(
      toTemporal(self).add({ milliseconds: Duration.toMillis(duration) }),
    ),
  );

/** `HH:MM`, `HH:MM:SS` or `HH:MM:SS.sss` */
export const FromString: Schema.Schema<PlainTime, string> = isoStringSchema(
  PlainTime,
  "an ISO 8601 time (HH:MM[:SS[.sss]])",
  /^\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?$/,
  (s) => attempt(() => fromTemporal(Temporal.PlainTime.from(s))),
  (t) => toTemporal(t).toString(),
);
