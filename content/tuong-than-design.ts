import type { HeroAbility } from '../packages/contracts/src/types';

export const TUONG_THAN = {
  id: 'h03Z', hp: 14000, attack: 1090, armor: 34, range: 2.8,
  interval: .85, speed: 4.6, block: 16,
  cleaveRadius: 3.6, rageOnAttack: 12, rageOnHit: 6,
  conversion: .35, shieldCapRatio: .5, bleedSeconds: 3,
  bleedDps: 180, burnDps: 180, deathThreshold: 6,
  warriorCap: 6, warriorHp: 3000, warriorAttack: 350,
  warriorSeconds: 20, warriorInterval: 1.1,
  seaRadius: 8.5, seaPower: 4.6, drainPower: 1,
  seaSeconds: 8, seaDps: 220, slow: .5, sunder: .4,
  teamShield: 2500, generalCount: 4, generalHp: 5000,
  generalAttack: 550, generalSeconds: 8,
  generalInterval: 1.2,
} as const;

export const TUONG_THAN_ABILITY: HeroAbility = {
  id: 'skill-h03Z', provenance: 'adapted', name: 'Huyết Hải Vạn Thi Trận',
  description: '100 Nộ: Huyết Hải bán kính 8,5 gây 460% Công cộng 100% Công sát thương chuẩn; hồi đầy Máu, cho đồng minh khiên máu, gọi bốn Huyết Thi Đại Tướng trong 8 giây. Đầm máu làm chậm 50%, phá 40% Giáp và hút máu liên tục.',
  kind: 'nova', cooldown: 0, power: TUONG_THAN.seaPower,
  effect: { target: 'enemy', shape: 'radius', radius: TUONG_THAN.seaRadius,
    status: 'slow', statusSeconds: TUONG_THAN.seaSeconds, statusStrength: TUONG_THAN.slow },
};
