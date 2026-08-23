import { Temporal } from "@js-temporal/polyfill";
import { FortuneTellerError } from "./errors.mjs";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^(\d{2}):(\d{2})(?::(\d{2}))?$/;
const OFFSET_RE = /^[+-](?:0\d|1\d|2[0-3]):[0-5]\d$/;
const DISAMBIGUATIONS = new Set(["reject", "earlier", "later"]);

function finiteNumber(value, label, { min, max }) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < min || number > max) {
    throw new FortuneTellerError("INVALID_COORDINATE", `${label} must be between ${min} and ${max}`);
  }
  return number;
}

export function normalizeCoordinates(input = {}, { required = false, paired = false } = {}) {
  if (input.latitude == null && input.longitude == null && !required) return null;
  if ((required || paired) && (input.latitude == null || input.longitude == null)) {
    throw new FortuneTellerError("MISSING_COORDINATE", "latitude and longitude must be provided together");
  }
  return {
    ...(input.latitude == null ? {} : { latitude: finiteNumber(input.latitude, "latitude", { min: -90, max: 90 }) }),
    ...(input.longitude == null ? {} : { longitude: finiteNumber(input.longitude, "longitude", { min: -180, max: 180 }) }),
  };
}

export function normalizeDate(date) {
  if (typeof date !== "string" || !DATE_RE.test(date)) {
    throw new FortuneTellerError("INVALID_DATE", "date must use YYYY-MM-DD");
  }
  try {
    const parsed = Temporal.PlainDate.from(date, { overflow: "reject" });
    if (parsed.toString() !== date) throw new RangeError("date was normalized");
  } catch {
    throw new FortuneTellerError("INVALID_DATE", "calendar date is invalid");
  }
  return date;
}

export function normalizeTime(time) {
  if (time == null || time === "") return null;
  if (typeof time !== "string") {
    throw new FortuneTellerError("INVALID_TIME", "time must use HH:mm or HH:mm:ss");
  }
  const match = TIME_RE.exec(time);
  if (!match) throw new FortuneTellerError("INVALID_TIME", "time must use HH:mm or HH:mm:ss");
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  const second = Number(match[3] || 0);
  if (hour > 23 || minute > 59 || second > 59) {
    throw new FortuneTellerError("INVALID_TIME", "clock time is outside the valid range");
  }
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:${String(second).padStart(2, "0")}`;
}

export function normalizeBirthInput(input, { requireTime = false, requireCoordinates = false, requireCoordinatePair = false } = {}) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new FortuneTellerError("INVALID_INPUT", "input must be a JSON object");
  }
  const date = normalizeDate(input.date);
  const time = normalizeTime(input.time);
  if (requireTime && !time) {
    throw new FortuneTellerError("MISSING_TIME", "this calculation requires a birth time; use sensitivity mode when it is unknown");
  }
  const timezone = input.timezone;
  if (typeof timezone !== "string" || !timezone.trim()) {
    throw new FortuneTellerError("INVALID_TIMEZONE", "timezone must be an IANA name such as Asia/Shanghai");
  }
  if (OFFSET_RE.test(timezone)) {
    throw new FortuneTellerError("INVALID_TIMEZONE", "timezone must be a named IANA zone, not a fixed UTC offset");
  }
  try {
    Temporal.Now.zonedDateTimeISO(timezone);
  } catch {
    throw new FortuneTellerError("INVALID_TIMEZONE", "unknown IANA timezone");
  }
  const coordinates = normalizeCoordinates(input, { required: requireCoordinates, paired: requireCoordinatePair });
  const disambiguation = input.disambiguation || "reject";
  if (!DISAMBIGUATIONS.has(disambiguation)) {
    throw new FortuneTellerError("INVALID_DISAMBIGUATION", "disambiguation must be reject, earlier, or later");
  }
  if (!time && ["earlier", "later"].includes(disambiguation)) {
    throw new FortuneTellerError("INVALID_DISAMBIGUATION", "earlier/later disambiguation requires an exact local time");
  }
  if (input.utc_offset != null && (typeof input.utc_offset !== "string" || !OFFSET_RE.test(input.utc_offset))) {
    throw new FortuneTellerError("INVALID_UTC_OFFSET", "utc_offset must use a signed HH:mm value such as -04:00");
  }
  if (!time && input.utc_offset != null) {
    throw new FortuneTellerError("INVALID_UTC_OFFSET", "utc_offset requires an exact local time and cannot filter an unknown-time day scan");
  }
  if (input.utc_offset != null && ["earlier", "later"].includes(disambiguation)) {
    throw new FortuneTellerError(
      "CONFLICTING_TIME_RESOLUTION",
      "use either an explicit utc_offset or earlier/later overlap disambiguation, not both",
    );
  }
  return {
    date,
    time,
    timezone,
    disambiguation,
    ...(coordinates || {}),
    ...(input.utc_offset ? { utc_offset: input.utc_offset } : {}),
    ...(typeof input.place === "string" && input.place.trim() ? { place: input.place.trim() } : {}),
  };
}

export function localDateTime(birth) {
  if (!birth.time) return null;
  const offset = birth.utc_offset || "";
  const text = `${birth.date}T${birth.time}${offset}[${birth.timezone}]`;
  let zoned;
  try {
    zoned = Temporal.ZonedDateTime.from(text, {
      disambiguation: birth.disambiguation || "reject",
      offset: "reject",
      overflow: "reject",
    });
  } catch (error) {
    const code = birth.utc_offset ? "INVALID_LOCAL_TIME_OR_OFFSET" : "AMBIGUOUS_OR_NONEXISTENT_LOCAL_TIME";
    throw new FortuneTellerError(
      code,
      "the local date-time cannot be resolved in the named timezone",
      { guidance: "For a DST overlap choose disambiguation=earlier or later; never guess. For a DST gap correct the recorded time." },
    );
  }
  const requested = Temporal.PlainDateTime.from(`${birth.date}T${birth.time}`);
  if (!zoned.toPlainDateTime().equals(requested)) {
    throw new FortuneTellerError(
      "AMBIGUOUS_OR_NONEXISTENT_LOCAL_TIME",
      "the local clock time does not exist in the named timezone; earlier/later is only for repeated times, not gaps",
      { guidance: "Correct the recorded local time; do not shift a nonexistent clock time automatically." },
    );
  }
  return zoned;
}

export function equationOfTimeMinutes(utcDate) {
  const year = utcDate.getUTCFullYear();
  const start = Date.UTC(year, 0, 1);
  const currentDay = Date.UTC(year, utcDate.getUTCMonth(), utcDate.getUTCDate());
  const ordinal = Math.floor((currentDay - start) / 86_400_000) + 1;
  const fraction = (utcDate.getUTCHours() + utcDate.getUTCMinutes() / 60 + utcDate.getUTCSeconds() / 3600) / 24;
  const b = (2 * Math.PI * (ordinal + fraction - 81)) / 364;
  return 9.87 * Math.sin(2 * b) - 7.53 * Math.cos(b) - 1.5 * Math.sin(b);
}

export function resolveCalculationTime(birth, timeBasis = "civil") {
  const zoned = localDateTime(birth);
  if (!zoned) return null;
  return resolveZonedCalculationTime(zoned, birth, timeBasis);
}

export function resolveZonedCalculationTime(zoned, birth, timeBasis = "civil") {
  const instant = zoned.toInstant();
  if (timeBasis === "civil") {
    return {
      basis: "civil",
      local: zoned.toPlainDateTime(),
      zoned,
      utc_instant: instant,
      correction_minutes: 0,
      equation_of_time_minutes: 0,
      method: "IANA timezone conversion with explicit DST disambiguation",
    };
  }
  if (birth.longitude == null) {
    throw new FortuneTellerError("MISSING_LONGITUDE", `${timeBasis} time requires birthplace longitude`);
  }
  if (!new Set(["mean-solar", "apparent-solar"]).has(timeBasis)) {
    throw new FortuneTellerError("INVALID_PROFILE", `unsupported time_basis: ${timeBasis}`);
  }
  const utcDate = new Date(Number(instant.epochMilliseconds));
  const equation = timeBasis === "apparent-solar" ? equationOfTimeMinutes(utcDate) : 0;
  const longitudeShiftMinutes = birth.longitude * 4 + equation;
  const offsetMinutes = zoned.offsetNanoseconds / 60_000_000_000;
  const nominalEpoch = Number(instant.epochMilliseconds) + longitudeShiftMinutes * 60_000;
  const nominal = Temporal.Instant.fromEpochMilliseconds(Math.round(nominalEpoch))
    .toZonedDateTimeISO("UTC")
    .toPlainDateTime();
  return {
    basis: timeBasis,
    local: nominal,
    zoned,
    utc_instant: instant,
    correction_minutes: longitudeShiftMinutes - offsetMinutes,
    equation_of_time_minutes: equation,
    method:
      timeBasis === "apparent-solar"
        ? "UTC + longitude × 4 min/degree + approximate equation of time"
        : "UTC + longitude × 4 min/degree",
  };
}

export function serializeResolvedTime(resolved, disambiguation = "reject") {
  if (!resolved) return null;
  return {
    basis: resolved.basis,
    calculation_local: resolved.local.toString({ smallestUnit: "second" }),
    utc_instant: resolved.utc_instant.toString({ smallestUnit: "second" }),
    utc_offset: resolved.zoned.offset,
    disambiguation,
    correction_minutes: Number(resolved.correction_minutes.toFixed(3)),
    equation_of_time_minutes: Number(resolved.equation_of_time_minutes.toFixed(3)),
    method: resolved.method,
  };
}

export function civilDayBounds(birth) {
  const start = Temporal.ZonedDateTime.from(`${birth.date}T00:00[${birth.timezone}]`, {
    disambiguation: "compatible",
    overflow: "reject",
  }).startOfDay();
  if (start.toPlainDate().toString() !== birth.date) {
    throw new FortuneTellerError("NONEXISTENT_CIVIL_DATE", "the civil date does not exist in the selected timezone");
  }
  const next = start.add({ days: 1 }).startOfDay();
  return { start, end: next.subtract({ nanoseconds: 1 }) };
}

export function hourToZiweiIndex(hour) {
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) {
    throw new FortuneTellerError("INVALID_TIME", "hour must be an integer from 0 through 23");
  }
  if (hour === 23) return 12;
  if (hour === 0) return 0;
  return Math.floor((hour + 1) / 2);
}
