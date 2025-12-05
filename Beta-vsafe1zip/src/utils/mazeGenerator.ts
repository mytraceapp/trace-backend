export interface Cell {
  x: number;
  y: number;
  walls: { top: boolean; right: boolean; bottom: boolean; left: boolean };
  visited: boolean;
}

export interface MazeData {
  grid: Cell[][];
  width: number;
  height: number;
  start: { x: number; y: number };
  end: { x: number; y: number };
  path: { x: number; y: number }[];
}

export function generateMaze(width: number = 5, height: number = 6): MazeData {
  const grid: Cell[][] = [];
  
  for (let y = 0; y < height; y++) {
    grid[y] = [];
    for (let x = 0; x < width; x++) {
      grid[y][x] = {
        x,
        y,
        walls: { top: true, right: true, bottom: true, left: true },
        visited: false,
      };
    }
  }

  const stack: Cell[] = [];
  const start = grid[0][0];
  start.visited = true;
  stack.push(start);

  while (stack.length > 0) {
    const current = stack[stack.length - 1];
    const neighbors = getUnvisitedNeighbors(current, grid, width, height);

    if (neighbors.length === 0) {
      stack.pop();
    } else {
      const randomIndex = Math.floor(Math.random() * neighbors.length);
      const next = neighbors[randomIndex];
      
      removeWall(current, next);
      next.visited = true;
      stack.push(next);
    }
  }

  const startPos = { x: 0, y: 0 };
  const endPos = { x: width - 1, y: height - 1 };

  const path = findPath(grid, startPos, endPos, width, height);

  return {
    grid,
    width,
    height,
    start: startPos,
    end: endPos,
    path,
  };
}

function getUnvisitedNeighbors(cell: Cell, grid: Cell[][], width: number, height: number): Cell[] {
  const neighbors: Cell[] = [];
  const { x, y } = cell;

  if (y > 0 && !grid[y - 1][x].visited) neighbors.push(grid[y - 1][x]);
  if (x < width - 1 && !grid[y][x + 1].visited) neighbors.push(grid[y][x + 1]);
  if (y < height - 1 && !grid[y + 1][x].visited) neighbors.push(grid[y + 1][x]);
  if (x > 0 && !grid[y][x - 1].visited) neighbors.push(grid[y][x - 1]);

  return neighbors;
}

function removeWall(current: Cell, next: Cell): void {
  const dx = next.x - current.x;
  const dy = next.y - current.y;

  if (dx === 1) {
    current.walls.right = false;
    next.walls.left = false;
  } else if (dx === -1) {
    current.walls.left = false;
    next.walls.right = false;
  } else if (dy === 1) {
    current.walls.bottom = false;
    next.walls.top = false;
  } else if (dy === -1) {
    current.walls.top = false;
    next.walls.bottom = false;
  }
}

function findPath(
  grid: Cell[][],
  start: { x: number; y: number },
  end: { x: number; y: number },
  width: number,
  height: number
): { x: number; y: number }[] {
  const visited = new Set<string>();
  const path: { x: number; y: number }[] = [];

  function dfs(x: number, y: number): boolean {
    if (x < 0 || x >= width || y < 0 || y >= height) return false;
    
    const key = `${x},${y}`;
    if (visited.has(key)) return false;
    visited.add(key);

    path.push({ x, y });

    if (x === end.x && y === end.y) return true;

    const cell = grid[y][x];

    if (!cell.walls.right && dfs(x + 1, y)) return true;
    if (!cell.walls.bottom && dfs(x, y + 1)) return true;
    if (!cell.walls.left && dfs(x - 1, y)) return true;
    if (!cell.walls.top && dfs(x, y - 1)) return true;

    path.pop();
    return false;
  }

  dfs(start.x, start.y);
  return path;
}

export function mazeToSvgPath(maze: MazeData, cellSize: number, padding: number): string {
  const { path } = maze;
  if (path.length === 0) return '';

  const points = path.map((p) => ({
    x: padding + p.x * cellSize + cellSize / 2,
    y: padding + p.y * cellSize + cellSize / 2,
  }));

  let d = `M ${points[0].x} ${points[0].y}`;

  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const next = points[i + 1];

    if (next) {
      const dx1 = curr.x - prev.x;
      const dy1 = curr.y - prev.y;
      const dx2 = next.x - curr.x;
      const dy2 = next.y - curr.y;

      if ((dx1 !== dx2 || dy1 !== dy2)) {
        const cx1 = curr.x - dx1 * 0.4;
        const cy1 = curr.y - dy1 * 0.4;
        const cx2 = curr.x + dx2 * 0.4;
        const cy2 = curr.y + dy2 * 0.4;
        d += ` L ${cx1} ${cy1} Q ${curr.x} ${curr.y}, ${cx2} ${cy2}`;
      } else {
        d += ` L ${curr.x} ${curr.y}`;
      }
    } else {
      d += ` L ${curr.x} ${curr.y}`;
    }
  }

  return d;
}

export function getPointOnPath(
  maze: MazeData,
  progress: number,
  cellSize: number,
  padding: number
): { x: number; y: number } {
  const { path } = maze;
  if (path.length === 0) return { x: 0, y: 0 };

  const totalSegments = path.length - 1;
  const segmentProgress = progress * totalSegments;
  const segmentIndex = Math.min(Math.floor(segmentProgress), totalSegments - 1);
  const localProgress = segmentProgress - segmentIndex;

  const current = path[segmentIndex];
  const next = path[Math.min(segmentIndex + 1, path.length - 1)];

  const x1 = padding + current.x * cellSize + cellSize / 2;
  const y1 = padding + current.y * cellSize + cellSize / 2;
  const x2 = padding + next.x * cellSize + cellSize / 2;
  const y2 = padding + next.y * cellSize + cellSize / 2;

  return {
    x: x1 + (x2 - x1) * localProgress,
    y: y1 + (y2 - y1) * localProgress,
  };
}
