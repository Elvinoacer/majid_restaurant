/**
 * Operating-hours helper (PRD §5.2).
 *
 * Supports standard weekly hours (PRD §7.2 OperatingHours) plus one-off
 * overrides for holidays / Ramadan-style special hours.
 */
import { db } from "@/lib/db";

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export function dayName(dayOfWeek: number): string {
  return DAY_NAMES[dayOfWeek] ?? "Unknown";
}

export type HoursRow = {
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
  isClosed: boolean;
};

export type HoursOverrideRow = {
  date: Date;
  openTime: string | null;
  closeTime: string | null;
  isClosed: boolean;
  reason: string | null;
};

export type TodayHours = {
  isOpenNow: boolean;
  label: string; // "Open until 22:00" / "Closed — opens Mon 08:00" / "Closed today"
  today: { dayOfWeek: number; openTime: string; closeTime: string; isClosed: boolean };
  isOverridden: boolean;
  overrideReason?: string | null;
};

/**
 * Determine whether the restaurant is currently open and produce a friendly
 * label for the homepage / menu header.
 *
 * Algorithm:
 *   1. Look for an OperatingHoursOverride for the local date — overrides win.
 *   2. Otherwise fall back to the weekday's OperatingHours row.
 *   3. Compare `now` against openTime/closeTime as "HH:mm" strings.
 *   4. If closed today, find the next open day for the "opens Mon 08:00" hint.
 */
export function computeOpenStatus(
  weeklyHours: HoursRow[],
  overrides: HoursOverrideRow[],
  now: Date,
  tz: string = "Africa/Nairobi",
): TodayHours {
  // Use Intl to get the local day-of-week and time string inside the tz.
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const weekdayShort = get("weekday"); // "Mon", "Tue", ...
  const localTime = `${get("hour")}:${get("minute")}`; // "13:45"

  const dayMap: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  };
  const todayDow = dayMap[weekdayShort] ?? now.getDay();

  // Local date in YYYY-MM-DD for override lookup.
  const dateParts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const localDateStr = dateParts
    .map((p) => p.value)
    .join(""); // e.g. "2026-07-02"
  const localDate = new Date(`${localDateStr}T00:00:00Z`);

  const override = overrides.find((o) => sameLocalDay(o.date, localDate));
  if (override) {
    if (override.isClosed) {
      const nextOpen = findNextOpenDay(weeklyHours, todayDow);
      return {
        isOpenNow: false,
        label: `Closed today${override.reason ? ` (${override.reason})` : ""}${
          nextOpen ? ` — opens ${nextOpen}` : ""
        }`,
        today: {
          dayOfWeek: todayDow,
          openTime: "",
          closeTime: "",
          isClosed: true,
        },
        isOverridden: true,
        overrideReason: override.reason,
      };
    }
    if (override.openTime && override.closeTime) {
      const open = isInRange(localTime, override.openTime, override.closeTime);
      return {
        isOpenNow: open,
        label: open
          ? `Open until ${override.closeTime}${override.reason ? ` (${override.reason})` : ""}`
          : `Closed — opens today ${override.openTime}${
              override.reason ? ` (${override.reason})` : ""
            }`,
        today: {
          dayOfWeek: todayDow,
          openTime: override.openTime,
          closeTime: override.closeTime,
          isClosed: false,
        },
        isOverridden: true,
        overrideReason: override.reason,
      };
    }
  }

  const todayRow = weeklyHours.find((h) => h.dayOfWeek === todayDow);
  if (!todayRow || todayRow.isClosed) {
    const nextOpen = findNextOpenDay(weeklyHours, todayDow);
    return {
      isOpenNow: false,
      label: `Closed today${nextOpen ? ` — opens ${nextOpen}` : ""}`,
      today: {
        dayOfWeek: todayDow,
        openTime: "",
        closeTime: "",
        isClosed: true,
      },
      isOverridden: false,
    };
  }

  const open = isInRange(localTime, todayRow.openTime, todayRow.closeTime);
  return {
    isOpenNow: open,
    label: open
      ? `Open until ${todayRow.closeTime}`
      : `Closed — opens today ${todayRow.openTime}`,
    today: todayRow,
    isOverridden: false,
  };
}

function isInRange(time: string, open: string, close: string): boolean {
  return time >= open && time <= close;
}

function sameLocalDay(a: Date, b: Date): boolean {
  return a.toISOString().slice(0, 10) === b.toISOString().slice(0, 10);
}

function findNextOpenDay(weeklyHours: HoursRow[], todayDow: number): string | null {
  const sortedByDow = [...weeklyHours].sort((a, b) => a.dayOfWeek - b.dayOfWeek);
  // Start from tomorrow.
  for (let offset = 1; offset <= 7; offset++) {
    const dow = (todayDow + offset) % 7;
    const row = sortedByDow.find((h) => h.dayOfWeek === dow && !h.isClosed);
    if (row) {
      const shortName = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][dow];
      return `${shortName} ${row.openTime}`;
    }
  }
  return null;
}

/**
 * Fetch weekly hours + overrides for a restaurant, sorted for display.
 * Sunday (0) first.
 */
export async function fetchHoursForRestaurant(restaurantId: string) {
  const weekly = await db.operatingHours.findMany({
    where: { restaurantId },
    orderBy: { dayOfWeek: "asc" },
  });
  const overrides = await db.operatingHoursOverride.findMany({
    where: {
      restaurantId,
      date: { gte: new Date(Date.now() - 7 * 86400_000) },
    },
    orderBy: { date: "asc" },
  });
  return { weekly, overrides };
}
