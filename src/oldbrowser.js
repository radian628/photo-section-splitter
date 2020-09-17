let outdatedBrowserWarning = document.getElementById("outdated-browser-warning");

function outdatedBrowserMessage() {
    outdatedBrowserWarning.style.display = "block";
}

try {
    WebGLRenderingContext;
    Promise;
    navigator.mediaDevices.getUserMedia;
    eval("class x {}; let y = () => {}; let z = `template literal`;");
} catch (err) {
    outdatedBrowserMessage();
}

