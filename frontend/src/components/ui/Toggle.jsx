const Toggle = ({ checked = false, onChange, className = "" }) => {
  return (
    <button
      type="button"
      onClick={onChange}
      className={`relative h-6 w-11 rounded-full transition-colors ${
        checked ? "bg-lime-400" : "bg-gray-300"
      } ${className}`.trim()}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-5" : "translate-x-0.5"
        }`}
      />
    </button>
  );
};

export default Toggle;

