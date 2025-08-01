import React from 'react'

import type {NodeData} from "./Graph";

interface EdgeProps {
    id: number;
    weight: number;
    start: NodeData;
    end: NodeData;
}

const Edge = ({start, end}:EdgeProps) => {
  return (
    <>
    <svg className="absolute top-0 left-0 w-full h-full -z-10">
      <line
      x1={start.x}
      y1={start.y}
      x2={end.x}
      y2={end.y}
      stroke="black"
      strokeLinecap="round"
      strokeWidth= "4"
      className="cursor-pointer pointer-events-auto"
      />
    </svg>
    </>
  )
}

export default Edge