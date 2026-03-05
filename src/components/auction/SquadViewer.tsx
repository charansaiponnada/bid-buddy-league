import { useState } from "react";
import { formatPrice } from "@/lib/auction";
import { getTeam } from "@/lib/teams";
import { Badge } from "@/components/ui/badge";
import type { Tables } from "@/integrations/supabase/types";

type Player = Tables<"players">;
type Participant = Tables<"participants">;

interface SquadViewerProps {
  soldPlayers: Player[];
  participants: Participant[];
  teamDisplayName: (teamCode: string) => string;
  myTeam: string | null;
}

const roleColors: Record<string, string> = {
  Batsman: "bg-blue-500/10 text-blue-700",
  Bowler: "bg-green-500/10 text-green-700",
  "All-rounder": "bg-purple-500/10 text-purple-700",
  WK: "bg-amber-500/10 text-amber-700",
};

const SquadViewer = ({ soldPlayers, participants, teamDisplayName, myTeam }: SquadViewerProps) => {
  const [expandedTeam, setExpandedTeam] = useState<string | null>(myTeam);

  const activeTeams = participants.filter((p) => p.team);

  // Group sold players by team
  const teamSquads: Record<string, Player[]> = {};
  soldPlayers.forEach((p) => {
    if (p.sold_to_team) {
      if (!teamSquads[p.sold_to_team]) teamSquads[p.sold_to_team] = [];
      teamSquads[p.sold_to_team].push(p);
    }
  });

  // Sort: my team first, then by squad size
  const sortedTeams = [...activeTeams].sort((a, b) => {
    if (a.team === myTeam) return -1;
    if (b.team === myTeam) return 1;
    return (teamSquads[b.team || ""]?.length || 0) - (teamSquads[a.team || ""]?.length || 0);
  });

  return (
    <div className="bg-card rounded-xl border p-4">
      <h3 className="font-display text-lg tracking-wide mb-3">
        🏏 Squads
      </h3>
      <div className="space-y-2">
        {sortedTeams.map((p) => {
          if (!p.team) return null;
          const team = getTeam(p.team);
          if (!team) return null;
          const squad = teamSquads[p.team] || [];
          const isExpanded = expandedTeam === p.team;
          const isMyTeam = p.team === myTeam;
          const totalSpent = squad.reduce((sum, pl) => sum + (pl.sold_price || 0), 0);

          return (
            <div key={p.team}>
              <button
                onClick={() => setExpandedTeam(isExpanded ? null : p.team)}
                className={`w-full flex items-center justify-between py-2 px-3 rounded-lg text-sm transition-colors ${
                  isMyTeam
                    ? "bg-primary/10 border border-primary/30"
                    : "bg-muted/30 hover:bg-muted/50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-6 h-6 rounded-full flex items-center justify-center text-[8px] font-bold"
                    style={{ backgroundColor: team.primary, color: team.accent }}
                  >
                    {team.code}
                  </span>
                  <span className="font-medium">
                    {teamDisplayName(p.team)}
                    {isMyTeam && <span className="text-primary text-[10px] ml-1">(You)</span>}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{squad.length} players</span>
                  <span className="text-xs">{isExpanded ? "▲" : "▼"}</span>
                </div>
              </button>

              {isExpanded && (
                <div className="mt-1 ml-3 pl-3 border-l-2 space-y-1" style={{ borderColor: `${team.primary}40` }}>
                  {squad.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-1">No players yet</p>
                  ) : (
                    <>
                      {squad.map((pl) => (
                        <div key={pl.id} className="flex items-center justify-between text-xs py-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium">{pl.name}</span>
                            <Badge className={`text-[8px] px-1 py-0 ${roleColors[pl.player_role] || ""}`} variant="secondary">
                              {pl.player_role}
                            </Badge>
                            {pl.nationality !== "India" && (
                              <span className="text-[9px]">🌍</span>
                            )}
                          </div>
                          <span className="font-semibold text-[10px]">
                            {formatPrice(pl.sold_price || 0)}
                          </span>
                        </div>
                      ))}
                      <div className="flex justify-between text-[10px] text-muted-foreground pt-1 border-t">
                        <span>Total: {squad.length} players</span>
                        <span>Spent: {formatPrice(totalSpent)}</span>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SquadViewer;
