export default function Heatmap({ weeks = [] }) {
  const trimmed = weeks.slice(-26);
  const cells = [];
  for (const week of trimmed) {
    for (const day of week.contributionDays) {
      const count = day.contributionCount;
      let level = 0;
      if (count > 0 && count <= 2) level = 1;
      else if (count <= 5) level = 2;
      else if (count <= 10) level = 3;
      else if (count > 10) level = 4;
      cells.push({ date: day.date, level });
    }
  }

  return (
    <div className="heatmap">
      {cells.map((cell) => (
        <div
          key={cell.date}
          className={`heat-cell level-${cell.level}`}
          title={`${cell.date}`}
        />
      ))}
    </div>
  );
}