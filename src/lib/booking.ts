// Shared rules for consultation bookings (client and server).
export const SLOTS = ["09:00", "11:00", "14:00", "16:00"] as const;
export type Slot = (typeof SLOTS)[number];

export const TOPICS = [
  { id: "concept", label: "Vehicle concept & packaging" },
  { id: "aero", label: "Aerodynamics & composites" },
  { id: "powertrain", label: "EV powertrain & electronics" },
  { id: "chassis", label: "Chassis, suspension & brakes" },
  { id: "other", label: "Something else" },
] as const;
export type TopicId = (typeof TOPICS)[number]["id"];

export const BOOK_DAYS_AHEAD = 30;

/** Today's date in Japan (YYYY-MM-DD). */
export function todayJst(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tokyo" }).format(now);
}

const addDays = (iso: string, n: number) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const weekday = (iso: string) => new Date(`${iso}T00:00:00Z`).getUTCDay();

/** Bookable dates: weekdays from tomorrow (JST) up to BOOK_DAYS_AHEAD days out. */
export function bookableDates(now = new Date()) {
  const start = todayJst(now);
  const out: string[] = [];
  for (let i = 1; i <= BOOK_DAYS_AHEAD; i++) {
    const d = addDays(start, i);
    const w = weekday(d);
    if (w !== 0 && w !== 6) out.push(d);
  }
  return out;
}

export const isBookableDate = (iso: string, now = new Date()) => bookableDates(now).includes(iso);

export const dateLabel = (iso: string, locale = "en-GB") =>
  new Intl.DateTimeFormat(locale, { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${iso}T00:00:00Z`));

export const JST_TZ = "Asia/Tokyo";

/** A JST slot shown in another time zone: "07:00", plus the local date when it falls on a different day. */
export function slotInZone(dateIso: string, slot: string, tz: string, locale = "en-GB") {
  const at = new Date(`${dateIso}T${slot}:00+09:00`);
  const time = new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(at);
  const localDay = new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(at);
  const day = localDay === dateIso ? null : new Intl.DateTimeFormat(locale, { timeZone: tz, weekday: "short", day: "numeric", month: "short" }).format(at);
  const shift = Math.round((Date.parse(localDay) - Date.parse(dateIso)) / 864e5); // -1: the evening before in that zone
  return { time, day, shift };
}

/** Short city name for a zone id: "Asia/Jakarta" -> "Jakarta". */
export const zoneCity = (tz: string) => tz.split("/").pop()!.replace(/_/g, " ");
