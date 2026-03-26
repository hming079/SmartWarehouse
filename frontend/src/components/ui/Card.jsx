const Card = ({ children, className = "" }) => {
  return (
    <div className={`rounded-2xl bg-white p-4 shadow-lg ${className}`.trim()}>
      {children}
    </div>
  );
};

export default Card;

