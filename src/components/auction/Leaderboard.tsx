import { useState } from "react";
import { formatPrice } from "@/lib/auction";
import { getTeam } from "@/lib/teams";
import { Badge } from "@/components/ui/badge";
import type { Tables } from "@/integrations/supabase/types";

type Player = Tables<"players">;
type Participant = Tables<"participants">;

interface LeaderboardProps {
  soldPlayers: Player[];
  unsoldPlayers: Player[];
  participants: Participant[];
  teamDisplayName: (teamCode: string) => string;
}

const roleColors: Record<string, string> = {
  Batsman: "bg-blue-500/10 text-blue-700",
  Bowler: "bg-green-500/10 text-green-700",
  "All-rounder": "bg-purple-500/10 text-purple-700",
  WK: "bg-amber-500/10 text-amber-700",
};

const Leaderboard = ({ soldPlayers, unsoldPlayers, participants, teamDisplayName }: LeaderboardProps) => {
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);

  const activeTeams = participants.filter((p) => p.team);

  // Group sold players by team
  const teamSquads: Record<string, Player[]> = {};
  soldPlayers.forEach((p) => {
    if (p.sold_to_team) {
      if (!teamSquads[p.sold_to_team]) teamSquads[p.sold_to_team] = [];
      teamSquads[p.sold_to_team].push(p);
    }
  });

  const totalSpent = soldPlayers.reduce((sum, p) => sum + (p.sold_price || 0), 0);
  const topBuy = soldPlayers.length > 0
    ? [...soldPlayers].sort((a, b) => (b.sold_price || 0) - (a.sold_price || 0))[0]
    : null;

  // Rank teams by number of players, then total spent
  const rankedTeams = [...activeTeams].sort((a, b) => {
    const aSquad = teamSquads[a.team || ""]?.length || 0;
    const bSquad = teamSquads[b.team || ""]?.length || 0;
    if (bSquad !== aSquad) return bSquad - aSquad;
    const aSpent = (teamSquads[a.team || ""] || []).reduce((s, p) => s + (p.sold_price || 0), 0);
    const bSpent = (teamSquads[b.team || ""] || []).reduce((s, p) => s + (p.sold_price || 0), 0);
    return bSpent - aSpent;
  });

  return (
    <div className="mt-4 space-y-6">
      {/* Header */}
      <div className="text-center py-6">
        <h2 className="font-display text-5xl tracking-wide text-primary mb-2">
          🏆 Auction Complete!
        </h2>
        <p className="text-muted-foreground text-lg">
          {soldPlayers.length} players sold, {unsoldPlayers.length} unsold
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-card rounded-xl border p-4 text-center">
          <div className="font-display text-3xl text-primary">{soldPlayers.length}</div>
          <div className="text-sm text-muted-foreground">Players Sold</div>
        </div>
        <div className="bg-card rounded-xl border p-4 text-center">
          <div className="font-display text-3xl text-destructive">{unsoldPlayers.length}</div>
          <div className="text-sm text-muted-foreground">Unsold</div>
        </div>
        <div className="bg-card rounded-xl border p-4 text-center">
          <div className="font-display text-3xl text-secondary">{formatPrice(totalSpent)}</div>
          <div className="text-sm text-muted-foreground">Total Spent</div>
        </div>
        <div className="bg-card rounded-xl border p-4 text-center">
          <div className="font-display text-2xl text-accent">
            {topBuy ? topBuy.name : "—"}
          </div>
          <div className="text-sm text-muted-foreground">
            Most Expensive {topBuy ? `(${formatPrice(topBuy.sold_price || 0)})` : ""}
          </div>
        </div>
      </div>

      {/* Team Leaderboard */}
      <div className="bg-card rounded-2xl border overflow-hidden">
        <div className="px-6 py-4 border-b bg-muted/30">
          <h3 className="font-display text-2xl tracking-wide">Team Leaderboard</h3>
        </div>
        <div className="divide-y">
          {rankedTeams.map((tp, idx) => {
            if (!tp.team) return null;
            const team = getTeam(tp.team);
            if (!team) return null;
            const squad = teamSquads[tp.team] || [];
            const spent = squad.reduce((s, p) => s + (p.sold_price || 0), 0);
            const isExpanded = selectedTeam === tp.team;
            const overseasCount = squad.filter((p) => p.nationality !== "India").length;

            return (
              <div key={tp.team}>
                <button
                  onClick={() => setSelectedTeam(isExpanded ? null : tp.team)}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-muted/20 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <span className="font-display text-2xl text-muted-foreground w-8">
                      #{idx + 1}
                    </span>
                    <span
                      className="w-10 h-10 rounded-full flex items-center justify-center font-display text-sm"
                      style={{ backgroundColor: team.primary, color: team.accent }}
                    >
                      {team.code}
                    </span>
                    <div className="text-left">
                      <div className="font-display text-xl">{teamDisplayName(tp.team)}</div>
                      <div className="text-xs text-muted-foreground">
                        {squad.length} players • {overseasCount} overseas • {formatPrice(tp.purse_left || 0)} remaining
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="font-bold text-lg">{formatPrice(spent)}</div>
                      <div className="text-[10px] text-muted-foreground uppercase">Spent</div>
                    </div>
                    <span className="text-muted-foreground">{isExpanded ? "▲" : "▼"}</span>
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-6 pb-4 bg-muted/10">
                    <div className="border rounded-xl overflow-hidden">
                      <div
                        className="px-4 py-2 text-sm font-semibold"
                        style={{ backgroundColor: `${team.primary}15` }}
                      >
                        {team.name} Squad ({squad.length} players)
                      </div>
                      {squad.length === 0 ? (
                        <p className="px-4 py-3 text-sm text-muted-foreground">No players bought</p>
                      ) : (
                        <div className="divide-y">
                          {squad
                            .sort((a, b) => (b.sold_price || 0) - (a.sold_price || 0))
                            .map((p, pIdx) => (
                            <div key={p.id} className="flex items-center justify-between px-4 py-2.5">
                              <div className="flex items-center gap-3">
                                <span className="text-xs text-muted-foreground w-5">{pIdx + 1}.</span>
                                <div>
                                  <span className="font-medium text-sm">{p.name}</span>
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    <Badge className={`text-[9px] px-1.5 py-0 ${roleColors[p.player_role] || ""}`} variant="secondary">
                                      {p.player_role}
                                    </Badge>
                                    <span className="text-[10px] text-muted-foreground">{p.nationality}</span>
                                    {p.nationality !== "India" && <span className="text-[10px]">🌍</span>}
                                  </div>
                                </div>
                              </div>
                              <span className="font-bold text-sm">{formatPrice(p.sold_price || 0)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Unsold Players */}
      {unsoldPlayers.length > 0 && (
        <div className="bg-card rounded-xl border p-4">
          <h3 className="font-display text-xl tracking-wide mb-3">
            ❌ Unsold Players ({unsoldPlayers.length})
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {unsoldPlayers.map((p) => (
              <div key={p.id} className="flex items-center justify-between text-sm py-1.5 px-3 rounded-lg bg-muted/30">
                <div className="flex items-center gap-2">
                  <span>{p.name}</span>
                  <Badge className={`text-[10px] ${roleColors[p.player_role] || ""}`} variant="secondary">
                    {p.player_role}
                  </Badge>
                </div>
                <span className="text-xs text-muted-foreground">{formatPrice(p.base_price)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Leaderboard;
