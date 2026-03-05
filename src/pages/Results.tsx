import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice } from "@/lib/auction";
import { getTeam, IPL_TEAMS } from "@/lib/teams";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Tables } from "@/integrations/supabase/types";

type Room = Tables<"rooms">;
type Player = Tables<"players">;
type Participant = Tables<"participants">;

const Results = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const [room, setRoom] = useState<Room | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [code]);

  const loadData = async () => {
    if (!code) return;

    const { data: roomData } = await supabase
      .from("rooms")
      .select("*")
      .eq("code", code.toUpperCase())
      .single();

    if (!roomData) {
      navigate("/");
      return;
    }
    setRoom(roomData);

    const { data: playersData } = await supabase
      .from("players")
      .select("*")
      .eq("room_id", roomData.id)
      .order("sold_price", { ascending: false });
    if (playersData) setPlayers(playersData);

    const { data: partData } = await supabase
      .from("participants")
      .select("*")
      .eq("room_id", roomData.id);
    if (partData) setParticipants(partData);

    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen cricket-gradient flex items-center justify-center">
        <div className="text-primary-foreground font-display text-4xl animate-pulse">
          Loading Results...
        </div>
      </div>
    );
  }

  if (!room) return null;

  const soldPlayers = players.filter((p) => p.status === "sold");
  const unsoldPlayers = players.filter((p) => p.status === "unsold");
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
  const topBuy = soldPlayers.length > 0 ? soldPlayers[0] : null;

  const roleColors: Record<string, string> = {
    Batsman: "bg-blue-500/10 text-blue-700",
    Bowler: "bg-green-500/10 text-green-700",
    "All-rounder": "bg-purple-500/10 text-purple-700",
    WK: "bg-amber-500/10 text-amber-700",
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="cricket-gradient px-4 py-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="font-display text-4xl text-primary-foreground tracking-wide">
              🏆 Auction Results
            </h1>
            <p className="text-primary-foreground/70 mt-1">{room.name}</p>
          </div>
          <Button
            variant="outline"
            onClick={() => navigate("/")}
            className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 bg-transparent"
          >
            ← Home
          </Button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4 space-y-6">
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

        {/* Team Selector Tabs */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedTeam(null)}
            className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
              !selectedTeam
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            All Teams
          </button>
          {activeTeams.map((p) => {
            const team = p.team ? getTeam(p.team) : null;
            if (!team) return null;
            const count = teamSquads[team.code]?.length || 0;
            return (
              <button
                key={team.code}
                onClick={() => setSelectedTeam(team.code)}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                  selectedTeam === team.code
                    ? "ring-2 ring-offset-1 ring-ring scale-105"
                    : "hover:scale-105"
                }`}
                style={{
                  backgroundColor: team.primary,
                  color: team.accent,
                }}
              >
                {team.code} ({count})
              </button>
            );
          })}
        </div>

        {/* Squad Display */}
        {selectedTeam ? (
          <div className="space-y-4">
            {(() => {
              const team = getTeam(selectedTeam);
              const squad = teamSquads[selectedTeam] || [];
              const teamParticipant = activeTeams.find((p) => p.team === selectedTeam);
              const totalSpentByTeam = squad.reduce((sum, p) => sum + (p.sold_price || 0), 0);

              return (
                <div className="bg-card rounded-2xl border-2 overflow-hidden" style={{ borderColor: `${team?.primary}40` }}>
                  <div className="px-6 py-4" style={{ backgroundColor: `${team?.primary}15` }}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span
                          className="w-10 h-10 rounded-full flex items-center justify-center font-display text-sm"
                          style={{ backgroundColor: team?.primary, color: team?.accent }}
                        >
                          {team?.code}
                        </span>
                        <div>
                          <h3 className="font-display text-2xl tracking-wide">{team?.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            Owner: {teamParticipant?.display_name || "—"}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-muted-foreground">Spent / Remaining</div>
                        <div className="font-bold">
                          {formatPrice(totalSpentByTeam)} / {formatPrice(teamParticipant?.purse_left || 0)}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="p-4">
                    {squad.length === 0 ? (
                      <p className="text-center text-muted-foreground py-4">No players bought</p>
                    ) : (
                      <div className="space-y-2">
                        {squad.map((p) => (
                          <div key={p.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/30">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{p.name}</span>
                              <Badge className={`text-[10px] ${roleColors[p.player_role] || ""}`} variant="secondary">
                                {p.player_role}
                              </Badge>
                              <span className="text-xs text-muted-foreground">{p.nationality}</span>
                            </div>
                            <span className="font-bold text-sm">{formatPrice(p.sold_price || 0)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        ) : (
          /* All Teams Overview */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeTeams.map((tp) => {
              const team = tp.team ? getTeam(tp.team) : null;
              if (!team) return null;
              const squad = teamSquads[team.code] || [];
              const spent = squad.reduce((sum, p) => sum + (p.sold_price || 0), 0);

              return (
                <div
                  key={team.code}
                  className="bg-card rounded-xl border overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => setSelectedTeam(team.code)}
                >
                  <div className="px-4 py-3 flex items-center justify-between" style={{ backgroundColor: `${team.primary}15` }}>
                    <div className="flex items-center gap-2">
                      <span
                        className="w-8 h-8 rounded-full flex items-center justify-center font-display text-xs"
                        style={{ backgroundColor: team.primary, color: team.accent }}
                      >
                        {team.code}
                      </span>
                      <div>
                        <span className="font-display text-lg">{team.shortName}</span>
                        <span className="text-xs text-muted-foreground ml-2">({tp.display_name})</span>
                      </div>
                    </div>
                    <div className="text-right text-sm">
                      <div className="font-bold">{squad.length} players</div>
                      <div className="text-muted-foreground text-xs">{formatPrice(spent)} spent</div>
                    </div>
                  </div>
                  <div className="px-4 py-2">
                    {squad.slice(0, 3).map((p) => (
                      <div key={p.id} className="text-sm flex justify-between py-0.5">
                        <span>{p.name}</span>
                        <span className="text-muted-foreground">{formatPrice(p.sold_price || 0)}</span>
                      </div>
                    ))}
                    {squad.length > 3 && (
                      <p className="text-xs text-muted-foreground">+{squad.length - 3} more</p>
                    )}
                    {squad.length === 0 && (
                      <p className="text-xs text-muted-foreground py-1">No players bought</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

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
    </div>
  );
};

export default Results;
