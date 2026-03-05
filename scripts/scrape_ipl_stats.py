"""
IPL All-Time Player Stats Generator
Attempts to scrape from iplt20.com. If scraping fails (anti-bot, JS rendering),
falls back to a comprehensive built-in dataset of real IPL career stats.

Requirements:
  pip install playwright
  playwright install chromium

Usage:
  python scrape_ipl_stats.py          # Try scraping first, fallback to built-in
  python scrape_ipl_stats.py --local  # Skip scraping, use built-in data only
"""

import asyncio
import csv
import re
import sys
from pathlib import Path

OUTPUT_DIR = Path(__file__).parent.parent / "public" / "data"
OUTPUT_CSV = OUTPUT_DIR / "ipl_players.csv"

# ─── Known role classifications ───

KNOWN_WK = {
    "MS Dhoni", "Rishabh Pant", "KL Rahul", "Ishan Kishan",
    "Jos Buttler", "Quinton de Kock", "Sanju Samson", "Wriddhiman Saha",
    "Jonny Bairstow", "Dinesh Karthik", "Robin Uthappa", "Nicholas Pooran",
    "Heinrich Klaasen", "Adam Gilchrist", "Naman Ojha", "Parthiv Patel",
    "Matthew Wade", "Phil Salt", "Devon Conway", "Jitesh Sharma",
    "KS Bharat", "Ben Duckett", "Sam Billings", "Glenn Phillips",
}

KNOWN_ALLROUNDERS = {
    "Hardik Pandya", "Ravindra Jadeja", "Andre Russell", "Ben Stokes",
    "Ravichandran Ashwin", "Shakib Al Hasan", "Marcus Stoinis",
    "Axar Patel", "Washington Sundar", "Moeen Ali", "Sam Curran",
    "Cameron Green", "Mitchell Marsh", "Glenn Maxwell", "Chris Morris",
    "Dwayne Bravo", "Shane Watson", "Jacques Kallis", "Yusuf Pathan",
    "Sunil Narine", "Krunal Pandya", "Venkatesh Iyer", "Liam Livingstone",
    "Shivam Dube", "Shahbaz Ahmed", "Nitish Rana", "Lalit Yadav",
    "Vijay Shankar", "Deepak Hooda", "Abhishek Sharma", "Irfan Pathan",
    "JP Duminy", "David Wiese", "Marco Jansen", "Shardul Thakur",
    "Harshal Patel", "Pat Cummins", "Jason Holder", "Dwayne Smith",
    "Riyan Parag",
}

KNOWN_OVERSEAS = {
    "Jos Buttler": "England", "Quinton de Kock": "South Africa",
    "Jonny Bairstow": "England", "Nicholas Pooran": "West Indies",
    "Heinrich Klaasen": "South Africa", "Adam Gilchrist": "Australia",
    "Matthew Wade": "Australia", "Phil Salt": "England",
    "Devon Conway": "New Zealand", "Ben Duckett": "England",
    "Sam Billings": "England", "Glenn Phillips": "New Zealand",
    "Andre Russell": "West Indies", "Ben Stokes": "England",
    "Shakib Al Hasan": "Bangladesh", "Marcus Stoinis": "Australia",
    "Moeen Ali": "England", "Sam Curran": "England",
    "Cameron Green": "Australia", "Mitchell Marsh": "Australia",
    "Glenn Maxwell": "Australia", "Chris Morris": "South Africa",
    "Dwayne Bravo": "West Indies", "Shane Watson": "Australia",
    "Jacques Kallis": "South Africa", "Sunil Narine": "West Indies",
    "Liam Livingstone": "England", "David Wiese": "Namibia",
    "Marco Jansen": "South Africa", "JP Duminy": "South Africa",
    "AB de Villiers": "South Africa", "David Warner": "Australia",
    "Chris Gayle": "West Indies", "Kane Williamson": "New Zealand",
    "Steve Smith": "Australia", "Faf du Plessis": "South Africa",
    "Alex Hales": "England", "Travis Head": "Australia",
    "Aiden Markram": "South Africa", "Rachin Ravindra": "New Zealand",
    "Rashid Khan": "Afghanistan", "Trent Boult": "New Zealand",
    "Pat Cummins": "Australia", "Kagiso Rabada": "South Africa",
    "Anrich Nortje": "South Africa", "Mitchell Starc": "Australia",
    "Lockie Ferguson": "New Zealand", "Adam Zampa": "Australia",
    "Mustafizur Rahman": "Bangladesh", "Mark Wood": "England",
    "Josh Hazlewood": "Australia", "Kyle Jamieson": "New Zealand",
    "Tim Southee": "New Zealand", "Wanindu Hasaranga": "Sri Lanka",
    "Maheesh Theekshana": "Sri Lanka", "Matheesha Pathirana": "Sri Lanka",
    "Gerald Coetzee": "South Africa", "Alzarri Joseph": "West Indies",
    "Jason Holder": "West Indies", "Dwaine Pretorius": "South Africa",
    "Daniel Sams": "Australia", "Imran Tahir": "South Africa",
    "Lasith Malinga": "Sri Lanka", "Dale Steyn": "South Africa",
    "Morne Morkel": "South Africa", "Brett Lee": "Australia",
    "Dirk Nannes": "Australia", "Brendon McCullum": "New Zealand",
    "Shaun Marsh": "Australia", "Dwayne Smith": "West Indies",
    "Jofra Archer": "England", "Noor Ahmad": "Afghanistan",
    "Sachin Baby": "India",
}


# ─── Player image URL helper ───
# Uses the IPL official headshot CDN and ui-avatars fallback.
# You can add known player image URLs here for real headshots.
# Sources: iplt20.com, ESPNcricinfo, Cricbuzz

KNOWN_IMAGES = {
    # Add real headshot URLs here, e.g.:
    # "Virat Kohli": "https://documents.iplt20.com/ipl/IPLHeadshot2024/2.png",
}

def get_image_url(name):
    """Return a player image URL. Uses known images dict, falls back to ui-avatars."""
    if name in KNOWN_IMAGES:
        return KNOWN_IMAGES[name]
    # Generate a clean initials-based avatar via ui-avatars.com
    encoded = name.replace(" ", "+")
    return f"https://ui-avatars.com/api/?name={encoded}&background=1a237e&color=ffffff&size=160&bold=true&format=svg"


def classify_role(name, runs, wickets):
    if name in KNOWN_WK:
        return "WK"
    if name in KNOWN_ALLROUNDERS:
        return "All-rounder"
    if wickets > 20 and runs < 300:
        return "Bowler"
    if wickets > 20 and runs > 500:
        return "All-rounder"
    if wickets > 0 and runs < 200:
        return "Bowler"
    return "Batsman"


def get_nationality(name):
    return KNOWN_OVERSEAS.get(name, "India")


def assign_base_price(runs, wickets, matches):
    if matches >= 150 or runs >= 5000 or wickets >= 150:
        return 20_000_000
    if matches >= 100 or runs >= 3000 or wickets >= 100:
        return 15_000_000
    if matches >= 60 or runs >= 1500 or wickets >= 60:
        return 10_000_000
    if matches >= 30 or runs >= 500 or wickets >= 30:
        return 5_000_000
    return 2_000_000


def assign_auction_set(base_price):
    if base_price >= 20_000_000:
        return 1
    if base_price >= 15_000_000:
        return 2
    if base_price >= 10_000_000:
        return 3
    if base_price >= 5_000_000:
        return 4
    return 5


# ─── Comprehensive IPL all-time stats (real career data) ───
# Format: (name, matches, runs, avg, sr, wickets, economy)

BUILTIN_PLAYERS = [
    # === TOP BATSMEN ===
    ("Virat Kohli", 252, 8004, 37.2, 130.7, 4, 0),
    ("Shikhar Dhawan", 222, 6769, 34.5, 127.0, 0, 0),
    ("David Warner", 184, 6565, 41.2, 139.8, 0, 0),
    ("Rohit Sharma", 243, 6211, 29.8, 130.4, 15, 0),
    ("Suresh Raina", 205, 5528, 32.5, 136.7, 25, 0),
    ("MS Dhoni", 264, 5243, 38.1, 135.2, 0, 0),
    ("AB de Villiers", 184, 5162, 39.7, 151.7, 0, 0),
    ("Chris Gayle", 142, 4965, 39.7, 148.9, 0, 0),
    ("Robin Uthappa", 205, 4952, 27.4, 130.3, 0, 0),
    ("Dinesh Karthik", 257, 4842, 25.9, 131.0, 0, 0),
    ("KL Rahul", 132, 4683, 45.5, 134.6, 0, 0),
    ("Faf du Plessis", 145, 4571, 35.2, 131.0, 0, 0),
    ("Ambati Rayudu", 188, 4329, 28.7, 127.5, 0, 0),
    ("Suryakumar Yadav", 155, 4313, 31.6, 145.5, 0, 0),
    ("Sanju Samson", 162, 4270, 29.4, 136.2, 0, 0),
    ("Gautam Gambhir", 154, 4217, 31.2, 124.3, 0, 0),
    ("Ajinkya Rahane", 179, 4201, 28.7, 121.3, 0, 0),
    ("Jos Buttler", 97, 3460, 38.0, 150.0, 0, 0),
    ("Rishabh Pant", 118, 3600, 35.0, 148.7, 0, 0),
    ("Manish Pandey", 161, 3412, 28.7, 121.8, 0, 0),
    ("Shubman Gill", 96, 3125, 36.9, 133.5, 0, 0),
    ("Quinton de Kock", 104, 3157, 32.2, 137.4, 0, 0),
    ("Parthiv Patel", 139, 2848, 22.6, 120.8, 0, 0),
    ("Virender Sehwag", 104, 2728, 27.8, 155.4, 0, 0),
    ("Mayank Agarwal", 110, 2664, 22.4, 134.5, 0, 0),
    ("Murali Vijay", 105, 2619, 26.7, 120.5, 0, 0),
    ("Ruturaj Gaikwad", 75, 2577, 38.5, 133.0, 0, 0),
    ("Steve Smith", 103, 2541, 34.3, 128.7, 0, 0),
    ("Wriddhiman Saha", 152, 2427, 23.1, 128.1, 0, 0),
    ("Shaun Marsh", 71, 2477, 39.3, 127.1, 0, 0),
    ("Rahul Tripathi", 94, 2339, 28.5, 136.2, 0, 0),
    ("Sachin Tendulkar", 78, 2334, 34.8, 119.8, 0, 0),
    ("Ishan Kishan", 83, 2325, 28.2, 136.4, 0, 0),
    ("Kane Williamson", 73, 2089, 36.0, 120.5, 0, 0),
    ("Devdutt Padikkal", 62, 1767, 30.5, 128.0, 0, 0),
    ("Brendon McCullum", 71, 1734, 27.5, 131.8, 0, 0),
    ("Jonny Bairstow", 53, 1714, 34.3, 142.0, 0, 0),
    ("Prithvi Shaw", 63, 1588, 27.0, 147.2, 0, 0),
    ("Yashasvi Jaiswal", 45, 1546, 35.1, 160.7, 0, 0),
    ("Tilak Varma", 49, 1542, 38.6, 149.3, 4, 8.0),
    ("Heinrich Klaasen", 38, 1230, 38.4, 171.3, 0, 0),
    ("Rinku Singh", 53, 1205, 34.4, 145.2, 0, 0),
    ("Nicholas Pooran", 48, 1044, 23.2, 152.3, 0, 0),
    ("Alex Hales", 37, 968, 27.7, 148.2, 0, 0),
    ("Aiden Markram", 36, 984, 30.1, 141.0, 3, 0),
    ("Travis Head", 28, 928, 38.7, 171.5, 0, 0),
    ("Rajat Patidar", 31, 796, 30.6, 156.9, 0, 0),
    ("Phil Salt", 22, 735, 35.0, 173.0, 0, 0),
    ("Rachin Ravindra", 14, 395, 30.4, 157.4, 2, 0),
    ("Dhruv Jurel", 20, 345, 21.6, 138.0, 0, 0),

    # === ALL-ROUNDERS ===
    ("Shane Watson", 145, 3880, 31.5, 137.9, 92, 8.2),
    ("Yusuf Pathan", 174, 3204, 28.6, 142.7, 33, 8.2),
    ("Hardik Pandya", 131, 2480, 27.6, 147.2, 62, 9.1),
    ("Ravindra Jadeja", 246, 2692, 24.0, 127.6, 152, 7.6),
    ("Andre Russell", 118, 2502, 28.4, 171.5, 90, 9.2),
    ("Glenn Maxwell", 114, 2586, 26.1, 155.2, 27, 7.8),
    ("Dwayne Bravo", 161, 1560, 22.6, 128.5, 183, 8.4),
    ("Sunil Narine", 177, 1300, 17.1, 162.5, 172, 6.7),
    ("Jacques Kallis", 98, 2427, 31.5, 107.0, 65, 7.8),
    ("Nitish Rana", 94, 1976, 25.7, 131.3, 12, 8.0),
    ("Dwayne Smith", 73, 1581, 23.6, 137.3, 30, 8.5),
    ("JP Duminy", 51, 1286, 35.7, 126.3, 24, 7.5),
    ("Shivam Dube", 72, 1370, 26.3, 140.0, 18, 9.5),
    ("Deepak Hooda", 68, 1342, 25.3, 132.0, 8, 8.0),
    ("Riyan Parag", 65, 1221, 22.6, 136.0, 12, 8.5),
    ("Axar Patel", 115, 1214, 19.3, 124.0, 78, 7.1),
    ("Krunal Pandya", 93, 1179, 19.7, 127.8, 65, 7.5),
    ("Marcus Stoinis", 55, 1090, 25.3, 131.0, 27, 9.0),
    ("Irfan Pathan", 72, 1002, 21.3, 131.0, 60, 7.9),
    ("Ben Stokes", 59, 920, 18.8, 131.4, 28, 8.5),
    ("Abhishek Sharma", 35, 826, 27.5, 166.5, 5, 8.5),
    ("Shakib Al Hasan", 71, 793, 16.9, 118.5, 63, 7.2),
    ("Venkatesh Iyer", 38, 779, 24.3, 131.0, 12, 9.0),
    ("Ravichandran Ashwin", 212, 728, 12.5, 110.3, 180, 6.8),
    ("Moeen Ali", 42, 718, 22.4, 146.8, 30, 7.5),
    ("Vijay Shankar", 60, 719, 20.5, 121.0, 15, 8.6),
    ("Liam Livingstone", 36, 710, 22.3, 158.0, 16, 8.9),
    ("Sam Curran", 60, 668, 18.6, 130.5, 55, 8.5),
    ("Washington Sundar", 65, 584, 16.7, 122.0, 42, 7.1),
    ("Chris Morris", 70, 551, 18.4, 158.3, 80, 7.8),
    ("Mitchell Marsh", 28, 546, 27.3, 139.6, 17, 8.8),
    ("Shardul Thakur", 82, 533, 14.4, 144.2, 73, 8.7),
    ("Pat Cummins", 56, 424, 16.3, 145.0, 55, 8.6),
    ("Harshal Patel", 95, 372, 12.1, 139.3, 111, 8.3),
    ("Cameron Green", 14, 358, 27.5, 170.5, 8, 8.8),
    ("Shahbaz Ahmed", 32, 336, 14.6, 133.3, 13, 8.1),
    ("Jason Holder", 24, 258, 18.4, 132.3, 22, 8.3),
    ("Marco Jansen", 28, 240, 15.0, 135.0, 31, 8.5),
    ("David Wiese", 24, 216, 18.0, 152.1, 20, 8.2),

    # === TOP BOWLERS ===
    ("Yuzvendra Chahal", 158, 94, 4.7, 94.0, 205, 7.6),
    ("Dwayne Bravo", 161, 1560, 22.6, 128.5, 183, 8.4),  # also allrounder (deduped later)
    ("Lasith Malinga", 122, 174, 7.3, 118.4, 170, 7.1),
    ("Bhuvneshwar Kumar", 170, 399, 11.1, 108.0, 169, 7.3),
    ("Jasprit Bumrah", 143, 56, 5.6, 80.0, 165, 7.4),
    ("Amit Mishra", 154, 420, 11.4, 104.2, 166, 7.4),
    ("Piyush Chawla", 165, 467, 10.6, 101.3, 157, 7.9),
    ("Harbhajan Singh", 163, 829, 13.6, 121.5, 150, 7.1),
    ("Umesh Yadav", 139, 242, 8.4, 126.7, 136, 8.6),
    ("Rashid Khan", 118, 430, 14.3, 142.0, 140, 6.7),
    ("Mohammed Shami", 106, 85, 6.5, 96.6, 120, 8.2),
    ("Sandeep Sharma", 104, 63, 5.7, 90.0, 111, 7.7),
    ("Trent Boult", 88, 80, 5.3, 96.4, 105, 8.0),
    ("Zaheer Khan", 100, 188, 9.4, 113.3, 102, 7.6),
    ("Jaydev Unadkat", 102, 105, 7.0, 110.5, 98, 8.9),
    ("Dale Steyn", 95, 65, 4.6, 92.9, 97, 6.9),
    ("Dhawal Kulkarni", 92, 156, 8.7, 101.3, 96, 8.2),
    ("Mohit Sharma", 85, 95, 6.3, 101.1, 92, 8.1),
    ("Kagiso Rabada", 68, 154, 11.0, 133.0, 89, 8.1),
    ("R Vinay Kumar", 88, 234, 9.0, 117.0, 84, 8.3),
    ("Imran Tahir", 58, 22, 3.1, 68.8, 82, 6.9),
    ("Kuldeep Yadav", 76, 56, 4.0, 93.3, 78, 8.0),
    ("Pragyan Ojha", 81, 28, 2.3, 70.0, 78, 6.9),
    ("Deepak Chahar", 80, 242, 13.4, 118.0, 77, 7.8),
    ("Arshdeep Singh", 65, 35, 5.0, 100.0, 76, 8.6),
    ("Morne Morkel", 71, 85, 5.3, 109.0, 71, 7.5),
    ("Ashish Nehra", 70, 32, 3.6, 88.9, 71, 7.6),
    ("Siddharth Kaul", 59, 32, 4.6, 88.9, 65, 8.3),
    ("Munaf Patel", 63, 57, 5.2, 95.0, 64, 7.3),
    ("Brett Lee", 56, 100, 7.7, 128.2, 63, 7.4),
    ("Avesh Khan", 50, 25, 3.6, 83.3, 62, 8.8),
    ("Rahul Chahar", 53, 12, 2.4, 80.0, 58, 7.8),
    ("Varun Chakravarthy", 49, 12, 3.0, 60.0, 58, 6.9),
    ("Khaleel Ahmed", 51, 15, 2.5, 75.0, 57, 8.7),
    ("Tushar Deshpande", 48, 15, 2.5, 93.8, 55, 9.1),
    ("T Natarajan", 43, 20, 3.3, 66.7, 52, 8.4),
    ("Mustafizur Rahman", 40, 18, 3.0, 90.0, 48, 7.8),
    ("Ravi Bishnoi", 45, 8, 2.0, 80.0, 47, 7.6),
    ("Jofra Archer", 35, 65, 8.1, 162.5, 46, 7.1),
    ("Anrich Nortje", 40, 28, 4.7, 93.3, 46, 7.8),
    ("Lockie Ferguson", 35, 24, 4.0, 80.0, 42, 8.0),
    ("Matheesha Pathirana", 32, 15, 3.0, 100.0, 39, 8.1),
    ("Alzarri Joseph", 30, 55, 5.5, 130.0, 38, 8.5),
    ("Mukesh Kumar", 32, 10, 2.5, 83.3, 36, 9.0),
    ("Mitchell Starc", 24, 32, 5.3, 106.7, 34, 7.2),
    ("R Sai Kishore", 30, 22, 3.7, 73.3, 33, 7.2),
    ("Josh Hazlewood", 28, 12, 3.0, 60.0, 30, 7.9),
    ("Yash Dayal", 25, 12, 3.0, 80.0, 28, 8.8),
    ("Wanindu Hasaranga", 21, 98, 9.8, 140.0, 26, 8.0),
    ("Mukesh Choudhary", 24, 10, 2.5, 66.7, 25, 8.5),
    ("Maheesh Theekshana", 22, 8, 2.0, 80.0, 24, 7.1),
    ("Adam Zampa", 22, 8, 2.7, 80.0, 25, 7.2),
    ("Mark Wood", 18, 10, 2.5, 71.4, 22, 8.2),
    ("Harshit Rana", 16, 45, 7.5, 140.6, 22, 9.0),
    ("Akash Deep", 18, 8, 2.0, 80.0, 20, 8.5),
    ("Gerald Coetzee", 15, 42, 7.0, 150.0, 18, 9.0),
    ("Noor Ahmad", 14, 5, 2.5, 83.3, 18, 7.5),
    ("Nandre Burger", 12, 5, 2.5, 100.0, 15, 8.5),
    ("Mayank Yadav", 6, 2, 2.0, 66.7, 9, 6.0),
]


def process_players(data):
    """Convert raw tuples into final CSV rows, deduplicating by name."""
    seen = {}
    for name, matches, runs, avg, sr, wickets, economy in data:
        if name in seen:
            # Keep the entry with the most data
            existing = seen[name]
            if matches > existing[1] or runs > existing[2]:
                seen[name] = (name, matches, runs, avg, sr, wickets, economy)
        else:
            seen[name] = (name, matches, runs, avg, sr, wickets, economy)

    rows = []
    for name, matches, runs, avg, sr, wickets, economy in seen.values():
        role = classify_role(name, runs, wickets)
        nationality = get_nationality(name)
        base_price = assign_base_price(runs, wickets, matches)
        auction_set = assign_auction_set(base_price)

        rows.append({
            "name": name,
            "player_role": role,
            "nationality": nationality,
            "base_price": base_price,
            "auction_set": auction_set,
            "stats_matches": matches,
            "stats_runs": runs,
            "stats_avg": avg,
            "stats_sr": sr,
            "stats_wickets": wickets,
            "stats_economy": economy,
            "image_url": get_image_url(name),
        })

    rows.sort(key=lambda x: (-x["base_price"], -x["stats_runs"]))
    return rows


# ─── Playwright scraper (best-effort attempt) ───

async def try_scrape():
    """Try to scrape live data from iplt20.com. Returns list of tuples or None."""
    try:
        from playwright.async_api import async_playwright
    except ImportError:
        print("Playwright not installed, using built-in data.")
        return None

    print("Attempting to scrape iplt20.com (this may fail due to anti-bot measures)...")

    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page()
            page.set_default_timeout(20000)

            results = {}

            # ─── BATTING STATS ───
            try:
                await page.goto(
                    "https://www.iplt20.com/stats/all-time/most-runs",
                    wait_until="networkidle", timeout=30000
                )
                await page.wait_for_timeout(5000)

                # iplt20.com uses non-standard markup; try many selectors
                selectors = [
                    "table tbody tr",
                    ".st-table tbody tr",
                    ".statsTable tbody tr",
                    "[class*='table'] tr[class*='row']",
                    ".cSBListItems .si-Table__body tr",
                    ".np-statsTable__row",
                    ".top-players__player",
                ]
                for selector in selectors:
                    try:
                        rows = await page.locator(selector).all()
                        if len(rows) > 5:
                            print(f"  Batting: {len(rows)} rows via '{selector}'")
                            for row in rows:
                                cells = await row.locator("td").all()
                                if len(cells) < 6:
                                    continue
                                texts = [await c.inner_text() for c in cells]
                                name = re.sub(r"\s+[A-Z]{2,5}$", "", texts[1].strip()).strip()
                                if not name:
                                    continue
                                mat = int(texts[2]) if texts[2].strip().isdigit() else 0
                                runs = int(texts[5].replace(",", "")) if texts[5].replace(",", "").strip().isdigit() else 0
                                avg_s = texts[7].replace("-", "0").strip() if len(texts) > 7 else "0"
                                avg = float(avg_s) if avg_s.replace(".", "").isdigit() else 0
                                sr_s = texts[9].replace("-", "0").strip() if len(texts) > 9 else "0"
                                sr = float(sr_s) if sr_s.replace(".", "").isdigit() else 0
                                results[name] = {
                                    "matches": mat, "runs": runs, "avg": avg,
                                    "sr": sr, "wickets": 0, "economy": 0,
                                }
                            break
                    except Exception:
                        continue
            except Exception as e:
                print(f"  Batting scrape failed: {e}")

            # ─── BOWLING STATS ───
            try:
                await page.goto(
                    "https://www.iplt20.com/stats/all-time/most-wickets",
                    wait_until="networkidle", timeout=30000
                )
                await page.wait_for_timeout(5000)

                for selector in selectors:
                    try:
                        rows = await page.locator(selector).all()
                        if len(rows) > 5:
                            print(f"  Bowling: {len(rows)} rows via '{selector}'")
                            for row in rows:
                                cells = await row.locator("td").all()
                                if len(cells) < 7:
                                    continue
                                texts = [await c.inner_text() for c in cells]
                                name = re.sub(r"\s+[A-Z]{2,5}$", "", texts[1].strip()).strip()
                                if not name:
                                    continue
                                mat = int(texts[2]) if texts[2].strip().isdigit() else 0
                                wkts = int(texts[6]) if len(texts) > 6 and texts[6].strip().isdigit() else 0
                                econ_s = texts[9].replace("-", "0").strip() if len(texts) > 9 else "0"
                                econ = float(econ_s) if econ_s.replace(".", "").isdigit() else 0

                                if name in results:
                                    results[name]["wickets"] = wkts
                                    results[name]["economy"] = econ
                                    results[name]["matches"] = max(results[name]["matches"], mat)
                                else:
                                    results[name] = {
                                        "matches": mat, "runs": 0, "avg": 0,
                                        "sr": 0, "wickets": wkts, "economy": econ,
                                    }
                            break
                    except Exception:
                        continue
            except Exception as e:
                print(f"  Bowling scrape failed: {e}")

            await browser.close()

            if len(results) > 20:
                print(f"  Successfully scraped {len(results)} players!")
                return [
                    (n, d["matches"], d["runs"], d["avg"], d["sr"], d["wickets"], d["economy"])
                    for n, d in results.items()
                ]
            else:
                print(f"  Only found {len(results)} players — falling back to built-in data.")
                return None

    except Exception as e:
        print(f"  Scraping failed: {e}")
        return None


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    use_local = "--local" in sys.argv

    data = None
    if not use_local:
        data = asyncio.run(try_scrape())

    if data is None:
        print("Using built-in IPL all-time stats database...")
        data = BUILTIN_PLAYERS

    rows = process_players(data)

    fieldnames = [
        "name", "player_role", "nationality", "base_price", "auction_set",
        "stats_matches", "stats_runs", "stats_avg", "stats_sr",
        "stats_wickets", "stats_economy", "image_url",
    ]

    with open(OUTPUT_CSV, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    print(f"\nDone! {len(rows)} players written to {OUTPUT_CSV}")
    print(f"  Batsmen:       {sum(1 for r in rows if r['player_role'] == 'Batsman')}")
    print(f"  Bowlers:       {sum(1 for r in rows if r['player_role'] == 'Bowler')}")
    print(f"  All-rounders:  {sum(1 for r in rows if r['player_role'] == 'All-rounder')}")
    print(f"  Wicketkeepers: {sum(1 for r in rows if r['player_role'] == 'WK')}")
    set_counts = ', '.join(f"Set {i}: {sum(1 for r in rows if r['auction_set'] == i)}" for i in range(1, 6))
    print(f"  Auction sets:  {set_counts}")


if __name__ == "__main__":
    main()
