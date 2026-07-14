import { Game } from "./core/Game.js";

const canvas = document.querySelector("#renderCanvas");
const game = new Game(canvas);
window.robotAvcisi = game;
game.start();
