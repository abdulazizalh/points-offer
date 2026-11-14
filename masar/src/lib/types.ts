// Shared domain model. Mirrors the PostgreSQL schema in /supabase/migrations.

export type Locale = "ar" | "en";
export type L10n = { ar: string; en: string };

export type UserRole = "customer" | "business_owner" | "business_staff" | "admin";
export type AdminRole = "super_admin" | "moderator" | "support";
export type AccountStatus = "active" | "suspended";

export interface User {
  id: string;
  name: string;
  phone: string;
  email?: string;
  locale: Locale;
  role: UserRole;
  adminRole?: AdminRole;
  businessId?: string;
  avatarHue: number;
  status: AccountStatus;
  createdAt: number;
  savedLocations: SavedLocation[];
  prefs: NotificationPrefs;
  passwordHash?: string; // demo mode only; production auth is handled by Supabase Auth
}

export interface SavedLocation {
  id: string;
  label: string;
  areaId: string;
}

export interface NotificationPrefs {
  inApp: true;
  push: boolean;
  sms: boolean;
  whatsapp: boolean;
  approachingAt: number; // notify when this many people are ahead
}

export type QueueType = "standard" | "appointment" | "timed_entry" | "walk_in" | "healthcare";

export interface Category {
  id: string;
  slug: string;
  name: L10n;
  icon: string; // lucide icon key, see components/CategoryIcon
  defaultQueueType: QueueType;
  active: boolean;
  sort: number;
}

export type VerificationStatus = "pending" | "verified" | "rejected" | "suspended";

export interface Business {
  id: string;
  name: L10n;
  description: L10n;
  categoryId: string;
  ownerId: string;
  hue: number; // brand tint for generated logo
  initials: string;
  phone: string;
  email: string;
  crNumber: string; // commercial registration
  verification: VerificationStatus;
  isDemo: boolean;
  createdAt: number;
}

export interface OperatingHours {
  day: number; // 0 = Sunday
  open: string; // "08:00"
  close: string; // "22:00"
  closed: boolean;
}

export interface Area {
  id: string;
  name: L10n;
  governorate: L10n;
  lat: number;
  lng: number;
}

export interface Branch {
  id: string;
  businessId: string;
  name: L10n;
  areaId: string;
  address: L10n;
  lat: number;
  lng: number;
  phone: string;
  hours: OperatingHours[];
  active: boolean;
  queueType: QueueType;
  remoteBooking: boolean;
  allowPostpone: boolean;
  postponePositions: number; // how many places a postponed ticket moves back
  maxQueue: number;
  checkinSecret: string; // rotates the on-site check-in code; never sent to customers in production
  slotMinutes?: number; // timed entry / appointment
  slotCapacity?: number;
}

export interface Service {
  id: string;
  businessId: string;
  branchIds: string[];
  name: L10n;
  description: L10n;
  durationMin: number;
  prefix: string; // ticket prefix, e.g. "A"
  active: boolean;
  remoteBooking: boolean;
  queueType?: QueueType; // overrides the branch default (e.g. clinic appointments vs. walk-in queue)
  maxQueue?: number;
}

export interface Employee {
  id: string;
  businessId: string;
  branchId: string;
  name: string;
  title: L10n;
  serviceIds: string[];
  counter: string;
  active: boolean;
  clinical: boolean; // authorised to set medical priority
  servedToday: number;
  avgServiceMin: number;
  rating: number;
}

export type TicketStatus =
  | "WAITING"
  | "CALLED"
  | "ARRIVED"
  | "IN_SERVICE"
  | "COMPLETED"
  | "CANCELLED"
  | "NO_SHOW"
  | "SKIPPED";

export const ACTIVE_STATUSES: TicketStatus[] = ["WAITING", "ARRIVED", "CALLED", "IN_SERVICE"];
export const LINE_STATUSES: TicketStatus[] = ["WAITING", "ARRIVED"];

export type TicketChannel = "remote" | "onsite_qr" | "walk_in";

export interface QueueSession {
  id: string;
  branchId: string;
  date: string; // YYYY-MM-DD (Asia/Kuwait)
  status: "open" | "paused" | "closed";
  seqByPrefix: Record<string, number>;
}

export interface Ticket {
  id: string;
  sessionId: string;
  branchId: string;
  businessId: string;
  serviceId: string;
  userId: string | null;
  guestLabel?: string; // walk-ins / demo customers
  number: string; // "A-024"
  sortKey: number;
  status: TicketStatus;
  channel: TicketChannel;
  queueType: QueueType;
  createdAt: number;
  arrivedAt?: number;
  calledAt?: number;
  startedAt?: number;
  endedAt?: number;
  postponed: boolean;
  priority: boolean; // set only by clinical staff (healthcare)
  employeeId?: string;
  counter?: string;
  slotStart?: number; // timed entry / appointment time
  estimateAtBooking: [number, number];
  notified: number[]; // thresholds already notified
  reviewed: boolean;
  isDemo: boolean;
}

export type QueueEventType =
  | "CREATED"
  | "ARRIVED"
  | "CALLED"
  | "STARTED"
  | "COMPLETED"
  | "CANCELLED"
  | "NO_SHOW"
  | "SKIPPED"
  | "POSTPONED"
  | "PRIORITISED"
  | "RECALLED";

export interface QueueEvent {
  id: string;
  ticketId: string;
  sessionId: string;
  branchId: string;
  type: QueueEventType;
  from?: TicketStatus;
  to?: TicketStatus;
  actorId: string | null;
  actorRole: UserRole | "system";
  at: number;
  note?: string;
}

export type NotificationType =
  | "BOOKING_CONFIRMED"
  | "QUEUE_UPDATED"
  | "TURN_APPROACHING"
  | "FIVE_AHEAD"
  | "TURN_NEXT"
  | "CONFIRM_ARRIVAL"
  | "CALLED"
  | "BOOKING_CANCELLED"
  | "SERVICE_COMPLETED"
  | "POSTPONED"
  | "SKIPPED";

export type ChannelDelivery = "delivered" | "sent" | "not_enabled" | "not_configured" | "failed" | "pending";

export interface AppNotification {
  id: string;
  userId: string;
  ticketId?: string;
  type: NotificationType;
  vars: Record<string, string | number>;
  at: number;
  read: boolean;
  delivery: { inApp: ChannelDelivery; push: ChannelDelivery; sms: ChannelDelivery; whatsapp: ChannelDelivery };
}

export interface Review {
  id: string;
  ticketId: string;
  userId: string;
  businessId: string;
  branchId: string;
  rating: number;
  waitRating: number;
  serviceRating: number;
  text: string;
  at: number;
  hidden: boolean;
  authorName: string;
}

export interface Favorite {
  userId: string;
  kind: "branch" | "service";
  refId: string;
}

export interface Report {
  id: string;
  kind: "complaint" | "review_flag" | "abuse" | "bug";
  businessId?: string;
  reviewId?: string;
  userId: string;
  text: string;
  status: "open" | "resolved" | "dismissed";
  at: number;
}

export interface AuditLog {
  id: string;
  actorId: string;
  actorLabel: string;
  action: string;
  target: string;
  at: number;
  note?: string;
}

export interface SupportMessage {
  id: string;
  userId: string;
  topic: string;
  text: string;
  at: number;
}

export interface DB {
  version: number;
  areas: Area[];
  users: User[];
  categories: Category[];
  businesses: Business[];
  branches: Branch[];
  services: Service[];
  employees: Employee[];
  sessions: QueueSession[];
  tickets: Ticket[];
  events: QueueEvent[];
  notifications: AppNotification[];
  reviews: Review[];
  favorites: Favorite[];
  reports: Report[];
  audit: AuditLog[];
  support: SupportMessage[];
  recentBranchIds: string[];
}

export interface Actor {
  id: string | null;
  role: UserRole | "system";
  adminRole?: AdminRole;
  businessId?: string;
  clinical?: boolean;
}

export type Result<T = undefined> = { ok: true; data: T } | { ok: false; error: ErrorCode };

export type ErrorCode =
  | "not_found"
  | "forbidden"
  | "invalid_state"
  | "duplicate_active_ticket"
  | "queue_full"
  | "remote_booking_disabled"
  | "branch_closed"
  | "already_postponed"
  | "postpone_disabled"
  | "invalid_checkin_code"
  | "slot_full"
  | "not_verified"
  | "account_suspended"
  | "review_not_allowed"
  | "network";
