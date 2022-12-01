// const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
// const args = require('minimist')(process.argv.slice(2));
const axios = require('axios');
const comn = require('./comn');

project_path = path.resolve(__dirname + '/../..');
mixed_path = path.resolve(project_path + '/../../..');

fs.mkdirSync(project_path + `/tempdata/htmllist`, { recursive: true });

const getWords = (s) => {
    try {
        let rlt = s.match(/\b\S+\b/g);
        ans = [];
        for (let w of rlt) {
            if (w.indexOf('/') >= 0) {
                for (let i of w.split('/')) {
                    ans.push(i);
                }
            } else if (w.indexOf('—') >= 0) {
                for (let i of w.split('—')) {
                    ans.push(i);
                }
            } else {
                ans.push(w);
            }
        }
    } catch (e) { }
    return ans;
}



(async () => {
    const sentenceList = require('./list.json').list;
    let index = 0;
    for (let item of sentenceList) {
        index++;
        let data = await axios.get('http://localhost:8090/trans_words?' + comn.paramlizeForGet({ words: getWords(item.example.x) }));
        data = data.data;


        let html = `
            <h4>单词：${item.w}</h4>
            <h4>场景：${item.situation}</h4>
            <h4 id="liju">例句：${item.example.x}</h4>
            <div id="ydwordlist" style=""></div>
            <h4>翻译：${item.example.x_zh}</h4>
            <ul>
        `;

        for (let explain of [item.explain]) {
            html += `<li style="list-style: disc"><div><strong><span>${explain.grammar}|${explain.labels}|${explain.use}|${explain.pos}|</span>${explain.def_zh}${explain.def}</strong></div><ul>`;
            let firstAddExample = true;
            let firstExampleHtml = ``;
            let moreExampleHtml = ``;
            for (let example of explain.examples) {
                if (firstAddExample) {
                    firstAddExample = false;
                    firstExampleHtml = `
                            <div>${example.x}<strong><u>${example.cf}</u></strong></div>
                            <div>${example.x_zh}</div>
                        `;
                } else {
                    moreExampleHtml += `<li style="list-style: square;">
                            <div>${example.x}<strong><u>${example.cf}</u></strong></div>
                            <div>${example.x_zh}</div>
                        </li>`;
                }
            }
            html += `
                    <li style="list-style: square;">${firstExampleHtml}</li>
                    ${!moreExampleHtml ? '' : `<li><div>更多例句</div><ul>${moreExampleHtml}</ul></li>`}
                </ul></li>`;
        }

        html += `</ul></ul>`;

        for (let i of (data || [])) {
            let meansHtml = ``;

            for (let j of (i.means || [])) {
                meansHtml += `
                    <li>${j.pos}：${j.tran}</li>
                `;
            }

            html += `<li>
                ${i.w}
                <ul>${meansHtml}</ul>
            </li>`
        }

        html += `</ul>`;

        fs.writeFileSync(project_path + `/tempdata/htmllist/chapter${index}.html`, html);
        console.log(index);
    }
})();


