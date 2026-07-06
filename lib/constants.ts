/**
 * Application-wide constants for status values, tag values, and colors
 */

export const LEAD_STATUS = {
  NEW_LEAD: "New Lead",
  CONTACTED: "Contacted",
  INTERESTED: "Interested",
  QUALIFIED: "Qualified",
  PROPOSAL_SENT: "Proposal Sent",
  NEGOTIATION: "Negotiation",
  CONVERTED: "Converted",
  LOST: "Lost",
  NOT_INTERESTED: "Not Interested",
  INVALID_NUMBER: "Invalid Number",
  FOLLOW_UP: "Follow Up",
  ON_HOLD: "On Hold",
  NO_RESPONSE: "No Response",
  DUPLICATE: "Duplicate",
} as const;

export const LEAD_SOURCE = {
  FACEBOOK_MESSENGER: "Facebook Messenger",
  INSTAGRAM_DM: "Instagram DM",
  FACEBOOK_COMMENT: "Facebook Comment",
  MANUAL: "Manual",
} as const;

export const TAG = {
  LEAD: "Lead",
  CUSTOMER: "Customer",
  VIP: "VIP",
  FOLLOW_UP: "Follow-up",
} as const;

export const PLATFORM = {
  FACEBOOK: "Facebook",
  INSTAGRAM: "Instagram",
  MANUAL: "Manual",
} as const;

export const STATUS_COLORS: Record<string, string> = {
  // High Priority (Green shades) - Positive outcomes
  [LEAD_STATUS.CONVERTED]: "bg-green-100 text-green-700 border-green-500",
  [LEAD_STATUS.INTERESTED]: "bg-emerald-100 text-emerald-700 border-emerald-500",
  [LEAD_STATUS.QUALIFIED]: "bg-teal-100 text-teal-700 border-teal-500",
  
  // Medium-High Priority (Blue/Purple shades) - Active engagement
  [LEAD_STATUS.PROPOSAL_SENT]: "bg-blue-100 text-blue-700 border-blue-500",
  [LEAD_STATUS.NEGOTIATION]: "bg-indigo-100 text-indigo-700 border-indigo-500",
  [LEAD_STATUS.CONTACTED]: "bg-purple-100 text-purple-700 border-purple-500",
  [LEAD_STATUS.NEW_LEAD]: "bg-sky-100 text-sky-700 border-sky-500",
  
  // Medium Priority (Yellow/Orange shades) - Needs attention
  [LEAD_STATUS.FOLLOW_UP]: "bg-orange-100 text-orange-700 border-orange-500",
  [LEAD_STATUS.ON_HOLD]: "bg-yellow-100 text-yellow-800 border-yellow-500",
  
  // Low Priority (Gray/Red shades) - Negative or inactive
  [LEAD_STATUS.NO_RESPONSE]: "bg-slate-100 text-slate-700 border-slate-500",
  [LEAD_STATUS.NOT_INTERESTED]: "bg-gray-100 text-gray-700 border-gray-500",
  [LEAD_STATUS.LOST]: "bg-red-100 text-red-700 border-red-500",
  [LEAD_STATUS.INVALID_NUMBER]: "bg-rose-100 text-rose-700 border-rose-500",
  [LEAD_STATUS.DUPLICATE]: "bg-zinc-100 text-zinc-700 border-zinc-500",
};

export const TAG_COLORS: Record<string, string> = {
  [TAG.LEAD]: "bg-blue-100 text-blue-800",
  [TAG.CUSTOMER]: "bg-green-100 text-green-800",
  [TAG.VIP]: "bg-amber-100 text-amber-800",
  [TAG.FOLLOW_UP]: "bg-red-100 text-red-800",
};

export const PLATFORM_LABELS: Record<string, string> = {
  [PLATFORM.FACEBOOK]: "[FB]",
  [PLATFORM.INSTAGRAM]: "[IG]",
  [PLATFORM.MANUAL]: "[--]",
};

export const ROWS_PER_PAGE = 25;
