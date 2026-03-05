import { formatPrice } from "@/lib/auction";
import { getTeam } from "@/lib/teams";
import { Badge } from "@/components/ui/badge";
import type { Tables } from "@/integrations/supabase/types";

type Player = Tables<"players">;

interface PlayerCardProps {
  player: Player;
  currentBid: number;
  currentBidderTeam: string | null;
  teamDisplayName?: (teamCode: string) => string;
}

const PlayerCard = ({ player, currentBid, currentBidderTeam, teamDisplayName }: PlayerCardProps) => {
  const bidderTeam = currentBidderTeam ? getTeam(currentBidderTeam) : null;

  const roleColors: Record<string, string> = {
    Batsman: "bg-blue-500/10 text-blue-700 border-blue-500/30",
    Bowler: "bg-green-500/10 text-green-700 border-green-500/30",
    "All-rounder": "bg-purple-500/10 text-purple-700 border-purple-500/30",
    WK: "bg-amber-500/10 text-amber-700 border-amber-500/30",
  };

  const stats = player.stats as Record<string, any> | null;
  const isOverseas = player.nationality !== "India";

  return (
    <div className="bg-card rounded-2xl border-2 overflow-hidden shadow-lg">
      {/* Player Header */}
      <div className="cricket-gradient px-6 py-5">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-display text-4xl tracking-wide text-primary-foreground">
              {player.name}
            </h2>
            <div className="flex items-center gap-2 mt-2">
              <Badge className={`${roleColors[player.player_role] || ""} border`}>
                {player.player_role}
              </Badge>
              {isOverseas && (
                <Badge className="bg-amber-500/20 text-amber-200 border-amber-400/40 border">
                  🌍 Overseas
                </Badge>
              )}
              <span className="text-primary-foreground/70 text-sm">
                {player.nationality}
              </span>
              <span className="text-primary-foreground/50 text-xs">
                Set {player.auction_set}
              </span>
            </div>
          </div>
          {player.image_url && (
            <img
              src={player.image_url}
              alt={player.name}
              className="w-20 h-20 rounded-full object-cover border-2 border-white/20"
            />
          )}
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="px-6 py-3 border-b flex flex-wrap gap-4">
          {Object.entries(stats).map(([key, value]) => (
            <div key={key} className="text-center">
              <div className="text-lg font-bold">{String(value)}</div>
              <div className="text-[10px] uppercase text-muted-foreground tracking-wider">
                {key}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Current Bid */}
      <div className="px-6 py-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-muted-foreground uppercase tracking-wider">
              Current Bid
            </div>
            <div className="font-display text-5xl tracking-wide text-primary mt-1">
              {formatPrice(currentBid)}
            </div>
          </div>
          {bidderTeam && (
            <div className="text-right">
              <div className="text-sm text-muted-foreground uppercase tracking-wider">
                Highest Bidder
              </div>
              <div className="flex items-center gap-2 mt-1 justify-end">
                <span
                  className="w-8 h-8 rounded-full flex items-center justify-center font-display text-xs"
                  style={{ backgroundColor: bidderTeam.primary, color: bidderTeam.accent }}
                >
                  {bidderTeam.code}
                </span>
                <span className="font-display text-xl">
                  {teamDisplayName && currentBidderTeam ? teamDisplayName(currentBidderTeam) : bidderTeam.shortName}
                </span>
              </div>
            </div>
          )}
          {!bidderTeam && (
            <div className="text-right">
              <div className="text-sm text-muted-foreground">Base Price</div>
              <div className="text-muted-foreground/60 text-sm">No bids yet</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PlayerCard;
