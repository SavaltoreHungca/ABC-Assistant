const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const comn = require('./comn');

project_path = path.resolve(__dirname + '/../..');
mixed_path = path.resolve(project_path + '/../../..');

const saferun = async (f, args, thisArg) => {
    return new Promise(r => {
        f.apply(thisArg || null, args)
            .then(rsp => r(rsp))
            .catch(e => r(''))
    });
}

const setPrenvent = async (page) => {
    await page.setRequestInterception(true);
    await page.on('request', (req) => {
        let allurls = [
            // `https://geolocation.onetrust.com/cookieconsentpub/v1/geo/location/geofeed`,
            // "https://apis.google.com/js/plusone.js"
            "https://www.oxfordlearnersdictionaries.com/definition/english"
        ];
        for (let url of allurls) {
            if (!req.url().startsWith(url)) {
                req.respond({
                    body: '',
                });
                return;
            }
        }
        req.continue();
    });
}


// 获取单词牛津词典单词例句
const filterWords = async () => {
    const browser = await puppeteer.launch({
        headless: false,
        'devtools': true, // 是否开启控制台
    });
    const page = await browser.newPage();

    const getMutipleSense = async () => {
        return await page.evaluate(() => {
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

            if (document.querySelector('ol.senses_multiple')
                && document.querySelector('ol.senses_multiple').querySelectorAll('span.shcut-g').length > 0
            ) {
                let ol = document.querySelector('ol.senses_multiple');
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
            } else if (document.querySelector('ol.senses_multiple')) {
                let ol = document.querySelector('ol.senses_multiple');
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
            } else if (document.querySelector('ol.sense_single')) {
                let ol = document.querySelector('ol.sense_single');
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
        });
    }

    let wordsJson = JSON.parse(fs.readFileSync(`${project_path}\\static_source\\words\\words.json`));
    let added = [];
    let ans = [];

    for (let p of comn.getAllFilesPath(`${project_path}\\static_source\\oxford`)) {
        try {
            let d = JSON.parse(fs.readFileSync(p));
            let arr = [d[0]];
            (d[1] || []).forEach(i => { arr.push(i) });

            for (oxford of arr) {
                let thtml = `${project_path}\\tempdata\\temp.html`;
                fs.writeFileSync(thtml, oxford.content, { encoding: 'utf-8' });
                await page.goto(thtml);
                let mutipleSense = await getMutipleSense();
                ans.push(mutipleSense);
                fs.rmSync(thtml, { force: true });
            }
        } catch (e) { }
    }
    fs.writeFileSync(`${mixed_path}\\documents\\out_fiter_words.json`, JSON.stringify(ans, null, 4), { encoding: 'utf-8' });
}

const getAllSentence = async (p) => {
    let ans = new Set();
    let words = JSON.parse(fs.readFileSync(p));

    for (let situations of words) {
        for (let situation of situations) {
            for (let explain of situation.explainations) {
                ans.add(explain.def.trim())
                for (let example of explain.examples) {
                    ans.add(example.x.trim());
                }
            }
        }
    }


    let rlt = [];
    ans.forEach(i => rlt.push(i));

    fs.writeFileSync(`${mixed_path}\\documents\\out_all_sentence.json`, rlt.join('\n'), { encoding: 'utf-8' });
}

const genWordTransMap = async (p_sentence, p_trans) => {
    let trans = fs.readFileSync(p_trans, { encoding: 'utf-8' }).split('\n');
    let sentenceList = fs.readFileSync(p_sentence, { encoding: 'utf-8' }).split('\n');
    let transMap = {};

    for (let i = 0; i < sentenceList.length; i++) {
        transMap[sentenceList[i]] = trans[i];
    }

    fs.writeFileSync(`${mixed_path}\\documents\\out_all_sentence_tranlate.json`, JSON.stringify(transMap, null, 2), { encoding: 'utf-8' });
}


// filterWords();
// getAllSentence(`${mixed_path}/documents/out_fiter_words.json`);
genWordTransMap(`${mixed_path}\\documents\\out_all_sentence.json`, `${mixed_path}\\documents\\out_trans.json`);