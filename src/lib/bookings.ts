import { addMinutes, format, isAfter, isBefore, isSameDay, parseISO } from 'date-fns';

export type StationType = string;

export type Station = {
  id: string;
  name: string;
  type: StationType;
};

export type BookingStatus = 'upcoming' | 'in_progress' | 'completed' | 'cancelled';

export type Booking = {
  id: string;
  customer_id: string;
  customer_name: string;
  customer_phone: string;
  station_id: string;
  station_name: string;
  game_type: StationType;
  date: string; // YYYY-MM-DD
  start_time: string; // HH:mm
  duration_minutes: number;
  controllers?: number;
  vr_mode?: 'cricket' | 'adventure';
  vr_label?: string;
  notes?: string;
  created_at: string; // ISO
  created_by?: string;
  cancelled_at?: string; // ISO
};

export type Block = {
  id: string;
  station_id: string;
  station_name: string;
  date: string; // YYYY-MM-DD
  start_time: string; // HH:mm
  duration_minutes: number;
  reason?: string;
  created_at: string; // ISO
};

export type BookingOrBlock =
  | ({ kind: 'booking' } & Booking)
  | ({ kind: 'block' } & Block);

export type BookingSettings = {
  opening_time: string; // HH:mm
  closing_time: string; // HH:mm
  slot_minutes: number; // 15
};

export const DEFAULT_SETTINGS: BookingSettings = {
  opening_time: '10:00',
  closing_time: '23:00',
  slot_minutes: 15,
};

export const DEFAULT_STATIONS: Station[] = [
  { id: 'ps5-1', name: 'PS5 Unit 1', type: 'ps5' },
  { id: 'ps5-2', name: 'PS5 Unit 2', type: 'ps5' },
  { id: 'ps5-3', name: 'PS5 Unit 3', type: 'ps5' },
  { id: 'snooker-1', name: 'Snooker Table 1', type: 'snooker' },
  { id: 'snooker-2', name: 'Snooker Table 2', type: 'snooker' },
  { id: 'pool-1', name: 'Pool Table 1', type: 'pool' },
  { id: 'vr-1', name: 'VR Setup 1', type: 'vr' },
];

export function ymd(date: Date) {
  return format(date, 'yyyy-MM-dd');
}

export function combineDateTime(dateYmd: string, timeHHmm: string) {
  return parseISO(`${dateYmd}T${timeHHmm}:00`);
}

export function endDateTime(item: { date: string; start_time: string; duration_minutes: number }) {
  return addMinutes(combineDateTime(item.date, item.start_time), item.duration_minutes);
}

export function overlaps(
  a: { date: string; start_time: string; duration_minutes: number },
  b: { date: string; start_time: string; duration_minutes: number }
) {
  const aStart = combineDateTime(a.date, a.start_time);
  const aEnd = addMinutes(aStart, a.duration_minutes);
  const bStart = combineDateTime(b.date, b.start_time);
  const bEnd = addMinutes(bStart, b.duration_minutes);
  return aStart < bEnd && bStart < aEnd;
}

export function deriveStatus(booking: Booking, now = new Date()): BookingStatus {
  if (booking.cancelled_at) return 'cancelled';
  const start = combineDateTime(booking.date, booking.start_time);
  const end = addMinutes(start, booking.duration_minutes);
  if (isBefore(now, start)) return 'upcoming';
  if (isAfter(now, end)) return 'completed';
  return 'in_progress';
}

export function isPastDate(dateYmd: string, now = new Date()) {
  const d = parseISO(`${dateYmd}T00:00:00`);
  if (isSameDay(d, now)) return false;
  return isBefore(d, now);
}

