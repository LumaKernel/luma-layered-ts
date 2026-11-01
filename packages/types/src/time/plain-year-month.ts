import { Option, Order as Ord, Schema } from "effect";
import { Temporal } from "temporal-polyfill";
import { attempt, isoStringSchema, sign } from "./internal.js";
import * as PlainDate from "./plain-date.js";

/** Year and month (billing month, monthly report). */
export class PlainYearMonth extends Schema.TaggedClass<PlainYearMonth>()(
  "PlainYearMonth",
  {
    year: Schema.Int,
    month: Schema.Int.pipe(Schema.between(1, 12)),
  },
) {}

export type PlainYearMonthInput = Pick<PlainYearMonth, "year" | "month">;

export const make = (
  input: PlainYearMonthInput,
): Option.Option<PlainYearMonth> => attempt(() => new PlainYearMonth(input));

/** @internal */
export const toTemporal = (self: PlainYearMonth): Temporal.PlainYearMonth =>
  Temporal.PlainYearMonth.from({ year: self.year, month: self.month });

/** @internal */
export const fromTemporal = (t: Temporal.PlainYearMonth): PlainYearMonth =>
  new PlainYearMonth({ year: t.year, month: t.month });

export const Order: Ord.Order<PlainYearMonth> = Ord.make((a, b) =>
  sign(Temporal.PlainYearMonth.compare(toTemporal(a), toTemporal(b))),
);

export const addMonths = (
  self: PlainYearMonth,
  months: number,
): PlainYearMonth => fromTemporal(toTemporal(self).add({ months }));

export const daysInMonth = (self: PlainYearMonth): number =>
  toTemporal(self).daysInMonth;

/** None when `day` does not exist in the month. */
export const toPlainDate = (
  self: PlainYearMonth,
  day: number,
): Option.Option<PlainDate.PlainDate> =>
  PlainDate.make({ year: self.year, month: self.month, day });

/** `YYYY-MM` */
export const FromString: Schema.Schema<PlainYearMonth, string> =
  isoStringSchema(
    PlainYearMonth,
    "an ISO 8601 year-month (YYYY-MM)",
    /^\d{4}-\d{2}$/,
    (s) => attempt(() => fromTemporal(Temporal.PlainYearMonth.from(s))),
    (ym) => toTemporal(ym).toString(),
  );
