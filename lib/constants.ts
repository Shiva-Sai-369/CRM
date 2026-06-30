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
  [LEAD_STATUS.NEW_LEAD]: "bg-blue-100 text-blue-700",
  [LEAD_STATUS.CONTACTED]: "bg-purple-100 text-purple-700",
  [LEAD_STATUS.INTERESTED]: "bg-yellow-100 text-yellow-800",
  [LEAD_STATUS.QUALIFIED]: "bg-yellow-100 text-yellow-800",
  [LEAD_STATUS.PROPOSAL_SENT]: "bg-blue-100 text-blue-700",
  [LEAD_STATUS.NEGOTIATION]: "bg-gray-100 text-gray-700",
  [LEAD_STATUS.CONVERTED]: "bg-green-100 text-green-700",
  [LEAD_STATUS.LOST]: "bg-red-100 text-red-700",
  [LEAD_STATUS.NOT_INTERESTED]: "bg-gray-100 text-gray-700",
  [LEAD_STATUS.INVALID_NUMBER]: "bg-red-100 text-red-700",
  [LEAD_STATUS.FOLLOW_UP]: "bg-orange-100 text-orange-700",
  [LEAD_STATUS.ON_HOLD]: "bg-yellow-100 text-yellow-800",
  [LEAD_STATUS.NO_RESPONSE]: "bg-gray-100 text-gray-700",
  [LEAD_STATUS.DUPLICATE]: "bg-gray-100 text-gray-700",
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
