import { BabylonDungeonGame } from "./babylon-game.js?v=16";

const canvas = document.querySelector("#game");
const hud = document.querySelector("#hud");

try {
  const game = new BabylonDungeonGame(canvas, hud);
  window.dungeonGame = game;
  game.start();
} catch (error) {
  hud.classList.add("show-message");
  hud.querySelector("[data-message-title]").textContent = "Oyun başlarken hata oldu";
  hud.querySelector("[data-message-body]").textContent = String(error?.message ?? error);
  throw error;
}
