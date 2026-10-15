# Online deployment

Run `npm ci`, `npm run typecheck`, `npm test`, `npm run build`, then `npm start`.
The single Node process serves `dist/client`, invitation API and WebSocket
connections on `0.0.0.0:2567`; override the port with `PORT`. `/health` returns
the content release and room count. In development Vite proxies `/api` and
`/game` to this process. Players need access to the same server hostname.

For public HTTPS, point a hostname's DNS at the host, allow inbound TCP 80/443
and optionally UDP 443, set `GAME_DOMAIN`, then run
`docker compose -f deploy/compose.yaml up --build -d` from the repository root.
Caddy obtains TLS certificates and forwards WebSocket upgrades automatically.
Do not expose port 2567 publicly when using this example. One process owns all
rooms; run one replica. Rooms are in memory and disappear on restart. A dropped
client has 60 seconds to reconnect using its private SDK token. Never log or
share reconnect tokens. Room capacity is four, with 32 rooms per process.

The compose example sets `TRUST_PROXY=1` to trust the single Caddy hop for
per-player IP limits. Set this only when Node is reachable exclusively through
that trusted proxy; direct LAN/local runs leave it unset.

No hosting account or deployment is provisioned by these files. A valid public
hostname and reachable host are required for internet play; LAN play works with
the host's reachable IP. Invitation codes are six uppercase letters. Players
cannot join once a game starts, except by reconnecting their existing session.
Lobby lifetime is ten minutes and an unused seat expires after thirty seconds.

## Drain during release

On Linux, send `SIGUSR2` to the Node process (`docker compose -f
deploy/compose.yaml kill -s SIGUSR2 game`). This switches `/health` to
`draining: true` and rejects new room creation with HTTP 503. Existing room
invitations, reconnects, snapshots and commands continue. Drain does not
automatically terminate active games; `SIGTERM` stops the server.

For a blue/green release, bring up the new single-process instance on a second
hostname and direct new players there. Keep the old hostname and process
reachable until its `/health` reports `rooms: 0`, then stop it. Existing clients
must retain the old hostname for both WebSocket traffic and reconnects. Rooms
are not migrated between releases. Do not switch the old hostname to the new
process while old rooms are still active.
