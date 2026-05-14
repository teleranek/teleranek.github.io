/**
 * dynamicity measurement, methods:
 * 
 * 1. basic. sum absolute neighbor's diffs
 * 2. same sum of diffs, but in a given window - so the diffs are windows' diffs, and windows are averages. 
 * 3. sum of 1 to k-th neighbor diffs, optionally with some decay
 * 4. same as above, but the metric is a cosine (1 - cos(vi, vi+k))
 */

import { parseEpubZip } from './epub.js';

const types = [
    'good', 'pwr', 'aggr', 'dngr', 'struct'
]

const typeNames = [
    'Evil - Good',
    'Weak - Powerful',
    'Passive - Aggressive',
    'Safe - Dangerous',
    'Chaotic - Structured',
];

// chart x resolution
const RESOLUTION = 40;
// how many previous scores to consider for dynamicity measurement
const DYNAMIC_K = 5;
const GUTENBERG = 'https://gutendex.com/books'

// this emphasizes larger scores more, eliminating noise
const SMOOTHING = 2//0.5 <= this is for tanh version
const THRESHOLD = 0.05; // ignore scores abs < THRESHOLD

const USE_PUBLIC_PROXY = false;
const PROXY = 'http://boo.teleranek.org';
// const PROXY = 'http://localhost:3001';
// const PROXY = 'https://api.cors.lol/?url=';

const POWER = 0;
const GOODNESS = 1;
const AGGRESSION = 2;
const DANGER = 3;
const STRUCTURE = 4;

var DATA = null;


async function loadDta() {

    const data = await fetch('./data.txt').then(res => res.text());
    const lines = data.split('\n');

    const words = [];

    // rng: -1 .. 1
    const good = {};
    const pwr = {};
    const aggr = {};
    const dngr = {};
    const struct = {};

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].split('\t');
        words.push(line[0]);
        good[line[0]] = parseFloat(line[1]);
        pwr[line[0]] = parseFloat(line[2]);
        aggr[line[0]] = parseFloat(line[3]);
        dngr[line[0]] = parseFloat(line[4]);
        struct[line[0]] = parseFloat(line[5]);
    }

    return { words, good, pwr, aggr, dngr, struct };
}

async function defaultLoad() {
    // const data = await fetch('./books/christo.txt').then(res => res.text());

    const data = await fetch('./books/woot.txt').then(res => res.text());
    $('#title').text('Monte Cristo');
    return data;

    // test epub parsing
    // const data = await fetch('./mass.epub').then(res => res.arrayBuffer());
    // const text = await parseEpubZip(data);
    // $('#title').text('War and Peace');
    // return text;
}

function createNavButton(url, label) {
    const nav = $('#nav');
    const btn = $('<button></button>');
    btn.text(label);

    if (!url) {
        btn.prop('disabled', true);
    } else {
        btn.click(() => {
            loadSideBar(url);
        });
    }
    nav.append(btn);
}

function addLoader(container) {
    container.empty();
    const loader = $('<div class="loader"></div>');
    container.append(loader);
}

function process(text) {
    const dyns = [];
    for (let i = 0; i < types.length; i++) {
        const type = i;
        const chartData = processTextAvg(text, DATA[types[type]]);
        dyns.push(chartData.dyn);
        const chart = getChart(type, chartData);
    }
    dynamicChart(dyns);
}

function itemClickHandler(book) {
    return async () => {
        const main = $('#main');
        addLoader(main);
        let text;
        if (!USE_PUBLIC_PROXY) {
            text = await fetch(`${PROXY}/book/${book.id}`).then(res => res.text());
        } else {
            text = await fetch(`${PROXY}${book.formats['text/plain; charset=utf-8']}`).then(res => res.text());
        }
        $('#title').text(book.title);
        createMain();
        process(text);
    }
}

async function loadSideBar(url) {
    if (!url) {
        url = GUTENBERG;
    }
    const items = $('#items');
    const nav = $('#nav');
    
    addLoader(items);
    nav.prop('disabled', true);
    const list = await fetch(url).then(res => res.json());
    // return;
    nav.prop('disabled', false);
    nav.empty();
    items.empty();
    const next = list.next;
    const prev = list.previous;
    list.results.forEach(book => {
        const item = $('<div></div>');
        item.text(book.title);
        item.addClass('book-item');
        items.append(item);
        item.click(itemClickHandler(book));
    });
    
    createNavButton(prev, 'Previous');
    createNavButton(next, 'Next');
}

function initFileInput() {
    const fileInput = $('#fileInput');
    fileInput.change(fileInputHandler);
}

function isEpub(file) {
    return file.type === 'application/epub+zip' ||
        file.type === 'application/epub' ||
        file.name.endsWith('.epub');
}

async function fileInputHandler(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    let text = null;
    const isText = file.type.startsWith('text/') || file.name.endsWith('.txt');
    if (isText) {
        text = await file.text();
    } else if (isEpub(file)) {
        const arrayBuffer = await file.arrayBuffer();
        text = await parseEpubZip(arrayBuffer);
    }

    if (!text) return;

    const main = $('#main');
    addLoader(main);
    $('#title').text(file.name);
    createMain();
    process(text);
}


function getLabels(length) {
    const labels = Array.from({ length }, (_, i) => (i + 1).toString());
    return labels;
}
function getChart(type, data) {
    const theData = data.avg;
    const min = data.min;
    const max = data.max;

    const canvas = document.getElementById(types[type]);
    const chart = new Chart(canvas, {
        type: 'line',
        data: {
            labels: getLabels(theData.length),
            datasets: [{
                label: typeNames[type],
                data: theData,
                borderColor: 'rgba(255, 99, 132, 1)',
                backgroundColor: 'rgba(255, 99, 132, 0.2)',
            }, {
                label: 'Dynamics',
                data: data.dynNormalised,
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    suggestedMin: min-0.1,
                    suggestedMax: max+0.1
                }
            }
        }
    });
    return chart;
}

function dynamicChart(allDyns) {
    const dynAvg = new Array(allDyns[0].length).fill(0);
    for (let i = 0; i < allDyns.length; i++) {
        const dyn = allDyns[i];
        const val = 0;
        for (let j = 0; j < dyn.length; j++) {
            dynAvg[j] += dyn[j];
        }
    }
    for (let i = 0; i < dynAvg.length; i++) {
        dynAvg[i] /= allDyns.length;
    }
    // Use dynAvg to create the dynamic chart
    const canvas = document.getElementById('dynamic');
    const chart = new Chart(canvas, {
        type: 'line',
        data: {
            labels: getLabels(dynAvg.length),
            datasets: [{
                label: 'Overall Dynamics',
                data: dynAvg,
                borderColor: 'rgba(54, 162, 235, 1)',
                backgroundColor: 'rgba(54, 162, 235, 0.2)',
            }]
        },
        options: {
            responsive: true,
        }
    });
}

function createMain() {
    const main = $('#main');
    main.empty();

    for (let type of types) {
        const canvas = $(`<canvas id="${type}"></canvas>`);
        const div = $(`<div class="chart-container"></div>`);
        div.append(canvas);
        main.append(div);
    }

    // dyn chart canvas
    const dynCanvas = $(`<canvas id="dynamic"></canvas>`);
    const dynDiv = $(`<div class="chart-container"></div>`);
    dynDiv.append(dynCanvas);
    main.append(dynDiv);

}

function getRange(length) {
    // length / range = RESOLUTION
    return Math.max(1, Math.floor(length / RESOLUTION));
}

function decayFunction(k) {
    // return 1 / (k || 1);
    return Math.pow(0.9, k-1);
}

function dynamicMeasureK(score, lastScores) {
    let dyn = 0;
    let cnt = 0;
    const k = DYNAMIC_K;
    for (let i = 1; i <= k; i++) {
        if (lastScores.length < i) break;
        const lastScore = lastScores[lastScores.length - i];
        const decay = decayFunction(i); // simple decay function
        dyn += Math.abs(score - lastScore) * decay;
        cnt += decay;
    }
    lastScores.push(score);
    if (lastScores.length > k) {
        lastScores.shift();
    }
    return cnt > 0 ? dyn / cnt : 0;
}


function processTextAvg(text, scores) {
    const words = text.split(/\s+/);
    const result = [];
    const dynResult = [];
    let dynNormalisedResult = [];
    let min = Infinity;
    let max = -Infinity;
    let minDyn = Infinity;
    let maxDyn = -Infinity;
    let currRange = 0;
    let autoRange = getRange(words.length);
    let i = 0;
    while (i < words.length) {
        let avg = 0;
        let dyn = 0;
        let lastScores = [];
        let cnt = 0;
        if ( i + 2*autoRange >= words.length) {
            currRange = words.length - i;
        } else {
            currRange = autoRange;
        }

        for (let j = 0; j < currRange && i + j < words.length; j++) {
            let word = words[i + j];
            if (!word) continue;
            word = word.toLowerCase().replace(/[^a-z]/g, '');
            if (!word) continue;
            const score = scores[word];
            if (score === undefined) continue;
            
            if (Math.abs(score) < THRESHOLD) continue; // ignore small scores as noise

            // tanh average
            avg += Math.tanh(SMOOTHING*score);
            // or signed power average
            // avg += Math.sign(score) * Math.pow(Math.abs(score), SMOOTHING);
            dyn += dynamicMeasureK(score, lastScores);
            //dyn += i==0 ? 0 : Math.abs(score - lastScore);

            cnt++;
        }
        avg /= cnt;
        dyn /= cnt;
        min = Math.min(min, avg);
        max = Math.max(max, avg);
        minDyn = Math.min(minDyn, dyn);
        maxDyn = Math.max(maxDyn, dyn);
        result.push(avg);
        dynResult.push(dyn);
        i += currRange;
    }

    dynNormalisedResult = dynResult.slice();
    for (let i = 0; i < dynResult.length; i++) {
        dynNormalisedResult[i] = (dynResult[i] - minDyn) / (maxDyn - minDyn) * (max - min) + min;
    }

    return {
        avg: result,
        dynNormalised: dynNormalisedResult,
        dyn: dynResult,
        min,
        max,
    };
}

(async () => {
    DATA = await loadDta();
    const text = await defaultLoad();
    
    createMain();
    process(text);

    loadSideBar();
    initFileInput();
})();