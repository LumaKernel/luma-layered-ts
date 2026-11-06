import { Option, Schema } from "effect";
import { Temporal } from "temporal-polyfill";
import { attempt, isoStringSchema } from "./internal.js";

/**
 * Calendar period: years, months, weeks and days, whose length depends on the date it is applied to.
 * Exact lengths of time are `Duration` from effect; the two are kept as separate types.
 */
export class Period extends Schema.TaggedClass<Period>()(
  "Period",
  Schema.Struct({
    years: Schema.Int,
    months: Schema.Int,
    weeks: Schema.Int,
    days: Schema.Int,
  }).pipe(
    Schema.check(
      Schema.makeFilter(
        ({ years, months, weeks, days }) =>
          [years, months, weeks, days].every((n) => n >= 0) ||
          [years, months, weeks, days].every((n) => n <= 0) ||
          "Period fields must not mix signs",
      ),
    ),
  ),
) {}

export type PeriodInput = Partial<
  Pick<Period, "years" | "months" | "weeks" | "days">
>;

export const make = (input: PeriodInput): Option.Option<Period> =>
  attempt(
    () =>
      new Period({
        years: input.years ?? 0,
        months: input.months ?? 0,
        weeks: input.weeks ?? 0,
        days: input.days ?? 0,
      }),
  );

export const zero: Period = new Period({
  years: 0,
  months: 0,
  weeks: 0,
  days: 0,
});

export const negate = (self: Period): Period =>
  new Period({
    years: -self.years,
    months: -self.months,
    weeks: -self.weeks,
    days: -self.days,
  });

export const isZero = (self: Period): boolean =>
  self.years === 0 && self.months === 0 && self.weeks === 0 && self.days === 0;

/** @internal */
export const toTemporal = (self: Period): Temporal.Duration =>
  Temporal.Duration.from({
    years: self.years,
    months: self.months,
    weeks: self.weeks,
    days: self.days,
  });

/** @internal */
export const fromTemporal = (d: Temporal.Duration): Period =>
  new Period({
    years: d.years,
    months: d.months,
    weeks: d.weeks,
    days: d.days,
  });

/** ISO 8601 date-based duration: `P1Y2M`, `P3W`, `-P10D`. Time components are rejected. */
export const FromString: Schema.Codec<Period, string> = isoStringSchema(
  Period,
  "an ISO 8601 period (PnYnMnWnD)",
  /^-?P(?=\d)(\d+Y)?(\d+M)?(\d+W)?(\d+D)?$/,
  (s) => attempt(() => fromTemporal(Temporal.Duration.from(s))),
  (p) => toTemporal(p).toString(),
);
