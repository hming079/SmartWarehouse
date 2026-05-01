const inputClass =
  "mt-2 w-full rounded-xl border border-purple-200 bg-white px-3 py-2 text-sm outline-none focus:border-purple-400";

const RuleForm = ({ form, setForm, onCancel, onSave, zoneOptions = [], deviceOptions = [], deviceTypeOptions = [], isEditing = false }) => {
  const handleChange = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const handleSave = () => onSave?.(form);

  const selectedType = form.actionDeviceType || "fan";
  const filteredDevices = deviceOptions.filter((d) => String(d.type || "").toLowerCase() === String(selectedType).toLowerCase());

  return (
    <div>
      <h3 className="mb-4 text-xl font-bold text-[#24124d]">{isEditing ? "Edit automation rule" : "New automation rule"}</h3>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <label className="text-sm font-medium text-gray-700">Rule name
          <input className={inputClass} value={form.name} onChange={(e) => handleChange("name", e.target.value)} placeholder="Nhập tên rule" />
        </label>

        <label className="text-sm font-medium text-gray-700">Apply by
          <select className={inputClass} value={form.applyTo} onChange={(e) => handleChange("applyTo", e.target.value)}>
            {zoneOptions.length === 0 ? <option value="">Chưa có khu vực</option> : zoneOptions.map((zone) => <option key={zone.zone_id} value={zone.name}>{zone.name}</option>)}
          </select>
        </label>

        <label className="text-sm font-medium text-gray-700">Metric
          <select className={inputClass} value={form.metric} onChange={(e) => handleChange("metric", e.target.value)}><option>Temperature</option><option>Humidity</option></select>
        </label>

        <label className="text-sm font-medium text-gray-700">Compare
          <select className={inputClass} value={form.compare} onChange={(e) => handleChange("compare", e.target.value)}><option>Lớn hơn</option><option>Nhỏ hơn</option><option>Bằng</option></select>
        </label>

        <label className="text-sm font-medium text-gray-700">Value
          <input className={inputClass} value={form.value} onChange={(e) => handleChange("value", e.target.value)} placeholder="Ví dụ: 30" />
        </label>

        <label className="text-sm font-medium text-gray-700">Alert level
          <select className={inputClass} value={form.alertLevel} onChange={(e) => handleChange("alertLevel", e.target.value)}><option>Low</option><option>Medium</option><option>High</option></select>
        </label>

        <label className="text-sm font-medium text-gray-700 md:col-span-2">Action type
          <select className={inputClass} value={form.actionType || "action"} onChange={(e) => handleChange("actionType", e.target.value)}><option value="action">Kích hoạt thiết bị</option><option value="alert">Chỉ cảnh báo</option></select>
        </label>

        {form.actionType !== "alert" && (
          <>
            <label className="text-sm font-medium text-gray-700">Action
              <select className={inputClass} value={form.actionOnOff || "on"} onChange={(e) => handleChange("actionOnOff", e.target.value)}><option value="on">Bật (Turn on)</option><option value="off">Tắt (Turn off)</option></select>
            </label>

            <label className="text-sm font-medium text-gray-700">Device type
              <select className={inputClass} value={form.actionDeviceType || "fan"} onChange={(e) => handleChange("actionDeviceType", e.target.value)}>
                {(deviceTypeOptions.length ? deviceTypeOptions : ["fan"]).map((type) => <option key={type} value={type}>{type}</option>)}
              </select>
            </label>

            <label className="text-sm font-medium text-gray-700 md:col-span-2">Devices
              <select multiple className={`${inputClass} h-28`} value={form.actionDeviceIds || []} onChange={(e) => handleChange("actionDeviceIds", Array.from(e.target.selectedOptions).map((opt) => opt.value))}>
                {filteredDevices.map((device) => <option key={device.deviceId || device.id} value={String(device.deviceId || device.id)}>{device.name} (ID: {device.deviceId || device.id})</option>)}
              </select>
              <span className="mt-1 block text-xs text-gray-500">(Giữ Ctrl/Command để chọn nhiều thiết bị)</span>
            </label>
          </>
        )}

        <label className="mt-8 flex items-center gap-2 text-sm font-medium text-gray-700">
          <input type="checkbox" checked={form.active} onChange={(e) => handleChange("active", e.target.checked)} /> Active
        </label>
      </div>

      <div className="mt-6 flex justify-end gap-3">
        <button type="button" onClick={onCancel} className="rounded-xl bg-red-500 px-5 py-2 font-semibold text-white hover:bg-red-600">Cancel</button>
        <button type="button" onClick={handleSave} className="rounded-xl bg-green-500 px-5 py-2 font-semibold text-white hover:bg-green-600">{isEditing ? "Save changes" : "Save"}</button>
      </div>
    </div>
  );
};

export default RuleForm;

