# Authoritative online server implementation

Status: DONE

Implemented plain JSON Colyseus rooms with 20 Hz fixed simulation steps and 10 Hz
snapshots, four participants, six-letter invitations, authoritative ownership,
sequenced/idempotent commands, ready/start, reconnect and bounded input/logging.
HTTP and WebSocket share one process with the built client. `PORT` defaults to
2567 on `0.0.0.0`; `/health` exposes release/room count.

## Wire contract

- `POST /api/rooms {name,difficulty}` → `{reservation,code,release}`.
- `POST /api/rooms/:code/join {name}` → same response.
- SDK `new Client(origin + '/game').consumeSeatReservation(reservation)`.
- SDK `reconnect(room.reconnectionToken)` uses the custom
  `/game/matchmake/reconnect/:roomId` endpoint.
- Server `identity {selfId,code,release,lastCommandId}`, `snapshot GameState`,
  `ack CommandAck`; client `command {id,command}` and `sync`.
- Attach listeners, send `sync`, persist the private reconnect token and command
  sequence. Identity reports the server's latest command ID after reconnection.

Default framework matchmaking HTTP endpoints are removed from the exposed
request handler, so they cannot allocate rooms or reserve seats. Room creation
also requires a private per-process admission secret; joins consume one-use
30-second tickets checked in `onAuth`. Lobby lifetime is ten minutes; a dropped
player may reconnect for sixty seconds. Fresh midgame joins fail. Allocation is
bounded to 32 rooms before asynchronous creation, with a second room-side guard.
HTTP/WebSocket payload limits are 4 KiB. Commands validate exact keys, bounded
identifiers, finite values, indices and arrays. Rate controls bound HTTP, sync
and commands; the acknowledgement cache retains 128 entries per participant.
Debug records retain 200 entries and emit at most four records/event/second.

## Validation observed

- `npm run typecheck`: passed.
- `npm run test:server`: 9 tests passed, including genuine SDK clients over TCP,
  shared snapshots, duplicate summon without a second spend, ownership/schema
  rejection, ready/start, late-join rejection, fresh SDK midgame refresh
  reconnect, command continuity, default matchmaking bypass, oversized and
  malformed HTTP bodies, command flood limiting, four-player capacity, 32-room
  allocation quota, real 30-second unused-seat expiration, and release draining
  that blocks creation while existing SDK sync/commands and room joins continue.
- `npx tsx apps/server/tools/network-soak.ts 15`: passed with four actual SDK
  clients, combat enabled and commands sent throughout. Observed 15.01 seconds,
  600 snapshots (10.00/client/second), 566 acknowledgements, zero rejected
  commands, RSS 94.5 → 84.6 MiB, process CPU 672 ms, event-loop p99 18.56 ms,
  and 300 simulation ticks. This is a short local smoke soak, not a production
  load-capacity claim. The script accepts 5–300 seconds for longer runs.
- All tests/soak bind the dedicated deterministic port 2568 and close their
  clients/server in cleanup. No listener remained on 2568 after verification.

The first timer measurement revealed Windows interval drift. Colyseus's fixed
timestep also undercounted elapsed time alongside its room clock, so the final
implementation uses a private monotonic accumulator with 50 ms steps and a
maximum 250 ms catch-up budget. The measured final run maintained 20 steps/sec.

## Deployment and limits

`deploy/Dockerfile`, `deploy/compose.yaml`, `deploy/Caddyfile` and
`deploy/README.md` provide single-replica HTTPS/WebSocket deployment. Caddy is
the sole trusted proxy in that example; direct runs do not trust forwarded IPs.
No public host was provisioned and the Docker image was not built in this
environment. Rooms are memory-only and disappear on restart, as requested.
There are no accounts, persistent database, or cross-process room coordination.
Linux `SIGUSR2` enables drain without ending active games. Operators run the new
release on another hostname and retain the old hostname until room count is zero;
existing rooms are never migrated. `SIGTERM` closes the process.
