export interface Point2D {
  x: number;
  z: number;
}

export class GridPathfinding {
  private grid: number[][];
  private width: number;
  private height: number;
  private cellSize: number;
  private halfWidth: number;
  private halfHeight: number;

  constructor(grid: number[][], cellSize: number) {
    this.grid = grid;
    this.height = grid.length;
    this.width = grid[0].length;
    this.cellSize = cellSize;
    this.halfWidth = (this.width * cellSize) / 2;
    this.halfHeight = (this.height * cellSize) / 2;
  }

  // Convert World Position to Grid Coordinates (0 to width-1, 0 to height-1)
  public worldToGrid(wx: number, wz: number): { gx: number; gz: number } {
    const gx = Math.floor((wx + this.halfWidth) / this.cellSize);
    const gz = Math.floor((wz + this.halfHeight) / this.cellSize);
    return {
      gx: Math.max(0, Math.min(this.width - 1, gx)),
      gz: Math.max(0, Math.min(this.height - 1, gz)),
    };
  }

  // Convert Grid Coordinates to World Position (center of cell)
  public gridToWorld(gx: number, gz: number): { wx: number; wz: number } {
    const wx = (gx + 0.5) * this.cellSize - this.halfWidth;
    const wz = (gz + 0.5) * this.cellSize - this.halfHeight;
    return { wx, wz };
  }

  public isWalkable(gx: number, gz: number): boolean {
    if (typeof gx !== 'number' || typeof gz !== 'number' || isNaN(gx) || isNaN(gz)) return false;
    if (gx < 0 || gx >= this.width || gz < 0 || gz >= this.height) return false;
    if (!this.grid || !this.grid[gz]) return false;
    return this.grid[gz][gx] === 0;
  }

  // Find the nearest walkable cell in world coordinates to a given world position
  public findNearestWalkableWorld(targetWx: number, targetWz: number, maxRadius: number = 4): { wx: number; wz: number } {
    const { gx, gz } = this.worldToGrid(targetWx, targetWz);
    if (this.isWalkable(gx, gz)) {
      return { wx: targetWx, wz: targetWz };
    }
    for (let r = 1; r <= maxRadius; r++) {
      for (let dz = -r; dz <= r; dz++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.abs(dx) === r || Math.abs(dz) === r) {
            const ngx = gx + dx;
            const ngz = gz + dz;
            if (this.isWalkable(ngx, ngz)) {
              return this.gridToWorld(ngx, ngz);
            }
          }
        }
      }
    }
    return { wx: targetWx, wz: targetWz };
  }

  // Line-of-sight raycast on grid using fine-step sampling
  // Prevents diagonal wall corner-cutting leaks and guarantees walls block vision completely
  public hasLineOfSight(wx1: number, wz1: number, wx2: number, wz2: number): boolean {
    const dist = Math.hypot(wx2 - wx1, wz2 - wz1);
    if (dist < 0.01) return true;

    // Step every 0.25 of a cell size (approx 0.7 units)
    const stepSize = this.cellSize * 0.25;
    const steps = Math.ceil(dist / stepSize);

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const curX = wx1 + (wx2 - wx1) * t;
      const curZ = wz1 + (wz2 - wz1) * t;
      const g = this.worldToGrid(curX, curZ);

      if (!this.isWalkable(g.gx, g.gz)) {
        return false;
      }
    }

    return true;
  }

  // Find the nearest walkable cell in grid coordinates to given (gx, gz)
  public findNearestWalkableCell(gx: number, gz: number, maxRadius: number = 5): { gx: number; gz: number } | null {
    if (this.isWalkable(gx, gz)) {
      return { gx, gz };
    }
    for (let r = 1; r <= maxRadius; r++) {
      for (let dz = -r; dz <= r; dz++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.abs(dx) === r || Math.abs(dz) === r) {
            const ngx = gx + dx;
            const ngz = gz + dz;
            if (this.isWalkable(ngx, ngz)) {
              return { gx: ngx, gz: ngz };
            }
          }
        }
      }
    }
    return null;
  }

  // A* Pathfinding from start world pos to goal world pos
  public findPath(startW: Point2D | { wx: number; wz: number }, goalW: Point2D | { wx: number; wz: number }): Point2D[] {
    const sx = 'x' in startW ? startW.x : startW.wx;
    const sz = 'z' in startW ? startW.z : startW.wz;
    const gx = 'x' in goalW ? goalW.x : goalW.wx;
    const gz = 'z' in goalW ? goalW.z : goalW.wz;

    let start = this.worldToGrid(sx, sz);
    let goal = this.worldToGrid(gx, gz);

    if (!this.isWalkable(start.gx, start.gz)) {
      const nearestStart = this.findNearestWalkableCell(start.gx, start.gz, 5);
      if (nearestStart) {
        start = nearestStart;
      }
    }

    if (!this.isWalkable(goal.gx, goal.gz)) {
      const nearestGoal = this.findNearestWalkableCell(goal.gx, goal.gz, 5);
      if (nearestGoal) {
        goal = nearestGoal;
      }
    }

    if (!this.isWalkable(start.gx, start.gz) || !this.isWalkable(goal.gx, goal.gz)) {
      return [];
    }

    if (start.gx === goal.gx && start.gz === goal.gz) {
      return [{ x: goalW.x, z: goalW.z }];
    }

    interface Node {
      gx: number;
      gz: number;
      g: number;
      h: number;
      f: number;
      parent: Node | null;
    }

    const openList: Node[] = [];
    const closedSet: Set<string> = new Set();
    const nodeMap: Map<string, Node> = new Map();

    const makeKey = (x: number, z: number) => `${x},${z}`;
    const heuristic = (x: number, z: number) => Math.abs(x - goal.gx) + Math.abs(z - goal.gz);

    const startNode: Node = {
      gx: start.gx,
      gz: start.gz,
      g: 0,
      h: heuristic(start.gx, start.gz),
      f: heuristic(start.gx, start.gz),
      parent: null,
    };

    openList.push(startNode);
    nodeMap.set(makeKey(start.gx, start.gz), startNode);
    let closestNode: Node = startNode;

    const neighbors = [
      { dx: 0, dz: -1 },
      { dx: 0, dz: 1 },
      { dx: -1, dz: 0 },
      { dx: 1, dz: 0 },
    ];

    while (openList.length > 0) {
      // Find lowest f score
      let lowestIndex = 0;
      for (let i = 1; i < openList.length; i++) {
        if (openList[i].f < openList[lowestIndex].f) {
          lowestIndex = i;
        }
      }

      const current = openList.splice(lowestIndex, 1)[0];
      const currentKey = makeKey(current.gx, current.gz);
      closedSet.add(currentKey);

      if (current.h < closestNode.h) {
        closestNode = current;
      }

      // Reached goal?
      if (current.gx === goal.gx && current.gz === goal.gz) {
        const path: Point2D[] = [];
        let curr: Node | null = current;
        while (curr) {
          const world = this.gridToWorld(curr.gx, curr.gz);
          path.unshift({ x: world.wx, z: world.wz });
          curr = curr.parent;
        }
        // Replace last waypoint with exact goal pos
        if (path.length > 0) {
          path[path.length - 1] = { x: goalW.x, z: goalW.z };
        }
        return path;
      }

      // Check 4 cardinal neighbors
      for (const n of neighbors) {
        const nx = current.gx + n.dx;
        const nz = current.gz + n.dz;
        const nKey = makeKey(nx, nz);

        if (closedSet.has(nKey) || !this.isWalkable(nx, nz)) {
          continue;
        }

        const tentativeG = current.g + 1;
        let neighborNode = nodeMap.get(nKey);

        if (!neighborNode) {
          neighborNode = {
            gx: nx,
            gz: nz,
            g: tentativeG,
            h: heuristic(nx, nz),
            f: tentativeG + heuristic(nx, nz),
            parent: current,
          };
          nodeMap.set(nKey, neighborNode);
          openList.push(neighborNode);
        } else if (tentativeG < neighborNode.g) {
          neighborNode.g = tentativeG;
          neighborNode.f = tentativeG + neighborNode.h;
          neighborNode.parent = current;
        }
      }
    }

    // Fallback: If openList exhausted without reaching exact goal, return path to closest reachable node
    if (closestNode !== startNode) {
      const path: Point2D[] = [];
      let curr: Node | null = closestNode;
      while (curr) {
        const world = this.gridToWorld(curr.gx, curr.gz);
        path.unshift({ x: world.wx, z: world.wz });
        curr = curr.parent;
      }
      return path;
    }

    return []; // No path found
  }
}
