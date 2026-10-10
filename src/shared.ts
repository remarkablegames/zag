import type { ZagScene } from './zag/scene';

let _game: ZagScene;

export const setGame = (game: ZagScene) => (_game = game);

export const getGame = () => _game;
