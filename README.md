# Streetfight.cc Tier Site

## How It Updates

The GitHub Action runs every 5 minutes and can also be run manually from the Actions tab. It reads tested players from the `players` table, refreshes their current Minecraft username from their UUID, writes `players.json`, and commits that file back to the repository.

## Expected Database Columns

The sync script expects the existing bot table:

- `players.discord_id`
- `players.minecraft_uuid`
- `players.minecraft_username`
- `players.tier`
- `players.updated_at`

