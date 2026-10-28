import { Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { Color3, Color4 } from '@babylonjs/core/Maths/math.color.js';
import { Engine } from '@babylonjs/core/Engines/engine.js';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture.js';
import { Texture } from '@babylonjs/core/Materials/Textures/texture.js';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';
import { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh.js';
import { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode.js';
import '@babylonjs/core/Meshes/instancedMesh.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { Scene } from '@babylonjs/core/scene.js';
import type { GameEvent } from '../../../packages/contracts/src/types.js';
import { HERO_BY_ID } from '../../../content/catalog.js';
import { debug } from './debug.js';
import { VisualMaterials } from './visual-materials.js';
import { isFireSkill, VisualFire } from './visual-fire.js';
import { TIER_VISUALS } from './visual-tier-profiles.js';
import { basicAttackHeroId, basicAttackPreempts, paintBasicAttack, paintEnemyBasicAttack } from './visual-basic-attack.js';
import { extractHeroIdFromSkill, isTierSkill, paintTierAbility, paintTierAttack, paintTierCast,
  type TierSkillPainter } from './visual-tier-skills.js';
import { VisualTierParticles } from './visual-tier-particles.js';
import { VisualWater } from './visual-water.js';
import { VisualTierMotifs } from './visual-tier-motifs.js';
import { VisualMonsterProjectiles } from './visual-monster-projectiles.js';
import { VisualBossEarth } from './visual-boss-earth.js';
import { VisualEnemyTelegraph } from './visual-enemy-telegraph.js';
import { isEnemySkillEvent, resolveEnemySkillVfx, resolveEnemyTelegraph } from './visual-enemy-skill-routing.js';
import { VisualPangu } from './visual-pangu.js';
import { VisualPanguUltimate } from './visual-pangu-ultimate.js';
import { isStatusMarkKind, StatusMarks } from './visual-status-marks.js';
import { VisualXingtian } from './visual-xingtian.js';
import { VisualDouzhan } from './visual-douzhan.js';
import { VisualKimthien } from './visual-kimthien.js';
import { VisualHangnga } from './visual-hangnga.js';
import { VisualNuwa } from './visual-nuwa.js';
import type { Tier6MarkerKind } from './battlefield-tier6-snapshot.js';
import { Tier6Replay } from './visual-tier6-replay.js';
import { VisualHienvien } from './visual-hienvien.js';
import { VisualShennong } from './visual-shennong.js';
import { VisualChuclong } from './visual-chuclong.js';
import { VisualFuxi } from './visual-fuxi.js';
import { VisualTuongThan } from './visual-tuong-than.js';
import { VisualPhuongHoang } from './visual-phuong-hoang.js';
import { VisualLongVuong } from './visual-long-vuong.js';
import { VisualBatGioi } from './visual-bat-gioi.js';
import { VisualSaNgoTinh } from './visual-sa-ngo-tinh.js';
import { VisualTieuBachLong } from './visual-tieu-bach-long.js';
import { VisualTinhVe } from './visual-tinh-ve.js';
import { VisualChungQuy } from './visual-chung-quy.js';
import { VisualPhanQuan } from './visual-phan-quan.js';
import { VisualNguuMaVuong } from './visual-nguu-ma-vuong.js';
import { VisualTramHuong } from './visual-tram-huong.js';
import { VisualTrieuCongMinh } from './visual-trieu-cong-minh.js';
import { VisualTonNgoKhong } from './visual-ton-ngo-khong.js';
import { VisualDuongTang } from './visual-duong-tang.js';
import { VisualLoiChanTu } from './visual-loi-chan-tu.js';
import { VisualDuongTien } from './visual-duong-tien.js';
import { VisualNaTra } from './visual-na-tra.js';
import { VisualLyTinh } from './visual-ly-tinh.js';
import { VisualDatKy } from './visual-dat-ky.js';
import { VisualNguDao } from './visual-ngu-dao.js';
import { VisualUngLong } from './visual-ung-long.js';
import { VisualXichTungTu } from './visual-xich-tung-tu.js';
import { VisualTinhDan } from './visual-tinh-dan.js';
import { VisualKimThanLaHan } from './visual-kim-than-la-han.js';
import { VisualBatBoThienLong } from './visual-bat-bo-thien-long.js';
import { VisualKhongTuoc } from './visual-khong-tuoc.js';
import { VisualHauNghe } from './visual-hau-nghe.js';
import { paintTier34Ability, paintTier34Attack, paintTier34Cast, paintTier34Pulse, paintTier34Summon,
  tier34HeroId } from './visual-tier34-skills.js';
import { VisualKimsi } from './visual-kimsi.js';
import { VisualKhuongTuNha } from './visual-khuongtu-nha.js';
import { VisualChucdung } from './visual-chucdung.js';
import { createTierRecipeHeroes } from './visual-tier12.js';
import { VisualCongcong } from './visual-congcong.js';
import { VisualKimtra } from './visual-kimtra.js';
import { VisualLadongtan } from './visual-ladongtan.js';
import { VisualMandon } from './visual-mandon.js';
import { VisualVothuong } from './visual-vothuong.js';
import { VisualManhba } from './visual-manhba.js';
import { VisualNhieptieuthien } from './visual-nhieptieuthien.js';
import { VisualHonghainhi } from './visual-honghainhi.js';
import { VisualMoctra } from './visual-moctra.js';
import { VisualThietphien } from './visual-thietphien.js';
import { VisualBaoquatu } from './visual-baoquatu.js';
import { VisualCulinh } from './visual-culinh.js';
import { KitFlipbooks } from './visual-kit-flipbooks.js';
import { HeroVfxRegistry, type AbilityExtra } from './visual-kit-hero.js';
import type { HeroVfxHost } from './visual-hero-adapter.js';
import { registerLegacyHeroes } from './visual-hero-adapters.js';
import { VisualTayvuongmau } from './visual-tayvuongmau.js';
import { VisualThaibach } from './visual-thaibach.js';
import { VisualBodhi } from './visual-bodhi.js';
import { VisualLucnhi } from './visual-lucnhi.js';
import { VisualTruongDaoLang } from './visual-truong-dao-lang.js';
import { VisualDivine } from './visual-divine.js';
import { VisualNhuLai } from './visual-nhu-lai.js';
import { VisualDeTuan } from './visual-de-tuan.js';
import { VisualNguyenThuy } from './visual-nguyen-thuy.js';
import { VisualNhienDang } from './visual-nhien-dang.js';
import { SharedShield } from './visual-shared-shield.js';
import { SharedStatusFx } from './visual-shared-status.js';
import type { SharedMark } from './visual-shared-status.js';
import { isSharedHoldKind } from './visual-shared-status-timeline.js';
import type { GameState } from '../../../packages/contracts/src/types.js';
import { paintGearProc } from './visual-gear.js';
import { VisualGearTraps } from './visual-gear-traps.js';

type EffectKind = 'ring' | 'orb' | 'beam' | 'halo' | 'spark' | 'flare' | 'glyph' | 'decal';
type ActiveEffect = { mesh: AbstractMesh; age: number; duration: number; size: number; kind: EffectKind;
  baseColor: Color3; velocity?: Vector3; from?: Vector3; to?: Vector3; arrive?: () => void; spin?: number;
  arcHeight?: number; orient?: boolean };
/** Marker kinds still drawn by the torus: the game-wide statuses all moved to the shared set (battlefield-shared-status.ts). */
type StatusKind = 'stoneShield';
const MAX_EFFECTS = 64;
const STATUS_COLORS: Record<StatusKind, string> = { stoneShield: '#aa9273' };
const ELEMENT_COLORS = ['#f59e0b', '#10b981', '#0284c7', '#ea580c', '#d97706'];

/** Short, pooled feedback tied only to authoritative combat events. */
export class VisualEffects {
  private gearTraps?: VisualGearTraps;
  private pangu: VisualPangu;
  private panguUltimate: VisualPanguUltimate;
  private statusMarks: StatusMarks;
  /** Game-wide shield bubble and status sheets: one neutral design for every element (Như Lai borrows the same shield). */
  private sharedShield: SharedShield;
  private sharedStatus: SharedStatusFx;
  private xingtian: VisualXingtian;
  private douzhan: VisualDouzhan;
  private kimthien: VisualKimthien;
  private hangnga: VisualHangnga;
  private nuwa: VisualNuwa;
  private hienvien: VisualHienvien;
  private hauNghe: VisualHauNghe;
  private kimsi: VisualKimsi;
  private shennong: VisualShennong;
  private chuclong: VisualChuclong;
  private fuxi: VisualFuxi;
  private tuongThan: VisualTuongThan;
  private phuongHoang: VisualPhuongHoang;
  private longVuong: VisualLongVuong;
  private batGioi: VisualBatGioi;
  private saNgoTinh: VisualSaNgoTinh;
  private tieuBachLong: VisualTieuBachLong;
  private tinhVe: VisualTinhVe;
  private chungQuy: VisualChungQuy;
  private phanQuan: VisualPhanQuan;
  private nguuMaVuong: VisualNguuMaVuong;
  private tramHuong: VisualTramHuong;
  private khongTuoc: VisualKhongTuoc;
  private trieuCongMinh: VisualTrieuCongMinh;
  private tonNgoKhong: VisualTonNgoKhong;
  private duongTang: VisualDuongTang;
  private loiChanTu: VisualLoiChanTu;
  private duongTien: VisualDuongTien;
  private naTra: VisualNaTra;
  private lyTinh: VisualLyTinh;
  private datKy: VisualDatKy;
  private nguDao: VisualNguDao;
  private ungLong: VisualUngLong;
  private xichTungTu: VisualXichTungTu;
  private tinhDan: VisualTinhDan;
  private kimThanLaHan: VisualKimThanLaHan;
  private batBoThienLong: VisualBatBoThienLong;
  private khuongtu: VisualKhuongTuNha;
  /** Hero VFX built on the shared kit (Cộng Công first); asked before the per-hero if-chains. */
  private heroKit = new HeroVfxRegistry();
  private tier6Replay: Tier6Replay;
  private tayvuongmau: VisualTayvuongmau;
  private thaibach: VisualThaibach;
  private bodhi: VisualBodhi;
  private lucnhi: VisualLucnhi;
  private truongDaoLang: VisualTruongDaoLang;
  private divine: VisualDivine;
  private nhuLai: VisualNhuLai;
  private deTuan: VisualDeTuan;
  private nguyenThuy: VisualNguyenThuy;
  private nhienDang: VisualNhienDang;
  private active: ActiveEffect[] = [];
  private pools: Record<EffectKind, AbstractMesh[]> = { ring: [], orb: [], beam: [], halo: [], spark: [], flare: [], glyph: [], decal: [] };
  private scheduled: { delay: number; run: () => void }[] = [];
  private flareMaterials = new Map<string, StandardMaterial>();
  private glyphMaterials = new Map<string, StandardMaterial>();
  private glyphTextures = new Map<string, Texture>();
  private statusMarkers = new Map<string, { mesh: Mesh; touched: boolean }>();
  private statusPool: Mesh[] = [];
  private groundMarkers = new Map<string, { mesh: Mesh; touched: boolean }>();
  private groundPool: Mesh[] = [];
  private plants = new Map<string, { root: TransformNode; touched: boolean }>();
  private plantPool: TransformNode[] = [];
  private soulLinkMarkers = new Map<string, { mesh: Mesh; touched: boolean }>();
  private soulLinkPool: Mesh[] = [];
  private flareTexture: DynamicTexture;
  private reduced = matchMedia('(prefers-reduced-motion: reduce)');
  private fire: VisualFire;
  private tierParticles: VisualTierParticles;
  private water: VisualWater;
  private tierMotifs: VisualTierMotifs;
  private monsterProjectiles: VisualMonsterProjectiles;
  private bossEarth: VisualBossEarth;
  private enemyTelegraph: VisualEnemyTelegraph;
  private readonly roots: Partial<Record<EffectKind, Mesh>> = {};
  private readonly arrivals: (() => void)[] = [];
  /** Helpers the hero adapters use for the small accents around their own module. */
  private readonly heroHost: HeroVfxHost = {
    reduced: () => this.reduced.matches,
    spawn: (kind, at, color, size, duration, texture) => this.spawn(kind, at, color, size, duration, undefined, texture),
    burst: (at, color, count, spread) => this.burst(at, color, count, spread),
    tierBurst: (at, color, count, spread) => this.tierParticles.burst(at, color, count, spread),
    beam: (from, to, color) => this.beam(from, to, color),
    fireImpact: (at, full, radius) => this.fire.impact(at, full, radius),
    waterImpact: (at, radius, duration, reduced) => this.water.impact(at, radius, duration, reduced),
    motifShow: (at, kind, size, duration, reduced, ground = false, spin = 0) =>
      this.tierMotifs.show(at, kind, size, duration, ground, spin, reduced),
    motifTravel: (from, to, kind, size, duration, arrive, reduced) =>
      this.tierMotifs.travel(from, to, kind, size, duration, arrive, 0, reduced),
  };
  constructor(private scene: Scene, private palette: VisualMaterials) {
    this.pangu = new VisualPangu(scene);
    this.panguUltimate = new VisualPanguUltimate(scene, this.pangu);
    this.statusMarks = new StatusMarks(scene);
    this.sharedShield = new SharedShield(scene);
    this.sharedStatus = new SharedStatusFx(scene);
    this.xingtian = new VisualXingtian(scene);
    this.douzhan = new VisualDouzhan(scene);
    this.kimthien = new VisualKimthien(scene);
    this.hangnga = new VisualHangnga(scene, this.sharedStatus);
    this.nuwa = new VisualNuwa(scene);
    this.hienvien = new VisualHienvien(scene);
    this.hauNghe = new VisualHauNghe(scene);
    this.shennong = new VisualShennong(scene);
    this.chuclong = new VisualChuclong(scene);
    this.fuxi = new VisualFuxi(scene);
    this.tuongThan = new VisualTuongThan(scene);
    this.phuongHoang = new VisualPhuongHoang(scene);
    this.longVuong = new VisualLongVuong(scene);
    this.batGioi = new VisualBatGioi(scene);
    this.saNgoTinh = new VisualSaNgoTinh(scene);
    this.tieuBachLong = new VisualTieuBachLong(scene);
    this.tinhVe = new VisualTinhVe(scene);
    this.chungQuy = new VisualChungQuy(scene);
    this.phanQuan = new VisualPhanQuan(scene);
    this.nguuMaVuong = new VisualNguuMaVuong(scene);
    this.tramHuong = new VisualTramHuong(scene);
    this.khongTuoc = new VisualKhongTuoc(scene);
    this.trieuCongMinh = new VisualTrieuCongMinh(scene);
    this.tonNgoKhong = new VisualTonNgoKhong(scene);
    this.duongTang = new VisualDuongTang(scene);
    this.loiChanTu = new VisualLoiChanTu(scene);
    this.duongTien = new VisualDuongTien(scene);
    this.naTra = new VisualNaTra(scene);
    this.lyTinh = new VisualLyTinh(scene);
    this.datKy = new VisualDatKy(scene);
    this.nguDao = new VisualNguDao(scene);
    this.ungLong = new VisualUngLong(scene);
    this.xichTungTu = new VisualXichTungTu(scene);
    this.tinhDan = new VisualTinhDan(scene);
    this.kimThanLaHan = new VisualKimThanLaHan(scene);
    this.batBoThienLong = new VisualBatBoThienLong(scene);
    this.kimsi = new VisualKimsi(scene);
    this.khuongtu = new VisualKhuongTuNha(scene);
    this.heroKit.register(new VisualCongcong(scene, new KitFlipbooks(scene)));
    this.heroKit.register(new VisualChucdung(scene, (at, full, radius) => this.fire.impact(at, full, radius)));
    const recipeHeroes = createTierRecipeHeroes(scene, this.heroHost);
    for (const hero of recipeHeroes) this.heroKit.register(hero);
    // Per-hero Huyền modules register after the recipes so they own their hero id.
    this.heroKit.register(new VisualKimtra(scene, new KitFlipbooks(scene)));
    this.heroKit.register(new VisualMoctra(scene, new KitFlipbooks(scene)));
    this.heroKit.register(new VisualThietphien(scene, new KitFlipbooks(scene), recipeHeroes.find(hero => hero.heroId === 'h00B')));
    this.heroKit.register(new VisualBaoquatu(scene, new KitFlipbooks(scene)));
    this.heroKit.register(new VisualCulinh(scene, new KitFlipbooks(scene)));
    this.heroKit.register(new VisualLadongtan(scene, new KitFlipbooks(scene), recipeHeroes.find(hero => hero.heroId === 'h00D')));
    this.heroKit.register(new VisualMandon(scene, new KitFlipbooks(scene), recipeHeroes.find(hero => hero.heroId === 'h00F')));
    this.heroKit.register(new VisualVothuong(scene, new KitFlipbooks(scene), recipeHeroes.find(hero => hero.heroId === 'h00H')));
    this.heroKit.register(new VisualManhba(scene, new KitFlipbooks(scene), recipeHeroes.find(hero => hero.heroId === 'h00I')));
    this.heroKit.register(new VisualNhieptieuthien(scene, new KitFlipbooks(scene), recipeHeroes.find(hero => hero.heroId === 'h03O')));
    this.heroKit.register(new VisualHonghainhi(scene, new KitFlipbooks(scene), recipeHeroes.find(hero => hero.heroId === 'h00C')));
    this.tayvuongmau = new VisualTayvuongmau(scene);
    this.thaibach = new VisualThaibach(scene, (kind, at) => this.playSharedStatus(kind, at));
    this.bodhi = new VisualBodhi(scene);
    this.lucnhi = new VisualLucnhi(scene);
    this.truongDaoLang = new VisualTruongDaoLang(scene);
    this.divine = new VisualDivine(scene);
    this.fire = new VisualFire(scene);
    this.tierParticles = new VisualTierParticles(scene);
    this.water = new VisualWater(scene);
    this.tierMotifs = new VisualTierMotifs(scene);
    this.monsterProjectiles = new VisualMonsterProjectiles(scene, palette);
    this.bossEarth = new VisualBossEarth(scene);
    this.enemyTelegraph = new VisualEnemyTelegraph(scene);
    registerLegacyHeroes(this.heroKit, {
      nuwa: this.nuwa, chuclong: this.chuclong,
      fuxi: this.fuxi, tuongThan: this.tuongThan,
      truongDaoLang: this.truongDaoLang, divine: this.divine,
    }, this.heroHost);
    this.heroKit.register(this.truongDaoLang);
    this.heroKit.register(this.panguUltimate);
    this.heroKit.register(this.hienvien);
    this.heroKit.register(this.hauNghe);
    this.heroKit.register(this.lucnhi);
    // Đấu Chiến is a direct HeroVfx (its legacy adapter entry is gone): it owns every h012 skill id except the basic attack.
    this.heroKit.register(this.douzhan);
    this.heroKit.register(this.hangnga);
    this.heroKit.register(this.kimsi);
    this.heroKit.register(this.khuongtu);
    this.heroKit.register(this.tayvuongmau);
    this.heroKit.register(this.xingtian);
    this.heroKit.register(this.kimthien);
    this.heroKit.register(this.thaibach); // after the legacy adapters: owns h015's ultimate, revive overlay and star-guard
    // Bồ Đề is a direct HeroVfx registered after the legacy divine adapter, so it owns every h03X skill id.
    this.heroKit.register(this.bodhi);
    this.heroKit.register(this.phuongHoang);
    this.heroKit.register(this.longVuong);
    this.heroKit.register(this.batGioi);
    this.heroKit.register(this.saNgoTinh);
    this.heroKit.register(this.tieuBachLong);
    this.heroKit.register(this.tinhVe);
    this.heroKit.register(this.chungQuy);
    this.heroKit.register(this.phanQuan);
    this.heroKit.register(this.nguuMaVuong);
    this.heroKit.register(this.tramHuong);
    this.heroKit.register(this.khongTuoc);
    this.heroKit.register(this.trieuCongMinh);
    this.heroKit.register(this.tonNgoKhong);
    this.heroKit.register(this.duongTang);
    this.heroKit.register(this.loiChanTu);
    this.heroKit.register(this.duongTien);
    this.heroKit.register(this.naTra);
    this.heroKit.register(this.lyTinh);
    this.heroKit.register(this.datKy);
    this.heroKit.register(this.nguDao);
    this.heroKit.register(this.ungLong);
    this.heroKit.register(this.xichTungTu);
    this.heroKit.register(this.tinhDan);
    this.heroKit.register(this.kimThanLaHan);
    this.heroKit.register(this.batBoThienLong);
    // Thần Nông is a direct HeroVfx (its legacy adapter entry is gone): it owns every h01E skill id, including the whip.
    this.heroKit.register(this.shennong);
    // Như Lai registers after the legacy adapters; h01J left DIVINE_IDS, so the divine module no longer sees it.
    this.nhuLai = new VisualNhuLai(scene, this.sharedShield);
    this.heroKit.register(this.nhuLai);
    // Đế Tuấn registers after the divine adapter and takes over every h01I skill id (the registry keeps the last registration).
    this.deTuan = new VisualDeTuan(scene);
    this.heroKit.register(this.deTuan);
    // Nguyên Thủy registers after the legacy divine adapter, so it owns h014's ultimate; the normal attack stays with `divine`.
    this.nguyenThuy = new VisualNguyenThuy(scene, (event, at, reduced) => this.divine.show(event, at, reduced));
    this.heroKit.register(this.nguyenThuy);
    // Nhiên Đăng registers after the legacy divine adapter and owns every h03W skill id (cast, shield, reflect, basic).
    this.nhienDang = new VisualNhienDang(scene);
    this.heroKit.register(this.nhienDang);
    // Tướng Thần is a direct HeroVfx (its legacy adapter entry is gone), so it owns every h03Z skill id.
    this.heroKit.register(this.tuongThan);
    this.tier6Replay = new Tier6Replay(this);
    this.initInstancedRoots();
    for (const name of ['magic_01', 'magic_03', 'slash_01', 'twirl_01', 'spark_01', 'trace_01', 'circle_03']) {
      const texture = new Texture(`/assets/vfx-${name}.webp`, scene, false, true, Texture.TRILINEAR_SAMPLINGMODE,
        () => debug('visual.tier.texture.ready', { name }),
        (_message, error) => debug('visual.tier.texture.error', { name, message: String(error ?? 'load failed') }));
      texture.hasAlpha = true;
      this.glyphTextures.set(name, texture);
    }
    this.flareTexture = new DynamicTexture('skill-flare-gradient', { width: 64, height: 64 }, scene, false);
    const context = this.flareTexture.getContext();
    const gradient = context.createRadialGradient(32, 32, 2, 32, 32, 31);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(.22, 'rgba(255,255,255,.72)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    context.fillStyle = gradient; context.fillRect(0, 0, 64, 64);
    this.flareTexture.hasAlpha = true; this.flareTexture.update();
  }

  showCast(event: GameEvent, position: Vector3, origin?: Vector3): void {
    if (isEnemySkillEvent(event.skillId)) {
      this.showMonster(event, position, origin);
      return;
    }
    if (this.heroKit.cast(event, position, this.reduced.matches, origin)) return;
    if (event.skillId?.startsWith('tier3-tier4-') && tier34HeroId(event.skillId)) {
      paintTier34Cast(this.tierPainter(), event, position.clone());
      debug('visual.tier34.cast', { eventId: event.id, skillId: event.skillId });
      return;
    }
    if (isTierSkill(event.skillId)) {
      paintTierCast(this.tierPainter(), event, position.clone());
      debug('visual.tier.cast', { eventId: event.id, skillId: event.skillId });
      return;
    }
    const color = this.color(event);
    this.spawn('ring', position, color, 1.5, .25);
    const profile = this.profile(event);
    if (profile && !this.reduced.matches) this.spawn('glyph', position.add(new Vector3(0, .1, 0)), profile.color, 1.5, .25, undefined, profile.texture);
    if (isFireSkill(event.skillId)) {
      this.fire.cast(position);
      debug('visual.cast', { eventId: event.id, skillId: event.skillId });
      return;
    }
    if (!this.reduced.matches) this.spawn('flare', position, color, 1.3, .25);
    if (!this.reduced.matches) this.spawn('orb', position.add(new Vector3(0, .35, 0)), '#ffffff', .42, .2);
    debug('visual.cast', { eventId: event.id, skillId: event.skillId });
  }

  show(event: GameEvent, position: Vector3, origin?: Vector3, targets: readonly Vector3[] = [], main?: Vector3,
    supportTargets?: readonly Vector3[], presentation?: Pick<AbilityExtra, 'resourceTarget' | 'displacements'>): void {
    if (paintGearProc(this.tierPainter(), event, position, origin)) {
      debug('visual.gear-proc', { eventId: event.id, skillId: event.skillId });
      return;
    }
    // Every revive (Nữ Oa h01C, Thái Bạch h015) looks the same: the shared revive sheet where each ally stands up.
    if (event.skillId?.startsWith('revive-')) {
      for (const at of (targets.length ? targets : [position]).slice(0, 8)) this.sharedStatus.play('revive', at, this.reduced.matches);
      // Nữ Oa's mending line closes behind each ally who stands up (on top of the shared sheet).
      if (event.skillId === 'revive-h01C') this.nuwa.revive(event, targets.length ? targets : [position], this.reduced.matches);
      // Thái Bạch's starlight + guidance ribbon fall on the spot where the ally stands up (on top of the shared sheet).
      if (event.skillId.endsWith('-h015')) this.heroKit.ability(event, origin ?? position, position, this.reduced.matches,
        { targets: targets.length ? targets : [position], hasOrigin: origin !== undefined, main });
      debug('visual.effect', { eventId: event.id, kind: event.kind, skillId: event.skillId, shared: 'revive', targets: targets.length });
      return;
    }
    if (event.skillId?.startsWith('monster-') || isEnemySkillEvent(event.skillId)) {
      this.showMonster(event, position, origin, targets);
      return;
    }
    if ((event.kind === 'attack' || event.kind === 'trait') && basicAttackPreempts(event.skillId)
      && paintBasicAttack(this.tierPainter(), event, origin?.clone() ?? position.clone(), position.clone())) {
      debug('visual.basic.attack', { eventId: event.id, skillId: event.skillId, geometry: event.geometry, crit: event.isCrit === true });
      return;
    }
    // Defensive events arrive once per ally: position = ally, origin = the caster.
    if (this.heroKit.ability(event, origin ?? position, position, this.reduced.matches,
      { targets, hasOrigin: origin !== undefined, main, supportTargets: supportTargets?.map(at => at.clone()), ...presentation })) return;
    if (event.skillId === 'tier3-tier4-summon-h00N') {
      paintTier34Summon(this.tierPainter(), origin?.clone() ?? position.clone(), position.clone());
      return;
    }
    if (event.skillId?.startsWith('tier3-tier4-pulse-') && tier34HeroId(event.skillId)) {
      paintTier34Pulse(this.tierPainter(), event, position.clone());
      debug('visual.tier34.pulse', { eventId: event.id, skillId: event.skillId });
      return;
    }
    if (event.kind === 'ability' && event.skillId?.startsWith('tier3-tier4-') && tier34HeroId(event.skillId)) {
      paintTier34Ability(this.tierPainter(), event, origin?.clone() ?? position.clone(), position.clone(), targets.map(at => at.clone()));
      debug('visual.tier34.ability', { eventId: event.id, skillId: event.skillId, targets: targets.length });
      return;
    }
    if ((event.kind === 'attack' || event.kind === 'trait')
      && paintBasicAttack(this.tierPainter(), event, origin?.clone() ?? position.clone(), position.clone())) {
      debug('visual.basic.attack', { eventId: event.id, skillId: event.skillId, geometry: event.geometry, crit: event.isCrit === true });
      return;
    }
    if ((event.kind === 'attack' || event.kind === 'trait') && tier34HeroId(event.skillId)) {
      paintTier34Attack(this.tierPainter(), event, origin?.clone() ?? position.clone(), position.clone());
      debug('visual.tier34.attack', { eventId: event.id, skillId: event.skillId });
      return;
    }
    if (event.kind === 'ability' && isTierSkill(event.skillId)) {
      paintTierAbility(this.tierPainter(), event, origin?.clone() ?? position.clone(), position.clone(), targets.map(at => at.clone()));
      const heroId = extractHeroIdFromSkill(event.skillId);
      debug('visual.tier.ability', { eventId: event.id, skillId: event.skillId, targets: targets.length,
        element: HERO_BY_ID[heroId]?.element, radius: HERO_BY_ID[heroId]?.ability?.effect?.radius ?? 0 });
      return;
    }
    if ((event.kind === 'attack' || event.kind === 'trait') && isTierSkill(event.skillId)) {
      paintTierAttack(this.tierPainter(), event, origin?.clone() ?? position.clone(), position.clone());
      debug('visual.tier.attack', { eventId: event.id, skillId: event.skillId });
      return;
    }
    if (event.kind === 'ability' && event.ability === 'heal') {
      // Receiving a heal looks the same for every element: the shared heal sheet on the ally (position = the ally).
      this.sharedStatus.play('heal', position, this.reduced.matches);
      debug('visual.effect', { eventId: event.id, kind: event.kind, skillId: event.skillId, shared: 'heal' });
      return;
    }
    const ability = event.kind === 'ability';
    const heroId = event.skillId?.startsWith('skill-') ? event.skillId.slice(6)
      : event.skillId?.startsWith('web-') ? event.skillId.slice(4) : undefined;
    const hero = heroId ? HERO_BY_ID[heroId] : undefined;
    const effect = hero?.ability?.effect;
    const defensive = event.ability === 'shield' || event.ability === 'heal' || effect?.target === 'allies';
    const color = this.color(event);
    const profile = this.profile(event);
    if (isFireSkill(event.skillId) && !defensive) {
      const fireRadius = ability && effect?.shape === 'radius' ? effect.radius ?? 0 : 0;
      if (this.reduced.matches && fireRadius > 0) {
        this.spawn('ring', position, color, fireRadius * 2, .18);
      }
      if (origin) this.fire.launch(origin, position, ability, fireRadius);
      else this.fire.impact(position, ability, fireRadius);
      if (profile && !this.reduced.matches) this.spawn('glyph', position, profile.color, profile.size, .38, undefined, profile.texture);
      if (event.skillId === 'web-h00C' && !this.reduced.matches) {
        this.spawn('ring', position, '#ffd68a', 3.2, .32);
        this.burst(position, '#ffbd73', 5, 2.1);
      }
      debug('visual.effect', { eventId: event.id, kind: event.kind, skillId: event.skillId,
        shape: effect?.shape, status: effect?.status, projectile: Boolean(origin) });
      return;
    }
    const radius = effect?.radius ?? (event.ability === 'nova' ? 5.5 : 0);
    const groundRing = ability && (effect?.shape === 'radius' || event.ability === 'nova');
    if (groundRing && !defensive) this.spawn('ring', position, color, radius > 0 ? radius * 2 : 3.2, .55);
    this.spawn('orb', position, color, ability ? 1.7 : .85, ability ? .38 : .22);
    if (ability && !this.reduced.matches) this.spawn('flare', position, color, defensive ? 2.1 : 3.1, .3);
    if (profile && !this.reduced.matches) {
      this.spawn('glyph', position, profile.color, profile.size, ability ? .52 : .24, undefined, profile.texture);
      if (ability) this.burst(position, profile.color, profile.sparks, Math.min(3.2, profile.size * .65));
      if (event.skillId === 'web-h009') {
        this.spawn('halo', position, '#fff3c7', 3.1, .62);
        this.spawn('ring', position, profile.color, profile.size * 1.5, .55);
      } else if (event.skillId === 'web-h00A') {
        this.spawn('glyph', position.add(new Vector3(.5, 0, .2)), '#b9ffe0', profile.size * .75, .35, undefined, 'slash_01');
      } else if (event.skillId === 'web-h00D') {
        this.beam(position.add(new Vector3(0, 5, 0)), position, '#ffd789');
        this.spawn('ring', position, '#ff9c65', profile.size * 1.8, .55);
      } else if (event.skillId?.includes('h00G')) {
        this.spawn('ring', position, '#0284c7', profile.size * 1.7, .55);
        this.spawn('glyph', position.add(new Vector3(0, .2, 0)), '#0ea5e9', profile.size * .72, .65, undefined, 'twirl_01');
      } else if (event.skillId === 'web-h03P') {
        this.spawn('ring', position, '#d8f4a3', profile.size * 1.7, .55);
      }
    }
    if (ability && defensive) this.spawn('halo', position, color, event.ability === 'shield' ? 2.6 : 2.1, .7);
    if ((ability || event.ability === 'chain') && !defensive && origin && Vector3.DistanceSquared(origin, position) > 1.5) this.beam(origin, position, color);
    if (ability && !profile && !this.reduced.matches) this.burst(position, color, 4, 1.5);

    // Geometries & Traits visual feedback
    if (event.isCrit && !this.reduced.matches) {
      this.spawn('flare', position, '#ffea78', 2.0, .25);
      this.burst(position, '#ffea78', 5, 1.4);
    }
    if (event.geometry === 'linear_pierce' && origin && Vector3.DistanceSquared(origin, position) > 1.2) {
      this.beam(origin, position, color);
    }
    if (event.geometry === 'impact_splash' && !defensive) {
      this.spawn('ring', position, color, 3.0, .3);
      if (!this.reduced.matches) this.burst(position, color, 4, 1.2);
    }
    if (event.geometry === 'bounce' && origin && Vector3.DistanceSquared(origin, position) > 1.0) {
      this.beam(origin, position, color);
    }
    if (event.geometry === 'boomerang' && origin && Vector3.DistanceSquared(origin, position) > 1.2) {
      this.beam(origin, position, color);
      if (!this.reduced.matches) this.spawn('glyph', position, color, 1.3, .3, undefined, 'twirl_01');
    }
    if (event.geometry === 'frontal_cleave' && !this.reduced.matches) {
      this.spawn('glyph', position, color, 1.4, .25, undefined, 'slash_01');
    }
    if (event.skillId?.startsWith('mark-detonate')) {
      this.spawn('ring', position, '#ff4444', 3.5, .4);
      if (!this.reduced.matches) this.burst(position, '#ff8844', 8, 2.0);
    }
    if (event.skillId?.startsWith('aura-')) {
      this.spawn('halo', position, color, 2.5, .35);
    }

    debug('visual.effect', { eventId: event.id, kind: event.kind, skillId: event.skillId,
      shape: effect?.shape, status: effect?.status, active: this.active.length });
  }

  private showMonster(event: GameEvent, position: Vector3, origin?: Vector3, targets: readonly Vector3[] = []): void {
    const id = event.skillId;
    const casterPos = origin ?? position;

    if (event.kind === 'cast') {
      const telegraph = resolveEnemyTelegraph(
        event,
        { x: casterPos.x, z: casterPos.z },
        { x: position.x, z: position.z },
      );
      if (telegraph) {
        this.enemyTelegraph.show(telegraph, id, this.reduced.matches);
      }
    }

    const route = resolveEnemySkillVfx(event);
    if (route) {
      if (route.kind === 'boss-earth') {
        if (route.mode === 'shield-warning') {
          this.spawn('ring', position, route.color, 5, .8);
          this.bossEarth.show(position, 'shield-warning', this.reduced.matches);
        } else if (route.mode === 'quake-warning') {
          this.spawn('ring', position, route.color, 8, 1);
          this.bossEarth.show(position, 'quake-warning', this.reduced.matches);
        } else if (route.mode === 'shield') {
          this.bossEarth.show(position, 'shield', this.reduced.matches);
          if (!this.reduced.matches) this.tierParticles.smoke(position, '#8b7862', 2.2, .6);
        } else if (route.mode === 'quake') {
          this.bossEarth.show(position, 'quake', this.reduced.matches);
          if (!this.reduced.matches) {
            this.tierParticles.burst(position, '#9e8166', 9, 3.4);
            this.tierParticles.smoke(position, '#8f7968', 3.5, .7);
          }
        }
      } else if (route.kind === 'hero-adapter') {
        this.prepareHero(route.heroId);
        const mappedEvent: GameEvent = { ...event, skillId: route.mappedSkillId };
        const impactTargets = targets.length ? targets : [position];
        if (route.phase === 'cast') {
          this.heroKit.cast(mappedEvent, position, this.reduced.matches, casterPos);
        } else {
          this.heroKit.ability(mappedEvent, casterPos, position, this.reduced.matches, {
            targets: impactTargets,
            hasOrigin: origin !== undefined,
          });
          this.spawn('ring', position, route.accentColor, route.radius * 2, .45);
          if (!this.reduced.matches) {
            this.tierParticles.burst(position, route.accentColor, 8, Math.min(3.5, route.radius * .65));
          }
        }
      } else if (route.kind === 'chieftain-skill') {
        if (route.phase === 'cast') {
          this.spawn('ring', casterPos, route.color, 2.2, Math.min(.45, event.windup ?? .35));
          if (!this.reduced.matches) {
            this.spawn('flare', casterPos.add(new Vector3(0, .35, 0)), route.color, 1.8, .28);
          }
        } else {
          if (route.template === 'slam' || route.template === 'heavy-slam') {
            this.spawn('ring', position, route.color, route.radius * 2, .45);
            if (!this.reduced.matches) {
              this.spawn('decal', position, route.color, route.radius * 1.9, .42, undefined, 'circle_03');
              this.tierParticles.burst(position, route.color, route.template === 'heavy-slam' ? 9 : 6, route.radius * .6);
              this.tierParticles.smoke(position, '#78685a', route.radius * .55, .45);
              if (route.template === 'heavy-slam') this.fire.impact(position, true, route.radius * .75);
            }
          } else if (route.template === 'pierce') {
            if (origin) this.beam(origin, position, route.color, .38, .35);
            this.spawn('ring', position, route.color, 2.8, .32);
            if (!this.reduced.matches) {
              this.spawn('glyph', position, route.color, 1.6, .28, undefined, 'slash_01');
              this.tierParticles.burst(position, route.color, 6, 1.6);
            }
          } else if (route.template === 'leap' || route.template === 'heavy-leap') {
            if (origin && Vector3.DistanceSquared(origin, position) > 1.0) {
              this.beam(origin, position, route.color, .28, .28);
            }
            this.spawn('ring', position, route.color, route.radius * 2, .42);
            if (!this.reduced.matches) {
              this.tierParticles.burst(position, route.color, route.template === 'heavy-leap' ? 8 : 5, route.radius * .55);
              this.tierParticles.smoke(position, '#7d6b5d', route.radius * .5, .4);
            }
          } else if (route.template === 'warcry') {
            this.spawn('halo', position, route.color, 3.2, .55);
            this.spawn('ring', position, route.color, route.radius * 2, .48);
            if (!this.reduced.matches) {
              this.spawn('glyph', position.add(new Vector3(0, .2, 0)), route.color, 2.2, .45, undefined, 'twirl_01');
              this.tierParticles.burst(position, route.color, 7, 2.2);
            }
          }
        }
      } else if (route.kind === 'boss-enrage') {
        this.spawn('halo', position, route.color, 3.8, .7);
        this.spawn('ring', position, route.color, route.radius * 2, .55);
        if (!this.reduced.matches) {
          this.fire.impact(position, true, 3.2);
          this.tierParticles.burst(position, route.color, 10, 2.8);
        }
      }
      debug('visual.monster', { eventId: event.id, skillId: id, route: route.kind });
      return;
    }

    // Hero-skinned enemies (battlefield names the skin in the skill id) hit with that hero's look, smaller.
    const skin = /^monster-attack-(h[0-9A-Z]{3})$/.exec(id ?? '')?.[1];
    if (skin && paintEnemyBasicAttack(this.tierPainter(), event, casterPos.clone(), position.clone(), skin)) {
      debug('visual.basic.enemy', { eventId: event.id, skin });
      return;
    }
    if (id === 'monster-attack-m002' || (id?.startsWith('monster-attack-h') && origin && Vector3.DistanceSquared(origin, position) > 9)) {
      const impact = position.clone();
      const arrive = () => {
        this.spawn('orb', impact, '#f59742', .38, .18);
        if (!this.reduced.matches) {
          this.spawn('glyph', impact, '#ffb25b', .72, .22, undefined, 'spark_01');
          this.tierParticles.smoke(impact, '#6b4940', .45, .25);
        }
      };
      if (origin && !this.reduced.matches) this.monsterProjectiles.launch(origin.clone(), impact, arrive);
      else arrive();
    } else if (id === 'monster-attack-m001') {
      this.spawn('glyph', position, '#c4d4d0', .95, .2, undefined, 'slash_01');
      if (!this.reduced.matches) this.tierParticles.burst(position, '#a8b7b1', 3, .65);
    } else if (id === 'monster-attack-m003' || id === 'monster-attack-b001') {
      const boss = id.endsWith('b001');
      this.spawn('ring', position, '#8f7760', boss ? 2.1 : 1.1, .22);
      if (!this.reduced.matches) {
        this.tierParticles.burst(position, '#a69079', boss ? 7 : 4, boss ? 1.5 : .75);
        this.tierParticles.smoke(position, '#72675a', boss ? 1.3 : .7, .35);
      }
    } else if (id === 'monster-attack-m004') {
      this.spawn('glyph', position, '#b54454', .85, .22, undefined, 'slash_01');
      if (!this.reduced.matches) this.tierParticles.burst(position, '#8e3446', 3, .55);
    } else {
      this.spawn('orb', position, '#91b9a9', .32, .16);
      if (!this.reduced.matches) this.spawn('glyph', position, '#9cbea9', .7, .2, undefined, 'slash_01');
    }
    if (id?.startsWith('boss-') || event.id % 16 === 0)
      debug('visual.monster', { eventId: event.id, skillId: id });
  }

  private tierPainter(): TierSkillPainter {
    return {
      reduced: this.reduced.matches,
      ring: (at, color, diameter, duration) => this.spawn('ring', at, color, diameter, duration),
      image: (at, color, size, duration, texture, ground = false, spin = 0) => {
        if (this.reduced.matches) return;
        this.spawn(ground ? 'decal' : 'glyph', at, color, size, duration, undefined, texture);
        this.active[this.active.length - 1].spin = spin;
      },
      burst: (at, color, count, spread) => {
        if (!this.reduced.matches) this.tierParticles.burst(at, color, count, spread);
      },
      beam: (from, to, color, width = 0.22, duration = 0.32) => {
        if (!this.reduced.matches) this.beam(from, to, color, width, duration);
      },
      flash: (at, color, size, duration) => {
        if (this.reduced.matches) return;
        this.spawn('flare', at, color, size ?? 2.8, duration ?? 0.14);
      },
      shockwave: (at, color, radius, duration) => {
        this.spawn('ring', at, color, radius * 2, duration ?? 0.38);
      },
      smoke: (at, color, size, duration) => {
        if (this.reduced.matches) return;
        this.tierParticles.smoke(at, color, size, duration);
      },
      pillar: (at, color, width = 3.2, height = 7, duration = 0.45) => {
        if (this.reduced.matches) return;
        this.beam(at.subtract(new Vector3(0, 1.5, 0)), at.add(new Vector3(0, height - 1.2, 0)), color, width, duration);
      },
      travel: (from, to, color, size, texture, duration, arrive, options) => {
        if (this.reduced.matches) { this.scheduled.push({ delay: .06, run: arrive }); return; }
        this.spawn('glyph', from, color, size, duration, undefined, texture);
        const fx = this.active[this.active.length - 1];
        fx.from = fx.mesh.position.clone();
        fx.to = to.add(new Vector3(0, to.y > 1.5 ? 0 : 1.35, 0));
        fx.arrive = arrive;
        if (options?.arcHeight) fx.arcHeight = options.arcHeight;
        if (options?.spin) fx.spin = options.spin;
        if (options?.orient) fx.orient = options.orient;
      },
      later: (delay, run) => {
        if (this.scheduled.length >= 96) this.scheduled.shift();
        this.scheduled.push({ delay: this.reduced.matches ? 0 : delay, run });
      },
      fire: (at, radius) => this.fire.impact(at, radius > 0, radius),
      water: (at, radius, duration) => this.water.impact(at, radius, duration, this.reduced.matches),
      motif: (at, kind, size, duration, ground, spin) => this.tierMotifs.show(at, kind, size, duration,
        ground, spin, this.reduced.matches),
      motifTravel: (from, to, kind, size, duration, arrive, arcHeight) => this.tierMotifs.travel(
        from, to, kind, size, duration, arrive, arcHeight, this.reduced.matches),
    };
  }

  private color(event: GameEvent): string {
    const profile = this.profile(event);
    if (profile) return profile.color;
    const heroId = event.skillId?.startsWith('skill-') ? event.skillId.slice(6)
      : event.skillId?.startsWith('web-') ? event.skillId.slice(4) : undefined;
    const hero = heroId ? HERO_BY_ID[heroId] : undefined;
    const effect = hero?.ability?.effect;
    return effect?.status === 'slow' ? '#7cdffa' : effect?.status === 'burn' ? '#ff825b'
      : event.ability === 'shield' || event.ability === 'heal' || effect?.target === 'allies' ? '#94f6c5'
        : hero ? ELEMENT_COLORS[Math.max(0, Math.min(4, hero.element - 1))]
          : event.ability === 'chain' ? '#f5d177' : '#f4ae82';
  }

  private profile(event: GameEvent) {
    const id = event.skillId?.startsWith('skill-') ? event.skillId.slice(6)
      : event.skillId?.startsWith('web-') ? event.skillId.slice(4)
      : event.skillId?.startsWith('trait-') ? event.skillId.slice(6)
      : event.skillId?.startsWith('splash-') ? event.skillId.slice(7)
      : event.skillId?.startsWith('bounce-') ? event.skillId.slice(7)
      : event.skillId?.startsWith('nth-') ? event.skillId.slice(4)
      : '';
    return TIER_VISUALS[id];
  }

  private burst(position: Vector3, color: string, count: number, spread: number): void {
    for (let i = 0; i < count; i++) {
      const angle = i * Math.PI * 2 / count;
      const velocity = new Vector3(Math.cos(angle) * spread, .7 + i % 3 * .38, Math.sin(angle) * spread);
      this.spawn(i % 3 === 0 ? 'orb' : 'spark', position, color,
        .16 + i % 3 * .045, .35 + i % 3 * .07, velocity);
    }
  }

  private initInstancedRoots(): void {
    const geoKinds: EffectKind[] = ['ring', 'orb', 'beam', 'halo', 'spark'];
    const masterMat = new StandardMaterial('vfx-instanced-master', this.scene);
    masterMat.diffuseColor = Color3.White();
    masterMat.emissiveColor = Color3.Black();
    masterMat.disableLighting = true;
    masterMat.backFaceCulling = false;
    masterMat.disableDepthWrite = true;
    masterMat.alpha = 0.9999;
    masterMat.alphaMode = Engine.ALPHA_ADD;

    for (const kind of geoKinds) {
      const root = this.makeGeometryMesh(kind);
      root.material = masterMat;
      root.registerInstancedBuffer('color', 4);
      root.instancedBuffers.color = new Color4(1, 1, 1, 1);
      root.setEnabled(false);
      root.isPickable = false;
      this.roots[kind] = root;
    }
  }

  private makeGeometryMesh(kind: EffectKind): Mesh {
    if (kind === 'orb') return MeshBuilder.CreateSphere('root-orb', { diameter: 1, segments: 8 }, this.scene);
    if (kind === 'spark') return MeshBuilder.CreateBox('root-spark', { size: 1 }, this.scene);
    if (kind === 'beam') return MeshBuilder.CreateCylinder('root-beam', { height: 1, diameter: 1, tessellation: 7 }, this.scene);
    return MeshBuilder.CreateTorus(kind === 'halo' ? 'root-halo' : 'root-ring',
      { diameter: 1, thickness: kind === 'halo' ? .075 : .09, tessellation: 24 }, this.scene);
  }

  private acquireNode(kind: EffectKind): AbstractMesh {
    const pooled = this.pools[kind].pop();
    if (pooled) return pooled;

    const root = this.roots[kind];
    if (root) {
      const instance = root.createInstance(`${kind}-inst`);
      instance.instancedBuffers.color = new Color4(1, 1, 1, 1);
      instance.isPickable = false;
      return instance;
    }

    const plane = MeshBuilder.CreatePlane(`skill-${kind}`, { size: 1 }, this.scene);
    plane.billboardMode = kind === 'decal' ? Mesh.BILLBOARDMODE_NONE : Mesh.BILLBOARDMODE_ALL;
    plane.isPickable = false;
    return plane;
  }

  private spawn(kind: EffectKind, position: Vector3, color: string, size: number, duration: number, velocity?: Vector3, texture?: string): void {
    if (this.active.length >= MAX_EFFECTS) {
      const oldest = this.active.shift()!;
      this.release(oldest);
      oldest.arrive?.();
    }
    const mesh = this.acquireNode(kind);
    const baseColor = Color3.FromHexString(color);
    if (this.roots[kind]) {
      const buf = mesh.instancedBuffers.color as Color4;
      buf.r = baseColor.r;
      buf.g = baseColor.g;
      buf.b = baseColor.b;
      buf.a = 1.0;
    } else {
      mesh.material = kind === 'flare' ? this.flareMaterial(color) : this.glyphMaterial(color, texture!);
      mesh.visibility = 1;
    }
    mesh.position.copyFrom(position);
    mesh.position.y = kind === 'ring' ? 0.025 : kind === 'decal' ? 0.03 : position.y + (kind === 'halo' ? 1.55 : (position.y > 1.5 ? 0 : 1.35));
    mesh.rotationQuaternion = null;
    mesh.rotation.set(
      kind === 'halo' || kind === 'decal' ? Math.PI / 2 : 0,
      0,
      kind === 'spark' && velocity ? Math.atan2(velocity.x, velocity.y) : 0,
    );
    if (kind === 'beam') {
      mesh.scaling.set(size, 1, size);
    } else if (kind === 'spark') {
      mesh.scaling.set(size * 0.28, size * 1.7, size * 0.28);
    } else {
      mesh.scaling.setAll(size * (kind === 'ring' ? 0.2 : 0.65));
    }
    mesh.isPickable = false;
    mesh.setEnabled(true);
    this.active.push({ mesh, age: 0, duration: this.reduced.matches ? 0.16 : duration, size, kind, baseColor, velocity });

    if (kind === 'orb' && !velocity && size >= 0.4 && !this.reduced.matches) {
      this.spawnGroundBounceLight(position, color, size * 2.2, duration * 0.85);
    }
  }

  private spawnGroundBounceLight(position: Vector3, color: string, size: number, duration: number): void {
    if (this.glyphTextures.has('circle_03')) {
      this.spawn('decal', position, color, size, duration, undefined, 'circle_03');
    }
  }

  private beam(from: Vector3, to: Vector3, color: string, width = 0.22, duration = 0.32): void {
    if (this.active.length >= MAX_EFFECTS) {
      const oldest = this.active.shift()!;
      this.release(oldest);
      oldest.arrive?.();
    }
    const mesh = this.acquireNode('beam');
    const baseColor = Color3.FromHexString(color);
    if (mesh.instancedBuffers?.color) {
      const buf = mesh.instancedBuffers.color as Color4;
      buf.r = baseColor.r;
      buf.g = baseColor.g;
      buf.b = baseColor.b;
      buf.a = 1.0;
    } else {
      mesh.material = this.palette.get(`effect-${color}`, color, 1);
      mesh.visibility = 1;
    }
    const start = from.add(new Vector3(0, 1.5, 0));
    const end = to.add(new Vector3(0, 1.2, 0));
    const direction = end.subtract(start);
    const length = direction.length();
    mesh.position.copyFrom(start.add(end).scale(.5));
    mesh.rotationQuaternion ??= new Quaternion();
    Quaternion.FromUnitVectorsToRef(Vector3.Up(), direction.normalize(), mesh.rotationQuaternion);
    mesh.scaling.set(width, length, width);
    mesh.isPickable = false;
    mesh.setEnabled(true);
    this.active.push({ mesh, age: 0, duration: this.reduced.matches ? .12 : duration, size: width, kind: 'beam', baseColor });
  }

  private flareMaterial(color: string): StandardMaterial {
    let material = this.flareMaterials.get(color);
    if (material) return material;
    material = new StandardMaterial(`skill-flare-${color}`, this.scene);
    material.diffuseTexture = this.flareTexture;
    material.diffuseColor = Color3.FromHexString(color);
    material.emissiveColor = material.diffuseColor;
    material.useAlphaFromDiffuseTexture = true;
    material.disableLighting = true;
    material.backFaceCulling = false;
    material.alphaMode = Engine.ALPHA_ADD;
    material.disableDepthWrite = true;
    material.zOffset = -2;
    this.flareMaterials.set(color, material);
    return material;
  }

  private glyphMaterial(color: string, name: string): StandardMaterial {
    const key = `${name}:${color}`;
    let material = this.glyphMaterials.get(key);
    if (material) return material;
    const texture = this.glyphTextures.get(name);
    if (!texture) throw new Error(`Missing VFX texture: ${name}`);
    material = new StandardMaterial(`skill-${key}`, this.scene);
    material.diffuseTexture = texture;
    material.emissiveTexture = texture;
    material.diffuseColor = Color3.FromHexString(color);
    material.emissiveColor = material.diffuseColor;
    material.useAlphaFromDiffuseTexture = true;
    material.disableLighting = true;
    material.backFaceCulling = false;
    material.alphaMode = Engine.ALPHA_ADD;
    material.disableDepthWrite = true;
    material.zOffset = -2;
    this.glyphMaterials.set(key, material);
    return material;
  }

  tick(dt: number): void {
    this.tier6Replay.tick(dt);
    this.monsterProjectiles.tick(dt);
    this.bossEarth.tick(dt);
    this.enemyTelegraph.tick(dt, this.reduced.matches);
    this.heroKit.tick(dt);
    this.statusMarks.tick();
    this.sharedShield.tick(dt);
    this.sharedStatus.tick(dt);
    for (let i = this.scheduled.length - 1; i >= 0; i--) {
      const task = this.scheduled[i]; task.delay -= dt;
      if (task.delay <= 0) {
        this.scheduled[i] = this.scheduled[this.scheduled.length - 1];
        this.scheduled.pop();
        task.run();
      }
    }
    this.arrivals.length = 0;
    for (let i = this.active.length - 1; i >= 0; i--) {
      const fx = this.active[i]; fx.age += dt;
      if (fx.age >= fx.duration) {
        this.release(fx); this.active.splice(i, 1);
        if (fx.arrive) this.arrivals.push(fx.arrive);
        continue;
      }
      const progress = fx.age / fx.duration;
      if (fx.from && fx.to) {
        Vector3.LerpToRef(fx.from, fx.to, progress, fx.mesh.position);
        if (fx.arcHeight) {
          fx.mesh.position.y += Math.sin(progress * Math.PI) * fx.arcHeight;
        }
        if (fx.orient) {
          const dx = fx.to.x - fx.from.x;
          const dy = (fx.to.y - fx.from.y) + (fx.arcHeight ? Math.cos(progress * Math.PI) * fx.arcHeight * Math.PI : 0);
          if (Math.abs(dx) > 0.001 || Math.abs(dy) > 0.001) {
            fx.mesh.rotation.z = Math.atan2(dx, dy);
          }
        }
      }
      if (fx.velocity) {
        const drag = (1 - progress) * (1 - progress);
        fx.velocity.scaleAndAddToRef(dt * drag, fx.mesh.position);
        if (fx.kind === 'spark') {
          fx.velocity.y -= 9.8 * dt;
          if (fx.mesh.position.y < 0.03) {
            fx.mesh.position.y = 0.03;
            fx.velocity.y = 0;
          }
          fx.mesh.rotation.z = Math.atan2(fx.velocity.x, fx.velocity.y);
        }
      }
      if (fx.spin) fx.mesh.rotation.y += fx.spin * dt;

      if (fx.kind === 'beam') {
        const pulse = 1 + 0.18 * Math.sin(fx.age * 65);
        const width = fx.size * (1 - progress * 0.75) * pulse;
        fx.mesh.scaling.x = fx.mesh.scaling.z = width;
      } else if (fx.kind === 'spark') {
        const speed = fx.velocity ? fx.velocity.length() : 1;
        const stretch = Math.max(0.4, Math.min(2.5, speed * 0.28));
        fx.mesh.scaling.set(fx.size * 0.28, fx.size * stretch * (1 - progress * 0.5), fx.size * 0.28);
      } else if (fx.kind === 'ring') {
        const easeOutCubic = 1 - Math.pow(1 - progress, 3);
        fx.mesh.scaling.setAll(fx.size * (0.2 + 0.8 * easeOutCubic));
      } else if (fx.kind === 'orb') {
        const orbPulse = (1 + 0.25 * Math.sin(Math.min(1, progress * 3) * Math.PI)) * (1 - progress * 0.65);
        fx.mesh.scaling.setAll(fx.size * Math.max(0.1, orbPulse));
      } else if (fx.kind === 'halo') {
        const easeOutCubic = 1 - Math.pow(1 - progress, 3);
        fx.mesh.scaling.setAll(fx.size * (0.8 + 0.2 * easeOutCubic));
      } else {
        fx.mesh.scaling.setAll(fx.size * (0.65 + 0.35 * Math.sin(progress * Math.PI)));
      }

      const alpha = Math.max(0, 1 - progress * progress);
      if (fx.mesh.instancedBuffers?.color) {
        const buf = fx.mesh.instancedBuffers.color as Color4;
        buf.r = fx.baseColor.r;
        buf.g = fx.baseColor.g;
        buf.b = fx.baseColor.b;
        buf.a = alpha;
      } else {
        fx.mesh.visibility = alpha;
      }
    }
    for (let i = 0; i < this.arrivals.length; i++) this.arrivals[i]();
    this.fire.tick(dt);
    this.water.tick(dt);
    this.tierMotifs.tick(dt);
    for (const [id, marker] of this.statusMarkers) {
      if (!marker.touched) {
        marker.mesh.setEnabled(false); this.statusPool.push(marker.mesh);
        this.statusMarkers.delete(id);
      }
      else marker.touched = false;
    }
    for (const [id, marker] of this.groundMarkers) {
      if (!marker.touched) { marker.mesh.setEnabled(false); this.groundPool.push(marker.mesh); this.groundMarkers.delete(id); }
      else marker.touched = false;
    }
    for (const [id, plant] of this.plants) {
      if (!plant.touched) {
        plant.root.setEnabled(false); this.plantPool.push(plant.root); this.plants.delete(id);
        debug('visual.tier.plant.end');
      } else {
        if (!this.reduced.matches) plant.root.rotation.y += dt * .55;
        plant.touched = false;
      }
    }
    for (const [id, link] of this.soulLinkMarkers) {
      if (!link.touched) {
        link.mesh.setEnabled(false); this.soulLinkPool.push(link.mesh); this.soulLinkMarkers.delete(id);
      } else link.touched = false;
    }
  }

  markBurning(id: string, position: Vector3, phase: number): void { this.fire.markBurning(id, position, phase); }
  /** Khương Tử Nha's `phong-than` ground effect (every frame); `remaining` ends the zone's scroll and seal. */
  markPhongThan(id: string, position: Vector3, remaining?: number): void {
    this.khuongtu.markZone(id, position, remaining, this.reduced.matches);
  }
  /** Kit snapshot marker for `heroId`'s module (aura, ward, frozen… per hero). */
  markHero(heroId: string, kind: string, id: string, position: Vector3): void {
    this.heroKit.mark(heroId, kind, id, position, this.reduced.matches);
  }
  /** Called from the snapshot loop when a hero is in view: loads that hero's atlases once per zone. */
  prepareHero(heroId: string): void {
    this.heroKit.prepare(heroId);
    if (heroId === 'h01K') this.chuclong.prepare();
    else if (heroId === 'h01C') this.nuwa.prepare();
    else if (heroId === 'h01D') this.fuxi.prepare();
    else if (heroId === 'h01E') this.shennong.prepare();
    else if (heroId === 'h03Z') this.tuongThan.prepare();
    else if (heroId === 'h01I' || heroId === 'h014') this.divine.prepareRemaining(heroId);
  }
  markPeachBlessing(id: string, position: Vector3): void {
    this.heroKit.mark('h01A', 'peach', id, position, this.reduced.matches);
  }
  markStatus(id: string, position: Vector3, kind: StatusKind): void {
    if (kind === 'stoneShield') { this.bossEarth.markShield(id, position); return; }
    let marker = this.statusMarkers.get(id);
    if (!marker) {
      if (this.statusMarkers.size >= 256) return;
      const mesh = this.statusPool.pop() ?? MeshBuilder.CreateTorus('combat-status', { diameter: 1, thickness: .08, tessellation: 28 }, this.scene);
      mesh.isPickable = false; mesh.setEnabled(true);
      marker = { mesh, touched: false }; this.statusMarkers.set(id, marker);
    }
    marker.touched = true;
    marker.mesh.material = this.palette.get(`status-${kind}`, STATUS_COLORS[kind], .8);
    marker.mesh.position.set(position.x, .05, position.z);
    marker.mesh.scaling.setAll(1.9);
  }
  markGround(id: string, position: Vector3, radius: number,
    kind?: NonNullable<GameState['groundEffects']>[number]['kind']): void {
    let marker = this.groundMarkers.get(id);
    if (!marker) {
      if (this.groundMarkers.size >= 16) return;
      const mesh = this.groundPool.pop() ?? MeshBuilder.CreateTorus('burning-ground', { diameter: 1, thickness: .1, tessellation: 36 }, this.scene);
      mesh.isPickable = false;
      mesh.setEnabled(true); marker = { mesh, touched: false }; this.groundMarkers.set(id, marker);
    }
    marker.touched = true; marker.mesh.position.set(position.x, .04, position.z);
    marker.mesh.scaling.setAll(radius * 2);
    const color = kind === 'tier-water' ? '#56cce3' : kind === 'tier-gold' ? '#e6c97b' : '#ff8d58';
    marker.mesh.material = this.palette.get(`ground-${kind ?? 'fire'}`, color, .5);
    if (!kind || kind === 'tier-fire' || kind === 'gear-fire-trail') this.fire.markGroundBurning(id, position);
  }
  markLongVuongPool(id: string, at: Vector3, radius: number, remaining: number): void {
    this.longVuong.markPool(id, at, radius, remaining, this.reduced.matches);
  }
  replayLongVuong(origin: Vector3, at: Vector3): boolean {
    return this.longVuong.replay(origin, at, this.reduced.matches);
  }
  markTier4(heroId: string, kind: string, id: string, at: Vector3, remaining: number, _radius?: number): void {
    if (heroId === 'h03V' && kind === 'haste') this.batBoThienLong.markHaste(id, at, remaining, this.reduced.matches);
    if (heroId === 'h03T' && kind === 'echo') this.tinhDan.markEcho(id, at, remaining, this.reduced.matches);
    if (heroId === 'h010' && kind === 'fire') this.xichTungTu.markFire(id, at, remaining, this.reduced.matches);
    if (heroId === 'h00Z' && kind === 'barrage' && _radius !== undefined) this.ungLong.markBarrage(id, at, _radius, remaining, this.reduced.matches);
    if (heroId === 'h00Y' && kind === 'shackle') this.nguDao.markShackle(id, at, remaining, this.reduced.matches);
    if (heroId === 'h00Y' && kind === 'frenzy') this.nguDao.markFrenzy(id, at, remaining, this.reduced.matches);
    if (heroId === 'h00V' && kind === 'form') this.naTra.markForm(id, at, remaining, this.reduced.matches);
    if (heroId === 'h00U' && kind === 'form') this.duongTien.markForm(id, at, remaining, this.reduced.matches);
    if (heroId === 'h00T' && kind === 'barrage' && _radius !== undefined) this.loiChanTu.markBarrage(id, at, _radius, remaining, this.reduced.matches);
    if (heroId === 'h00T' && kind === 'burn') this.loiChanTu.markBurn(id, at, remaining, this.reduced.matches);
    if (heroId === 'h00R' && kind === 'clone') this.tonNgoKhong.markClone(id, at, remaining, this.reduced.matches);
    if (heroId === 'h00S' && kind === 'ground' && _radius !== undefined) this.duongTang.markGround(id, at, _radius, remaining, this.reduced.matches);
  }
  /** `?debug=1` `__vfxReplay(id,'attack')`: a plain hit, a critical hit, then one swing that lands on three monsters in the same tick. */
  replayBasicAttack(heroId: string, origin: Vector3, at: Vector3): boolean {
    const skillId = `trait-${heroId}`;
    const side = new Vector3(-(at.z - origin.z), 0, at.x - origin.x).normalize().scale(1.2);
    const swing = (id: number, tick: number, isCrit: boolean, hits: Vector3[]): void => {
      hits.forEach((hit, index) => this.show({ id: id + index, kind: 'attack', source: `replay-${heroId}`, at: tick, skillId, isCrit }, hit.clone(), origin.clone()));
    };
    swing(-40, 1, false, [at]);
    setTimeout(() => swing(-41, 2, true, [at]), 450);
    setTimeout(() => swing(-42, 3, false, [at, at.add(side), at.subtract(side)]), 900);
    debug('visual.basic.replay', { heroId });
    return true;
  }
  replayTier4(heroId: string, kind: string, origin: Vector3, at: Vector3): boolean {
    if (kind === 'attack' && basicAttackHeroId(`trait-${heroId}`)) return this.replayBasicAttack(heroId, origin, at);
    if (heroId === 'h03V') return this.batBoThienLong.replay(origin, at, this.reduced.matches, kind);
    if (heroId === 'h03U') return this.kimThanLaHan.replay(origin, at, this.reduced.matches, kind);
    if (heroId === 'h03T') return this.tinhDan.replay(origin, at, this.reduced.matches, kind);
    if (heroId === 'h010') return this.xichTungTu.replay(origin, at, this.reduced.matches, kind);
    if (heroId === 'h00Z') return this.ungLong.replay(origin, at, this.reduced.matches, kind);
    if (heroId === 'h00Y') return this.nguDao.replay(origin, at, this.reduced.matches, kind);
    if (heroId === 'h00X') return this.datKy.replay(origin, at, this.reduced.matches, kind);
    if (heroId === 'h00W') return this.lyTinh.replay(origin, at, this.reduced.matches, kind);
    if (heroId === 'h00V') return this.naTra.replay(origin, at, this.reduced.matches, kind);
    if (heroId === 'h00U') return this.duongTien.replay(origin, at, this.reduced.matches, kind);
    if (heroId === 'h00T') return this.loiChanTu.replay(origin, at, this.reduced.matches, kind);
    if (heroId === 'h00S') return this.duongTang.replay(origin, at, this.reduced.matches, kind);
    return heroId === 'h00R' && this.tonNgoKhong.replay(origin, at, this.reduced.matches, kind);
  }
  showMonkeyCloneSweep(event: GameEvent, origin: Vector3 | undefined, at: Vector3, targets: readonly Vector3[]): void {
    this.tonNgoKhong.cloneSweep(event, origin, targets, this.reduced.matches, at);
  }
  markTier3Link(heroId: string, id: string, from: Vector3, to: Vector3, remaining: number): void {
    if (heroId === 'h00O') this.phanQuan.markPair(id, from, to, remaining, this.reduced.matches);
  }
  markTier4Link(heroId: string, id: string, from: Vector3, to: Vector3, remaining: number): void {
    if (heroId === 'h00Y') this.nguDao.markPair(id, from, to, remaining, this.reduced.matches);
  }
  markTier4Immortal(id: string, at: Vector3, remaining: number, activeRemaining: number): void {
    this.kimThanLaHan.markImmortal(id, at, remaining, activeRemaining, this.reduced.matches);
  }
  markTier3(heroId: string, kind: string, id: string, at: Vector3, remaining: number, radius?: number): void {
    if (heroId === 'h03R' && kind === 'venom-plume') this.khongTuoc.markPlume(id, at, remaining, this.reduced.matches);
    if (heroId === 'h00O' && kind === 'shackle') this.phanQuan.markShackle(id, at, remaining, this.reduced.matches);
    if (heroId === 'h00N' && kind === 'ghost-fire' && radius !== undefined)
      this.chungQuy.markGround(id, at, radius, remaining, this.reduced.matches);
    if (heroId === 'h00J' && kind === 'guard') this.batGioi.markGuard(id, at, remaining, this.reduced.matches);
    if (heroId === 'h00M' && kind === 'barrage' && radius !== undefined)
      this.tinhVe.markBarrage(id, at, radius, remaining, this.reduced.matches);
  }
  replayTier3(heroId: string, kind: string, origin: Vector3, at: Vector3): boolean {
    if (kind === 'attack' && basicAttackHeroId(`trait-${heroId}`)) return this.replayBasicAttack(heroId, origin, at);
    if (heroId === 'h03S') return this.trieuCongMinh.replay(origin, at, this.reduced.matches, kind);
    if (heroId === 'h03R') return this.khongTuoc.replay(origin, this.reduced.matches, kind);
    if (heroId === 'h00P') return this.nguuMaVuong.replay(origin, this.reduced.matches, kind);
    if (heroId === 'h03Q') return this.tramHuong.replay(origin, this.reduced.matches, kind);
    if (heroId === 'h00O') return this.phanQuan.replay(origin, at, this.reduced.matches, kind);
    if (heroId === 'h00N') return this.chungQuy.replay(origin, at, this.reduced.matches, kind);
    if (heroId === 'h00J') return this.batGioi.replay(origin, this.reduced.matches, kind);
    if (heroId === 'h00K') return this.saNgoTinh.replay(origin, this.reduced.matches, kind);
    if (heroId === 'h00L') return this.tieuBachLong.replay(origin, at, this.reduced.matches, kind);
    return heroId === 'h00M' && this.tinhVe.replay(origin, at, this.reduced.matches, kind);
  }
  markPlant(id: string, position: Vector3): void {
    let plant = this.plants.get(id);
    if (!plant) {
      if (this.plants.size >= 24) return;
      const root = this.plantPool.pop() ?? this.createPlant();
      root.setEnabled(true);
      root.rotation.y = 0;
      plant = { root, touched: false };
      this.plants.set(id, plant);
      debug('visual.tier.plant.start');
    }
    plant.touched = true;
    plant.root.position.set(position.x, .04, position.z);
  }

  markSoulLink(key: string, from: Vector3, to: Vector3): void {
    const start = from.add(new Vector3(0, 1.35, 0));
    const end = to.add(new Vector3(0, 1.35, 0));
    const direction = end.subtract(start);
    const length = direction.length();
    if (length < .1) return;
    let link = this.soulLinkMarkers.get(key);
    if (!link) {
      if (this.soulLinkMarkers.size >= 64) return;
      const mesh = this.soulLinkPool.pop() ?? MeshBuilder.CreateCylinder('soul-link',
        { height: 1, diameter: .07, tessellation: 6 }, this.scene);
      mesh.material = this.palette.get('soul-link-water', '#7dd3fc', .65);
      mesh.isPickable = false; mesh.setEnabled(true);
      link = { mesh, touched: false }; this.soulLinkMarkers.set(key, link);
    }
    link.touched = true;
    link.mesh.position.copyFrom(start.add(end).scale(.5));
    link.mesh.rotationQuaternion ??= new Quaternion();
    Quaternion.FromUnitVectorsToRef(Vector3.Up(), direction.scale(1 / length), link.mesh.rotationQuaternion);
    link.mesh.scaling.set(1, length, 1);
  }

  private createPlant(): TransformNode {
    const root = new TransformNode('summoned-carnivorous-flower', this.scene);
    const stem = MeshBuilder.CreateCylinder('plant-stem', { height: 1.7, diameterTop: .22, diameterBottom: .36 }, this.scene);
    stem.parent = root; stem.position.y = .85;
    stem.material = this.palette.get('plant-stem', '#3b9850', .12);
    const bloom = MeshBuilder.CreateSphere('plant-bloom', { diameter: 1.2, segments: 10 }, this.scene);
    bloom.parent = root; bloom.position.y = 1.9; bloom.scaling.set(1, .65, 1);
    bloom.material = this.palette.get('plant-bloom', '#9bd74e', .15);
    const mouth = MeshBuilder.CreateSphere('plant-mouth', { diameter: .8, segments: 8 }, this.scene);
    mouth.parent = root; mouth.position.set(0, 1.91, -.49); mouth.scaling.set(1, .34, .3);
    mouth.material = this.palette.get('plant-mouth', '#59233f', .08);
    for (let i = 0; i < 4; i++) {
      const angle = i * Math.PI / 2;
      const petal = MeshBuilder.CreateSphere('plant-jaw-petal', { diameter: .9, segments: 8 }, this.scene);
      petal.parent = root;
      petal.position.set(Math.cos(angle) * .62, 2.06, Math.sin(angle) * .62);
      petal.scaling.set(.5, .28, .9);
      petal.rotation.y = -angle;
      petal.material = this.palette.get(i % 2 ? 'plant-petal-dark' : 'plant-petal-light',
        i % 2 ? '#4cae59' : '#9de76a', .16);
      petal.isPickable = false;
    }
    for (const side of [-1, 1]) {
      const fang = MeshBuilder.CreateCylinder('plant-fang',
        { height: .28, diameterTop: 0, diameterBottom: .12, tessellation: 5 }, this.scene);
      fang.parent = root;
      fang.position.set(side * .2, 1.94, -.76);
      fang.material = this.palette.get('plant-fang', '#f7efc7', .14);
      fang.isPickable = false;
    }
    const aura = MeshBuilder.CreateTorus('plant-armor-break-radius', { diameter: 6, thickness: .045, tessellation: 32 }, this.scene);
    aura.parent = root; aura.position.y = .06;
    aura.material = this.palette.get('plant-aura', '#84cc73', .45);
    aura.isPickable = false;
    for (const side of [-1, 1]) {
      const leaf = MeshBuilder.CreateSphere('plant-leaf', { diameter: 1, segments: 8 }, this.scene);
      leaf.parent = root; leaf.position.set(side * .55, .75, 0); leaf.scaling.set(.85, .2, .45);
      leaf.rotation.z = side * .35; leaf.material = this.palette.get('plant-leaf', '#4db96b', .1);
      leaf.isPickable = false;
    }
    stem.isPickable = bloom.isPickable = mouth.isPickable = false;
    return root;
  }
  clear(): void {
    this.gearTraps?.clear();
    this.tier6Replay.clear();
    this.monsterProjectiles.clear();
    this.bossEarth.clear();
    this.enemyTelegraph.clear();
    this.heroKit.clear();
    this.statusMarks.clear();
    this.sharedShield.clear();
    this.sharedStatus.clear();
    this.scheduled.length = 0;
    for (const fx of this.active) this.release(fx);
    this.active.length = 0;
    for (const marker of this.statusMarkers.values()) {
      marker.mesh.setEnabled(false); this.statusPool.push(marker.mesh);
    }
    this.statusMarkers.clear();
    for (const marker of this.groundMarkers.values()) { marker.mesh.setEnabled(false); this.groundPool.push(marker.mesh); }
    this.groundMarkers.clear();
    for (const plant of this.plants.values()) { plant.root.setEnabled(false); this.plantPool.push(plant.root); }
    this.plants.clear();
    for (const link of this.soulLinkMarkers.values()) { link.mesh.setEnabled(false); this.soulLinkPool.push(link.mesh); }
    this.soulLinkMarkers.clear(); this.tierParticles.clear(); this.fire.clear(); this.water.clear(); this.tierMotifs.clear();
  }
  private release(fx: ActiveEffect): void {
    fx.mesh.setEnabled(false); fx.mesh.visibility = 1; this.pools[fx.kind].push(fx.mesh);
  }
  markGearTraps(traps: NonNullable<GameState['gearTraps']>, zone: number): void {
    (this.gearTraps ??= new VisualGearTraps(this.scene)).update(traps, zone);
  }
  markPanguRift(ground: NonNullable<GameState['groundEffects']>[number]): void { this.panguUltimate.markRift(ground, this.reduced.matches); }
  replayPangu(kind: string, caster: Vector3, point: Vector3): boolean { return this.panguUltimate.replay(kind, caster, point, this.reduced.matches); }
  markBeidou(id: string, at: Vector3, remaining: number): void {
    this.truongDaoLang.markZone(id, at, remaining, this.reduced.matches);
  }
  replayTruong(kind: string, at: Vector3): boolean {
    return this.truongDaoLang.replay(kind, at, this.reduced.matches);
  }
  /** Server `lantern-cage` ground effect (Nhiên Đăng): holds the 24-pearl cage for `remaining` seconds. */
  markNhienDangCage(casterId: string, at: Vector3, radius: number, remaining: number): void {
    this.nhienDang.markCage(casterId, at, radius, remaining, this.reduced.matches);
  }
  replayNhienDang(kind: string, at: Vector3, origin?: Vector3): boolean {
    return this.nhienDang.replay(kind, at, this.reduced.matches, origin);
  }
  /** Server `five-finger` ground effect (Như Lai): remaining seconds drive the mountain rise/hold/collapse. */
  markNhuLaiZone(id: string, at: Vector3, remaining: number): void {
    this.nhuLai.markZone(id, at, remaining, this.reduced.matches);
  }
  replayNhuLai(kind: string, at: Vector3): boolean {
    return this.nhuLai.replay(kind, at, this.reduced.matches);
  }
  markDivineAura(id: string, kind: 'lantern' | 'solar' | 'bodhi' | 'cloud' | 'primordial', at: Vector3): void {
    this.divine.markAura(id, kind, at);
  }
  /**
   * Game-wide status feedback from snapshot state, one neutral Codex design per effect (never per element): `shield` is
   * the shared bubble, `stun`/`freeze`/`invulnerable` the shared sheets, every other kind a small mark (visual-status-marks.ts).
   */
  markSharedStatus(id: string, at: Vector3, kind: SharedMark): void {
    if (kind === 'shield') this.sharedShield.mark(id, at, this.reduced.matches);
    else if (isSharedHoldKind(kind)) this.sharedStatus.mark(kind, id, at, this.reduced.matches);
    else if (isStatusMarkKind(kind)) this.statusMarks.mark(kind, id, at);
  }
  /** One-shot shared sheets on a real event: `heal` on the receiving ally, `revive` where the ally stands up. */
  playSharedStatus(kind: 'heal' | 'revive', at: Vector3): void { this.sharedStatus.play(kind, at, this.reduced.matches); }
  /** Snapshot `berserk.remaining` of Hình Thiên (every frame): the armour/flame shell holds for that long. */
  markXingtianShell(id: string, at: Vector3, remaining: number): void {
    this.xingtian.markShell(id, at, remaining, this.reduced.matches);
  }
  replayXingtian(kind: string, at: Vector3): boolean {
    return this.xingtian.replay(kind, at, this.reduced.matches);
  }
  markDouzhanClone(id: string, at: Vector3): void { this.douzhan.mark('clone', id, at, this.reduced.matches); }
  replayDouzhan(kind: string, at: Vector3, origin?: Vector3): boolean {
    return this.douzhan.replay(kind, at, this.reduced.matches, origin);
  }
  markKimthienBowl(id: string, at: Vector3, remaining: number): void { this.kimthien.markBowl(id, at, remaining, this.reduced.matches); }
  replayHangnga(kind: string, at: Vector3, origin?: Vector3): boolean {
    return this.hangnga.replay(kind, at, this.reduced.matches, origin);
  }
  markNuwaShield(id: string, at: Vector3): void { this.sharedShield.mark(id, at, this.reduced.matches); }
  markNuwaWard(id: string, at: Vector3, remaining: number): void { this.nuwa.markWard(id, at, remaining, this.reduced.matches); }
  markHienvienZone(id: string, at: Vector3, remaining: number): void {
    this.hienvien.markZone(id, at, remaining, this.reduced.matches);
  }
  replayHienvien(kind: string, at: Vector3, origin?: Vector3): boolean {
    return this.hienvien.replay(kind, at, this.reduced.matches, origin);
  }
  replayKimsi(kind: string, at: Vector3, origin?: Vector3): boolean {
    return this.kimsi.replay(kind, at, this.reduced.matches, origin);
  }
  replayLucnhi(kind: string, at: Vector3, origin?: Vector3): boolean {
    return this.lucnhi.replay(kind, at, this.reduced.matches, origin);
  }
  replayHauNghe(kind: string, at: Vector3, origin?: Vector3): boolean {
    return this.hauNghe.replay(kind, at, this.reduced.matches, origin);
  }
  replayThaibach(kind: string, at: Vector3, origin?: Vector3): boolean {
    return this.thaibach.replay(kind, at, this.reduced.matches, origin);
  }
  /** Snapshot: an ally with `bodhiBlessing`; `remaining` is the server's seconds left. */
  markBodhiBlessing(id: string, position: Vector3, remaining: number): void {
    this.bodhi.markBlessing(id, position, remaining, this.reduced.matches);
  }
  /** One attack by an ally who has `bodhiBlessing` (never Bồ Đề's own): the double-hit accent at the target. */
  bodhiAccent(source: string, target: Vector3): void { this.bodhi.accent(source, target, this.reduced.matches); }
  replayBodhi(kind: string, at: Vector3, origin?: Vector3): boolean {
    return this.bodhi.replay(kind, at, this.reduced.matches, origin);
  }
  replayKimthien(kind: string, at: Vector3, origin?: Vector3): boolean {
    return this.kimthien.replay(kind, at, this.reduced.matches, origin);
  }
  replayKhuongtu(kind: string, at: Vector3, origin?: Vector3): boolean {
    return this.khuongtu.replay(kind, at, this.reduced.matches, origin);
  }
  replayTayvuongmau(kind: string, at: Vector3, origin?: Vector3): boolean {
    return this.tayvuongmau.replay(kind, at, this.reduced.matches, origin);
  }
  markShennongGrove(id: string, at: Vector3, radius: number, remaining: number): void {
    this.shennong.markGrove(id, at, radius, remaining, this.reduced.matches);
  }
  markFuxiBagua(id: string, at: Vector3, radius: number, remaining: number): void {
    this.fuxi.markZone(id, at, radius, remaining, this.reduced.matches);
  }
  markBloodSea(id: string, at: Vector3, radius: number, remaining: number): void {
    this.tuongThan.markZone(id, at, radius, remaining, this.reduced.matches);
  }
  markFuxiLink(id: string, from: Vector3, to: Vector3, remaining: number): void {
    this.fuxi.markLink(id, from, to, remaining, this.reduced.matches);
  }
  markHerbalHeal(id: string, from: Vector3, to: Vector3, remaining: number): void {
    this.shennong.markHeal(id, from, to, remaining, this.reduced.matches);
  }
  markTier6(kind: Tier6MarkerKind, id: string, at: Vector3, remaining: number, immortal = 0): void {
    const reduced = this.reduced.matches;
    if (kind === 'solar') this.deTuan.markForm(id, at, remaining, reduced);
    else if (kind === 'primordial') this.nguyenThuy.markBlessing(id, at, remaining, immortal, reduced);
    else if (kind === 'winter') this.chuclong.markWinter(id, at, remaining, reduced);
    else if (kind === 'solar-burn') this.chuclong.markBurn(id, at, remaining, reduced);
    else if (kind === 'tree') this.shennong.markTree(id, at, remaining, reduced);
    else if (kind === 'general') this.tuongThan.markGeneral(id, at, remaining, reduced);
    else if (kind === 'herb-weakness') this.shennong.markWeakness(id, at, remaining, reduced);
  }
  showTimeGift(event: GameEvent, from: Vector3, to: Vector3): void {
    this.chuclong.timeGift(event, from, to, this.reduced.matches);
  }
  showBloodGeneralHit(event: GameEvent, at: Vector3): void {
    this.tuongThan.generalHit(event, at, this.reduced.matches);
  }
  showPrimordialBreak(event: GameEvent, at: Vector3): void {
    this.nguyenThuy.bossBreak(at, this.reduced.matches);
  }
  replayTier6(heroId: string, kind: string, caster: Vector3, point: Vector3): boolean {
    if (heroId === 'h01I') return this.deTuan.replay(kind, caster, this.reduced.matches);
    if (heroId === 'h03Z') return this.tuongThan.replay(kind, caster, this.reduced.matches);
    if (heroId === 'h01K') return this.chuclong.replay(kind, caster, this.reduced.matches);
    if (heroId === 'h01C') return this.nuwa.replay(kind, caster, this.reduced.matches);
    if (heroId === 'h01D') return this.fuxi.replay(kind, caster, point, this.reduced.matches);
    if (heroId === 'h01E') return this.shennong.replay(kind, caster, point, this.reduced.matches);
    return this.tier6Replay.start(heroId, kind, caster, point);
  }
  markPhoenixCarpet(id: string, at: Vector3, radius: number, remaining: number, rainRemaining: number): void {
    this.phuongHoang.markCarpet(id, at, radius, remaining, rainRemaining, this.reduced.matches);
  }
  markPhoenixEgg(id: string, at: Vector3): void { this.phuongHoang.markEgg(id, at); }
  replayPhoenix(kind: string, caster: Vector3, at: Vector3, actorId?: string): boolean {
    return this.phuongHoang.replay(kind, caster, at, this.reduced.matches, actorId);
  }
  phoenixReplayEgg(id: string, at: Vector3): boolean { return this.phuongHoang.replayEgg(id, at); }
  cameraShake(): { x: number; y: number } { return this.reduced.matches ? { x: 0, y: 0 } : this.pangu.shake(); }
}
