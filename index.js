import "./style.css";

import JSZip from "jszip";
import { saveAs } from "file-saver";

import cv from "@techstark/opencv-js";

// ===== APP =====

const app =
  document.querySelector("#app");

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

    <button id="reanalyzeBtn">
      區域AI重分析
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

  <div class="canvas-wrap">

    <canvas id="canvas"></canvas>

  </div>

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

const reanalyzeBtn =
  document.getElementById(
    "reanalyzeBtn"
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

let selectedBoxes = [];

let dragging = -1;
let resizing = -1;

let selecting = false;

let selectionRect = null;

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

        selectedBoxes = [];

        draw();
      };

    reader.readAsDataURL(file);
  }
);

// ===== Load =====

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

async function autoDetect() {

  if (!image)
    return;

  statusText.innerText =
    "AI分析中...";

  try {

    cropBoxes = [];

    const temp =
      document.createElement(
        "canvas"
      );

    temp.width =
      canvas.width;

    temp.height =
      canvas.height;

    const tctx =
      temp.getContext("2d");

    tctx.drawImage(
      image,
      0,
      0,
      canvas.width,
      canvas.height
    );

    const src =
      cv.imread(temp);

    const gray =
      new cv.Mat();

    const thresh =
      new cv.Mat();

    const contours =
      new cv.MatVector();

    const hierarchy =
      new cv.Mat();

    cv.cvtColor(
      src,
      gray,
      cv.COLOR_RGBA2GRAY
    );

    cv.threshold(
      gray,
      thresh,
      240,
      255,
      cv.THRESH_BINARY_INV
    );

    cv.findContours(
      thresh,
      contours,
      hierarchy,
      cv.RETR_EXTERNAL,
      cv.CHAIN_APPROX_SIMPLE
    );

    for (
      let i = 0;
      i < contours.size();
      i++
    ) {

      const cnt =
        contours.get(i);

      const rect =
        cv.boundingRect(cnt);

      if (
        rect.width < 40 ||
        rect.height < 40
      ) continue;

      cropBoxes.push({

        x: rect.x,
        y: rect.y,

        width:
          rect.width,

        height:
          rect.height
      });
    }

    src.delete();
    gray.delete();
    thresh.delete();
    contours.delete();
    hierarchy.delete();

    statusText.innerText =
      `AI偵測完成：
      ${cropBoxes.length} 個貼圖`;

    draw();

  } catch(err) {

    console.error(err);

    statusText.innerText =
      "AI分析失敗";
  }
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
    (box, index) => {

      const selected =
        selectedBoxes.includes(
          index
        );

      ctx.strokeStyle =
        selected
          ? "#00ffff"
          : "#00ff88";

      ctx.lineWidth =
        selected ? 5 : 3;

      ctx.strokeRect(

        box.x,
        box.y,

        box.width,
        box.height
      );

      // ===== selected =====

      if (selected) {

        ctx.fillStyle =
          "rgba(0,255,255,0.15)";

        ctx.fillRect(

          box.x,
          box.y,

          box.width,
          box.height
        );
      }

      // ===== resize =====

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
        "#fff";

      ctx.fill();

      ctx.strokeStyle =
        "#000";

      ctx.stroke();

      // ===== delete =====

      ctx.fillStyle =
        "#ff3b30";

      ctx.fillRect(

        box.x - 14,
        box.y - 14,

        28,
        28
      );

      ctx.fillStyle =
        "#fff";

      ctx.font =
        "20px sans-serif";

      ctx.textAlign =
        "center";

      ctx.textBaseline =
        "middle";

      ctx.fillText(
        "×",
        box.x,
        box.y + 1
      );
    }
  );

  // ===== selection rect =====

  if (
    selecting &&
    selectionRect
  ) {

    ctx.strokeStyle =
      "#00ffff";

    ctx.lineWidth = 2;

    ctx.setLineDash([8]);

    ctx.strokeRect(

      selectionRect.x,
      selectionRect.y,

      selectionRect.width,
      selectionRect.height
    );

    ctx.setLineDash([]);
  }
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

// ===== Mouse Down =====

canvas.addEventListener(
  "mousedown",
  (e) => {

    const pos =
      getPos(e);

    if (!e.shiftKey) {

      selectedBoxes = [];
    }

    for (
      let i =
        cropBoxes.length - 1;
      i >= 0;
      i--
    ) {

      const box =
        cropBoxes[i];

      // ===== delete =====

      if (

        pos.x >
          box.x - 14 &&

        pos.x <
          box.x + 14 &&

        pos.y >
          box.y - 14 &&

        pos.y <
          box.y + 14

      ) {

        cropBoxes.splice(i, 1);

        draw();

        return;
      }

      // ===== resize =====

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
        ) < handleSize

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

      // ===== select =====

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

        if (
          !selectedBoxes.includes(i)
        ) {

          selectedBoxes.push(i);
        }

        dragging = i;

        offsetX =
          pos.x - box.x;

        offsetY =
          pos.y - box.y;

        draw();

        return;
      }
    }

    // ===== group select =====

    selecting = true;

    selectionRect = {

      x: pos.x,
      y: pos.y,

      width: 0,
      height: 0
    };

    startX = pos.x;
    startY = pos.y;
  }
);

// ===== Mouse Move =====

canvas.addEventListener(
  "mousemove",
  (e) => {

    const pos =
      getPos(e);

    // ===== selection =====

    if (
      selecting &&
      selectionRect
    ) {

      selectionRect.width =
        pos.x - startX;

      selectionRect.height =
        pos.y - startY;

      draw();

      return;
    }

    // ===== drag =====

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

    // ===== resize =====

    if (resizing !== -1) {

      const box =
        cropBoxes[
          resizing
        ];

      box.width =
        Math.max(
          50,
          startWidth +
          (pos.x - startX)
        );

      box.height =
        Math.max(
          50,
          startHeight +
          (pos.y - startY)
        );

      draw();
    }
  }
);

// ===== Mouse Up =====

window.addEventListener(
  "mouseup",
  () => {

    if (
      selecting &&
      selectionRect
    ) {

      const x1 =
        Math.min(
          selectionRect.x,
          selectionRect.x +
          selectionRect.width
        );

      const y1 =
        Math.min(
          selectionRect.y,
          selectionRect.y +
          selectionRect.height
        );

      const x2 =
        Math.max(
          selectionRect.x,
          selectionRect.x +
          selectionRect.width
        );

      const y2 =
        Math.max(
          selectionRect.y,
          selectionRect.y +
          selectionRect.height
        );

      selectedBoxes = [];

      cropBoxes.forEach(
        (box, index) => {

          if (

            box.x >= x1 &&
            box.y >= y1 &&

            box.x +
              box.width <= x2 &&

            box.y +
              box.height <= y2

          ) {

            selectedBoxes.push(
              index
            );
          }
        }
      );
    }

    dragging = -1;
    resizing = -1;

    selecting = false;

    selectionRect = null;

    draw();
  }
);

// ===== Delete =====

window.addEventListener(
  "keydown",
  (e) => {

    if (
      e.key !== "Delete"
    ) return;

    cropBoxes =
      cropBoxes.filter(
        (_, index) =>

          !selectedBoxes.includes(
            index
          )
      );

    selectedBoxes = [];

    draw();
  }
);

// ===== Buttons =====

detectBtn.addEventListener(
  "click",
  async () => {

    await autoDetect();
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

// ===== Reanalyze =====

reanalyzeBtn.addEventListener(
  "click",
  async () => {

    if (
      selectedBoxes.length === 0
    ) {

      statusText.innerText =
        "請先選擇裁切框";

      return;
    }

    statusText.innerText =
      "區域AI分析中...";

    selectedBoxes.sort(
      (a, b) => b - a
    );

    selectedBoxes.forEach(
      (i) => {

        cropBoxes.splice(i, 1);
      }
    );

    selectedBoxes = [];

    await autoDetect();

    draw();

    statusText.innerText =
      "區域AI分析完成";
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
        out.getContext(
          "2d",
          {

            alpha: true
          }
        );

      octx.clearRect(
        0,
        0,
        width,
        height
      );

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

              (blob) => {

                resolve(blob);

              },

              "image/png",

              1.0
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

        type: "blob"
      });

    saveAs(

      zipBlob,

      "line-stickers.zip"
    );
  }
);

draw();