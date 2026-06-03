export const EVENTS = {
  // C → S
  JOIN_QUEUE: 'join_queue',
  LEAVE_QUEUE: 'leave_queue',
  PLAYER_INPUT: 'player_input',
  PLAYER_SHOOT: 'player_shoot',
  USE_ITEM: 'use_item',
  CHAT_MESSAGE: 'chat_message',

  // S → C
  QUEUE_UPDATE: 'queue_update',
  GAME_START: 'game_start',
  STATE_UPDATE: 'state_update',
  PLAYER_HIT: 'player_hit',
  PLAYER_DIED: 'player_died',
  PLAYER_RESPAWNED: 'player_respawned',
  ITEM_COLLECTED: 'item_collected',
  DIAMOND_COLLECTED: 'diamond_collected',
  ITEM_BOX_RESPAWNED: 'item_box_respawned',
  GAME_OVER: 'game_over',
  INPUT_CORRECTION: 'input_correction',
  ERROR: 'game_error',
} as const
