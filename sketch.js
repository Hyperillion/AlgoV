let canvas1, canvas2;

function setup() {
  canvas1 = createCanvas(video.videoWidth || 640, video.videoHeight || 480);
  canvas2 = createGraphics(video.videoWidth || 640, video.videoHeight || 480);
  canvas1.parent('p5Sketch');
}

function draw() {
  clear();
  image(canvas2, 0, 0);
  canvas2.clear();
  canvas2.background(0, 240);

  if (drawBox) {
    draw_boxes_p5(boxes, inferCount, totalInferTime);
  }
}

function changeP5CanvasSize(width, height) {
  resizeCanvas(width, height);
  canvas2 = createGraphics(width, height);
}

function draw_boxes_p5(boxes, inferCount, totalInferTime) {
  stroke(0, 255, 0); // Green color for the box outline
  strokeWeight(3);
  textSize(18);
  textFont('serif');

  boxes.forEach(([x1, y1, x2, y2, label, prob, class_color]) => {
    console.log(class_color);
    noFill();
    stroke(class_color); // Green color for the
    rect(x1, y1, x2 - x1, y2 - y1); // Draw the rectangle

    canvas2.erase(); // Start erasing the background
    canvas2.rect(x1, y1, x2 - x1, y2 - y1); // Draw the rectangle
    canvas2.noErase(); // Stop erasing the background

    fill(class_color); // Green background for label
    let labelWidth = textWidth(label) + 10;
    rect(x1, y1, labelWidth, 25);

    fill(0); // Black text color
    stroke(255); // Black border color
    text(label, x1 + 5, y1 + 18);
  });

  // Draw Infer count and Average infer time
  textSize(16);
  fill(255); // Black text
  noStroke();
  text(`Infer count: ${inferCount}`, 10, 20);
  let avgTime = inferCount ? int(totalInferTime / inferCount) : 0;
  text(`Average time: ${avgTime} ms`, 10, 40);
}
