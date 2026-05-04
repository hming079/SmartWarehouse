const Toggle = ({ 
  checked = false, 
  onChange, 
  className = "",
  activeTrackColor = "bg-[#64f456]", // Default green
  inactiveTrackColor = "bg-gray-300",
  activeKnobColor = "bg-white",
  inactiveKnobColor = "bg-white"
}) => {
  return (
    <button
      type="button"
      onClick={onChange}
      className={`relative h-6 w-11 rounded-full transition-colors ${
        checked ? activeTrackColor : inactiveTrackColor
      } ${className}`.trim()}
    >
      <span
        className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full shadow transition-transform ${
          checked ? `translate-x-5 ${activeKnobColor}` : `translate-x-0.5 ${inactiveKnobColor}`
        }`}
      />
    </button>
  );
};

export default Toggle;

