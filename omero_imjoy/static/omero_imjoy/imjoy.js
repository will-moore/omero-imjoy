
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


document.addEventListener("DOMContentLoaded", async event => {
    // pin the version
    window.imjoyCore = await loadImJoyCore({ version: "0.13.60" });
    imjoy = new imjoyCore.ImJoy({
        imjoy_api: imjoy_api,
    });
    imjoy.event_bus.on("show_message", msg => {
        console.log(msg);
    });
    imjoy.event_bus.on("add_window", async w => {
        if (w.fullscreen || w.standalone) {
            document.querySelector(".navbar").style.height = "2px";
            document.getElementById("logo").style.display = "none";
            // document.getElementById("windows-menu").style.display = "none";
        } else {
            document.querySelector(".navbar").style.height = "32px";
            document.getElementById("logo").style.display = "flex";
        }
        addWindow(w);
    });
    const workspace = getUrlParameter("workspace") || getUrlParameter("w");
    const token = getUrlParameter("token") || getUrlParameter("t");
    const engine = getUrlParameter("engine") || getUrlParameter("e");


    await imjoy.start({ workspace: workspace });
    console.log("ImJoy started: ", imjoy);
    let p = getUrlParameter("plugin") || getUrlParameter("p");
    console.log({ p, workspace });
    if (!p && workspace) {
        document.getElementById("loading").style.display = "none";
        return;
    }
    window.loadPlugin = function (p) {
        if (!p)
            p = prompt(
                `Please type a ImJoy plugin URI to start or pass it with ${window
                    .location.href + "?plugin=PLUGIN_URI"}`,
                ""
            );
        if (!p) return;
        document.getElementById("loading").style.display = "block";
        imjoy.pm
            .reloadPluginRecursively({ uri: p })
            .then(async plugin => {
                let config = {};
                if (plugin.config.ui && plugin.config.ui.indexOf("{") > -1) {
                    config = await imjoy.pm.imjoy_api.showDialog(
                        plugin,
                        plugin.config
                    );
                }
                await plugin.api.run({ config: config, data: {} });
                document.getElementById("loading").style.display = "none";
            })
            .catch(e => {
                console.error(e);
                alert(`failed to load the plugin, error: ${e}`);
                document.getElementById("loading").style.display = "none";
            });
    };

    if (engine) {
        try {
            console.log("Loading Jupyter-Engine-Manager from Gist...");
            await imjoy.pm.reloadPluginRecursively({
                uri:
                    "https://imjoy-team.github.io/jupyter-engine-manager/Jupyter-Engine-Manager.imjoy.html",
            });
            console.log("Jupyter-Engine-Manager loaded.");
            const factory = imjoy.em.getFactory("Jupyter-Engine");
            await factory.addEngine({ url: engine, token: token });
            console.log("plugin engine added:", engine);
        } catch (e) {
            console.error(e);
            alert(`Failed to connect to the engine: ${e}`);
        }
    }

    if (p) {
        window.loadPlugin(p);
    }

    imjoy.event_bus.on("plugin_loaded", plugin => {
        //reload the plugin menu
        var plugin_menu = document.getElementById("plugin-menu");
        plugin_menu.innerHTML = "";
        for (let pn in imjoy.pm.plugin_names) {
            plugin_menu.innerHTML =
                `
                    <li class="menu-item"><a href="#" onclick='runPlugin("${pn.replaceAll("'", "`")}")'>${pn}</a></li>
                    ` + plugin_menu.innerHTML;
        }
        plugin_menu.innerHTML =
            plugin_menu.innerHTML +
            '<li class="menu-item"><a href="#" onclick="loadPlugin()"><i class="icon icon-plus"></i>&nbsp;Load Plugin</a></li>';
        plugin_menu.innerHTML =
            plugin_menu.innerHTML +
            '<li class="menu-item"><a href="#" onclick="window.onresize()"><i class="icon icon-stop"></i>&nbsp;Cancel</a></li>';
    });

    window.runPlugin = name => {
        imjoy.pm.plugin_names[name.replaceAll("`", "'")].api.run({ config: {}, data: {} });
    };
});


// fix mobile display
window.onresize = () => {
    document.body.height = window.innerHeight;
    document
        .getElementById("whiteboard")
        .style.setProperty("height", window.innerHeight + "px", "important");
};
window.onresize();
