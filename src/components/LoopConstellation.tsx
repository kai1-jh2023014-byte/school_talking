import type { LoopEdge, LoopNode, QuestionLoop } from "@/lib/loop-graph";

const KIND_MARK: Record<LoopNode["kind"], string> = {
  question: "問",
  teacher: "先",
  prompt: "確",
  response: "答",
  followup: "再",
  related: "関",
  action: "対",
};

export function layoutLoop(
  loop: QuestionLoop,
  origin: { x: number; y: number },
): Record<string, { x: number; y: number }> {
  const seats: Record<string, { x: number; y: number }> = {};
  const buckets: Record<LoopNode["kind"], LoopNode[]> = {
    question: [],
    teacher: [],
    prompt: [],
    response: [],
    followup: [],
    related: [],
    action: [],
  };
  loop.nodes.forEach((node) => buckets[node.kind].push(node));

  const place = (nodes: LoopNode[], x: number, y: number, gap: number) => {
    nodes.forEach((node, index) => {
      seats[node.id] = { x: origin.x + x, y: origin.y + y + index * gap };
    });
  };

  place(buckets.question, 0, 0, 0);
  place(buckets.teacher, 118, -62, 36);
  place(buckets.prompt, 118, 18, 52);
  place(buckets.response, 236, 18, 44);
  place(buckets.action, 118, -118, 40);
  place(buckets.followup, 236, -70, 40);
  place(buckets.related, -12, 88, 42);
  return seats;
}

export function LoopConstellation({
  loop,
  origin,
  onPick,
}: {
  loop: QuestionLoop;
  origin: { x: number; y: number };
  onPick: (node: LoopNode) => void;
}) {
  const seats = layoutLoop(loop, origin);
  return (
    <g className="universe-loop" aria-label="この質問からつながる問い">
      {loop.edges.map((edge) => {
        const from = seats[edge.from];
        const to = seats[edge.to];
        if (!from || !to) return null;
        return <LoopEdgeLine key={`${edge.from}-${edge.to}-${edge.label}`} edge={edge} from={from} to={to} />;
      })}
      {loop.nodes.map((node) => {
        const seat = seats[node.id];
        if (!seat) return null;
        return <LoopNodeMark key={node.id} node={node} x={seat.x} y={seat.y} onPick={onPick} />;
      })}
    </g>
  );
}

function LoopEdgeLine({
  edge,
  from,
  to,
}: {
  edge: LoopEdge;
  from: { x: number; y: number };
  to: { x: number; y: number };
}) {
  const mx = (from.x + to.x) / 2;
  const my = (from.y + to.y) / 2;
  return (
    <g>
      <line
        className="universe-loop-edge"
        x1={from.x}
        y1={from.y}
        x2={to.x}
        y2={to.y}
        stroke="#e6dcc8"
        strokeOpacity="0.55"
        strokeWidth="1.2"
      />
      <text x={mx} y={my - 6} textAnchor="middle" fill="#c9c0b2" fontSize="9">
        {edge.label}
      </text>
    </g>
  );
}

function LoopNodeMark({
  node,
  x,
  y,
  onPick,
}: {
  node: LoopNode;
  x: number;
  y: number;
  onPick: (node: LoopNode) => void;
}) {
  const related = node.kind === "related";
  return (
    <g
      className="cursor-pointer"
      onClick={(event) => {
        event.stopPropagation();
        onPick(node);
      }}
    >
      {node.kind === "prompt" || node.kind === "action" ? (
        <rect x={x - 14} y={y - 11} width="28" height="22" rx={node.kind === "action" ? 11 : 4} fill="#1c2740" stroke="#e6dcc8" strokeWidth="1.2" />
      ) : (
        <circle
          cx={x}
          cy={y}
          r={node.kind === "question" ? 13 : 11}
          fill={node.kind === "question" ? "#e3b14a" : "#1c2740"}
          stroke={related ? "#e6dcc8" : "#fffaf1"}
          strokeDasharray={related ? "3 3" : undefined}
          strokeWidth="1.3"
        />
      )}
      <text x={x} y={y + 4} textAnchor="middle" fill={node.kind === "question" ? "#1c2740" : "#fffaf1"} fontSize="9" fontWeight="700">
        {KIND_MARK[node.kind]}
      </text>
      <text x={x} y={y + 24} textAnchor="middle" fill="#fffaf1" fontSize="10">
        {node.label.length > 12 ? `${node.label.slice(0, 11)}…` : node.label}
      </text>
    </g>
  );
}
