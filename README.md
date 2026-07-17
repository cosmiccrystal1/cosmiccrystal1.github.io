# Streetfight.cc Tier Site

Upload every file in this folder to the GitHub Pages repository for `streetfight.cc`.

## Repository Secrets

Create these under `Settings > Secrets and variables > Actions > Repository secrets`.

| Secret | Value |
| --- | --- |
| `DB_HOST` | Your Shockbyte MySQL host, without `http://` or a trailing slash. |
| `DB_PORT` | Your MySQL port, usually `3306`. |
| `DB_USER` | The MySQL username that can read/update the Streetfight database. |
| `DB_PASSWORD` | The password for `DB_USER`. |
| `DB_NAME` | The MySQL database name containing the `players` table. |

## How It Updates

The GitHub Action runs every 15 minutes and can also be run manually from the Actions tab. It reads tested players from the `players` table, refreshes their current Minecraft username from their UUID, writes `players.json`, and commits that file back to the repository.

## Expected Database Columns

The sync script expects the existing bot table:

- `players.discord_id`
- `players.minecraft_uuid`
- `players.minecraft_username`
- `players.tier`
- `players.updated_at`

