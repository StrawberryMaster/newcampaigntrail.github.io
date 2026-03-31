/* global e, campaignTrail_temp, jQuery, $, MD5 */

'use strict';

window.campaignTrail_temp = window.campaignTrail_temp || {};

// link window.e dynamically so it never detaches
//  from campaignTrail_temp if a mod reassigns it
try {
    Object.defineProperty(window, 'e', {
        get: function() { return window.campaignTrail_temp; },
        set: function(val) { window.campaignTrail_temp = val; },
        configurable: true
    });
} catch (err) {
    window.e = window.campaignTrail_temp;
}

window.e.skippingQuestion = false;

/**
 * @param {{pk: *, fields: Object}[]} json
 * @returns {Map<string, Object>}
 */
function mapPkToFields(json) {
    const map = new Map();
    if (!json) return map;
    for (const member of json) {
        const casted = String(member.pk);
        if (!map.has(casted)) map.set(casted, member.fields);
    }
    return map;
}

/**
 * @param {*} a
 * @param {*} b
 * @returns {boolean}
 */
const stringsEqual = (a, b) => String(a) === String(b);

const PROPS = {
    get PARAMS() { return window.e.global_parameter_json?.[0]?.fields ?? {}; },
    get ELECTIONS() { return mapPkToFields(window.e.election_json); }, // Map<string, object>
    get CANDIDATES() { return mapPkToFields(window.e.candidate_json); }, // Map<string, object>
};

async function evalFromUrl(url, callback = null) {
    try {
        const evalRes = await fetch(url);
        const code = await evalRes.text();
        executeMod(code);
    } catch (err) {
        console.error(`Failed to load mod script from ${url}:`, err);
    }
    callback?.();
}

function executeMod(code, context = {}) {
    if (!code) return;
    const script = document.createElement("script");
    script.textContent = code;
    document.body.appendChild(script);
    script.remove();
}

let changeFontColour = () => { };

const baseScenarioDict = {
    "1844": "1844_Clay_Fillmore.html",
    "1860": "1860_Douglas_Guthrie.html",
    "1896": "1896_Bryan_Boies.html",
    "1916": "1916_Hughes_Burkett.html",
    "1948": "1948_Dewey_Bricker.html",
    "1960": "1960_Kennedy_Humphrey.html",
    "1964": "1964_Goldwater_Miller.html",
    "1968": "1968_Humphrey_Connally.html",
    "1976": "1976_Carter_Church.html",
    "1988": "1988_Bush_Dole.html",
    "2000": "2000_Bush_Cheney.html",
    "2012": "2012_Obama_Clinton.html",
    "2016": "2016_Clinton_Booker.html",
    "2016a": "2016a_Clinton_Booker.html",
    "2020": "2020_Biden_Bass.html"
};

// variables
window.e.SelectText = "Please select the election you will run in:";
window.e.CandidText = "Please select your candidate:";
window.e.VpText = "Please select your running mate:";
window.e.PartyText = "Party:";
window.e.HomeStateText = "Home State:";
window.e.ElectionPopup = "Election night has arrived. Settle in and wait for the returns, however                 long it may take. Best of luck!";
window.e.WinPopup = "Congratulations! You won this year's election! Click OK to view the                     rest of the returns, or skip straight to the final results. We hope                     you have a nice victory speech prepared for your supporters.";
window.e.LosePopup = "Sorry. You have lost the election this time. Click OK to view the                     rest of the returns, or skip straight to the final results. We hope                     you have a nice concession speech prepared.";

window.e.finalPercentDigits = 1;
window.e.statePercentDigits = 2;
window.e.SelAnsContText = "Please select an answer before continuing!";
window.e.numberFormat = "en-US";
window.e.code2Loaded = false;
window.e.stateOpacity = 1;

window.stopSpacebar = false;

function substitutePlaceholders(str) {
    if (!str || typeof str !== "string") return str;
    return str.replace(/\{\{(.*?)}\}/g, (_, varName) => {
        try {
            return (window[varName] !== undefined) ? window[varName] : `{{${varName}}}`;
        } catch {
            return `{{${varName}}}`;
        }
    });
}

let DEBUG = false;
campaignTrail_temp.issue_font_size = null;
window.e.shining_data = {};

function debugConsole(...args) {
    if (DEBUG) {
        console.log(...args);
    }
}

// achievements
const lastUpdatedDate = "2026-01-30";
const achList = {
    "destiny": [
        "Destiny Arrives All the Same",
        "Get a 306-232 electoral count in every possible official scenario. (1964, and 1976-2020, not including 2016a)",
        "<b><em>Misc.</em></b><br><table>"
    ],
    "yourchance": [
        "NOW'S YOUR CHANCE TO BE A",
        "[[Big Shot]]"
    ],
    "stillAlive": [
        "Still Alive",
        "Enact the dream of the average r/tct user"
    ],
    //2020
    "ridingBiden": [
        "The Dark Brandon Rises",
        "Achieve 406 electoral votes or higher with Joe Biden in the 2020 scenario.",
        "</table><br><b><em>2020</em></b><br><table>"
    ],
    "magaa": [
        "MAGA... Again",
        "Achieve 322 electoral votes or higher with Donald Trump in the 2020 scenario."
    ],
    "nmpr": [
        "Not My President!",
        "Deadlock the election as Donald Trump in 2020."
    ],
    "nomalarkey": [
        "Civility Prevails...?",
        "Get the real life ending to the 2020 scenario."
    ],
    //2016
    "whatbelt": [
        "I'm Still Standing",
        "Win 2016 without Wisconsin, Michigan, or Pennsylvania as either candidate.",
        "</table><br><b><em>2016</em></b><br><table>"
    ],
    "thebern": [
        "The Flame Berns Bright",
        "Win 350 or more electoral votes as Hillary Clinton with running mate Bernie Sanders"
    ],
    "moscow": [
        "Moscow's Musketeers",
        "Win the popular vote as Trump with Palin as your running mate."
    ],
    //2016a
    "why": [
        "Why?",
        "Play 2016a.",
        "</table><br><b><em>2016a</em></b><br><table>"
    ],
    "what": [
        "WHY?!?!?!?!",
        "Play 2016a 100 times."
    ],
    //2012
    "realdebate": [
        "A Real Debate",
        "Win as Obama while fully commiting to the liberal tradition and suggesting Obamacare's expansion.",
        "</table><br><b><em>2012</em></b><br><table>"
    ],
    "karmic": [
        "Karmic Retribution",
        "Losing everything except D.C. as Obama after ditching Biden."
    ],
    //2000
    "florida2000": [
        "Art Imitates Life",
        "Have Florida be under a 0.5% margin of victory. It must also be the deciding state in such a case that it flips.",
        "</table><br><b><em>2000</em></b><br><table>"
    ],
    "raiders": [
        "Nader's Raiders",
        "Win 5% of the popular vote as Ralph Rader (All difficulties allowed)."
    ],
    "master": [
        "I'm My Own Master Now",
        "Win as Al Gore after saying that Clinton should've been impeached."
    ],
    "swap": [
        "Death Swap",
        "Win as Al Gore while losing the popular vote."
    ],
    //1988
    "tanks": [
        "Tanks and Taxes",
        "Win as Dukakis despite riding the tank and pledging to raise taxes.",
        "</table><br><b><em>1988</em></b><br><table>"
    ],
    "Kinder": [
        "A Kinder, Gentler Landslide",
        "Earn over 500 EVs as Bush in on normal.",
    ],
    "Rainbow": [
        "The Rainbow Coalition",
        "Win with running mate Jesse Jackson as Michael Dukakis.",
    ],
    //1976
    "georgia": [
        "Radical Liberal Jimmy Carter",
        "Win as Jimmy Carter with over 400 EVs while being firmly pro-choice and for universal healthcare.",
        "</table><br><b><em>1976</em></b><br><table>"
    ],
    //1968
    "georgenixon": [
        "The Devil Went Down To Georgia",
        "As Nixon in 1968, win Georgia.",
        "</table><br><b><em>1968</em></b><br><table>"
    ],
    "ratio": [
        "Hubert Horatio'd",
        "As Hubert Humphrey, win 430 or more electoral votes.",
    ],
    //1960
    "BCitsHard": [
        "Not Because It Is Easy, But Because It Is Hard",
        "Win as John Kennedy on impossible.",
        "</table><br><b><em>1960</em></b><br><table>"
    ],
    "BCitsEasy": [
        "Not Because It Is Hard, But Because It Is Easy",
        "Win less then 100 Electoral Votes as John Kennedy on Cakewalk difficulty",
    ],
    "Vice": [
        "The Vice With No Vice",
        "Win as Nixon/Goldwater.",
    ],
    //1948
    "dixieDewey": [
        "Dixie Defeats Dewey",
        "Win as Truman by preventing a southern walkout.",
        "</table><br><b><em>1948</em></b><br><table>"
    ],
    "Dewey": [
        "All Over But The Shouting",
        "Win the Popular Vote as Thomas Dewey.",
    ],
    //1916
    "California": [
        "Califor-Huh?",
        "As Charles Evans Hughes, win the election without California.",
        "</table><br><b><em>1916</em></b><br><table>"
    ],
    //1896
    "Commoner": [
        "The Great Commoner",
        "Win as Bryan with over 330 electoral votes.",
        "</table><br><b><em>1896</em></b><br><table>"
    ],
    // Mods
    //2019NK
    "trueKorea": [
        "Potato P.R.I.D.E",
        "Get the true ending to 2019NK.",
        "</table><br><h2>Mods</h2><br><b><em>2019NK</em></b><br><table>"
    ],
    //2016DNC
    "IWillSurvive": [
        "'I Will Survive'",
        "As Clinton, achieve the 'I Will Survive' ending.",
        "</table><br><b><em>2016 Democratic Primaries (Warning: Currently Broken)</em></b><br><table>"
    ],
    "MaybeThisTimeItllWork": [
        "Maybe This Time It'll Work",
        "Mount a primary challenge against Obama, and then win the Democratic Nomination.",
    ],
    "MarylandersMission": [
        "The Marylander's Mission",
        "As Martin O'Malley, deny both Clinton and Sanders a majority and deadlock the convention.",
    ],
    //2008
    "peoplesvictory": [
        "The People's President",
        "Decry the folly of capitalism as John McCain, and still win. (All difficulties allowed)",
        "</table><br><b><em>2008</em></b><br><table>"
    ],
    //1984
    "minnesotanice": [
        "'Well, Minnesota Would've Been Nice'",
        "As Ronald Reagan, win Minnesota.",
        "</table><br><b><em>1984</em></b><br><table>"
    ],
    //1972b
    "Wallaloha": [
        "'Wallaloha'",
        "As George Wallace, win Hawaii.",
        "</table><br><b><em>1972b</em></b><br><table>"
    ],
    //1936c
    "fixyourmod": [
        "Flopulist",
        "As Long in 1936: Every Man a King, die as quickly as possible.",
        "</table><br><b><em>1936: Every Man a King</em></b><br><table>"
    ],
    //1876
    "ATruceNotACompromise": [
        "A Truce, Not A Compromise",
        "Have the final results be 185-184 in favour of Hayes, while agreeing to a possible compromise on the last question, mimicking real life events. (Doing this as either candidate counts)",
        "</table><br><b><em>1876</em></b><br><table>"
    ],
    //1872
    "AVictoryForAllPeople": [
        "A Victory For All People",
        "Die as Greeley and win on Normal. Sumner is required as your running mate.",
        "</table><br><b><em>1872</em></b><br><table>"
    ]
};

window.amongusonetwothree = false;

function addAchButton() {
    const bottomBar = document.getElementById("bottomBar");
    if (!bottomBar) return;
    bottomBar.style.display = "";

    const achievementDiv = document.createElement("div");
    const stylesheetSet = "position: absolute; left: 10px; top: 5px;";

    achievementDiv.innerHTML = `
      <button id='achievMenuButton' style='width:200px;height:47px;font-size:150%;text-align:center'><b>Achievements</b></button>
    `;
    achievementDiv.style = stylesheetSet;

    bottomBar.appendChild(achievementDiv);
    document.getElementById("achievMenuButton").addEventListener("click", openAchievMenu);
}

function addInfoButton() {
    const bottomBar = document.getElementById("bottomBar");
    if (!bottomBar) return;
    bottomBar.style.display = "";

    const infoDiv = document.createElement("div");
    const stylesheetSet = "position: absolute; right: 10px; top: 5px;";

    infoDiv.innerHTML = `
      <button id='infoMenuButton' style='width:200px;height:25px;font-size:100%;text-align:center'><b>Additional Information</b></button>
    `;
    infoDiv.style = stylesheetSet;

    if (!bottomBar.innerHTML.includes("last-updated-date")) {
        bottomBar.innerHTML += `
        <style>
          .bottom-right-text:after {
            content: var(--bottom-right-text);
            font-style: italic;
            position: absolute;
            bottom: .8em;
            right: 1em;
          }
        </style>
        <div id="last-updated-date" class="bottom-right-text" style="--bottom-right-text: 'Last updated: ${lastUpdatedDate}'"></div>
      `;
    }

    bottomBar.appendChild(infoDiv);
    document.getElementById("infoMenuButton").addEventListener("click", openInfoMenu);

    const infoBox = document.getElementById("infoBox");
    if (infoBox) infoBox.remove();
}

function openAchievMenu() {
    const bottomBar = document.getElementById("bottomBar");
    if (bottomBar) bottomBar.style.display = "none";

    const lastUpdatedDateEl = document.getElementById("last-updated-date");
    if (lastUpdatedDateEl) lastUpdatedDateEl.remove();

    const gameWin = document.getElementById("game_window");
    const achievMenuButton = document.getElementById("achievMenuButton");
    const infoMenuButton = document.getElementById("infoMenuButton");
    if (achievMenuButton) achievMenuButton.remove();
    if (infoMenuButton) infoMenuButton.remove();

    const run = JSON.parse(localStorage.getItem('achievements') || "{}");
    let achievementHtml = '';

    for (const i in achList) {
        let achieved = (run.achievements && run.achievements[i]) || false;
        if (window.e.mod_achievements) {
            let mod_ach = window.localStorage.getItem("mod_achievements");
            mod_ach = JSON.parse(mod_ach ?? "[]");
            if (mod_ach.includes(achList[i])) achieved = true;
        }
        const src = `../static/achievementicons/${i}.png`;
        const imgStyle = achieved ? "width:50px;" : "width:50px;filter: grayscale(100%);";
        const imgHTML = `<img style='${imgStyle}' src='${src}'></img>`;
        const subcategory = achList[i][2] || "";
        const achTable = `
        <tr>
          <th style="padding:3px;width:60px">${imgHTML}</th>
          <th style="padding:3px;width:200px">${achList[i][0]}</th>
          <th style="padding:3px">${achList[i][1]}</th>
        </tr>
      `;
        achievementHtml += subcategory + achTable;
    }

    const belowHeader = document.getElementById("below_header");
    if (belowHeader) belowHeader.style.display = "none";

    const achievementDiv = document.createElement("div");
    achievementDiv.id = "achBox";
    gameWin.appendChild(achievementDiv);

    achievementDiv.innerHTML = `
      <div class="inner_window_front" style="padding:0px"><b><h1>Achievements</h1></b></div>
      <div class="inner_window_front" style="overflow-y:scroll;height:300px;"><center>
      ${achievementHtml}</table></center>
      </div>
      <button id='backButton' style='position: absolute;left: 1.5em;bottom:.5em;width:200px;height:50px;font-size:25px;text-align:center'><b>Back</b></button>
      <h1 style="font-style:italic;font-size:12px;position:absolute;bottom:1.75em;right:6em;">For all achievements, unless otherwise stated, completing them must be done on normal or a harder difficulty</h1>
    `;

    const tablesList = document.getElementsByTagName("table");
    for (const table of tablesList) table.style.width = "700px";

    document.getElementById("backButton").addEventListener("click", returnToMainPage);
}

function openInfoMenu() {
    const bottomBar = document.getElementById("bottomBar");
    if (bottomBar) bottomBar.style.display = "none";

    const gameWin = document.getElementById("game_window");
    const infoMenuButton = document.getElementById("infoMenuButton");
    const achievMenuButton = document.getElementById("achievMenuButton");
    if (infoMenuButton) infoMenuButton.remove();
    if (achievMenuButton) achievMenuButton.remove();

    const belowHeader = document.getElementById("below_header");
    if (belowHeader) belowHeader.style.display = "none";

    const infoDiv = document.createElement("div");
    infoDiv.id = "infoBox";
    gameWin.appendChild(infoDiv);

    const textInfo = `
    <div style="text-align:left">
      <b>Hello, and welcome to the New Campaign Trail! This is an updated version of The Campaign Trail (hence the name). What does TNCT bring that TCT doesn't? A number of new features, not limited to:</b><br /><br />

      <ul>
        <li>A mod loader/library, allowing many of the mods made by our fabulous community to be played/compiled</li>
        <li>Faster processing times, so you don't have to sit there forever while the game says <i>Processing Results, wait one moment...</i></li>
        <li>Achievements, for if you want to challenge yourself and memorialize unique results.</li>
        <li>Ending codes, a functionality of scenarios that allows the end screen to be altered depending on different factors like electoral and popular vote.</li>
      </ul>

      <p>I could go on, but I think you get the point. We hope you enjoy playing it as much as we do. If you run into any issues, please either report them on the TNCT Github, or Discord server, both linked below at the bottom of the screen.</p>

      <h3>Credits:</h3>
      <ul>
        <li>Dan Bryan (Original Site)</li>
        <li>DecstarG (Lead Dev)</li>
        <li>Danxv33 (Assistant Dev)</li>
        <li>ItsAstronomical (Community Manager)</li>
        <li>T3CH0X (Dev)</li>
        <li><a href="https://discord.gg/thecampaigntrail" target="_blank">The Campaign Trail Discord</a></li>
        <li><a href="https://reddit.com/r/thecampaigntrail/" target="_blank">r/thecampaigntrail</a></li>
      </ul>

      <h3>Recent patch notes:</h3>
      <p>Added <a href="https://www.reddit.com/r/thecampaigntrail/comments/1kqpl9o/nct_and_cts_update_variables_in/" target="_blank">support for variables to be used in Questions/Answers/Advisor Feedback</a>.</p>
    </div>
    `;

    infoDiv.innerHTML = `
      <div class="inner_window_front" style="padding:0"><b><h1>Welcome to the New Campaign Trail!</h1></b></div>
      <div class="inner_window_front" style="padding:1em;overflow-y:scroll;height:300px;"><center>
      ${textInfo}</table></center>
      </div>
      <button id='backButton' style='position: absolute;left: 1.5em;bottom:.5em;width:200px;height:50px;font-size:25px;text-align:center'><b>Back</b></button>
    `;

    document.getElementById("backButton").addEventListener("click", returnToMainPage);
}

function returnToMainPage() {
    const achBox = document.getElementById("achBox");
    const infoBox = document.getElementById("infoBox");
    try {
        if (achBox) achBox.remove();
        if (infoBox) infoBox.remove();
    } catch (e) { }

    const belowHeader = document.getElementById("below_header");
    if (belowHeader) belowHeader.style.display = "";

    addAchButton();
    addInfoButton();
}

function resetAchievements() {
    const achhh = {
        achievements: {},
        threeosix: {
            2020: false, 2016: false, 2012: false, 2000: false, 1988: false, 1976: false, 1964: false
        },
        "tsatrolling": 0
    };
    localStorage.setItem('achievements', JSON.stringify(achhh));
    if (typeof MD5 !== "undefined") localStorage.setItem('ach4', MD5(JSON.stringify(achhh)));
}

if (localStorage.getItem('achievements') == null) {
    resetAchievements();
}

window.setInterval(function () {
    if (typeof MD5 !== "undefined") {
        if (MD5(localStorage.getItem('achievements')) != localStorage.getItem('ach4')) {
            resetAchievements();
            window.location.reload();
        }
    }
}, 5000);

addAchButton();
addInfoButton();

// engine functions
function shuffleAnswers(arr) {
    for (let i = arr.length - 1; i >= 1; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function removeIssueDuplicates(array) {
    return array.filter((f, i) => array.findIndex((g) => g.issue === f.issue) === i);
}

function openTab(evt, tabName) {
    $(".tabcontent").css("display", "none");
    $(".tablinks").removeClass("active");
    $(".tablinks").attr("disabled", false);
    $(`#${tabName}`).css("display", "block");
    if (evt) {
        evt.currentTarget.classList.add("active");
        evt.currentTarget.disabled = true;
    } else {
        $("#funds")[0].classList.add("active");
        $(".tablinks")[0].disabled = true;
    }
}

function mapCache(skip = false) {
    if (!skip) {
        if (!$("#main_content_area")[0]) return false;
        const election = PROPS.ELECTIONS.get(String(window.e.election_id));
        if (
            ((window.e.question_number - 1) % 2 !== 0 && election.has_visits)
            || (window.e.question_number === Number(PROPS.PARAMS.question_count))
            || (window.e.primary_code && window.e.primary_code.some((f) => f.breakQ === window.e.question_number))
        ) {
            return false;
        }
    }

    const rr = A(2);
    window.rFuncRes = rFunc(rr, 0);

    const $mapContainer = $("#map_container");
    if ($mapContainer.length > 0 && $mapContainer.data("plugin-usmap")) {
        updateUsMapStyles(window.rFuncRes);
    } else {
        $mapContainer.remove();
        $("#main_content_area").html(
            '<div id="map_container"></div><div id="menu_container"><div id="overall_result_container"><div id="overall_result"><h3>ESTIMATED SUPPORT</h3><p>Click on a state to view more info.</p></div></div><div id="state_result_container"><div id="state_info"><h3>STATE SUMMARY</h3><p>Click/hover on a state to view more info.</p><p>Precise results will be available on election night.</p></div></div></div>',
        );
        $("#map_container").usmap(window.rFuncRes);
    }

    if ($("#main_content_area")[0]) {
        $("#main_content_area")[0].style.display = "none";
    }

    return true;
}

function dHondtAllocation(votes, seats, thresh = 0.15) {
    const quotients = votes.splice();
    const allocations = [];
    votes.forEach(() => { allocations.push(0); });
    const total_votes = votes.reduce((sum, value) => sum + value);
    const perc_votes = [];
    votes.forEach((f) => { perc_votes.push(f / total_votes); });

    for (let i = 0; i < seats; i++) {
        for (let w = 0; w < votes.length; w++) {
            if (perc_votes[w] < thresh) {
                quotients[w] = 0;
            } else {
                quotients[w] = votes[w] / (allocations[w] + 1);
            }
        }
        const index = quotients.indexOf(Math.max(...quotients));
        allocations[index] += 1;
    }

    return allocations;
}

function findFromPK(array, pk) {
    return array.findIndex((x) => x.pk === Number(pk));
}

let states = [];
const initIt = 0;

function fileExists(url) {
    return fetch(url, { method: "HEAD", cache: "no-store" })
        .then((res) => {
            if (res.ok) return true;
            if (res.status === 405 || res.status === 501) {
                return fetch(url, { method: "GET", cache: "no-store" })
                    .then((r2) => r2.ok)
                    .catch(() => false);
            }
            return false;
        })
        .catch(() => false);
}

let RecReading;
let modded = false;

function simpleAdventure(ans) {
    return 1203;
}

let HistHexcolour = ["#FFFFFF", "#FFFFFF", "#FFFFFF", "#FFFFFF"];
let HistName = ["N/A", "N/A", "N/A", "N/A"];
let HistEV = [0, 0, 0, 0];
let HistPV = [0, 0, 0, 0];
let HistPVP = [0, 0, 0, 0];

function histFunction() {
    if (modded === false) {
        switch (campaignTrail_temp.election_id) {
            case 21:
                HistHexcolour = ["#0000FF", "#FF0000", "#FFFF00", "#00C100"];
                HistName = [" Joe Biden", " Donald Trump", " Jo Jorgensen", " Howie Hawkins"];
                HistEV = [306, 232, 0, 0];
                HistPV = ["81,268,924", "74,216,154", "1,865,724", "405,035"];
                HistPVP = ["51.3%", "46.9%", "1.2%", "0.4%"];
                break;
            case 20:
            case 16:
                HistHexcolour = ["#FF0000", "#0000FF", "#FFFF00", "#00C100"];
                HistName = [" Donald Trump", " Hillary Clinton", " Gary Johnson", " Jill Stein"];
                HistEV = [306, 232, 0, 0];
                HistPV = ["62,984,828", "65,853,514", "4,489,341", "405,035"];
                HistPVP = ["46.1%", "48.2%", "3.3%", "1.1%"];
                break;
            case 3:
                HistHexcolour = ["#0000FF", "#FF0000", "#FFFF00", "#00C100"];
                HistName = [" Barack Obama", " Mitt Romney", " Gary Johnson", " Jill Stein"];
                HistEV = [332, 206, 0, 0];
                HistPV = ["65,915,795", "60,933,504", "1,275,971", "469,627"];
                HistPVP = ["51.1%", "47.2%", "1.0%", "0.4%"];
                break;
            case 9:
                HistHexcolour = ["#FF0000", "#0000FF", "#00C100", "#FFFF00"];
                HistName = [" George W. Bush", " Al Gore", " Ralph Nader", " Pat Buchanan"];
                HistEV = [271, 267, 0, 0];
                HistPV = ["50,456,002", "50,999,897", "2,882,955", "448,895"];
                HistPVP = ["47.9%", "48.4%", "2.7%", "0.4%"];
                break;
            case 15:
                HistHexcolour = ["#FF0000", "#0000FF", "#FFFF00", "#00C100"];
                HistName = [" George Bush", " Michael Dukakis", " Ron Paul", " Lenora Fulani"];
                HistEV = [426, 112, 0, 0];
                HistPV = ["48,886,597", "41,809,476", "431,750", "217,221"];
                HistPVP = ["53.4%", "45.7%", "0.5%", "0.2%"];
                break;
            case 10:
                HistHexcolour = ["#0000FF", "#FF0000", "#00C100", "#FFFF00"];
                HistName = [" Jimmy Carter", " Gerald Ford", " Eugene McCarthy", " Roger MacBride"];
                HistEV = [297, 241, 0, 0];
                HistPV = ["40,831,881", "39,148,634", "744,763", "172,557"];
                HistPVP = ["50.1%", "48.0%", "0.9%", "0.2%"];
                break;
            case 4:
                HistHexcolour = ["#FF0000", "#0000FF", "#FFFF00", "#FFFFFF"];
                HistName = [" Richard Nixon", " Hubert Humphrey", " George Wallace", " Other"];
                HistEV = [302, 191, 45, 0];
                HistPV = ["31,783,783", "31,271,839", "9,901,118", "243,259"];
                HistPVP = ["43.4%", "42.7%", "13.5%", "0.3%"];
                break;
            case 69:
                HistHexcolour = ["#0000FF", "#FF0000", "#FFFF00", "#00C100"];
                HistName = [" Lyndon B. Johnson", " Barry Goldwater", " Unpledged electors", " Eric Hass"];
                HistEV = [486, 52, 0, 0];
                HistPV = ["43,129,040", "27,175,754", "210,732", "45,189"];
                HistPVP = ["61.1%", "38.5%", "0.3%", ">0.1%"];
                break;
            case 11:
                HistHexcolour = ["#0000FF", "#FF0000", "#FFFF00", "#FFFFFF"];
                HistName = [" John Kennedy", " Richard Nixon", " Harry Byrd", " Unpledged"];
                HistEV = [303, 219, 15, 0];
                HistPV = ["34,220,984", "34,108,157", "0", "286,359"];
                HistPVP = ["49.7%", "49.5%", "0", "0.4%"];
                break;
            case 12:
                HistHexcolour = ["#0000FF", "#FF0000", "#FFFF00", "#00C100"];
                HistName = [" Harry Truman", " Thomas Dewey", " Strom Thurmond", " Henry Wallace"];
                HistEV = [303, 189, 39, 0];
                HistPV = ["24,179,347", "21,991,292", "1,175,930", "1,157,328"];
                HistPVP = ["49.6%", "45.1%", "2.4%", "2.4%"];
                break;
            case 14:
                HistHexcolour = ["#0000FF", "#FF0000", "#00C100", "#FFFF00"];
                HistName = [" Woodrow Wilson", " Charles Evans Hughes", " Allan Benson", " James Hanly"];
                HistEV = [277, 254, 0, 0];
                HistPV = ["9,126,868", "8,548,728", "590,524", "221,302"];
                HistPVP = ["49.2%", "46.1%", "3.2%", "1.2%"];
                break;
            case 5:
                HistHexcolour = ["#FF0000", "#0000FF", "#FFFF00", "#FF00FF"];
                HistName = [" William McKinley", " William Jennings Bryan", " John Palmer", " Joshua Levering"];
                HistEV = [271, 176, 0, 0];
                HistPV = ["7,111,607", "6,509,052", "134,645", "131,312"];
                HistPVP = ["51.0%", "46.7%", "1.0%", "0.9%"];
                break;
            case 8:
                HistHexcolour = ["#FF0000", "#FFFF00", "#00C100", "#0000FF"];
                HistName = [" Abraham Lincoln", " John C. Breckinridge", " John Bell", " Stephen Douglas"];
                HistEV = [180, 72, 39, 12];
                HistPV = ["1,865,908", "848,019", "590,901", "1,380,202"];
                HistPVP = ["39.8%", "18.1%", "12.6%", "29.5%"];
                break;
            case 13:
                HistHexcolour = ["#0000FF", "#F0C862", "#FFFF00"];
                HistName = [" James K. Polk", " Henry Clay", " James Birney"];
                HistEV = [170, 105, 0];
                HistPV = ["1,339,494", "1,300,004", "62,103"];
                HistPVP = ["49.5%", "48.1%", "2.3%"];
                break;
        }
    }
}

function cyoAdventure(question) {
    const latestAnswer = campaignTrail_temp.player_answers[campaignTrail_temp.player_answers.length - 1];
    for (let i = 0; i < campaignTrail_temp.questions_json.length; i++) {
        if (campaignTrail_temp.questions_json[i].pk === question.pk) {
            for (let v = 0; v < campaignTrail_temp.questions_json.length; v++) {
                if (campaignTrail_temp.questions_json[v].pk === simpleAdventure(latestAnswer)) {
                    campaignTrail_temp.questions_json[campaignTrail_temp.question_number] = campaignTrail_temp.questions_json[v];
                    break;
                }
            }
            break;
        }
    }
}

campaignTrail_temp.margin_format = window.localStorage.getItem("margin_form") ?? "#fff";

function encode(str) {
    const revArray = [];
    const length = str.length - 1;
    for (let i = length; i >= 0; i--) {
        revArray.push(str[i]);
    }
    return revArray.join("");
}

function gradient(interval, min, max) {
    if (interval < min) return min;
    if (interval > max) return max;
    return interval;
}

function csrfToken() {
    return (function (e) {
        let t = null;
        if (document.cookie && document.cookie != "") {
            for (let i = document.cookie.split(";"), a = 0; a < i.length; a++) {
                const s = i[a].trim();
                if (s.substring(0, e.length + 1) == `${e}=`) {
                    t = decodeURIComponent(s.substring(e.length + 1));
                    break;
                }
            }
        }
        return t;
    }("csrftoken"));
}

let slrr = "";
let rrr = "";
let starting_mult = 0;
const encrypted = Math.round(Math.random() * 100);
const t = "";
let nnn = "";

function switchPV() {
    window.swE = document.getElementById("switchingEst");
    if (window.swE.innerHTML === rrr) {
        window.swE.innerHTML = slrr;
        window.pvswitcher.innerText = "PV Estimate";
    } else {
        window.swE.innerHTML = rrr;
        window.pvswitcher.innerText = "Switch to State Estimate";
    }
    const evEst = document.getElementById("ev_est");
    if (evEst) evEst.style.display = "";
}

function evest() {
    const evEst = document.getElementById("ev_est");
    if (evEst) evEst.style.display = "none";
    window.swE = document.getElementById("switchingEst");
    window.swE.innerHTML = nnn;
}

function copy(mainObject) {
    const objectCopy = {};
    for (let key in mainObject) {
        objectCopy[key] = mainObject[key];
    }
    return objectCopy;
}

let primaryStatesCacheRaw = null;
let primaryStatesCacheParsed = null;

function getPrimaryStatesParsed() {
    const src = window.e.primary_states;
    if (!src) return null;
    if (Array.isArray(src)) return src;
    if (src === primaryStatesCacheRaw) return primaryStatesCacheParsed;

    primaryStatesCacheParsed = JSON.parse(src);
    primaryStatesCacheRaw = src;
    return primaryStatesCacheParsed;
}

let moddercheckeror = false;
let important_info = "";

let getResults = function (out, totv, aa, quickstats) { };

function endingPicker(out, totv, aa, quickstats) {
    if (important_info.indexOf("404") > -1) {
        important_info = "return false";
    }
    if (important_info != "") {
        const a = new Function("out", "totv", "aa", "quickstats", important_info)(out, totv, aa, quickstats);
        return a;
    }
    return "ERROR";
}

function modSelectChange() {
    if ($("#modSelect")[0].value === "other") {
        $("#customMenu")[0].style.display = "block";
    } else {
        $("#customMenu")[0].style.display = "none";
    }
}

function download(content, fileName, contentType) {
    const a = document.createElement("a");
    const file = new Blob([content], { type: contentType });
    a.href = URL.createObjectURL(file);
    a.download = fileName;
    a.click();
}

function exportResults() {
    let results;
    if (campaignTrail_temp.bigshot_mode != true && typeof dirtyhacker3 === "undefined") {
        results = {
            election_id: campaignTrail_temp.election_id,
            player_candidate: campaignTrail_temp.candidate_id,
            player_answers: campaignTrail_temp.player_answers,
            player_visits: campaignTrail_temp.player_visits,
            overall_results: campaignTrail_temp.final_overall_results,
            state_results: campaignTrail_temp.final_state_results,
            difficulty_multiplier: campaignTrail_temp.difficulty_level_multiplier,
            starting_mult: starting_mult
        };
    } else {
        results = {
            election_id: campaignTrail_temp.election_id,
            player_candidate: campaignTrail_temp.candidate_id,
            player_answers: campaignTrail_temp.player_answers,
            player_visits: campaignTrail_temp.player_visits,
            overall_results: campaignTrail_temp.final_overall_results,
            state_results: campaignTrail_temp.final_state_results,
            difficulty_multiplier: 696969,
            starting_mult: starting_mult
        };
    }
    const coded = encode(btoa(JSON.stringify(results)));
    download(coded, "results.json", 'text/plain');
}

let diff_mod = false;

function randomNormal() {
    let x;
    let y;
    let r2;
    do {
        x = 2 * Math.random() - 1;
        y = 2 * Math.random() - 1;
        r2 = x ** 2 + y ** 2;
    } while (r2 >= 1 || r2 === 0);
    return x * Math.sqrt((-2 * Math.log(r2)) / r2);
}

function sortByProp(arr, prop) {
    return arr.sort((e, i) => {
        const a = e[prop];
        const s = i[prop];
        if (a < s) return -1;
        if (a > s) return 1;
        return 0;
    });
}

function divideElectoralVotesProp(e, t) {
    const i = e.map((x) => Math.floor(x * t));
    i[0] += t - i.reduce((a, b) => a + b, 0);
    return i;
}

function splitEVTopTwo(totalEV, topVotes, totalVotes) {
    if (!Number.isFinite(totalEV) || totalEV <= 0) return [0, 0];
    if (!Number.isFinite(topVotes) || !Number.isFinite(totalVotes) || totalVotes <= 0) {
        return [totalEV, 0];
    }
    let L = Math.round((topVotes / totalVotes) * totalEV);
    L = Math.max(0, Math.min(totalEV, L));
    const D = totalEV - L;
    return [L, D];
}

const shining_menu = (polling) => {
    const game_winArr = Array.from($("#game_window")[0].children);
    const inflation_factor = 1.04 ** (2020 - PROPS.ELECTIONS.get(String(window.e.election_id)).year);

    const uninflatedBalance = window.e.shining_data.balance / inflation_factor;
    const uninflatedPrev = window.e.shining_data.prev_balance / inflation_factor;
    const change = uninflatedBalance - uninflatedPrev;

    let projected_change = change;

    const update_projection = () => {
        const our_info = campaignTrail_temp.shining_info.find(
            (f) => f.pk === window.e.election_id && f.candidate === window.e.candidate_id,
        );

        projected_change = 0;
        projected_change += 5000000 * window.e.shining_data.times.fundraising_time * (our_info ? our_info.fundraising_effect : 1);
        projected_change -= 500000;

        our_info.lobby.forEach((f) => {
            const x = f.opinion;
            const r = 0.097;
            const x0 = 65.3;
            const y = f.fund_base / (1 + Math.exp(-r * (x - x0)));
            projected_change += y;
        });

        window.e.shining_data.ad_spending.forEach((f) => {
            projected_change -= f.amount;
        });

        projected_change /= inflation_factor;

        $("#projected_change").html(
            `<b>Estimated change for next turn:</b> <span style='${projected_change > 0 ? "color:green" : projected_change == 0 ? "color:yellow" : "color:red"};'>${projected_change < 0 ? "-$" : "$"}${Math.abs(Math.floor(projected_change)).toLocaleString()}</span>`,
        );
    };

    const DEBT_STRING = uninflatedBalance < 0
        ? "<p style='color:red;font-weight:bolder;'>Campaign currently in debt. Effectiveness will suffer.</p>"
        : "";

    let a_states = "";
    for (const i in window.e.states_json) {
        a_states += `<option value='${window.e.states_json[i].pk}'>${window.e.states_json[i].fields.name}</option>\n`;
    }

    const adSpendTable = `
            <table id="ad_spend_table" style='text-align:center;width: 60%; margin-top: .1em; margin-left: auto; margin-right: auto; background-color: #F9F9F9;color:black;'>
                <thead><tr><th>State</th><th>Amount per Turn</th><th>Remove</th></tr></thead>
                <tbody><!-- Table rows will be added dynamically --></tbody>
            </table>`;
    const staffTable = `
            <table id="staff_table" style='text-align:center;width: 60%; margin-top: .1em; margin-left: auto; margin-right: auto; background-color: #F9F9F9;color:black;'>
                <thead><tr><th>Staff</th><th style="width: 250px;">Description</th><th>Cost (one time)</th><th>Hired?</th></tr></thead>
                <tbody><!-- Table rows will be added dynamically --></tbody>
            </table>`;
    const lobbyTable = `
            <table id="pac_table" style='text-align:center;width: 60%; margin-top: .1em; margin-left: auto; margin-right: auto; background-color: #F9F9F9;color:black;'>
                <thead><tr><th style="width: 200px;">Organisation</th><th style="width: 150px;">Description</th><th>Relationship</th></tr></thead>
                <tbody><!-- Table rows will be added dynamically --></tbody>
            </table>`;

    const z = `
        <div class="inner_window_front" id="shining_menu_header" style="height: 50px; background-color:#2d2d2d">
            <h1 style='position:absolute;top:50%;left:50%;transform: translate(-50%,-50%);font-family: Arial, "Helvetica Neue", Helvetica, sans-serif; text-align: center; font-size: 3em; line-height: normal; font-style: italic; color: white; margin: 0;'>State of the Campaign</h1>
        </div>
        <div class="shining_tab" style='position: absolute;bottom: 65px;left:50%;transform:translateX(-50%)'>
            <button class="tablinks" onclick="openTab(event, 'funds')">Funds</button>
            <button class="tablinks" onclick="openTab(event, 'campaign_time')">Campaign Time</button>
            <button class="tablinks" onclick="openTab(event, 'ad_campaign')">Ad Campaign</button>
            <button class="tablinks" onclick="openTab(event, 'staff')">Staff</button>
            <button class="tablinks" onclick="openTab(event, 'lobbies')">Lobbies</button>
        </div>
        <div class="inner_window_front" id="shining_menu" style="height: 260px; overflow-y: auto; background-color:#2d2d2d; color:white;">
            <div id="funds" class="tabcontent">
                <h2>Funds</h2>
                <p><b>Current balance:</b> <span id='shining_balance'>$${Math.floor(uninflatedBalance).toLocaleString()}</span></p>
                <p><b>Change in balance from previous turn:</b> <span style='${change > 0 ? "color:green" : change == 0 ? "color:yellow" : "color:red"};'>${change < 0 ? "-$" : "$"}${Math.abs(Math.floor(change)).toLocaleString()}</span></p>
                <p id='projected_change'><b>Estimated change for next turn:</b> <span style='${projected_change > 0 ? "color:green" : projected_change == 0 ? "color:yellow" : "color:red"};'>${projected_change < 0 ? "-$" : "$"}${Math.abs(Math.floor(projected_change)).toLocaleString()}</span></p>
                ${DEBT_STRING}
            </div>
            <div id="campaign_time" class="tabcontent">
                <h2>Campaign Time</h2>
                <div class="time_slider_group">
                    <div class="time_slider"><label for="campaign_time_physical">Physically Campaigning:</label><input type="range" id="campaign_time_physical" min="0" max="1" step="0.01" value="0.33"></div>
                    <div class="time_slider"><label for="campaign_time_fundraising">Fundraising:</label><input type="range" id="campaign_time_fundraising" min="0" max="1" step="0.01" value="0.33"></div>
                    <div class="time_slider"><label for="campaign_time_media">Media Engagement:</label><input type="range" id="campaign_time_media" min="0" max="1" step="0.01" value="0.34"></div>
                </div>
            </div>
            <div id="ad_campaign" class="tabcontent">
                <h2>Ad Campaign</h2>
                <p>Select a state to add ad spending for it:</p><select id='shining_ad_state_sel'>${a_states}</select>
                <p>Enter ad spending amount:</p><input id="ad_spending_amount" placeholder="Amount"><input type="range" id="ad_spending_slider" min="0" step="1"><button id="add_ad_spending">Add Spending</button>
                <h2>Current Ad Spends</h2><em>Note: will <b>all</b> automatically be cancelled in the event of your campaign running a debt.</em>
                <p><div style='text-align: center;'>${adSpendTable}</div></p>
            </div>
            <div id="staff" class="tabcontent"><h2>Staff</h2><div style='text-align: center;'>${staffTable}</div></div>
            <div id="lobbies" class="tabcontent"><h2>Lobbies</h2><em>Align your answers with an organisation's values in order to have them contribute to fundraising.</em><p><div style='text-align: center;'>${lobbyTable}</div></p></div>
        </div>
        <button id="shining_back" style="position: relative; bottom: -13px; left: -380px; width: 150px; height: 80px; font-size: 40px; padding-top: 5px; padding-left: 8px;"><b>BACK</b></button>
        <style>.time_slider_group{display:flex;flex-direction:column;align-items:center;} .time_slider{display:flex;align-items:center;margin-bottom:8px;} .time_slider label{margin-right:10px;width:180px;}</style>`;

    for (let i in game_winArr) {
        if (game_winArr[i].getAttribute("id") != "main_content_area" && game_winArr[i].getAttribute("class") != "game_header") {
            game_winArr[i].remove();
        }
    }

    const game_window = $("#game_window")[0];
    if ($("#main_content_area")[0]) $("#main_content_area")[0].style.display = "none";

    const inner_window_question = document.createElement("div");
    inner_window_question.innerHTML = z;
    game_window.appendChild(inner_window_question);

    $("#shining_back").click(() => { questionHTML(polling); });

    $("#add_ad_spending").click(() => {
        let currval = $("#ad_spending_amount").val();
        currval = currval.replaceAll(",", "");
        currval = Math.abs(Number(currval));
        currval = isNaN(currval) ? 0 : Math.floor(currval);
        currval = Math.min(window.e.shining_data.balance / inflation_factor, currval);
        currval = Math.max(0, currval);

        const selectedStatePk = Number($("#shining_ad_state_sel").val());
        const adSpendingAmount = currval;

        const currentState = window.e.shining_data.ad_spending.find((f) => f.state == selectedStatePk);
        if (currentState) {
            window.e.shining_data.balance += currentState.amount;
            currentState.amount = adSpendingAmount * inflation_factor;
        } else {
            window.e.shining_data.ad_spending.push({ state: selectedStatePk, amount: adSpendingAmount * inflation_factor });
        }
        window.e.shining_data.balance -= adSpendingAmount * inflation_factor;
        update_projection();
        $("#ad_spending_slider").val(0);
        $("#ad_spending_amount").val(0);
        updateSliderMax();
        update_projection();
        update_ad_table();
    });

    const updateSliderMax = () => {
        const currentBalance = parseFloat(window.e.shining_data.balance / inflation_factor);
        const slider = $("#ad_spending_slider");
        slider.attr("max", currentBalance);
        slider.val(0);
        $("#shining_balance").html(`$${Math.floor(window.e.shining_data.balance / inflation_factor).toLocaleString()}`);
    };

    const update_staff_table = () => {
        const tableBody = $("#staff_table tbody");
        tableBody.html("");
        const our_info = campaignTrail_temp.shining_info.find((f) => f.pk === window.e.election_id && f.candidate === window.e.candidate_id);
        for (const i in our_info.staff) {
            const targ = our_info.staff[i];
            const hire_str = targ.hired == true ? `<em>Hired.</em>` : `<button class="hire_button" data-pk="${targ.pk}" style='color:green'>Hire</button>`;
            const newRow = `<tr><td><h4>${targ.name}</h4><img style='width:100px' src='${targ.image}'></img></td><td>${targ.description}</td><td>$${Math.floor(targ.cost / inflation_factor).toLocaleString()}</td><td>${hire_str}</td></tr>`;
            tableBody.append(newRow);
            $(`button.hire_button[data-pk="${targ.pk}"]`).click(() => {
                if (window.e.shining_data.balance < 0) return;
                window.e.shining_data.balance -= targ.cost;
                our_info.staff[i].hired = true;
                our_info.staff[i].execute();
                updateSliderMax();
                update_projection();
                update_staff_table();
            });
        }
    };

    const update_pac_table = () => {
        const tableBody = $("#pac_table tbody");
        tableBody.html("");
        const our_info = campaignTrail_temp.shining_info.find((f) => f.pk === window.e.election_id && f.candidate === window.e.candidate_id);
        for (const i in our_info.lobby) {
            const targ = our_info.lobby[i];
            const newRow = `<tr><td><h4>${targ.name}</h4><img style='width:100px' src='${targ.image}'></img></td><td>${targ.description}</td><td>Opinion: ${Math.floor(targ.opinion)}<br>Max Bonus: $${Math.floor(targ.fund_base / inflation_factor).toLocaleString()}</td></tr>`;
            tableBody.append(newRow);
        }
    };

    const update_ad_table = () => {
        const tableBody = $("#ad_spend_table tbody");
        tableBody.html("");
        for (const i in window.e.shining_data.ad_spending) {
            const targ = window.e.shining_data.ad_spending[i];
            const newRow = `<tr><td>${window.e.states_json.find((f) => f.pk === targ.state).fields.name}</td><td>$${Math.floor(targ.amount / inflation_factor).toLocaleString()}</td><td><button class="remove_ad_spend" data-state-pk="${targ.state}" style='color:red'>Remove</button></td></tr>`;
            tableBody.append(newRow);
            $(`button.remove_ad_spend[data-state-pk="${targ.state}"]`).click(() => {
                window.e.shining_data.balance += targ.amount;
                window.e.shining_data.ad_spending.splice(i, 1);
                updateSliderMax();
                update_ad_table();
                update_projection();
            });
        }
    };

    $("#ad_spending_slider").change(() => {
        $("#ad_spending_amount").val($("#ad_spending_slider").val());
        $("#ad_spending_amount").val(Number($("#ad_spending_amount").val()));
    });

    $("#ad_spending_amount").change(() => {
        let currval = $("#ad_spending_amount").val();
        currval = currval.replaceAll(",", "");
        currval = Math.abs(Number(currval));
        currval = isNaN(currval) ? 0 : Math.floor(currval);
        currval = Math.min(window.e.shining_data.balance / inflation_factor, currval);
        currval = Math.max(0, currval);
        $("#ad_spending_amount").val(currval);
        $("#ad_spending_slider").val(currval);
    });

    function updateSliders(physicalTime, fundraisingTime, mediaTime) {
        $("#campaign_time_physical").val(physicalTime);
        $("#campaign_time_fundraising").val(fundraisingTime);
        $("#campaign_time_media").val(mediaTime);
        window.e.shining_data.times.physical_time = physicalTime;
        window.e.shining_data.times.fundraising_time = fundraisingTime;
        window.e.shining_data.times.media_time = mediaTime;
        update_projection();
    }

    $("#campaign_time_physical, #campaign_time_fundraising, #campaign_time_media").on("input", () => {
        const physicalTime = parseFloat($("#campaign_time_physical").val());
        const fundraisingTime = parseFloat($("#campaign_time_fundraising").val());
        const mediaTime = parseFloat($("#campaign_time_media").val());
        const total = physicalTime + fundraisingTime + mediaTime;
        if (total !== 0) {
            const adjustment = 1 / total;
            updateSliders(physicalTime * adjustment, fundraisingTime * adjustment, mediaTime * adjustment);
        } else {
            updateSliders(0.33, 0.33, 0.34);
        }
    });

    updateSliders(window.e.shining_data.times.physical_time, window.e.shining_data.times.fundraising_time, window.e.shining_data.times.media_time);
    updateSliderMax();
    $("#ad_spending_slider").val(0);
    $("#ad_spending_amount").val(0);
    update_ad_table();
    update_staff_table();
    update_pac_table();
    update_projection();
    openTab(null, "funds");
};

const shining_cal = (polling) => {
    const our_info = campaignTrail_temp.shining_info.find((f) => f.pk === window.e.election_id && f.candidate === window.e.candidate_id);

    if ((window.e.question_number + 1) % 2 === 0 && PROPS.ELECTIONS.get(String(window.e.election_id)).has_visits) {
        const active_opps = window.e.opponents_list.filter((f) => PROPS.CANDIDATES.get(String(f)).is_active === 1);
        const closests = {};
        active_opps.forEach((opp) => {
            let closest = polling[0];
            polling.forEach((state) => {
                if (state.result[0].candidate === opp || state.result[1].candidate === opp) {
                    if (Math.abs(state.result[0].percent - state.result[1].percent) < Math.abs(closest.result[0].percent - closest.result[1].percent)) {
                        closest = state;
                    }
                }
            });
            closests[opp] = closest;
        });

        window.e.opponent_visits.push({});
        active_opps.forEach((f) => {
            window.e.opponent_visits[window.e.opponent_visits.length - 1][f] = closests[f].state;
            const target = window.e.candidate_state_multiplier_json.find((_f) => _f.fields.state === closests[f].state && _f.fields.candidate === f);
            target.fields.state_multiplier += 0.001 * (our_info ? our_info.opponent_visit_effect : 1);
        });
    }

    our_info.lobby.forEach((f) => {
        const relevant = window.e.answer_score_issue_json.filter((_f) => _f.fields.issue === f.issue_tie && _f.fields.answer === window.e.player_answers[window.e.player_answers.length - 1]);
        for (const i in relevant) {
            const op_raw = f.issue_link(relevant[i].fields.issue_score * relevant[i].fields.issue_importance);
            const op_final = op_raw * 10;
            f.opinion += op_final;
            f.opinion = Math.min(100, f.opinion);
        }
    });

    window.e.shining_data.prev_balance = window.e.shining_data.balance;
    window.e.shining_data.balance += 5000000 * window.e.shining_data.times.fundraising_time * (our_info ? our_info.fundraising_effect : 1);
    window.e.shining_data.balance -= 500000 - 100000 * randomNormal(window.e.candidate_id);

    our_info.lobby.forEach((f) => {
        const x = f.opinion;
        const r = 0.097;
        const x0 = 65.3;
        const y = f.fund_base / (1 + Math.exp(-r * (x - x0)));
        window.e.shining_data.balance += y;
    });

    let media_boost = (window.e.shining_data.times.media_time - 0.5) * 0.0025;
    media_boost = window.e.shining_data.balance < 0 ? media_boost - 0.0025 : media_boost;
    window.e.candidate_state_multiplier_json.forEach((f) => {
        if (f.fields.candidate === window.e.candidate_id) {
            f.fields.state_multiplier += media_boost;
        }
    });

    window.e.shining_data.visit_multiplier += (window.e.shining_data.times.physical_time * 2 - 1) / 50;
    window.e.shining_data.visit_multiplier = Math.max(0, window.e.shining_data.visit_multiplier);
    window.e.shining_data.visit_multiplier = Math.min(2, window.e.shining_data.visit_multiplier);

    window.e.shining_data.ad_spending.forEach((f) => {
        const target = window.e.candidate_state_multiplier_json.find((_f) => f.state === _f.fields.state && _f.fields.candidate === window.e.candidate_id);
        const currMult = target.fields.state_multiplier;
        const boost = (currMult * f.amount) / 750000000;
        target.fields.state_multiplier += boost * (our_info ? our_info.ad_effect : 1);
        window.e.shining_data.balance -= f.amount;
    });

    if (window.e.shining_data.balance < 0) {
        window.e.shining_data.ad_spending = [];
    }
};

function handleFinalResults(t) {
    let i = 0;
    window.e.final_overall_results.forEach((f) => {
        const g = f;
        g.popular_votes = 0;
        g.electoral_votes = 0;
    });
    window.e.final_state_results.forEach((f) => {
        if (f.result_time <= t) {
            i++;
            f.result.forEach((g) => {
                window.e.final_overall_results.forEach((h) => {
                    if (h.candidate === g.candidate) {
                        const i = h;
                        i.popular_votes += g.votes;
                        i.electoral_votes += g.electoral_votes;
                    }
                });
            });
        }
    });
    window.e.final_overall_results.sort((a, b) => {
        if (b.electoral_votes !== a.electoral_votes) {
            return b.electoral_votes - a.electoral_votes;
        }
        return b.popular_votes - a.popular_votes;
    });
    return i;
}

function onAnswerSelectButtonClicked() {
    const selectedAnswerPk = $("input:radio[name=game_answers]:checked").val();
    debugConsole("answer button clicked, skip question? ", campaignTrail_temp.skippingQuestion, "selected answer", selectedAnswerPk);
    if (!selectedAnswerPk && !campaignTrail_temp.skippingQuestion) {
        advisorFeedback();
    } else {
        answerEffects(selectedAnswerPk);
    }
}

function questionHTML() {
    const ansArr = shuffleAnswers(
        window.e.answers_json
            .map((f, idx) => ({ f, idx }))
            .filter(({ f }) => stringsEqual(f.fields.question, window.e.questions_json[window.e.question_number].pk))
            .slice(0, window.e.answer_count)
            .map(({ idx }) => ({ key: idx })),
    );

    const gameWindow = document.querySelector("#game_window");
    const s = ansArr.map((f, idx) => `
    <input type="radio" name="game_answers" class="game_answers" id="game_answers[${idx}]" value="${window.e.answers_json[f.key].pk}"/>
    <label for="game_answers[${idx}]">${substitutePlaceholders(window.e.answers_json[f.key].fields.description)}</label><br>
  `).join("").trim();
    const l = `
    <img id="candidate_pic" src="${window.e.candidate_image_url}">
    <img id="running_mate_pic" src="${window.e.running_mate_image_url}">
    <div class="inner_window_sign_display">
      <div id="progress_bar">
        <h3>Question ${window.e.question_number + 1} of ${PROPS.PARAMS.question_count}</h3>
      </div>
      <div id="campaign_sign">
        <p>${window.e.candidate_last_name}</p>
        <p>${window.e.running_mate_last_name}</p>
      </div>
    </div>
  `.trim();
    const shining_button = Number(window.e.game_type_id) === 3
        ? '<button id="shining_menu_button" class="answer_select_button" style="color:navy;font-weight:bolder;margin-left:1.5em;">The Campaign</button>'
        : "";
    const z = `
    <div class="inner_inner_window">
      <h3>${substitutePlaceholders(window.e.questions_json[window.e.question_number].fields.description)}</h3>
      <div id="question_form">
        <form name="question">${s}</form>
      </div>
    </div>
    <p>
      <button id="answer_select_button" class="answer_select_button">CONTINUE</button>
      <button id="view_electoral_map">Latest Polls/Electoral Map</button>
      ${shining_button}
    </p>
  `;
    gameWindow.querySelectorAll(":scope > *:not(#main_content_area):not(.game_header)").forEach((el) => el.remove());
    const mainContentArea = document.getElementById("main_content_area");
    if (mainContentArea) mainContentArea.style.display = "none";

    const innerWindowQuestion = document.createElement("div");
    innerWindowQuestion.className = "inner_window_question";
    innerWindowQuestion.innerHTML = z;
    gameWindow.appendChild(innerWindowQuestion);

    const ports = document.createElement("g");
    ports.innerHTML = l;
    gameWindow.appendChild(ports);

    window.e.code2Loaded = true;

    const $answerButton = $("#answer_select_button");
    $answerButton.off('click').on('click', (evt) => {
        evt.preventDefault();
        evt.stopImmediatePropagation();
        onAnswerSelectButtonClicked();
    });

    $("#view_electoral_map").off("click").on("click", (evt) => {
        evt.preventDefault();
        evt.stopImmediatePropagation();
        openMap(A(2));
    });

    if (Number(window.e.game_type_id) === 3) {
        $("#shining_menu_button").off("click").on("click", (evt) => {
            evt.preventDefault();
            shining_menu(A(2));
        });
    }
}

function openMap(_e) {
    const gameWindow = document.querySelector("#game_window");
    const mainContentArea = document.querySelector("#main_content_area");
    const advisorButtonText = (window.e.answer_feedback_flg === 1)
        ? "Disable advisor feedback"
        : "Enable advisor feedback";
    if (mainContentArea) {
        gameWindow.querySelectorAll(":scope > *:not(#main_content_area):not(.game_header)")
            .forEach((el) => el.remove());

        const footer_html = `
      <button id="resume_questions_button">Back to the game</button>
      <button id="margin_switcher">Switch margin colouring gradient</button>
      <button id="AdvisorButton">${advisorButtonText}</button>
    `.trim();
        const ftH = document.createElement("div");
        ftH.id = "map_footer";
        ftH.innerHTML = footer_html;
        gameWindow.appendChild(ftH);
        $("#main_content_area").show();
    } else {
        $("#game_window").html(`
      <div class="game_header">${window.corrr}</div>
      <div id="main_content_area">
        <div id="map_container"></div>
        <div id="menu_container">
          <div id="overall_result_container">
            <div id="overall_result">
              <h3>ESTIMATED SUPPORT</h3>
              <p>Click on a state to view more info.</p>
            </div>
          </div>
          <div id="state_result_container">
            <div id="state_info">
              <h3>STATE SUMMARY</h3>
              <p>Click/hover on a state to view more info.</p>
              <p>Precise results will be available on election night.</p>
            </div>
          </div>
        </div>
      </div>
      <div id="map_footer">
        <button id="resume_questions_button">Back to the game</button>
        <button id="margin_switcher">Switch margin colouring gradient</button>
        <button id="AdvisorButton">${advisorButtonText}</button>
      </div>
    `.trim());

        $("#map_container").usmap(rFunc(_e, 0));
    }
}

function visitState(state, o, t) {
    setTimeout(() => mapCache(true), 0);
    window.e.player_visits.push(state.pk);
    o(t);
}

function formatNumbers(num) {
    if (typeof num !== "number") {
        num = Number(num);
        if (Number.isNaN(num)) return "";
    }
    return num.toLocaleString(window.e.numberFormat);
}

window.e.answer_count = 4;

function primaryFunction(execute, breaks) {
    if (!execute) return false;

    const dat = window.e.primary_code[breaks.indexOf(window.e.question_number)];
    const stateMap = dat.states;
    const stateMap2 = window.e.states_json.map((f) => f.pk);
    states = [];
    stateMap.forEach((f) => {
        const correctState = stateMap2.indexOf(f);
        states.push(window.e.states_json[correctState]);
    });

    window.e.final_state_results = A(1);
    window.e.final_state_results = window.e.final_state_results.filter((f) => stateMap.includes(f.state));
    const filt = window.e.final_state_results.slice();

    if (window.e.primary_states == null) {
        window.e.primary_states = [];
    } else if (typeof window.e.primary_states === "string") {
        window.e.primary_states = JSON.parse(window.e.primary_states);
    }

    for (let i = 0; i < filt.length; i++) {
        window.e.primary_states.push(filt[i]);
    }
    window.e.primary_states = JSON.stringify(window.e.primary_states);

    electionNight('primary', 120, states);
    return true;
}

function updateUsMapStyles(config) {
    const $map = $("#map_container");
    const plugin = $map.data("plugin-usmap");
    if (!plugin) {
        if ($map.length) {
            $map.usmap(config);
        }
        return;
    }

    const options = [
        "stateStyles",
        "stateHoverStyles",
        "stateSpecificStyles",
        "stateSpecificHoverStyles",
        "click",
        "mouseover",
    ];

    for (const option of options) {
        if (config[option]) plugin.options[option] = config[option];
    }

    const styles = plugin.options.stateSpecificStyles || {};
    for (const abbr in styles) {
        if (!Object.prototype.hasOwnProperty.call(styles, abbr)) continue;
        const shape = plugin.stateShapes[abbr];
        const st = styles[abbr] || {};
        if (shape) {
            const attrs = {};
            if (st.fill) attrs.fill = st.fill;
            if (st["fill-opacity"] != null) attrs["fill-opacity"] = st["fill-opacity"];
            shape.attr(attrs);
        }
    }
}

function showOutcomePopup(election, results) {
    if (!election || !results) return;
    const electionUsed = PROPS.ELECTIONS.get(String(election));
    $("#game_window").append(`
        <div class="overlay" id="election_night_overlay"></div>
        <div class="overlay_window" id="election_night_window">
            <div class="overlay_window_content" id="election_night_content">
                <h3>Advisor Feedback</h3>
                <img src="${electionUsed.advisor_url}" width="208" height="128"/>
                <p>${results[0].candidate === window.e.candidate_id ? window.e.WinPopup : window.e.LosePopup}</p>
            </div>
            <div class="overlay_buttons" id="winner_buttons">
                <button id="ok_button">OK</button>
                <br>
                <button id="overlay_result_button">Go to Final Results</button>
            </div>
        </div>
    `);
}

function generateCandidateList(cands, results, stateResults, total, statesHaveEVs) {
    if (!cands || !results || total == null) return "";

    return cands.map((f) => {
        const candResult = results.find((g) => g.candidate === f.candidate) || { electoral_votes: 0, popular_votes: 0 };
        const candEVs = candResult.electoral_votes;
        const candPVs = candResult.popular_votes;
        const candPVP = total > 0 ? ((candPVs / total) * 100).toFixed(1) : "0.0";
        const hasNoVotes = stateResults.every(
            (st) => st.result.every(
                (c) => (c.candidate !== f.candidate) || (c.votes === 0 && c.electoral_votes === 0)
            )
        );

        return hasNoVotes ? '' : `
      <li>
        <span style="color:${f.color}; background-color:${f.color}">--</span>
          ${f.last_name}: ${statesHaveEVs ? `${formatNumbers(candEVs)} / ` : ""}${candPVP}%
      </li>
    `;
    }).join("");
}

function electionNight(type = 'general', timestep = 10, states = []) {
    if (window.e.bigshot_mode) {
        const cheatMenu = document.querySelector('.cheat_menu');
        if (cheatMenu) cheatMenu.classList.add('minimized');
    }

    const isGeneral = type === 'general';
    const globalParam = PROPS.PARAMS;
    const sortedCands = getSortedCands();
    const activeStates = isGeneral ? window.e.states_json : states;
    const someStatesHaveEVs = activeStates.some((f) => f.fields.electoral_votes > 0);
    const stateMap = mapPkToFields(activeStates);

    const i = sortedCands.map((f) => {
        const hasNoVotes = window.e.final_state_results.every(
            (st) => st.result.every(
                (c) => c.candidate !== f.candidate || (c.votes === 0 && c.electoral_votes === 0)
            )
        );
        return hasNoVotes ? '' : `<li><span style="color:${f.color}; background-color:${f.color}">--</span> ${f.last_name}: ${someStatesHaveEVs ? "0 / " : ""}0.0%</li>`;
    }).join("");

    const s = PROPS.ELECTIONS.get(String(window.e.election_id));
    const winningEV = s.winning_electoral_vote_number;
    const formattedWinningEV = formatNumbers(winningEV);
    const evsToWin = `${someStatesHaveEVs ? `</br>${formattedWinningEV} to win` : ""}`;
    const footerText = isGeneral ? 'Go to Final Results' : 'Go back to questions';

    const removeElectionNightWindows = () => $("#election_night_overlay, #election_night_window").remove();

    $("#game_window").html(`
    <div class="game_header">${window.corrr}</div>
    <div id="main_content_area">
      <div id="map_container"></div>
      <div id="menu_container">
        <div id="overall_result_container">
          <div id="overall_result">
            <h3>${isGeneral ? 'ELECTORAL VOTES' : 'DELEGATES'}</h3>
            <ul>${i}</ul>
            <p>0% complete${evsToWin}</p>
          </div>
        </div>
        <div id="state_result_container">
          <div id="state_result">
            <h3>STATE RESULTS</h3>
            <p>Click on a state to view detailed results (once returns for that state arrive).</p>
          </div>
        </div>
      </div>
    </div>
    <div id="map_footer"><button id="final_result_button">${footerText}</button></div>
    <div class="overlay" id="election_night_overlay"></div>
    <div class="overlay_window" id="election_night_window">
        <div class="overlay_window_content" id="election_night_content">
          <h3>Advisor Feedback</h3>
          <img src="${s.advisor_url}" width="208" height="128"/>
          <p>${isGeneral ? window.e.ElectionPopup : 'One of many election nights has arrived. Winning the delegates in these races will be vital to your primary victory.'}</p>
        </div>
      <div class="overlay_buttons" id="election_night_buttons"><button id="ok_button">OK</button><br></div>
    </div>
  `);
    const lTemp = (() => {
        const t = Object.fromEntries(
            activeStates.map(({ fields: f }) => [f.abbr, { fill: globalParam.default_map_color_hex, "fill-opacity": window.e.stateOpacity }]),
        );
        return {
            stateStyles: { fill: "transparent" },
            stateHoverStyles: { fill: "transparent" },
            stateSpecificStyles: t,
            stateSpecificHoverStyles: t,
        };
    })();

    const finalResListener = () => {
        clearTimeout(window.results_timeout);
        $("#map_footer").html("<i>Processing Results, wait one moment...</i>");
        if (isGeneral) {
            handleFinalResults(500);
            m();
        } else {
            window.e.question_number++;
            nextQuestion();
        }
    };

    $("#map_container").usmap(lTemp);
    $("#final_result_button").click(finalResListener);

    window.e.final_overall_results = window.e.final_state_results[0].result.map((f) => ({
        candidate: f.candidate,
        electoral_votes: 0,
        popular_votes: 0,
    }));

    const overallRes = window.e.final_overall_results;

    window.e.final_state_results.forEach((f) => {
        const stateObj = stateMap.get(String(f.state));
        f.result_time = marginTime(f.result, stateObj.poll_closing_time);
    });

    $("#ok_button").click(() => {
        removeElectionNightWindows();
        window.results_timeout = setTimeout(() => {
            (function loop(time, step) {
                let prevMax = 0;
                overallRes.forEach((f) => { if (f.electoral_votes > prevMax) prevMax = f.electoral_votes; });

                const calledStates = handleFinalResults(time);
                const totalVotes = overallRes.reduce((sum, f) => sum + f.popular_votes, 0);

                let currentMax = 0;
                overallRes.forEach((f) => { if (f.electoral_votes > currentMax) currentMax = f.electoral_votes; });

                const candList = generateCandidateList(sortedCands, overallRes, window.e.final_state_results, totalVotes, someStatesHaveEVs);

                let h = Math.floor((time / 480) * 100);
                const p = mapResultColor(time);
                updateUsMapStyles(p);

                $("#overall_result > ul").html(candList);
                $("#overall_result > p").html(`${h}% complete ${evsToWin}`);

                if (isGeneral && prevMax < winningEV && currentMax >= winningEV) {
                    showOutcomePopup(window.e.election_id, overallRes);
                    $("#ok_button").click(() => {
                        removeElectionNightWindows();
                        window.results_timeout = setTimeout(() => loop(time + step, step), 2e3);
                    });
                    $("#overlay_result_button").click(() => {
                        removeElectionNightWindows();
                        finalResListener();
                    });
                } else if (time >= 480 || calledStates >= activeStates.length) {
                    h = 100;
                    $("#overall_result > ul").html(candList);
                    $("#overall_result > p").html(`${h}% complete ${evsToWin}`);
                } else window.results_timeout = setTimeout(() => loop(time + step, step), 2e3);
            }(0, timestep));
        }, 2e3);
    });
}

function nextQuestion() {
    if (Number(window.e.game_type_id) === 3) {
        const temp_polls = A(2);
        shining_cal(temp_polls);
    }
    const t = A(2);
    if (window.e.cyoa) {
        if (window.e.collect_results) {
            const a = A(2);
            window.e.current_results = [getLatestRes(a)[0], a];
        }
        cyoAdventure(window.e.questions_json[window.e.question_number]);
    }
    let a = false;
    if (window.e.primary) {
        window.primary_breaks = window.e.primary_code.map((f) => f.breakQ);
        a = primaryFunction(window.primary_breaks.includes(window.e.question_number), window.primary_breaks);
        if (a) {
            window.e.corQuestion = true;
            return false;
        }
    }
    if (window.e.question_number < PROPS.PARAMS.question_count - 1) {
        setTimeout(() => mapCache(false), 0);
    }
    if (window.e.corQuestion) window.e.corQuestion = false;
    else window.e.question_number++;

    if (window.e.player_answers.length < window.e.question_number) {
        while (window.e.player_answers.length !== window.e.question_number) {
            window.e.player_answers.push(null);
        }
    }

    if (window.e.question_number === Number(PROPS.PARAMS.question_count)) {
        window.e.final_state_results = A(1);
        electionNight();
        if (window.e.primary) {
            handleFinalResults(500);
            m();
        }
    } else if (window.e.question_number % 2 === 0) {
        const election = PROPS.ELECTIONS.get(String(window.e.election_id));
        if (election.has_visits) {
            $("#game_window").html(`
        <div class="game_header">${window.corrr}</div>
        <div id="main_content_area">
          <div id="map_container"></div>
          <div id="menu_container">
            <div id="overall_result_container">
              <div id="overall_result"><h3>ESTIMATED SUPPORT</h3><p>Click on a state to view more info.</p></div>
            </div>
            <div id="state_result_container">
              <div id="state_info"><h3>STATE SUMMARY</h3><p>Click/hover on a state to view more info.</p><p>Precise results will be available on election night.</p></div>
            </div>
          </div>
        </div>
        <p class="visit_text"><font size="2">Use this map to click on the next state you wish to visit. Choose wisely and focus your efforts where they will have the most impact.</font></p>`);
            const visitMap = rFunc(t, 1);
            $("#map_container").usmap(visitMap);
        } else questionHTML(t);
    } else questionHTML(t);

    if ($("#importfile").length && $("#importfile")[0].value != "") {
        importgame(window.e.dagakotowaru);
    }
    return true;
}

function answerEffects(t) {
    if (window.stopSpacebar && $("#visit_overlay")[0]) {
        debugConsole("Visit overlay is showing, not applying answer effects");
        return;
    }

    const numT = Number(t);
    const numCand = Number(window.e.candidate_id);
    const tToUse = t != null && Number.isNaN(numT) ? t : numT;

    debugConsole(`Applying answer effects for answer pk ${t}`);
    window.e.player_answers.push(tToUse);
    const election = PROPS.ELECTIONS.get(String(window.e.election_id));

    if (window.e.answer_feedback_flg === 1) {
        const feedback = window.e.answer_feedback_json.find((f) => stringsEqual(f.fields.answer, tToUse) && stringsEqual(f.fields.candidate, numCand))?.fields;
        if (feedback) {
            const n = `
                <div class="overlay" id="visit_overlay"></div>
                <div class="overlay_window" id="visit_window">
                    <div class="overlay_window_content" id="visit_content">
                        <h3>Advisor Feedback</h3>
                        <img src="${election.advisor_url}" width="208" height="128"/>
                        <p>${substitutePlaceholders(feedback.answer_feedback)}</p>
                    </div>
                    <div class="overlay_buttons" id="visit_buttons">
                        <button id="ok_button">OK</button><br>
                        <button id="no_feedback_button">Don't give me advice</button>
                    </div>
                </div>`.trim();
            $("#game_window").append(n);
            $("#ok_button").click(() => nextQuestion());
            $("#no_feedback_button").click(() => {
                window.e.answer_feedback_flg = 0;
                nextQuestion();
            });
        } else if (!feedback) nextQuestion();
    } else nextQuestion();
}

function advisorFeedback() {
    const election = PROPS.ELECTIONS.get(String(window.e.election_id));
    const advDiv = `
        <div class="overlay" id="feedback_overlay"></div>
        <div class="overlay_window" id="feedback_window">
            <div class="overlay_window_content" id="feedback_content">
                <h3>Advisor Feedback</h3>
                <img src="${election.advisor_url}" width="208" height="128"/>
                <p>${window.e.SelAnsContText}</p>
            </div>
            <div id="visit_buttons"><button id="ok_button">OK</button><br></div>
        </div>`.trim();
    $("#game_window").append(advDiv);
    $("#ok_button").click(() => $("#feedback_overlay, #feedback_window").remove());
}

function descHTML(descWindow, id) {
    const cands = PROPS.CANDIDATES;
    const candObj = cands.get(String(id));
    const isRM = descWindow === "#running_mate_description_window";
    const idx = isRM ? "running_mate_summary" : "candidate_summary";
    const desc = isRM ? "description_as_running_mate" : "description";
    const imageId = isRM ? "running_mate_image" : "candidate_image";

    $(descWindow).html(`
    <div class="person_image" id="${imageId}"><img src="${candObj.image_url}" width="210" height="250"/></div>
    <div class="person_summary" id="${idx}">
      <ul>
        <li>Name: ${candObj.first_name} ${candObj.last_name}</li>
         <li>${window.e.PartyText} ${candObj.party}</li>
         <li>${window.e.HomeStateText} ${candObj.state}</li>
      </ul>
      ${candObj[desc]}
    </div>`.trim());
}

function a(e) {
    let t;
    switch (e) {
        case "1":
            t = "<p><strong>Use the default method of allocating electoral votes for each state.</strong></p><p>In the vast majority of cases, states use a winner-take-all method. For instance, if Candidate A defeats Candidate B in a state, worth 20 electoral votes, Candidate A will usually win all 20 votes.</p><p>This method tends to concentrate the election into a handful of swing states. It also makes it difficult for third-party candidates to win electoral votes. On the other hand, it is easier for a single candidate to gain an overall majority of the electoral votes.</p>";
            break;
        case "2":
            t = "<p><strong>Allocate each state's electoral votes proportionally.</strong></p><p>Under this method, all candidates split the electoral votes in a state, in proportion to their popular vote %.</p><p>There is still an advantage to winning a state -- the winner of the state will always receive a plurality of electoral votes. For instance, in a state with 4 electoral votes, if Candidate A wins 51% of the vote, they will be awarded 3 electoral votes.</p><p>Compared to a winner-take-all method, this method aligns the electoral vote more closely with the popular vote. It also makes it easier to third party candidates to increase their electoral vote totals. In some scenarios, this effect is highly significant on the final outcome. Some examples are 1860, 1948, 1968, and 2000. </p>";
            break;
        case "3":
            t = `<p><strong style='color:navy'>From sea to shining sea!</strong> - <em>The "advanced mode" Campaign Trail experience.</em></p>
                <p>You will play with significantly increased control over the financial and internal aspects of your campaign, including:</p>
                <p>- Campaign finance<br>- Staffing your campaign<br>- Interactions with lobbies<br>- Ad buys</p>
                <p><b>This is not the recommended experience for new players.</b></p><p><b>Originally from New Campaign Trail, added with permission.</b></p>`;
            break;
    }
    $("#opponent_selection_description_window").html(t);
}

function realityCheck(cand, running_mate) {
    const pairs = window.e.running_mate_json.map((f) => [f.fields.candidate, f.fields.running_mate]);
    return pairs.some((pr) => pr[0] === cand && pr[1] === running_mate);
}

function election_HTML(id, cand, running_mate) {
    const cands = PROPS.CANDIDATES;
    const numId = Number(id);
    if (numId !== 16) {
        if (modded) {
            let yearbit, lastnamebit, veeplastname;
            try {
                yearbit = window.ree.election_json[findFromPK(window.ree.election_json, id)].fields.year;
                lastnamebit = window.ree.candidate_json[findFromPK(window.ree.candidate_json, campaignTrail_temp.candidate_id)].fields.last_name;
                veeplastname = window.ree.candidate_json[findFromPK(window.ree.candidate_json, campaignTrail_temp.running_mate_id)].fields.last_name;
            } catch { }

            const real = realityCheck(cand, running_mate);
            if (real) return `${yearbit}_${lastnamebit}_${veeplastname}.html`;
            return baseScenarioDict[yearbit];
        }
        const yearNM = PROPS.ELECTIONS.get(String(id)).year;
        const candNM = cands.get(String(cand)).last_name;
        const runNM = cands.get(String(running_mate)).last_name;
        return `${yearNM}_${candNM}_${runNM}.html`;
    }
    if (numId === 16) {
        if (modded) return baseScenarioDict["2016a"];
        return `2016a_${cands.get(String(cand)).last_name}_${cands.get(String(running_mate)).last_name}.html`;
    }
    return null;
}

function candSel(a) {
    a.preventDefault();
    const stringElect = String(window.e.election_id ?? window.e.election_json[0].pk);
    const n = window.e.candidate_json
        .filter((f) => stringsEqual(f.fields.election, stringElect) && f.fields.is_active)
        .map((f) => `<option value="${f.pk}">${f.fields.first_name} ${f.fields.last_name}</option>`)
        .join("");

    if (!modded) window.e.shining = window.e.shining_info.some((f) => stringsEqual(f.pk, stringElect));

    document.querySelector("#game_window").innerHTML = `
        <div class="game_header">${window.corrr}</div>
        <div class="inner_window_w_desc" id="inner_window_3">
            <div id="candidate_form">
                <form name="candidate">
                    <p><h3>${window.e.CandidText}</h3><select name="candidate_id" id="candidate_id">${n}</select></p>
                </form>
            </div>
            <div class="person_description_window" id="candidate_description_window"></div>
            <p><button class="person_button" id="candidate_id_back">Back</button><button class="person_button" id="candidate_id_button">Continue</button></p>
        </div>`.trim();

    const candId = document.getElementById("candidate_id");
    descHTML("#candidate_description_window", candId.value);
    candId.addEventListener("change", () => { descHTML("#candidate_description_window", candId.value); });
}

function vpSelect(t) {
    t.preventDefault();
    const candidate_id = document.getElementById("candidate_id");
    const a = candidate_id ? candidate_id.value : window.e.candidate_id;
    window.e.candidate_id = Number(a);

    const n = window.e.running_mate_json
        .filter((f) => f.fields.candidate === window.e.candidate_id)
        .map((f) => {
            const mate = f.fields.running_mate;
            const runObj = PROPS.CANDIDATES.get(String(mate));
            return `<option value="${mate}">${runObj.first_name} ${runObj.last_name}</option>`;
        })
        .join("");

    document.querySelector("#game_window").innerHTML = `
    <div class="game_header">${window.corrr}</div>
    <div class="inner_window_w_desc" id="inner_window_4">
        <div id="running_mate_form">
            <form name="running mate">
                <p><h3>${window.e.VpText}</h3><select name="running_mate_id" id="running_mate_id">${n}</select></p>
            </form>
        </div>
        <div class="person_description_window" id="running_mate_description_window"></div>
        <p><button class="person_button" id="running_mate_id_back">Back</button><button class="person_button" id="running_mate_id_button">Continue</button></p>
    </div>`.trim();

    const runningMateId = document.querySelector("#running_mate_id");
    descHTML("#running_mate_description_window", runningMateId.value);
    runningMateId.addEventListener("change", () => { descHTML("#running_mate_description_window", runningMateId.value); });
}

function renderOptions(electionId, candId, runId) {
    const numElectId = Number(electionId);
    const numCandId = Number(candId);
    let difficultyStr = "";
    window.e.difficulty_level_json.forEach((f) => {
        const difficulty = f;
        const isSelected = difficulty.fields.name === "Normal" ? "selected" : "";
        difficultyStr += `<option value="${difficulty.pk}" ${isSelected}>${difficulty.fields.name}</option>`;
    });
    let shining = "";
    if (window.e.shining) shining = `<option value=3 style="">Sea to Shining Sea</option>`;

    document.querySelector("#game_window").innerHTML = `
        <div class="game_header">${window.corrr}</div>
        <div class="inner_window_w_desc" id="inner_window_4">
            <div id="game_options">
                <form name="game_type_selection">
                    <p><h3>Select your game mode.</h3><select name="game_type_id" id="game_type_id"><option value="1">Default (Winner-Take-All)</option><option value="2">Proportional</option>${shining}</select></p>
                </form>
            </div>
            <div class="description_window_small" id="opponent_selection_description_window"></div>
            <div id="difficulty_level">
                <form name="difficulty_level_selection">
                <p><h3>Please choose your difficulty level:</h3><select name="difficulty_level_id" id="difficulty_level_id"> ${difficultyStr} </select></p>
                </form>
            </div>
            <p id="opponent_selection_id_button_p"><button class="person_button" id="opponent_selection_id_back">Back</button><button class="person_button" id="opponent_selection_id_button">Continue</button></p>
        </div>`.trim();

    const gameTypeId = document.querySelector("#game_type_id");
    const difficultyLevelId = document.querySelector("#difficulty_level_id");
    a(gameTypeId.value);
    gameTypeId.addEventListener("change", () => { a(gameTypeId.value); });

    $("#opponent_selection_id_button").click(() => {
        document.querySelector("#opponent_selection_id_button").outerHTML = "<em>One moment...</em>";
        const oppArr = [];
        const opponents = [];
        window.e.candidate_dropout_json.forEach((f) => {
            if (f.fields.candidate === numCandId) oppArr.push(f.fields.affected_candidate);
        });
        const d = window.e.opponents_default_json.findIndex((f) => f.election === numElectId);
        window.e.opponents_default_json[d].candidates.forEach((f) => {
            if (f !== numCandId && oppArr.indexOf(f) === -1) opponents.push(f);
        });

        window.e.election_id ||= electionId;
        window.e.candidate_id ||= candId;
        window.e.running_mate_id ||= runId;
        window.e.opponents_list = opponents;
        window.e.game_type_id = gameTypeId.value;
        window.e.difficulty_level_id = difficultyLevelId.value;
        window.e.difficulty_level_multiplier = window.e.difficulty_level_json.find(
            (f) => f.pk === Number(window.e.difficulty_level_id),
        ).fields.multiplier;
        starting_mult = encrypted + window.e.difficulty_level_multiplier;

        if (Number(window.e.game_type_id) === 3) {
            const default_init = 50000000;
            const boost = randomNormal(window.e.candidate_id) * default_init * PROPS.PARAMS.global_variance * 4;
            window.e.shining_data = {
                balance: (default_init + boost) * window.e.difficulty_level_multiplier,
                ad_spending: [],
                times: { fundraising_time: 0.33, media_time: 0.33, physical_time: 0.34 },
                visit_multiplier: 1,
            };
            window.e.shining_data.prev_balance = window.e.shining_data.balance;
        }

        if (campaignTrail_temp.musicOn) {
            document.getElementById("music_player").style.display = "";
            document.getElementById("campaigntrailmusic").src = campaignTrail_temp.musicSrc;
        }

        // BIGSHOT
        if (campaignTrail_temp.bigshot_mode) {
            let cheatmodeEl = document.getElementById('cheatmode');
            if (cheatmodeEl) cheatmodeEl.style.display = "";
            let imfloanEl = document.getElementById("imf_loan");
            if (window.e.game_type_id === "3" && imfloanEl) imfloanEl.style.display = "";
            let slider = document.getElementById("difficultyMod");
            if (slider) {
                slider.innerHTML = `Multiplier: <span contenteditable="true" id='difficulty_mult_bigshot'>${campaignTrail_temp.difficulty_level_multiplier.toFixed(2)}</span>`;
                if (typeof updateSliderValue === "function") updateSliderValue(campaignTrail_temp.difficulty_level_multiplier.toFixed(2));
                if (typeof manuallyAdjustedSlider === "function") document.getElementById('difficulty_mult_bigshot').addEventListener('input', manuallyAdjustedSlider);
            }
        }

        const aaa = `../static/questionset/${election_HTML(electionId, candId, runId)}`;
        Object.assign(window.e, {
            ...campaignTrail_temp,
            question_number: 0,
            election_id: Number(campaignTrail_temp.election_id),
            candidate_id: Number(campaignTrail_temp.candidate_id),
            running_mate_id: Number(campaignTrail_temp.running_mate_id),
            difficulty_level_id: Number(campaignTrail_temp.difficulty_level_id),
            game_start_logging_id: Number(campaignTrail_temp.game_start_logging_id),
        });

        const tempFuncO = (e) => {
            if (e.collect_results) {
                const a = A(2);
                e.current_results = [getLatestRes(a)[0], a];
            }
            questionHTML();
        };

        if (!modded) {
            $("#game_window").load(aaa, () => {
                const mapRes = A(2);
                questionHTML(mapRes);
            });
        } else if ($("#modSelect")[0]?.value !== "other" || window.e.hotload || (typeof loadingFromModButton !== "undefined" && loadingFromModButton)) {
            try {
                $("#game_window").load(aaa, async () => {
                    const cands = PROPS.CANDIDATES;
                    const year = window.e.temp_election_list.find((f) => stringsEqual(f.id, window.e.election_id)).display_year;
                    const cand = cands.get(String(window.e.candidate_id)).last_name;
                    const run = cands.get(String(window.e.running_mate_id)).last_name;
                    const theorId = `${window.e.code2_id || year}_${cand}${run}`;

                    if (typeof customMod === "undefined" || customMod === false) {
                        evalFromUrl(`../static/mods/${theorId}.html`, () => { tempFuncO(window.e); });
                    } else {
                        let code2 = window.campaignTrail_temp ? window.campaignTrail_temp.custom_code_2 : null;
                        if (!code2) code2 = localStorage.getItem(`${customMod}_code2`);
                        if (!code2 && window.getModFromDB) {
                            try {
                                const modData = await window.getModFromDB(customMod);
                                if (modData && modData.code2) code2 = modData.code2;
                            } catch (err) { console.error("Could not fetch code 2 from DB:", err); }
                        }
                        if (code2) {
                            executeMod(code2, { campaignTrail_temp, window, document, $, jQuery });
                        } else {
                            console.error("Code 2 was not found for custom mod: " + customMod);
                        }
                        tempFuncO(window.e);
                    }

                    const endingUrl = `../static/mods/${theorId}_ending.html`;
                    fileExists(endingUrl)
                        .then((exists) => {
                            if (!exists) return;
                            return fetch(endingUrl, { cache: "no-store" })
                                .then((resp) => {
                                    if (!resp.ok) throw new Error(`Failed to fetch ${endingUrl}: ${resp.status}`);
                                    return resp.text();
                                })
                                .then((text) => { important_info = text; })
                                .catch((err) => { console.error("Error loading code 2", err); });
                        })
                        .catch((err) => { console.error("Error checking file existence", err); });
                });
            } catch (err) { console.error("Error loading code 2", err); }
        } else {
            $("#game_window").load(aaa, () => {
                executeMod($("#codeset2")[0].value, { campaignTrail_temp, window, document, $, jQuery });
                tempFuncO(window.e);
            });
        }
        histFunction();
    });
}

function importgame(code) {
    starting_mult = encrypted + campaignTrail_temp.difficulty_level_multiplier;
    A(1);
    const campaigntrail = JSON.parse(code);
    window.e.election_id = campaigntrail.election_id;
    window.e.candidate_id = campaigntrail.player_candidate;
    window.e.player_answers = campaigntrail.player_answers;
    window.e.player_visits = campaigntrail.player_visits;
    window.e.final_overall_results = campaigntrail.overall_results;
    window.e.final_state_results = campaigntrail.state_results;
    window.e.difficulty_level_multiplier = campaigntrail.difficulty_multiplier;
    electionNight();
}

function getLatestRes(t) {
    const stateDataMap = new Map(window.e.states_json.map(s => [s.pk, s.fields]));
    const activeCandidates = window.e.candidate_json.filter((candidate) => window.e.opponents_list.includes(candidate.pk) || candidate.pk === window.e.candidate_id);
    const candidateTotals = new Map();
    activeCandidates.forEach(cand => { candidateTotals.set(cand.pk, { popvs: 0, evvs: 0 }); });

    let total_v = 0;

    for (const state of t) {
        const stateFields = stateDataMap.get(state.state);
        if (!stateFields) continue;
        const stateElectoralVotes = stateFields.electoral_votes;
        const evAllocation = new Map();

        if (window.e.primary_states) {
            const primaryStates = getPrimaryStatesParsed();
            const isPrimaryState = primaryStates.some(ps => ps.state === state.state);
            if (isPrimaryState) {
                const voteCounts = state.result.map(r => r.votes);
                const allocations = dHondtAllocation(voteCounts, stateElectoralVotes, 0.15);
                state.result.forEach((res, i) => { evAllocation.set(res.candidate, allocations[i] || 0); });
            }
        } else if (!window.e.primary) {
            const gameType = Number(window.e.game_type_id);
            if (gameType === 2) {
                const percentages = state.result.map(r => r.percent);
                const allocations = divideElectoralVotesProp(percentages, stateElectoralVotes);
                state.result.forEach((res, i) => { evAllocation.set(res.candidate, allocations[i] || 0); });
            } else if (stateFields.winner_take_all_flg === 1) {
                const winnerPk = state.result[0]?.candidate;
                if (winnerPk) evAllocation.set(winnerPk, stateElectoralVotes);
            } else {
                const totalVotes = state.result.reduce((sum, cr) => sum + (cr.votes || 0), 0);
                const topVotes = state.result[0]?.votes || 0;
                const [winnerEVs, runnerUpEVs] = splitEVTopTwo(stateElectoralVotes, topVotes, totalVotes);
                const winnerPk = state.result[0]?.candidate;
                const runnerUpPk = state.result[1]?.candidate;
                if (winnerPk) evAllocation.set(winnerPk, winnerEVs);
                if (runnerUpPk) evAllocation.set(runnerUpPk, runnerUpEVs);
            }
        }

        for (const candidateResult of state.result) {
            const candidatePk = candidateResult.candidate;
            const totals = candidateTotals.get(candidatePk);
            if (totals) {
                totals.popvs += candidateResult.votes;
                totals.evvs += (evAllocation.get(candidatePk) || 0);
            }
            total_v += candidateResult.votes;
        }
    }

    const finalCandidates = activeCandidates.map(candidate => {
        const totals = candidateTotals.get(candidate.pk) || { popvs: 0, evvs: 0 };
        candidate.popvs = totals.popvs;
        candidate.evvs = totals.evvs;
        candidate.pvp = total_v > 0 ? (totals.popvs / total_v) : 0;
        return candidate;
    });

    const sortedCandidates = finalCandidates.sort((a, b) => b.pvp - a.pvp);
    window.nn2 = sortedCandidates;
    window.nn3 = sortedCandidates.map(c => c.evvs || 0);

    return [sortedCandidates, answerEffects];
}

function setStatePollText(state, t) {
    const results = t.filter(({ abbr }) => abbr === state.fields.abbr);
    let doPrimaryMode = false;

    if (window.e.primary_states) {
        const primaryStates = getPrimaryStatesParsed();
        const primaryMap = primaryStates.map((f) => f.state);
        if (primaryMap.includes(results[0].state)) {
            doPrimaryMode = true;
            const trueRes = primaryStates[primaryMap.indexOf(results[0].state)];
            results[0].result = trueRes.result;
        }
    }

    const flatResults = results.flatMap(({ result }) => result);
    const filteredResults = flatResults.filter(({ percent }) => percent >= 0.1);
    const sortedResults = filteredResults.sort((a, b) => b.percent - a.percent);
    const cands = PROPS.CANDIDATES;

    const formattedResults = sortedResults.map(({ candidate, percent }) => {
        const candidateName = cands.get(String(candidate))?.last_name;
        if (!doPrimaryMode) return `<b>${candidateName}</b> - ${Math.round(100 * percent)}%<br>`;
        return `<b>${candidateName}</b> - ${(100 * percent).toFixed(1)}%<br>`;
    });

    const _ = formattedResults.join("");
    slrr = _;

    const someStatesHaveEVs = window.e.states_json.some((state) => state.fields.electoral_votes > 0);
    document.getElementById("overall_result").innerHTML = `
    <h3>${((!doPrimaryMode && !window.e.primary) || (window.e.primary && !doPrimaryMode)) ? "ESTIMATED SUPPORT" : "PRIMARY/CAUCUS RESULT"}</h3>
    <ul id='switchingEst'>${_}</ul>
    <button id='pvswitcher' onclick='switchPV()'>PV Estimate</button>
    ${someStatesHaveEVs ? `<button onclick='evest()' id='ev_est'>${!doPrimaryMode && !window.e.primary ? "Electoral Vote Estimate" : "Current Delegate Count"}</button>` : ""}
  `;
    let u = "";
    const globalParam = PROPS.PARAMS;

    window.e.state_issue_score_json.forEach(({ fields }) => {
        if (fields.state === state.pk) {
            const issue = window.e.issues_json.find((i) => stringsEqual(i.pk, fields.issue));
            let pickedStance = null;
            let stanceDesc = null;
            const borders = [
                globalParam.issue_stance_1_max, globalParam.issue_stance_2_max, globalParam.issue_stance_3_max,
                globalParam.issue_stance_4_max, globalParam.issue_stance_5_max, globalParam.issue_stance_6_max,
            ];
            for (let i = 0; i < borders.length; i++) {
                if (fields.state_issue_score <= borders[i]) {
                    pickedStance = issue.fields[`stance_${i + 1}`];
                    stanceDesc = issue.fields[`stance_desc_${i + 1}`];
                    break;
                }
            }
            pickedStance ??= issue.fields.stance_7;
            stanceDesc ??= issue.fields.stance_desc_7;
            if (stanceDesc === "'" || stanceDesc == null || !isNaN(stanceDesc)) stanceDesc = "";
            let issueDescription = issue.fields.description ?? "";
            if (issueDescription === "'" || issueDescription == null || !isNaN(issueDescription)) issueDescription = "";
            u += `
        <li ${campaignTrail_temp.issue_font_size != null ? `style="font-size: ${campaignTrail_temp.issue_font_size};"` : ""}>
          <span ${issueDescription ? "class=tooltip" : ""}>${issue.fields.name}<span style="font-size: 10.4px;" class="tooltiptext">${issueDescription}</span></span>
          <span> -- </span>
          <span ${stanceDesc ? "class=tooltip" : ""}>${pickedStance}<span style="font-size: 10.4px;" class="tooltiptext">${stanceDesc}</span></span>
        </li>`.trim().replace(/>\s+</g, "><");
        }
    });

    let onQText = "";
    if (window.e.primary) {
        const statesM = window.e.primary_code.map((f) => f.states).flatMap((f) => f);
        if (statesM.includes(state.pk)) {
            const match = window.e.primary_code.find((f) => f.states.includes(state.pk));
            if (match) onQText = `Primary on Question ${match.breakQ + 1}`;
        }
    }

    document.getElementById("state_info").innerHTML = `
        <h3>STATE SUMMARY</h3><p>${state.fields.name}</p><ul>${u}</ul>
        ${!state.fields.electoral_votes ? "" : `<p>${window.e.primary ? "Delegates:" : "Electoral Votes:"} ${formatNumbers(state.fields.electoral_votes)}</p>`}
        <p>${window.e.primary ? onQText : `Popular Votes: ${formatNumbers(state.fields.popular_votes)}`}</p>
    `.trim();
}

function rFunc(t, i) {
    if (!Array.isArray(t) || (Array.isArray(t) && t.length > 0 && (t[0] == null || typeof t[0] !== "object" || !("result" in t[0])))) {
        if (Array.isArray(t) && t.length === 2 && Array.isArray(t[1]) && t[1].length && t[1][0] && typeof t[1][0] === "object" && ("result" in t[1][0])) {
            t = t[1];
        } else {
            try { t = A(2); } catch (_err) { t = []; }
        }
    }

    const candidateMap = new Map();
    for (let cIdx = 0; cIdx < window.e.candidate_json.length; cIdx++) {
        const cand = window.e.candidate_json[cIdx];
        candidateMap.set(cand.pk, cand);
    }

    const abbrToState = new Map();
    for (let s = 0; s < window.e.states_json.length; s++) {
        const state = window.e.states_json[s];
        abbrToState.set(String(window.e.states_json[s].fields.abbr), state);
    }

    let stateToVisitor = null;
    if (String(window.e.game_type_id) === "3" && Array.isArray(window.e.opponent_visits) && window.e.opponent_visits.length) {
        const latestVisit = window.e.opponent_visits[window.e.opponent_visits.length - 1] || {};
        stateToVisitor = new Map(Object.entries(latestVisit).map(([candPk, statePk]) => [Number(statePk), Number(candPk)]));
    }

    const stateStylesSpecific = {};
    for (let s = 0; s < t.length; s++) {
        const item = t[s];
        const results = item.result;
        let top1 = -Infinity;
        let top2 = -Infinity;
        let winnerCand = null;
        for (let r = 0; r < results.length; r++) {
            const { percent, candidate } = results[r];
            if (percent > top1) {
                top2 = top1;
                top1 = percent;
                winnerCand = candidate;
            } else if (percent > top2) {
                top2 = percent;
            }
        }
        if (top2 === -Infinity) top2 = 0;

        const margin = top1 - top2;
        const candidate = candidateMap.get(winnerCand);
        if (!candidate) continue;

        const logMargin = Math.log(margin + 1) * 4.5;
        const gradVal = gradient(logMargin, 0, 1);
        let fillHex;

        if (String(window.e.game_type_id) === "3" && i === 1 && stateToVisitor && stateToVisitor.has(item.state)) {
            const visitorCandId = stateToVisitor.get(item.state);
            const visitorCand = candidateMap.get(visitorCandId);
            if (visitorCand) {
                fillHex = window.r2h(window._interpolateColor(window.h2r("#000000"), window._interpolateColor(window.h2r(visitorCand.fields.color_hex), window.h2r(candidate.fields.color_hex), gradVal), 0.7));
            }
        }
        if (!fillHex) {
            fillHex = window.r2h(window._interpolateColor(window.h2r(campaignTrail_temp.margin_format), window.h2r(candidate.fields.color_hex), gradVal));
        }
        stateStylesSpecific[item.abbr] = { fill: fillHex, 'fill-opacity': window.e.stateOpacity };
    }

    const latestRes = getLatestRes(t);
    const latestCandidates = latestRes[0];
    const evArray = latestCandidates.map((c) => c.evvs || 0);
    const cachedVV = latestCandidates.map((c) => {
        const hasNoVotes = c.popvs === 0 && c.evvs === 0;
        return hasNoVotes ? '' : `<b>${c.fields.last_name}</b> - ${(c.pvp * 100).toFixed(1)}%<br>`
    }).join("");
    const cachedNNN = latestCandidates.reduce((acc, c, idx) => {
        if (evArray[idx] > 0) acc += `<b>${c.fields.last_name}</b> - ${evArray[idx]}<br>`;
        return acc;
    }, "");

    let lastHoveredStateName = null;

    const hoverHandler = (_evt, data) => {
        if (lastHoveredStateName === data.name) return;
        lastHoveredStateName = data.name;
        window.nn2 = latestCandidates;
        window.nn3 = evArray;
        rrr = cachedVV;
        nnn = cachedNNN;
        window.evestt = 0;
        const stObj = abbrToState.get(data.name);
        if (stObj !== undefined) setStatePollText(stObj, t);
    };

    const election = PROPS.ELECTIONS.get(String(window.e.election_id));
    let config;
    if (i === 0) {
        config = {
            stateStyles: { fill: "transparent" },
            stateHoverStyles: { fill: "transparent" },
            stateSpecificStyles: stateStylesSpecific,
            stateSpecificHoverStyles: stateStylesSpecific,
            click: hoverHandler,
            mouseover: hoverHandler,
        };
    } else {
        config = {
            stateStyles: { fill: "transparent" },
            stateHoverStyles: { fill: "transparent" },
            stateSpecificStyles: stateStylesSpecific,
            stateSpecificHoverStyles: stateStylesSpecific,
            click(_evt, data) {
                for (const state of window.e.states_json) {
                    if (state.fields.abbr === data.name) {
                        const overlayHtml = `
              <div class="overlay" id="visit_overlay"></div>
              <div class="overlay_window" id="visit_window">
                <div class="overlay_window_content" id="visit_content">
                  <h3>Advisor Feedback</h3><img src="${election.advisor_url}" width="208" height="128"/><p>You have chosen to visit ${state.fields.name} -- is this correct?</p>
                </div>
                <div class="overlay_buttons" id="visit_buttons"><button id="confirm_visit_button">YES</button><br><button id="no_visit_button">NO</button></div>
              </div>`;
                        $("#game_window").append(overlayHtml);
                        $("#confirm_visit_button").click(() => visitState(state, questionHTML, t));
                        $("#no_visit_button").click(() => { $("#visit_overlay, #visit_window").remove(); });
                        break;
                    }
                }
            },
            mouseover: hoverHandler,
        };
    }
    return config;
}

function marginTime(results, time) {
    results.sort((a, b) => b.votes - a.votes);
    const voteMargin = (results[0].votes - results[1].votes) / (results[0].votes + results[1].votes);
    if (voteMargin < 0.0025) return 480;
    if (voteMargin < 0.005) return 460;
    if (voteMargin < 0.01) return time > 200 ? 440 : time + 240;
    if (voteMargin < 0.015) return time > 260 ? 440 : time + 180;
    if (voteMargin < 0.03) return time > 270 ? 420 : time + 150;
    if (voteMargin < 0.045) return time > 300 ? 420 : time + 120;
    if (voteMargin < 0.066) return time > 330 ? 420 : time + 90;
    if (voteMargin < 0.085) return time > 340 ? 420 : time + 80;
    if (voteMargin < 0.1) return time > 350 ? 420 : time + 70;
    if (voteMargin < 0.12) return time > 360 ? 420 : time + 60;
    if (voteMargin < 0.14) return time > 370 ? 420 : time + 50;
    if (voteMargin < 0.16) return time > 380 ? 420 : time + 40;
    if (voteMargin < 0.18) return time > 390 ? 420 : time + 30;
    if (voteMargin < 0.2) return time > 400 ? 420 : time + 20;
    if (voteMargin < 0.25) return time > 410 ? 420 : time + 10;
    return time;
}

function mapResultColor(time) {
    const cands = PROPS.CANDIDATES;
    const stateColor = {};
    window.e.final_state_results.forEach((f) => {
        const s = cands.get(String(f.result[0].candidate));
        if (f.result_time <= time) {
            stateColor[f.abbr] = { fill: s.color_hex, 'fill-opacity': window.e.stateOpacity };
        } else {
            stateColor[f.abbr] = { fill: PROPS.PARAMS.default_map_color_hex, 'fill-opacity': window.e.stateOpacity };
        }
    });
    return {
        stateStyles: { fill: "transparent" },
        stateHoverStyles: { fill: "transparent" },
        stateSpecificStyles: stateColor,
        stateSpecificHoverStyles: stateColor,
        click(i, a) {
            const stateResElement = $("#state_result");
            const stateResults = window.e.final_state_results.find((f) => String(f.abbr) === String(a.name));
            if (!stateResults) return;
            if (stateResults.result_time > time) {
                stateResElement.html("<h3>STATE RESULTS</h3><p>Returns for this state are not yet available!</p>");
                return;
            }
            const stateObj = window.e.states_json.find((f) => String(f.fields.abbr) === String(a.name));
            if (!stateObj) return;
            const resultHtml = stateResults.result.slice(0, 4).filter((f) => f.percent > 0).map((f) => {
                const candObj = cands.get(String(f.candidate));
                if (!candObj) return "";
                return `<li><span style="color:${candObj.color_hex}; background-color: ${candObj.color_hex}">--</span> ${candObj.last_name}: ${(100 * f.percent).toFixed(1)}%</li>`;
            }).join("");
            const evField = window.e.primary ? "Delegates:" : "Electoral Votes:";
            const stateHasEVs = stateObj.fields.electoral_votes > 0;
            stateResElement.html(`<h3>STATE RESULTS</h3><p>${stateObj.fields.name}</p><p>${!stateHasEVs ? "" : `${evField} ${stateObj.fields.electoral_votes}`}<ul>${resultHtml}</ul></p>`);
        },
    };
}

// achievement function
function unlockAchievement(ch, id, image, unlocked, locked = false) {
    console.log("ACHIEVEMENT UNLOCKED: " + id);
    const plays = ["../static/achievementicons/beep.mp3", "../static/achievementicons/beep2.mp3"];
    image = "../static/achievementicons/" + id + ".png";

    if (!locked) {
        if (window.amongusonetwothree) return false;
        else window.amongusonetwothree = true;

        let currentAchievement = localStorage.getItem('achievements');
        let cA = JSON.parse(currentAchievement);
        cA.achievements[id] = true;
        let newAch = JSON.stringify(cA);
        let sec = typeof MD5 !== "undefined" ? MD5(newAch) : newAch;
        localStorage.setItem("achievements", newAch);
        localStorage.setItem("ach4", sec);
    }

    const template = document.createElement("div");
    template.id = "achievement_box";
    template.style = "width:400px;height:100px;border-radius:25px;background-color: #337067;border-style: solid;position: fixed;right:30px;bottom:30px;z-index:9999;";
    template.innerHTML = `
        <img src=${image} style="width:80px;height:80px;border-style: solid;border-radius:5px; position: relative;top: 50%;transform: translateY(-50%);margin-left:15px;"></img>
        <div id="unlocked_text" style="font-family:Arial;color:white;position: relative;top: -55%;transform: translateY(-50%);margin-left:110px;">
        <h4>ACHIEVEMENT UNLOCKED</h4><em>${unlocked}</em></div>`;
    document.body.append(template);

    const audie = document.createElement("audio");
    audie.id = "achievementsound";
    audie.style = "display:none";
    audie.src = plays[1];
    document.body.append(audie);
    $("#achievementsound")[0].play();

    $("#achievement_box").fadeOut(0).fadeIn(500);

    window.setTimeout(function () {
        $("#achievement_box").fadeOut(1000, function () {
            $("#achievement_box").remove();
            $("#achievementsound").remove();
        });
    }, 8000);
}

function swap306(year) {
    let CAAS = localStorage.getItem('achievements');
    let CAASS = JSON.parse(CAAS);
    CAASS.threeosix["" + year] = true;
    let newAchg = JSON.stringify(CAASS);
    let secg = typeof MD5 !== "undefined" ? MD5(newAchg) : newAchg;
    localStorage.setItem("achievements", newAchg);
    localStorage.setItem("ach4", secg);
}

function isLegitRun() {
    return campaignTrail_temp.bigshot_mode != true && typeof dirtyhacker3 === "undefined" && String(window.e.game_type_id) !== "3";
}

function m() {
    if (window.e.primary) {
        const t = window.e.final_state_results;
        const filteredCandidates = window.e.candidate_json.filter(
            (candidate) =>
                window.e.opponents_list.includes(candidate.pk) ||
                stringsEqual(candidate.pk, window.e.candidate_id)
        );

        const total_v = window.e.final_state_results.reduce(
            (sum, f) => sum + f.result.reduce((s, g) => s + g.votes, 0),
            0
        );

        filteredCandidates.forEach((candidate) => {
            const cand = candidate;
            cand.popvs = 0;
            cand.evvs = 0;

            t.forEach((state) => {
                const stateObj = window.e.states_json.find(
                    (f) => f.pk === Number(state.state)
                );
                const stateElectoralVotes = stateObj.fields.electoral_votes;

                const candResObj = state.result.find(
                    (f) => f.candidate === Number(candidate.pk)
                );
                const candIndex = state.result.indexOf(candResObj);

                if (window.e.primary_states) {
                    const primaryStates = getPrimaryStatesParsed();

                    if (primaryStates.some((f) => f.state === state.state)) {
                        const allocation = dHondtAllocation(
                            state.result.map((f) => f.votes),
                            stateElectoralVotes,
                            0.15
                        );
                        cand.evvs += allocation[candIndex];
                    }
                } else if (candIndex === 0 && !window.e.primary) {
                    cand.evvs += stateElectoralVotes;
                }

                cand.popvs += candResObj.votes;
            });

            cand.pvp = cand.popvs / total_v;
            cand.popvs = 0;
        });

        const evMap = Object.fromEntries(
            filteredCandidates.map((f) => [f.pk, f.evvs])
        );
        window.e.final_overall_results.forEach((f) => {
            const cand = f.candidate;
            if (evMap[cand]) f.electoral_votes = evMap[cand];
        });
    }

    window.e.historical_overall = "None";
    window.e.percentile = "None";
    window.e.game_results_url = "None";

    overallResultsHtml();
}

function overallResultsHtml() {
    const cands = PROPS.CANDIDATES;
    const candObj = cands.get(String(window.e.candidate_id));
    const electJson = PROPS.ELECTIONS.get(String(window.e.election_id));
    const overallResults = window.e.final_overall_results;
    const winningNum = electJson.winning_electoral_vote_number;
    let s = '';

    if (overallResults[0].candidate === window.e.candidate_id && overallResults[0].electoral_votes >= winningNum) {
        s = candObj.electoral_victory_message;
        window.e.final_outcome = "win";
    } else if (overallResults[0].electoral_votes >= winningNum) {
        s = candObj.electoral_loss_message;
        window.e.final_outcome = "loss";
    } else {
        s = candObj.no_electoral_majority_message;
        window.e.final_outcome = "tie";
    }
    const nIdx = cands.get(String(overallResults[0].candidate));
    const l = (overallResults[0].electoral_votes >= winningNum && nIdx?.image_url) ? nIdx.image_url : electJson.no_electoral_majority_image;
    const totalPV = window.e.final_overall_results.reduce((sum, f) => sum + f.popular_votes, 0);

    if (important_info.indexOf("<html>") === -1 && important_info !== "") {
        campaignTrail_temp.multiple_endings = true;
    }

    let n = 0;
    for (let i = 0; i < window.e.final_overall_results.length; i++) {
        if (window.e.final_overall_results[i].candidate == window.e.candidate_id) {
            n = i;
            break;
        }
    }

    const candResults = window.e.final_overall_results[n];
    window.quickstats = [candResults.electoral_votes, (candResults.popular_votes / totalPV) * 100, candResults.popular_votes];

    const among = [overallResults[0].electoral_votes, (overallResults[0].popular_votes / totalPV) * 100, overallResults[0].popular_votes];

    if (!window.amongusonetwothree) {
        let pickedEnding = endingPicker(window.e.final_outcome, totalPV, window.e.final_overall_results, window.quickstats);

        let mod_ach = window.localStorage.getItem("mod_achievements");
        mod_ach = JSON.parse(mod_ach ?? "[]");

        if (window.e.unlocked_achievements) {
            for (let i in window.e.unlocked_achievements) {
                let unlock = window.e.unlocked_achievements[i];
                if (!mod_ach.includes(unlock)) {
                    mod_ach.push(unlock);
                    unlockAchievement(among, unlock, achList[unlock]?.[2], achList[unlock]?.[0], true);
                    window.localStorage.setItem("mod_achievements", JSON.stringify(mod_ach));
                }
            }
        }

        let legitRun = isLegitRun();
        let run = JSON.parse(localStorage.getItem('achievements') || "{}");

        if (legitRun) {
            if (campaignTrail_temp.difficulty_level_multiplier <= 0.97 && (candResults.electoral_votes == 306 || candResults.electoral_votes == 232)) {
                if (window.e.election_id == 21 && !run.threeosix["2020"]) swap306(2020);
                else if (window.e.election_id == 20 && !run.threeosix["2016"]) swap306(2016);
                else if (window.e.election_id == 3 && !run.threeosix["2012"]) swap306(2012);
                else if (window.e.election_id == 9 && !run.threeosix["2000"]) swap306(2000);
                else if (window.e.election_id == 15 && !run.threeosix["1988"]) swap306(1988);
                else if (window.e.election_id == 10 && !run.threeosix["1976"]) swap306(1976);
                else if (window.e.election_id == 69 && !run.threeosix["1964"]) swap306(1964);
            }

            if (window.e.election_id == 16) {
                let CAAS = localStorage.getItem('achievements');
                let CAASS = JSON.parse(CAAS);
                CAASS.tsatrolling = Number(CAASS.tsatrolling) + 1;
                let newAchg = JSON.stringify(CAASS);
                localStorage.setItem("achievements", newAchg);
                if (typeof MD5 !== "undefined") localStorage.setItem("ach4", MD5(newAchg));
            }

            run = JSON.parse(localStorage.getItem('achievements'));

            if (!run.achievements["destiny"] && run.threeosix["2020"] && run.threeosix["2016"] && run.threeosix["2012"] && run.threeosix["2000"] && run.threeosix["1988"] && run.threeosix["1976"] && run.threeosix["1964"]) {
                unlockAchievement(among, "destiny", "", "<b><font color='yellow'>Destiny Arrives All the Same</font></b>");
            } else if (!modded && !run.achievements["ridingBiden"] && window.e.candidate_last_name == "Biden" && window.e.election_id == 21 && campaignTrail_temp.difficulty_level_multiplier <= 0.97 && candResults.electoral_votes > 405) {
                unlockAchievement(among, "ridingBiden", "", "<b>The Dark Brandon Rises</b>");
            } else if (!modded && !run.achievements["magaa"] && window.e.candidate_last_name == "Trump" && window.e.election_id == 21 && campaignTrail_temp.difficulty_level_multiplier <= 0.97 && candResults.electoral_votes > 321) {
                unlockAchievement(among, "magaa", "", "<b>MAGA... Again</b>");
            } else if (!modded && !run.achievements["nmpr"] && window.e.candidate_last_name == "Trump" && window.e.election_id == 21 && campaignTrail_temp.difficulty_level_multiplier <= 0.97 && candResults.electoral_votes == 269) {
                unlockAchievement(among, "nmpr", "", "<b>Not My President!</b>");
            } else if (!modded && !run.achievements["nomalarkey"] && window.e.candidate_last_name == "Biden" && window.e.election_id == 21 && campaignTrail_temp.difficulty_level_multiplier <= 0.97 && candResults.electoral_votes == 306) {
                unlockAchievement(among, "nomalarkey", "", "<b>Civility Prevails...? </b>");
            } else if (!modded && !run.achievements["whatbelt"] && window.e.election_id == 20 && campaignTrail_temp.difficulty_level_multiplier <= 0.97 && window.e.candidate_id == window.e.final_state_results[37].result[1].candidate && window.e.candidate_id == window.e.final_state_results[21].result[1].candidate && window.e.candidate_id == window.e.final_state_results[49].result[1].candidate && candResults.electoral_votes > 269) {
                unlockAchievement(among, "whatbelt", "", "<b>I'm Still Standing</b>");
            } else if (!modded && !run.achievements["thebern"] && window.e.candidate_last_name == "Clinton" && window.e.election_id == 20 && campaignTrail_temp.difficulty_level_multiplier <= 0.97 && candResults.electoral_votes > 350 && window.e.running_mate_last_name == "Sanders") {
                unlockAchievement(among, "thebern", "", "<b>The Flame Berns Bright</b>");
            } else if (!modded && !run.achievements["moscow"] && window.e.candidate_last_name == "Trump" && window.e.election_id == 20 && campaignTrail_temp.difficulty_level_multiplier <= 0.97 && ((window.e.final_outcome == "win" && overallResults[0].popular_votes > overallResults[1].popular_votes) || (window.e.final_outcome == "loss" && overallResults[1].popular_votes > overallResults[0].popular_votes)) && window.e.running_mate_last_name == "Palin") {
                unlockAchievement(among, "moscow", "", "<b>Moscow's Musketeers</b>");
            } else if (!modded && !run.achievements["why"] && window.e.election_id == 16) {
                unlockAchievement(among, "why", "", "<b>Why? </b>");
            } else if (!modded && !run.achievements["what"] && window.e.election_id == 16 && run.tsatrolling > 99) {
                unlockAchievement(among, "what", "", "<b>WHY?!?!?!?!</b>");
            } else if (!modded && !run.achievements["realdebate"] && window.e.election_id == 3 && campaignTrail_temp.player_answers[0] == 729 && campaignTrail_temp.player_answers[1] == 330 && window.e.player_answers.includes(168) && campaignTrail_temp.difficulty_level_multiplier <= 0.97 && window.e.final_outcome == "win") {
                unlockAchievement(among, "realdebate", "", "<b>A Real Debate</b>");
            } else if (!modded && !run.achievements["karmic"] && window.e.election_id == 3 && campaignTrail_temp.difficulty_level_multiplier <= 0.97 && candResults.electoral_votes <= 4 && window.e.running_mate_last_name == "Clinton") {
                unlockAchievement(among, "karmic", "", "<b>Karmic Retribution</b>");
            } else if (!modded && !run.achievements["raiders"] && window.e.election_id == 9 && window.e.candidate_last_name == "Nader" && window.e.difficulty_level_multiplier <= 1.33 && candResults.popular_votes >= 5300000) {
                unlockAchievement(among, "raiders", "", "<b>Naider's Raiders</b>");
            } else if (!modded && !run.achievements["master"] && window.e.election_id == 9 && window.e.candidate_last_name == "Gore" && window.e.difficulty_level_multiplier <= 0.97 && window.e.final_outcome == "win" && window.e.player_answers.includes(3326)) {
                unlockAchievement(among, "master", "", "<b>I'm My Own Master Now</b>");
            } else if (!modded && !run.achievements["swap"] && window.e.election_id == 9 && window.e.candidate_last_name == "Gore" && window.e.difficulty_level_multiplier <= 0.97 && window.e.final_outcome == "win" && overallResults[0].popular_votes < overallResults[1].popular_votes) {
                unlockAchievement(among, "swap", "", "<b>Death Swap</b>");
            } else if (!modded && !run.achievements["florida2000"] && window.e.election_id == 9 && window.e.final_state_results[8].result[0].percent - window.e.final_state_results[8].result[1].percent < 0.005 && overallResults[0].electoral_votes <= 294) {
                unlockAchievement(among, "florida2000", "", "<b>Art Imitates Life</b>");
            } else if (!modded && !run.achievements["tanks"] && window.e.election_id == 15 && window.e.player_answers.includes(4439) && window.e.player_answers.includes(4484) && campaignTrail_temp.difficulty_level_multiplier <= 0.97 && window.e.final_outcome == "win") {
                unlockAchievement(among, "tanks", "", "<b>Tanks and Taxes</b>");
            } else if (!modded && !run.achievements["Rainbow"] && window.e.election_id == 15 && campaignTrail_temp.running_mate_last_name == "Jackson" && campaignTrail_temp.final_outcome == "win" && campaignTrail_temp.difficulty_level_multiplier <= 0.97) {
                unlockAchievement(among, "Rainbow", "", "<b>A Rainbow Coalition</b>");
            } else if (!modded && !run.achievements["Kinder"] && window.e.election_id == 15 && campaignTrail_temp.candidate_last_name == "Bush" && campaignTrail_temp.final_outcome == "win" && overallResults[0].electoral_votes > 500 && campaignTrail_temp.difficulty_level_multiplier <= 0.97) {
                unlockAchievement(among, "Kinder", "", "<b>A Kinder, Gentler Landslide</b>");
            } else if (!modded && !run.achievements["georgia"] && window.e.election_id == 10 && window.e.player_answers.includes(3610) && window.e.player_answers.includes(3647) && campaignTrail_temp.difficulty_level_multiplier <= 0.97 && candResults.electoral_votes > 400) {
                unlockAchievement(among, "georgia", "", "<b>Radical Liberal Jimmy Carter</b>");
            } else if (!modded && !run.achievements["georgenixon"] && window.e.candidate_last_name == "Nixon" && window.e.election_id == 4 && campaignTrail_temp.difficulty_level_multiplier <= 0.97 && window.e.final_state_results[8].result[0].candidate == 23) {
                unlockAchievement(among, "georgenixon", "", "<b>The Devil Went Down To Georgia</b>");
            } else if (!modded && !run.achievements["ratio"] && window.e.candidate_last_name == "Humphrey" && window.e.election_id == 4 && campaignTrail_temp.difficulty_level_multiplier <= 0.97 && candResults.electoral_votes > 430) {
                unlockAchievement(among, "ratio", "", "<b>Hubert Horatio'd</b>");
            } else if (!modded && !run.achievements["BCitsHard"] && window.e.candidate_last_name == "Kennedy" && window.e.election_id == 11 && campaignTrail_temp.difficulty_level_multiplier <= 0.9 && campaignTrail_temp.final_outcome == "win") {
                unlockAchievement(among, "BCitsHard", "", "<b>Not because it is easy, but because it is hard.</b>");
            } else if (!modded && !run.achievements["BCitsEasy"] && window.e.candidate_last_name == "Kennedy" && window.e.election_id == 11 && campaignTrail_temp.difficulty_level_multiplier == 1.33 && candResults.electoral_votes < 100) {
                unlockAchievement(among, "BCitsEasy", "", "<b>Not because it is hard, but because it is easy.</b>");
            } else if (!modded && !run.achievements["Vice"] && window.e.election_id == 11 && campaignTrail_temp.difficulty_level_multiplier <= 0.97 && campaignTrail_temp.final_outcome == "win" && campaignTrail_temp.running_mate_last_name == "Goldwater") {
                unlockAchievement(among, "Vice", "", "<b>The Vice With No Vice</b>");
            } else if (!modded && !run.achievements["dixieDewey"] && window.e.candidate_last_name == "Truman" && window.e.election_id == 12 && campaignTrail_temp.difficulty_level_multiplier <= 0.97 && campaignTrail_temp.player_answers[2] == 3809 && window.e.final_outcome == "win") {
                unlockAchievement(among, "dixieDewey", "", "<b>Dixie Defeats Dewey</b>");
            } else if (!modded && !run.achievements["Dewey"] && window.e.candidate_last_name == "Dewey" && window.e.election_id == 12 && campaignTrail_temp.difficulty_level_multiplier <= 0.97 && window.e.final_outcome == "win" && ((window.e.final_outcome == "win" && overallResults[0].popular_votes > overallResults[1].popular_votes) || (window.e.final_outcome == "loss" && overallResults[1].popular_votes > overallResults[0].popular_votes))) {
                unlockAchievement(among, "Dewey", "", "<b>All Over But The Shouting</b>");
            } else if (!modded && !run.achievements["California"] && window.e.candidate_last_name == "Hughes" && window.e.election_id == 14 && campaignTrail_temp.difficulty_level_multiplier <= 0.97 && window.e.candidate_id == window.e.final_state_results[3].result[1].candidate && window.e.final_outcome == "win") {
                unlockAchievement(among, "California", "", "<b>Califor-Huh?</b>");
            } else if (!modded && !run.achievements["Commoner"] && window.e.candidate_last_name == "Bryan" && window.e.election_id == 5 && campaignTrail_temp.difficulty_level_multiplier <= 0.97 && overallResults[0].electoral_votes > 330 && window.e.final_outcome == "win") {
                unlockAchievement(among, "Commoner", "", "<b>The Great Commoner</b>");
            } else if (!run.achievements["trueKorea"] && window.e.running_mate_last_name == "<font color='#e58585'>Kim</font> <font color='#ffffff'>Il</font>-<font color='#85a6e5'>sung</font>" && window.e.final_outcome == "win" && window.e.election_id == 20) {
                unlockAchievement(among, "trueKorea", "", "<b>Potato P.R.I.D.E</b>");
            } else if (!run.achievements["IWillSurvive"] && ([200965, 200975, 200969].includes(campaignTrail_temp.player_answers[36])) && (["Clinton", "Clinton for"].includes(campaignTrail_temp.candidate_last_name)) && overallResults[0].electoral_votes > 2382 && campaignTrail_temp.difficulty_level_multiplier <= 0.97 && window.e.election_id == 9) {
                unlockAchievement(among, "IWillSurvive", "", "<b>I Will Survive</b>");
            } else if (!run.achievements["MaybeThisTimeItllWork"] && (["Sanders", "Sanders for"].includes(campaignTrail_temp.candidate_last_name)) && campaignTrail_temp.difficulty_level_multiplier <= 0.97 && overallResults[0].electoral_votes > 2382 && window.e.player_answers[0] == 3501 && window.e.election_id == 9) {
                unlockAchievement(among, "MaybeThisTimeItllWork", "", "<b>Maybe This Time It'll Work</b>");
            } else if (!run.achievements["MarylandersMission"] && (["O'Malley", "O\u0027Malley for"].includes(campaignTrail_temp.candidate_last_name)) && campaignTrail_temp.difficulty_level_multiplier <= 0.97 && window.e.final_outcome == "tie" && window.e.election_id == 9) {
                unlockAchievement(among, "MarylandersMission", "", "<b>The Marylander's Mission</b>");
            } else if (!run.achievements["peoplesvictory"] && window.e.candidate_last_name == "McCain" && window.e.final_outcome == "win" && window.e.player_answers[8] == 52632 && window.e.election_id == 20) {
                unlockAchievement(among, "peoplesvictory", "", "<b>The People's President</b>");
            } else if (!run.achievements["minnesotanice"] && window.e.candidate_last_name == "Reagan" && window.e.candidate_id == window.e.final_state_results[22].result[0].candidate && window.e.election_id == 15 && campaignTrail_temp.difficulty_level_multiplier <= 0.97) {
                unlockAchievement(among, "minnesotanice", "", "<b>'Well, Minnesota would've been nice'</b>");
            } else if (!run.achievements["Wallaloha"] && window.e.candidate_last_name == "Wallace" && window.e.candidate_id == window.e.final_state_results[9].result[0].candidate && window.e.election_id == 4 && campaignTrail_temp.difficulty_level_multiplier <= 0.97 && window.e.candidate_image_url == "https://i.imgur.com/x7FALBW.png") {
                unlockAchievement(among, "Wallaloha", "", "<b>'Wallaloha'</b>");
            } else if (!run.achievements["fixyourmod"] && window.e.candidate_last_name == "Long" && window.e.player_answers[0] == 5002 && window.e.election_id == 20) {
                unlockAchievement(among, "fixyourmod", "", "<b>Flopulist</b>");
            } else if (!run.achievements["AVictoryForAllPeople"] && window.e.candidate_last_name == "Greeley" && campaignTrail_temp.running_mate_last_name == "Sumner" && campaignTrail_temp.difficulty_level_multiplier <= 0.97 && window.e.final_outcome == "win" && window.e.player_answers[34] == 8131 && window.e.election_id == 20) {
                unlockAchievement(among, "AVictoryForAllPeople", "", "<b>A Victory For All People</b>");
            } else if (!run.achievements["ATruceNotACompromise"] && ((window.e.candidate_last_name == "Hayes" && candResults.electoral_votes == 185 && window.e.player_answers[24] == 8090) || (window.e.candidate_last_name == "Tilden" && candResults.electoral_votes == 184 && window.e.player_answers[24] == 8088)) && window.e.election_id == 5) {
                unlockAchievement(among, "ATruceNotACompromise", "", "<b>A Truce, Not A Compromise</b>");
            }
        } else {
            if (!modded && window.e.candidate_last_name == "Wallace" && window.e.election_id == 4 && candResults.electoral_votes == 535 && !run.achievements["stillAlive"]) {
                unlockAchievement(among, "stillAlive", "", "<b>Still Alive</b>");
            } else if (!modded && !run.achievements["yourchance"] && campaignTrail_temp.bigshot_mode) {
                unlockAchievement(among, "yourchance", "", "<b>NOW'S YOUR CHANCE TO BE A</b>");
            }
        }

        if (campaignTrail_temp.multiple_endings && pickedEnding !== "ERROR") {
            s = pickedEnding;
        }
    }

    const diff_mult_string = Number((starting_mult - encrypted).toFixed(2)) !== Number(campaignTrail_temp.difficulty_level_multiplier.toFixed(2))
        ? `${campaignTrail_temp.difficulty_level_multiplier.toFixed(1)}; <em>Cheated difficulty</em>`
        : (window.e.bigshot_mode ? `${campaignTrail_temp.difficulty_level_multiplier.toFixed(1)}; <em>[[BIG SHOT]] enabled</em>` : campaignTrail_temp.difficulty_level_multiplier.toFixed(1));

    const difficulty_string = `<div id='difficulty_mult'><br><b>Difficulty Multiplier:</b> ${diff_mult_string}</div><br>`;
    const noElectoralVotes = window.e.final_overall_results.every((f) => !f.electoral_votes);

    const r = window.e.final_overall_results.filter(Boolean).map((f) => {
        const candObj2 = cands.get(String(f.candidate));
        if (!candObj2) return "";
        const colorHex = candObj2.color_hex;
        const fName = `${candObj2.first_name} ${candObj2.last_name}`;
        if (!f.popular_votes) return "";
        return `
            <tr>
                <td style="text-align: left;"><span style="background-color: ${colorHex}; color: ${colorHex};">----</span> ${fName}</td>
                ${noElectoralVotes ? "" : `<td>${f.electoral_votes}</td>`}
                <td>${formatNumbers(f.popular_votes)}</td>
                <td>${((f.popular_votes / totalPV) * 100).toFixed(1)}%</td>
            </tr>`;
    }).filter(Boolean).join("").trim();

    const c = window.e.game_results_url !== "None"
        ? `<h4>Final Results: <a target="_blank" href="${window.e.game_results_url}">Game Link</a> (use link to view this result on its own page)</h4>`.trim()
        : "";

    const u = `
        <div class="game_header">${window.corrr}</div>
        <div id="main_content_area">
            <div id="results_container">
                <img class="person_image" src="${l}"/>
                <div id="final_results_description">${s}</div>
                ${difficulty_string}
                <div id="overall_vote_statistics">
                    ${c}
                    <table class="final_results_table"><br>
                        <tr><th>Candidate</th>${noElectoralVotes ? "" : `<th>${window.e.primary ? "Delegates" : "Electoral Votes"}</th>`}<th>Popular Votes</th><th>Popular Vote %</th></tr>
                        ${r}
                    </table>
                </div>
            </div>
        </div>
        <div id="map_footer">
            <button class="final_menu_button" id="overall_results_button" disabled="disabled">Final Election Results</button>
            <button class="final_menu_button" id="final_election_map_button">Election Map</button>
            <button class="final_menu_button" id="state_results_button">Results by State</button>
            <button class="final_menu_button" id="overall_details_button">Overall Results Details</button>
            <button class="final_menu_button" id="recommended_reading_button">Further Reading</button>
            <button class="final_menu_button" id="play_again_button">Play Again!</button>
        </div>`.trim();

    $("#game_window").html(u);

    if (overallResultsHtml._difficultyObserver) {
        overallResultsHtml._difficultyObserver.disconnect();
        overallResultsHtml._difficultyObserver = null;
    }

    const $prev = $("#difficulty_mult");
    if ($prev.length) {
        const targ = $prev[0];
        const prevObs = new MutationObserver((mutations, obs) => {
            if (mutations.length > 0) {
                window.location.reload();
                obs.disconnect();
                overallResultsHtml._difficultyObserver = null;
            }
        });
        overallResultsHtml._difficultyObserver = prevObs;
        prevObs.observe(targ, { childList: true, characterData: true, subtree: true });
    }

    const electYear = electJson.year;
    const candFName = `${candObj.first_name} ${candObj.last_name}`;
    let p;

    if (window.e.final_outcome === "win") p = `I won the ${electYear} election as ${candFName}. How would you do?`;
    else if (window.e.final_outcome === "loss") p = `I lost the ${electYear} election as ${candFName}. How would you do?`;
    else if (window.e.final_outcome === "tie") p = `I deadlocked the ${electYear} Electoral College as ${candFName}. How would you do?`;

    $("#fb_share_button").click(() => {
        FB.ui({
            display: "popup", method: "feed",
            link: `https://www.americanhistoryusa.com${window.e.game_results_url}`,
            picture: `https://www.americanhistoryusa.com${window.e.candidate_image_url}`,
            name: p, description: "Click to see the Electoral College map from my game, and then try it yourself!",
        }, () => { });
    });
}

function getSortedCands() {
    const cands = PROPS.CANDIDATES;
    const candsArr = [];
    const mainCand = cands.get(String(window.e.candidate_id));
    if (mainCand) {
        candsArr.push({ candidate: window.e.candidate_id, priority: mainCand.priority, color: mainCand.color_hex, last_name: mainCand.last_name });
    }
    window.e.opponents_list.forEach((f) => {
        const opps = cands.get(String(f));
        if (opps) candsArr.push({ candidate: f, priority: opps.priority, color: opps.color_hex, last_name: opps.last_name });
    });
    sortByProp(candsArr, "priority");
    return candsArr;
}

function finalMapScreenHtml() {
    const coloredResults = mapResultColor(500);
    const candsArray = getSortedCands();
    const election = PROPS.ELECTIONS.get(String(window.e.election_id));
    const totalPopularVotes = window.e.final_overall_results.reduce((sum, f) => sum + f.popular_votes, 0);
    const noElectoralVotes = window.e.final_overall_results.every((f) => !f.electoral_votes);
    const candResultText = candsArray.map((f) => {
        const s = window.e.final_overall_results.find((g) => g.candidate === f.candidate);
        const electoralVotes = s ? s.electoral_votes : 0;
        const popularVotes = s ? s.popular_votes : 0;
        const popularVotePercent = totalPopularVotes > 0 ? ((popularVotes / totalPopularVotes) * 100).toFixed(1) : "0.0";
        return !popularVotes && !electoralVotes ? "" : `<li><span style="color:${f.color}; background-color: ${f.color}">--</span> ${f.last_name}: ${noElectoralVotes ? "" : `${formatNumbers(electoralVotes)} / `}${popularVotePercent}%</li>`;
    }).join("");
    const resHtml = `
        <div class="game_header">${window.corrr}</div>
        <div id="main_content_area">
            <div id="map_container"></div>
            <div id="menu_container">
                <div id="overall_result_container"><div id="overall_result"><h3>${window.e.primary ? 'DELEGATES' : 'ELECTORAL VOTES'}</h3><ul>${candResultText}</ul>${noElectoralVotes ? "" : `<p>${formatNumbers(election.winning_electoral_vote_number)} to win</p>`}</div></div>
                <div id="state_result_container"><div id="state_result"><h3>STATE RESULTS</h3><p>Click on a state to view final results.</p></div></div>
            </div>
        </div>
        <div id="map_footer">
            <button class="final_menu_button" id="overall_results_button">Final Election Results</button>
            <button class="final_menu_button" id="final_election_map_button" disabled="disabled">Election Map</button>
            <button class="final_menu_button" id="state_results_button">Results by State</button>
            <button class="final_menu_button" id="overall_details_button">Overall Results Details</button>
            <button class="final_menu_button" id="recommended_reading_button"> Further Reading </button>
            <button class="final_menu_button" id="play_again_button">Play Again!</button>
        </div>`.trim();
    $("#game_window").html(resHtml);
    $("#map_container").usmap(coloredResults);
}

const k = (e) => e.map((f) => `<option value="${f.state}">${f.name}</option>`).join("");

function stateResultsHtml() {
    const stateBase = [];
    const stateEVs = [];
    const statePVMargin = [];

    window.e.final_state_results.forEach((f) => {
        const n = window.e.states_json.find((g) => g.pk === f.state);
        if (!n || !n.fields) return;
        stateBase.push({ state: n.pk, name: n.fields.name });
        stateEVs.push({ state: n.pk, name: n.fields.name, electoral_votes: n.fields.electoral_votes });
        const top = f.result?.[0]?.percent ?? 0;
        const second = f.result?.[1]?.percent ?? 0;
        statePVMargin.push({ state: n.pk, name: n.fields.name, pct_margin: top - second });
    });

    sortByProp(stateBase, "name");
    stateEVs.sort((a, b) => b.electoral_votes - a.electoral_votes);
    sortByProp(statePVMargin, "pct_margin");
    const l = [];
    const o = [];
    const cands = PROPS.CANDIDATES;
    window.e.final_overall_results.forEach((f) => {
        const candObj = cands.get(String(f.candidate));
        const d = window.e.final_state_results
            .filter((r) => r.result?.[0]?.candidate === f.candidate)
            .map((r) => {
                const pct_margin = (r.result?.[0]?.percent ?? 0) - (r.result?.[1]?.percent ?? 0);
                const stateObj = window.e.states_json.find((g) => g.pk === r.state);
                if (!stateObj || !stateObj.fields) return null;
                return { state: stateObj.pk, name: stateObj.fields.name, pct_margin };
            }).filter(Boolean).sort((a, b) => a.pct_margin - b.pct_margin);
        const c = window.e.final_state_results
            .flatMap((g) => (g.result || []).filter((h) => h.candidate === f.candidate).map((h) => {
                const stateObj = window.e.states_json.find((i) => i.pk === g.state);
                if (!stateObj || !stateObj.fields) return null;
                return { state: stateObj.pk, name: stateObj.fields.name, vote_pct: h.percent };
            })).filter(Boolean).sort((a, b) => b.vote_pct - a.vote_pct);
        if (candObj) {
            l.push({ candidate: f.candidate, last_name: candObj.last_name, values: d });
            o.push({ candidate: f.candidate, last_name: candObj.last_name, values: c });
        }
    });
    const m = l.map((f, idx) => (f.values.length > 0 ? `<option value="${10 + idx}">Closest ${f.last_name} Wins</option>` : "")).filter(Boolean).join("");
    const g = o.map((f, idx) => (f.values.length > 0 ? `<option value="${20 + idx}">Highest ${f.last_name} %</option>` : "")).filter(Boolean).join("");

    const initialState = stateBase[0]?.state;
    const initialSummary = initialState ? T(initialState) : '<p>No state results available.</p>';
    const j = `
        <div class="game_header">${window.corrr}</div>
        <div id="main_content_area">
            <div id="results_container">
                <h3 class="title_h3">Election Results and Data by State</h3>
                    <div id="drop_down_area_state">
                        <div id="sort_tab_area"><p>View states by: <select id="sort_tab"><option value="1">Alphabetical</option><option value="2">Most Electoral Votes</option><option value="3">Closest States</option>${m}${g}</select></p></div>
                        <div id="state_tab_area"><p>Select a state: <select id="state_tab">${k(stateBase)}</select></p></div>
                    </div>
                <div id="state_result_data_summary">${initialSummary}</div>
            </div>
            <div id="results_container_description"></div>
        </div>
        <div id="map_footer">
            <button class="final_menu_button" id="overall_results_button">Final Election Results</button>
            <button class="final_menu_button" id="final_election_map_button">Election Map</button>
            <button class="final_menu_button" id="state_results_button" disabled="disabled">Results by State</button>
            <button class="final_menu_button" id="overall_details_button">Overall Results Details</button>
            <button class="final_menu_button" id="recommended_reading_button">Further Reading</button>
            <button class="final_menu_button" id="play_again_button">Play Again!</button>
        </div>`.trim();
    $("#game_window").html(j);
    const $stateTab = $("#state_tab");
    $("#sort_tab").change(() => {
        let candIdx, optionsHtml;
        const $sortTabValue = Number($("#sort_tab").val());
        if ($sortTabValue === 1) optionsHtml = k(stateBase);
        else if ($sortTabValue === 2) optionsHtml = k(stateEVs);
        else if ($sortTabValue === 3) optionsHtml = k(statePVMargin);
        else if ($sortTabValue >= 10 && $sortTabValue <= 19) { candIdx = $sortTabValue - 10; optionsHtml = l[candIdx]?.values ? k(l[candIdx].values) : ""; }
        else { candIdx = $sortTabValue - 20; optionsHtml = o[candIdx]?.values ? k(o[candIdx].values) : ""; }
        $stateTab.html(optionsHtml);
        const selected = $stateTab.val();
        $("#state_result_data_summary").html(selected ? T(selected) : '<p>No state selected.</p>');
    });
    $stateTab.change(() => {
        const val = $stateTab.val();
        $("#state_result_data_summary").html(val ? T(val) : '<p>No state selected.</p>');
    });
}

function overallDetailsHtml() {
    const totalPV = window.e.final_overall_results.reduce((sum, f) => sum + f.popular_votes, 0);
    const noElectoralVotes = window.e.final_overall_results.every((f) => !f.electoral_votes);
    const cands = PROPS.CANDIDATES;

    const a = window.e.final_overall_results.map((f) => {
        const candObj = cands.get(String(f.candidate));
        if (!candObj) return "";
        const colorHex = candObj.color_hex || '#888888';
        return !f.popular_votes ? "" : `
      <tr>
        <td style="text-align: left;"><span style="background-color: ${colorHex}; color: ${colorHex};">----</span> ${candObj.first_name} ${candObj.last_name}</td>
        ${noElectoralVotes ? "" : `<td>${formatNumbers(f.electoral_votes)}</td>`}
        <td>${formatNumbers(f.popular_votes)}</td>
        <td>${((f.popular_votes / totalPV) * 100).toFixed(window.e.finalPercentDigits)}%</td>
      </tr>`;
    }).filter(Boolean).join("").replace(/>(\s+)</g, (match, p1, offset, string) => {
        const before = string.slice(0, offset);
        if (before.lastIndexOf("<td") > before.lastIndexOf("</td>")) return `> <`;
        return "><";
    });

    const l = window.e.percentile !== "None" ? `<p>You have done better than approximately <strong>${window.e.percentile}%</strong> of the games that have been played with your candidate and difficulty level.</p>` : "";
    let _ = "";
    if (window.e.historical_overall !== "None") {
        const o = window.e.historical_overall.map((f) => {
            return `<tr><td style="text-align: left;"><span style="background-color: ${f.color_hex}; color: ${f.color_hex};">----</span> ${f.name}</td><td>${f.winning_pct.toFixed(2)}</td><td>${f.electoral_votes_avg.toFixed(1)}</td><td>${formatNumbers(f.popular_votes_avg)}</td><td>${f.popular_vote_pct_avg.toFixed(2)}</td><td>${f.electoral_votes_min} - ${f.electoral_votes_max}</td><td>${formatNumbers(f.popular_votes_min)} - ${formatNumbers(f.popular_votes_max)}</td></tr>`;
        }).join("");
        _ = `<div id="overall_stat_details"><h4>Historical Results - Your Candidate and Difficulty Level</h4><table><tr><th>Candidate</th><th>Candidate</th><th>Win %</th><th>EV Avg.</th><th>PV Avg.</th><th>PV % Avg.</th><th>EV Range</th><th>PV Range</th></tr>${o}</table></div>`;
    }

    const currentURL = new URL(window.location.href);
    const game_url = window.e.game_id ? `${currentURL.origin}/games/viewGame.html#${window.e.game_id}` : null;
    const spaceFunction = (name) => /^[\s\u2800]/.test(name);
    const spaceToUse = HistName.find(spaceFunction)?.match(/^[\s\u2800]+/)?.[0] ?? ' ';
    const allHistResZero = !HistEV || HistEV.every((f) => !Number(f));

    const histRes = HistName.map((name, i) => {
        const needsSpace = name !== "" && !spaceFunction(name);
        const nameToUse = needsSpace ? `${spaceToUse}${name}` : name;
        return `<tr><td style="text-align: left;"><span style="background-color:${HistHexcolour[i]}; color:${HistHexcolour[i]};">----</span>${nameToUse}</td>${allHistResZero ? "" : `<td>${HistEV[i]}</td>`}<td>${HistPV[i]}</td><td>${HistPVP[i]}</td></tr>`;
    }).join("").trim();

    document.getElementById("game_window").innerHTML = `
    <div class="game_header">${window.corrr}</div>
    <div id="main_content_area">
      <div id="overall_details_container">
        <h3>Overall Election Details</h3>
        <div id="overall_election_details">
          <h4>Results - This Game</h4>
          <table><tbody><tr><th>Candidate</th>${noElectoralVotes ? "" : `<th>Electoral Votes</th>`}<th>Popular Votes</th><th>Popular Vote %</th></tr>${a}</tbody></table>${l}
        </div>
        <div id="overall_election_details">
          <h4>Results - Historical</h4>
          <table><tbody><tr><th>Candidate</th>${allHistResZero ? "" : `<th>Electoral Votes</th>`}<th>Popular Votes</th><th>Popular Vote %</th></tr>${histRes}</tbody></table>
            <p><b><div style="display: inline-flex; justify-content: center;"><button id="ExportFileButton" onclick="exportResults()" style="margin: 0 .5em;">Export Game as File</button><span>(<a href="/campaign-trail/viewGame.html" target="_blank">load exported save here</a>)</span></div></b></p>
            <br><br><br>
        </div>
      </div>
      <div id="map_footer">
        <button class="final_menu_button" id="overall_results_button">Final Election Results</button>
        <button class="final_menu_button" id="final_election_map_button">Election Map</button>
        <button class="final_menu_button" id="state_results_button">Results by State</button>
        <button class="final_menu_button" id="overall_details_button" disabled="disabled">Overall Results Details</button>
        <button class="final_menu_button" id="recommended_reading_button">Further Reading</button>
        <button class="final_menu_button" id="play_again_button">Play Again!</button>
      </div>
    </div>`.trim();
}

function furtherReadingHtml() {
    const election = PROPS.ELECTIONS.get(String(window.e.election_id));
    let contentHTML;
    if (RecReading !== true && modded === true) {
        contentHTML = `<p>This election has no further reading.</p>`.trim();
    } else {
        contentHTML = `<p>Are you interested in exploring the ${election.year} election further? This page contains some further reading to get you up to speed.</p><div id="recommended_reading_box">${election.recommended_reading}</div>`.trim();
    }

    document.getElementById("game_window").innerHTML = `
    <div class="game_header">${window.corrr}</div>
    <div id="main_content_area_reading">
      <h3 class="results_tab_header">Further Reading</h3>
      ${contentHTML}
    </div>
    <div id="map_footer" style="margin-top:-35px">
      <button class="final_menu_button" id="overall_results_button">Final Election Results</button>
      <button class="final_menu_button" id="final_election_map_button">Election Map</button>
      <button class="final_menu_button" id="state_results_button">Results by State</button>
      <button class="final_menu_button" id="overall_details_button">Overall Results Details</button>
      <button class="final_menu_button" id="recommended_reading_button" disabled="disabled">Further Reading</button>
      <button class="final_menu_button" id="play_again_button">Play Again!</button>
    </div>`;
}

function beginNewGameHtml() {
    const election = PROPS.ELECTIONS.get(String(window.e.election_id));
    $("#game_window").append(`
    <div class="overlay" id="new_game_overlay"></div>
    <div class="overlay_window" id="new_game_window">
      <div class="overlay_window_content" id="election_night_content">
        <h3>Advisor Feedback</h3><img src="${election.advisor_url}" width="208" height="128"/><p>Are you sure you want to begin a new game?</p>
      </div>
      <div class="overlay_buttons" id="new_game_buttons"><button id="new_game_button">Yes</button><br><button id="cancel_button">No</button></div>
    </div>`.trim());

    $("#new_game_button").click(() => {
        if (modded) {
            const hotload = window.e.hotload || $("#modSelect")[0]?.value;
            if (hotload && hotload !== "other") window.localStorage.setItem("hotload", hotload);
        }
        window.location.reload();
    });
    $("#cancel_button").click(() => {
        $("#new_game_overlay").remove();
        $("#new_game_window").remove();
    });
}

function T(t) {
    const numT = Number(t);
    return window.e.final_state_results
        .filter((result) => result.state === numT)
        .map((result) => {
            const noElectoralVotes = (result.result || []).every((f) => !f.electoral_votes);
            const rows = (result.result || []).map((f) => {
                const candidate = PROPS.CANDIDATES.get(String(f.candidate));
                if (!candidate) return "";
                const fullName = `${candidate.first_name} ${candidate.last_name}`;
                return !f.percent && !f.electoral_votes ? "" : `<tr><td>${fullName}</td><td>${formatNumbers(f.votes)}</td><td>${(f.percent * 100).toFixed(window.e.statePercentDigits)}</td>${noElectoralVotes ? "" : `<td>${f.electoral_votes}</td>`}</tr>`;
            }).filter(Boolean).join("");

            return `<h4>Results - This Game</h4><table><tr><th>Candidate</th><th>Popular Votes</th><th>Popular Vote %</th>${noElectoralVotes ? "" : `<th>Electoral Votes</th>`}</tr>${rows}</table>`;
        }).join("");
}

function A(t) {
    const gp = PROPS.PARAMS;
    const variance = gp.global_variance;
    const candidateIssueWeight = gp.candidate_issue_weight;
    const runningMateIssueWeight = gp.running_mate_issue_weight;
    const voteVar = gp.vote_variable;
    const difficultyMult = window.e.difficulty_level_multiplier;
    const shiningVisitMult = (window.e.shining_data && window.e.shining_data.visit_multiplier) ?? 1;
    const playerAnswers = window.e.player_answers || [];
    const playerAnswersSet = new Set(playerAnswers);
    const gameType = Number(window.e.game_type_id);

    const candIdOpponents = [...new Set([window.e.candidate_id, ...window.e.opponents_list])];
    const stateFieldsByPk = new Map((window.e.states_json || []).map((s) => [s.pk, s.fields]));
    const stateAbbrByPk = new Map((window.e.states_json || []).map((s) => [s.pk, s.fields.abbr]));

    const visitCountByState = (() => {
        const m = new Map();
        for (const st of (window.e.player_visits || [])) m.set(st, (m.get(st) || 0) + 1);
        return m;
    })();

    const asgIndex = (() => {
        const m = new Map();
        for (const item of (window.e.answer_score_global_json || [])) {
            const f = item.fields;
            const k = `${f.answer}|${f.candidate}|${f.affected_candidate}`;
            if (!m.has(k)) m.set(k, f.global_multiplier);
        }
        return m;
    })();

    const candsGAnsScores = candIdOpponents.map((candidate) => {
        const cumulScores = playerAnswers.reduce((total, answer) => {
            const key = `${answer}|${window.e.candidate_id}|${candidate}`;
            return total + (asgIndex.get(key) || 0);
        }, 0);
        const base = (candidate === window.e.candidate_id && cumulScores < -0.4) ? 0.6 : 1 + cumulScores;
        const rand = 1 + randomNormal(candidate) * variance;
        return { candidate, global_multiplier: (candidate === window.e.candidate_id) ? base * rand * difficultyMult : base * rand };
    });

    const issueByCandidate = (() => {
        const m = new Map();
        for (const item of (window.e.candidate_issue_score_json || [])) {
            const cand = item.fields.candidate;
            if (!m.has(cand)) m.set(cand, []);
            m.get(cand).push(item);
        }
        return m;
    })();

    const candsIssueScores = candIdOpponents.map((candidate) => {
        const arr = issueByCandidate.get(candidate) || [];
        const v = arr.map((item) => ({ issue: item.fields.issue, issue_score: item.fields.issue_score }));
        return { candidate_id: candidate, issue_scores: removeIssueDuplicates(v) };
    });

    if (candsIssueScores[0]) {
        const runningMateByIssue = new Map((window.e.running_mate_issue_score_json || []).map((x) => [x.fields.issue, x]));
        const issueAgg = (() => {
            const m = new Map();
            for (const answ of (window.e.answer_score_issue_json || [])) {
                const f = answ.fields;
                if (!playerAnswersSet.has(f.answer)) continue;
                const prev = m.get(f.issue) || { g: 0, b: 0 };
                prev.g += f.issue_score * f.issue_importance;
                prev.b += f.issue_importance;
                m.set(f.issue, prev);
            }
            return m;
        })();

        candsIssueScores[0].issue_scores = candsIssueScores[0].issue_scores.map((it) => {
            const { issue } = it;
            const runIssue = runningMateByIssue.get(issue);
            if (!runIssue) return it;
            const agg = issueAgg.get(issue) || { g: 0, b: 0 };
            const numerator = (it.issue_score * candidateIssueWeight) + (runIssue.fields.issue_score * runningMateIssueWeight) + agg.g;
            const denom = (candidateIssueWeight + runningMateIssueWeight + agg.b);
            return { ...it, issue_score: numerator / denom };
        });
    }

    const csmByCandidate = (() => {
        const filtered = (window.e.candidate_state_multiplier_json || []).filter((f) => f.model === "campaign_trail.candidate_state_multiplier");
        const m = new Map();
        for (const item of filtered) {
            const cand = item.fields.candidate;
            if (!m.has(cand)) m.set(cand, []);
            m.get(cand).push(item);
        }
        return m;
    })();

    const candsStateMults = candIdOpponents.map((candId, idx) => {
        const arr = csmByCandidate.get(candId) || [];
        const stateMults = arr.map((g) => {
            const rand = randomNormal(g.fields.candidate);
            const p = g.fields.state_multiplier * candsGAnsScores[idx].global_multiplier * (1 + rand * variance);
            return { state: Number(g.fields.state), state_multiplier: p };
        }).sort((a, b) => a.state - b.state);
        return { candidate_id: candId, state_multipliers: stateMults };
    });

    const asStateAgg = (() => {
        const m = new Map();
        for (const ans of (window.e.answer_score_state_json || [])) {
            const f = ans.fields;
            if (f.candidate !== window.e.candidate_id) continue;
            const k = `${f.state}|${f.answer}|${f.affected_candidate}`;
            m.set(k, (m.get(k) || 0) + f.state_multiplier);
        }
        return m;
    })();

    candIdOpponents.forEach((cand, idx) => {
        candsStateMults[idx].state_multipliers.forEach((mult) => {
            const { state } = mult;
            let w = 0;
            for (const ans of playerAnswers) w += asStateAgg.get(`${state}|${ans}|${cand}`) || 0;
            let boost = 0;
            if (idx === 0) {
                if (window.e.running_mate_state_id === state) boost += 0.004 * mult.state_multiplier;
                const visits = visitCountByState.get(state) || 0;
                if (visits > 0) boost += visits * 0.005 * Math.max(0.1, mult.state_multiplier) * shiningVisitMult;
            }
            mult.state_multiplier += w + boost;
        });
    });

    const stateIssueByState = (() => {
        const m = new Map();
        for (const s of (window.e.state_issue_score_json || [])) {
            const f = s.fields;
            if (!m.has(f.state)) m.set(f.state, new Map());
            const inner = m.get(f.state);
            if (!inner.has(f.issue)) inner.set(f.issue, s.fields);
        }
        return m;
    })();

    const smByCandIndex = candsStateMults.map((c) => {
        const m = new Map();
        for (const s of c.state_multipliers) m.set(s.state, s.state_multiplier);
        return m;
    });

    const baseStates = (candsStateMults[0] && candsStateMults[0].state_multipliers) || [];
    const calcStatePolls = baseStates.map((st) => {
        const { state } = st;
        const finalStatePoll = candIdOpponents.map((candId, r) => {
            const smValue = smByCandIndex[r].get(state);
            if (smValue == null) return { candidate: candId, result: 0 };
            let score = 0;
            const issuesR = candsIssueScores[r].issue_scores;
            const issues0 = candsIssueScores[0].issue_scores;

            for (let idx = 0; idx < issuesR.length; idx += 1) {
                const iss = issuesR[idx];
                const refIssue = issues0[idx] && issues0[idx].issue;
                const stateIssueMap = stateIssueByState.get(state);
                let stateScore = 0;
                let issueWeight = 1;
                if (stateIssueMap && stateIssueMap.has(refIssue)) {
                    const sFields = stateIssueMap.get(refIssue);
                    stateScore = sFields.state_issue_score;
                    issueWeight = sFields.weight;
                }
                const S = iss.issue_score * Math.abs(iss.issue_score);
                const E = stateScore * Math.abs(stateScore);
                score += (voteVar - Math.abs((S - E) * issueWeight));
            }
            score *= smValue;
            score = Math.max(score, 0);
            return { candidate: candId, result: score };
        });
        return { state, result: finalStatePoll };
    });

    calcStatePolls.forEach((f) => {
        f.abbr = stateAbbrByPk.get(f.state) ?? (window.e.states_json.find((g) => g.pk === f.state)?.fields.abbr ?? null);
    });

    calcStatePolls.forEach((f) => {
        const sf = stateFieldsByPk.get(f.state);
        const M = sf ? Math.floor(sf.popular_votes * (0.95 + 0.1 * Math.random())) : 0;
        const total = f.result.reduce((acc, g) => acc + g.result, 0);
        f.result.forEach((g) => {
            const N = g.result / total;
            g.percent = N;
            g.votes = Math.floor(N * M);
        });
    });

    calcStatePolls.forEach((f) => {
        const sf = stateFieldsByPk.get(f.state);
        const O = sf ? sf.electoral_votes : 0;
        f.result.sort((a, b) => b.percent - a.percent);

        if ([1, 3].includes(gameType)) {
            if (sf && sf.winner_take_all_flg === 1) {
                f.result.forEach((g, idx) => { g.electoral_votes = idx === 0 ? O : 0; });
            } else {
                const H = f.result.reduce((acc, g) => acc + g.votes, 0);
                const [L, D] = splitEVTopTwo(O, f.result[0].votes, H);
                f.result.forEach((g, idx) => {
                    if (idx === 0) g.electoral_votes = L;
                    else if (idx === 1) g.electoral_votes = D;
                    else g.electoral_votes = 0;
                });
            }
        }

        if (gameType === 2) {
            const V = f.result.map((g) => g.percent);
            const q = divideElectoralVotesProp(V, O);
            f.result.forEach((g, idx) => { g.electoral_votes = q[idx]; });
        }
    });

    if (window.e.primary_states) {
        const primaryStates = getPrimaryStatesParsed();
        const primaryMap = new Map();
        for (const ps of primaryStates) {
            if (!primaryMap.has(ps.state)) primaryMap.set(ps.state, ps.result);
        }
        calcStatePolls.forEach((f) => {
            if (primaryMap.has(f.state)) f.result = primaryMap.get(f.state);
        });
    }

    if (t === 1) {
        try {
            const latest = getLatestRes(calcStatePolls);
            window.res = latest;
            [window.nn2] = window.res;
            window.nn3 = window.nn2.map((c) => c.evvs || 0);
        } catch (err) { }
        return calcStatePolls;
    }

    if (t === 2) {
        const out = calcStatePolls.map((f) => {
            const res = f.result.map((candidate) => {
                const G = 1 + randomNormal() * variance;
                return { ...candidate, result: candidate.result * G };
            });
            const sf = stateFieldsByPk.get(f.state);
            const M = sf ? Math.floor(sf.popular_votes * (0.95 + 0.1 * Math.random())) : 0;
            const total = res.reduce((acc, candidate) => acc + candidate.result, 0);
            const N = res.map((candidate) => ({
                ...candidate,
                percent: candidate.result / total,
                votes: Math.floor((candidate.result / total) * M),
            }));
            return { ...f, result: N };
        });

        try {
            const latest = getLatestRes(out);
            window.res = latest;
            [window.nn2] = window.res;
            window.nn3 = window.nn2.map((c) => c.evvs || 0);
        } catch (err) { }

        return out;
    }
}

const gameStart = (a) => {
    a.preventDefault();

    let mlDiv = document.getElementById("modloaddiv");
    if (mlDiv) mlDiv.style.display = "none";
    let mlrDiv = document.getElementById("modLoadReveal");
    if (mlrDiv) mlrDiv.style.display = "none";
    let fmDiv = document.getElementById("featured-mods-area");
    if (fmDiv) fmDiv.style.display = "none";

    const tempOptions = window.e.temp_election_list.map((election) => {
        if (!election.is_premium || window.e.show_premium) {
            return `<option value="${election.id}">${election.display_year}</option>`;
        }
        return `<option value="${election.id}" disabled>${election.display_year}</option>`;
    }).join("");

    window.e.election_id ??= window.e.election_json[0].pk;
    const election = PROPS.ELECTIONS.get(String(window.e.election_id));
    document.getElementById("game_window").innerHTML = `
    <div class="game_header">${window.corrr}</div>
    <div class="inner_window_w_desc" id="inner_window_2">
      <div id="election_year_form">
        <form name="election_year">
          <p><h3>${window.e.SelectText}</h3><select name="election_id" id="election_id">${tempOptions}</select></p>
        </form>
      <div class="election_description_window" id="election_description_window">
        <div id="election_image"><img src="${election.image_url}" width="300" height="160"/></div>
        <div id="election_summary">${election.summary}</div>
      </div>
    </div>
    <p><button id="election_id_button">Continue</button></p>
    <p id="credits">This scenario was made by ${window.e.credits}.</p>
  `;

    const electionId = document.getElementById("election_id");
    const credits = document.getElementById("credits");

    const updateCredits = () => {
        const val = Number(electionId.value);
        if (val === 69) credits.innerHTML = "This scenario was made by Tex.";
        else if (val > -1 && !modded) credits.innerHTML = "This scenario was made by Dan Bryan.";
        else credits.innerHTML = `This scenario was made by ${window.e.credits}.`;
    };

    electionId.value = window.e.election_id;
    updateCredits();

    electionId.addEventListener("change", () => {
        window.e.election_id = Number(electionId.value);
        const selectedElection = PROPS.ELECTIONS.get(String(window.e.election_id));
        document.getElementById("election_description_window").innerHTML = `
      <div id="election_image"><img src="${selectedElection.image_url}" width="300" height="160"/></div>
      <div id="election_summary">${selectedElection.summary}</div>`;
        updateCredits();
    });

    document.getElementById("election_id_button").addEventListener("click", candSel);
};

// start buttons
document.getElementById("game_start")?.addEventListener("click", gameStart);
document.getElementById("skip_to_final")?.addEventListener("click", () => {
    window.e.final_state_results = A(1);
    electionNight();
});

// mod loader
$("#submitMod").click(() => {
    document.getElementById("featured-mods-area").style.display = "none";
    if ($("#importfile").length && $("#importfile")[0].value !== "") {
        const file = document.querySelector("input[type=file]").files[0];
        const reader = new FileReader();
        reader.onload = (fle) => {
            const importedtext = fle.target.result;
            campaignTrail_temp.dagakotowaru = atob(encode(importedtext));
        };
        reader.readAsText(file);
    }
    if ($("#modSelect")[0].value === "other") {
        important_info = $("#codeset3")[0].value;
        if (important_info !== "") campaignTrail_temp.multiple_endings = true;
        if (!moddercheckeror) {
            window.e ||= campaignTrail_temp;
            executeMod($("#codeset1")[0].value, { campaignTrail_temp, window, document, $, jQuery });
            moddercheckeror = true;
        }
    } else {
        evalFromUrl(`../static/mods/${$("#modSelect")[0].value}_init.html`);
        diff_mod = true;
    }
    $("#modloaddiv")[0].style.display = "none";
    $("#modLoadReveal")[0].style.display = "none";
    modded = true;
});


// bigshot mode check
setInterval(function () {
    if (typeof sussyroth === "function" && sussyroth() && localStorage.getItem("cheated") != "true") {
        setTimeout(function () {
            location.reload();
        }, 1000);
    }
}, 100);

function sussyroth() {
    return campaignTrail_temp.bigshot_mode;
}

function nextPage() {
    document.getElementById("monologue").innerHTML = "<audio loop='true' autoplay='true' src='https://ia800103.us.archive.org/2/items/sansost/21%20Dogsong.mp3' style='display:none;'></audio>* it's been a while, huh?<br>* ...<br>* i'll be honest.<br>* i have no idea what happened for you to get here.<br>* this is actually some sort of error-handling message.<br>* so, if you're getting this ending...<br>* tell whoever made the mod, okay?<br>* they might fix it, or if it's a novel situation...<br>* they might even add another ending to the mod.<br>* chances are, though...<br><button onclick='nextPage2()'>Next Page</button>";
}

function nextPage2() {
    document.getElementById("monologue").innerHTML = "* you're just a dirty modder, aren't you?<br>* yeah, get outta here.";
}

var dirtyhacker1, dirtyhacker2, dirtyhacker3;
document.addEventListener('keydown', function (event) {
    if (event.keyCode == 32) {
        if (document.getElementById("visit_overlay") != null && campaignTrail_temp.bigshot_mode != true && campaignTrail_temp.spacebarformods != true) {
            campaignTrail_temp.multiple_endings = true;
            dirtyhacker1 = function () { document.getElementById("monologue").innerHTML = "heh heh heh... that's your fault isn't it?<br>you can't understand how this feels.<br><button onclick='dirtyhacker2()'>Next Page</button>"; };
            dirtyhacker2 = function () { document.getElementById("monologue").innerHTML = "knowing that one day, without any warning... it's all going to be reset.<br>look. i gave up trying to stop hacking a long time ago.<br>and stopping the spacebar glitch doesn't really appeal anymore, either.<br><button onclick='dirtyhacker3()'>Next Page</button>"; };
            dirtyhacker3 = function () { document.getElementById("monologue").innerHTML = "cause even if we do... we'll just end up right back here, without any memory of it, right?<br>to be blunt... it makes it kind of hard to give it my all.<br>... or is that just a poor excuse for being lazy...? hell if i know."; };
            window.endingPicker = function () {
                if (localStorage.getItem("???") == null) localStorage.setItem("???", 0);
                else localStorage.setItem("???", Number(localStorage.getItem("???")) + 1);

                if (Number(localStorage.getItem("???")) < 2) {
                    return "<audio loop='true' autoplay='true' src='https://ia800103.us.archive.org/2/items/sansost/15%20Sans..mp3' style='display:none;'></audio><font id='monologue' face='Comic Sans MS'>our reports showed a massive anomaly in the gamespace continuum.<br>global multipliers jumping left and right, stopping and starting...<br>until suddenly, everything ends.<br><button onclick='dirtyhacker1()'>Next Page</button></font>";
                } else {
                    window.secretsecretending = function () { document.getElementById("monologue").innerHTML = "* type 'bigshot' into the main page, press enter, type 'bigshot' again, press enter. now go into a game and look at the bottom of the page."; };
                    return "<font id='monologue' face='Comic Sans MS'>* heya<br>* is anyone there...?<br>* you must be sick of hearing this, huh?<br>* what if i told you there was another way...<br><button onclick='secretsecretending()'>Next Page</button></font>";
                }
            };
        } else if (document.getElementById("visit_overlay") != null && campaignTrail_temp.spacebarformods) {
            campaignTrail_temp.spacebarUsed = true;
        }
    }
});

document.addEventListener("DOMContentLoaded", () => {
    const handlers = {
        "#candidate_id_button": (event) => { if (!window.e.code2Loaded) vpSelect(event); },
        "#candidate_id_back": (event) => gameStart(event),
        "#running_mate_id_button": (event) => {
            const runningMateId = document.querySelector("#running_mate_id");
            event.preventDefault();
            if (!window.e.code2Loaded) renderOptions(window.e.election_id, window.e.candidate_id, runningMateId.value);
        },
        "#running_mate_id_back": (event) => candSel(event),
        "#opponent_selection_id_back": (event) => vpSelect(event),
        "#view_electoral_map": () => openMap(A(2)),
        "#shining_menu_button": () => shining_menu(A(2)),
        "#answer_select_button": (event) => onAnswerSelectButtonClicked(event),
        "#resume_questions_button": () => questionHTML(A(2)),
        "#AdvisorButton": (event) => {
            event.preventDefault();
            campaignTrail_temp.answer_feedback_flg = 1 - campaignTrail_temp.answer_feedback_flg;
            const newButtonText = (campaignTrail_temp.answer_feedback_flg === 1) ? "Disable advisor feedback" : "Enable advisor feedback";
            $(event.target).text(newButtonText);
        },
        "#margin_switcher": (event) => {
            event.preventDefault();
            campaignTrail_temp.margin_format = campaignTrail_temp.margin_format === "#c9c9c9" ? "#fff" : "#c9c9c9";
            window.localStorage.setItem("margin_form", campaignTrail_temp.margin_format);

            const pollingTuple = window.e.current_results;
            const stateResults = (Array.isArray(pollingTuple) && pollingTuple.length === 2 && Array.isArray(pollingTuple[1])) ? pollingTuple[1] : pollingTuple;
            const pollingData = stateResults || A(2);
            const mapOptions = rFunc(pollingData, 0);

            if ($("#map_container").data("plugin-usmap")) {
                updateUsMapStyles(mapOptions);
            } else {
                if (!document.querySelector("#map_container")) {
                    const mca = document.querySelector("#main_content_area");
                    if (mca) {
                        const div = document.createElement("div");
                        div.id = "map_container";
                        mca.insertBefore(div, mca.firstChild);
                    }
                }
                $("#map_container").usmap(mapOptions);
            }
        },
        "#overall_results_button": () => overallResultsHtml(),
        "#final_election_map_button": () => finalMapScreenHtml(),
        "#state_results_button": () => stateResultsHtml(),
        "#overall_details_button": () => overallDetailsHtml(),
        "#recommended_reading_button": () => furtherReadingHtml(),
        "#play_again_button": () => beginNewGameHtml(),
    };

    const handlerEntries = Object.entries(handlers);

    document.body.addEventListener("click", (event) => {
        handlerEntries.some(([selector, handler]) => {
            if (event.target.matches(selector)) {
                event.preventDefault();
                if (handler.length === 1) handler(event);
                else handler();
                return true;
            }
            return false;
        });
    });
});