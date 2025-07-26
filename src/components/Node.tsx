import { useState } from "react";

interface NodeProps {
  id: number;
  label: number;
  posx: number;
  posy: number;
  size: number;
  onMouseDown?: () => void;
  showLabel: boolean;
  showID: boolean;
  setNodeHovered: React.Dispatch<React.SetStateAction<number | null>>;
}

const Node = ({ id, label, posx, posy, size, onMouseDown, showLabel, showID, setNodeHovered }: NodeProps) => {
  return (
    <>
      <div
        className="select-none cursor-pointer absolute border-4 text-black rounded-full shadow-md flex items-center justify-center flex-col"
        onMouseDown={onMouseDown}
        onMouseEnter={()=>{setNodeHovered(id)}}
        onMouseLeave={()=>{setNodeHovered(null)}}
        style={{
          left: posx - size / 2,
          top: posy - size / 2,
          width: size,
          height: size,
        }}
      >
        <span className="">{showLabel ? label : ""}</span>
        <span className="text-xs text-red-400">{showID ? id : ""}</span>
      </div>
    </>
  );
};

export default Node;
