import { describe, expect, it } from "vitest";
import { DateTime, Duration, Equal, HashSet, Option, Schema } from "effect";
import * as Period from "./period.js";
import * as PlainDate from "./plain-date.js";
import * as PlainTime from "./plain-time.js";
import * as PlainDateTime from "./plain-date-time.js";
import * as PlainYearMonth from "./plain-year-month.js";
import * as PlainMonthDay from "./plain-month-day.js";

const date = (year: number, month: number, day: number) =>
  Option.getOrThrow(PlainDate.make({ year, month, day }));
const time = (hour: number, minute: number) =>
  Option.getOrThrow(PlainTime.make({ hour, minute }));
const period = (input: Period.PeriodInput) =>
  Option.getOrThrow(Period.make(input));

const decode = <A>(schema: Schema.Schema<A, string>, s: string) =>
  Option.map(Schema.decodeUnknownOption(schema)(s), (a) =>
    Schema.encodeSync(schema)(a),
  );

describe("PlainDate", () => {
  it("rejects dates that do not exist", () => {
    expect({
      feb29Leap: Option.isSome(
        PlainDate.make({ year: 2024, month: 2, day: 29 }),
      ),
      feb29Common: Option.isSome(
        PlainDate.make({ year: 2025, month: 2, day: 29 }),
      ),
      month13: Option.isSome(PlainDate.make({ year: 2025, month: 13, day: 1 })),
      fractional: Option.isSome(
        PlainDate.make({ year: 2025, month: 1, day: 1.5 }),
      ),
    }).toMatchInlineSnapshot(`
      {
        "feb29Common": false,
        "feb29Leap": true,
        "fractional": false,
        "month13": false,
      }
    `);
  });

  it("has structural equality and hash, usable as HashSet elements", () => {
    const set = HashSet.make(
      date(2026, 11, 2),
      date(2026, 11, 2),
      date(2026, 11, 3),
    );
    expect({
      equal: Equal.equals(date(2026, 11, 2), date(2026, 11, 2)),
      size: HashSet.size(set),
    }).toMatchInlineSnapshot(`
      {
        "equal": true,
        "size": 2,
      }
    `);
  });

  it("clamps the day when adding months past the end of the month", () => {
    const toIso = (d: PlainDate.PlainDate) =>
      Schema.encodeSync(PlainDate.FromString)(d);
    expect({
      jan31PlusMonth: toIso(
        PlainDate.addPeriod(date(2026, 1, 31), period({ months: 1 })),
      ),
      leapPlusYear: toIso(
        PlainDate.addPeriod(date(2024, 2, 29), period({ years: 1 })),
      ),
      minusWeek: toIso(
        PlainDate.addPeriod(date(2026, 1, 3), period({ weeks: -1 })),
      ),
    }).toMatchInlineSnapshot(`
      {
        "jan31PlusMonth": "2026-02-28",
        "leapPlusYear": "2025-02-28",
        "minusWeek": "2025-12-27",
      }
    `);
  });

  it("measures the period between dates and orders them", () => {
    expect({
      until: PlainDate.until(date(2024, 2, 29), date(2026, 11, 2)),
      less: PlainDate.Order(date(2026, 1, 1), date(2026, 1, 2)),
      dayOfWeek: PlainDate.dayOfWeek(date(2026, 11, 2)),
    }).toMatchInlineSnapshot(`
      {
        "dayOfWeek": 1,
        "less": -1,
        "until": Period {
          "_tag": "Period",
          "days": 4,
          "months": 8,
          "weeks": 0,
          "years": 2,
        },
      }
    `);
  });

  it("decodes only strict YYYY-MM-DD", () => {
    expect({
      ok: decode(PlainDate.FromString, "2026-11-02"),
      withTime: decode(PlainDate.FromString, "2026-11-02T10:00"),
      compact: decode(PlainDate.FromString, "20261102"),
      invalid: decode(PlainDate.FromString, "2025-02-29"),
    }).toMatchInlineSnapshot(`
      {
        "compact": {
          "_id": "Option",
          "_tag": "None",
        },
        "invalid": {
          "_id": "Option",
          "_tag": "None",
        },
        "ok": {
          "_id": "Option",
          "_tag": "Some",
          "value": "2026-11-02",
        },
        "withTime": {
          "_id": "Option",
          "_tag": "None",
        },
      }
    `);
  });
});

describe("Period", () => {
  it("rejects mixed signs and time components", () => {
    expect({
      mixed: Option.isSome(Period.make({ months: 1, days: -1 })),
      negative: decode(Period.FromString, "-P1M2D"),
      withTime: decode(Period.FromString, "P1DT2H"),
      empty: decode(Period.FromString, "P"),
    }).toMatchInlineSnapshot(`
      {
        "empty": {
          "_id": "Option",
          "_tag": "None",
        },
        "mixed": false,
        "negative": {
          "_id": "Option",
          "_tag": "Some",
          "value": "-P1M2D",
        },
        "withTime": {
          "_id": "Option",
          "_tag": "None",
        },
      }
    `);
  });
});

describe("PlainTime", () => {
  it("wraps around midnight and rejects infinite durations", () => {
    const toIso = (t: PlainTime.PlainTime) =>
      Schema.encodeSync(PlainTime.FromString)(t);
    expect({
      wrapped: Option.map(
        PlainTime.addDuration(time(23, 30), Duration.hours(1)),
        toIso,
      ),
      infinite: PlainTime.addDuration(time(23, 30), Duration.infinity),
      decoded: decode(PlainTime.FromString, "09:05:30.250"),
      outOfRange: decode(PlainTime.FromString, "24:00"),
    }).toMatchInlineSnapshot(`
      {
        "decoded": {
          "_id": "Option",
          "_tag": "Some",
          "value": "09:05:30.25",
        },
        "infinite": {
          "_id": "Option",
          "_tag": "None",
        },
        "outOfRange": {
          "_id": "Option",
          "_tag": "None",
        },
        "wrapped": {
          "_id": "Option",
          "_tag": "Some",
          "value": "00:30:00",
        },
      }
    `);
  });
});

describe("PlainDateTime", () => {
  it("converts to and from an effect zoned DateTime", () => {
    const local = PlainDateTime.make(date(2026, 11, 2), time(9, 0));
    const tokyo = DateTime.zoneUnsafeMakeNamed("Asia/Tokyo");
    const zoned = Option.getOrThrow(PlainDateTime.toZoned(local, tokyo));
    expect({
      utc: DateTime.formatIso(zoned),
      roundTrip: Equal.equals(PlainDateTime.fromZoned(zoned), local),
      iso: Schema.encodeSync(PlainDateTime.FromString)(local),
      withOffset: decode(PlainDateTime.FromString, "2026-11-02T09:00+09:00"),
    }).toMatchInlineSnapshot(`
      {
        "iso": "2026-11-02T09:00:00",
        "roundTrip": true,
        "utc": "2026-11-02T00:00:00.000Z",
        "withOffset": {
          "_id": "Option",
          "_tag": "None",
        },
      }
    `);
  });
});

describe("PlainYearMonth and PlainMonthDay", () => {
  it("builds dates only when the day exists", () => {
    const feb = Option.getOrThrow(
      PlainYearMonth.make({ year: 2025, month: 2 }),
    );
    const feb29 = Option.getOrThrow(PlainMonthDay.make({ month: 2, day: 29 }));
    expect({
      daysInFeb2025: PlainYearMonth.daysInMonth(feb),
      feb29In2025: Option.isSome(PlainMonthDay.toPlainDate(feb29, 2025)),
      feb29In2028: Option.isSome(PlainMonthDay.toPlainDate(feb29, 2028)),
      nextMonth: Schema.encodeSync(PlainYearMonth.FromString)(
        PlainYearMonth.addMonths(feb, 11),
      ),
      monthDay: decode(PlainMonthDay.FromString, "--02-29"),
      invalidMonthDay: decode(PlainMonthDay.FromString, "--02-30"),
    }).toMatchInlineSnapshot(`
      {
        "daysInFeb2025": 28,
        "feb29In2025": false,
        "feb29In2028": true,
        "invalidMonthDay": {
          "_id": "Option",
          "_tag": "None",
        },
        "monthDay": {
          "_id": "Option",
          "_tag": "Some",
          "value": "02-29",
        },
        "nextMonth": "2026-01",
      }
    `);
  });
});
