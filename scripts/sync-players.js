const fs = require("node:fs/promises");
const path = require("node:path");
const mysql = require("mysql2/promise");

const TIER_COLUMNS = {
  "Tier 1": ["HT1", "LT1"],
  "Tier 2": ["HT2", "LT2"],
  "Tier 3": ["HT3", "LT3"],
  "Tier 4": ["HT4", "LT4"],
  "Tier 5": ["HT5", "LT5"]
};

const TIER_ORDER = ["HT1", "LT1", "HT2", "LT2", "HT3", "LT3", "HT4", "LT4", "HT5", "LT5"];

function requiredEnv(name, fallback = "") {
  const value = process.env[name] || fallback;
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function compactUuid(uuid) {
  return String(uuid || "").replace(/-/g, "").toLowerCase();
}

function dashedUuid(uuid) {
  const compact = compactUuid(uuid);
  if (compact.length !== 32) {
    return uuid;
  }
  return `${compact.slice(0, 8)}-${compact.slice(8, 12)}-${compact.slice(12, 16)}-${compact.slice(16, 20)}-${compact.slice(20)}`;
}

async function fetchCurrentMinecraftName(uuid, fallbackName) {
  const compact = compactUuid(uuid);
  if (compact.length !== 32) {
    return fallbackName;
  }

  const response = await fetch(`https://sessionserver.mojang.com/session/minecraft/profile/${compact}`);
  if (!response.ok) {
    console.warn(`Could not refresh username for ${uuid}: HTTP ${response.status}`);
    return fallbackName;
  }

  const profile = await response.json();
  return profile.name || fallbackName;
}

function emptyColumns() {
  return Object.fromEntries(
    Object.keys(TIER_COLUMNS).map((column) => [column, []])
  );
}

function columnForTier(tier) {
  return Object.entries(TIER_COLUMNS).find(([, tiers]) => tiers.includes(tier))?.[0] || null;
}

async function main() {
  const pool = mysql.createPool({
    host: requiredEnv("DB_HOST"),
    port: Number(requiredEnv("DB_PORT", "3306")),
    user: requiredEnv("DB_USER"),
    password: requiredEnv("DB_PASSWORD"),
    database: requiredEnv("DB_NAME"),
    waitForConnections: true,
    connectionLimit: 4,
    namedPlaceholders: true
  });

  const [rows] = await pool.execute(`
    SELECT discord_id, minecraft_uuid, minecraft_username, tier
    FROM players
    WHERE tier IS NOT NULL
      AND minecraft_uuid IS NOT NULL
    ORDER BY FIELD(tier, 'HT1','LT1','HT2','LT2','HT3','LT3','HT4','LT4','HT5','LT5'),
             minecraft_username ASC
  `);

  const columns = emptyColumns();
  const allPlayers = [];

  for (const row of rows) {
    const tier = String(row.tier || "").toUpperCase();
    const column = columnForTier(tier);
    if (!column) {
      continue;
    }

    const currentName = await fetchCurrentMinecraftName(row.minecraft_uuid, row.minecraft_username);
    if (currentName && currentName !== row.minecraft_username) {
      await pool.execute(
        "UPDATE players SET minecraft_username = :username, updated_at = UTC_TIMESTAMP() WHERE discord_id = :discordId",
        { username: currentName, discordId: row.discord_id }
      );
    }

    const player = {
      username: currentName || row.minecraft_username,
      uuid: dashedUuid(row.minecraft_uuid),
      tier
    };

    columns[column].push(player);
    allPlayers.push(player);
  }

  for (const players of Object.values(columns)) {
    players.sort((a, b) => {
      const tierDelta = TIER_ORDER.indexOf(a.tier) - TIER_ORDER.indexOf(b.tier);
      return tierDelta || a.username.localeCompare(b.username);
    });
  }

  const output = {
    generatedAt: new Date().toISOString(),
    columns,
    players: allPlayers
  };

  await fs.writeFile(
    path.join(process.cwd(), "players.json"),
    `${JSON.stringify(output, null, 2)}\n`,
    "utf8"
  );

  await pool.end();
  console.log(`Synced ${allPlayers.length} tested player${allPlayers.length === 1 ? "" : "s"}.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
