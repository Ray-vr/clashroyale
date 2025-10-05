function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Grass background
  let grassGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  grassGradient.addColorStop(0, "#3ebd3e");
  grassGradient.addColorStop(1, "#228B22");
  ctx.fillStyle = grassGradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Dirt border
  ctx.fillStyle = "#d2a86d";
  ctx.fillRect(0, 0, canvas.width, 35);
  ctx.fillRect(0, canvas.height-35, canvas.width, 35);

  // River
  ctx.fillStyle = "#62a6ff";
  ctx.beginPath();
  ctx.moveTo(0, canvas.height/2-25);
  ctx.lineTo(canvas.width, canvas.height/2-25);
  ctx.lineTo(canvas.width, canvas.height/2+25);
  ctx.lineTo(0, canvas.height/2+25);
  ctx.closePath();
  ctx.fill();

  // Bridges
  ctx.fillStyle = "#bfa16c";
  ctx.fillRect(180, canvas.height/2-10, 80, 20);
  ctx.fillRect(canvas.width-260, canvas.height/2-10, 80, 20);

  // Lane Markers
  ctx.strokeStyle = "#fff8";
  ctx.setLineDash([8, 10]);
  ctx.beginPath();
  ctx.moveTo(canvas.width/2, 0);
  ctx.lineTo(canvas.width/2, canvas.height);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(canvas.width/4, 0);
  ctx.lineTo(canvas.width/4, canvas.height);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(canvas.width*3/4, 0);
  ctx.lineTo(canvas.width*3/4, canvas.height);
  ctx.stroke();

  // Obstacles (Stone look)
  obstacles.forEach(obs => {
    ctx.save();
    ctx.fillStyle = "#888";
    ctx.strokeStyle = "#444";
    ctx.beginPath();
    ctx.ellipse(obs.x + obs.w/2, obs.y + obs.h/2, obs.w/2, obs.h/2, 0, 0, 2*Math.PI);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  });

  // Towers with shadow
  towers.forEach(tower => {
    // Shadow
    ctx.save();
    ctx.globalAlpha = 0.3;
    ctx.beginPath();
    ctx.arc(tower.x, tower.y+10, tower.type === "king" ? 30 : 24, 0, 2*Math.PI);
    ctx.fillStyle = "#222";
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.restore();

    // Tower
    ctx.save();
    ctx.shadowColor = "#222";
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(tower.x, tower.y, tower.type === "king" ? 28 : 22, 0, 2 * Math.PI);
    ctx.fillStyle = tower.type === "king"
      ? (tower.side === "player" ? "#ffd700" : "#d11")
      : (tower.side === "player" ? "#44f" : "#e54");
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();

    // HP/Destroyed marker
    ctx.fillStyle = "#222";
    ctx.font = "14px Arial";
    ctx.fillText(tower.destroyed ? "X" : `${tower.hp|0}`, tower.x-14, tower.y+6);
  });

  // Units (Animated)
  playerUnits.forEach(unit => drawUnit(unit, true));
  aiUnits.forEach(unit => drawUnit(unit, false));

  // Elixir, crowns, timer
  elixirDiv.innerText = `Elixir: ${elixir.toFixed(1)} / ${elixirMax}`;
  matchInfo.innerText = `Crowns: ${crowns.player} | AI: ${crowns.ai}`;
  timerDiv.innerText = `Time: ${Math.floor(timer/60)}:${("0"+(timer%60)).slice(-2)}`;
}
