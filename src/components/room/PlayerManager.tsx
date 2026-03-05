import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_PLAYERS, formatPrice } from "@/lib/auction";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

type Player = Tables<"players">;

interface PlayerManagerProps {
  roomId: string;
}

const ROLES = ["Batsman", "Bowler", "All-rounder", "WK"] as const;

const PlayerManager = ({ roomId }: PlayerManagerProps) => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  // Add player form
  const [name, setName] = useState("");
  const [role, setRole] = useState<string>("Batsman");
  const [nationality, setNationality] = useState("India");
  const [basePrice, setBasePrice] = useState("2000000");
  const [auctionSet, setAuctionSet] = useState("1");

  useEffect(() => {
    loadPlayers();
  }, [roomId]);

  const loadPlayers = async () => {
    const { data } = await supabase
      .from("players")
      .select("*")
      .eq("room_id", roomId)
      .order("auction_set", { ascending: true })
      .order("id", { ascending: true });
    if (data) setPlayers(data);
    setLoading(false);
  };

  const loadDefaults = async () => {
    setLoading(true);
    try {
      const rows = DEFAULT_PLAYERS.map((p) => ({
        ...p,
        room_id: roomId,
      }));
      const { error } = await supabase.from("players").insert(rows);
      if (error) throw error;
      toast.success(`${DEFAULT_PLAYERS.length} players loaded!`);
      loadPlayers();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const addPlayer = async () => {
    if (!name.trim()) { toast.error("Enter player name"); return; }
    try {
      const { error } = await supabase.from("players").insert({
        room_id: roomId,
        name: name.trim(),
        player_role: role,
        nationality: nationality.trim() || "India",
        base_price: parseInt(basePrice) || 2000000,
        auction_set: parseInt(auctionSet) || 1,
      });
      if (error) throw error;
      setName("");
      toast.success("Player added");
      loadPlayers();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const removePlayer = async (id: number) => {
    await supabase.from("players").delete().eq("id", id);
    loadPlayers();
  };

  const clearAll = async () => {
    await supabase.from("players").delete().eq("room_id", roomId);
    setPlayers([]);
    toast.success("All players cleared");
  };

  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const lines = text.split("\n").filter((l) => l.trim());
    if (lines.length < 2) { toast.error("CSV must have headers + data"); return; }

    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
    const rows = lines.slice(1).map((line) => {
      const cols = line.split(",").map((c) => c.trim());
      const obj: any = {};
      headers.forEach((h, i) => { obj[h] = cols[i]; });
      return {
        room_id: roomId,
        name: obj.name || "Unknown",
        player_role: obj.role || obj.player_role || "Batsman",
        nationality: obj.nationality || "India",
        base_price: parseInt(obj.base_price || obj.baseprice) || 2000000,
        auction_set: parseInt(obj.auction_set || obj.set) || 1,
      };
    });

    try {
      const { error } = await supabase.from("players").insert(rows);
      if (error) throw error;
      toast.success(`${rows.length} players uploaded!`);
      loadPlayers();
    } catch (err: any) {
      toast.error(err.message);
    }
    e.target.value = "";
  };

  const roleColors: Record<string, string> = {
    Batsman: "bg-blue-500/10 text-blue-700",
    Bowler: "bg-green-500/10 text-green-700",
    "All-rounder": "bg-purple-500/10 text-purple-700",
    WK: "bg-amber-500/10 text-amber-700",
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display text-2xl tracking-wide">
          Player Pool ({players.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2">
          {players.length === 0 && (
            <Button onClick={loadDefaults} variant="secondary" disabled={loading}>
              ⚡ Load Default Players ({DEFAULT_PLAYERS.length})
            </Button>
          )}
          <label>
            <Button variant="outline" asChild>
              <span>📄 Upload CSV</span>
            </Button>
            <input
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleCsvUpload}
            />
          </label>
          {players.length > 0 && (
            <Button variant="destructive" size="sm" onClick={clearAll}>
              Clear All
            </Button>
          )}
        </div>

        {/* Add Player Form */}
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 items-end">
          <div className="col-span-2">
            <Label className="text-xs">Name</Label>
            <Input
              placeholder="Player name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-9"
            />
          </div>
          <div>
            <Label className="text-xs">Role</Label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
          <div>
            <Label className="text-xs">Base Price</Label>
            <select
              value={basePrice}
              onChange={(e) => setBasePrice(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
            >
              <option value="2000000">₹20L</option>
              <option value="5000000">₹50L</option>
              <option value="8000000">₹80L</option>
              <option value="10000000">₹1Cr</option>
              <option value="15000000">₹1.5Cr</option>
              <option value="20000000">₹2Cr</option>
            </select>
          </div>
          <div>
            <Label className="text-xs">Set</Label>
            <select
              value={auctionSet}
              onChange={(e) => setAuctionSet(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
            >
              {[1, 2, 3, 4, 5].map((s) => (
                <option key={s} value={s}>Set {s}</option>
              ))}
            </select>
          </div>
          <Button onClick={addPlayer} className="h-9">
            + Add
          </Button>
        </div>

        {/* Player List */}
        {players.length > 0 && (
          <div className="space-y-1 max-h-80 overflow-y-auto">
            {players.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-muted/30 hover:bg-muted/50 text-sm"
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium">{p.name}</span>
                  <Badge className={`text-[10px] ${roleColors[p.player_role] || ""}`} variant="secondary">
                    {p.player_role}
                  </Badge>
                  <span className="text-muted-foreground text-xs">{p.nationality}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Set {p.auction_set}</span>
                  <span className="font-medium text-xs">{formatPrice(p.base_price)}</span>
                  <button
                    onClick={() => removePlayer(p.id)}
                    className="text-destructive hover:text-destructive/80 text-xs ml-1"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PlayerManager;
