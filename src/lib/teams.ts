export interface TeamInfo {
  code: string;
  name: string;
  shortName: string;
  primary: string;
  secondary: string;
  accent: string;
}

export const IPL_TEAMS: TeamInfo[] = [
  { code: 'CSK', name: 'Chennai Super Kings', shortName: 'Chennai', primary: '#F9CD05', secondary: '#0081E9', accent: '#FFFFFF' },
  { code: 'MI', name: 'Mumbai Indians', shortName: 'Mumbai', primary: '#004BA0', secondary: '#FFFFFF', accent: '#D4AF37' },
  { code: 'RCB', name: 'Royal Challengers Bengaluru', shortName: 'Bengaluru', primary: '#EC1C24', secondary: '#000000', accent: '#F7A721' },
  { code: 'KKR', name: 'Kolkata Knight Riders', shortName: 'Kolkata', primary: '#3A225D', secondary: '#B3974E', accent: '#FFFFFF' },
  { code: 'RR', name: 'Rajasthan Royals', shortName: 'Rajasthan', primary: '#E91E8C', secondary: '#254AA5', accent: '#FFFFFF' },
  { code: 'SRH', name: 'Sunrisers Hyderabad', shortName: 'Hyderabad', primary: '#FF822A', secondary: '#000000', accent: '#FFFFFF' },
  { code: 'DC', name: 'Delhi Capitals', shortName: 'Delhi', primary: '#0078BC', secondary: '#EF1B23', accent: '#FFFFFF' },
  { code: 'PBKS', name: 'Punjab Kings', shortName: 'Punjab', primary: '#ED1B24', secondary: '#A7A9AC', accent: '#FFFFFF' },
  { code: 'LSG', name: 'Lucknow Super Giants', shortName: 'Lucknow', primary: '#A0E4F8', secondary: '#1B3F6B', accent: '#FFFFFF' },
  { code: 'GT', name: 'Gujarat Titans', shortName: 'Gujarat', primary: '#1C1C6E', secondary: '#B8860B', accent: '#FFFFFF' },
];

export function getTeam(code: string): TeamInfo | undefined {
  return IPL_TEAMS.find(t => t.code === code);
}
