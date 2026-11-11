// Shared rules for consultation bookings (client and server).
export const SLOTS = ["09:00", "11:00", "14:00", "16:00"] as const;
export type Slot = (typeof SLOTS)[number];

// Consulting topics from the SPD (11 Nov). Old ids stay valid for existing bookings (see OLD_TOPICS).
export const TOPICS = [
  { id: "inspection", label: "Technical inspection readiness" },
  { id: "electrical", label: "Electrical systems & PCB design" },
  { id: "powertrain", label: "EV powertrain, VCU & BMS" },
  { id: "compliance", label: "Documentation & rules compliance" },
  { id: "design", label: "Design review & part modifications" },
  { id: "other", label: "Something else" },
] as const;
const OLD_TOPICS = [
  { id: "concept", label: "Vehicle concept & packaging" },
  { id: "aero", label: "Aerodynamics & composites" },
  { id: "chassis", label: "Chassis, suspension & brakes" },
];
/** Display label for a stored topic id, including ids from before the SPD update. */
export const topicLabel = (id: string) => [...TOPICS, ...OLD_TOPICS].find((x) => x.id === id)?.label ?? id;

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

/** "UTC+7", "UTC+5:30", "UTC+9" for a zone at a given moment (daylight saving included). */
export function utcOffset(tz: string, at = new Date()) {
  const n = new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "shortOffset" }).formatToParts(at).find((p) => p.type === "timeZoneName")?.value ?? "GMT";
  return n === "GMT" ? "UTC+0" : n.replace("GMT", "UTC");
}

// Short list for the time zone picker: our shipping region plus a few big ones. The visitor's own zone is added if missing.
export const ZONES = [
  "Asia/Tokyo", "Asia/Seoul", "Asia/Shanghai", "Asia/Hong_Kong", "Asia/Taipei", "Asia/Manila", "Asia/Singapore", "Asia/Kuala_Lumpur",
  "Asia/Makassar", "Asia/Jakarta", "Asia/Bangkok", "Asia/Ho_Chi_Minh", "Asia/Dhaka", "Asia/Kathmandu", "Asia/Kolkata", "Asia/Karachi",
  "Asia/Ulaanbaatar", "Australia/Sydney", "Europe/London", "Europe/Berlin", "America/New_York", "America/Los_Angeles",
] as const;
