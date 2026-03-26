const Button = ({ children, className = "", ...props }) => {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-full bg-[#e5dbff] px-4 py-2 font-semibold text-[#2d0b5a] shadow ${className}`.trim()}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;

