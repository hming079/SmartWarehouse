import RuleRow from "./RuleRow";

const RuleTable = ({ rules }) => {
  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-lg">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-[#ece6f8] text-gray-700">
          <tr>
            {[
              "Rule name",
              "Áp dụng",
              "Loại thực phẩm",
              "Điều kiện",
              "Hành động",
              "Trạng thái",
              "Actions",
            ].map((heading) => (
              <th key={heading} className="px-4 py-3 font-semibold">
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rules.map((rule) => (
            <RuleRow key={rule.id} rule={rule} />
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default RuleTable;

