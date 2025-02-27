//https://github.com/satorioh/yolov8_onnx_js

const video = document.querySelector("video");
const worker = new Worker("worker.js");
const yolo_classes = [
  "person", "bicycle", "car", "motorbike", "aeroplane", "bus", "train", "truck",
  "boat", "traffic light", "fire hydrant", "stop sign", "parking meter", "bench",
  "bird", "cat", "dog", "horse", "sheep", "cow", "elephant", "bear", "zebra",
  "giraffe", "backpack", "umbrella", "handbag", "tie", "suitcase", "frisbee",
  "skis", "snowboard", "sports ball", "kite", "baseball bat", "baseball glove",
  "skateboard", "surfboard", "tennis racket", "bottle", "wine glass", "cup",
  "fork", "knife", "spoon", "bowl", "banana", "apple", "sandwich", "orange",
  "broccoli", "carrot", "hot dog", "pizza", "donut", "cake", "chair", "sofa",
  "potted plant", "bed", "dining table", "toilet", "TV", "laptop", "mouse",
  "remote", "keyboard", "cell phone", "microwave", "oven", "toaster", "sink",
  "refrigerator", "book", "clock", "vase", "scissors", "teddy bear", "hair drier",
  "toothbrush"
];

const class_colors = [
  "#F4A460", "#8FBC8F", "#4682B4", "#B0C4DE", "#D8BFD8", "#5F9EA0", "#FF6347", "#FFD700", 
  "#9ACD32", "#20B2AA", "#6495ED", "#6A5ACD", "#708090", "#C71585", "#DB7093", "#A9A9A9",
  "#2E8B57", "#556B2F", "#8B4513", "#D2691E", "#CD853F", "#DAA520", "#32CD32", "#87CEEB",
  "#4169E1", "#8A2BE2", "#9400D3", "#BA55D3", "#FF4500", "#FF8C00", "#FFA07A", "#FFA500",
  "#B22222", "#DC143C", "#FF0000", "#FF69B4", "#FF1493", "#FFB6C1", "#FFC0CB", "#ADFF2F",
  "#7FFF00", "#00FF00", "#7CFC00", "#00FA9A", "#00FF7F", "#3CB371", "#2E8B57", "#66CDAA",
  "#00CED1", "#4682B4", "#1E90FF", "#5F9EA0", "#00BFFF", "#ADD8E6", "#87CEFA", "#4682B4",
  "#B0C4DE", "#708090", "#778899", "#6A5ACD", "#483D8B", "#7B68EE", "#9370DB", "#8A2BE2",
  "#9400D3", "#9932CC", "#BA55D3", "#DA70D6", "#EE82EE", "#DDA0DD", "#C71585", "#DB7093",
  "#FF1493", "#FF69B4", "#FFB6C1", "#FFC0CB", "#FAEBD7", "#F5F5DC", "#FFE4C4", "#FFF8DC"
];

let interval;
let boxes = [];
let busy = false;
let inferCount = 0;
let totalInferTime = 0;
let drawBox = false;

window.navigator.mediaDevices
  .getUserMedia({
    video: {
      facingMode: 'environment'
    }
  })
  .then((stream) => {
    video.srcObject = stream;
  })
  .catch((error) => {
    alert("You have to give browser the Webcam permission to run detection");
  });

video.addEventListener("play", () => {
  const canvas = document.querySelector("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  changeP5CanvasSize(canvas.width, canvas.height);
  const context = canvas.getContext("2d");
  interval = setInterval(() => {
    // console.log("interval");
    context.drawImage(video, 0, 0);
    // draw_boxes(canvas, boxes);
    drawBox = true;
    const input = prepare_input(canvas);
    if (!busy) {
      const startTime = performance.now();
      worker.postMessage({ input, startTime });
      busy = true;
    }
  }, 30);
});

video.addEventListener("pause", () => {
  clearInterval(interval);
});

const playBtn = document.getElementById("play");
const pauseBtn = document.getElementById("pause");
playBtn.addEventListener("click", () => {
  video.play();
});
pauseBtn.addEventListener("click", () => {
  video.pause();
});

worker.onmessage = (event) => {
  const output = event.data;
  if (output.type === "modelLoaded") {
    document.getElementById("loading").style.display = "none";
    document.getElementById("btn-group").style.display = "block";
  } else if (output.type === "modelResult") {
    const endTime = performance.now();
    const inferTime = endTime - output.startTime;
    inferCount++;
    totalInferTime += inferTime;
    const averageInferTime = parseInt(totalInferTime / inferCount);
    // console.log(`Infer count: ${inferCount}`);
    // console.log(`Average infer time: ${averageInferTime} ms`);

    const canvas = document.querySelector("canvas");
    boxes = process_output(output.result, canvas.width, canvas.height);
    busy = false;
  }
};

function prepare_input(img) {
  const canvas = document.createElement("canvas");
  canvas.width = 640;
  canvas.height = 640;
  const context = canvas.getContext("2d");
  context.drawImage(img, 0, 0, 640, 640);

  const data = context.getImageData(0, 0, 640, 640).data;
  const red = [],
    green = [],
    blue = [];
  for (let index = 0; index < data.length; index += 4) {
    red.push(data[index] / 255);
    green.push(data[index + 1] / 255);
    blue.push(data[index + 2] / 255);
  }
  return [...red, ...green, ...blue];
}

function process_output(output, img_width, img_height) {
  let boxes = [];
  const num_objects = 8400; // Number of detection points
  const num_classes = yolo_classes.length; // Number of classes
  const feature_dim = 84; // New feature dimension (xc, yc, w, h + 80 classes probabilities)

  for (let index = 0; index < num_objects; index++) {
    const [class_id, prob] = [...Array(num_classes).keys()]
      .map((col) => [col, output[num_objects * (col + 4) + index]])
      .reduce((accum, item) => (item[1] > accum[1] ? item : accum), [0, 0]);

    if (prob < 0.3) {
      continue;
    }

    const label = yolo_classes[class_id];
    const xc = output[index]; // Center X
    const yc = output[num_objects + index]; // Center Y
    const w = output[2 * num_objects + index]; // Width
    const h = output[3 * num_objects + index]; // Height
    const class_color = class_colors[class_id];

    const x1 = ((xc - w / 2) / 640) * img_width;
    const y1 = ((yc - h / 2) / 640) * img_height;
    const x2 = ((xc + w / 2) / 640) * img_width;
    const y2 = ((yc + h / 2) / 640) * img_height;

    boxes.push([x1, y1, x2, y2, label, prob, class_color]);
  }

  boxes = boxes.sort((box1, box2) => box2[5] - box1[5]);
  const result = [];
  while (boxes.length > 0) {
    result.push(boxes[0]);
    boxes = boxes.filter((box) => iou(boxes[0], box) < 0.7);
  }
  return result;
}

function iou(box1, box2) {
  return intersection(box1, box2) / union(box1, box2);
}

function union(box1, box2) {
  const [box1_x1, box1_y1, box1_x2, box1_y2] = box1;
  const [box2_x1, box2_y1, box2_x2, box2_y2] = box2;
  const box1_area = (box1_x2 - box1_x1) * (box1_y2 - box1_y1);
  const box2_area = (box2_x2 - box2_x1) * (box2_y2 - box2_y1);
  return box1_area + box2_area - intersection(box1, box2);
}

function intersection(box1, box2) {
  const [box1_x1, box1_y1, box1_x2, box1_y2] = box1;
  const [box2_x1, box2_y1, box2_x2, box2_y2] = box2;
  const x1 = Math.max(box1_x1, box2_x1);
  const y1 = Math.max(box1_y1, box2_y1);
  const x2 = Math.min(box1_x2, box2_x2);
  const y2 = Math.min(box1_y2, box2_y2);
  return (x2 - x1) * (y2 - y1);
}

// function draw_boxes(canvas, boxes) {
//   const ctx = canvas.getContext("2d");
//   ctx.strokeStyle = "#00FF00";
//   ctx.lineWidth = 3;
//   ctx.font = "18px serif";
//   boxes.forEach(([x1, y1, x2, y2, label]) => {
//     ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
//     ctx.fillStyle = "#00ff00";
//     const width = ctx.measureText(label).width;
//     ctx.fillRect(x1, y1, width + 10, 25);
//     ctx.fillStyle = "#000000";
//     ctx.fillText(label, x1, y1 + 18);
//   });

//   // 绘制 Infer count 和 Average infer time
//   ctx.font = "16px Arial";
//   ctx.fillStyle = "black";
//   ctx.fillText(`Infer count: ${inferCount}`, 10, 20);
//   ctx.fillText(
//     `Average infer time: ${inferCount ? parseInt(totalInferTime / inferCount) : 0
//     } ms`,
//     10,
//     40,
//   );
// }
