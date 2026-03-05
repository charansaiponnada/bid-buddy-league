

# 🏏 IPL Auction Simulator — Implementation Plan

## Overview
A real-time IPL-style cricket auction app where friends can create rooms, pick teams, upload custom player lists, and bid live — all synced via Supabase Realtime.

---

## Phase 1: Foundation & Database

### Supabase Setup
- **Tables:** `rooms`, `participants`, `players`, `auction_state`, `bids`, `chat_messages`
- **Room codes:** 6-character unique codes for easy sharing
- **Anonymous identity:** Client-generated session IDs stored in localStorage
- **RLS policies** to scope data access per room

### Edge Functions
- **place-bid:** Atomic bid validation with row-level locking (prevents race conditions)
- **next-player:** Host-only action to advance the auction
- **mark-sold / mark-unsold:** Host confirms sale or passes

---

## Phase 2: Home & Room Creation

### Home Page
- **Create Room** form: set room name, passcode, purse amount (default ₹90 Cr)
- **Join Room** form: enter 6-digit code + passcode
- Clean, cricket-themed design with IPL colors

### Lobby Page (`/room/:code`)
- **Team selector** grid showing all 10 IPL teams with real colors/logos
- Teams lock when selected (real-time — others see it taken instantly)
- **Participant list** showing who's joined and their team
- **Host controls:** Start Auction button, kick players
- Role toggle: Bidder vs Spectator

---

## Phase 3: Custom Player Upload

- Host can **upload a CSV or manually add players** before starting the auction
- Fields: Name, Role (Batsman/Bowler/All-rounder/WK), Nationality, Base Price, Stats
- Players grouped into auction sets (1-5)
- A **default dataset of ~20 marquee players** is pre-loaded as a template the host can use or replace

---

## Phase 4: Live Auction Screen

### Main Layout (desktop-first, responsive)
- **Left:** Player Card — photo placeholder, name, role, nationality, stats, base price
- **Center:** Current bid display, countdown timer, big BID button
- **Right sidebar:** All teams' remaining purse tracker
- **Bottom panel:** Live chat + bid feed

### Bidding Mechanics
- Smart bid increments (₹5L under 50L, ₹20L under 2Cr, ₹50L under 5Cr, ₹1Cr above)
- Server-authoritative timer (all clients sync to `timer_ends_at`)
- Bid button disabled if: you're a spectator, you're already highest bidder, or insufficient purse
- Optimistic UI: button shows spinner while bid processes

### Host Controls (during auction)
- Next Player / Skip (Unsold)
- Pause / Resume timer
- Confirm SOLD
- Override bid (emergency)

---

## Phase 5: Real-time & Animations

### Supabase Realtime Subscriptions
- `auction_state` changes → all clients update current bid, timer, player
- `bids` inserts → feed updates in chat panel
- `participants` changes → lobby updates, purse sidebar updates
- `chat_messages` inserts → live chat

### SOLD Animation
- Dark overlay fades in → "SOLD!" text bounces in → team badge + final price → auto-dismiss after 3 seconds
- CSS keyframe animations (no extra library needed)

---

## Phase 6: Polish & UX

- **Team color system** with all 10 IPL team palettes applied to badges, borders, and accents
- **Responsive layout** for mobile (stacked view)
- **Share room** button (copies link)
- **Bid history** log per player
- **End-of-auction summary** showing each team's squad + total spend
- Toast notifications for key events (outbid, sold, new player)
- Error handling for disconnections and failed bids

