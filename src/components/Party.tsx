import { useEffect, useState } from 'react';
import { Socket } from "socket.io-client";
import { socket } from '../socket.ts';
import { useNavigate } from "react-router-dom";

const joinParty = (ID: string) => {
  socket.emit("join-party", ID);
}

const Party = () => {
  const navigate = useNavigate();
  const [partyCode, setPartyCode] = useState('');

  const handleJoin = () => {
    if (partyCode.trim()) {
      joinParty(partyCode);
    }
  };

  useEffect(() => {
    socket.on("join-party-result", (data: any) => {
      if (data.res == "no-party") {
        console.log("No party found!")
      }
      else if (data.res == "joined-party") {
        console.log("Joined party successfully");
        navigate("/workspace", {state: {partyData: data.pData}});
      }
      else if (data.res == "error") {
        console.log("Error in joining party or retrieving data");
      }
    })
  }, [socket])

  return (
    <>
    <div className="overflow-hidden flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-gray-100 to-gray-300 p-4">
      <div className="w-full max-w-md">
        <h2 className="text-center text-4xl font-medium tracking-tight text-gray-800 drop-shadow-sm mb-8">
          Enter Party Code
        </h2>
        
        <div className="bg-white rounded-lg shadow-lg p-6 space-y-4">
          <div className="space-y-2">
            <label htmlFor="partyCode" className="block text-sm font-medium text-gray-700">
              Party Code
            </label>
            <input
              id="partyCode"
              type="text"
              value={partyCode}
              onChange={(e) => setPartyCode(e.target.value)}
              placeholder="Enter your party code..."
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            />
          </div>
          
          <button
            onClick={handleJoin}
            disabled={!partyCode.trim()}
            className="w-full bg-primary hover:bg-accent-light disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-md transition-colors focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Join Party
          </button>
        </div>
      </div>
    </div>
    </>
  );
};

export default Party;