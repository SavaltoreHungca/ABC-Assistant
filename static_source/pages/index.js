let DataSet = {
    getWordsData: async () => {
        if (!window.___wordsData) {
            try {
                toast('wordsData 开始加载');
                window.___wordsData = (await axios.get('/static/words/words.json')).data;


                let ans = {};
                for (let w of Object.keys(window.___wordsData)) {
                    obj = window.___wordsData[w];
                    if (obj && obj['originalWord']) {
                        fakew = w;
                        w = obj['originalWord'];
                        if (ans[w]) {
                            ansobj = ans[w];
                            ansobj['useCount'] += obj['useCount'];
                            ansobj['paperCount'] = Math.max(ansobj['paperCount'], obj['paperCount']);
                        } else {
                            ans[fakew] = obj;
                            ans[w] = obj;
                        }
                    }
                }

                window.___wordsData = ans;


                toast('wordsData 加载完毕');
            } catch (e) {
                toast('wordsData 加载失败！！');
            }
        }
        return window.___wordsData;
    }
}

async function loadJsFile(filenames) {
    for (let file of filenames) {
        let s = document.createElement("script");
        s.src = file;
        await new Promise(r => {
            s.onload = () => r();
            document.body.appendChild(s);
        });
    }
}

function fullScreen() {
    screenfull.toggle();
}

function upOrDown(scroller, direction, factor){
    factor = factor || 0.3;
    switch(direction){
        case 'up':
            scroller.scrollTop -= scroller.offsetHeight * factor;
            break;
        case 'down':
            scroller.scrollTop += scroller.offsetHeight * factor;
            break;
    }
}

function cheapFolder(that) {
    that._c = !that._c;
    if (that._c) {
        that.nextElementSibling.style.display = "";
    } else {
        that.nextElementSibling.style.display = "none";
    }
}

function fullPopup(html, containerId) {
    let d = document.createElement('div');
    d.style.cssText = `z-index: 9999999; position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: white;`;
    d.innerHTML = `
        <div style="overflow: hidden; overflow-y: scroll; width: 100%; height: 100%">
            <div id="${containerId}" style="word-break: break-word; width: 100%">${html}</div>
            <div style="height: 300px"></div>
        </div>
        <div 
            onclick="document.body.removeChild(this.parentElement)"
            style="height: 50px; position: absolute; bottom: 0; left: 0; width: 100%; text-align: center; background: white; border-top: solid;"
        >关闭</div>
    `
    document.body.appendChild(d);
    console.log(d.firstElementChild.firstElementChild);
    d.firstElementChild.firstElementChild['close'] = () => {
        document.body.removeChild(d);
    }
    return d.firstElementChild.firstElementChild;
}

function halfPopup(html, containerId) {
    let d = document.createElement('div');
    d.style.cssText = `z-index: 9999999; position: absolute; top: 0; left: 0; width: 100%; height: calc(100% - 50px); background: white;`;
    d.innerHTML = `
        <div style="overflow: hidden; overflow-y: scroll; width: 100%; height: 100%">
            <div id="${containerId}" style="word-break: break-word; width: 100%">${html}</div>
            <div style="height: 300px"></div>
        </div>
        <div 
            onclick="document.body.removeChild(this.parentElement)"
            style="height: 50px; position: absolute; bottom: 0; left: 0; width: 100%; text-align: center; background: white; border-top: solid;"
        >关闭</div>
    `
    document.body.appendChild(d);
    console.log(d.firstElementChild.firstElementChild);
    d.firstElementChild.firstElementChild['close'] = () => {
        document.body.removeChild(d);
    }
    return d.firstElementChild.firstElementChild;
}

function getOxfordMultipleSense(elemen) {

    const selectChild = (ele, selector) => {
        let sensetop = ele.querySelector('.sensetop');
        let ans = ele.querySelector(selector);
        if (ans && (ans.parentElement === ele || ans.parentElement === sensetop)) {
            return ans;
        }
        return null;
    }
    const getInnerTxt = (ele, defaultTxt) => {
        if (Array.isArray(ele)) {
            let ans = '';
            ele.forEach(i => {
                ans += getInnerTxt(i, defaultTxt) + ' ';
            });
            return ans.trim();
        }

        if (ele) {
            return ele.innerText;
        }
        return defaultTxt ? defaultTxt : '';
    }
    const dealSense = (sense) => {
        let cf = selectChild(sense, '.cf');
        let def = selectChild(sense, '.def');
        let pos = selectChild(sense, '.pos');
        let grammar = selectChild(sense, '.grammar');
        let labels = selectChild(sense, '.labels');
        let use = selectChild(sense, '.use');

        let oneExpalination = {
            cf: getInnerTxt(cf, ''),
            def: getInnerTxt(def, ''),
            pos: getInnerTxt(pos, ''),
            grammar: getInnerTxt(grammar, ''),
            labels: getInnerTxt(labels, ''),
            use: getInnerTxt(use, ''),
            examples: [],
        };

        let examples = selectChild(sense, '.examples');
        if (examples && examples.children.length > 0) {

            for (let j = 0; j < examples.children.length; j++) {
                let example = examples.children[j];
                oneExpalination.examples.push({
                    cf: getInnerTxt(example.querySelector('.cf'), ''),
                    x: getInnerTxt(example.querySelector('.x'), ''),
                })
            }
        }
        return oneExpalination;
    }

    let ans = [];

    if (elemen.querySelector('ol.senses_multiple')
        && elemen.querySelector('ol.senses_multiple').querySelectorAll('span.shcut-g').length > 0
    ) {
        let ol = elemen.querySelector('ol.senses_multiple');
        let children = ol.querySelectorAll('span.shcut-g');

        for (let i = 0; i < children.length; i++) {
            let child = children[i];
            let senseList = child.querySelectorAll('.sense');
            let ansitem = {
                situation: getInnerTxt(child.querySelector('h2'), ''),
                explainations: [],
            };

            for (let k = 0; k < senseList.length; k++) {
                let sense = senseList[k];

                let oneExpalination = dealSense(sense);

                ansitem.explainations.push(oneExpalination);
            }
            ans.push(ansitem);
        }
    } else if (elemen.querySelector('ol.senses_multiple')) {
        let ol = elemen.querySelector('ol.senses_multiple');
        let senseList = ol.querySelectorAll('.sense');
        let ansitem = {
            situation: '',
            explainations: [],
        };
        for (let k = 0; k < senseList.length; k++) {
            let sense = senseList[k];

            let oneExpalination = dealSense(sense);

            ansitem.explainations.push(oneExpalination);
        }
        ans.push(ansitem);
    } else if (elemen.querySelector('ol.sense_single')) {
        let ol = elemen.querySelector('ol.sense_single');
        let senseList = ol.querySelectorAll('.sense');
        let ansitem = {
            situation: '',
            explainations: [],
        };
        for (let k = 0; k < senseList.length; k++) {
            let sense = senseList[k];

            let oneExpalination = dealSense(sense);

            ansitem.explainations.push(oneExpalination);
        }
        ans.push(ansitem);
    }

    return ans;
}

function genOxfordPage(imgele) {
    const situations = getOxfordMultipleSense(imgele.previousElementSibling);
    const container = imgele.previousElementSibling.previousElementSibling;

    let html = `<ul style="margin-left: 23px">`;
    for (let situation of situations) {
        html += `<li><div>🎬：${situation.situation}</div>
            <ul style="margin-left: 40px;">`;

        for (let explain of situation.explainations) {
            html += `<li style="list-style: disc">`;
            let firstAddExample = true;
            let firstExampleHtml = ``;
            let moreExampleHtml = ``;
            for (let example of explain.examples) {
                if (firstAddExample) {
                    firstAddExample = false;
                    firstExampleHtml = `
                        <div>${example.x}<strong><u>${example.cf}</u></strong> ${vueapp.oxfordTransMap[example.x] || ''}</div>
                    `;
                } else {
                    moreExampleHtml += `<li style="list-style: square;">
                        <div>${example.x}<strong><u>${example.cf}</u></strong> ${vueapp.oxfordTransMap[example.x] || ''}</div>
                    </li>`;
                }
            }
            html += `
                <div onclick="cheapFolder(this)">${firstExampleHtml}</div>
                <div style="display: none;">
                    <strong>
                        <span>${explain.grammar}|${explain.labels}|${explain.use}|${explain.pos}|</span>
                        <span>${vueapp.oxfordTransMap[explain.def] || ''}</span>
                        <span>${explain.def}</span>
                    </strong>
                    ${!moreExampleHtml ? '' : `<div onclick="cheapFolder(this)">更多例句</div><ul style="display: none; margin-left: 21px;">${moreExampleHtml}</ul>`}
                </div>
            </li>`;
        }


        html += `</ul></li>`;
    }

    html += `</ul>`;
    container.innerHTML = html;
}

async function get_similars(word, containter) {
    let words_data = await DataSet.getWordsData();

    kmap = {}
    allow = []
    data = []
    for (ow of Object.keys(words_data)) {
        allow.push(ow)
        kmap[ow] = minDistance(word, ow)
    }
    allow.sort((a, b) => {
        return kmap[a] - kmap[b];
    });

    for (let i = 0; i < 10 && i < allow.length; i++) {
        if (allow[i] == word)
            continue
        data.push({
            'w': allow[i],
            'variety': words_data[allow[i]]['variety'],
            "means": words_data[allow[i]]['means'],
        })
    }

    // let data = await axios.get('/parsed_essay_words?' + paramlizeForGet({ word: word })); data = data.data;

    let html = `<ul>`;

    for (let i of data || []) {
        const getMeansHtml = (item) => {
            let html = `<ul style="margin-left: 20px;">`;
            for (let pos of Object.keys(item.means)) {
                html += `<li>
                    <span>${pos}</span>
                    <span>${item.means[pos]}</span>
                </li>`;
            }
            html += `</ul>`;
            return html;
        }

        html += `
            <li style="display: inline-block;">
                <div onclick="cheapFolder(this)">${i.w}</div>
                <div style="display: none;">
                    <div>${i.variety}</div>
                    ${getMeansHtml(i)}
                </div>
            </li>
        `
    }

    html += `</ul>`;
    containter.innerHTML = html;
}

function _sel_text(startEl) {
    var sel = window.getSelection();
    var range = document.createRange();
    range.setStart(startEl, 0)
    range.setEnd(startEl, 1);
    sel.removeAllRanges()
    sel.addRange(range);

    let eles = essay.querySelectorAll('.w');
    for (let i = 0, len = eles.length; i < len; i++) {
        let child = eles[i];
        child.style.textDecoration = '';
    }
    startEl.style.textDecoration = 'underline';
}

async function transToIt(sen, container) {
    if (container) {
        container.innerText = '-.-!翻译中';
    }
    try {
        let uniqId = null;
        if (container) {
            if (container.id) {
                uniqId = container.id;
            } else {
                uniqId = uuid();
                container.id = uniqId;
            }
        }
        trans = (await axios.get('/trans_sentence?' + paramlizeForGet({ sentence: sen.replace(/\&|\#/g, ' ') }), {
            self_trace_id: uniqId
        })).data;
        if (!container) {
            return trans;
        }
        if (trans && trans.trans) {
            container.innerText = trans.trans.trim();
        }
    } catch (e) {
        container.innerText = 'lol翻译失败';
    }
}

async function transfollow(that) {
    that.nextElementSibling.nextElementSibling.innerText = '-.-!翻译中';
    await transToIt(that.nextElementSibling.innerText, that.nextElementSibling.nextElementSibling);
}

(async () => {
    await loadJsFile([
        "/static/js/axios.js",
        "/static/js/vue.2.6.12.js",
        "/static/js/vant.js",
        "/static/js/comn.js",
        "/static/js/screenfull.js",
        "/static/js/clipboard.min.js",
        "/static/pages/indexVue.js",
    ]);
})();