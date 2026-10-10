import type { ZagGame } from './zag/game';

let _game: ZagGame;

export const setGame = (game: ZagGame) => (_game = game);

export const getGame = () => _game;
