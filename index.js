import "./style.css";

import JSZip from "jszip";
import { saveAs } from "file-saver";

// ===== PWA =====

if ("serviceWorker" in navigator) {

  window.addEventListener(
    "load",
    () => {

      navigator.serviceWorker.register(
        "/sw.js"
      );
    }
  );
}

// ===== App =====

const app =
  document.querySelector(
    "#app"
  );

app.innerHTML = `

<div class="container">

  <h1>
    LINE貼圖 AI 工作站 PRO
  </h1>

  <div class="toolbar">

    <input
      type="file"
      id="upload"
      accept="image/*"
    />

    <button id="detectBtn">
      AI偵測
    </button>

    <button id="addBtn">
      新增框
    </button>

    <button id="exportBtn">
      匯出ZIP
    </button>

  </div>

  <div class="toolbar">

    <select id="mode">

      <option value="main">
        主貼圖 370x320
      </option>

      <option value="tab">
        Tab 240x240
      </option>

      <option value="chat">
        Chat 96x74
      </option>

      <option value="original">
        原始尺寸
      </option>

    </select>

  </div>

  <p id="status">
    等待圖片...
  </p>

  <canvas id="canvas"></canvas>

  <div id="results"></div>

</div>
`;

const canvas =
  document.getElementById(
    "canvas"
  );

const ctx =
  canvas.getContext("2d");

const upload =
  document.getElementById(
    "upload"
  );

const detectBtn =
  document.getElementById(
    "detectBtn"
  );

const addBtn =
  document.getElementById(
    "addBtn"
  );

const exportBtn =
  document.getElementById(
    "exportBtn"
  );

const modeSelect =
  document.getElementById(
    "mode"
  );

const statusText =
  document.getElementById(
    "status"
  );

const results =
  document.getElementById(
    "results"
  );

let image = null;

let cropBoxes = [];

let dragging = -1;
let resizing = -1;

let offsetX = 0;
let offsetY = 0;

let startX = 0;
let startY = 0;

let startWidth = 0;
let startHeight = 0;

const handleSize = 28;

// ===== Upload =====

upload.addEventListener(
  "change",
  async (e) => {

    const file =
      e.target.files[0];

    if (!file)
      return;

    const reader =
      new FileReader();

    reader.onload =
      async (ev) => {

        image =
          await loadImage(
            ev.target.result
          );

        // ===== 保持比例 =====

        const maxWidth = 1400;

        const scale =
          Math.min(
            1,
            maxWidth /
              image.width
          );

        canvas.width =
          image.width *
          scale;

        canvas.height =
          image.height *
          scale;

        cropBoxes = [];

        autoDetect();

        draw();
      };

    reader.readAsDataURL(file);
  }
);

// ===== Image =====

function loadImage(src) {

  return new Promise(
    (resolve) => {

      const img =
        new Image();

      img.onload =
        () => resolve(img);

      img.src = src;
    }
  );
}

// ===== AI Detect =====

function autoDetect() {

  if (!image)
    return;

  cropBoxes = [];

  const cols = 4;
  const rows = 4;

  const gap = 20;

  const w =
    canvas.width /
      cols -
    gap;

  const h =
    canvas.height /
      rows -
    gap;

  for (
    let y = 0;
    y < rows;
    y++
  ) {

    for (
      let x = 0;
      x < cols;
      x++
    ) {

      cropBoxes.push({

        x:
          x *
            (w + gap) +
          gap / 2,

        y:
          y *
            (h + gap) +
          gap / 2,

        width: w,
        height: h
      });
    }
  }

  statusText.innerText =
    `已建立 ${cropBoxes.length} 個貼圖框`;
}

// ===== Draw =====

function draw() {

  ctx.clearRect(
    0,
    0,
    canvas.width,
    canvas.height
  );

  if (!image)
    return;

  ctx.drawImage(
    image,
    0,
    0,
    canvas.width,
    canvas.height
  );

  cropBoxes.forEach(
    (box) => {

      ctx.strokeStyle =
        "#00ff88";

      ctx.lineWidth = 3;

      ctx.strokeRect(
        box.x,
        box.y,
        box.width,
        box.height
      );

      // ===== Handle =====

      ctx.beginPath();

      ctx.arc(
        box.x +
          box.width,
        box.y +
          box.height,
        handleSize / 2,
        0,
        Math.PI * 2
      );

      ctx.fillStyle =
        "#ffffff";

      ctx.fill();

      ctx.strokeStyle =
        "#000";

      ctx.stroke();
    }
  );
}

// ===== Position =====

function getPos(e) {

  const rect =
    canvas.getBoundingClientRect();

  const scaleX =
    canvas.width /
    rect.width;

  const scaleY =
    canvas.height /
    rect.height;

  return {

    x:
      (e.clientX -
        rect.left) *
      scaleX,

    y:
      (e.clientY -
        rect.top) *
      scaleY
  };
}

// ===== Mouse =====

canvas.addEventListener(
  "mousedown",
  (e) => {

    const pos =
      getPos(e);

    for (
      let i =
        cropBoxes.length -
        1;
      i >= 0;
      i--
    ) {

      const box =
        cropBoxes[i];

      // ===== Resize =====

      const dx =
        pos.x -
        (box.x +
          box.width);

      const dy =
        pos.y -
        (box.y +
          box.height);

      if (
        Math.sqrt(
          dx * dx +
            dy * dy
        ) <
        handleSize
      ) {

        resizing = i;

        startX = pos.x;
        startY = pos.y;

        startWidth =
          box.width;

        startHeight =
          box.height;

        return;
      }

      // ===== Drag =====

      if (

        pos.x > box.x &&
        pos.x <
          box.x +
            box.width &&

        pos.y > box.y &&
        pos.y <
          box.y +
            box.height

      ) {

        dragging = i;

        offsetX =
          pos.x - box.x;

        offsetY =
          pos.y - box.y;

        return;
      }
    }
  }
);

canvas.addEventListener(
  "mousemove",
  (e) => {

    const pos =
      getPos(e);

    // ===== Drag =====

    if (dragging !== -1) {

      const box =
        cropBoxes[
          dragging
        ];

      box.x =
        pos.x - offsetX;

      box.y =
        pos.y - offsetY;

      draw();
    }

    // ===== Resize =====

    if (resizing !== -1) {

      const box =
        cropBoxes[
          resizing
        ];

      box.width =
        Math.max(
          50,
          startWidth +
            (pos.x -
              startX)
        );

      box.height =
        Math.max(
          50,
          startHeight +
            (pos.y -
              startY)
        );

      draw();
    }
  }
);

window.addEventListener(
  "mouseup",
  () => {

    dragging = -1;
    resizing = -1;
  }
);

// ===== Touch =====

canvas.addEventListener(
  "touchstart",
  (e) => {

    e.preventDefault();

    const touch =
      e.touches[0];

    canvas.dispatchEvent(
      new MouseEvent(
        "mousedown",
        {

          clientX:
            touch.clientX,

          clientY:
            touch.clientY
        }
      )
    );
  },
  { passive:false }
);

canvas.addEventListener(
  "touchmove",
  (e) => {

    e.preventDefault();

    const touch =
      e.touches[0];

    canvas.dispatchEvent(
      new MouseEvent(
        "mousemove",
        {

          clientX:
            touch.clientX,

          clientY:
            touch.clientY
        }
      )
    );
  },
  { passive:false }
);

canvas.addEventListener(
  "touchend",
  () => {

    window.dispatchEvent(
      new MouseEvent(
        "mouseup"
      )
    );
  }
);

// ===== Buttons =====

detectBtn.addEventListener(
  "click",
  () => {

    autoDetect();

    draw();
  }
);

addBtn.addEventListener(
  "click",
  () => {

    cropBoxes.push({

      x: 100,
      y: 100,

      width: 200,
      height: 200
    });

    draw();
  }
);

// ===== Export =====

exportBtn.addEventListener(
  "click",
  async () => {

    if (!image)
      return;

    const zip =
      new JSZip();

    results.innerHTML = "";

    for (
      let i = 0;
      i < cropBoxes.length;
      i++
    ) {

      const box =
        cropBoxes[i];

      let width =
        box.width;

      let height =
        box.height;

      if (
        modeSelect.value ===
        "main"
      ) {

        width = 370;
        height = 320;
      }

      if (
        modeSelect.value ===
        "tab"
      ) {

        width = 240;
        height = 240;
      }

      if (
        modeSelect.value ===
        "chat"
      ) {

        width = 96;
        height = 74;
      }

      const out =
        document.createElement(
          "canvas"
        );

      out.width = width;
      out.height = height;

      const octx =
        out.getContext("2d");

      const sx =
        (box.x /
          canvas.width) *
        image.width;

      const sy =
        (box.y /
          canvas.height) *
        image.height;

      const sw =
        (box.width /
          canvas.width) *
        image.width;

      const sh =
        (box.height /
          canvas.height) *
        image.height;

      octx.drawImage(
        image,
        sx,
        sy,
        sw,
        sh,
        0,
        0,
        width,
        height
      );

      const blob =
        await new Promise(
          (resolve) => {

            out.toBlob(
              resolve,
              "image/png"
            );
          }
        );

      zip.file(
        `sticker_${
          i + 1
        }.png`,
        blob
      );

      const img =
        document.createElement(
          "img"
        );

      img.src =
        out.toDataURL();

      img.className =
        "preview";

      results.appendChild(
        img
      );
    }

    const zipBlob =
      await zip.generateAsync({

        type:"blob"
      });

    saveAs(
      zipBlob,
      "line-stickers.zip"
    );
  }
);

draw();