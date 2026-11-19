/* Dorada Cover Studio — sample-photo generator.
 *
 * Draws the ten sample photos procedurally on canvas: flat, saturated
 * Vice City-style illustration (gradient skies, palm and skyline
 * silhouettes, low cars, neon signs). No external images, no photographs
 * of real people — every figure is a stylized flat drawing.
 *
 * Runs in a headless browser from tools/gen.html; when every scene is
 * drawn it sets window.__genDone to [{name, data}] with each photo as a
 * JPEG data URL, for the capture driver to save under app/samples/.
 */

(function () {
  const W = 1200;
  const H = 900;

  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

  function sky(ctx, stops) {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    stops.forEach(([at, color]) => g.addColorStop(at, color));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  function sunDisc(ctx, x, y, r, core, halo) {
    const g = ctx.createRadialGradient(x, y, r * 0.1, x, y, r * 2.6);
    g.addColorStop(0, halo);
    g.addColorStop(1, 'rgba(255,120,40,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r * 3, y - r * 3, r * 6, r * 6);
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  /* A palm: a leaning trunk and a crown of drooping fronds. */
  function palm(ctx, x, y, s, lean, trunk, leaf) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(lean);
    ctx.strokeStyle = trunk;
    ctx.lineWidth = 14 * s;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(14 * s, -120 * s, 34 * s, -215 * s);
    ctx.stroke();
    ctx.translate(34 * s, -215 * s);
    ctx.strokeStyle = leaf;
    ctx.lineWidth = 7 * s;
    for (let i = 0; i < 8; i++) {
      const ang = -Math.PI * 0.12 - (i / 7) * Math.PI * 0.86;
      const len = (95 + (i % 3) * 22) * s;
      const tipX = Math.cos(ang) * len;
      const tipY = Math.sin(ang) * len * 0.62 + 26 * s;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(Math.cos(ang) * len * 0.55, Math.sin(ang) * len * 0.3 - 14 * s, tipX, tipY);
      ctx.stroke();
    }
    ctx.fillStyle = '#5a3a1a';
    ctx.beginPath();
    ctx.arc(6 * s, 6 * s, 9 * s, 0, Math.PI * 2);
    ctx.arc(-8 * s, 12 * s, 8 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  /* A row of pastel art-deco buildings with lit windows. */
  function decoRow(ctx, yBase, palette, lit) {
    let x = -20;
    let i = 0;
    while (x < W + 20) {
      const bw = 120 + ((i * 67) % 90);
      const bh = 190 + ((i * 113) % 180);
      const color = palette[i % palette.length];
      ctx.fillStyle = color;
      ctx.fillRect(x, yBase - bh, bw, bh);
      /* Stepped deco crown. */
      ctx.fillRect(x + bw * 0.2, yBase - bh - 26, bw * 0.6, 26);
      ctx.fillRect(x + bw * 0.35, yBase - bh - 44, bw * 0.3, 18);
      /* Windows. */
      ctx.fillStyle = lit;
      const cols = Math.max(2, Math.floor(bw / 42));
      const rows = Math.max(2, Math.floor(bh / 52));
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if ((r * 7 + c * 3 + i) % 3 === 0) continue;
          ctx.fillRect(x + 14 + c * ((bw - 28) / cols), yBase - bh + 22 + r * ((bh - 40) / rows), 14, 20);
        }
      }
      x += bw + 8;
      i++;
    }
  }

  /* A low orange supercar in side profile, with ground shadow and speed streaks. */
  function superCar(ctx, x, y, s, body) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    /* Ground shadow. */
    ctx.fillStyle = 'rgba(20,8,20,0.35)';
    ctx.beginPath();
    ctx.ellipse(0, 108, 330, 16, 0, 0, Math.PI * 2);
    ctx.fill();
    /* Body. */
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.moveTo(-320, 82);
    ctx.quadraticCurveTo(-330, 30, -260, 22);
    ctx.lineTo(-190, -6);
    ctx.quadraticCurveTo(-120, -52, -40, -48);
    ctx.lineTo(90, -40);
    ctx.quadraticCurveTo(190, -30, 250, 6);
    ctx.quadraticCurveTo(320, 22, 325, 62);
    ctx.lineTo(320, 88);
    ctx.quadraticCurveTo(300, 96, 260, 96);
    ctx.lineTo(-260, 96);
    ctx.quadraticCurveTo(-310, 96, -320, 82);
    ctx.closePath();
    ctx.fill();
    /* Cabin glass. */
    ctx.fillStyle = '#141021';
    ctx.beginPath();
    ctx.moveTo(-180, -2);
    ctx.quadraticCurveTo(-120, -42, -45, -40);
    ctx.lineTo(80, -34);
    ctx.quadraticCurveTo(150, -28, 185, -2);
    ctx.closePath();
    ctx.fill();
    /* Glass shine + body highlight. */
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath();
    ctx.moveTo(-150, -8);
    ctx.lineTo(-90, -38);
    ctx.lineTo(-60, -38);
    ctx.lineTo(-120, -8);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    ctx.fillRect(-290, 34, 560, 10);
    /* Side intake + headlight. */
    ctx.fillStyle = '#1a0b1e';
    ctx.beginPath();
    ctx.moveTo(150, 30);
    ctx.lineTo(240, 30);
    ctx.lineTo(230, 62);
    ctx.lineTo(150, 62);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffe9a3';
    ctx.beginPath();
    ctx.moveTo(268, 26);
    ctx.lineTo(312, 30);
    ctx.lineTo(306, 44);
    ctx.lineTo(266, 40);
    ctx.closePath();
    ctx.fill();
    /* Wheels. */
    wheel(ctx, -205, 92, 52);
    wheel(ctx, 205, 92, 52);
    ctx.restore();
  }

  function wheel(ctx, x, y, r) {
    ctx.fillStyle = '#100a12';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#3a3a44';
    ctx.beginPath();
    ctx.arc(x, y, r * 0.62, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#c8c8d8';
    ctx.lineWidth = 5;
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(a) * r * 0.58, y + Math.sin(a) * r * 0.58);
      ctx.stroke();
    }
    ctx.fillStyle = '#ffd23f';
    ctx.beginPath();
    ctx.arc(x, y, 7, 0, Math.PI * 2);
    ctx.fill();
  }

  /* A boxy vintage convertible in side profile. */
  function classicCar(ctx, x, y, s, body) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    ctx.fillStyle = 'rgba(20,8,20,0.3)';
    ctx.beginPath();
    ctx.ellipse(0, 112, 320, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.moveTo(-310, 88);
    ctx.lineTo(-310, 30);
    ctx.quadraticCurveTo(-300, 8, -250, 6);
    ctx.lineTo(-190, 2);
    ctx.lineTo(-150, -58);
    ctx.lineTo(120, -58);
    ctx.lineTo(170, 2);
    ctx.lineTo(290, 8);
    ctx.quadraticCurveTo(320, 12, 318, 40);
    ctx.lineTo(318, 88);
    ctx.quadraticCurveTo(300, 98, 270, 98);
    ctx.lineTo(-270, 98);
    ctx.quadraticCurveTo(-306, 98, -310, 88);
    ctx.closePath();
    ctx.fill();
    /* Chrome strip + cabin. */
    ctx.fillStyle = '#e8e4da';
    ctx.fillRect(-300, 52, 610, 7);
    ctx.fillStyle = '#1c2733';
    ctx.fillRect(-138, -48, 246, 46);
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.fillRect(-120, -44, 60, 38);
    ctx.fillStyle = '#8a6d2f';
    ctx.fillRect(-150, -58, 270, 8);
    /* Headlight + grille. */
    ctx.fillStyle = '#ffe9a3';
    ctx.beginPath();
    ctx.arc(296, 34, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#c8c8d8';
    ctx.fillRect(288, 58, 26, 30);
    wheel(ctx, -200, 96, 48);
    wheel(ctx, 200, 96, 48);
    ctx.restore();
  }

  /* A stylized woman: wavy hair, sunglasses, white shirt. Flat illustration. */
  function womanFigure(ctx, x, y, s, skin, hair, shirt) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    /* Hair mass behind. */
    ctx.fillStyle = hair;
    ctx.beginPath();
    ctx.moveTo(-95, 40);
    ctx.quadraticCurveTo(-130, -90, -60, -150);
    ctx.quadraticCurveTo(0, -185, 60, -150);
    ctx.quadraticCurveTo(130, -90, 95, 40);
    ctx.quadraticCurveTo(110, 130, 80, 190);
    ctx.quadraticCurveTo(30, 120, 0, 150);
    ctx.quadraticCurveTo(-30, 120, -80, 190);
    ctx.quadraticCurveTo(-110, 130, -95, 40);
    ctx.closePath();
    ctx.fill();
    /* Shoulders / shirt. */
    ctx.fillStyle = shirt;
    ctx.beginPath();
    ctx.moveTo(-150, 330);
    ctx.quadraticCurveTo(-140, 210, -70, 185);
    ctx.lineTo(-28, 175);
    ctx.lineTo(28, 175);
    ctx.lineTo(70, 185);
    ctx.quadraticCurveTo(140, 210, 150, 330);
    ctx.closePath();
    ctx.fill();
    /* Shirt collar + buttons. */
    ctx.fillStyle = '#e8e2f0';
    ctx.beginPath();
    ctx.moveTo(-28, 175);
    ctx.lineTo(0, 215);
    ctx.lineTo(28, 175);
    ctx.closePath();
    ctx.fill();
    /* Neck + face. */
    ctx.fillStyle = skin;
    ctx.fillRect(-24, 130, 48, 60);
    ctx.beginPath();
    ctx.moveTo(-78, -20);
    ctx.quadraticCurveTo(-82, 90, -30, 128);
    ctx.quadraticCurveTo(0, 148, 30, 128);
    ctx.quadraticCurveTo(82, 90, 78, -20);
    ctx.quadraticCurveTo(70, -110, 0, -112);
    ctx.quadraticCurveTo(-70, -110, -78, -20);
    ctx.closePath();
    ctx.fill();
    /* Sunglasses. */
    ctx.fillStyle = '#120a18';
    roundRect(ctx, -72, -32, 62, 44, 14);
    roundRect(ctx, 10, -32, 62, 44, 14);
    ctx.fillRect(-12, -22, 24, 8);
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.beginPath();
    ctx.moveTo(-60, -28);
    ctx.lineTo(-38, -28);
    ctx.lineTo(-52, 6);
    ctx.lineTo(-66, 6);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(22, -28);
    ctx.lineTo(44, -28);
    ctx.lineTo(30, 6);
    ctx.lineTo(16, 6);
    ctx.closePath();
    ctx.fill();
    /* Smile + earring. */
    ctx.strokeStyle = '#a34d3d';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(0, 62, 26, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
    ctx.fillStyle = '#ffd23f';
    ctx.beginPath();
    ctx.arc(-78, 30, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
    ctx.fill();
  }

  /* An older fisherman with a bucket hat, holding a rod over turquoise water. */
  function fisherman(ctx, x, y, s) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    /* Rod. */
    ctx.strokeStyle = '#3a2a18';
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(120, 60);
    ctx.lineTo(330, -320);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(40,30,20,0.6)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(330, -320);
    ctx.quadraticCurveTo(300, -140, 250, 60);
    ctx.stroke();
    /* Body: white tank top. */
    ctx.fillStyle = '#f2ede2';
    ctx.beginPath();
    ctx.moveTo(-120, 330);
    ctx.quadraticCurveTo(-130, 140, -70, 110);
    ctx.lineTo(60, 110);
    ctx.quadraticCurveTo(130, 140, 120, 330);
    ctx.closePath();
    ctx.fill();
    /* Arms. */
    ctx.strokeStyle = '#c98d64';
    ctx.lineWidth = 34;
    ctx.beginPath();
    ctx.moveTo(-70, 140);
    ctx.quadraticCurveTo(20, 190, 105, 90);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(70, 140);
    ctx.quadraticCurveTo(110, 120, 118, 70);
    ctx.stroke();
    /* Neck + head, weathered skin. */
    ctx.fillStyle = '#c98d64';
    ctx.fillRect(-26, 60, 52, 60);
    ctx.beginPath();
    ctx.moveTo(-72, -10);
    ctx.quadraticCurveTo(-76, 70, -28, 100);
    ctx.quadraticCurveTo(0, 116, 28, 100);
    ctx.quadraticCurveTo(76, 70, 72, -10);
    ctx.quadraticCurveTo(64, -80, 0, -84);
    ctx.quadraticCurveTo(-64, -80, -72, -10);
    ctx.closePath();
    ctx.fill();
    /* Beard + smile. */
    ctx.fillStyle = '#e8e0d0';
    ctx.beginPath();
    ctx.moveTo(-58, 30);
    ctx.quadraticCurveTo(-40, 108, 0, 112);
    ctx.quadraticCurveTo(40, 108, 58, 30);
    ctx.quadraticCurveTo(30, 70, 0, 70);
    ctx.quadraticCurveTo(-30, 70, -58, 30);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#8a5a3a';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(0, 52, 20, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
    /* Bucket hat. */
    ctx.fillStyle = '#cbb37a';
    ctx.beginPath();
    ctx.ellipse(0, -58, 118, 26, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-72, -58);
    ctx.quadraticCurveTo(-70, -128, 0, -130);
    ctx.quadraticCurveTo(70, -128, 72, -58);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#8a6d2f';
    ctx.fillRect(-72, -78, 144, 14);
    ctx.restore();
  }

  /* A ferris wheel with neon cabins, for the boardwalk. */
  function ferrisWheel(ctx, x, y, r, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.strokeStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 22;
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.55, 0, Math.PI * 2);
    ctx.stroke();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      ctx.stroke();
    }
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ff2e63';
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * r, Math.sin(a) * r, 13, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#ffd23f';
    ctx.beginPath();
    ctx.arc(0, 0, 16, 0, Math.PI * 2);
    ctx.fill();
    /* Legs. */
    ctx.strokeStyle = '#2a1a3a';
    ctx.shadowBlur = 0;
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.moveTo(-r * 0.55, r * 0.8);
    ctx.lineTo(0, 0);
    ctx.lineTo(r * 0.55, r * 0.8);
    ctx.stroke();
    ctx.restore();
  }

  /* Glowing neon sign text. */
  function neonText(ctx, text, x, y, size, color, font) {
    ctx.save();
    ctx.font = font || `bold ${size}px Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = color;
    ctx.shadowBlur = 26;
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
    ctx.shadowBlur = 8;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  /* Small crowd silhouettes walking away. */
  function crowd(ctx, yBase, count, color) {
    for (let i = 0; i < count; i++) {
      const x = 60 + ((i * 173) % (W - 120));
      const s = 0.75 + ((i * 37) % 40) / 100;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, yBase - 118 * s, 17 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(x - 24 * s, yBase);
      ctx.quadraticCurveTo(x - 28 * s, yBase - 92 * s, x, yBase - 100 * s);
      ctx.quadraticCurveTo(x + 28 * s, yBase - 92 * s, x + 24 * s, yBase);
      ctx.closePath();
      ctx.fill();
    }
  }

  /* ---- the ten scenes ---- */

  function sceneCarSunset(ctx) {
    sky(ctx, [[0, '#ffd9a0'], [0.45, '#ff9a3d'], [0.75, '#ff2e63'], [1, '#5b1a5e']]);
    sunDisc(ctx, 280, 250, 82, '#fff3b0', 'rgba(255,180,60,0.55)');
    decoRow(ctx, 640, ['#ffb3c8', '#9fe8d8', '#ffe08a', '#c9b8ff'], '#ffe9a3');
    /* Street. */
    ctx.fillStyle = '#3a2036';
    ctx.fillRect(0, 640, W, 260);
    ctx.fillStyle = '#ffd23f';
    for (let i = 0; i < 6; i++) ctx.fillRect(120 + i * 180, 760, 90, 10);
    palm(ctx, 80, 700, 1.1, -0.12, '#2a1608', '#1d3a1a');
    palm(ctx, 1130, 720, 1.25, 0.14, '#2a1608', '#1d3a1a');
    superCar(ctx, 600, 640, 1.05, '#ff5a1f');
    /* Speed streaks. */
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 5;
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.moveTo(80 + i * 40, 700 + i * 26);
      ctx.lineTo(320 + i * 40, 700 + i * 26);
      ctx.stroke();
    }
  }

  function sceneWomanCar(ctx) {
    sky(ctx, [[0, '#ffe9c9'], [0.5, '#ffb37a'], [1, '#ff7a5c']]);
    sunDisc(ctx, 830, 240, 66, '#fff8d0', 'rgba(255,190,90,0.5)');
    /* Lifeguard tower hint + sea strip. */
    ctx.fillStyle = '#7fd4c8';
    ctx.fillRect(0, 560, W, 90);
    ctx.fillStyle = '#f2ede2';
    ctx.fillRect(980, 300, 130, 260);
    ctx.fillStyle = '#2de2c5';
    ctx.fillRect(980, 300, 130, 26);
    ctx.fillStyle = '#ff2e63';
    ctx.fillRect(980, 420, 130, 20);
    classicCar(ctx, 880, 690, 0.9, '#e63946');
    womanFigure(ctx, 430, 430, 1.15, '#e8b48f', '#2a1a20', '#f7f3ea');
    palm(ctx, 110, 660, 1.0, -0.1, '#4a2c14', '#2a4a1e');
  }

  function sceneBoardwalk(ctx) {
    sky(ctx, [[0, '#12041f'], [0.6, '#3d0a5e'], [1, '#7b1e7b']]);
    ferrisWheel(ctx, 600, 330, 190, '#ff2ee6');
    /* Stall rows. */
    ctx.fillStyle = '#1d0b2e';
    ctx.fillRect(0, 600, W, 300);
    for (let i = 0; i < 4; i++) {
      const x = 40 + i * 290;
      ctx.fillStyle = i % 2 ? '#ff2e63' : '#00e5ff';
      ctx.fillRect(x, 560, 230, 150);
      ctx.fillStyle = '#ffd23f';
      for (let s = 0; s < 5; s++) ctx.fillRect(x + 12 + s * 44, 560, 22, 150);
      ctx.fillStyle = '#12041f';
      ctx.fillRect(x + 20, 640, 190, 70);
    }
    neonText(ctx, 'BOARDWALK', 600, 120, 84, '#ff2ee6');
    neonText(ctx, 'ARCADE', 155, 520, 44, '#00e5ff');
    neonText(ctx, 'PIER 66', 1045, 520, 44, '#ffd23f');
    /* Wet reflections. */
    ctx.fillStyle = 'rgba(255,46,230,0.25)';
    for (let i = 0; i < 8; i++) ctx.fillRect(120 + i * 130, 730 + (i % 3) * 40, 60, 8);
    ctx.fillStyle = 'rgba(0,229,255,0.25)';
    for (let i = 0; i < 6; i++) ctx.fillRect(200 + i * 160, 780 + (i % 2) * 36, 70, 8);
    crowd(ctx, 880, 7, '#160a24');
    palm(ctx, 60, 640, 0.9, -0.08, '#1a0a24', '#1d3a2a');
    palm(ctx, 1150, 650, 0.95, 0.1, '#1a0a24', '#1d3a2a');
  }

  function sceneFisherman(ctx) {
    sky(ctx, [[0, '#8fd8ff'], [0.55, '#c9f0ff'], [0.62, '#2aa5c8'], [1, '#0a6a8a']]);
    sunDisc(ctx, 950, 180, 60, '#fffbe8', 'rgba(255,250,200,0.5)');
    /* Sea with sun glint. */
    ctx.fillStyle = '#0f7ea8';
    ctx.fillRect(0, 520, W, 380);
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    for (let i = 0; i < 10; i++) ctx.fillRect(700 + i * 40, 560 + i * 26, 180 - i * 12, 6);
    ctx.fillStyle = '#e8f7ff';
    for (let i = 0; i < 12; i++) ctx.fillRect(60 + (i * 97) % 900, 620 + (i * 53) % 220, 70, 5);
    fisherman(ctx, 420, 480, 1.05);
    /* Gull. */
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(180, 200);
    ctx.quadraticCurveTo(200, 180, 220, 200);
    ctx.quadraticCurveTo(240, 180, 260, 200);
    ctx.stroke();
  }

  function sceneClassicStreet(ctx) {
    sky(ctx, [[0, '#ffe9b8'], [0.5, '#ffc46b'], [1, '#ff8a5c']]);
    decoRow(ctx, 600, ['#ffb3c8', '#9fe8d8', '#ffe08a', '#ffc46b', '#c9b8ff'], '#fff3b0');
    ctx.fillStyle = '#e8d9b0';
    ctx.fillRect(0, 600, W, 300);
    ctx.fillStyle = '#b8a06a';
    for (let i = 0; i < 5; i++) ctx.fillRect(100 + i * 220, 700, 110, 8);
    palm(ctx, 150, 640, 1.05, -0.1, '#4a2c14', '#2a4a1e');
    palm(ctx, 1050, 650, 1.15, 0.12, '#4a2c14', '#2a4a1e');
    classicCar(ctx, 600, 640, 1.0, '#f4f1e6');
    /* Long shadows. */
    ctx.fillStyle = 'rgba(60,20,10,0.18)';
    ctx.beginPath();
    ctx.moveTo(300, 760);
    ctx.lineTo(900, 760);
    ctx.lineTo(1050, 900);
    ctx.lineTo(150, 900);
    ctx.closePath();
    ctx.fill();
  }

  function scenePalms(ctx) {
    sky(ctx, [[0, '#ffcf7d'], [0.4, '#ff7a3d'], [0.75, '#e63b7a'], [1, '#4a1440']]);
    sunDisc(ctx, 600, 620, 130, '#fff3b0', 'rgba(255,150,50,0.6)');
    /* Distant sea line. */
    ctx.fillStyle = '#7a2a5e';
    ctx.fillRect(0, 700, W, 200);
    ctx.fillStyle = 'rgba(255,210,120,0.5)';
    ctx.fillRect(520, 700, 160, 6);
    palm(ctx, 220, 760, 1.5, -0.16, '#160818', '#160818');
    palm(ctx, 980, 780, 1.7, 0.14, '#160818', '#160818');
    palm(ctx, 600, 800, 1.1, 0.02, '#160818', '#160818');
    /* Birds. */
    ctx.strokeStyle = '#160818';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    [[300, 220], [380, 180], [820, 200], [900, 260]].forEach(([x, y]) => {
      ctx.beginPath();
      ctx.moveTo(x - 22, y);
      ctx.quadraticCurveTo(x - 8, y - 14, x, y);
      ctx.quadraticCurveTo(x + 8, y - 14, x + 22, y);
      ctx.stroke();
    });
  }

  function sceneBeach(ctx) {
    sky(ctx, [[0, '#aee6ff'], [0.45, '#d8f4ff'], [0.55, '#2ec8c0'], [1, '#0a8a9a']]);
    sunDisc(ctx, 180, 170, 64, '#fffbe8', 'rgba(255,250,200,0.5)');
    /* Sea + sand. */
    ctx.fillStyle = '#14a8b8';
    ctx.fillRect(0, 480, W, 180);
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    for (let i = 0; i < 8; i++) ctx.fillRect(80 + (i * 131) % 1000, 520 + (i * 41) % 110, 90, 6);
    ctx.fillStyle = '#f7e3b0';
    ctx.fillRect(0, 660, W, 240);
    ctx.fillStyle = '#e8c98a';
    for (let i = 0; i < 14; i++) {
      ctx.beginPath();
      ctx.arc(80 + (i * 89) % 1080, 700 + (i * 67) % 170, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    /* Beach umbrella + towel. */
    ctx.fillStyle = '#ff2e63';
    ctx.beginPath();
    ctx.moveTo(950, 640);
    ctx.quadraticCurveTo(950, 520, 1080, 520);
    ctx.quadraticCurveTo(1210, 520, 1210, 640);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffd23f';
    ctx.beginPath();
    ctx.moveTo(1015, 640);
    ctx.lineTo(1080, 520);
    ctx.lineTo(1145, 640);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#8a6d2f';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(1080, 640);
    ctx.lineTo(1080, 740);
    ctx.stroke();
    womanFigure(ctx, 480, 420, 1.2, '#e8b48f', '#4a2a1a', '#2de2c5');
    palm(ctx, 110, 700, 0.95, -0.1, '#4a2c14', '#2a4a1e');
  }

  function sceneSkyline(ctx) {
    sky(ctx, [[0, '#2a1055'], [0.45, '#7b2a6e'], [0.7, '#ff6a2e'], [1, '#1a0b2e']]);
    sunDisc(ctx, 600, 560, 110, '#ffd9a3', 'rgba(255,140,60,0.55)');
    /* Towers with lit windows. */
    let x = 0;
    let i = 0;
    while (x < W) {
      const bw = 90 + ((i * 71) % 80);
      const bh = 220 + ((i * 137) % 260);
      ctx.fillStyle = i % 2 ? '#160a26' : '#1d0b30';
      ctx.fillRect(x, 640 - bh, bw, bh + 260);
      ctx.fillStyle = '#ffd23f';
      for (let r = 0; r < Math.floor(bh / 46); r++) {
        for (let c = 0; c < Math.max(2, Math.floor(bw / 34)); c++) {
          if ((r * 5 + c * 3 + i) % 4 === 0) continue;
          ctx.fillRect(x + 10 + c * 30, 640 - bh + 18 + r * 42, 12, 16);
        }
      }
      x += bw + 6;
      i++;
    }
    /* Water + reflection. */
    ctx.fillStyle = '#241040';
    ctx.fillRect(0, 640, W, 260);
    ctx.fillStyle = 'rgba(255,122,46,0.4)';
    for (let r = 0; r < 8; r++) ctx.fillRect(480 + (r % 2) * 40, 680 + r * 24, 240 - r * 22, 7);
    ctx.fillStyle = 'rgba(255,210,63,0.3)';
    for (let r = 0; r < 6; r++) ctx.fillRect(200 + (r % 3) * 30, 700 + r * 28, 90, 5);
  }

  function sceneSurfer(ctx) {
    sky(ctx, [[0, '#ffd9a0'], [0.5, '#ffb37a'], [0.62, '#5ec8d8'], [1, '#0a7a9a']]);
    sunDisc(ctx, 900, 220, 70, '#fff8d0', 'rgba(255,200,110,0.5)');
    /* Sea + waves. */
    ctx.fillStyle = '#0f8ab0';
    ctx.fillRect(0, 500, W, 170);
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.ellipse(180 + i * 220, 540 + (i % 2) * 40, 150, 12, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    /* Sand. */
    ctx.fillStyle = '#f2dcb0';
    ctx.fillRect(0, 670, W, 230);
    /* Surfer carrying the board under one arm, walking up the sand. */
    ctx.save();
    ctx.translate(580, 700);
    ctx.scale(1.45, 1.45);
    /* Board, held diagonally under the right arm. */
    ctx.save();
    ctx.translate(48, -30);
    ctx.rotate(-0.5);
    ctx.fillStyle = '#ff2e63';
    ctx.beginPath();
    ctx.ellipse(0, 0, 150, 26, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffd23f';
    ctx.beginPath();
    ctx.ellipse(-70, 0, 60, 26, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    /* Figure: dark wetsuit, sun-bleached hair. */
    ctx.fillStyle = '#1d2a33';
    ctx.beginPath();
    ctx.moveTo(-58, 60);
    ctx.quadraticCurveTo(-64, -60, -20, -78);
    ctx.lineTo(20, -78);
    ctx.quadraticCurveTo(64, -60, 58, 60);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#e8b48f';
    ctx.beginPath();
    ctx.arc(0, -108, 34, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f2e3b0';
    ctx.beginPath();
    ctx.arc(0, -118, 36, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#e8b48f';
    ctx.lineWidth = 18;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-40, -40);
    ctx.lineTo(-70, 40);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(40, -40);
    ctx.lineTo(64, -6);
    ctx.stroke();
    ctx.restore();
    palm(ctx, 1050, 720, 1.05, 0.12, '#4a2c14', '#2a4a1e');
    palm(ctx, 120, 730, 0.9, -0.12, '#4a2c14', '#2a4a1e');
  }

  function sceneMarket(ctx) {
    sky(ctx, [[0, '#0d0518'], [0.6, '#2a0a3a'], [1, '#4a1440']]);
    /* String lights. */
    ctx.strokeStyle = 'rgba(255,210,63,0.7)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, 120);
    ctx.quadraticCurveTo(600, 260, 1200, 110);
    ctx.stroke();
    for (let i = 0; i < 14; i++) {
      const t = i / 13;
      const x = t * W;
      const y = 120 + Math.sin(t * Math.PI) * 110;
      ctx.fillStyle = i % 3 === 0 ? '#ff2e63' : i % 3 === 1 ? '#ffd23f' : '#00e5ff';
      ctx.beginPath();
      ctx.arc(x, y + 14, 9, 0, Math.PI * 2);
      ctx.fill();
    }
    /* Stalls with striped awnings. */
    for (let i = 0; i < 3; i++) {
      const x = 60 + i * 380;
      ctx.fillStyle = '#2a1440';
      ctx.fillRect(x, 420, 300, 300);
      for (let s = 0; s < 6; s++) {
        ctx.fillStyle = s % 2 ? '#f2ede2' : '#ff2e63';
        ctx.beginPath();
        ctx.moveTo(x + s * 50, 420);
        ctx.lineTo(x + s * 50 + 50, 420);
        ctx.lineTo(x + s * 50 + 38, 480);
        ctx.lineTo(x + s * 50 + 12, 480);
        ctx.closePath();
        ctx.fill();
      }
      ctx.fillStyle = '#ffd23f';
      ctx.fillRect(x + 20, 540, 260, 44);
      ctx.fillStyle = '#1d0b26';
      ctx.font = 'bold 26px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(['TACOS', 'FRUIT', 'FLOWERS'][i], x + 150, 572);
    }
    neonText(ctx, 'NIGHT MARKET', 600, 330, 72, '#ffd23f');
    /* Warm lantern glow on the ground. */
    ctx.fillStyle = 'rgba(255,180,60,0.18)';
    ctx.fillRect(0, 720, W, 180);
    crowd(ctx, 880, 8, '#0d0518');
  }

  const SCENES = [
    ['car-sunset', sceneCarSunset],
    ['woman-car', sceneWomanCar],
    ['boardwalk', sceneBoardwalk],
    ['fisherman', sceneFisherman],
    ['classic-street', sceneClassicStreet],
    ['palms', scenePalms],
    ['beach', sceneBeach],
    ['skyline', sceneSkyline],
    ['surfer', sceneSurfer],
    ['market', sceneMarket],
  ];

  /** Draw every scene to its own canvas and publish the JPEG data URLs. */
  function generate() {
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    const out = [];
    for (const [name, draw] of SCENES) {
      ctx.clearRect(0, 0, W, H);
      ctx.save();
      draw(ctx);
      ctx.restore();
      out.push({ name, data: canvas.toDataURL('image/jpeg', 0.88) });
    }
    window.__genDone = out;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', generate);
  } else {
    generate();
  }
})();
