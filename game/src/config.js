// Sunset Vaults — shared tuning and palette. One job: every number the
// rest of the game agrees on, so a balance tweak lands in one place.
export const VIEW_W = 1280;
export const VIEW_H = 800;

// Playfield frame inside the canvas (HUD panels sit left and right).
// ROOM_W/H are the LOGICAL room size the game plays in (blocks, patrols,
// cones all use these). ROOM_PX_W/H are how big the room is drawn on
// screen — the full logical width fits, but the room is TALLER than the
// frame, so a camera scrolls vertically and follows the thief (see
// S.camY in main.js). Bigger map, walls, longer patrols: v2.
// v2.1: 1600x1200, contents shrunk ~15% so the bigger map still reads.
export const ROOM_X = 158;
export const ROOM_Y = 64;
export const ROOM_W = 1600;
export const ROOM_H = 1200;
export const ROOM_PX_W = 964;
export const ROOM_PX_H = 728;

export const PLAYER_R = 11;
export const WALK_SPEED = 175;
export const SNEAK_SPEED = 88;
export const GUARD_SPEED = 62;
export const CHASE_SPEED = 148;
export const DOG_SPEED = 96;

export const CONE_RANGE = 265;
export const CONE_FOV = 1.22; // radians, about 70 degrees
export const CAM_RANGE = 300;
export const CAM_FOV = 0.62;

export const ALARM_LOCKDOWN_SECONDS = 6;
export const GHOST_BONUS = 500;
export const SPEED_BONUS_MAX = 300;

export const PALETTE = {
  floor: '#1c2130',
  floorAlt: '#202636',
  wall: '#232838',
  wallTop: '#39415c',
  gold: '#f5c542',
  goldDim: '#a8873a',
  green: '#37d67a',
  red: '#ff5252',
  blue: '#5b8cff',
  yellow: '#ffc93c',
  ink: '#e8e6df',
  dim: '#9aa0b4',
  panel: 'rgba(10,12,20,0.88)',
  panelEdge: '#2c3247',
};
