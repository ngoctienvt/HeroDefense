import type { HeroVfx } from './visual-kit-hero.js';
import type { HeroVfxHost } from './visual-hero-adapter.js';
import type { VisualTuongThan } from './visual-tuong-than.js';

export interface MythModules {
  tuongThan: VisualTuongThan;
}

/** Legacy modules; Phượng Hoàng and Tướng Thần own their direct HeroVfx registrations. */
export function mythHeroes(m: MythModules, host: HeroVfxHost): HeroVfx[] {
  return [
    // Tướng Thần (h03Z) is a direct HeroVfx registered in VisualEffects (visual-tuong-than*.ts); nothing legacy is left here.
    // Hậu Nghệ (h017) is a direct HeroVfx registered in VisualEffects (visual-hau-nghe*.ts).
    // Khương Tử Nha (h019) is a direct HeroVfx registered in VisualEffects (visual-khuongtu-nha*.ts).
    // Kim Sí Đại Bằng (h016) is a direct HeroVfx registered in VisualEffects (visual-kimsi*.ts).
  ];
}
