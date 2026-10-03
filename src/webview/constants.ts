export const SHOW_ALL_BRANCHES = "*";

/** Hash the backend gives to the synthetic "Uncommitted Changes" row. */
export const UNCOMMITTED_CHANGES = "*";

/**
 * Metrics of the commit table, in pixels. The graph is drawn to them, so the
 * table must keep its cells exactly this high, and in pixels rather than `rem`.
 */
export const ROW_HEIGHT = 24;
export const TABLE_HEADER_HEIGHT = 32;

/** Height of the commit details view. The graph is stretched by it when open. */
export const COMMIT_DETAILS_HEIGHT = 250;

/**
 * Index in a commit row of each column the user resizes, in the order the
 * widths are stored. The description column is absent: it takes the width the
 * other columns leave.
 */
export const RESIZABLE_COLUMNS = [0, 2, 3, 4];

/** Index in a commit row of the column that takes the remaining width. */
export const DESCRIPTION_COLUMN = 1;

/** Radius of a hexagon commit node, in pixels. */
export const HEXAGON_RADIUS = 10;

/** Size of the inner icon inside a hexagon node, in pixels. */
export const HEXAGON_ICON_SIZE = 12;

/** Distance between two lanes, in pixels. */
export const LANE_WIDTH = 16;

/** Distance from the left edge of the graph to the first lane, in pixels. */
export const LANE_OFFSET = 10;

/** Space kept between the widest lane and the next table column, in pixels. */
export const GRAPH_PADDING = 20;
