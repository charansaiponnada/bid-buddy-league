import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getTeam } from "@/lib/teams";
import { formatPrice } from "@/lib/auction";
import type { Tables } from "@/integrations/supabase/types";

type Participant = Tables<"participants">;

interface ParticipantListProps {
  participants: Participant[];
  hostId: string;
  currentUserId: string;
  isHost: boolean;
  onKick?: (participantId: string, displayName: string) => void;
}

const ParticipantList = ({ participants, hostId, currentUserId, isHost, onKick }: ParticipantListProps) => {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="font-display text-2xl tracking-wide">
          Players ({participants.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {participants.map((p) => {
            const team = p.team ? getTeam(p.team) : null;
            const isMe = p.user_id === currentUserId;
            const isHostUser = p.user_id === hostId;
            const canKick = isHost && !isHostUser && !isMe;

            return (
              <div
                key={p.id}
                className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50"
              >
                <div className="flex items-center gap-3">
                  {team && (
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center font-display text-xs"
                      style={{ backgroundColor: team.primary, color: team.accent }}
                    >
                      {team.code}
                    </div>
                  )}
                  {!team && (
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground text-xs">
                      ?
                    </div>
                  )}
                  <div>
                    <span className="font-medium">
                      {p.display_name}
                      {isMe && <span className="text-muted-foreground ml-1">(You)</span>}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isHostUser && (
                    <Badge variant="outline" className="text-xs">Host</Badge>
                  )}
                  <Badge variant="secondary" className="text-xs capitalize">
                    {p.role}
                  </Badge>
                  {canKick && onKick && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => onKick(p.id, p.display_name)}
                    >
                      Kick
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default ParticipantList;
