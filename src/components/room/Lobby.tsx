import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getUserId, formatPrice } from "@/lib/auction";
import { IPL_TEAMS, getTeam } from "@/lib/teams";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import TeamSelector from "./TeamSelector";
import ParticipantList from "./ParticipantList";
import PlayerManager from "./PlayerManager";
import type { Tables } from "@/integrations/supabase/types";

type Room = Tables<"rooms">;
type Participant = Tables<"participants">;

interface LobbyProps {
  room: Room;
  participant: Participant;
}

const Lobby = ({ room, participant: initialParticipant }: LobbyProps) => {
  const navigate = useNavigate();
  const userId = getUserId();
  const isHost = room.host_id === userId;
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [myParticipant, setMyParticipant] = useState(initialParticipant);
  const [showPlayerManager, setShowPlayerManager] = useState(false);

  useEffect(() => {
    loadParticipants();

    const channel = supabase
      .channel(`participants:${room.id}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "participants",
        filter: `room_id=eq.${room.id}`,
      }, () => {
        loadParticipants();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [room.id]);

  const loadParticipants = async () => {
    const { data } = await supabase
      .from("participants")
      .select("*")
      .eq("room_id", room.id)
      .order("joined_at", { ascending: true });
    if (data) {
      setParticipants(data);
      const me = data.find((p) => p.user_id === userId);
      if (me) setMyParticipant(me);
    }
  };

  const selectTeam = async (teamCode: string) => {
    // Check if team taken
    const taken = participants.some(
      (p) => p.team === teamCode && p.user_id !== userId
    );
    if (taken) {
      toast.error("Team already taken!");
      return;
    }

    const { error } = await supabase
      .from("participants")
      .update({ team: teamCode })
      .eq("id", myParticipant.id);

    if (error) {
      toast.error("Failed to select team");
    }
  };

  const copyRoomLink = () => {
    const url = `${window.location.origin}/room/${room.code}`;
    navigator.clipboard.writeText(url);
    toast.success("Room link copied!");
  };

  const takenTeams = participants
    .filter((p) => p.team && p.user_id !== userId)
    .map((p) => p.team!);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="cricket-gradient px-4 py-6">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="font-display text-4xl text-primary-foreground tracking-wide">
              {room.name}
            </h1>
            <div className="flex items-center gap-3 mt-1">
              <Badge variant="secondary" className="font-mono tracking-widest text-sm">
                {room.code}
              </Badge>
              <span className="text-primary-foreground/60 text-sm">
                Purse: {formatPrice(room.purse_per_team)}
              </span>
              {isHost && (
                <Badge className="bg-secondary text-secondary-foreground">HOST</Badge>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={copyRoomLink}
              className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 bg-transparent"
            >
              📋 Share
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/")}
              className="text-primary-foreground hover:bg-primary-foreground/10"
            >
              ← Leave
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-4 space-y-6">
        {/* Team Selection */}
        <TeamSelector
          selectedTeam={myParticipant.team}
          takenTeams={takenTeams}
          onSelect={selectTeam}
          participants={participants}
        />

        {/* Participants */}
        <ParticipantList
          participants={participants}
          hostId={room.host_id}
          currentUserId={userId}
        />

        {/* Host Controls */}
        {isHost && (
          <Card>
            <CardHeader>
              <CardTitle className="font-display text-2xl tracking-wide">
                Host Controls
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                onClick={() => setShowPlayerManager(!showPlayerManager)}
                variant="outline"
                className="w-full"
              >
                {showPlayerManager ? "Hide" : "📝 Manage Players"}
              </Button>
              <Button
                className="w-full h-12 text-lg font-bold bg-accent hover:bg-accent/90 text-accent-foreground"
                disabled={participants.filter((p) => p.team).length < 2}
              >
                🏏 Start Auction
              </Button>
              {participants.filter((p) => p.team).length < 2 && (
                <p className="text-sm text-muted-foreground text-center">
                  Need at least 2 teams to start
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Player Manager (host only) */}
        {isHost && showPlayerManager && (
          <PlayerManager roomId={room.id} />
        )}
      </div>
    </div>
  );
};

export default Lobby;
