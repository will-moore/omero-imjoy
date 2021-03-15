
function openDialog() {
    document.getElementById("dialog-container").classList.add("active");
}

function closeDialog() {
    document.getElementById("dialog-container").classList.remove("active");
}


var windows = {};
function addWindow(w) {
    windows = windows || {};
    windows[w.window_id] = w;
    var title = w.name,
        id = w.window_id;
    document.getElementById("windows-menu").innerHTML =
        `
            <span class="chip pointer window-chip" id="header_${id}" onclick="selectWindow('${id}')">
                ${title}
                <a href="#" onclick="removeWindow('${id}')" class="btn btn-clear" aria-label="Close" role="button"></a>
            </span>` + document.getElementById("windows-menu").innerHTML;

    document.getElementById("whiteboard").innerHTML =
        `
                <div class="window_id" id="${id}"></div>
            ` + document.getElementById("whiteboard").innerHTML;
    window.onresize();
    updateWindowChips();
    selectWindow(id);
}

function updateWindowChips() {
    // only display when there is more than one window open
    if (Object.keys(windows).length > 1) {
        var ws = document.querySelectorAll(".window-chip");
        for (let w of ws) {
            w.style.display = "inline-flex";
        }
    } else {
        const keys = Object.keys(windows);
        if (
            keys.length >= 1 &&
            (windows[keys[0]].standalone || windows[keys[0]].fullscreen)
        )
            var ws = document.querySelectorAll(".window-chip");
        if (ws) {
            for (let w of ws) {
                w.style.display = "none";
            }
        }
    }
}

async function removeWindow(id) {
    if (windows[id]) {
        try {
            await windows[id].close();
        } finally {
            delete windows[id];
            updateWindowChips();
        }
    }
    document
        .getElementById("windows-menu")
        .removeChild(document.getElementById("header_" + id));
    document
        .getElementById("whiteboard")
        .removeChild(document.getElementById(id));
    if (document.getElementById("whiteboard").children.length === 1) {
        document.getElementById("empty-img").style.display = "block";
    }
}

function selectWindow(id) {
    if (!document.getElementById(id)) return;
    for (let c of document.getElementById("whiteboard").children) {
        if (c.id !== "site-title") {
            c.style.display = "none";
        }
    }
    for (let c of document.getElementById("windows-menu").children)
        c.classList.remove("active");
    selected_window = id;
    document.getElementById(id).style.display = "block";
    document.getElementById("header_" + id).classList.add("active");
}

var selected_window = null;
var imjoy = null;

var imjoy_api = {
    showMessage(plugin, info, duration) {
        console.log(info);
    },
    showProgress(plugin, progress) {
        if (progress < 1) progress = progress * 100;
        document.getElementById("progress").value = progress;
        if (progress <= 0) {
            document.getElementById("progress").style.display = "none";
        } else {
            document.getElementById("progress").style.display = "block";
        }
    },
    showDialog(_plugin, config) {
        return new Promise((resolve, reject) => {
            document.getElementById("window-dialog-container").innerHTML = "";
            if (config.ui) {
                openDialog();
                const joy_config = {
                    container: document.getElementById("window-dialog-container"),
                    init: config.ui || "", //"{id:'localizationWorkflow', type:'ops'} " + // a list of ops
                    data: config.data, // || Joy.loadFromURL(),
                    modules: config.modules || ["instructions", "math"],
                    onexecute: config.onexecute,
                    onupdate: config.onupdate,
                };
                try {
                    new imjoyCore.Joy(joy_config);
                } catch (e) {
                    console.error("error occured when loading the workflow", e);
                    joy_config.data = "";
                    new imjoyCore.Joy(joy_config);
                    throw e;
                }
            } else if (config.type) {
                openDialog();
                config.window_id = "window-dialog-container";
                config.standalone = true;
                if (config.type.startsWith("imjoy/")) {
                    config.render = wconfig => { };
                }
                setTimeout(() => {
                    imjoy.pm
                        .createWindow(null, config)
                        .then(api => {
                            const _close = api.close;
                            api.close = async () => {
                                await _close();
                                closeDialog();
                            };
                            resolve(api);
                        })
                        .catch(reject);
                }, 0);
            } else {
                alert("Unsupported dialog type.");
            }
        });
    },
};

