import { formatPrice } from "@/lib/auction";
import { getTeam } from "@/lib/teams";
import type { Tables } from "@/integrations/supabase/types";

type Participant = Tables<"participants">;

interface TeamPurseBarProps {
  participants: Participant[];
  maxPurse: number;
}

const TeamPurseBar = ({ participants, maxPurse }: TeamPurseBarProps) => {
  const teamsWithPurse = participants.filter((p) => p.team);

  if (teamsWithPurse.length === 0) return null;

  return (
    <div className="bg-card rounded-xl border p-4">
      <h3 className="font-display text-sm tracking-wider uppercase text-muted-foreground mb-3">
        Team Purses
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {teamsWithPurse.map((p) => {
          const team = p.team ? getTeam(p.team) : null;
          const purseLeft = p.purse_left || 0;
          const percentage = maxPurse > 0 ? (purseLeft / maxPurse) * 100 : 0;

          return (
            <div
              key={p.id}
              className="rounded-lg p-2 border"
              style={{
                borderColor: team ? `${team.primary}40` : undefined,
              }}
            >
              <div className="flex items-center gap-1.5 mb-1.5">
                {team && (
                  <span
                    className="w-5 h-5 rounded-full flex items-center justify-center text-[7px] font-bold"
                    style={{ backgroundColor: team.primary, color: team.accent }}
                  >
                    {team.code}
                  </span>
                )}
                <span className="text-xs font-semibold truncate">
                  {team?.shortName || p.display_name}
                </span>
              </div>
              <div className="text-sm font-bold">{formatPrice(purseLeft)}</div>
              <div className="h-1.5 bg-muted rounded-full mt-1 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${percentage}%`,
                    backgroundColor: team?.primary || "#888",
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TeamPurseBar;
