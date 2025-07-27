export type ItemCategory =
  | "2H-weapon"
  | "1H-weapon"
  | "armors"
  | "bags"
  | "head"
  | "shoes"
  | "capes"
  | "offhands";

export function getQualityName(quality: number): string {
  switch (quality) {
    case 0:
      return "Normal";
    case 1:
      return "Good";
    case 2:
      return "Outstanding";
    case 3:
      return "Excellent";
    case 4:
      return "Masterpiece";
    default:
      return "Unknown";
  }
}

export function getEnchantmentName(enchantment: number): string {
  switch (enchantment) {
    case 0:
      return "Common";
    case 1:
      return "Uncommon";
    case 2:
      return "Rare";
    case 3:
      return "Exceptional";
    case 4:
      return "Pristine";
    default:
      return "Unknown";
  }
}
