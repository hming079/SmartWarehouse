const FOOD_TYPE_ICON_RULES = [
  { match: ["thịt bò", "thit bo", "beef", "bò", "bo"], icon: "🥩" },
  { match: ["gia cầm", "gia cam", "poultry", "gà", "ga", "duck", "vịt", "vit"], icon: "🍗" },
  { match: ["rau", "vegetable", "vegetables", "củ quả", "cu qua"], icon: "🥦" },
  { match: ["hải sản", "hai san", "seafood", "fish", "cá", "ca"], icon: "🐟" },
  { match: ["sữa", "sua", "dairy", "milk", "yogurt", "sữa chua", "sua chua"], icon: "🥛" },
  { match: ["trái cây", "trai cay", "fruit", "fruits"], icon: "🍎" },
  { match: ["nước", "nuoc", "đồ uống", "do uong", "beverage", "drinks", "drink"], icon: "🥤" },
  { match: ["khô", "kho", "dry", "dry goods", "hàng khô", "hang kho"], icon: "📦" },
];

export function getFoodTypeIcon(foodTypeName) {
  const normalized = String(foodTypeName || "").toLowerCase();
  const rule = FOOD_TYPE_ICON_RULES.find((item) => item.match.some((keyword) => normalized.includes(keyword)));
  return rule?.icon || "🍽️";
}

export function getFoodTypeDisplay(foodTypeName) {
  return {
    icon: getFoodTypeIcon(foodTypeName),
    label: foodTypeName || "Loại thực phẩm",
  };
}