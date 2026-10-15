# Read-only map inspection

Source: `D:/HeroDefense/ThienDao v2.1.w3x`, 136,597,536 bytes; SHA-256 `ddc4be147dc7afd262be6193b94f1f06f786e7222c4ea7dd444feeda63f9a8e8` (controller verified). No map scripts executed or source modified. Analysis used static MPQ/text/binary parsing. Evidence: `../research/map-evidence/`; `archive-manifest.json` records internal paths, block indexes, archive offsets, sizes, flags, unpacked hashes.

## Archive recovery

MPQ magic at absolute byte 25088. Protected header has malformed size/version; block-table offset 0xffffa020 wraps to byte544. Hash table resolves to136564768. Tables contain2048 hash slots and1500 active blocks; that is not a gameplay asset count.

Recovered `war3map.j`:423300 bytes, block98, archive byte136487473; protection comment GRT. Names are obfuscated, strings partially hidden in ability tables. `script-table-decoded.txt` only substitutes statically known literals and ability CSV strings, retaining raw line numbers. Some character loads remain unresolved; raw script remains authoritative.

`war3map.w3i`:553 bytes, block103, archive byte5782641. Unpacked byte28 begins `Thien Dao Defense 2.1`; following strings name Silva.Fox, describe `Custom Map Heroes Defense 1-4 Players by Silva.Fox`, recommend1-4.

`war3map.w3e`:304084 bytes, block102, archive byte5727138. At unpacked offset93:225×193 vertices, center offsets(-12288,-12288), hence224×192 terrain cells.

`war3map.w3a`:13872 bytes; version2; parsed to EOF:3 original override records,0 custom records,576 modifications. Most object data is optimized into SLKs. Headers: UnitData1009 rows, ItemData274 rows, AbilityData931 rows, each including header and standard Warcraft records. These are NOT custom-content counts.

Standard `(listfile)`,wts,imp,w3u,w3t and other classic files absent by those names; optimized `units/*.slk` and Campaign string files are recoverable. Script has165 unique literal asset-path candidates; dynamic filenames and model/texture dependencies make this incomplete.

## Verified character scope

Exactly70 `pK(...)` roster registrations at raw script lines6911-6980, unique indices1-70. Function pK at6846 onward stores rawcode,index,group,element/stats; UI reads `DE[]`. This proves70 indexed character definitions, not70 independently player-controlled Warcraft heroes.

Each rawcode matches a named CampaignUnitStrings section. `roster-evidence.json` preserves all70 names/rawcodes/line anchors. Samples: h001 Thiên Lý Nhãn (strings line1945),h002 Thuận Phong Nhĩ(1955),h003 Quỷ Sai(1965),h03Z Tương Thần(3298),h040 Trương Đạo Lăng(3307),h041 Phượng Hoàng(3317).

Six group codes,five element codes. Ability A027 `Unubertip` contains70 role entries; five labels Xạ Thủ,Chiến Binh,Pháp Sư,Hộ Thuẫn,Thuật Sĩ (CampaignAbilityStrings lines174-180). Twenty-seven synergy definitions: pR calls6881-6907 and A027 Tip/Ubertip CSV arrays27 entries. Examples Hỏa Diệm Sơn,Trần Đường Quan,Thỉnh Kinh,Phong Thần Diễn Nghĩa,Long Tộc Huyết Mạch,Thiên Địa Nhân Đạo; exact damage/heal/proc/CD values are present.

UI/help and script8980 onward establish five deployed character slots per player. kc7n tooltip11 states duplicate characters level2+ cannot deploy,synergies activate with2 characters,selling returns50%-67% Đạo Duyên,each death adds0.3s to future respawn. These text contracts still require runtime parity checks. Equipment UI references three `TB_*_1/2/3_*` categories and per-character upgrades(lines15666-15683); total custom equipment count NOT verified. ItemData's273 data rows are not a reliable equipment count.

## Waves and difficulty

Difficulty implementation at5853-5883: Bình Thường attack1.0/HP1.0/45 waves; Ác Mộng1.1/1.3/45; Địa Ngục1.2/1.6/45; Tối Thượng1.2/1.6/60. eI/ek multipliers are assigned and advertised in UI; later application needs full tracing.

Xw at8973-9070 increments cf,starts wave UI/spawner,dispatches side events. Wave time defaults90s; waves5/10/15/20/25/30/35/40/50/55 use120s;9/18/27/36 use150s;45 uses240s. X4 at8947-8972 stores nX and invokes repeating1s XC timer with spawn window ending nX-20. Static facts only; full composition/balance needs dedicated extraction.

Event dispatch9027-9070: wave5 Thụ Yêu/Huyết Lâm;10 Quy Vương/Thủy Vực;15 Thạch Cơ Nương Nương/Thạch Lâm;20 Lục Áp Đạo Quân/Tiên Môn;25 Kim Giác+Ngân Giác/Lưỡng Giới;30 Ma Gia Tứ Tướng/Bất Chu Thiên Quan;35 Đế Giang/Tinh Không;40 on Tối Thượng opens Ngũ Hành Linh Giới.

Eight formation types at CampaignAbilityStrings272: Tam Tài,Tứ Tượng,Ngũ Hành,Lục Hợp,Thất Tinh,Bát Quái,Cửu Cung,Thập Tuyệt. emWS tooltip44 documents points every4 completed waves,max level3 then4 after wave40,plus instance rewards. Runtime reward branches at8962 onward.

Seven CreateQuestBJ calls5519-5540 create help entries: Thông Tin;Phân Loại Nhân Vật;Phím Tắt Và Mã Lệnh;Thông Tin Khác;Trận Pháp;Chi Tiết Thuộc Tính;Xếp Hạng Trận Chiến. This is NOT proof of7 gameplay quests. Rating help5533-5539 describes7 star tiers with completion time,Tiên khí,boss and challenge conditions.

## Controls, multiplayer, persistence

Intended count1-4 from metadata and player loops. config14563 onward sets6 engine slots/teams; NPC ownership must be reconciled before claiming6 human support.

Tooltip controls: B character UI,T synergy UI,H save character position,N clear position,S stop,A target attack;1-5 selection/deployment,Tab camera reset,F1 instance character,F2 latest deploy,F3 melee,F4 ranged. `-help` directly handled5355; zoom prefix is hashed but help states `-zoom 1-3000`.

Position saving uses in-memory hashtable coordinates5392-5414. It does not prove persistent account/run saving. Static search found no Preload,InitGameCache,StoreInteger,GetStored*,BlzSendSyncData,DzAPI,EXExecute,HTTP endpoint or custom native declaration in recovered JASS. This is bounded negative evidence only; cross-session save/load and remote services were NOT verified.

Standard Blz frame APIs and TOC imports5218-5221 implement extensive custom UI. A single-hero lane prototype would omit verified roster/deployment,synergy,formation,instance,boss and rating behavior.

## Limits and delivery implication

Full active-ability dispatch,virtual equipment catalog,wave composition,NPC ownership,asset inventory and runtime behavior were not exhaustively traced. Plan a dedicated machine-readable extraction/parity phase before claiming complete clone scope. Separate data extraction,runtime combat parity,permitted visual adaptation,authoritative1-4 player simulation,and content-completeness verification. No executables downloaded,packages installed,or embedded JASS executed.
