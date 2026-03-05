import { formatPrice } from "@/lib/auction";
import { getTeam } from "@/lib/teams";
import type { Tables } from "@/integrations/supabase/types";

type Bid = Tables<"bids">;
type Participant = Tables<"participants">;

interface BidHistoryProps {
  bids: Bid[];
  participants: Participant[];
}

const BidHistory = ({ bids, participants }: BidHistoryProps) => {
  if (bids.length === 0) return null;

  const getBidderName = (bidderId: string) => {
    const p = participants.find((p) => p.user_id === bidderId);
    return p?.display_name || "Unknown";
  };

  return (
    <div className="bg-card rounded-xl border p-4">
      <h3 className="font-display text-lg tracking-wide mb-3">
        Bid History ({bids.length})
      </h3>
      <div className="space-y-1.5 max-h-40 overflow-y-auto">
        {bids.map((bid, index) => {
          const team = getTeam(bid.team);
          return (
            <div
              key={bid.id}
              className={`flex items-center justify-between text-sm py-1.5 px-3 rounded-lg ${
                index === 0 ? "bg-secondary/10 border border-secondary/30" : "bg-muted/30"
              }`}
            >
              <div className="flex items-center gap-2">
                {team && (
                  <span
                    className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold"
                    style={{ backgroundColor: team.primary, color: team.accent }}
                  >
                    {team.code}
                  </span>
                )}
                <span className="font-medium">{getBidderName(bid.bidder_id)}</span>
              </div>
              <span className={`font-semibold ${index === 0 ? "text-secondary" : ""}`}>
                {formatPrice(bid.amount)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default BidHistory;
