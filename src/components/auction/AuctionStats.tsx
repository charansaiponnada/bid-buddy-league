import { formatPrice } from "@/lib/auction";
import { getTeam } from "@/lib/teams";

interface AuctionStatsProps {
  highestSold: { name: string; price: number; team: string } | null;
  totalSpent: number;
  avgPrice: number;
  topSpendingTeam: [string, number] | null;
  teamDisplayName: (teamCode: string) => string;
}

const AuctionStats = ({ highestSold, totalSpent, avgPrice, topSpendingTeam, teamDisplayName }: AuctionStatsProps) => {
  return (
    <div className="bg-card rounded-xl border p-4">
      <h3 className="font-display text-lg tracking-wide mb-3">
        📊 Auction Stats
      </h3>
      <div className="space-y-2.5">
        {/* Highest Sold */}
        {highestSold && (
          <div className="flex items-center justify-between text-sm py-1.5 px-2 rounded bg-amber-500/10 border border-amber-500/20">
            <div className="flex items-center gap-2">
              <span className="text-amber-500">👑</span>
              <span className="font-medium">Most Expensive</span>
            </div>
            <div className="text-right">
              <div className="font-semibold text-amber-600">{formatPrice(highestSold.price)}</div>
              <div className="text-[10px] text-muted-foreground">
                {highestSold.name} → {teamDisplayName(highestSold.team)}
              </div>
            </div>
          </div>
        )}

        {/* Total Spent */}
        <div className="flex items-center justify-between text-sm py-1.5 px-2 rounded bg-muted/30">
          <div className="flex items-center gap-2">
            <span>💰</span>
            <span className="font-medium">Total Spent</span>
          </div>
          <span className="font-semibold">{formatPrice(totalSpent)}</span>
        </div>

        {/* Average Price */}
        <div className="flex items-center justify-between text-sm py-1.5 px-2 rounded bg-muted/30">
          <div className="flex items-center gap-2">
            <span>📈</span>
            <span className="font-medium">Average Price</span>
          </div>
          <span className="font-semibold">{formatPrice(Math.round(avgPrice))}</span>
        </div>

        {/* Top Spending Team */}
        {topSpendingTeam && (
          <div className="flex items-center justify-between text-sm py-1.5 px-2 rounded bg-muted/30">
            <div className="flex items-center gap-2">
              {(() => {
                const team = getTeam(topSpendingTeam[0]);
                return team ? (
                  <span
                    className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold"
                    style={{ backgroundColor: team.primary, color: team.accent }}
                  >
                    {team.code}
                  </span>
                ) : <span>🏆</span>;
              })()}
              <span className="font-medium">Top Spender</span>
            </div>
            <div className="text-right">
              <div className="font-semibold">{formatPrice(topSpendingTeam[1])}</div>
              <div className="text-[10px] text-muted-foreground">
                {teamDisplayName(topSpendingTeam[0])}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuctionStats;
