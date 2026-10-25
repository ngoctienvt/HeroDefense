import type { KitPaletteName } from './visual-kit-palettes.js';
import type { SprayPresetName } from './visual-kit-spray.js';

/**
 * Data recipes for the tier 1–2 heroes (Linh / Huyền). A recipe only names kit pieces and tunes their
 * parameters; all geometry numbers (reach, radius, angle) are read from the combat profile at runtime.
 * Tier 1 here (basic attack + trait); the tier 2 skills are added in the second batch.
 *
 * The identity fingerprint is (element, archetype, matter, mainShape, trajectory, statusMark); the table
 * test forbids two heroes sharing the same (element, archetype) pair or the same full fingerprint.
 */
export type Element = 'kim' | 'moc' | 'thuy' | 'hoa' | 'tho';
export type Archetype = 'beam' | 'bounce' | 'cleave' | 'thrust' | 'splash' | 'aura' | 'quake' | 'volley';
/** Tier 2 active skill archetype (tier 1 has none). */
export type SkillArchetype = 'shield' | 'heal' | 'chain' | 'nova' | 'sweep';

export interface ElementKit {
  /** Library flipbooks (assets/vfx-source/kit/library.py) for small hits and big bursts. */
  readonly hit: string;
  readonly burst: string;
  readonly pillar: string;
  readonly spray: SprayPresetName;
}

export const ELEMENT_KITS: Readonly<Record<Element, ElementKit>> = {
  kim: { hit: 'lib-kim-hit', burst: 'lib-kim-burst', pillar: 'lib-kim-pillar', spray: 'gold' },
  moc: { hit: 'lib-moc-hit', burst: 'lib-moc-burst', pillar: 'lib-moc-pillar', spray: 'jade' },
  thuy: { hit: 'lib-thuy-hit', burst: 'lib-thuy-burst', pillar: 'lib-thuy-pillar', spray: 'frost' },
  hoa: { hit: 'lib-hoa-hit', burst: 'lib-hoa-burst', pillar: 'lib-hoa-pillar', spray: 'nether' },
  tho: { hit: 'lib-tho-hit', burst: 'lib-tho-burst', pillar: 'lib-tho-pillar', spray: 'earth' },
};

export interface RibbonLook { width: number; wave?: number; taper?: number; life: number }

export interface TierRecipe {
  readonly heroId: string;
  readonly element: Element;
  readonly palette: KitPaletteName;
  readonly archetype: Archetype;
  /** Active skill (tier 2); drives the cast telegraph and the ability painter. */
  readonly skill?: SkillArchetype;
  /** Half-angle (rad) of a frontal sweep; absent = full circle. */
  readonly sweepArc?: number;
  /** Spray override when the element's default does not fit the matter (water). */
  readonly spray?: SprayPresetName;
  /** Splash heroes whose basic attack is a projectile (h005, h00G) draw the ribbon too. */
  readonly basicRibbon?: boolean;
  /** Hero has an orbit aura that is not its archetype (h00F, h00G): draw a pulse ring only. */
  readonly auraRing?: boolean;
  /** Identity fingerprint, read by the table test. */
  readonly matter: string;
  readonly mainShape: string;
  readonly trajectory: string;
  readonly statusMark: string;
  /** Flipbook tint for elements whose library colour differs from the hero (violet hell-fire). */
  readonly tint?: readonly [number, number, number];
  /** Bolt/thrust/wave ribbon, for archetypes that draw one. */
  readonly ribbon?: RibbonLook;
  /** Hit flipbook scale (library `hit` ortho 3.2). */
  readonly hitScale: number;
}

export const TIER12_RECIPES: readonly TierRecipe[] = [
  { heroId: 'h001', element: 'kim', palette: 'gold', archetype: 'beam', hitScale: .45,
    matter: 'ánh kim', mainShape: 'tia mảnh thẳng và ấn tròn khóa mục tiêu', trajectory: 'thẳng', statusMark: 'vết nứt giáp',
    ribbon: { width: .26, life: .26 } },
  { heroId: 'h002', element: 'moc', palette: 'jade', archetype: 'bounce', hitScale: .4,
    matter: 'sóng âm lục', mainShape: 'dải sóng lượn và vòng sóng lan', trajectory: 'nảy cung', statusMark: 'giọt độc xếp ấn',
    ribbon: { width: .55, wave: 1, life: .34 } },
  { heroId: 'h003', element: 'hoa', palette: 'netherfire', archetype: 'cleave', hitScale: .5, tint: [.78, .45, 1],
    matter: 'u hỏa tím', mainShape: 'lưỡi liêm cung chém', trajectory: 'quét cung', statusMark: 'lửa bám nổ khi chết' },
  { heroId: 'h004', element: 'kim', palette: 'gold', archetype: 'thrust', hitScale: .45,
    matter: 'mũi thương vàng', mainShape: 'đường đâm thon về mũi', trajectory: 'đâm thẳng ngắn', statusMark: 'vết chảy máu',
    ribbon: { width: .6, taper: 1, life: .24 } },
  { heroId: 'h005', element: 'tho', palette: 'earth', archetype: 'beam', basicRibbon: true, hitScale: .6,
    matter: 'đá nặng', mainShape: 'mũi tên đất và đá vụn văng', trajectory: 'thẳng nặng', statusMark: 'choáng đòn thứ ba',
    ribbon: { width: .4, life: .3 } },
  { heroId: 'h006', element: 'moc', palette: 'jade', archetype: 'beam', hitScale: .5,
    matter: 'cánh hoa', mainShape: 'hoa nở và sợi sinh khí tới đồng minh', trajectory: 'rơi từ trên', statusMark: 'sinh khí hồi máu',
    ribbon: { width: .4, wave: .8, life: .5 } },
  { heroId: 'h007', element: 'thuy', palette: 'ice', archetype: 'aura', hitScale: .45,
    matter: 'mai băng sương', mainShape: 'mai rùa tĩnh và sóng sương theo nhịp', trajectory: 'tại chỗ', statusMark: 'sương bám chân chậm' },
  { heroId: 'h008', element: 'tho', palette: 'earth', archetype: 'quake', hitScale: .5,
    matter: 'đất nứt', mainShape: 'vết nứt tĩnh và đất trồi', trajectory: 'lướt rồi trồi', statusMark: 'vầng giáp đất' },
  // h009 Kim Tra has its own module (visual-kimtra*.ts), not a recipe.
  // h00A Mộc Tra has its own module (visual-moctra*.ts), not a recipe.
  { heroId: 'h00B', element: 'tho', palette: 'earth', archetype: 'volley', skill: 'sweep', sweepArc: 1.32, hitScale: .55,
    matter: 'cát đá', mainShape: 'quạt bão cát quét hình quạt thổi lùi', trajectory: 'hai luồng gió song song', statusMark: 'đẩy lùi',
    ribbon: { width: .55, wave: .3, life: .3 } },
  { heroId: 'h00C', element: 'hoa', palette: 'lava', archetype: 'thrust', skill: 'sweep', hitScale: .5,
    matter: 'chân hỏa', mainShape: 'thương lửa đâm và quét vòng tròn', trajectory: 'đâm thẳng, quét 360°', statusMark: 'thiêu đốt xếp ấn',
    ribbon: { width: .6, taper: 1, life: .26 } },
  { heroId: 'h00D', element: 'hoa', palette: 'lava', archetype: 'thrust', skill: 'nova', hitScale: .5,
    matter: 'kiếm hỏa', mainShape: 'phi kiếm xuyên dài và cự kiếm rơi cắm đất', trajectory: 'xuyên dài, rơi từ trên', statusMark: 'kiếm hỏa cháy dưới đất',
    ribbon: { width: .45, taper: 1, life: .3 } },
  // h00E Cự Linh Thần has its own module (visual-culinh*.ts), not a recipe.
  { heroId: 'h00F', element: 'moc', palette: 'jade', archetype: 'beam', skill: 'heal', auraRing: true, hitScale: .45,
    matter: 'cánh mẫu đơn', mainShape: 'cánh hoa nảy và mưa hoa hồi máu', trajectory: 'nảy cung hoa', statusMark: 'tăng tốc đánh',
    ribbon: { width: .5, wave: .9, life: .36 } },
  { heroId: 'h00G', element: 'thuy', palette: 'blackwater', spray: 'blackwater', archetype: 'beam', skill: 'nova', auraRing: true, basicRibbon: true, hitScale: .55,
    matter: 'nước Hoàng Hà', mainShape: 'cầu nước nổ và xoáy hút vào tâm', trajectory: 'cầu nước thẳng', statusMark: 'chậm sâu trong xoáy',
    ribbon: { width: .5, wave: .5, life: .3 } },
  { heroId: 'h00H', element: 'tho', palette: 'underworld', archetype: 'beam', skill: 'chain', hitScale: .45,
    matter: 'xích âm phủ', mainShape: 'xích đen trắng nối mục tiêu', trajectory: 'thẳng, nối chuỗi', statusMark: 'giảm giáp',
    ribbon: { width: .3, life: .28 } },
  { heroId: 'h00I', element: 'thuy', palette: 'ice', archetype: 'bounce', skill: 'chain', hitScale: .45,
    matter: 'canh Vong Xuyên', mainShape: 'dòng canh đục nối nhiều quái', trajectory: 'nảy cung', statusMark: 'yếu công chậm đánh',
    ribbon: { width: .6, wave: 1, life: .34 } },
  { heroId: 'h03O', element: 'thuy', palette: 'ice', archetype: 'beam', skill: 'heal', hitScale: .45,
    matter: 'sương lam âm ba', mainShape: 'âm ba huyền cầm và khiên sương', trajectory: 'thẳng', statusMark: 'khiên sương hồi dư',
    ribbon: { width: .4, wave: 1, life: .4 } },
  { heroId: 'h03P', element: 'moc', palette: 'jade', archetype: 'beam', skill: 'nova', hitScale: .5,
    matter: 'bào tử độc', mainShape: 'quả thần nổ bào tử', trajectory: 'quả rơi nảy', statusMark: 'độc rút Giáp' },
];

export const TIER12_BY_ID: ReadonlyMap<string, TierRecipe> = new Map(TIER12_RECIPES.map(r => [r.heroId, r]));
