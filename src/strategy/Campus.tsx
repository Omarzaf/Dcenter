import { useState } from "react";
import type { AssetType } from "./model.ts";
import { ASSETS } from "./content.ts";

const COLORS: Record<AssetType, [string, string, string]> = {
  compute: ["#e5e8e5", "#8b999d", "#465a64"],
  cooling: ["#9fc9c4", "#528b88", "#326566"],
  power: ["#eab079", "#b77543", "#785335"],
  network: ["#b5bdd8", "#7985a6", "#505d7c"],
  battery: ["#ced398", "#8d965c", "#5a6741"],
  recycling: ["#add1b1", "#649977", "#3d6f54"],
};

function Building({ kind, x, y }: { kind: AssetType; x: number; y: number }) {
  const [top, left, right] = COLORS[kind];
  const tall = kind === "compute" ? 47 : kind === "power" ? 29 : 20;
  return (
    <g pointerEvents="none">
      <ellipse
        cx={x + 5}
        cy={y + 9}
        rx="34"
        ry="16"
        fill="#020b10"
        opacity=".35"
      />
      <polygon
        points={`${x - 27},${y - tall} ${x},${y - tall - 15} ${x + 27},${y - tall} ${x},${y - tall + 15}`}
        fill={top}
      />
      <polygon
        points={`${x - 27},${y - tall} ${x},${y - tall + 15} ${x},${y + 15} ${x - 27},${y}`}
        fill={left}
      />
      <polygon
        points={`${x},${y - tall + 15} ${x + 27},${y - tall} ${x + 27},${y} ${x},${y + 15}`}
        fill={right}
      />
      {kind === "compute" &&
        [0, 1, 2, 3].map((n) => (
          <g key={n}>
            <path
              d={`M ${x + 5} ${y - 25 + n * 9} l 17 -9`}
              stroke="#263b45"
              strokeWidth="4"
            />
            <path
              d={`M ${x + 7} ${y - 25 + n * 9} l 3 -1.5`}
              stroke="#9befbb"
              strokeWidth="2"
            />
            <path
              d={`M ${x - 22} ${y - 36 + n * 9} l 16 9`}
              stroke="#657c82"
              strokeWidth="2"
            />
          </g>
        ))}
      {kind === "cooling" && (
        <g stroke="#487b79" fill="none" strokeWidth="2">
          <ellipse cx={x} cy={y - tall} rx="15" ry="8" />
          <path
            d={`M ${x - 10} ${y - tall - 4} l 20 8 m -20 0 l 20 -8 m -10 -3 v 14`}
          />
        </g>
      )}
      {kind === "power" && (
        <path
          d={`M ${x - 1} ${y - tall - 7} l -8 8 h 7 l -1 7 l 10 -9 h -8 z`}
          fill="#926038"
        />
      )}
      {kind === "network" && (
        <g stroke="#62739f" strokeWidth="2">
          <path d={`M ${x - 12} ${y - tall - 1} l 18 -10 m -11 14 l 18 -10`} />
          <circle cx={x + 17} cy={y - 8} r="2" fill="#91cceb" />
        </g>
      )}
      {kind === "battery" && (
        <path
          d={`M ${x - 10} ${y - tall - 3} l 10 -5 l 12 7 l -10 5 z`}
          fill="none"
          stroke="#7b8646"
          strokeWidth="2"
        />
      )}
      {kind === "recycling" && (
        <ellipse
          cx={x}
          cy={y - tall}
          rx="15"
          ry="8"
          fill="#7db492"
          stroke="#ccebd3"
          strokeWidth="2"
        />
      )}
    </g>
  );
}

export function Campus({
  board,
  selected,
  onPlace,
  editable,
}: {
  board: (AssetType | null)[];
  selected: AssetType | null;
  onPlace: (index: number) => void;
  editable: boolean;
}) {
  const [focus, setFocus] = useState(14);
  const [listView, setListView] = useState(false);
  return (
    <div className="campus-visual">
      <div className="map-coordinates">
        <span>SECTOR 01 / MAIN CAMPUS</span>
        <span>36 BUILDABLE LOTS</span>
      </div>
      <div className="map-view-controls">
        <button aria-pressed={!listView} onClick={() => setListView(false)}>
          Isometric map
        </button>
        <button aria-pressed={listView} onClick={() => setListView(true)}>
          Large touch grid
        </button>
      </div>
      {listView ? (
        <div
          className="touch-campus"
          role="group"
          aria-label="Large campus construction targets"
        >
          {board.map((kind, index) => (
            <button
              key={index}
              className={kind ? `touch-lot ${kind}` : "touch-lot"}
              disabled={!editable && !kind}
              aria-label={`Lot ${String.fromCharCode(65 + Math.floor(index / 6))}${(index % 6) + 1}: ${kind ? ASSETS[kind].name : "empty"}${!kind && selected ? `; build ${ASSETS[selected].name}` : ""}`}
              onClick={() => onPlace(index)}
            >
              <span>
                {String.fromCharCode(65 + Math.floor(index / 6))}
                {(index % 6) + 1}
              </span>
              <strong>{kind ? ASSETS[kind].short : "+"}</strong>
            </button>
          ))}
        </div>
      ) : (
        <svg
          className="campus-map"
          viewBox="0 0 680 450"
          role="group"
          aria-label="Campus construction map. Arrow keys move between lots. Enter builds the selected module."
        >
          <defs>
            <pattern
              id="map-dots"
              width="18"
              height="18"
              patternUnits="userSpaceOnUse"
            >
              <circle cx="2" cy="2" r=".7" fill="#78969b" opacity=".2" />
            </pattern>
            <linearGradient id="map-floor" x1="0" y1="0" x2="1" y2="1">
              <stop stopColor="#21343d" />
              <stop offset="1" stopColor="#14262e" />
            </linearGradient>
          </defs>
          <rect width="680" height="450" fill="url(#map-dots)" />
          <g fill="none" stroke="#45636c" strokeWidth="1" opacity=".5">
            <path d="M 40 64 V 40 H 80 M 600 40 H 640 V 64 M 40 385 V 410 H 80 M 600 410 H 640 V 385" />
            <path d="M 325 32 h 30 m -15 -15 v 30 M 325 425 h 30 m -15 -15 v 30" />
          </g>
          <polygon
            points="340,76 614,228 614,246 340,403 66,248 66,230"
            fill="#0b1920"
            stroke="#39515a"
          />
          <polygon
            points="340,73 614,228 340,383 66,228"
            fill="url(#map-floor)"
            stroke="#42606b"
          />
          {board.map((kind, index) => {
            const row = Math.floor(index / 6),
              col = index % 6;
            const x = 340 + (col - row) * 43,
              y = 103 + (col + row) * 24;
            return (
              <g
                key={index}
                role="button"
                tabIndex={focus === index ? 0 : -1}
                className={`campus-lot ${kind ? "occupied" : ""} ${editable && selected && !kind ? "buildable" : ""}`}
                aria-label={`Lot ${String.fromCharCode(65 + row)}${col + 1}: ${kind ? ASSETS[kind].name : "empty"}${!kind && editable && selected ? `; build ${ASSETS[selected].name}` : ""}`}
                aria-disabled={!editable || !!kind || !selected}
                onFocus={() => setFocus(index)}
                onClick={() => onPlace(index)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onPlace(index);
                  }
                  const delta: Record<string, number> = {
                    ArrowRight: 1,
                    ArrowLeft: -1,
                    ArrowDown: 6,
                    ArrowUp: -6,
                  };
                  if (event.key in delta) {
                    event.preventDefault();
                    const next = Math.max(
                      0,
                      Math.min(35, index + delta[event.key]),
                    );
                    setFocus(next);
                    const lots =
                      event.currentTarget.parentElement?.querySelectorAll<SVGGElement>(
                        ".campus-lot",
                      );
                    lots?.[next]?.focus();
                  }
                }}
              >
                <polygon
                  className="lot-base"
                  points={`${x},${y - 22} ${x + 40},${y} ${x},${y + 22} ${x - 40},${y}`}
                  fill={kind ? "#29404a" : "#1b3039"}
                  stroke="#3a535d"
                  strokeWidth=".8"
                />
                {!kind && (
                  <path
                    className="lot-cross"
                    d={`M ${x - 5} ${y - 3} l 10 6 m -10 0 l 10 -6`}
                    stroke="#55717b"
                    strokeWidth="1"
                    pointerEvents="none"
                  />
                )}
                {kind && <Building kind={kind} x={x} y={y} />}
              </g>
            );
          })}
          <g fontFamily="ui-monospace, monospace" fontSize="9" fill="#8ca4ad">
            <text x="77" y="315" transform="rotate(30 77 315)">
              UTILITY CORRIDOR
            </text>
            <text x="471" y="334" transform="rotate(-30 471 334)">
              EXPANSION RESERVE
            </text>
            <text x="595" y="75">
              N
            </text>
            <path
              d="M 599 83 v 25 m -4 -18 l 4 -7 l 4 7"
              fill="none"
              stroke="#8ca4ad"
            />
          </g>
        </svg>
      )}
      <div className="map-legend">
        <span>
          <i style={{ background: "#c6d1d6" }} /> Compute
        </span>
        <span>
          <i style={{ background: "#78aaa6" }} /> Cooling
        </span>
        <span>
          <i style={{ background: "#dda36f" }} /> Energy
        </span>
        <span>
          <i style={{ background: "#9da8cd" }} /> Network
        </span>
      </div>
    </div>
  );
}
