const canvas = document.createElement("canvas");
canvas.width = 512;
canvas.height = 512;
const ctx = canvas.getContext("2d");
document.getElementById("contain").append(canvas);
F.createListeners();

const gridSize = 12,
  fov = 0.3,
  res = 150,
  interval = 0.01,
  maxLength = 8,
  colors = ["cyan", "red", "lime", "blue", "yellow"],
  background = "black",
  invertKeys = false;

var player, grid, vision, eyes, didJustReset;

function reset() {
  player = {
    x: 7,
    y: 3,
    w: 0.4,
    h: 0.4,
    d: 0.3,
  };

  vision = [];

  grid = [];
  for (var x = 0; x < gridSize; x++) {
    grid.push([]);
    for (var y = 0; y < gridSize; y++) {
      grid[x].push(
        x <= 0 ||
          x + 1 >= gridSize ||
          y <= 0 ||
          y + 1 >= gridSize ||
          Math.random() > 0.9
          ? F.randomChoice(colors)
          : null,
      );
    }
  }
}

function render() {
  // Reset canvas
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Adjust for camera
  var zoom = canvas.width / gridSize;
  ctx.save();
  ctx.scale(zoom, zoom);

  // Grid
  for (var x = 0; x < grid.length; x++) {
    for (var y = 0; y < grid[x].length; y++) {
      if (!grid[x][y]) {
        continue;
      }

      var isSeen = false;
      for (var i = 0; i < vision.length; i++) {
        if (Math.floor(vision[i].x) === x && Math.floor(vision[i].y) === y) {
          isSeen = true;
          continue;
        }
      }

      ctx.fillStyle = grid[x][y];
      if (!isSeen) {
        var hsv = F.hex2hsv(ctx.fillStyle);
        hsv.v /= 6;
        ctx.fillStyle = F.hsv2hex(hsv);
      }
      ctx.fillRect(x, y, 1 + 0.5 / gridSize, 1 + 0.5 / gridSize);
    }
  }

  // Player
  ctx.fillStyle = "lime";
  ctx.fillRect(player.x, player.y, player.w, player.h);

  // Player direction
  eyes = F.angle2coords(
    player.x + player.w / 2,
    player.y + player.h / 2,
    player.d * Math.PI * 2,
    player.w / 2,
  );
  ctx.fillStyle = "blue";
  ctx.beginPath();
  ctx.ellipse(
    eyes.x,
    eyes.y,
    player.w * 0.1,
    player.h * 0.1,
    0,
    0,
    Math.PI * 2,
  );
  ctx.fill();

  // Rays
  ctx.strokeStyle = "magenta";
  ctx.lineWidth = 0.02;
  for (var i = 0; i < vision.length; i++) {
    if (!F.keys.Space === invertKeys) {
      ctx.beginPath();
      ctx.moveTo(eyes.x, eyes.y);
      ctx.lineTo(vision[i].x, vision[i].y);
      ctx.stroke();
    }

    ctx.fillStyle = vision[i].color;
    var hsv = F.hex2hsv(ctx.fillStyle);
    hsv.v -= (vision[i].dist / maxLength) * 100;
    hsv.v *= (Math.abs(Math.sin(Math.PI * vision[i].x)) + 1) / 2;
    hsv.v *= (Math.abs(Math.sin(Math.PI * vision[i].y)) + 1) / 2;

    ctx.fillStyle = F.hsv2hex(hsv);
    ctx.fillRect(
      i * (gridSize / vision.length),
      0,
      gridSize / vision.length + 0.5 / gridSize,
      !F.keys.Space === invertKeys ? 0.4 : gridSize,
    );
  }

  ctx.restore();
}

function update(mod) {
  if (F.keys.r) {
    if (!didJustReset) {
      didJustReset = true;
      reset();
    }
  } else {
    didJustReset = false;
  }

  // Player movement
  var previous = { ...player };
  if (!F.keys.Shift === invertKeys) {
    if (F.keys.a_ ^ F.keys.d_) {
      player.x += 10 * mod * (F.keys.a_ ? -1 : 1);
    }
    if (F.keys.w_ ^ F.keys.s_) {
      player.y += 10 * mod * (F.keys.w_ ? -1 : 1);
    }
  } else {
    if (F.keys.w_ ^ F.keys.s_) {
      var { x, y } = F.angle2coords(
        0,
        0,
        player.d * Math.PI * 2,
        10 * mod * (F.keys.w_ ? 1 : -1),
      );
      player.x += x;
      player.y += y;
    }
  }

  // Collide
  for (
    var x = Math.floor(player.x);
    x <= Math.floor(player.x + player.w);
    x++
  ) {
    for (
      var y = Math.floor(player.y);
      y <= Math.floor(player.y + player.y);
      y++
    ) {
      if (grid[x]?.[y]) {
        if (F.collide.rect2rect(player, { x, y, w: 1, h: 1 })) {
          player = previous;
        }
      }
    }
  }

  // Player rotation
  if (!F.keys.Shift === invertKeys) {
    if (F.keys.ArrowLeft ^ F.keys.ArrowRight) {
      player.d += 1 * mod * (F.keys.ArrowLeft ? -1 : 1);
    }
  } else {
    if (F.keys.a_ ^ F.keys.d_) {
      player.d += 1 * mod * (F.keys.a_ ? -1 : 1);
    }
  }

  // Rays
  vision = [];
  for (var i = 0; i < res; i++) {
    var dist = 0,
      angle = ((i / res) * fov - fov / 2 + player.d) * Math.PI * 2,
      color = background,
      end = eyes;

    for (var j = 0; j < maxLength; j += interval) {
      dist = j;
      end = F.angle2coords(eyes.x, eyes.y, angle, dist || 0.2);
      if (grid[Math.floor(end.x)]?.[Math.floor(end.y)]) {
        color = grid[Math.floor(end.x)][Math.floor(end.y)];
        break;
      }
    }

    vision.push({
      color,
      dist,
      angle,
      x: end.x,
      y: end.y,
    });
  }
}

function main() {
  render();
  update((Date.now() - then) / 1000);
  then = Date.now();
  requestAnimationFrame(main);
}
var then = Date.now();
reset();
main();
