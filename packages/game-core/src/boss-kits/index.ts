import type { EnemySkillState } from '../../../contracts/src/types.js';
import type { EnemySkillHelpers } from '../enemy-skill-templates.js';
import { resolveChucDungCongCongSkill, startChucDungCongCongWindup } from './chuc-dung-cong-cong.js';
import { resolveHacPhongSkill, startHacPhongWindup } from './hac-phong.js';
import { checkHinhThienEnrage, resolveHinhThienSkill, startHinhThienWindup } from './hinh-thien.js';
import {
  checkTwinEnrage,
  resolveNguuMaThietPhienSkill,
  startNguuMaThietPhienWindup,
} from './nguu-ma-thiet-phien.js';

export function stepBossPassives(helpers: EnemySkillHelpers): void {
  const { state, enemy } = helpers;
  if (enemy.kit === 'hinh-thien') {
    checkHinhThienEnrage(state, enemy);
  } else if (
    enemy.kit === 'nguu-ma' ||
    enemy.kit === 'thiet-phien' ||
    enemy.kit === 'chuc-dung' ||
    enemy.kit === 'cong-cong'
  ) {
    checkTwinEnrage(state, enemy);
  }
}

export function startBossKitWindup(helpers: EnemySkillHelpers, skill: EnemySkillState): boolean {
  switch (helpers.enemy.kit) {
    case 'hac-phong':
      return startHacPhongWindup(helpers, skill);
    case 'nguu-ma':
    case 'thiet-phien':
      return startNguuMaThietPhienWindup(helpers, skill);
    case 'hinh-thien':
      return startHinhThienWindup(helpers, skill);
    case 'chuc-dung':
    case 'cong-cong':
      return startChucDungCongCongWindup(helpers, skill);
    default:
      return false;
  }
}

export function resolveBossKitSkill(
  helpers: EnemySkillHelpers,
  skill: EnemySkillState,
  locked: NonNullable<EnemySkillState['windup']>,
): void {
  switch (helpers.enemy.kit) {
    case 'hac-phong':
      resolveHacPhongSkill(helpers, skill);
      break;
    case 'nguu-ma':
    case 'thiet-phien':
      resolveNguuMaThietPhienSkill(helpers, skill, locked);
      break;
    case 'hinh-thien':
      resolveHinhThienSkill(helpers, skill, locked);
      break;
    case 'chuc-dung':
    case 'cong-cong':
      resolveChucDungCongCongSkill(helpers, skill, locked);
      break;
  }
}
