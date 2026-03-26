const Modal = ({ isOpen, onClose, children }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-xl transition-all duration-200 ease-out"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
};

export default Modal;

