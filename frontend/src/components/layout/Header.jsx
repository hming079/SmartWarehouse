const Header = ({ location, user }) => {
  return (
    <div className="mb-6 flex flex-col gap-4">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 items-center gap-3 rounded-full bg-gray-200 px-5 py-3 text-gray-500 lg:max-w-3xl">
          <span className="text-xl">⌕</span>
          <input
            type="text"
            placeholder="Search using keywords or name ..."
            className="w-full bg-transparent text-sm outline-none placeholder:text-gray-500"
          />
        </div>

        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-gradient-to-br from-yellow-300 to-pink-500" />
          <p className="font-medium text-gray-800">{user}</p>
          <span className="cursor-pointer text-xl text-black font-bold">⋮</span>
        </div>
      </header>

      <div className="text-right mt-2 mb-4">
        <p className="text-base font-bold leading-snug text-black">
          Địa điểm hiện tại:
          <br />
          {location}
        </p>
      </div>
    </div>
  );
};

export default Header;

