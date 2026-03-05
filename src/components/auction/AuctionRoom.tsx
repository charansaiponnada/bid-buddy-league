import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getUserId, formatPrice } from "@/lib/auction";
import { getBidIncrement, getTeamSquadInfo, validateBid, getAcceleratedBasePrice, MAX_SQUAD_SIZE, MAX_OVERSEAS, type TeamSquadInfo } from "@/lib/auctionRules";
import { getTeam } from "@/lib/teams";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import PlayerCard from "./PlayerCard";
import BidControls from "./BidControls";
import AuctionTimer from "./AuctionTimer";
import BidHistory from "./BidHistory";
import ChatPanel from "./ChatPanel";
import AuctionHeader from "./AuctionHeader";
import TeamPurseBar from "./TeamPurseBar";
import SoldOverlay from "./SoldOverlay";
import AuctionStats from "./AuctionStats";
import SquadViewer from "./SquadViewer";
import Leaderboard from "./Leaderboard";
import type { Tables } from "@/integrations/supabase/types";

type Room = Tables<"rooms">;
type Participant = Tables<"participants">;
type Player = Tables<"players">;
type AuctionState = Tables<"auction_state">;
type Bid = Tables<"bids">;

interface AuctionRoomProps {
  room: Room;
  participant: Participant;
}

const AuctionRoom = ({ room, participant: initialParticipant }: AuctionRoomProps) => {
  const userId = getUserId();
  const isHost = room.host_id === userId;

  const [auctionState, setAuctionState] = useState<AuctionState | null>(null);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [myParticipant, setMyParticipant] = useState(initialParticipant);
  const [bids, setBids] = useState<Bid[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [showChat, setShowChat] = useState(false);
  const [acceleratedRound, setAcceleratedRound] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [pausedTimeLeft, setPausedTimeLeft] = useState<number | null>(null);
  const [timerDuration, setTimerDuration] = useState(30);
  const [soldAnimation, setSoldAnimation] = useState<{ playerName: string; teamCode: string; price: number } | null>(null);

  const loadAll = useCallback(async () => {
    // Load auction state
    const { data: stateData } = await supabase
      .from("auction_state")
      .select("*")
      .eq("room_id", room.id)
      .single();
    if (stateData) {
      setAuctionState(stateData);
      // Load current player
      if (stateData.current_player_id) {
        const { data: playerData } = await supabase
          .from("players")
          .select("*")
          .eq("id", stateData.current_player_id)
          .single();
        if (playerData) setCurrentPlayer(playerData);
      } else {
        setCurrentPlayer(null);
      }
    }

    // Load participants
    const { data: partData } = await supabase
      .from("participants")
      .select("*")
      .eq("room_id", room.id)
      .order("joined_at", { ascending: true });
    if (partData) {
      setParticipants(partData);
      const me = partData.find((p) => p.user_id === userId);
      if (me) setMyParticipant(me);
    }

    // Load all players
    const { data: playersData } = await supabase
      .from("players")
      .select("*")
      .eq("room_id", room.id)
      .order("auction_set", { ascending: true })
      .order("id", { ascending: true });
    if (playersData) setPlayers(playersData);
  }, [room.id, userId]);

  const loadBids = useCallback(async (playerId: number) => {
    const { data } = await supabase
      .from("bids")
      .select("*")
      .eq("room_id", room.id)
      .eq("player_id", playerId)
      .order("placed_at", { ascending: false })
      .limit(50);
    if (data) setBids(data);
  }, [room.id]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Load bids when current player changes
  useEffect(() => {
    if (auctionState?.current_player_id) {
      loadBids(auctionState.current_player_id);
    } else {
      setBids([]);
    }
  }, [auctionState?.current_player_id, loadBids]);

  // Real-time subscriptions
  useEffect(() => {
    const auctionChannel = supabase
      .channel(`auction:${room.id}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "auction_state",
        filter: `room_id=eq.${room.id}`,
      }, () => {
        loadAll();
      })
      .subscribe();

    const bidsChannel = supabase
      .channel(`bids:${room.id}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "bids",
        filter: `room_id=eq.${room.id}`,
      }, (payload) => {
        const newBid = payload.new as Bid;
        setBids((prev) => [newBid, ...prev]);
      })
      .subscribe();

    const participantsChannel = supabase
      .channel(`auction-participants:${room.id}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "participants",
        filter: `room_id=eq.${room.id}`,
      }, () => {
        loadAll();
      })
      .subscribe();

    const playersChannel = supabase
      .channel(`auction-players:${room.id}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "players",
        filter: `room_id=eq.${room.id}`,
      }, () => {
        loadAll();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(auctionChannel);
      supabase.removeChannel(bidsChannel);
      supabase.removeChannel(participantsChannel);
      supabase.removeChannel(playersChannel);
    };
  }, [room.id, loadAll]);

  // ── Computed: team squad info for the current user ──

  const soldPlayers = useMemo(() => players.filter((p) => p.status === "sold"), [players]);

  const mySquadInfo: TeamSquadInfo | null = useMemo(() => {
    if (!myParticipant.team) return null;
    const participant = participants.find((p) => p.team === myParticipant.team);
    return getTeamSquadInfo(myParticipant.team, soldPlayers, participant);
  }, [myParticipant.team, soldPlayers, participants]);

  /** Map of teamCode → TeamSquadInfo for all teams */
  const allSquadInfos = useMemo(() => {
    const map: Record<string, TeamSquadInfo> = {};
    participants.forEach((p) => {
      if (p.team) {
        map[p.team] = getTeamSquadInfo(p.team, soldPlayers, p);
      }
    });
    return map;
  }, [participants, soldPlayers]);

  // ── Host Actions ──

  const startNextPlayer = async () => {
    let upcoming = players.filter((p) => p.status === "upcoming");

    // If no upcoming but there are unsold players → accelerated round
    if (upcoming.length === 0 && !acceleratedRound) {
      const unsoldPlayers = players.filter((p) => p.status === "unsold");
      if (unsoldPlayers.length > 0) {
        setAcceleratedRound(true);
        // Re-mark unsold players as upcoming with reduced base price
        for (const p of unsoldPlayers) {
          const newBase = getAcceleratedBasePrice(p.base_price);
          await supabase
            .from("players")
            .update({ status: "upcoming", base_price: newBase })
            .eq("id", p.id);
        }
        await supabase.from("chat_messages").insert({
          room_id: room.id,
          sender: "System",
          type: "system",
          message: `🔄 ACCELERATED AUCTION! ${unsoldPlayers.length} unsold players return at ₹20L base price.`,
        });
        toast.info("Accelerated auction started!");
        return;
      }
    }

    // Re-fetch after potential status change
    if (upcoming.length === 0) {
      const { data: freshPlayers } = await supabase
        .from("players")
        .select("*")
        .eq("room_id", room.id)
        .eq("status", "upcoming")
        .order("auction_set", { ascending: true })
        .order("id", { ascending: true });
      upcoming = freshPlayers || [];
    }

    if (upcoming.length === 0) {
      // Auction complete
      await supabase
        .from("auction_state")
        .update({ status: "completed", current_player_id: null, current_bid: 0 })
        .eq("room_id", room.id);
      await supabase
        .from("rooms")
        .update({ status: "completed" })
        .eq("id", room.id);
      toast.success("🏆 Auction Complete!");
      return;
    }

    // Pick a random player from upcoming
    const nextPlayer = upcoming[Math.floor(Math.random() * upcoming.length)];
    const timerEnd = new Date(Date.now() + timerDuration * 1000).toISOString();

    await supabase
      .from("auction_state")
      .update({
        current_player_id: nextPlayer.id,
        current_bid: nextPlayer.base_price,
        current_bidder_id: null,
        current_bidder_team: null,
        timer_ends_at: timerEnd,
        status: "bidding",
      })
      .eq("room_id", room.id);

    await supabase
      .from("players")
      .update({ status: "in_auction" })
      .eq("id", nextPlayer.id);

    // Check which teams CAN'T bid on this player
    const isOverseas = nextPlayer.nationality !== "India";
    const blockedTeams: string[] = [];
    Object.values(allSquadInfos).forEach((info) => {
      if (info.squadFull) {
        blockedTeams.push(info.teamCode);
      } else if (isOverseas && info.overseasSlotsRemaining <= 0) {
        blockedTeams.push(info.teamCode);
      }
    });

    let warningMsg = "";
    if (blockedTeams.length > 0) {
      const names = blockedTeams.map((t) => getTeam(t)?.shortName || t).join(", ");
      warningMsg = isOverseas
        ? ` ⚠️ ${names} cannot bid (overseas slots full).`
        : ` ⚠️ ${names} cannot bid (squad full).`;
    }

    // System message
    await supabase.from("chat_messages").insert({
      room_id: room.id,
      sender: "System",
      type: "system",
      message: `🏏 ${nextPlayer.name} (${nextPlayer.player_role}${isOverseas ? " 🌍" : ""}) is up for auction! Base price: ${formatPrice(nextPlayer.base_price)}${warningMsg}`,
    });
  };

  const markSold = async () => {
    if (!auctionState || !currentPlayer || !auctionState.current_bidder_team) return;

    const soldTeam = auctionState.current_bidder_team;
    const soldPrice = auctionState.current_bid;

    // Update player as sold
    await supabase
      .from("players")
      .update({
        status: "sold",
        sold_to_team: soldTeam,
        sold_price: soldPrice,
      })
      .eq("id", currentPlayer.id);

    // Deduct from buyer's purse
    const buyer = participants.find((p) => p.team === soldTeam);
    if (buyer) {
      await supabase
        .from("participants")
        .update({ purse_left: (buyer.purse_left || 0) - soldPrice })
        .eq("id", buyer.id);
    }

    // Reset auction state
    await supabase
      .from("auction_state")
      .update({
        status: "sold",
        current_bid: 0,
        current_bidder_id: null,
        current_bidder_team: null,
        timer_ends_at: null,
      })
      .eq("room_id", room.id);

    // System message
    const teamInfo = getTeam(soldTeam);
    await supabase.from("chat_messages").insert({
      room_id: room.id,
      sender: "System",
      type: "system",
      message: `💰 SOLD! ${currentPlayer.name} goes to ${teamInfo?.name || soldTeam} for ${formatPrice(soldPrice)}!`,
    });

    toast.success(`${currentPlayer.name} sold to ${teamInfo?.shortName || soldTeam}!`);

    // Trigger sold animation
    setSoldAnimation({
      playerName: currentPlayer.name,
      teamCode: soldTeam,
      price: soldPrice,
    });

    // Auto-advance to next player after sold animation
    setTimeout(async () => {
      setSoldAnimation(null);
      await startNextPlayer();
    }, 3500);
  };

  const markUnsold = async () => {
    if (!currentPlayer) return;

    await supabase
      .from("players")
      .update({ status: "unsold" })
      .eq("id", currentPlayer.id);

    await supabase
      .from("auction_state")
      .update({
        status: "unsold",
        current_bid: 0,
        current_bidder_id: null,
        current_bidder_team: null,
        timer_ends_at: null,
      })
      .eq("room_id", room.id);

    await supabase.from("chat_messages").insert({
      room_id: room.id,
      sender: "System",
      type: "system",
      message: `❌ ${currentPlayer.name} goes UNSOLD!`,
    });

    toast.info(`${currentPlayer.name} unsold`);

    // Auto-advance to next player after brief pause
    setTimeout(async () => {
      await startNextPlayer();
    }, 2000);
  };

  // ── Bidder Actions ──

  const placeBid = async () => {
    if (!auctionState || !currentPlayer || !myParticipant.team || !mySquadInfo) return;
    if (auctionState.status !== "bidding") return;

    const increment = getBidIncrement(auctionState.current_bid);
    const newBid = auctionState.current_bid + increment;

    // Full validation
    const validation = validateBid(
      mySquadInfo,
      currentPlayer,
      newBid,
      auctionState.current_bidder_team,
    );

    if (!validation.canBid) {
      toast.error(validation.reason || "Cannot bid");
      return;
    }

    const timerEnd = new Date(Date.now() + timerDuration * 1000).toISOString();

    // Insert bid
    await supabase.from("bids").insert({
      room_id: room.id,
      player_id: currentPlayer.id,
      team: myParticipant.team,
      bidder_id: userId,
      amount: newBid,
    });

    // Update auction state
    await supabase
      .from("auction_state")
      .update({
        current_bid: newBid,
        current_bidder_id: userId,
        current_bidder_team: myParticipant.team,
        timer_ends_at: timerEnd,
      })
      .eq("room_id", room.id);

    const teamInfo = getTeam(myParticipant.team);
    await supabase.from("chat_messages").insert({
      room_id: room.id,
      sender: myParticipant.display_name,
      sender_team: myParticipant.team,
      type: "bid",
      message: `${teamInfo?.shortName || myParticipant.team} bids ${formatPrice(newBid)}!`,
    });
  };

  const handleTimerEnd = async () => {
    if (!isHost) return;

    if (auctionState?.current_bidder_team) {
      // Someone bid — auto-sell
      await markSold();
    } else {
      // No bids — mark unsold
      await markUnsold();
    }
  };

  // ── Host: Pause / Resume / End / Timer controls ──

  const pauseAuction = async () => {
    if (!auctionState?.timer_ends_at) return;
    const remaining = Math.max(0, Math.ceil((new Date(auctionState.timer_ends_at).getTime() - Date.now()) / 1000));
    setPausedTimeLeft(remaining);
    setIsPaused(true);

    // Set timer far in the future to freeze it
    await supabase
      .from("auction_state")
      .update({ timer_ends_at: new Date(Date.now() + 999_999_000).toISOString() })
      .eq("room_id", room.id);

    await supabase.from("chat_messages").insert({
      room_id: room.id,
      sender: "System",
      type: "system",
      message: `⏸️ Auction PAUSED by host (${remaining}s remaining)`,
    });
    toast.info("Auction paused");
  };

  const resumeAuction = async () => {
    if (pausedTimeLeft === null) return;
    const newEnd = new Date(Date.now() + pausedTimeLeft * 1000).toISOString();
    setIsPaused(false);
    setPausedTimeLeft(null);

    await supabase
      .from("auction_state")
      .update({ timer_ends_at: newEnd })
      .eq("room_id", room.id);

    await supabase.from("chat_messages").insert({
      room_id: room.id,
      sender: "System",
      type: "system",
      message: `▶️ Auction RESUMED by host`,
    });
    toast.info("Auction resumed");
  };

  const endAuction = async () => {
    // Mark all upcoming/in_auction players as unsold
    await supabase
      .from("players")
      .update({ status: "unsold" })
      .eq("room_id", room.id)
      .in("status", ["upcoming", "in_auction"]);

    await supabase
      .from("auction_state")
      .update({ status: "completed", current_player_id: null, current_bid: 0, timer_ends_at: null })
      .eq("room_id", room.id);

    await supabase
      .from("rooms")
      .update({ status: "completed" })
      .eq("id", room.id);

    await supabase.from("chat_messages").insert({
      room_id: room.id,
      sender: "System",
      type: "system",
      message: `🏁 Auction ENDED by host!`,
    });

    toast.success("Auction ended!");
  };

  const changeTimer = (newDuration: number) => {
    setTimerDuration(newDuration);
    toast.success(`Timer set to ${newDuration}s for next player`);
  };

  const unsoldPlayers = players.filter((p) => p.status === "unsold");
  const upcomingPlayers = players.filter((p) => p.status === "upcoming");
  const isAuctionComplete = auctionState?.status === "completed";
  const isBidding = auctionState?.status === "bidding";

  // Compute bid validation for the current user
  const bidValidation = useMemo(() => {
    if (!mySquadInfo || !currentPlayer || !auctionState) {
      return { canBid: false, reason: "No team selected" };
    }
    const increment = getBidIncrement(auctionState.current_bid);
    const nextBid = auctionState.current_bid + increment;
    return validateBid(
      mySquadInfo,
      currentPlayer,
      nextBid,
      auctionState.current_bidder_team,
    );
  }, [mySquadInfo, currentPlayer, auctionState]);

  const canBid = isBidding && bidValidation.canBid;

  // ── Auction stats ──
  const auctionStatsData = useMemo(() => {
    const highestSold = soldPlayers.reduce<{ name: string; price: number; team: string } | null>(
      (max, p) => (!max || (p.sold_price || 0) > max.price ? { name: p.name, price: p.sold_price || 0, team: p.sold_to_team || "" } : max),
      null
    );
    const totalSpent = soldPlayers.reduce((sum, p) => sum + (p.sold_price || 0), 0);
    const avgPrice = soldPlayers.length > 0 ? totalSpent / soldPlayers.length : 0;
    // Most expensive team
    const teamSpend: Record<string, number> = {};
    soldPlayers.forEach((p) => {
      if (p.sold_to_team) {
        teamSpend[p.sold_to_team] = (teamSpend[p.sold_to_team] || 0) + (p.sold_price || 0);
      }
    });
    const topSpendingTeam = Object.entries(teamSpend).sort((a, b) => b[1] - a[1])[0] || null;

    return { highestSold, totalSpent, avgPrice, topSpendingTeam };
  }, [soldPlayers]);

  // ── Helper: team_name(user_name) ──
  const teamDisplayName = useCallback((teamCode: string) => {
    const team = getTeam(teamCode);
    const owner = participants.find((p) => p.team === teamCode);
    const shortName = team?.shortName || teamCode;
    return owner ? `${shortName}(${owner.display_name})` : shortName;
  }, [participants]);

  return (
    <div className="min-h-screen bg-background">
      <AuctionHeader
        room={room}
        isHost={isHost}
        auctionStatus={isPaused ? "paused" : (auctionState?.status || "idle")}
        soldCount={soldPlayers.length}
        unsoldCount={unsoldPlayers.length}
        upcomingCount={upcomingPlayers.length}
        totalPlayers={players.length}
        onToggleChat={() => setShowChat(!showChat)}
        showChat={showChat}
      />

      <div className="max-w-7xl mx-auto p-4">
        {/* Team Purse Bar */}
        <TeamPurseBar participants={participants} maxPurse={room.purse_per_team} teamDisplayName={teamDisplayName} />

        {/* Sold Animation Overlay */}
        <AnimatePresence>
          {soldAnimation && (
            <SoldOverlay
              playerName={soldAnimation.playerName}
              teamCode={soldAnimation.teamCode}
              price={soldAnimation.price}
              teamDisplayName={teamDisplayName}
            />
          )}
        </AnimatePresence>

        {/* Host Controls Bar */}
        {isHost && isBidding && (
          <div className="mt-3 flex flex-wrap items-center gap-2 bg-card rounded-xl border p-3">
            <span className="text-sm font-semibold text-muted-foreground mr-2">Host:</span>
            {!isPaused ? (
              <button
                onClick={pauseAuction}
                className="px-3 py-1.5 rounded-lg text-sm font-medium bg-yellow-500/10 text-yellow-600 hover:bg-yellow-500/20 border border-yellow-500/30 transition-colors"
              >
                ⏸️ Pause
              </button>
            ) : (
              <button
                onClick={resumeAuction}
                className="px-3 py-1.5 rounded-lg text-sm font-medium bg-green-500/10 text-green-600 hover:bg-green-500/20 border border-green-500/30 transition-colors"
              >
                ▶️ Resume ({pausedTimeLeft}s left)
              </button>
            )}
            <button
              onClick={endAuction}
              className="px-3 py-1.5 rounded-lg text-sm font-medium bg-red-500/10 text-red-600 hover:bg-red-500/20 border border-red-500/30 transition-colors"
            >
              🏁 End Auction
            </button>
            <div className="flex items-center gap-1 ml-auto">
              <span className="text-xs text-muted-foreground">Timer:</span>
              {[15, 20, 30, 45].map((d) => (
                <button
                  key={d}
                  onClick={() => changeTimer(d)}
                  className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                    timerDuration === d
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {d}s
                </button>
              ))}
            </div>
          </div>
        )}

        {isAuctionComplete ? (
          <Leaderboard
            soldPlayers={soldPlayers}
            unsoldPlayers={unsoldPlayers}
            participants={participants}
            teamDisplayName={teamDisplayName}
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
            {/* Main Auction Area */}
            <div className="lg:col-span-2 space-y-4">
              {currentPlayer && isBidding ? (
                <>
                  <PlayerCard
                    player={currentPlayer}
                    currentBid={auctionState?.current_bid || 0}
                    currentBidderTeam={auctionState?.current_bidder_team || null}
                    teamDisplayName={teamDisplayName}
                  />
                  <AuctionTimer
                    timerEndsAt={auctionState?.timer_ends_at || null}
                    onTimerEnd={handleTimerEnd}
                    isBidding={isBidding && !isPaused}
                  />
                  <BidControls
                    currentBid={auctionState?.current_bid || 0}
                    canBid={canBid}
                    onBid={placeBid}
                    myTeam={myParticipant.team}
                    currentBidderTeam={auctionState?.current_bidder_team || null}
                    purseLeft={myParticipant.purse_left || 0}
                    isBidding={isBidding}
                    squadInfo={mySquadInfo}
                    bidBlockedReason={bidValidation.reason}
                    currentPlayer={currentPlayer}
                  />
                </>
              ) : (
                <div className="text-center py-12">
                  {auctionState?.status === "sold" || auctionState?.status === "unsold" ? (
                    <div className="space-y-4">
                      <h3 className="font-display text-3xl tracking-wide">
                        {auctionState.status === "sold" ? "💰 Player Sold!" : "❌ Player Unsold"}
                      </h3>
                      <p className="text-muted-foreground animate-pulse">
                        Next player coming up...
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <h3 className="font-display text-3xl tracking-wide text-muted-foreground">
                        Waiting for host to start...
                      </h3>
                      {isHost && upcomingPlayers.length > 0 && (
                        <button
                          onClick={startNextPlayer}
                          className="inline-flex items-center justify-center rounded-xl px-8 py-4 text-lg font-bold bg-secondary hover:bg-secondary/90 text-secondary-foreground transition-colors"
                        >
                          🏏 Start First Player
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Bid History */}
              <BidHistory bids={bids} participants={participants} teamDisplayName={teamDisplayName} />
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              {showChat && <ChatPanel roomId={room.id} myName={myParticipant.display_name} myTeam={myParticipant.team} />}

              {/* Squad Rules Status */}
              {Object.keys(allSquadInfos).length > 0 && (
                <div className="bg-card rounded-xl border p-4">
                  <h3 className="font-display text-lg tracking-wide mb-3">
                    Squad Status
                  </h3>
                  <div className="space-y-2">
                    {Object.values(allSquadInfos).map((info) => {
                      const team = getTeam(info.teamCode);
                      if (!team) return null;
                      const overseasWarning = info.overseasSlotsRemaining <= 1;
                      const squadWarning = info.slotsRemaining <= 3;
                      return (
                        <div key={info.teamCode} className="flex items-center justify-between text-sm py-1.5 px-2 rounded bg-muted/30">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold"
                              style={{ backgroundColor: team.primary, color: team.accent }}
                            >
                              {team.code}
                            </span>
                            <span className="font-medium">{teamDisplayName(info.teamCode)}</span>
                          </div>
                          <div className="flex items-center gap-3 text-xs">
                            <span className={squadWarning ? "text-orange-500 font-semibold" : "text-muted-foreground"}>
                              {info.totalPlayers}/{MAX_SQUAD_SIZE}
                            </span>
                            <span className={overseasWarning ? "text-red-500 font-semibold" : "text-muted-foreground"}>
                              🌍 {info.overseasCount}/{MAX_OVERSEAS}
                            </span>
                            <span className="text-muted-foreground">
                              {formatPrice(info.purseLeft)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-2 pt-2 border-t text-[10px] text-muted-foreground space-y-0.5">
                    <div>Max squad: {MAX_SQUAD_SIZE} • Max overseas: {MAX_OVERSEAS}</div>
                  </div>
                </div>
              )}

              {/* Auction Stats */}
              {soldPlayers.length > 0 && (
                <AuctionStats
                  highestSold={auctionStatsData.highestSold}
                  totalSpent={auctionStatsData.totalSpent}
                  avgPrice={auctionStatsData.avgPrice}
                  topSpendingTeam={auctionStatsData.topSpendingTeam}
                  teamDisplayName={teamDisplayName}
                />
              )}

              {/* Sold Players Summary */}
              {soldPlayers.length > 0 && (
                <div className="bg-card rounded-xl border p-4">
                  <h3 className="font-display text-lg tracking-wide mb-3">
                    Sold ({soldPlayers.length})
                  </h3>
                  <div className="space-y-1.5 max-h-60 overflow-y-auto">
                    {soldPlayers.map((p) => {
                      const team = p.sold_to_team ? getTeam(p.sold_to_team) : null;
                      return (
                        <div key={p.id} className="flex items-center justify-between text-sm py-1 px-2 rounded bg-muted/30">
                          <div className="flex items-center gap-2">
                            {team && (
                              <span
                                className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold"
                                style={{ backgroundColor: team.primary, color: team.accent }}
                              >
                                {team.code}
                              </span>
                            )}
                            <span className="font-medium">{p.name}</span>
                            {p.sold_to_team && (
                              <span className="text-[10px] text-muted-foreground">
                                → {teamDisplayName(p.sold_to_team)}
                              </span>
                            )}
                          </div>
                          <span className="text-xs font-semibold">
                            {p.sold_price ? formatPrice(p.sold_price) : ""}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Upcoming Players */}
              {upcomingPlayers.length > 0 && (
                <div className="bg-card rounded-xl border p-4">
                  <h3 className="font-display text-lg tracking-wide mb-3">
                    Upcoming ({upcomingPlayers.length})
                  </h3>
                  <div className="space-y-1.5 max-h-60 overflow-y-auto">
                    {upcomingPlayers.slice(0, 10).map((p) => (
                      <div key={p.id} className="flex items-center justify-between text-sm py-1 px-2 rounded bg-muted/30">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{p.name}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                            {p.player_role}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {formatPrice(p.base_price)}
                        </span>
                      </div>
                    ))}
                    {upcomingPlayers.length > 10 && (
                      <p className="text-xs text-muted-foreground text-center pt-1">
                        +{upcomingPlayers.length - 10} more
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Squad Viewer - click to expand each team's squad */}
              <SquadViewer
                soldPlayers={soldPlayers}
                participants={participants}
                teamDisplayName={teamDisplayName}
                myTeam={myParticipant.team}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuctionRoom;
