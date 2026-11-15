import type { CSSProperties, ReactNode } from "react";

// Pictogram match moments, drawn as SVG and animated in globals.css ("Match moments").
// Original stick-figure style (no real players, kits or club marks).
// Coordinate space: 240 x 140, ground at y = 122. Transform origins are in SVG units.

export const SCENE_NAMES = [
  "goal",
  "header",
  "bicycle",
  "freekick",
  "save",
  "hattrick",
  "kneeslide",
  "tackle",
] as const;
export type SceneName = (typeof SCENE_NAMES)[number];

const W = 7; // limb stroke width
const at = (x: number, y: number): CSSProperties => ({ transformOrigin: `${x}px ${y}px` });

function Limb({ d }: { d: [number, number, number, number] }) {
  return <line x1={d[0]} y1={d[1]} x2={d[2]} y2={d[3]} />;
}

/** Ball with an off-centre panel, so spin reads. `spin` turns it during flight. */
function Ball({ x, y, r = 6, spin = false }: { x: number; y: number; r?: number; spin?: boolean }) {
  return (
    <g className={spin ? "m-spin" : undefined} style={spin ? at(x, y) : undefined}>
      <circle cx={x} cy={y} r={r} fill="var(--ball)" stroke="var(--ball-ink)" strokeWidth={1.4} />
      <circle cx={x + r * 0.32} cy={y - r * 0.18} r={r * 0.34} fill="var(--ball-ink)" />
      <circle cx={x - r * 0.45} cy={y + r * 0.42} r={r * 0.16} fill="var(--ball-ink)" />
    </g>
  );
}

function Goal() {
  const xs = [202, 208, 214, 220, 226];
  const ys = [74, 82, 90, 98, 106, 114];
  return (
    <g>
      <g className="m-net" style={at(234, 94)} stroke="var(--chalk-line)" strokeOpacity={0.35} strokeWidth={1}>
        {xs.map((x) => (
          <line key={x} x1={x} y1={66} x2={x} y2={122} />
        ))}
        {ys.map((y) => (
          <line key={y} x1={196} y1={y} x2={234} y2={y} />
        ))}
      </g>
      <path d="M196 122V64H234V122" fill="none" stroke="var(--chalk-line)" strokeWidth={3.5} strokeLinejoin="round" />
    </g>
  );
}

function Shout({ children, x = 112, size = 28 }: { children: ReactNode; x?: number; size?: number }) {
  return (
    <text
      x={x}
      y={34}
      textAnchor="middle"
      className="m-shout"
      style={at(x, 26)}
      fill="var(--flood-fill)"
      fontFamily="var(--font-barlow-condensed)"
      fontWeight={700}
      fontStyle="italic"
      fontSize={size}
    >
      {children}
    </text>
  );
}

function GoalScene() {
  return (
    <>
      <Goal />
      <g stroke="var(--chalk-line)" strokeWidth={W} strokeLinecap="round" fill="var(--chalk-line)">
        <circle cx={58} cy={52} r={7} stroke="none" />
        <Limb d={[56, 62, 50, 88]} />
        <g className="m-arms-down">
          <Limb d={[55, 66, 40, 78]} />
          <Limb d={[55, 66, 70, 74]} />
        </g>
        <g className="m-arms-up">
          <Limb d={[55, 66, 42, 46]} />
          <Limb d={[55, 66, 70, 46]} />
        </g>
        <Limb d={[50, 88, 42, 118]} />
        <g className="m-kick" style={at(50, 88)}>
          <Limb d={[50, 88, 54, 118]} />
        </g>
      </g>
      <g className="m-goal-ball-x">
        <g className="m-goal-ball-y">
          <Ball x={64} y={114} spin />
        </g>
      </g>
      <Shout>GOAL!</Shout>
    </>
  );
}

function SaveScene() {
  return (
    <>
      <Goal />
      <g className="m-keeper" style={at(214, 122)} stroke="var(--flood-fill)" strokeWidth={W} strokeLinecap="round" fill="var(--flood-fill)">
        <circle cx={214} cy={56} r={7} stroke="none" />
        <Limb d={[214, 65, 214, 92]} />
        <Limb d={[214, 70, 199, 58]} />
        <Limb d={[214, 70, 229, 58]} />
        <Limb d={[214, 92, 206, 120]} />
        <Limb d={[214, 92, 222, 120]} />
      </g>
      <g className="m-save-ball-x">
        <g className="m-save-ball-y">
          <Ball x={18} y={108} spin />
        </g>
      </g>
      <Shout x={100}>SAVED!</Shout>
    </>
  );
}

function HattrickScene() {
  const confetti = [
    [40, 20, "var(--flood-fill)", 0],
    [70, 8, "var(--chalk-line)", 120],
    [176, 14, "var(--flood-fill)", 60],
    [204, 26, "var(--chalk-line)", 200],
    [96, 6, "var(--chalk-line)", 260],
    [146, 4, "var(--flood-fill)", 160],
    [24, 40, "var(--chalk-line)", 320],
    [222, 46, "var(--flood-fill)", 380],
  ] as const;
  return (
    <>
      {confetti.map(([x, y, c, d], i) => (
        <rect
          key={i}
          x={x}
          y={y}
          width={5}
          height={8}
          rx={1}
          fill={c}
          className="m-confetti"
          style={{ ...at(x + 2.5, y + 4), animationDelay: `${d + 500}ms` }}
        />
      ))}
      {[
        [76, 30, 220],
        [120, 20, 640],
        [164, 30, 1060],
      ].map(([x, y, d]) => (
        <g key={x} className="m-pop" style={{ ...at(x, y), animationDelay: `${d}ms` }}>
          <Ball x={x} y={y} r={8} />
        </g>
      ))}
      <g className="m-jump" stroke="var(--chalk-line)" strokeWidth={W} strokeLinecap="round" fill="var(--chalk-line)">
        <circle cx={120} cy={58} r={7} stroke="none" />
        <Limb d={[120, 67, 120, 93]} />
        <Limb d={[120, 71, 104, 52]} />
        <Limb d={[120, 71, 136, 52]} />
        <Limb d={[120, 93, 110, 120]} />
        <Limb d={[120, 93, 130, 120]} />
      </g>
    </>
  );
}

function TackleScene() {
  return (
    <>
      <g className="m-attacker" style={at(70, 120)} stroke="var(--chalk-line)" strokeWidth={W} strokeLinecap="round" fill="var(--chalk-line)">
        <circle cx={75} cy={54} r={7} stroke="none" />
        <Limb d={[73, 63, 68, 90]} />
        <Limb d={[72, 69, 58, 80]} />
        <Limb d={[72, 69, 86, 74]} />
        <Limb d={[68, 90, 57, 118]} />
        <Limb d={[68, 90, 82, 115]} />
      </g>
      <g className="m-slider" stroke="var(--flood-fill)" strokeWidth={W} strokeLinecap="round" fill="var(--flood-fill)">
        <circle cx={198} cy={94} r={7} stroke="none" />
        <Limb d={[190, 99, 166, 108]} />
        <Limb d={[185, 101, 196, 117]} />
        <Limb d={[166, 108, 128, 116]} />
        <Limb d={[166, 108, 150, 120]} />
      </g>
      <g className="m-tackle-ball-x">
        <g className="m-tackle-ball-y">
          <Ball x={96} y={114} spin />
        </g>
      </g>
      <Shout x={128}>TACKLED!</Shout>
    </>
  );
}


/** Diving header: a cross comes in from the left, the striker meets it, it flies in. */
function HeaderScene() {
  return (
    <>
      <Goal />
      <g className="m-header-body" style={at(118, 120)} stroke="var(--chalk-line)" strokeWidth={W} strokeLinecap="round" fill="var(--chalk-line)">
        <circle cx={120} cy={56} r={7} stroke="none" />
        <Limb d={[118, 65, 114, 92]} />
        <Limb d={[117, 70, 102, 62]} />
        <Limb d={[117, 70, 132, 64]} />
        <Limb d={[114, 92, 104, 118]} />
        <Limb d={[114, 92, 124, 118]} />
      </g>
      <g className="m-header-ball-x">
        <g className="m-header-ball-y">
          <Ball x={124} y={36} spin />
        </g>
      </g>
      <Shout x={92}>HEADER!</Shout>
    </>
  );
}

/** Bicycle kick: the striker flips backwards and volleys the dropping ball in. */
function BicycleScene() {
  return (
    <>
      <Goal />
      <g className="m-bike-body" style={at(92, 96)} stroke="var(--chalk-line)" strokeWidth={W} strokeLinecap="round" fill="var(--chalk-line)">
        <circle cx={92} cy={56} r={7} stroke="none" />
        <Limb d={[92, 65, 92, 92]} />
        <Limb d={[92, 70, 78, 80]} />
        <Limb d={[92, 70, 106, 80]} />
        <Limb d={[92, 92, 84, 120]} />
        <g className="m-bike-leg" style={at(92, 92)}>
          <Limb d={[92, 92, 100, 120]} />
        </g>
      </g>
      <g className="m-bike-ball-x">
        <g className="m-bike-ball-y">
          <Ball x={92} y={40} spin />
        </g>
      </g>
      <Shout x={100} size={24}>
        BICYCLE KICK!
      </Shout>
    </>
  );
}

/** Free kick: curled over a three-man wall, dipping into the top corner. */
function FreekickScene() {
  return (
    <>
      <Goal />
      <g className="m-wall" stroke="var(--flood-fill)" strokeWidth={6} strokeLinecap="round" fill="var(--flood-fill)">
        {[136, 150, 164].map((x) => (
          <g key={x}>
            <circle cx={x} cy={70} r={6} stroke="none" />
            <Limb d={[x, 78, x, 100]} />
            <Limb d={[x, 100, x - 4, 120]} />
            <Limb d={[x, 100, x + 4, 120]} />
          </g>
        ))}
      </g>
      <g stroke="var(--chalk-line)" strokeWidth={W} strokeLinecap="round" fill="var(--chalk-line)">
        <circle cx={30} cy={54} r={7} stroke="none" />
        <Limb d={[30, 63, 28, 90]} />
        <Limb d={[29, 68, 16, 78]} />
        <Limb d={[29, 68, 42, 76]} />
        <Limb d={[28, 90, 20, 118]} />
        <g className="m-kick" style={at(28, 90)}>
          <Limb d={[28, 90, 34, 118]} />
        </g>
      </g>
      <g className="m-fk-ball-x">
        <g className="m-fk-ball-y">
          <Ball x={44} y={114} spin />
        </g>
      </g>
      <Shout x={100}>TOP BINS!</Shout>
    </>
  );
}

/** Knee slide: the scorer slides across the turf, arms wide, spray behind. */
function KneeslideScene() {
  return (
    <>
      {[0, 1, 2, 3, 4].map((i) => (
        <circle
          key={i}
          cx={60 + i * 10}
          cy={116 - (i % 2) * 5}
          r={2.6}
          fill="var(--chalk-line)"
          className="m-spray"
          style={{ ...at(60 + i * 10, 118), animationDelay: `${250 + i * 70}ms` }}
        />
      ))}
      <g className="m-slide" style={at(110, 120)} stroke="var(--chalk-line)" strokeWidth={W} strokeLinecap="round" fill="var(--chalk-line)">
        <circle cx={112} cy={62} r={7} stroke="none" />
        <Limb d={[111, 71, 108, 97]} />
        <Limb d={[110, 76, 90, 58]} />
        <Limb d={[110, 76, 132, 58]} />
        {/* Thigh forward to the knee, shin flat on the turf behind. */}
        <Limb d={[108, 97, 124, 116]} />
        <Limb d={[124, 116, 96, 117]} />
      </g>
      <Shout x={120} size={24}>
        ON THE RISE!
      </Shout>
    </>
  );
}

const SCENES: Record<SceneName, () => ReactNode> = {
  goal: GoalScene,
  header: HeaderScene,
  bicycle: BicycleScene,
  freekick: FreekickScene,
  save: SaveScene,
  hattrick: HattrickScene,
  kneeslide: KneeslideScene,
  tackle: TackleScene,
};

export function Scene({ name }: { name: SceneName }) {
  const Body = SCENES[name];
  return (
    <svg viewBox="0 0 240 140" className={`match-scene scene-${name} block h-auto w-full`} aria-hidden>
      {/* Turf: mown stripes and the goal line */}
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <rect key={i} x={i * 40} y={0} width={40} height={140} fill={i % 2 ? "var(--turf-2)" : "var(--turf)"} />
      ))}
      <line x1={0} y1={122} x2={240} y2={122} stroke="var(--chalk-line)" strokeOpacity={0.5} strokeWidth={2} />
      <Body />
    </svg>
  );
}
