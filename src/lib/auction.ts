export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export function getUserId(): string {
  let id = localStorage.getItem('ipl-auction-user-id');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('ipl-auction-user-id', id);
  }
  return id;
}

export function getDisplayName(): string | null {
  return localStorage.getItem('ipl-auction-display-name');
}

export function setDisplayName(name: string): void {
  localStorage.setItem('ipl-auction-display-name', name);
}

export function formatPrice(rupees: number): string {
  if (rupees >= 10_000_000) return `₹${(rupees / 10_000_000).toFixed(1)} Cr`;
  if (rupees >= 100_000) return `₹${(rupees / 100_000).toFixed(0)} L`;
  return `₹${rupees.toLocaleString('en-IN')}`;
}

export function getBidIncrement(currentBid: number): number {
  if (currentBid < 5_000_000) return 500_000;
  if (currentBid < 20_000_000) return 2_000_000;
  if (currentBid < 50_000_000) return 5_000_000;
  return 10_000_000;
}

export const DEFAULT_PLAYERS = [
  { name: 'Virat Kohli', player_role: 'Batsman', nationality: 'India', base_price: 20_000_000, auction_set: 1, stats: { matches: 237, runs: 7263, avg: 37.44, sr: 130.1 } },
  { name: 'Rohit Sharma', player_role: 'Batsman', nationality: 'India', base_price: 20_000_000, auction_set: 1, stats: { matches: 243, runs: 6211, avg: 29.8, sr: 130.4 } },
  { name: 'Jasprit Bumrah', player_role: 'Bowler', nationality: 'India', base_price: 20_000_000, auction_set: 1, stats: { matches: 135, wickets: 145, economy: 7.4, avg: 21.9 } },
  { name: 'MS Dhoni', player_role: 'WK', nationality: 'India', base_price: 20_000_000, auction_set: 1, stats: { matches: 250, runs: 5082, avg: 39.4, sr: 135.9 } },
  { name: 'Hardik Pandya', player_role: 'All-rounder', nationality: 'India', base_price: 15_000_000, auction_set: 2, stats: { matches: 115, runs: 2568, wickets: 62 } },
  { name: 'Ravindra Jadeja', player_role: 'All-rounder', nationality: 'India', base_price: 15_000_000, auction_set: 2, stats: { matches: 236, runs: 2692, wickets: 132 } },
  { name: 'Suryakumar Yadav', player_role: 'Batsman', nationality: 'India', base_price: 15_000_000, auction_set: 2, stats: { matches: 150, runs: 4200, avg: 32.5, sr: 147.3 } },
  { name: 'Rishabh Pant', player_role: 'WK', nationality: 'India', base_price: 15_000_000, auction_set: 2, stats: { matches: 110, runs: 3200, avg: 35.2, sr: 148.7 } },
  { name: 'Rashid Khan', player_role: 'Bowler', nationality: 'Afghanistan', base_price: 15_000_000, auction_set: 2, stats: { matches: 110, wickets: 130, economy: 6.7, avg: 20.1 } },
  { name: 'KL Rahul', player_role: 'Batsman', nationality: 'India', base_price: 12_000_000, auction_set: 3, stats: { matches: 120, runs: 4200, avg: 44.1, sr: 136.2 } },
  { name: 'Shubman Gill', player_role: 'Batsman', nationality: 'India', base_price: 12_000_000, auction_set: 3, stats: { matches: 80, runs: 2500, avg: 35.7, sr: 131.5 } },
  { name: 'Yuzvendra Chahal', player_role: 'Bowler', nationality: 'India', base_price: 10_000_000, auction_set: 3, stats: { matches: 150, wickets: 187, economy: 7.6, avg: 22.3 } },
  { name: 'Trent Boult', player_role: 'Bowler', nationality: 'New Zealand', base_price: 10_000_000, auction_set: 3, stats: { matches: 80, wickets: 95, economy: 8.1, avg: 24.5 } },
  { name: 'Jos Buttler', player_role: 'WK', nationality: 'England', base_price: 12_000_000, auction_set: 3, stats: { matches: 90, runs: 3200, avg: 38.5, sr: 150.2 } },
  { name: 'Ravichandran Ashwin', player_role: 'All-rounder', nationality: 'India', base_price: 8_000_000, auction_set: 4, stats: { matches: 200, wickets: 180, economy: 6.9, avg: 24.1 } },
  { name: 'Mohammed Shami', player_role: 'Bowler', nationality: 'India', base_price: 10_000_000, auction_set: 4, stats: { matches: 100, wickets: 110, economy: 8.3, avg: 26.7 } },
  { name: 'David Warner', player_role: 'Batsman', nationality: 'Australia', base_price: 10_000_000, auction_set: 4, stats: { matches: 180, runs: 6500, avg: 41.2, sr: 139.8 } },
  { name: 'Pat Cummins', player_role: 'Bowler', nationality: 'Australia', base_price: 12_000_000, auction_set: 4, stats: { matches: 50, wickets: 55, economy: 8.6, avg: 28.3 } },
  { name: 'Ishan Kishan', player_role: 'WK', nationality: 'India', base_price: 8_000_000, auction_set: 5, stats: { matches: 70, runs: 1800, avg: 28.5, sr: 136.4 } },
  { name: 'Kagiso Rabada', player_role: 'Bowler', nationality: 'South Africa', base_price: 10_000_000, auction_set: 5, stats: { matches: 60, wickets: 78, economy: 8.2, avg: 22.8 } },
];
