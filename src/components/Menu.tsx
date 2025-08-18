import { useNavigate } from "react-router-dom";

const Menu = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-gray-100 to-gray-300">
      <div className="bg-gray-800 text-white flex w-full h-16 items-center justify-end px-6 shadow-md">
      </div>

      <div className="flex flex-col h-full items-center justify-center space-y-6 text-center">
        <h1 className="text-6xl font-extrabold tracking-tight text-gray-800 drop-shadow">
          Graphical
        </h1>
        <p className="text-gray-600 text-lg max-w-lg">
          Lightweight CS Graph Maker
        </p>

        <div className="flex flex-col space-y-4 w-56">
          <button
            onClick={() => navigate("/workspace")}
            className="transition transform hover:-translate-y-1 ease-in-out duration-200 
                       bg-primary hover:bg-accent-light text-white px-4 py-3 rounded-lg font-medium shadow hover:shadow-lg"
          >
            Create Workspace
          </button>
          <button
            onClick={() => navigate("/joinparty")}
            className="transition transform hover:-translate-y-1 ease-in-out duration-200 border hover:text-primary
                        px-4 py-3 rounded-lg font-medium shadow hover:shadow-lg"
          >
            Join a Party
          </button>
        </div>
      </div>
    </div>
  );
};

export default Menu;