import { Option, Order as Ord, Schema } from "effect";
import { Temporal } from "temporal-polyfill";
import { attempt, isoStringSchema, sign } from "./internal.js";
import * as Period from "./period.js";

const fields = Schema.Struct({
  year: Schema.Int,
  month: Schema.Int.pipe(Schema.between(1, 12)),
  day: Schema.Int.pipe(Schema.between(1, 31)),
});

/** Calendar date without time or time zone (ISO 8601 calendar). */
export class PlainDate extends Schema.TaggedClass<PlainDate>()(
  "PlainDate",
  fields.pipe(
    Schema.filter(
      (f) =>
        Option.isSome(
          attempt(() => Temporal.PlainDate.from(f, { overflow: "reject" })),
        ),
      { message: () => "Not an existing calendar date" },
    ),
  ),
) {}

export type PlainDateInput = Pick<PlainDate, "year" | "month" | "day">;

export const make = (input: PlainDateInput): Option.Option<PlainDate> =>
  attempt(() => new PlainDate(input));

/** @internal */
export const toTemporal = (self: PlainDate): Temporal.PlainDate =>
  Temporal.PlainDate.from({
    year: self.year,
    month: self.month,
    day: self.day,
  });

/** @internal */
export const fromTemporal = (t: Temporal.PlainDate): PlainDate =>
  new PlainDate({ year: t.year, month: t.month, day: t.day });

export const Order: Ord.Order<PlainDate> = Ord.make((a, b) =>
  sign(Temporal.PlainDate.compare(toTemporal(a), toTemporal(b))),
);

/** Adds a calendar period. A day past the end of the month is clamped (Jan 31 + 1 month = Feb 28/29). */
export const addPeriod = (self: PlainDate, period: Period.Period): PlainDate =>
  fromTemporal(
    toTemporal(self).add(Period.toTemporal(period), { overflow: "constrain" }),
  );

/** Period from `self` to `other`, using years, months and days. */
export const until = (self: PlainDate, other: PlainDate): Period.Period =>
  Period.fromTemporal(
    toTemporal(self).until(toTemporal(other), { largestUnit: "years" }),
  );

/** ISO day of week: Monday = 1, ..., Sunday = 7. */
export const dayOfWeek = (self: PlainDate): number =>
  toTemporal(self).dayOfWeek;

/** `YYYY-MM-DD` */
export const FromString: Schema.Schema<PlainDate, string> = isoStringSchema(
  PlainDate,
  "an ISO 8601 date (YYYY-MM-DD)",
  /^\d{4}-\d{2}-\d{2}$/,
  (s) => attempt(() => fromTemporal(Temporal.PlainDate.from(s))),
  (d) => toTemporal(d).toString(),
);
