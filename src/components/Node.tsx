import { useState } from "react";

interface NodeProps {
  id: number;
  label: number;
  posx: number;
  posy: number;
  size: number;
  distance: number;
  onMouseDown?: () => void;
  showLabel: boolean;
  showID: boolean;
  showDistance:boolean;
  isHighlighted: boolean;
  setNodeHovered: React.Dispatch<React.SetStateAction<number | null>>;
  setDragOffset: React.Dispatch<React.SetStateAction<{x: number, y: number}>>;
}

const Node = ({
  id,
  label,
  posx,
  posy,
  size,
  distance,
  onMouseDown,
  showLabel,
  showID,
  showDistance,
  setNodeHovered,
  setDragOffset,
  isHighlighted,
}: NodeProps) => {
  return (
    <>
    <span className="text-red-400" style={{position: "absolute", left: posx, top: posy - size / 2 - size / 2, transform: "translateX(-50%)", whiteSpace:"nowrap",}}>{showDistance ? distance : ""} </span>
      <div
        className={`select-none cursor-pointer bg-white absolute border-4 text-black rounded-full shadow-md flex items-center justify-center flex-col ${isHighlighted ? 'border-red-400' : ''}`}
        onMouseDown={(e) => {
          if (e.button === 0 && onMouseDown) {
            setDragOffset({x: e.clientX - posx, y: e.clientY - posy});
            onMouseDown();
          }
          if (e.button === 2) {
          }
        }}
        onContextMenu={(e) => {
          e.preventDefault();
        }}
        onMouseEnter={() => {
          setNodeHovered(id);
        }}
        onMouseLeave={() => {
          setNodeHovered(null);
        }}
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
