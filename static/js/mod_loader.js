const overlay = document.getElementById('overlay_scr');
const customTab = document.getElementById('customTab');
const normalTab = document.getElementById('normalTab');
const customContent = document.getElementById('customContent');
const normalContent = document.getElementById('normalContent');
const selectElement = document.getElementById("modSelect");
const widgetsContainer = document.getElementById("widgetsContainer");

if (overlay) overlay.style.display = 'block';

const viewNormal = () => {
    normalTab.classList.add('active');
    customTab.classList.remove('active');
    normalContent.style.display = 'block';
    customContent.style.display = 'none';
};

const viewCustom = () => {
    customTab.classList.add('active');
    normalTab.classList.remove('active');
    customContent.style.display = 'block';
    normalContent.style.display = 'none';
};

customTab.addEventListener('click', viewCustom);
normalTab.addEventListener('click', viewNormal);
viewNormal();

const toStaticPath = (path) => {
    if (typeof path !== "string") return path;
    return path.startsWith("/static/") ? `..${path}` : path;
};

const getFavourites = () => JSON.parse(window.localStorage.getItem("favourites") || "[]");
const setFavourites = (favs) => window.localStorage.setItem("favourites", JSON.stringify(favs));

window.id_clean = (id) => id.replaceAll(" ", "_").replaceAll("!", "-");
const check_favourite = (val) => getFavourites().includes(val);

const updateTagAttribute = (element, tag, add) => {
    if (!element) return;
    const tags = new Set((element.getAttribute("data-tags") || "").split(" ").filter(Boolean));
    add ? tags.add(tag) : tags.delete(tag);
    element.setAttribute("data-tags", Array.from(tags).join(" "));
};

const add_favourite = (val) => {
    const favs = getFavourites();
    if (!favs.includes(val)) {
        favs.push(val);
        setFavourites(favs);
    }

    const btn = document.querySelector(window.id_clean(`#favourite_${val}_button`));
    if (btn) btn.innerHTML = "<font color='white'>Favourited</font>";

    updateTagAttribute(document.getElementById(window.id_clean(`${val}_select_option`)), "favourite", true);
    reconstruct();
};

const remove_favourite = (val) => {
    const favs = getFavourites();
    const index = favs.indexOf(val);
    if (index > -1) {
        favs.splice(index, 1);
        setFavourites(favs);
    }

    const btn = document.querySelector(window.id_clean(`#favourite_${val}_button`));
    if (btn) btn.innerHTML = "Favourite";

    updateTagAttribute(document.getElementById(window.id_clean(`${val}_select_option`)), "favourite", false);
    reconstruct();
};

window.toggle_fav = (val) => {
    check_favourite(val) ? remove_favourite(val) : add_favourite(val);
};

window.copyModURL = (displayName) => {
    const url = `${window.location.origin}${window.location.pathname}?modName=${displayName}`;
    navigator.clipboard.writeText(url).catch(err => console.error('Failed to copy URL:', err));
};

const createOption = (opt) => {
    const option = document.createElement("option");
    option.value = opt.value;
    option.innerHTML = opt.label;
    option.id = window.id_clean(`${opt.value}_select_option`);

    if (opt.tags) option.setAttribute("data-tags", opt.tags.join(" "));
    if (opt.style) option.setAttribute("style", opt.style);
    if (check_favourite(opt.value)) updateTagAttribute(option, "favourite", true);

    return option;
};

const reconstruct = () => {
    window.originalOptions = options.map(opt => createOption(opt));
};

function loadSync(path) {
    const xhr = new XMLHttpRequest();
    xhr.open("GET", path, false);
    xhr.send();

    if (xhr.status === 200) {
        try {
            return JSON.parse(xhr.responseText.trim());
        } catch (error) {
            throw new Error('Error parsing JSON: ' + error.message);
        }
    }
    throw new Error('Request failed: ' + xhr.statusText);
}

let options = [];
try {
    options = loadSync("../static/json/mods.json");
} catch (error) {
    console.error('Error loading mods.json:', error);
}

const populateWidgets = () => {
    widgetsContainer.innerHTML = '';
    selectElement.innerHTML = '';

    for (const opt of options) {
        const option = createOption(opt);

        const widget = document.createElement("div");
        widget.classList.add("widget");
        widget.setAttribute("mod-value", opt.value);

        if (opt.style) {
            widget.setAttribute("style", opt.style);
            widget.style.border = "solid 2px";
        }

        const favText = check_favourite(opt.value) ? "<font color='white'>Favourited</font>" : "Favourite";
        const id = window.id_clean(`favourite_${opt.value}_button`);

        widget.innerHTML = `
            <div class="widget_url_icon tooltip_wrap" onclick="copyModURL('${encodeURIComponent(opt.value)}')">
                🔗<span class="tooltip_text">Copies a permanent mod link.</span>
            </div>
            <img src='${toStaticPath(opt.image ?? "/static/mod_icons/default_placeholder.png")}' class='widget_image' alt="Mod Icon">
            <br>
            <h3>${opt.label}</h3>
            <span>Tags: ${opt.tags.join(", ")}</span><br>
            <button class="select-button" onclick="document.getElementById('modSelect').value='${opt.value}'; selection_click()">Select</button>
            <button id='${id}' class="favourite-button" onclick="toggle_fav('${opt.value}')">${favText}</button>
        `;

        widgetsContainer.appendChild(widget);
        selectElement.appendChild(option);
    }
    reconstruct();
};
populateWidgets();

window.selection_click = () => {
    const selectedValue = selectElement.value;
    const widgets = Array.from(document.querySelectorAll(".widget"));
    const widget = widgets.find(f => f.getAttribute("mod-value") === selectedValue);

    const icon = options.find(f => f.value === selectedValue)?.image;
    if (typeof changeFavicon === "function") {
        changeFavicon(icon ? toStaticPath(icon) : "../static/34starcircle-2.png");
    }

    widgets.forEach(f => f.classList.remove("selected_widget"));
    if (widget) widget.classList.add("selected_widget");
};

selectElement.addEventListener("change", window.selection_click);
window.selection_click();

document.querySelectorAll('.tagCheckbox').forEach(checkbox => {
    checkbox.addEventListener('change', () => {
        if (typeof filterEntries === "function") filterEntries();
        window.selection_click();
    });
});

document.getElementById("mod_loader_overlay_block")?.addEventListener("click", () => {
    document.getElementById("modLoadReveal")?.click();
    if (typeof changeFavicon === "function") changeFavicon("../static/34starcircle-2.png");
    document.body.style.overflow = '';
});

let fullscreen = false;
document.getElementById("fullscreen_toggle")?.addEventListener("click", (e) => {
    e.preventDefault();
    fullscreen = !fullscreen;
    e.currentTarget.classList.toggle("down", fullscreen);
    document.querySelector(".overlay_scr")?.classList.toggle("fullscreen", fullscreen);
});

document.getElementById("searchInput")?.addEventListener("keyup", (e) => {
    if (typeof nct_stuff !== "undefined") {
        nct_stuff.name_filter = e.target.value.trim().toLowerCase();
        if (typeof filterEntries === "function") filterEntries();
    }
});

document.getElementById("game_start")?.addEventListener("click", () => {
    const modLoadReveal = document.getElementById("modLoadReveal");
    const bigshotOn = document.getElementById("bigshotOn");
    if (modLoadReveal) modLoadReveal.style.display = "none";
    if (bigshotOn) bigshotOn.style.display = "none";
});

document.getElementById("sort")?.addEventListener("change", () => {
    options.reverse();
    populateWidgets();
    if (typeof filterEntries === "function") filterEntries();
    window.selection_click();
});

const getCustomLoader = () => JSON.parse(window.localStorage.getItem("custom_loader") || "[]");

const rebuild_custom_loader = () => {
    const area = document.getElementById("custom_loader_area");
    if (!area) return;
    area.innerHTML = "";

    const new_selector = document.createElement("select");
    new_selector.id = "custom_select";

    const custom = getCustomLoader();
    new_selector.appendChild(new Option("Other", ""));

    for (const cu of custom) {
        new_selector.appendChild(new Option(cu.name, cu.name));
    }

    area.appendChild(new_selector);

    new_selector.addEventListener("change", (ev) => {
        ev.preventDefault();
        const selec = getCustomLoader().find(f => f.name === new_selector.value);
        if (selec) {
            document.getElementById("codeset1").value = selec.code_one || "";
            document.getElementById("codeset2").value = selec.code_two || "";
            document.getElementById("codeset3").value = selec.ending_code || "";
        }
        document.getElementById("custom_loader_delete").style.display = "";
    });
};

document.getElementById("customMenu")?.addEventListener("change", () => {
    window.localStorage.setItem("mod_loader_cache", JSON.stringify({
        code_one: document.getElementById("codeset1").value,
        code_two: document.getElementById("codeset2").value,
        ending_code: document.getElementById("codeset3").value
    }));
});

document.getElementById("custom_loader_save")?.addEventListener("click", () => {
    const custom = getCustomLoader();
    custom.push({
        name: document.getElementById("custom_loader_input").value,
        code_one: document.getElementById("codeset1").value,
        code_two: document.getElementById("codeset2").value,
        ending_code: document.getElementById("codeset3").value
    });
    window.localStorage.setItem("custom_loader", JSON.stringify(custom));
    rebuild_custom_loader();
    document.getElementById("custom_loader_delete").style.display = "";
});

document.getElementById("custom_loader_delete")?.addEventListener("click", () => {
    const selection = document.getElementById("custom_select").value;
    const filtered = getCustomLoader().filter(f => f.name !== selection);
    window.localStorage.setItem("custom_loader", JSON.stringify(filtered));
    rebuild_custom_loader();
});

rebuild_custom_loader();

const cache = window.localStorage.getItem("mod_loader_cache");
if (cache) {
    window.localStorage.removeItem("mod_loader_cache");
    const cached = JSON.parse(cache);
    document.getElementById("codeset1").value = cached.code_one || "";
    document.getElementById("codeset2").value = cached.code_two || "";
    document.getElementById("codeset3").value = cached.ending_code || "";
}

const executeModCodeGlobally = (code) => {
    if (!code) return;
    const script = document.createElement("script");
    script.textContent = code;
    document.body.appendChild(script);
    script.remove();
};

document.getElementById("submitMod")?.addEventListener("click", async () => {
    document.body.style.overflow = '';

    const importFile = document.getElementById("importfile");
    if (importFile && importFile.value !== "") {
        const file = importFile.files[0];
        const reader = new FileReader();
        reader.onload = (fle) => {
            if (typeof campaignTrail_temp !== "undefined" && typeof encode === "function") {
                campaignTrail_temp.dagakotowaru = atob(encode(fle.target.result));
            }
        };
        reader.readAsText(file);
    }

    const modSelectVal = selectElement.value;
    window.campaignTrail_temp = window.campaignTrail_temp || {};

    if (modSelectVal === "other") {
        const important_info = document.getElementById("codeset3").value;
        const codeOne = document.getElementById("codeset1").value;
        const codeTwo = document.getElementById("codeset2").value;

        if (important_info !== "") {
            window.campaignTrail_temp.multiple_endings = true;
        }

        if (codeTwo) {
            window.campaignTrail_temp.custom_code_2 = codeTwo;
        }

        if (typeof window.moddercheckeror === "undefined" || !window.moddercheckeror) {
            executeModCodeGlobally(codeOne);
            window.moddercheckeror = true;
        }
    } else {
        try {
            const response = await fetch(`../static/mods/${modSelectVal}_init.html`);
            if (response.ok) {
                const text = await response.text();
                if (text.length > 0) {
                    executeModCodeGlobally(text);
                    if (typeof window.e !== "undefined") {
                        window.e.readyToLoadCode1 = true;
                    }
                }
            } else {
                console.error("Failed to load mod init script:", response.status, modSelectVal);
            }
        } catch (error) {
            console.error("Network error loading mod init script:", error);
        }
        window.diff_mod = true;
    }

    const modloaddiv = document.getElementById("modloaddiv");
    const modLoadReveal = document.getElementById("modLoadReveal");
    if (modloaddiv) modloaddiv.style.display = 'none';
    if (modLoadReveal) modLoadReveal.style.display = 'none';

    window.modded = true;
});

const normals = ["2000N", "2000 Redux", "2000?", "2000 Normal", "Normalverse 2000", "Where am I?", "Don't think about 1993", "Normal", "2000N?", "2000"];
let normal_mode = 0;

const normal_adjust = () => {
    const normalWidget = Array.from(document.querySelectorAll(".widget")).find(f => f.getAttribute("mod-value") === "2000N");
    if (!normalWidget) return;

    const h3 = normalWidget.querySelector("h3");
    if (h3) {
        h3.style.cssText = `overflow: hidden; white-space: nowrap; text-overflow: clip;`;
        h3.innerHTML = normals[normal_mode];
        normal_mode = (normal_mode + 1) % normals.length;
    }

    if (document.querySelectorAll(".campaign_trail_start_emphasis").length > 0) {
        setTimeout(normal_adjust, Math.floor(Math.random() * 500));
    }
};
normal_adjust();