function paramlizeForPost(inputData, files) {
    let requestData = new FormData();
    Object.keys(inputData || {}).map((i) => {
        if (Array.isArray(inputData[i])) {
            for (let j in inputData[i]) {
                requestData.append(i, inputData[i][j]);
            }
        } else {
            requestData.append(i, inputData[i]);
        }
    });
    if (files) {
        for (let name in files) {
            if (Array.isArray(files[name])) {
                for (let f of files[name]) {
                    requestData.append(name, f);
                }
            } else {
                requestData.append(name, files[name]);
            }
        }
    }
    return requestData;
}

function paramlizeForGet(data) {
    let str = '';
    for (const name in data || {}) {
        if (Array.isArray(data[name])) {
            for (let j of data[name]) {
                str += encodeURIComponent(name) + "=" + encodeURIComponent(j) + "&";
            }
        }
        else {
            str += encodeURIComponent(name) + "=" + encodeURIComponent(data[name]) + "&";
        }
    }
    if (str !== '') {
        str = str.substring(0, str.length - 1);
    }
    return str;
}

function toast(message) {
    if (!window.__existings_toasters_count) {
        window.__existings_toasters_count = 0;
    }

    let div = document.createElement('div');
    window.__existings_toasters_count++

    if (window.__existings_toasters_count > 10) {
        window.__existings_toasters_count = 0;
    }


    div.style.cssText = `
        position: absolute;
        color: white;
        background: rgba(0,0,0,0.7);
        left: 50vw;
        bottom: 10vw;
        z-index: 999999999999999;
    `;
    div.innerHTML = message;
    document.body.appendChild(div);
    let h = parseInt(getComputedStyle(div)['height']) * window.__existings_toasters_count;
    let w = parseInt(getComputedStyle(div)['width']) / 2;
    console.log()
    div.style.transform = `translate(-${w}px, -${h}px)`;
    setTimeout(() => {
        document.body.removeChild(div);
    }, 2000)
}

function uuid() {
    var s = [];
    var hexDigits = "0123456789abcdef";
    for (var i = 0; i < 36; i++) {
        s[i] = hexDigits.substr(Math.floor(Math.random() * 0x10), 1);
    }
    s[14] = "4";  // bits 12-15 of the time_hi_and_version field to 0010
    s[19] = hexDigits.substr((s[19] & 0x3) | 0x8, 1);  // bits 6-7 of the clock_seq_hi_and_reserved to 01
    s[8] = s[13] = s[18] = s[23] = "-";

    var uuid = s.join("");
    return "u" + uuid.replace(/-/g, '')
}

function hash(str) {
    var hash = 1315423911, i, ch;
    for (i = str.length - 1; i >= 0; i--) {
        ch = str.charCodeAt(i);
        hash ^= ((hash << 5) + ch + (hash >> 2));
    }
    return (hash & 0x7FFFFFFF);
}

// 生成可以被 eval 执行一次的匿名函数, hold 表示让函数持续存在
function f(func, hold, argStr) {
    if (typeof window.anonymousFunctions === 'undefined') {
        window.anonymousFunctions = {};
        window.anonymousFunctionsMap = new Map();
    }

    if (window.anonymousFunctionsMap.has(func.toString())) {
        return window.anonymousFunctionsMap.get(func.toString());
    }

    let id = uuid();
    window.anonymousFunctions[id] = (that, ar1, ar2, ar3, ar4, ar5) => {
        try {
            func(that, ar1, ar2, ar3, ar4, ar5);
        } finally {
            if (!hold) {
                delete window.anonymousFunctions[id];
            }
        }
    };

    let ans = `window.anonymousFunctions['${id}'](this)`;
    if (argStr) {
        ans = `window.anonymousFunctions['${id}'](${argStr})`;
    }

    if (hold) {
        window.anonymousFunctionsMap.set(func.toString(), ans);
    }

    return ans;
}

function setOptions(obj, options) {
    for (var i in options) {
        obj[i] = options[i];
    }
    return obj;
}

function clonePureObj(obj) {
    return JSON.parse(JSON.stringify(obj));
}

function toPureArray(itereable) {
    itereable = itereable || [];
    let ans = [];
    for (let i = 0; i < itereable.length; i++) {
        ans.push(itereable[i]);
    }
    return ans;
}

function minDistance(s1, s2) {
    const len1 = s1.length
    const len2 = s2.length

    let matrix = []

    for (let i = 0; i <= len1; i++) {
        // 构造二维数组
        matrix[i] = new Array()
        for (let j = 0; j <= len2; j++) {
            // 初始化
            if (i == 0) {
                matrix[i][j] = j
            } else if (j == 0) {
                matrix[i][j] = i
            } else {
                // 进行最小值分析
                let cost = 0
                if (s1[i - 1] != s2[j - 1]) { // 相同为0，不同置1
                    cost = 1
                }
                const temp = matrix[i - 1][j - 1] + cost

                matrix[i][j] = Math.min(matrix[i - 1][j] + 1, matrix[i][j - 1] + 1, temp)
            }
        }
    }
    return Math.abs(matrix[len1][len2]) //返回右下角的值
}

function id(s){
    return document.querySelector(s);
}

if (typeof JXG !== 'undefined') {
    JXG.getBoard = (element, options) => {
        let defaultOptions = {
            boundingbox: [-10, 10, 10, -10],
            axis: true,
            grid: true,
            showCopyright: false,
            renderer: 'canvas',
            // showFullscreen: true,
        };
        let b = JXG.JSXGraph.initBoard(element.id, setOptions(defaultOptions, options));

        b.verticalLine = function verticalLine(xValue, tag) {
            this.create('functiongraph', [function (x) { return (x - xValue) / 0.000000000000000000000000000000001 }],
                { strokeColor: 'red', strokeWidth: 1, dash: 2 });
            // this.create('point', [xValue, 0], { name: tag ? tag : `(${xValue.toFixed(2)}, 0)`, size: 0.1 });
            this.create('point', [xValue, 0], { name: tag ? tag : '', size: 0.1 });
        }

        b.horizontalLine = function horizontalLine(yValue, tag) {
            this.create('functiongraph', [function (x) { return yValue }],
                { strokeColor: 'red', strokeWidth: 1, dash: 2 });
            // this.create('point', [0, yValue], { name: tag ? tag : `(0, ${yValue.toFixed(2)})`, size: 0.1 });
            this.create('point', [0, yValue], { name: tag ? tag : '', size: 0.1 });
        }

        b.drawDiagram = function drawDigram(funcOrArray) {
            if (Array.isArray(funcOrArray)) {
                funcOrArray.forEach(i => {
                    this.create('functiongraph', [i]);
                });
            } else {
                this.create('functiongraph', [funcOrArray]);
            }
        }
        return b;
    }
}

