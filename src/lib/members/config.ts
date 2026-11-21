/** Client-safe constants for the holder-gated members area. */
export const ANCHOR_MINT = "3jhApg98ukHe2EZFDsZ92J2KhMuMY5CW3NpCdt5spump";
export const ANCHOR_PUMP_URL = `https://pump.fun/${ANCHOR_MINT}`;
export const ANCHOR_SITE_URL = "https://anchortoken.vip";
export const RUG_CHECK_URL = "https://rugcheck.memecoindev.vip";

/**
 * Whole $ANCHOR tokens required to enter /members. The single code constant for the
 * gate; ANCHOR_MIN_BALANCE can override it without a code change.
 */
export const DEFAULT_MIN_BALANCE = 5_000;

/** Signed-in session length. */
export const SESSION_TTL_MS = 24 * 60 * 60 * 1000;
/** How often the $ANCHOR balance is re-read while a session is live. */
export const RECHECK_INTERVAL_MS = 60 * 60 * 1000;
/** How long a sign-in nonce stays valid. */
export const NONCE_TTL_MS = 5 * 60 * 1000;

export const SESSION_COOKIE = "mcd_members";

/** minBalance is always a whole-token count (DEFAULT_MIN_BALANCE or ANCHOR_MIN_BALANCE). */
export type MembersState =
  | { status: "disabled"; minBalance: number }
  | { status: "signed_out"; minBalance: number }
  | {
      status: "not_holder";
      minBalance: number;
      address: string;
      balance: string;
    }
  | {
      status: "holder";
      minBalance: number;
      address: string;
      balance: string;
      checkedAt: number;
      expiresAt: number;
      recheckFailed?: boolean;
      owner?: boolean;
    };

export function shortAddress(address: string): string {
  return address.length > 10 ? `${address.slice(0, 4)}…${address.slice(-4)}` : address;
}
