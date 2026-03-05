import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getUserId, getDisplayName, setDisplayName } from "@/lib/auction";
import { toast } from "sonner";
import Lobby from "@/components/room/Lobby";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import type { Tables } from "@/integrations/supabase/types";

type Room = Tables<"rooms">;
type Participant = Tables<"participants">;

const RoomPage = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const [room, setRoom] = useState<Room | null>(null);
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsJoin, setNeedsJoin] = useState(false);
  const [joinName, setJoinName] = useState(getDisplayName() || "");
  const [joinPasscode, setJoinPasscode] = useState("");
  const [joining, setJoining] = useState(false);

  const userId = getUserId();

  useEffect(() => {
    loadRoom();
  }, [code]);

  const loadRoom = async () => {
    if (!code) return;
    setLoading(true);

    const { data: roomData, error } = await supabase
      .from("rooms")
      .select("*")
      .eq("code", code.toUpperCase())
      .single();

    if (error || !roomData) {
      toast.error("Room not found");
      navigate("/");
      return;
    }

    setRoom(roomData);

    // Check if user is already a participant
    const { data: participantData } = await supabase
      .from("participants")
      .select("*")
      .eq("room_id", roomData.id)
      .eq("user_id", userId)
      .maybeSingle();

    if (participantData) {
      setParticipant(participantData);
    } else {
      setNeedsJoin(true);
    }

    setLoading(false);
  };

  const handleJoin = async () => {
    if (!room) return;
    if (!joinName.trim() || !joinPasscode.trim()) {
      toast.error("Please fill in all fields");
      return;
    }
    if (room.passcode !== joinPasscode.trim()) {
      toast.error("Incorrect passcode");
      return;
    }

    setJoining(true);
    try {
      setDisplayName(joinName.trim());
      const { data, error } = await supabase
        .from("participants")
        .insert({
          room_id: room.id,
          user_id: userId,
          display_name: joinName.trim(),
          role: "bidder",
          purse_left: room.purse_per_team,
        })
        .select()
        .single();

      if (error) throw error;
      setParticipant(data);
      setNeedsJoin(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to join");
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen cricket-gradient flex items-center justify-center">
        <div className="text-primary-foreground font-display text-4xl animate-pulse">
          Loading...
        </div>
      </div>
    );
  }

  if (needsJoin && room) {
    return (
      <div className="min-h-screen cricket-gradient flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-0 shadow-2xl">
          <CardHeader>
            <CardTitle className="font-display text-3xl tracking-wide">
              Join: {room.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Your Name</Label>
              <Input
                placeholder="Enter your name"
                value={joinName}
                onChange={(e) => setJoinName(e.target.value)}
              />
            </div>
            <div>
              <Label>Room Passcode</Label>
              <Input
                type="password"
                placeholder="Enter passcode"
                value={joinPasscode}
                onChange={(e) => setJoinPasscode(e.target.value)}
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="ghost" onClick={() => navigate("/")} className="flex-1">
                Back
              </Button>
              <Button onClick={handleJoin} disabled={joining} className="flex-1">
                {joining ? "Joining..." : "Join Room"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!room || !participant) return null;

  return <Lobby room={room} participant={participant} />;
};

export default RoomPage;
