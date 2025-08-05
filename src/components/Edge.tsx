import React from 'react'
import { useState , useRef, useEffect } from 'react';
import type {NodeData} from '../types';

interface EdgeProps {
    id: number;
    weight: number;
    weightSize: number;
    start: NodeData;
    end: NodeData;
    edgeIndex: number;
    edgeGroupNumber: number;
    setEdgeHovered: React.Dispatch<React.SetStateAction<number | null>>;
    isDirected: boolean;
    isWeighted: boolean;
    nodeRadius: number;
    changeWeight: (id: number, newWeight: number) => void;
}

const Edge = ({id, weight, weightSize, start, end, edgeIndex, edgeGroupNumber, setEdgeHovered, isDirected, isWeighted, nodeRadius, changeWeight} : EdgeProps) => {
  
  //calculate the distance between start and ending node
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.sqrt(dx * dx + dy * dy);
  const offset = (isDirected ? nodeRadius / 2 : 1);

  //normalize
  const unitX = dx / length;
  const unitY = dy / length;

  //make sure we are not going into the node
  const x1 = start.x + unitX * offset;
  const y1 = start.y + unitY * offset;
  const x2 = end.x - unitX * offset;
  const y2 = end.y - unitY * offset;

  //make sure edge connections are not independent
  const direction = start.id < end.id ? 1: -1;

  const curveOffset = nodeRadius * 2;
  const edgeShift = (edgeIndex - (edgeGroupNumber - 1) / 2) * curveOffset;
  const curveX = (x1 + x2) / 2 - unitY * edgeShift * direction;
  const curveY = (y1 + y2) / 2 + unitX * edgeShift * direction;

  const markerID = `arrow-${id}`;

  const [editing, setEditing] = useState(false);
  const [editingWeight, setEditingWeight] = useState<number | null> (null);
  const [inputString, setInputString] = useState<string>("");

  const inputRef = useRef<HTMLInputElement>(null);
  const labelX = (x1 + x2 + 2 * curveX) / 4;
  const labelY = (y1 + y2 + 2 * curveY) / 4;

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing])
  
  return (
    <>
    <svg className="absolute top-0 left-0 w-full h-full pointer-events-none z-0"         
       onMouseEnter={() => setEdgeHovered(id)}
       onMouseLeave={() => setEdgeHovered(null)}>
      <defs>
        <marker
          id={markerID}
          markerWidth="10"
          markerHeight="10"
          refX="10"
          refY="5"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path d="M0,0 L10,5 L0,10 Z" fill="black" />
        </marker>
      </defs>
      <path
        d={`M ${x1} ${y1} Q ${curveX} ${curveY} ${x2} ${y2}`}
        stroke="black"
        strokeWidth="3"
        fill="none"
        markerEnd={isDirected ? `url(#${markerID})` : undefined}
        className="cursor-pointer pointer-events-auto"
      />
      {isWeighted && !editing && 
      <text
        x={labelX - unitY * 1}
        y={labelY - unitX * 1}
        fill="black"
        fontSize={weightSize}
        textAnchor="middle"
        alignmentBaseline="middle"
        pointerEvents="auto"
        className = "cursor-pointer"
        paintOrder="stroke"
        stroke="white"
        strokeWidth="4"
        onClick={() => setEditing(true)}
      > {weight}  
      </text>}
      {isWeighted && editing && 
      <foreignObject
        x = {labelX - unitY * 0}
        y = {labelY - unitX * 0}
        width={Math.max(weightSize, 40)}
        height={Math.max(weightSize, 40)}
        pointerEvents="auto"
        >
          <input 
          ref = {inputRef}
            type="number" 
            value={inputString}
            className="w-full h-full text-center border rounded text-xs bg-white"
            onChange={(e) => {
              setInputString(e.target.value);
            }
            }
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                setEditing(false);
                const inputNumber = Number(inputString);
                if (!isNaN(inputNumber)) {
                  changeWeight(id, inputNumber);
                  setInputString("");
                }
              }
            }}
            onBlur={() => {
              setEditing(false);
              const inputNumber = Number(inputString);
              if (!isNaN(inputNumber) && inputString != "") {
                changeWeight(id, inputNumber)
                setInputString("");
              }
            }}
          />
        
        
      </foreignObject>}
    </svg>
    </>
  )
}

export default Edge