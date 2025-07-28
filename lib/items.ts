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
    case 1:
      return "Normal";
    case 2:
      return "Good";
    case 3:
      return "Outstanding";
    case 4:
      return "Excellent";
    case 5:
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
