const canvas = document.querySelector("#introCanvas");
const ctx = canvas.getContext("2d");

let frame = 0;

function draw() {
  frame += 1;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const pulse = 0.5 + Math.sin(frame * 0.05) * 0.5;
  const eyeGlow = ctx.createRadialGradient(480, 230, 20, 480, 230, 260);
  eyeGlow.addColorStop(0, `rgba(0, 0, 0, ${0.9})`);
  eyeGlow.addColorStop(0.35, `rgba(65, 27, 92, ${0.34 + pulse * 0.22})`);
  eyeGlow.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = "#070808";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = eyeGlow;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#0b0b0c";
  ctx.beginPath();
  ctx.ellipse(480, 260, 220, 126, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#000";
  ctx.beginPath();
  ctx.arc(415, 235, 42 + pulse * 5, 0, Math.PI * 2);
  ctx.arc(545, 235, 42 + pulse * 5, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = `rgba(255, 211, 107, ${0.28 + pulse * 0.26})`;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(415, 235, 54 + pulse * 7, 0, Math.PI * 2);
  ctx.arc(545, 235, 54 + pulse * 7, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = "rgba(255, 211, 107, 0.75)";
  ctx.font = "700 18px Arial";
  ctx.textAlign = "center";
  ctx.fillText("Devam edecek...", canvas.width / 2, 408);

  requestAnimationFrame(draw);
}

draw();
