import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { GameEvent } from '../../../packages/contracts/src/types.js';
import { HERO_BY_ID } from '../../../content/catalog.js';
import type { TierMotif } from './visual-tier-motif-textures.js';

type TextureName = 'magic_01' | 'magic_03' | 'slash_01' | 'twirl_01' | 'spark_01'
  | 'trace_01' | 'circle_03';

export type TierSkillPainter = {
  ring(at: Vector3, color: string, diameter: number, duration: number): void;
  image(at: Vector3, color: string, size: number, duration: number, texture: TextureName, ground?: boolean, spin?: number): void;
  burst(at: Vector3, color: string, count: number, spread: number): void;
  beam(from: Vector3, to: Vector3, color: string, width?: number, duration?: number): void;
  flash(at: Vector3, color: string, size?: number, duration?: number): void;
  shockwave(at: Vector3, color: string, radius: number, duration?: number): void;
  smoke(at: Vector3, color: string, size?: number, duration?: number): void;
  pillar(at: Vector3, color: string, width?: number, height?: number, duration?: number): void;
  travel(from: Vector3, to: Vector3, color: string, size: number, texture: TextureName, duration: number, arrive: () => void,
    options?: { arcHeight?: number; spin?: number; orient?: boolean }): void;
  later(delay: number, run: () => void): void;
  fire(at: Vector3, radius: number): void;
  water(at: Vector3, radius: number, duration: number): void;
  motif(at: Vector3, kind: TierMotif, size: number, duration: number, ground?: boolean, spin?: number): void;
  motifTravel(from: Vector3, to: Vector3, kind: TierMotif, size: number, duration: number,
    arrive: () => void, arcHeight?: number): void;
  reduced: boolean;
};

const TIER_HEROES = new Set(['h009', 'h00A', 'h00B', 'h00C', 'h00D', 'h00E', 'h00F',
  'h00G', 'h00H', 'h00I', 'h03O', 'h03P']);
const ELEMENT_COLORS = ['#f5c85b', '#3ac587', '#38bdf8', '#fb7135', '#bd9255'] as const;

export function tierSkillColor(id: string): string | undefined {
  if (!TIER_HEROES.has(id)) return undefined;
  const element = HERO_BY_ID[id]?.element;
  return element && element >= 1 && element <= 5 ? ELEMENT_COLORS[element - 1] : undefined;
}

function tierSkillRadius(id: string): number {
  return HERO_BY_ID[id]?.ability?.effect?.radius ?? 0;
}

export function extractHeroIdFromSkill(skillId?: string): string {
  if (!skillId) return '';
  if (skillId.startsWith('skill-')) return skillId.slice(6);
  if (skillId.startsWith('web-')) return skillId.slice(4);
  if (skillId.startsWith('trait-')) return skillId.slice(6);
  if (skillId.startsWith('burst-')) return skillId.slice(6);
  if (skillId.startsWith('splash-')) return skillId.slice(7);
  if (skillId.startsWith('bounce-')) return skillId.slice(7);
  if (skillId.startsWith('mark-detonate-')) return skillId.slice(14);
  return '';
}

export function isTierSkill(skillId?: string): boolean {
  const id = extractHeroIdFromSkill(skillId);
  return tierSkillColor(id) !== undefined;
}

/** 
 * Authored telegraph / cast choreography for the twelve Tier Huyền heroes.
 * Distinct elemental identity, ground seals, flashes, and sound-wave/particle cues.
 */
export function paintTierCast(fx: TierSkillPainter, event: GameEvent, at: Vector3): boolean {
  const id = extractHeroIdFromSkill(event.skillId);
  const color = tierSkillColor(id);
  if (!color) return false;

  // The cast silhouette remains readable before the server's impact event.
  fx.shockwave(at, color, id === 'h00E' ? 2.5 : 1.6, 0.3);
  if (fx.reduced) return true;

  // Elemental flash at feet (element-tinted, avoid blinding white wash)
  fx.flash(at, color, 2.0, 0.14);

  // Elemental Cast Seal & Aura
  switch (id) {
    case 'h009': // Chuông kim bảo hộ
      fx.motif(at, 'bell', 2.8, .48);
      fx.burst(at, '#fbbf24', 8, 1.4);
      break;
    case 'h00A': // Kiếm khí dây leo trước khi tự tăng tốc đánh
      fx.motif(at, 'vines', 2.8, .5);
      break;
    case 'h00B': // Bão cát từ quạt Ba Tiêu
      fx.motif(at, 'sand', 3.4, .5, true, 5);
      fx.smoke(at, '#b45309', 2.8, 0.5);
      fx.burst(at, '#fb923c', 4, 1.1);
      break;
    case 'h00C': // Thương lửa quét tròn quanh chủ thể
      fx.motif(at, 'fire-sweep', 3.1, .5);
      fx.fire(at, 0);
      fx.burst(at, '#f97316', 10, 1.8);
      break;
    case 'h00D': // Kiếm trận Thuần Dương
      fx.motif(at, 'sword', 3.2, .5);
      break;
    case 'h00E': // Thiết bích hộ vệ của hành Kim
      fx.shockwave(at, '#facc15', 3.0, 0.38);
      fx.motif(at, 'shield', 3.2, .5);
      fx.burst(at, '#fde68a', 8, 1.6);
      break;
    case 'h00F': // Sinh khí Mộc cùng cánh hoa hồng
      fx.motif(at, 'flower', 3.2, .5);
      fx.burst(at, '#f472b6', 8, 1.4);
      break;
    case 'h00G': // Xoáy nước Hoàng Hà
      fx.shockwave(at, color, 2.8, 0.45);
      fx.water(at, 1.3, .55);
      break;
    case 'h00H': // Đường ngắm đơn mục tiêu, Thổ pha âm phủ
      fx.motif(at, 'sniper', 2.8, .45);
      fx.smoke(at, '#3b0764', 2.8, 0.55);
      break;
    case 'h00I': // Dòng Vong Xuyên nối mục tiêu
      fx.motif(at, 'soul', 2.8, .45);
      fx.smoke(at, '#164e63', 2.6, 0.5);
      break;
    case 'h03O': // Tiếng đàn và sương băng hành Thủy
      fx.shockwave(at, color, 2.6, 0.38);
      fx.motif(at, 'song', 2.8, .48);
      fx.smoke(at, '#9bdaf6', 3.0, 0.6);
      break;
    case 'h03P': // Hạt giống Thần Mộc
      fx.motif(at, 'bloom', 2.8, .45);
      fx.burst(at, '#84cc16', 8, 1.4);
      break;
  }
  return true;
}

/** 
 * Authored 4-beat choreography for the twelve Tier Huyền abilities:
 * 1. Telegraph / Launch  2. Travel / Projectile Motion  3. Impact / Detonation  4. Aftermath / Residuals
 * Server authority is strictly maintained (damage/status calculations stay on server).
 */
export function paintTierAbility(fx: TierSkillPainter, event: GameEvent, from: Vector3,
  center: Vector3, targets: readonly Vector3[]): boolean {
  const id = extractHeroIdFromSkill(event.skillId);
  const color = tierSkillColor(id);
  if (!color) return false;
  const hits = targets.length ? targets : [center];
  const radius = tierSkillRadius(id);

  switch (id) {
    case 'h009': { // Kim Chung: bản thân và một đồng minh nhận khiên phản đòn.
      fx.shockwave(from, color, radius, .38);
      for (const at of hits.slice(0, 2)) {
        const protect = () => {
          fx.flash(at, '#fff0a6', 2.2, .12);
          fx.ring(at, color, 2.5, .55);
          fx.motif(at, 'bell', 3.6, .95);
          if (!fx.reduced) {
            fx.burst(at, color, 5, 1.1);
          }
        };
        if (Vector3.DistanceSquared(from, at) < .5) protect();
        else fx.motifTravel(from, at, 'bell', 1.8, .2, protect, .5);
      }
      break;
    }

    case 'h00A': { // Mộc Ảnh Vũ là tự cường hóa, không gây trúng đòn ngay.
      fx.shockwave(from, color, 2.2, .35);
      fx.motif(from, 'vines', 4, 1.05);
      if (!fx.reduced) {
        fx.image(from.add(new Vector3(-.75, 1.2, 0)), '#9af5bd', 2.5, .38, 'slash_01');
        fx.image(from.add(new Vector3(.75, 1.2, 0)), '#9af5bd', 2.5, .38, 'slash_01');
        fx.burst(from, color, 9, 1.6);
      }
      break;
    }

    case 'h00B': { // Quạt bão cát tới cụm quái; lửa chỉ tồn tại khi server gây bỏng.
      fx.motifTravel(from, center, 'sand', 3.2, .24, () => {
        fx.flash(center, '#fbd18a', 2.5, .13);
        fx.shockwave(center, color, radius, .6);
        fx.motif(center, 'sand', radius * 2, 1.15, true, 4.5);
        if (!fx.reduced) {
          fx.smoke(center, '#8b633d', 3.6, .7);
          fx.burst(center, '#f5a849', 12, 2.8);
        }
      }, .45);
      break;
    }

    case 'h00C': { // Thương lửa quét đủ 360° quanh Hồng Hài Nhi.
      fx.shockwave(from, color, radius, .52);
      fx.motif(from, 'fire-sweep', radius * 1.8, .68, true, 4.2);
      fx.fire(from, radius);
      if (!fx.reduced) {
        for (let i = 0; i < 4; i++) {
          const angle = i * Math.PI / 2;
          const edge = from.add(new Vector3(Math.cos(angle) * radius * .7, 0, Math.sin(angle) * radius * .7));
          fx.later(i * .05, () => {
            fx.fire(edge, 0);
            fx.image(edge, '#ffae5b', 2.8, .3, 'slash_01');
          });
        }
        fx.burst(from, '#ff9a4a', 14, radius * .7);
        fx.smoke(from, '#6a2414', 4.1, .72);
      }
      break;
    }

    case 'h00D': { // Cự kiếm rơi, kiếm trận còn cháy theo ground effect từ server.
      const above = center.add(new Vector3(0, 9, 0));
      fx.motifTravel(above, center, 'sword', 6.5, .28, () => {
        fx.pillar(center, color, 2.5, 8, .55);
        fx.flash(center, '#ffdb80', 3.2, .16);
        fx.shockwave(center, color, radius, .6);
        fx.motif(center, 'sword', 6.4, .85);
        fx.fire(center, radius);
        if (!fx.reduced) {
          fx.image(center, '#ff9b4b', 5.5, .6, 'slash_01', true, 4);
          fx.burst(center, '#ffc76b', 14, 3.2);
          fx.smoke(center, '#552b1c', 4.2, .8);
        }
      });
      break;
    }

    case 'h00E': { // Búa làm choáng gần; thiết bích che đồng minh.
      fx.flash(from, '#fff0b0', 2.7, .15);
      fx.shockwave(from, color, 3, .38);
      fx.ring(from, color, radius * 2, .55);
      if (!fx.reduced) {
        fx.burst(from, '#f7dc8a', 10, 2.6);
      }
      for (const [index, at] of hits.entries()) {
        fx.later(.1 + index * .04, () => {
          fx.flash(at, '#fff0b0', 2.1, .12);
          fx.ring(at, color, 2.3, .55);
          fx.motif(at, 'shield', 3.2, .9);
          if (!fx.reduced) {
            fx.burst(at, '#fff1a8', 5, 1.2);
          }
        });
      }
      break;
    }

    case 'h00F': { // Hồi máu và tăng tốc cho tối đa bốn đồng minh.
      fx.ring(from, color, radius * 2, .55);
      for (const [index, at] of hits.slice(0, 4).entries()) {
        fx.later(index * .07, () => {
          fx.motifTravel(from, at, 'flower', 2.1, .23, () => {
            fx.flash(at, '#d7ffc9', 2.3, .13);
            fx.ring(at, color, 2.1, .48);
            fx.motif(at, 'flower', 3.2, 1.0);
            if (!fx.reduced) {
              fx.burst(at, '#f8a6cb', 7, 1.5);
            }
          }, .55);
        });
      }
      break;
    }

    case 'h00G': { // Thủy lao 4.8: hút tức thời, chậm sâu trong 3.5 giây.
      fx.flash(center, '#a4e8ff', 2.4, .14);
      fx.shockwave(center, color, radius, .48);
      fx.water(center, radius, 3.5);
      break;
    }

    case 'h00H': { // Đoạt Mệnh Xích là một phát bắn tỉa, không nảy mục tiêu.
      const target = hits[0];
      fx.motifTravel(from, target, 'sniper', 2.8, .19, () => {
        fx.flash(target, '#eee2c4', 2.5, .11);
        fx.ring(target, color, 1.8, .3);
        fx.motif(target, 'sniper', 3.2, .48);
        if (!fx.reduced) {
          fx.burst(target, '#d0b8a0', 8, 1.4);
        }
      });
      break;
    }

    case 'h00I': { // Nước Vong Xuyên nối tối đa bốn quái theo thứ tự server.
      let start = from;
      hits.slice(0, 4).forEach((hit, index) => {
        const origin = start.clone();
        const destination = hit.clone();
        fx.later(index * .16, () => {
          if (!fx.reduced && index) fx.beam(origin, destination, '#a6e4ec', .16, .45);
          fx.motifTravel(origin, destination, 'soul', index ? 2.0 : 2.5, .17, () => {
            fx.flash(destination, '#b9f2fc', 2.2, .12);
            fx.ring(destination, color, 1.9, .42);
            fx.motif(destination, 'soul', 2.8, .75);
            if (!fx.reduced) {
              fx.burst(destination, color, 6, 1.25);
            }
          }, .4);
        });
        start = hit;
      });
      break;
    }

    case 'h03O': { // Huyền khúc hồi máu ba đồng minh; hồi dư tạo Khiên Băng.
      fx.ring(from, color, radius * 2, .58);
      fx.motif(from, 'song', 3.4, .78);
      if (!fx.reduced) fx.smoke(from, '#9dd8ed', 3.2, .65);
      for (const [index, at] of hits.slice(0, 3).entries()) {
        fx.later(index * .07, () => {
          fx.motifTravel(from, at, 'song', 1.9, .22, () => {
            fx.flash(at, '#d2f4ff', 2.1, .13);
            fx.ring(at, color, 2.2, .45);
            fx.motif(at, 'song', 2.8, .78);
            if (!fx.reduced) fx.burst(at, '#c6b5ed', 6, 1.2);
          }, .35);
        });
      }
      break;
    }

    case 'h03P': { // Hạt giống nổ và cây ăn thịt được giữ bằng snapshot unit.
      fx.motifTravel(from, center, 'seed', 2.5, .25, () => {
        fx.flash(center, '#dcf6a2', 2.7, .14);
        fx.shockwave(center, color, radius, .58);
        fx.motif(center, 'bloom', 4.8, 1.0);
        if (!fx.reduced) {
          fx.smoke(center, '#446b35', 3.4, .72);
          fx.burst(center, '#b5e56b', 12, 2.8);
        }
      }, .5);
      break;
    }
  }

  return true;
}

/**
 * Authored attack / trait choreography for the twelve Tier Huyền heroes.
 * Gives ranged heroes vivid elemental projectiles (e.g. water orbs for Hà Bá)
 * and tailored impact feedback instead of generic white rings.
 */
export function paintTierAttack(fx: TierSkillPainter, event: GameEvent, from: Vector3, to: Vector3): boolean {
  const id = extractHeroIdFromSkill(event.skillId);
  const color = tierSkillColor(id);
  if (!color) return false;

  const dist = Vector3.Distance(from, to);
  const isRanged = dist > 2.5;
  const duration = Math.max(0.12, Math.min(0.32, dist / 26));

  switch (id) {
    case 'h00G': { // Hà Bá: Thủy Cầu Bắn Phóng & Thủy Ba Nổ Lan
      if (isRanged && !fx.reduced) {
        // Thủy cầu biển sâu bay lượn hình vòng cung từ Hà Bá tới mục tiêu
        fx.travel(from, to, '#0284c7', 2.0, 'circle_03', duration, () => {
          // Va chạm phát nổ Thủy Ba Chấn Kích
          fx.shockwave(to, '#0284c7', 2.5, 0.35); // Bán kính 2.5m nổ lan
          fx.water(to, 2.5, .65);
          fx.flash(to, '#38bdf8', 1.8, 0.14);
        }, { arcHeight: 0.35, spin: 8 });
      } else {
        // Cận chiến / splash phụ
        fx.shockwave(to, '#0284c7', 2.5, 0.32);
        fx.water(to, 2.5, .55);
      }
      break;
    }

    case 'h009': { // Kim Tra: Phi tiêu hoàng kim
      if (isRanged && !fx.reduced) {
        fx.travel(from, to, '#fbbf24', 1.8, 'trace_01', duration, () => {
          fx.flash(to, '#fef08a', 1.8, 0.12);
          fx.shockwave(to, color, 1.8, 0.3);
          fx.burst(to, '#fbbf24', 8, 1.5);
        }, { orient: true });
      } else {
        fx.shockwave(to, color, 1.8, 0.3);
        fx.burst(to, '#fbbf24', 6, 1.2);
      }
      break;
    }

    case 'h00A': { // Mộc Tra: Song kiếm trảm
      fx.image(to, color, 2.6, 0.25, 'slash_01');
      fx.motif(to, 'vines', 2.1, .38);
      fx.shockwave(to, '#059669', 1.8, 0.3);
      if (!fx.reduced) fx.burst(to, '#34d399', 6, 1.2);
      break;
    }

    case 'h00B': { // Thiết Phiến: Lốc cát bay
      if (isRanged && !fx.reduced) {
        fx.motifTravel(from, to, 'sand', 1.8, duration, () => {
          fx.shockwave(to, color, 2.2, 0.35);
          fx.motif(to, 'sand', 2.2, .45, true, 5);
          fx.burst(to, '#d97706', 8, 1.8);
          fx.smoke(to, '#92400e', 2.2, 0.4);
        });
      } else {
        fx.shockwave(to, color, 2.0, 0.3);
        fx.motif(to, 'sand', 2.2, .4, true, 5);
        fx.burst(to, '#d97706', 6, 1.2);
      }
      break;
    }

    case 'h00C': { // Hồng Hài Nhi: Chân hỏa thương
      fx.image(to, '#ea580c', 2.8, 0.25, 'slash_01');
      fx.motif(to, 'fire-sweep', 2.5, .36);
      fx.fire(to, 0);
      fx.burst(to, '#f97316', 8, 1.5);
      break;
    }

    case 'h00D': { // Phi kiếm Thuần Dương hành Hỏa, ánh kim là lớp phụ.
      if (isRanged && !fx.reduced) {
        fx.motifTravel(from, to, 'sword', 2.4, duration, () => {
          fx.flash(to, '#fde047', 2.0, 0.14);
          fx.shockwave(to, color, 2.2, 0.32);
          fx.burst(to, '#fbbf24', 10, 1.8);
        });
      } else {
        fx.shockwave(to, color, 2.0, 0.3);
        fx.burst(to, '#fbbf24', 6, 1.4);
      }
      break;
    }

    case 'h00E': { // Búa kim loại nện đất.
      fx.shockwave(to, color, 2.4, 0.35);
      fx.motif(to, 'hammer', 2.8, .42);
      fx.burst(to, '#ffe18c', 8, 1.6);
      fx.smoke(to, '#8a7a61', 2.2, 0.4);
      break;
    }

    case 'h00F': { // Sinh khí Mộc bọc cánh hoa.
      if (isRanged && !fx.reduced) {
        fx.motifTravel(from, to, 'flower', 1.8, duration, () => {
          fx.flash(to, '#fbcfe8', 1.8, 0.12);
          fx.shockwave(to, color, 1.8, 0.3);
          fx.burst(to, '#f472b6', 8, 1.4);
        }, .3);
      } else {
        fx.shockwave(to, color, 1.8, 0.3);
        fx.burst(to, '#f472b6', 6, 1.2);
      }
      break;
    }

    case 'h00H': { // Đường đạn hành Thổ pha âm phủ.
      if (isRanged && !fx.reduced) {
        fx.motifTravel(from, to, 'sniper', 2.2, duration, () => {
          fx.motif(to, 'sniper', 2.4, .32);
          fx.shockwave(to, color, 1.8, 0.3);
          fx.burst(to, '#8b5cf6', 8, 1.6);
        });
      } else {
        fx.shockwave(to, color, 1.8, 0.3);
        fx.burst(to, '#8b5cf6', 6, 1.2);
      }
      break;
    }

    case 'h00I': { // Mạnh Bà: Canh Vong Xuyên
      if (isRanged && !fx.reduced) {
        fx.motifTravel(from, to, 'soul', 2.0, duration, () => {
          fx.shockwave(to, color, 2.0, 0.35);
          fx.burst(to, '#06b6d4', 8, 1.5);
          fx.smoke(to, '#164e63', 2.0, 0.4);
        }, .4);
      } else {
        fx.shockwave(to, color, 1.8, 0.3);
        fx.burst(to, '#06b6d4', 6, 1.2);
      }
      break;
    }

    case 'h03O': { // Âm ba Thủy từ huyền cầm.
      if (isRanged && !fx.reduced) {
        fx.motifTravel(from, to, 'song', 2.0, duration, () => {
          fx.shockwave(to, color, 2.0, 0.35);
          fx.burst(to, '#c084fc', 8, 1.4);
          fx.smoke(to, '#581c87', 2.2, 0.45);
        });
      } else {
        fx.shockwave(to, color, 1.8, 0.3);
        fx.burst(to, '#c084fc', 6, 1.2);
      }
      break;
    }

    case 'h03P': { // Bảo Quả Tử: Bào tử gai độc
      if (isRanged && !fx.reduced) {
        fx.motifTravel(from, to, 'seed', 2.0, duration, () => {
          fx.shockwave(to, color, 2.2, 0.35);
          fx.burst(to, '#84cc16', 10, 1.8);
          fx.smoke(to, '#365314', 2.4, 0.45);
        }, .35);
      } else {
        fx.shockwave(to, color, 2.0, 0.3);
        fx.burst(to, '#84cc16', 6, 1.4);
      }
      break;
    }
  }

  return true;
}
