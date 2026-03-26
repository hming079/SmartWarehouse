const Header = ({ location, user }) => {
  return (
    <header className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-1 items-center gap-3 rounded-full bg-gray-200 px-5 py-3 text-gray-500">
        <span className="text-xl">⌕</span>
        <input
          type="text"
          placeholder="Search using keywords or name ..."
          className="w-full bg-transparent text-sm outline-none placeholder:text-gray-500"
        />
      </div>

      <div className="flex items-center gap-4">
        <div className="h-12 w-12 rounded-full bg-gradient-to-br from-yellow-300 to-pink-500" />
        <div>
          <p className="font-semibold text-gray-800">{user}</p>
          <p className="text-sm font-bold leading-tight text-gray-900">
            Địa điểm hiện tại:
            <br />
            {location}
          </p>
        </div>
        <span className="text-xl text-gray-600">⋮</span>
      </div>
    </header>
  );
};

export default Header;

