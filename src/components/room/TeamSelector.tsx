import { IPL_TEAMS, type TeamInfo } from "@/lib/teams";
import { cn } from "@/lib/utils";
import type { Tables } from "@/integrations/supabase/types";

type Participant = Tables<"participants">;

interface TeamSelectorProps {
  selectedTeam: string | null;
  takenTeams: string[];
  onSelect: (code: string) => void;
  participants: Participant[];
}

const TeamSelector = ({ selectedTeam, takenTeams, onSelect, participants }: TeamSelectorProps) => {
  const getTeamOwner = (code: string) => {
    const p = participants.find((p) => p.team === code);
    return p?.display_name || null;
  };

  return (
    <div>
      <h2 className="font-display text-2xl tracking-wide mb-3">Pick Your Team</h2>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {IPL_TEAMS.map((team) => {
          const isMine = selectedTeam === team.code;
          const isTaken = takenTeams.includes(team.code);
          const owner = getTeamOwner(team.code);

          return (
            <button
              key={team.code}
              onClick={() => !isTaken && onSelect(team.code)}
              disabled={isTaken}
              className={cn(
                "relative rounded-xl p-4 text-center transition-all duration-200 border-2",
                isMine
                  ? "ring-2 ring-offset-2 ring-ring scale-105 shadow-lg"
                  : isTaken
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:scale-105 hover:shadow-md cursor-pointer"
              )}
              style={{
                backgroundColor: team.primary,
                borderColor: isMine ? team.secondary : "transparent",
                color: team.accent,
              }}
            >
              <div className="font-display text-2xl tracking-wider">{team.code}</div>
              <div className="text-xs mt-1 opacity-80">{team.shortName}</div>
              {owner && (
                <div className="text-[10px] mt-2 px-2 py-0.5 rounded-full bg-black/30 inline-block">
                  {isMine ? "You" : owner}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default TeamSelector;
