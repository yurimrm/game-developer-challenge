// src/core/TileMapConfig.ts

export const TILE_COORDS = {
    // Água e Água Rasa
    DEEP_WATER: { x: 8, y: 4 },
    SHALLOW_WATER: {
      NW: { x: 9, y: 0 },
      N: { x: 10, y: 0 },
      NE: { x: 11, y: 0 },
      W: { x: 9, y: 1 },
      CENTER: { x: 10, y: 1 },
      E: { x: 11, y: 1 },
      SW: { x: 9, y: 2 },
      S: { x: 10, y: 2 },
      SE: { x: 11, y: 2 },
    },
  
    // Ilha de Areia pura
    SAND: {
      NW: { x: 0, y: 0 },
      N: { x: 1, y: 0 },
      NE: { x: 2, y: 0 },
      W: { x: 0, y: 1 },
      CENTER: { x: 1, y: 1 },
      E: { x: 2, y: 1 },
      SW: { x: 0, y: 2 },
      S: { x: 1, y: 2 },
      SE: { x: 2, y: 2 },
    },
  
    // Areia + Grama / Grama Pura
    GRASS_LAND: {
      NW: { x: 5, y: 0 },
      N_TYPE_1: { x: 6, y: 0 },
      N_TYPE_2: { x: 7, y: 0 },
      NE: { x: 8, y: 0 },
      W_TYPE_1: { x: 5, y: 1 },
      CENTER_1: { x: 6, y: 1 },
      CENTER_2: { x: 7, y: 1 },
      E_TYPE_1: { x: 8, y: 1 },
      W_TYPE_2: { x: 5, y: 2 },
      CENTER_3: { x: 6, y: 2 },
      CENTER_4: { x: 7, y: 2 },
      E_TYPE_2: { x: 8, y: 2 },
      SW: { x: 5, y: 3 },
      S_TYPE_1: { x: 6, y: 3 },
      S_TYPE_2: { x: 7, y: 3 },
      SE: { x: 8, y: 3 },
    },
  
    // Decorações e POIs
    DECORATION: {
      VEGETATION: [
        { x: 5, y: 4 },
        { x: 6, y: 4 },
        { x: 7, y: 4 },
        { x: 6, y: 5 },
        { x: 7, y: 5 },
      ],
      ROCKS: [
        { x: 0, y: 4 },
        { x: 1, y: 4 },
        { x: 2, y: 4 },
        { x: 1, y: 5 },
        { x: 2, y: 5 },
        { x: 4, y: 5 }, // Pedra na areia
      ],
      STRANDED_BOAT: { x: 0, y: 5 },
    },

    // Estruturas Metálicas, Torres e Pontes
    STRUCTURES: {
        TOWER_1: { x: 12, y: 0 },
        TOWER_2: { x: 13, y: 0 },
        TOWER_VERTICAL_BRIDGE: { x: 12, y: 1 },
        TOWER_VERTICAL_NORTH: { x: 12, y: 2 },
        TOWER_VERTICAL_SOUTH: { x: 12, y: 3 },
        TOWER_HORIZONTAL_BRIDGE: { x: 13, y: 1 },
        TOWER_HORIZONTAL_WEST: { x: 13, y: 2 },
        TOWER_HORIZONTAL_EAST: { x: 13, y: 3 },
        
        CORNER_NW: { x: 12, y: 4 },
        CORNER_SW: { x: 12, y: 5 },
        CORNER_NE: { x: 13, y: 4 },
        CORNER_SE: { x: 13, y: 5 },

        BRIDGE_VERTICAL: { x: 14, y: 0 },
        BRIDGE_HORIZONTAL: { x: 15, y: 0 },
        BRIDGE_VERTICAL_GAP: { x: 14, y: 5 },
        BRIDGE_HORIZONTAL_GAP: { x: 15, y: 5 },
        BRIDGE_NORTH: { x: 14, y: 3 },
        BRIDGE_SOUTH: { x: 14, y: 4 },
        BRIDGE_WEST: { x: 15, y: 3 },
        BRIDGE_EAST: { x: 15, y: 4 },
    },
  };