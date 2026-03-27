const inputClass =
  "mt-2 w-full rounded-xl border border-purple-200 bg-white px-3 py-2 text-sm outline-none focus:border-purple-400";

const RuleForm = ({ form, setForm, onCancel, onSave, zoneOptions = [] }) => {
  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    onSave?.(form);
  };

  return (
    <div>
      <h3 className="mb-4 text-xl font-bold text-[#24124d]">New automation rule</h3>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <label className="text-sm font-medium text-gray-700">
          Rule name
          <input
            className={inputClass}
            value={form.name}
            onChange={(e) => handleChange("name", e.target.value)}
            placeholder="Nhập tên rule"
          />
        </label>

        <label className="text-sm font-medium text-gray-700">
          Apply by
          <select
            className={inputClass}
            value={form.applyTo}
            onChange={(e) => handleChange("applyTo", e.target.value)}
          >
            {zoneOptions.length === 0 ? (
              <option value="">Chưa có khu vực</option>
            ) : (
              zoneOptions.map((zone) => (
                <option key={zone.zone_id} value={zone.name}>
                  {zone.name}
                </option>
              ))
            )}
          </select>
        </label>

        <label className="text-sm font-medium text-gray-700">
          Metric
          <select
            className={inputClass}
            value={form.metric}
            onChange={(e) => handleChange("metric", e.target.value)}
          >
            <option>Temperature</option>
            <option>Humidity</option>
          </select>
        </label>

        <label className="text-sm font-medium text-gray-700">
          Compare
          <select
            className={inputClass}
            value={form.compare}
            onChange={(e) => handleChange("compare", e.target.value)}
          >
            <option>Lớn hơn</option>
            <option>Nhỏ hơn</option>
            <option>Bằng</option>
          </select>
        </label>

        <label className="text-sm font-medium text-gray-700">
          Value
          <input
            className={inputClass}
            value={form.value}
            onChange={(e) => handleChange("value", e.target.value)}
            placeholder="Ví dụ: 30"
          />
        </label>

        <label className="text-sm font-medium text-gray-700">
          Action
          <select
            className={inputClass}
            value={form.action}
            onChange={(e) => handleChange("action", e.target.value)}
          >
            <option>Bật máy lạnh</option>
            <option>Bật tạo độ ẩm</option>
          </select>
        </label>

        <label className="text-sm font-medium text-gray-700">
          Alert level
          <select
            className={inputClass}
            value={form.alertLevel}
            onChange={(e) => handleChange("alertLevel", e.target.value)}
          >
            <option>Low</option>
            <option>Medium</option>
            <option>High</option>
          </select>
        </label>

        <label className="mt-8 flex items-center gap-2 text-sm font-medium text-gray-700">
          <input
            type="checkbox"
            checked={form.active}
            onChange={(e) => handleChange("active", e.target.checked)}
          />
          Active
        </label>
      </div>

      <div className="mt-6 flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl bg-red-500 px-5 py-2 font-semibold text-white hover:bg-red-600"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          className="rounded-xl bg-green-500 px-5 py-2 font-semibold text-white hover:bg-green-600"
        >
          Save
        </button>
      </div>
    </div>
  );
};

export default RuleForm;

