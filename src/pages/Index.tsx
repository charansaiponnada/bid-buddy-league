import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { generateRoomCode, getUserId, setDisplayName, formatPrice } from "@/lib/auction";
import { toast } from "sonner";

const PURSE_OPTIONS = [
  { label: "₹50 Cr", value: 500_000_000 },
  { label: "₹75 Cr", value: 750_000_000 },
  { label: "₹90 Cr", value: 900_000_000 },
  { label: "₹120 Cr", value: 1_200_000_000 },
];

const Index = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"home" | "create" | "join">("home");
  const [loading, setLoading] = useState(false);

  // Create form
  const [roomName, setRoomName] = useState("");
  const [passcode, setPasscode] = useState("");
  const [displayNameInput, setDisplayNameInput] = useState("");
  const [purse, setPurse] = useState(900_000_000);

  // Join form
  const [joinCode, setJoinCode] = useState("");
  const [joinPasscode, setJoinPasscode] = useState("");
  const [joinName, setJoinName] = useState("");

  const handleCreate = async () => {
    if (!roomName.trim() || !passcode.trim() || !displayNameInput.trim()) {
      toast.error("Please fill in all fields");
      return;
    }
    setLoading(true);
    try {
      const userId = getUserId();
      const code = generateRoomCode();
      setDisplayName(displayNameInput.trim());

      const { data: room, error: roomError } = await supabase
        .from("rooms")
        .insert({ code, name: roomName.trim(), passcode: passcode.trim(), host_id: userId, purse_per_team: purse })
        .select()
        .single();

      if (roomError) throw roomError;

      // Create auction_state for the room
      await supabase.from("auction_state").insert({ room_id: room.id });

      // Add host as participant
      await supabase.from("participants").insert({
        room_id: room.id,
        user_id: userId,
        display_name: displayNameInput.trim(),
        role: "bidder",
        purse_left: purse,
      });

      toast.success(`Room created! Code: ${code}`);
      navigate(`/room/${code}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to create room");
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!joinCode.trim() || !joinPasscode.trim() || !joinName.trim()) {
      toast.error("Please fill in all fields");
      return;
    }
    setLoading(true);
    try {
      const userId = getUserId();
      setDisplayName(joinName.trim());

      const { data: room, error: roomError } = await supabase
        .from("rooms")
        .select("*")
        .eq("code", joinCode.trim().toUpperCase())
        .single();

      if (roomError || !room) {
        toast.error("Room not found. Check the code.");
        return;
      }

      if (room.passcode !== joinPasscode.trim()) {
        toast.error("Incorrect passcode");
        return;
      }

      // Check if already in room
      const { data: existing } = await supabase
        .from("participants")
        .select("id")
        .eq("room_id", room.id)
        .eq("user_id", userId)
        .maybeSingle();

      if (!existing) {
        await supabase.from("participants").insert({
          room_id: room.id,
          user_id: userId,
          display_name: joinName.trim(),
          role: "bidder",
          purse_left: room.purse_per_team,
        });
      }

      navigate(`/room/${room.code}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to join room");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen cricket-gradient flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-2">
            <svg width="56" height="56" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-lg">
              {/* Cricket bat */}
              <rect x="18" y="8" width="8" height="32" rx="3" transform="rotate(-15 18 8)" fill="#D4AF37" stroke="#8B6914" strokeWidth="1.5"/>
              <rect x="20" y="36" width="5" height="12" rx="1" transform="rotate(-15 20 36)" fill="#8B6914"/>
              {/* Ball */}
              <circle cx="44" cy="20" r="8" fill="#CC2200" stroke="#AA0000" strokeWidth="1.5"/>
              <path d="M38 16 C40 20, 48 20, 50 16" stroke="white" strokeWidth="1" fill="none"/>
              <path d="M38 24 C40 20, 48 20, 50 24" stroke="white" strokeWidth="1" fill="none"/>
              {/* Stumps */}
              <rect x="46" y="32" width="2" height="20" rx="1" fill="#D4AF37"/>
              <rect x="50" y="32" width="2" height="20" rx="1" fill="#D4AF37"/>
              <rect x="54" y="32" width="2" height="20" rx="1" fill="#D4AF37"/>
              <rect x="45" y="31" width="12" height="2" rx="1" fill="#8B6914"/>
            </svg>
          </div>
          <h1 className="font-display text-6xl tracking-wide text-primary-foreground drop-shadow-lg">
            IPL AUCTION
          </h1>
          <p className="text-primary-foreground/70 text-lg mt-1">
            Live Cricket Auction Simulator
          </p>
          <div className="mt-3 h-1 w-24 mx-auto gold-shimmer rounded-full" />
        </div>

        {mode === "home" && (
          <div className="space-y-4">
            <Button
              onClick={() => setMode("create")}
              className="w-full h-14 text-lg font-bold bg-secondary hover:bg-secondary/90 text-secondary-foreground"
            >
              🏏 Create Room
            </Button>
            <Button
              onClick={() => setMode("join")}
              variant="outline"
              className="w-full h-14 text-lg font-bold border-2 border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 bg-transparent"
            >
              🎯 Join Room
            </Button>
          </div>
        )}

        {mode === "create" && (
          <Card className="border-0 shadow-2xl">
            <CardHeader>
              <CardTitle className="font-display text-3xl tracking-wide">Create Room</CardTitle>
              <CardDescription>Set up your auction room</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Your Name</Label>
                <Input
                  placeholder="e.g. Auctioneer"
                  value={displayNameInput}
                  onChange={(e) => setDisplayNameInput(e.target.value)}
                />
              </div>
              <div>
                <Label>Room Name</Label>
                <Input
                  placeholder="e.g. IPL Mega Auction 2025"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                />
              </div>
              <div>
                <Label>Passcode</Label>
                <Input
                  type="password"
                  placeholder="Room passcode"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                />
              </div>
              <div>
                <Label>Purse Per Team</Label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  {PURSE_OPTIONS.map((opt) => (
                    <Button
                      key={opt.value}
                      type="button"
                      variant={purse === opt.value ? "default" : "outline"}
                      className="h-10"
                      onClick={() => setPurse(opt.value)}
                    >
                      {opt.label}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="ghost" onClick={() => setMode("home")} className="flex-1">
                  Back
                </Button>
                <Button onClick={handleCreate} disabled={loading} className="flex-1 bg-secondary hover:bg-secondary/90 text-secondary-foreground">
                  {loading ? "Creating..." : "Create Room"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {mode === "join" && (
          <Card className="border-0 shadow-2xl">
            <CardHeader>
              <CardTitle className="font-display text-3xl tracking-wide">Join Room</CardTitle>
              <CardDescription>Enter the room code to join</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Your Name</Label>
                <Input
                  placeholder="e.g. Captain Cool"
                  value={joinName}
                  onChange={(e) => setJoinName(e.target.value)}
                />
              </div>
              <div>
                <Label>Room Code</Label>
                <Input
                  placeholder="e.g. IPL24X"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  maxLength={6}
                  className="font-mono text-lg tracking-widest text-center uppercase"
                />
              </div>
              <div>
                <Label>Passcode</Label>
                <Input
                  type="password"
                  placeholder="Room passcode"
                  value={joinPasscode}
                  onChange={(e) => setJoinPasscode(e.target.value)}
                />
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="ghost" onClick={() => setMode("home")} className="flex-1">
                  Back
                </Button>
                <Button onClick={handleJoin} disabled={loading} className="flex-1">
                  {loading ? "Joining..." : "Join Room"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Index;
