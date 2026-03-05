import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getTeam } from "@/lib/teams";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { Tables } from "@/integrations/supabase/types";

type ChatMessage = Tables<"chat_messages">;

interface ChatPanelProps {
  roomId: string;
  myName: string;
  myTeam: string | null;
}

const ChatPanel = ({ roomId, myName, myTeam }: ChatPanelProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadMessages = useCallback(async () => {
    const { data } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("room_id", roomId)
      .order("created_at", { ascending: true })
      .limit(100);
    if (data) setMessages(data);
  }, [roomId]);

  useEffect(() => {
    loadMessages();

    const channel = supabase
      .channel(`chat:${roomId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "chat_messages",
        filter: `room_id=eq.${roomId}`,
      }, (payload) => {
        const msg = payload.new as ChatMessage;
        setMessages((prev) => [...prev, msg]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [roomId, loadMessages]);

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || sending) return;
    setSending(true);
    try {
      await supabase.from("chat_messages").insert({
        room_id: roomId,
        sender: myName,
        sender_team: myTeam,
        type: "chat",
        message: input.trim(),
      });
      setInput("");
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="bg-card rounded-xl border flex flex-col h-80">
      <div className="px-4 py-2 border-b">
        <h3 className="font-display text-lg tracking-wide">Chat</h3>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2">
        {messages.map((msg) => {
          const team = msg.sender_team ? getTeam(msg.sender_team) : null;
          const isSystem = msg.type === "system" || msg.type === "bid";

          return (
            <div
              key={msg.id}
              className={`text-sm ${
                isSystem ? "text-center" : ""
              }`}
            >
              {isSystem ? (
                <span className={`inline-block px-3 py-1 rounded-full text-xs ${
                  msg.type === "bid"
                    ? "bg-secondary/10 text-secondary font-semibold"
                    : "bg-muted text-muted-foreground"
                }`}>
                  {msg.message}
                </span>
              ) : (
                <div className="flex items-start gap-2">
                  {team && (
                    <span
                      className="w-5 h-5 rounded-full flex items-center justify-center text-[7px] font-bold flex-shrink-0 mt-0.5"
                      style={{ backgroundColor: team.primary, color: team.accent }}
                    >
                      {team.code}
                    </span>
                  )}
                  <div>
                    <span className="font-semibold text-xs">{msg.sender}: </span>
                    <span className="text-muted-foreground">{msg.message}</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="p-2 border-t flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          className="h-8 text-sm"
        />
        <Button onClick={sendMessage} size="sm" disabled={sending || !input.trim()} className="h-8 px-3">
          Send
        </Button>
      </div>
    </div>
  );
};

export default ChatPanel;
