import { DateTime, Duration, Option, Order as Ord, Schema } from "effect";
import { Temporal } from "temporal-polyfill";
import { attempt, isoStringSchema, sign } from "./internal.js";
import * as Period from "./period.js";
import * as PlainDate from "./plain-date.js";
import * as PlainTime from "./plain-time.js";

/** Date and wall-clock time without time zone. Becomes an instant only with a time zone (toZoned). */
export class PlainDateTime extends Schema.TaggedClass<PlainDateTime>()(
  "PlainDateTime",
  { date: PlainDate.PlainDate, time: PlainTime.PlainTime },
) {}

export const make = (
  date: PlainDate.PlainDate,
  time: PlainTime.PlainTime,
): PlainDateTime => new PlainDateTime({ date, time });

/** @internal */
export const toTemporal = (self: PlainDateTime): Temporal.PlainDateTime =>
  PlainDate.toTemporal(self.date).toPlainDateTime(
    PlainTime.toTemporal(self.time),
  );

/** @internal */
export const fromTemporal = (t: Temporal.PlainDateTime): PlainDateTime =>
  make(
    PlainDate.fromTemporal(t.toPlainDate()),
    PlainTime.fromTemporal(t.toPlainTime()),
  );

export const Order: Ord.Order<PlainDateTime> = Ord.make((a, b) =>
  sign(Temporal.PlainDateTime.compare(toTemporal(a), toTemporal(b))),
);

export const addPeriod = (
  self: PlainDateTime,
  period: Period.Period,
): PlainDateTime =>
  fromTemporal(
    toTemporal(self).add(Period.toTemporal(period), { overflow: "constrain" }),
  );

/** Adds an exact duration as wall-clock arithmetic (no time zone, so no DST). None for an infinite duration. */
export const addDuration = (
  self: PlainDateTime,
  duration: Duration.DurationInput,
): Option.Option<PlainDateTime> =>
  attempt(() =>
    fromTemporal(
      toTemporal(self).add({ milliseconds: Duration.toMillis(duration) }),
    ),
  );

/**
 * The instant at which this wall-clock time occurs in `timeZone`.
 * Time zone rules come from the runtime; compute it in one environment and pass the result on.
 */
export const toZoned = (
  self: PlainDateTime,
  timeZone: DateTime.TimeZone,
  disambiguation?: DateTime.Disambiguation,
): Option.Option<DateTime.Zoned> =>
  DateTime.makeZoned(
    {
      year: self.date.year,
      month: self.date.month,
      day: self.date.day,
      hours: self.time.hour,
      minutes: self.time.minute,
      seconds: self.time.second,
      millis: self.time.millisecond,
    },
    { timeZone, adjustForTimeZone: true, disambiguation },
  );

/** Wall-clock date and time of a zoned instant. */
export const fromZoned = (zoned: DateTime.Zoned): PlainDateTime => {
  const parts = DateTime.toParts(zoned);
  return make(
    new PlainDate.PlainDate({
      year: parts.year,
      month: parts.month,
      day: parts.day,
    }),
    new PlainTime.PlainTime({
      hour: parts.hours,
      minute: parts.minutes,
      second: parts.seconds,
      millisecond: parts.millis,
    }),
  );
};

/** `YYYY-MM-DDTHH:MM[:SS[.sss]]` */
export const FromString: Schema.Schema<PlainDateTime, string> = isoStringSchema(
  PlainDateTime,
  "an ISO 8601 date-time without offset (YYYY-MM-DDTHH:MM[:SS[.sss]])",
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?$/,
  (s) => attempt(() => fromTemporal(Temporal.PlainDateTime.from(s))),
  (dt) => toTemporal(dt).toString(),
);
