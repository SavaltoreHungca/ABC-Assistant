const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const comn = require('./comn');
const project_path = path.resolve(__dirname + '/../..');
const mixed_path = path.resolve(project_path + '/../../..');
const temps = {};
const essay = `

In a rare unammous ruling, the US Supreme Court has overturned the
corruption conviction of a former Virginia governor, Robert McDonnell. But it did
so while holding its nose at the ethics of his conduct, which included accepting
gifts such as a Rolex watch and a Ferrari automobile from a company seeking
access to government.
The high court's decision said the judge in Mr. McDonnell's trial failed to tell
a jury that it must look only at his "official acts," or the former governor's decisions
on "specific" and "unsettled" issues related to his duties.
Merely helping a gift-giver gain access to other officials, unless done with
clear intent to pressure those officials, is not corruption, the justices found.
The court did suggest that accepting favors in return for opening doors is
"distasteful" and "nasty." But under anti-bribery laws, proof must be made of
concrete benefits, such as approval of a contract or regulation. Simply arranging a
meeting, making a phone call, or hosting an event is not an "official act".
The court's ruling is legally sound in defining a kind of favoritism that is not
criminal. Elected leaders must be allowed to help supporters deal with
bureaucratic problems without fear of prosecution for bribery. "The basic compact
underlying representative government," wrote Chief Justice John Roberts for the
court, "assumes that public officials will hear from their constituents and act on
their concerns."
But the ruling reinforces the need for citizens and their elected representatives,
not the courts, to ensure equality of access to government. Officials must not be
allowed to play favorites in providing information or in arranging meetings
simply because an individual or group provides a campaign donation or a personal
gift. This type of integrity requires well-enforced laws in government transparency,
such as records of official meetings, rules on lobbying, and information about
each elected leader's source of wealth.
Favoritism in official access can fan public perceptions of corruption. But it is
not always corruption. Rather officials must avoid double standards, or different
types of access for average people and the wealthy. If connections can be
bought, a basic premise of democratic society - that all are equal in treatment by
government - is undermined. Good governance rests on an understanding of the
inherent worth of each individual.
The court's ruling is a step forward in the struggle against both corruption and
official favoritism.

`;

const _getWords = (s) => {
    try {
        let rlt = s.match(/\b\S+\b/g);
        ans = [];
        for (let w of rlt) {
            if (!w || w.trim() === '' || /\d/g.test(w)) {
                continue;
            } else if (w.indexOf('/') >= 0) {
                for (let i of w.split('/')) {
                    if (!i || i.trim() === '') {
                        continue;
                    }
                    ans.push(i.trim());
                }
            } else if (w.indexOf('—') >= 0) {
                for (let i of w.split('—')) {
                    if (!i || i.trim() === '') {
                        continue;
                    }
                    ans.push(i.trim());
                }
            } else if (w.indexOf('-') >= 0) {
                for (let i of w.split('-')) {
                    if (!i || i.trim() === '') {
                        continue;
                    }
                    ans.push(i.trim());
                }
            } else {
                ans.push(w.trim());
            }
        }
    } catch (e) { }
    return ans;
}

/**
 * 
 * @param {puppeteer.Page} page 
 * @param {*} w 
 */
const _getBingTran = async (page, w) => {
    let ans = {};

    let wordLibs = temps['word.json'];
    if (!wordLibs) {
        wordLibs = JSON.parse(fs.readFileSync(project_path + `/static_source/words/words.json`, { encoding: 'utf-8' }));
        temps['word.json'] = wordLibs;
    }
    try {
        if (wordLibs[w]) {
            ans['w'] = wordLibs[w].originalWord;
            ans['means'] = wordLibs[w].means;
            ans['variety'] = wordLibs[w].variety;
        } else {
            await page.goto(`https://cn.bing.com/dict/search?q=${w}`);
            ans['w'] = await page.$eval('#headword', e => e.innerText);
            ans['means'] = await page.$eval('.qdef ul', e => {
                let ans = {};
                for (let i = 0; i < e.children.length; i++) {
                    try {
                        let child = e.children[i];
                        ans[child.firstElementChild.innerText] = child.children[1].innerText;
                    } catch (e) { }
                }
                return ans;
            });
            ans['variety'] = await page.$eval('.hd_if', e => e.innerText);
        }
        return ans;
    } catch (e) { }
    return false;
}

const _getOxfordExplain = (w) => {
    let pathList = temps['oxford_pathlist'];
    if (!pathList) {
        pathList = comn.getAllFilesPath(project_path + '/static_source/oxford');
        temps['oxford_pathlist'] = pathList;
    }
    for (let i of pathList) {
        if (w === path.basename(i).replace('.json', '').trim()) {
            let obj = JSON.parse(fs.readFileSync(i, { encoding: 'utf-8' }));
            let ans = [obj[0]];
            if (Array.isArray(obj[1])) {
                for (let j of obj[1]) {
                    ans.push(j);
                }
            }
            return ans;
        }
    }
    return false;
}

(async () => {
    const browser = await puppeteer.launch({
        headless: true,
        'devtools': true, // 是否开启控制台
    });
    const page = (await browser.pages())[0];

    const words = _getWords(essay.toLowerCase());
    const wordMeansMap = {};
    const ans = [];
    for (let w of words) {
        if (wordMeansMap[w]) {
            ans.push(wordMeansMap[w]);
            continue;
        }
        let bingTran = await _getBingTran(page, w);
        if (bingTran) {
            bingTran.oxford = _getOxfordExplain(bingTran.w);
            if (!bingTran.oxford) {
                delete bingTran.oxford;
            }
            wordMeansMap[w] = bingTran;
            ans.push(wordMeansMap[w])
        }
    }

    fs.writeFileSync(project_path + '/tempdata/parsed_essay.json', JSON.stringify(ans, null, 2), { encoding: 'utf-8' });
    await browser.close();
})();