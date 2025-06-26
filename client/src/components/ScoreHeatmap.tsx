import { HeatMapGrid } from "react-grid-heatmap";

const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const timeLabels = ["9AM", "10AM", "11AM", "12PM", "1PM", "2PM"];

interface Score {
  day: number;
  time: number;
  score: number;
}

interface ScoreHeatmapProps {
  readonly scores: Score[];
}

export default function ScoreHeatmap({ scores }: ScoreHeatmapProps) {
  const grid: number[][] = Array(5)
    .fill(0)
    .map(() => Array(6).fill(0));

  scores.forEach(({ day, time, score }) => {
    if (grid[day] && typeof grid[day][time] === "number") {
      grid[day][time] = parseFloat(score.toFixed(2));
    }
  });
// console.log("Heatmap scores:", scores);

  return (
    <div className="overflow-x-auto p-4">
      <h2 className="text-lg font-semibold mb-4">Score Heatmap</h2>
      <HeatMapGrid
        data={grid}
        xLabels={timeLabels}
        yLabels={dayLabels}
        square={true}
        cellHeight="45px"
        cellStyle={(_x, _y, ratio) => ({
          background: `rgba(0, 100, 255, ${ratio})`,
          fontSize: "12px",
          color: "#318",
          textAlign: "center",
          border: "1px solid #000",
        })}
        cellRender={(_x, _y, value) => value?.toFixed(1)}
      />
    </div>
  );
}
