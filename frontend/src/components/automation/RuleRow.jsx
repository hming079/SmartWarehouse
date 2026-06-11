import { getFoodTypeDisplay } from "../../utils/foodTypes";
// const cardFoodTypeName = item.food_type_name || roomFoodTypeById[Number(item.room_id)] || "";
// const cardFoodTypeDisplay = getFoodTypeDisplay(cardFoodTypeName);
const getConditionColor = (condition) => {
  if (!condition) return 'text-gray-700'; // Màu mặc định nếu chuỗi rỗng
  
  const lowerCondition = condition.toLowerCase();
  
  if (lowerCondition.includes('temperature')) {
    return 'text-orange-500'; // Màu cam cho temperature
  }
  if (lowerCondition.includes('humidity')) {
    return 'text-blue-500'; // Màu xanh (blue/cyan) cho humidity
  }
  
  return 'text-gray-700'; // Màu mặc định nếu không khớp từ khóa nào
};
const RuleRow = ({ rule, onDelete, onToggle, onEdit }) => {
  return (
    <tr className="border-b border-purple-100 last:border-b-0">
      <td className="px-4 py-4 font-semibold text-[#24124d]">{rule.name}</td>
      <td className="px-4 py-4 text-gray-700">{rule.applyTo}</td>
      <td className="px-4 py-4 text-gray-700">{rule.foodType} {getFoodTypeDisplay(rule.foodType).icon}</td>
      <td className={`px-4 py-4 ${getConditionColor(rule.condition)}`}>
        {rule.condition}
      </td>
      <td className="px-4 py-4 text-gray-700">{rule.action}</td>
      <td className="px-4 py-4 text-gray-700">
        {rule.devices && rule.devices.length > 0 ? rule.devices.join(", ") : "--"}
      </td>
      <td className={`px-4 py-4 font-medium ${
          rule.alertLevel === 'High' ? 'text-red-600' :
          rule.alertLevel === 'Medium' ? 'text-amber-500' :
          rule.alertLevel === 'Low' ? 'text-green-600' : 'text-gray-700'
        }`}>
          {rule.alertLevel || "--"}
        </td>
      <td className="px-4 py-4">
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            rule.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
          }`}
        >
          {rule.active ? "Bật" : "Tắt"}
        </span>
      </td>
      <td className="px-4 py-4">
        <div className="flex items-center gap-2">
          <button
            className="rounded-lg border border-amber-500 px-3 py-1 text-sm font-medium text-amber-600 hover:bg-amber-50"
            onClick={() => onEdit?.(rule)}
          >
            Edit
          </button>
          <button
            className="rounded-lg border border-blue-500 px-3 py-1 text-sm font-medium text-blue-600 hover:bg-blue-50"
            onClick={() => onToggle?.(rule.id)}
          >
            {rule.active ? "Tắt" : "Bật"}
          </button>
          <button
            className="rounded-lg bg-red-500 px-3 py-1 text-sm font-medium text-white hover:bg-red-600"
            onClick={() => onDelete?.(rule.id)}
          >
            Delete
          </button>
        </div>
      </td>
    </tr>
  );
};

export default RuleRow;

