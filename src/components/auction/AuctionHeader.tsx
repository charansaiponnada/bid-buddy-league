import { Badge } from "@/components/ui/badge";
import type { Tables } from "@/integrations/supabase/types";

type Room = Tables<"rooms">;

interface AuctionHeaderProps {
  room: Room;
  isHost: boolean;
  auctionStatus: string;
  soldCount: number;
  unsoldCount: number;
  upcomingCount: number;
  totalPlayers: number;
  onToggleChat: () => void;
  showChat: boolean;
}

const AuctionHeader = ({
  room,
  isHost,
  auctionStatus,
  soldCount,
  unsoldCount,
  upcomingCount,
  totalPlayers,
  onToggleChat,
  showChat,
}: AuctionHeaderProps) => {
  const statusColors: Record<string, string> = {
    bidding: "bg-green-500",
    sold: "bg-secondary",
    unsold: "bg-destructive",
    idle: "bg-muted-foreground",
    completed: "bg-accent",
  };

  return (
    <div className="cricket-gradient px-4 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl text-primary-foreground tracking-wide">
            {room.name}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="secondary" className="font-mono tracking-widest text-xs">
              {room.code}
            </Badge>
            <span
              className={`inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full text-white ${
                statusColors[auctionStatus] || statusColors.idle
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              {auctionStatus === "bidding" ? "LIVE" : auctionStatus.toUpperCase()}
            </span>
            {isHost && (
              <Badge className="bg-secondary/80 text-secondary-foreground text-[10px]">
                HOST
              </Badge>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex gap-4 text-primary-foreground/80 text-sm">
            <div className="text-center">
              <div className="font-bold text-lg">{soldCount}</div>
              <div className="text-[10px] uppercase tracking-wider">Sold</div>
            </div>
            <div className="text-center">
              <div className="font-bold text-lg">{unsoldCount}</div>
              <div className="text-[10px] uppercase tracking-wider">Unsold</div>
            </div>
            <div className="text-center">
              <div className="font-bold text-lg">{upcomingCount}</div>
              <div className="text-[10px] uppercase tracking-wider">Left</div>
            </div>
          </div>

          <button
            onClick={onToggleChat}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
              showChat
                ? "bg-white/20 text-primary-foreground"
                : "bg-white/10 text-primary-foreground/70 hover:bg-white/15"
            }`}
          >
            💬 Chat
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuctionHeader;
