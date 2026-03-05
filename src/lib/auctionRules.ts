/**
 * IPL Auction Rules Engine
 *
 * Official IPL mega-auction constraints:
 *  - Max squad size: 25 players
 *  - Min squad size: 18 players (for completion check)
 *  - Max overseas players: 8 per team
 *  - Purse: ₹100 Cr (default, configurable per room)
 *  - Must reserve enough to fill remaining min-squad slots at ₹20L each
 *  - Bid increments follow official IPL tiers
 */

import type { Tables } from "@/integrations/supabase/types";

type Player = Tables<"players">;
type Participant = Tables<"participants">;

// ── Constants ──

export const MAX_SQUAD_SIZE = 25;
export const MIN_SQUAD_SIZE = 18;
export const MAX_OVERSEAS = 8;
export const MIN_BID_PRICE = 2_000_000; // ₹20 Lakh — minimum price to fill a slot

// ── Bid Increment Tiers (official IPL rules) ──

export function getBidIncrement(currentBid: number): number {
  if (currentBid < 10_000_000) return 500_000;       // Up to 1 Cr     → +5 Lakh
  if (currentBid < 50_000_000) return 1_000_000;      // 1Cr – 5Cr     → +10 Lakh (reduced per simplicity)
  if (currentBid < 100_000_000) return 2_500_000;     // 5Cr – 10Cr    → +25 Lakh
  if (currentBid < 200_000_000) return 5_000_000;     // 10Cr – 20Cr   → +50 Lakh
  return 10_000_000;                                   // 20Cr+          → +1 Cr
}

// ── Team Analysis ──

export interface TeamSquadInfo {
  teamCode: string;
  totalPlayers: number;
  overseasCount: number;
  indianCount: number;
  slotsRemaining: number;
  overseasSlotsRemaining: number;
  purseLeft: number;
  /** Minimum purse required to fill remaining squad to MIN_SQUAD_SIZE */
  minPurseReserved: number;
  /** Effective money available for bidding = purse - reserved */
  effectivePurse: number;
  canBidAtAll: boolean;
  squadFull: boolean;
}

export function getTeamSquadInfo(
  teamCode: string,
  soldPlayers: Player[],
  participant: Participant | undefined,
): TeamSquadInfo {
  const teamPlayers = soldPlayers.filter((p) => p.sold_to_team === teamCode);
  const totalPlayers = teamPlayers.length;
  const overseasCount = teamPlayers.filter((p) => p.nationality !== "India").length;
  const indianCount = totalPlayers - overseasCount;
  const slotsRemaining = MAX_SQUAD_SIZE - totalPlayers;
  const overseasSlotsRemaining = MAX_OVERSEAS - overseasCount;
  const purseLeft = participant?.purse_left || 0;

  // Must keep enough to fill remaining min-squad slots (excluding current)
  const slotsNeededForMin = Math.max(0, MIN_SQUAD_SIZE - totalPlayers - 1); // -1 because this bid fills one slot
  const minPurseReserved = slotsNeededForMin * MIN_BID_PRICE;
  const effectivePurse = Math.max(0, purseLeft - minPurseReserved);

  const squadFull = totalPlayers >= MAX_SQUAD_SIZE;
  const canBidAtAll = !squadFull && purseLeft > MIN_BID_PRICE;

  return {
    teamCode,
    totalPlayers,
    overseasCount,
    indianCount,
    slotsRemaining,
    overseasSlotsRemaining,
    purseLeft,
    minPurseReserved,
    effectivePurse,
    canBidAtAll,
    squadFull,
  };
}

// ── Bid Validation ──

export interface BidValidation {
  canBid: boolean;
  reason: string | null;
}

export function validateBid(
  squadInfo: TeamSquadInfo,
  currentPlayer: Player | null,
  bidAmount: number,
  currentBidderTeam: string | null,
): BidValidation {
  if (!currentPlayer) {
    return { canBid: false, reason: "No player in auction" };
  }

  if (squadInfo.teamCode === currentBidderTeam) {
    return { canBid: false, reason: "Already highest bidder" };
  }

  if (squadInfo.squadFull) {
    return { canBid: false, reason: `Squad full (${MAX_SQUAD_SIZE}/${MAX_SQUAD_SIZE})` };
  }

  // Overseas check
  const isOverseas = currentPlayer.nationality !== "India";
  if (isOverseas && squadInfo.overseasSlotsRemaining <= 0) {
    return { canBid: false, reason: `Max overseas reached (${MAX_OVERSEAS}/${MAX_OVERSEAS})` };
  }

  // Purse check — must afford the bid AND still fill remaining squad
  if (bidAmount > squadInfo.effectivePurse) {
    if (bidAmount > squadInfo.purseLeft) {
      return { canBid: false, reason: "Not enough purse" };
    }
    return { canBid: false, reason: "Must reserve purse for remaining squad slots" };
  }

  return { canBid: true, reason: null };
}

// ── Accelerated Auction ──

/**
 * In accelerated auction, unsold players return at a reduced base price.
 * Official rule: base price drops to ₹20L for all unsold players.
 */
export function getAcceleratedBasePrice(_originalBase: number): number {
  return MIN_BID_PRICE;
}

// ── Format helpers ──

export function formatSquadCount(info: TeamSquadInfo): string {
  return `${info.totalPlayers}/${MAX_SQUAD_SIZE}`;
}

export function formatOverseasCount(info: TeamSquadInfo): string {
  return `${info.overseasCount}/${MAX_OVERSEAS}`;
}
