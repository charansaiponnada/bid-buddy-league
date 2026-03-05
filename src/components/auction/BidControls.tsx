import { formatPrice, getBidIncrement } from "@/lib/auction";
import { MAX_SQUAD_SIZE, MAX_OVERSEAS, type TeamSquadInfo } from "@/lib/auctionRules";
import { Button } from "@/components/ui/button";
import type { Tables } from "@/integrations/supabase/types";

type Player = Tables<"players">;

interface BidControlsProps {
  currentBid: number;
  canBid: boolean;
  onBid: () => void;
  myTeam: string | null;
  currentBidderTeam: string | null;
  purseLeft: number;
  isBidding: boolean;
  squadInfo: TeamSquadInfo | null;
  bidBlockedReason: string | null;
  currentPlayer: Player | null;
}

const BidControls = ({
  currentBid,
  canBid,
  onBid,
  myTeam,
  currentBidderTeam,
  purseLeft,
  isBidding,
  squadInfo,
  bidBlockedReason,
  currentPlayer,
}: BidControlsProps) => {
  const increment = getBidIncrement(currentBid);
  const nextBid = currentBid + increment;
  const isHighestBidder = myTeam && myTeam === currentBidderTeam;
  const isOverseas = currentPlayer && currentPlayer.nationality !== "India";

  // Determine button label
  let buttonLabel = `🏏 Bid ${formatPrice(nextBid)}`;
  if (isHighestBidder) {
    buttonLabel = "✅ You're Winning!";
  } else if (bidBlockedReason) {
    if (bidBlockedReason.includes("overseas")) {
      buttonLabel = `🌍 Overseas Full (${MAX_OVERSEAS}/${MAX_OVERSEAS})`;
    } else if (bidBlockedReason.includes("Squad full")) {
      buttonLabel = `📋 Squad Full (${MAX_SQUAD_SIZE}/${MAX_SQUAD_SIZE})`;
    } else if (bidBlockedReason.includes("purse") || bidBlockedReason.includes("Not enough")) {
      buttonLabel = "💸 Not Enough Purse";
    } else if (bidBlockedReason.includes("reserve")) {
      buttonLabel = "🔒 Must Reserve Purse";
    } else {
      buttonLabel = `❌ ${bidBlockedReason}`;
    }
  }

  return (
    <div className="bg-card rounded-xl border p-4 space-y-3">
      {/* Bidder Controls */}
      {myTeam && isBidding && (
        <>
          <div className="flex items-center gap-3">
            <Button
              onClick={onBid}
              disabled={!canBid}
              size="lg"
              className="flex-1 h-14 text-lg font-bold bg-secondary hover:bg-secondary/90 text-secondary-foreground disabled:opacity-50"
            >
              {buttonLabel}
            </Button>
            <div className="text-right text-sm">
              <div className="text-muted-foreground">Your Purse</div>
              <div className="font-semibold">{formatPrice(purseLeft)}</div>
            </div>
          </div>

          {/* Squad constraints bar */}
          {squadInfo && (
            <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
              <div className="flex gap-3">
                <span className={squadInfo.slotsRemaining <= 3 ? "text-orange-500 font-semibold" : ""}>
                  📋 Squad: {squadInfo.totalPlayers}/{MAX_SQUAD_SIZE}
                </span>
                <span className={squadInfo.overseasSlotsRemaining <= 1 ? "text-red-500 font-semibold" : ""}>
                  🌍 Overseas: {squadInfo.overseasCount}/{MAX_OVERSEAS}
                </span>
                {isOverseas && (
                  <span className="text-amber-600 font-medium">
                    ← Overseas player
                  </span>
                )}
              </div>
              <span>
                Effective: {formatPrice(squadInfo.effectivePurse)}
              </span>
            </div>
          )}
        </>
      )}

      {!myTeam && (
        <p className="text-center text-muted-foreground text-sm">
          Select a team in the lobby to bid
        </p>
      )}
    </div>
  );
};

export default BidControls;
