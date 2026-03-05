import { motion } from "framer-motion";
import { formatPrice } from "@/lib/auction";
import { getTeam } from "@/lib/teams";

interface SoldOverlayProps {
  playerName: string;
  teamCode: string;
  price: number;
  teamDisplayName: (teamCode: string) => string;
}

const SoldOverlay = ({ playerName, teamCode, price, teamDisplayName }: SoldOverlayProps) => {
  const team = getTeam(teamCode);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 pointer-events-none"
    >
      <motion.div
        initial={{ scale: 0.3, rotate: -10 }}
        animate={{ scale: 1, rotate: 0 }}
        exit={{ scale: 0.5, opacity: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
        className="text-center space-y-4"
      >
        {/* SOLD stamp */}
        <motion.div
          initial={{ scale: 3, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, type: "spring", stiffness: 300, damping: 20 }}
          className="flex items-center justify-center"
        >
          <div
            className="px-12 py-5 rounded-2xl border-4 shadow-2xl"
            style={{
              backgroundColor: team?.primary || "#333",
              borderColor: team?.accent || "#fff",
            }}
          >
            <div className="text-5xl font-bold mb-1" style={{ color: team?.accent || "#fff" }}>
              💰 SOLD!
            </div>
          </div>
        </motion.div>

        {/* Player name */}
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="font-display text-4xl text-white tracking-wide drop-shadow-lg"
        >
          {playerName}
        </motion.div>

        {/* Team & Price */}
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="space-y-2"
        >
          <div className="flex items-center justify-center gap-3">
            {team && (
              <span
                className="w-12 h-12 rounded-full flex items-center justify-center font-display text-sm font-bold"
                style={{ backgroundColor: team.primary, color: team.accent }}
              >
                {team.code}
              </span>
            )}
            <span className="font-display text-3xl text-white">
              {teamDisplayName(teamCode)}
            </span>
          </div>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.7, type: "spring", stiffness: 200 }}
            className="font-display text-5xl text-secondary tracking-wide drop-shadow-lg"
          >
            {formatPrice(price)}
          </motion.div>
        </motion.div>

        {/* Confetti particles */}
        {[...Array(12)].map((_, i) => (
          <motion.div
            key={i}
            initial={{
              x: 0,
              y: 0,
              opacity: 1,
              scale: 1,
            }}
            animate={{
              x: (Math.random() - 0.5) * 600,
              y: (Math.random() - 0.5) * 400,
              opacity: 0,
              scale: 0,
              rotate: Math.random() * 720,
            }}
            transition={{
              duration: 2,
              delay: 0.2 + Math.random() * 0.3,
              ease: "easeOut",
            }}
            className="absolute text-3xl pointer-events-none"
            style={{
              left: "50%",
              top: "50%",
            }}
          >
            {["🎉", "🏏", "💰", "⭐", "🔥", "🎊"][i % 6]}
          </motion.div>
        ))}
      </motion.div>
    </motion.div>
  );
};

export default SoldOverlay;
