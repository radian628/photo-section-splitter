window.onerror = function (err, url, line, col, errObj) {
    let errorWarning = document.getElementById("error-warning");
    let errorMessage = document.getElementById("error-message");
    errorWarning.style.display = "block";
    errorMessage.style.display = "block";
    errorMessage.innerHTML = `Error: ${err}<br>
    URL: ${url}<br>
    Line #: ${line}<br>
    Column #: ${col}<br>
    Description: ${errObj ? errObj.toString() : errObj}`;
}

let cameraCanvas = document.getElementById("camera-canvas");
let cameraContext = cameraCanvas.getContext("2d");
let cameraPhotos = document.getElementById("camera-photos");

let videoElement = document.createElement("video");
videoElement.autoplay = true;

let mode = "photo";

let contrastFilter = new GLFilter(`
    precision mediump float;

    uniform sampler2D uTexture;
    varying vec2 vTexCoords;

    uniform float uAmount;

    void main(void) {
        vec4 col = texture2D(uTexture, vTexCoords);
        gl_FragColor = vec4((col.rgb - vec3(0.5)) * uAmount + vec3(0.5), col.a);
    }
`);

let brightnessFilter = new GLFilter(`
    precision mediump float;

    uniform sampler2D uTexture;
    varying vec2 vTexCoords;

    uniform float uAmount;

    void main(void) {
        vec4 col = texture2D(uTexture, vTexCoords);
        gl_FragColor = vec4(col.rgb * uAmount, col.a);
    }
`);


function photoLoop() {
    cameraCanvas.width = videoElement.videoWidth;
    cameraCanvas.height = videoElement.videoHeight;
    cameraContext.drawImage(videoElement, 0, 0);
    if (mode == "photo") {
        requestAnimationFrame(photoLoop);
    }
}

function takePicture() {
    let img = new Image();
    img.src = cameraCanvas.toDataURL();
    cameraPhotos.appendChild(img);
    img.onclick = function (e) {
        if (mode == "crop") {
            imageIndex = Array.from(img.parentElement.children).indexOf(img);
            brightnessInput.value = croppedRects[imageIndex].brightness;
            contrastInput.value = croppedRects[imageIndex].contrast;
        }
    }
}

document.getElementById("take-picture").onclick = takePicture;

async function getCamera() {
    let devices = await navigator.mediaDevices.getUserMedia({ video: true });
    videoElement.srcObject = devices;
    photoLoop();
}

getCamera();


let croppingCanvas = document.getElementById("cropping-canvas");
let croppingContext = croppingCanvas.getContext("2d");
let brightnessInput = document.getElementById("brightness");
let contrastInput = document.getElementById("contrast");


brightnessInput.addEventListener("change", function (e) {
    croppedRects[imageIndex].brightness = brightnessInput.value;
});
contrastInput.addEventListener("change", function (e) {
    croppedRects[imageIndex].contrast = contrastInput.value;
});

let croppedRects = [];
let imageIndex = 0;

let croppingMouseStart = {
    x: 0,
    y: 0
}
let croppingMousePos = {
    x: 0,
    y: 0
}

let croppingMouseDown = false;

croppingCanvas.addEventListener("mousedown", function (e) {
    croppingMouseDown = true;
    croppingMouseStart.x = e.offsetX * croppingCanvas.height / window.innerHeight * 2;
    croppingMouseStart.y = e.offsetY * croppingCanvas.height / window.innerHeight * 2;
});

croppingCanvas.addEventListener("mouseup", function (e) {
    croppingMouseDown = false;
    var rect = {
        x: croppingMouseStart.x,
        y: croppingMouseStart.y,
        w: croppingMousePos.x - croppingMouseStart.x, 
        h: croppingMousePos.y - croppingMouseStart.y
    };
    if (rect.w < 0) {
        rect.x += rect.w;
        rect.w *= -1;
    }
    if (rect.h < 0) {
        rect.y += rect.h;
        rect.h *= -1;
    }
    croppedRects[imageIndex].rects.push(rect);
});

croppingCanvas.addEventListener("mousemove", function (e) {
    croppingMousePos.x = e.offsetX * croppingCanvas.height / window.innerHeight * 2;
    croppingMousePos.y = e.offsetY * croppingCanvas.height / window.innerHeight * 2;
});

croppingCanvas.addEventListener("dblclick", function (e) {
    let x = e.offsetX * croppingCanvas.height / window.innerHeight * 2;
    let y = e.offsetY * croppingCanvas.height / window.innerHeight * 2;

    for (let i = 0; croppedRects[imageIndex].rects.length > i; i++) {
        let rect = croppedRects[imageIndex].rects[i];
        if (x > rect.x && y > rect.y && x < rect.x + rect.w && y < rect.y + rect.h) {
            croppedRects[imageIndex].rects.splice(i, 1);
            i--;
        }
    }
});

function croppingLoop() {
    croppingCanvas.width = videoElement.videoWidth;
    croppingCanvas.height = videoElement.videoHeight;
    if (cameraPhotos.children[imageIndex]) {

        croppingCanvas.style.filter = `brightness(${croppedRects[imageIndex].brightness * 100}%) contrast(${croppedRects[imageIndex].contrast * 100}%)`;

        croppingContext.drawImage(cameraPhotos.children[imageIndex], 0, 0);

        if (croppingMouseDown) {
            croppingContext.fillStyle = "#FFFFFF44";
            croppingContext.strokeStyle = "#00000088";
            croppingContext.beginPath();
            croppingContext.rect(croppingMouseStart.x, croppingMouseStart.y, croppingMousePos.x - croppingMouseStart.x, croppingMousePos.y - croppingMouseStart.y);
            croppingContext.fill();
            croppingContext.stroke();
        }

        croppedRects[imageIndex].rects.forEach(rect => {
            croppingContext.lineWidth = 4;
            croppingContext.strokeStyle = "#FF0000";
            croppingContext.strokeRect(rect.x, rect.y, rect.w, rect.h);
            croppingContext.lineWidth = 2;
            croppingContext.strokeStyle = "#0000FF";
            croppingContext.strokeRect(rect.x, rect.y, rect.w, rect.h);
        });

    }

    if (mode == "crop") {
        requestAnimationFrame(croppingLoop);
    }
}

function continueCroppingStep() {
    mode = "crop";
    for (let i = 0; cameraPhotos.children.length > i; i++) {
        croppedRects.push({
            rects: [],
            brightness: 1,
            contrast: 1
        });
    }
    document.getElementById("camera-app").style.display = "none";
    document.getElementById("cropping-app").style.display = "";
    document.getElementById("cropping-app").appendChild(cameraPhotos);

    croppingLoop();
}

document.getElementById("continue-cropping-step").onclick = continueCroppingStep;

document.getElementById("dl-cropped-rectangles").onclick = function (e) {
    let dlcounter = 0;

    croppedRects.forEach((rectList, i) => {
        rectList.rects.forEach(rect => {
            dlcounter++;

            let rectCanvas = document.createElement("canvas");
            let rectContext = rectCanvas.getContext("2d");
            rectCanvas.width = rect.w;
            rectCanvas.height = rect.h;

            rectContext.drawImage(cameraPhotos.children[i], rect.x, rect.y, rect.w, rect.h, 0, 0, rectCanvas.width, rectCanvas.height);

            contrastFilter.filter(rectCanvas, Number(rectList.contrast), img => {

                let filteredImageURL = brightnessFilter.filter(img, Number(rectList.brightness), img2 => {

                    let a = document.createElement("a");
                    a.href = img2.src;
                    a.download = `cropped-rectangle-${new Date().getTime()}-${dlcounter}.png`;
                    a.click();    

                });

            });

        });
    });
}
