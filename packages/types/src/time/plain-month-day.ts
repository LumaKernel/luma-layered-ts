import { Option, Order as Ord, Schema } from "effect";
import { Temporal } from "temporal-polyfill";
import { attempt, intBetween, isoStringSchema } from "./internal.js";
import * as PlainDate from "./plain-date.js";

/** Month and day recurring every year (anniversary). February 29 is valid. */
export class PlainMonthDay extends Schema.TaggedClass<PlainMonthDay>()(
  "PlainMonthDay",
  Schema.Struct({
    month: intBetween(1, 12),
    day: intBetween(1, 31),
  }).pipe(
    Schema.check(
      Schema.makeFilter(
        (f) =>
          Option.isSome(
            attempt(() =>
              Temporal.PlainMonthDay.from(f, { overflow: "reject" }),
            ),
          ) || "Not an existing month-day",
      ),
    ),
  ),
) {}

export type PlainMonthDayInput = Pick<PlainMonthDay, "month" | "day">;

export const make = (input: PlainMonthDayInput): Option.Option<PlainMonthDay> =>
  attempt(() => new PlainMonthDay(input));

export const Order: Ord.Order<PlainMonthDay> = Ord.combine(
  Ord.mapInput(Ord.Number, (md: PlainMonthDay) => md.month),
  Ord.mapInput(Ord.Number, (md: PlainMonthDay) => md.day),
);

/** None when the day does not exist in `year` (February 29 in a common year). */
export const toPlainDate = (
  self: PlainMonthDay,
  year: number,
): Option.Option<PlainDate.PlainDate> =>
  PlainDate.make({ year, month: self.month, day: self.day });

/** `--MM-DD` or `MM-DD` (encodes as `MM-DD`) */
export const FromString: Schema.Codec<PlainMonthDay, string> = isoStringSchema(
  PlainMonthDay,
  "an ISO 8601 month-day (--MM-DD)",
  /^(--)?\d{2}-\d{2}$/,
  (s) =>
    attempt(() => {
      // PlainMonthDay has no month field; 1972 is a leap year, so February 29 survives
      const d = Temporal.PlainMonthDay.from(s).toPlainDate({ year: 1972 });
      return new PlainMonthDay({ month: d.month, day: d.day });
    }),
  (md) =>
    Temporal.PlainMonthDay.from({ month: md.month, day: md.day }).toString(),
);
