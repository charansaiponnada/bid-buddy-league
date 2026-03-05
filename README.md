# 🏏 Bid Buddy League — IPL Auction Simulator

A real-time, multiplayer IPL-style cricket auction simulator built with React, TypeScript, and Supabase. Create rooms, invite friends, pick teams, and bid on 147+ real IPL players — all in your browser.

![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-Realtime-3FCF8E?logo=supabase&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-06B6D4?logo=tailwindcss&logoColor=white)

---

## ✨ Features

- **Create & Join Rooms** — Generate a 6-character room code, set a passcode, and invite participants
- **Team Selection** — Pick from all 10 official IPL teams (CSK, MI, RCB, KKR, RR, SRH, DC, PBKS, LSG, GT)
- **147+ Real IPL Players** — Pre-loaded database with career stats (matches, runs, avg, SR, wickets, economy)
- **Live Bidding** — Real-time auction powered by Supabase Realtime subscriptions
- **Player Cards** — CREX-style cards with player images (or auto-generated initials avatars), role badges, and stats
- **Auction Timer** — Countdown timer for each bid round
- **Bid Controls** — Configurable bid increments based on current price
- **Team Purse Tracking** — Configurable purse (₹50Cr / ₹75Cr / ₹90Cr / ₹120Cr) with live remaining balance
- **Squad Viewer** — View each team's purchased squad in real-time
- **Leaderboard** — Track team spending and player counts
- **Bid History & Chat** — Full bid log and in-room chat
- **Sold Overlay** — Animated overlay when a player is sold
- **Results Page** — Post-auction results summary at `/results/:code`
- **CSV Import/Export** — Upload your own player CSV or load the full IPL database
- **Custom Players** — Manually add players with name, role, nationality, base price, set, and image URL
- **Auction Sets** — Players grouped into 5 auction sets by base price tier
- **Mobile Responsive** — Works on desktop and mobile devices

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, TypeScript, Vite |
| **Styling** | Tailwind CSS, shadcn/ui (Radix primitives) |
| **State** | TanStack React Query |
| **Backend** | Supabase (PostgreSQL + Realtime + Auth) |
| **Animations** | Framer Motion |
| **Routing** | React Router v6 |
| **Charts** | Recharts |
| **Deployment** | Vercel |
| **Testing** | Vitest, Testing Library |
| **Data Scraper** | Python (Playwright for live scraping, built-in fallback) |

## 📁 Project Structure

```
├── public/data/              # IPL player CSV database
├── scripts/                  # Python scraper for IPL stats
├── src/
│   ├── components/
│   │   ├── auction/          # AuctionRoom, PlayerCard, BidControls, Leaderboard, etc.
│   │   ├── room/             # Lobby, TeamSelector, PlayerManager
│   │   └── ui/               # shadcn/ui components
│   ├── hooks/                # Custom React hooks
│   ├── integrations/supabase # Supabase client & generated types
│   ├── lib/                  # Auction logic, team data, utilities
│   ├── pages/                # Index, Room, Results, NotFound
│   └── test/                 # Test setup & specs
├── supabase/                 # DB config & migrations
└── vercel.json               # Deployment config
```

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+ and **npm** (or Bun)
- A **Supabase** project (free tier works)
- **Python 3.8+** (optional, only for regenerating player data)

### 1. Clone the repo

```bash
git clone https://github.com/charansaiponnada/bid-buddy-league.git
cd bid-buddy-league
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment

Create a `.env` file in the root:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 4. Set up the database

Run the migration in your Supabase project:

```bash
npx supabase db push
```

Or manually execute the SQL from `supabase/migrations/` in the Supabase SQL Editor.

### 5. Start the dev server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## 🏏 Regenerating Player Data

The IPL player database can be refreshed using the Python scraper:

```bash
# Use built-in stats (no network required)
python scripts/scrape_ipl_stats.py --local

# Attempt live scrape from iplt20.com, fallback to built-in
pip install playwright && playwright install chromium
python scripts/scrape_ipl_stats.py
```

This regenerates `public/data/ipl_players.csv` with 147+ players including stats and image URLs.

## 📜 Available Scripts

| Command | Description |
|---------|------------|
| `npm run dev` | Start dev server on port 5173 |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |
| `npm run test` | Run tests with Vitest |
| `npm run test:watch` | Run tests in watch mode |

## 🤝 Contributors

<table>
  <tr>
    <td align="center">
      <a href="https://github.com/charansaiponnada">
        <img src="https://github.com/charansaiponnada.png" width="80px;" alt="Charan Sai Ponnada" style="border-radius:50%"/>
        <br />
        <sub><b>Charan Sai Ponnada</b></sub>
      </a>
      <br />
      <sub>Lead Developer</sub>
    </td>
    <td align="center">
      <a href="https://lovable.dev">
        <img src="https://ui-avatars.com/api/?name=Lovable&background=7c3aed&color=fff&size=80&bold=true" width="80px;" alt="Lovable" style="border-radius:50%"/>
        <br />
        <sub><b>Lovable</b></sub>
      </a>
      <br />
      <sub>AI Scaffold</sub>
    </td>
  </tr>
</table>

## 📄 License

This project is for personal/educational use. Feel free to fork and modify.

---

<p align="center">
  Built with ❤️ for cricket fans
</p>
