import { useNavigate } from 'react-router-dom'


const Menu = () => {
    const navigate = useNavigate();
  return (
    <>
    <div className= "flex flex-col h-screen ">
    <div className="navBar bg-gray-300 flex w-full h-16 items-center justify-end px-4 ">
        <button className="transition bg-black text-white p-2 rounded mr-2 hover:bg-gray-400 ease-in">Login / Join</button>
    </div>
    <div className ="flex h-full flex-col items-center justify-center space-y-4">
        <h1 className = "text-4xl font-bold">Graphical.io</h1>
        <button onClick={() => navigate('/workspace')}className="transition hover:-translate-y-1 ease-in duration-250 hover:text-gray-400">Create Workspace</button>
        <button onClick={() => navigate('/joinparty')}className="transition hover:-translate-y-1 ease-in duration-250 hover:text-gray-400">Join a Party</button>
    </div>
    </div>
    </>
  )
}

export default Menu