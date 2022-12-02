var express = require('express');
var puppeteer = require('puppeteer');
var app = express();
app.use(express.urlencoded())
app.use(express.json())
app.all('*', function (req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    res.header('Access-Control-Allow-Methods', '*');
    res.header('Content-Type', 'application/json;charset=utf-8');
    next();
});

process.on('uncaughtException', function (err) { 
    //打印出错误 
    console.log(err); 
    //打印出错误的调用栈方便调试 
    console.log(err.stack);
});

(async () => {
    const browser = await puppeteer.launch({
        headless: true,
        'devtools': false, // 是否开启控制台
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    let browser2;

//    browser2 = await puppeteer.launch({
//        headless: false,
//        'devtools': false, // 是否开启控制台
//        // 'executablePath': 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
//        args: [
//            "--no-sandbox",
//            "--disable-setuid-sandbox",
//            // '--load-extension=C:\\Users\\oem\\AppData\\Local\\Google\\Chrome\\User\ Data\\Default\\Extensions\\eimadpbcbfnmbkopoojfekhnkhdbieeh\\4.9.58_0',
//            // '--disable-extensions-except=C:\\Users\\oem\\AppData\\Local\\Google\\Chrome\\User\ Data\\Default\\Extensions\\eimadpbcbfnmbkopoojfekhnkhdbieeh\\4.9.58_0',
//        ],
//    });


    let page = (await browser.pages())[0];
    app.get('/', async function (req, res) {
        try {
            await page.bringToFront();
        } catch (e) {
            page = await browser.newPage();
        }


        let words = req.query['words'];
        if (!Array.isArray(words)) {
            words = [words];
        }
        let ans = [];



        let useyoudao = async (w) => {
            await page.goto(`https://dict.youdao.com/result?word=${w}&lang=en`);
            return {
                w: await page.$eval('.word-head .title', e => e.firstChild.textContent),
                means: await page.$eval('.basic', e => {
                    let ans = [];
                    for (let i = 0; i < e.children.length; i++) {
                        let child = e.children[i];
                        if (child.className.indexOf('word-exp') >= 0) {
                            ans.push({
                                pos: child.querySelector('.pos') ? child.querySelector('.pos').innerText : '',
                                tran: child.querySelector('.trans') ? child.querySelector('.trans').innerText : '',
                            });
                        }
                    }
                    return ans;
                }),
            };
        }

        let usebing = async (w) => {
            await page.goto(`https://cn.bing.com/dict/search?q=${w}`);
            return {
                w: await page.$eval('#headword', e => e.innerText),
                means: await page.$eval('.hd_area', e => {
                    let ans = [];
                    e = e.nextElementSibling;
                    for (let i = 0; i < e.children.length; i++) {
                        let child = e.children[i];
                        ans.push({
                            pos: child.querySelector('.pos').innerText,
                            tran: child.querySelector('.def').innerText,
                        });
                    }
                    return ans;
                }),
            };
        }


        for (let w of words) {
            try {
                try {
                    ans.push(await usebing(w));
                } catch (e) {
                    ans.push(await useyoudao(w));
                }
            } catch (e) {

            }
        }

        res.json(ans);
    });

    let transPage = await browser.newPage();
    app.get('/trans_sentence', async function (req, res) {
        try {
            await transPage.bringToFront();
        } catch (e) {
            transPage = await browser.newPage();
        }


        let sentence = req.query['sentence'];
        let ans = { trans: '' };



        let bingtranslator = async (sentence) => {
            if (!sentence || sentence.trim() === '') {
                return '';
            }
            let ans = { trans: '' };
            await transPage.goto(`https://cn.bing.com/translator/?h_text=msn_ctxt&setlang=zh-cn`);
            let previousValue = await transPage.$eval('#tta_output_ta', e => e.value);
            await transPage.$eval('#tta_input_ta', e => e.value = '');
            await transPage.$eval('#tta_input_ta', (e, v) => e.value = v, sentence);
            await transPage.type('#tta_input_ta', '.');

            let times = 0;
            while (true) {
                await transPage.waitForTimeout(500);
                ans.trans = await transPage.$eval('#tta_output_ta', e => e.value);
                if (await transPage.$eval('#tta_err', e => e.innerText) === '很抱歉，出现了问题。请尝试刷新页面') {
                    break;
                }
                if (ans.trans && ans.trans.trim() && ans.trans !== previousValue && !ans.trans.trim().endsWith('...')) {
                    break;
                } else if (times > 10) {
                    break;
                }
                times++;
            }
            if (!ans.trans) {
                ans.trans = await bingtranslator(sentence);
            }
            return ans.trans;
        }

        let googletranslator = async (sentence) => {
            // try {
            //     transPage.goto(`https://translate.google.cn/?sl=en&tl=zh-CN&op=translate&text=${encodeURIComponent(sentence)}`);

            //     let times = 0;
            //     while (true) {
            //         await transPage.waitForTimeout(500);
            //         try{
            //             ans.trans = await transPage.$eval('.J0lOec', e=> e.innerText);
            //         }catch(e){
            //             continue;
            //         }
            //         if (ans.trans && ans.trans.trim() && !ans.trans.trim().endsWith('...')) {
            //             break;
            //         } else if (times > 3) {
            //             break;
            //         }
            //         times++;
            //     }

            // } catch (e) { }
        }


        try {
            ans.trans = await bingtranslator(sentence);
        } catch (e) { }

        res.json(ans);
    });


    let tikPage = await browser.newPage();
    app.get('/tiktokcomments', async function (req, res) {
        let ans = [];
        try {
            await tikPage.bringToFront();
        } catch (e) {
            tikPage = await browser.newPage();
        }

        let nature = async () => {
            tikPage.goto("https://www.nature.com/news");
            await tikPage.waitForSelector('.c-card__copy');
            await tikPage.waitForTimeout(2000);
            try {
                ans = ans.concat(await tikPage.evaluate(() => {
                    let a = document.querySelectorAll('.c-card__copy');
                    let ans = [];
                    for (let i = 0; i < a.length; i++) {
                        let child = a[i];
                        let t = (s) => {
                            try {
                                let r = child.querySelector(s).innerText.trim();
                                if (r) {
                                    if (r.endsWith('.')) {
                                        return r + ' ';
                                    } else {
                                        return r + '. ';
                                    }
                                } else {
                                    return '';
                                }
                            } catch (e) {
                                return ''
                            }
                        }
                        ans.push(`${t('.c-card__article-type')}${t('.c-card__title')}${t('.c-card__standfirst')}`);
                    }
                    return ans;
                }));
            } catch (e) { }
        };

        let guardianView = async () => {
            await tikPage.goto("https://www.theguardian.com/us");
            let times = 0;
            let isok = false;
            while (true) {
                try {
                    isok = await tikPage.evaluate(() => {
                        return document.querySelectorAll('.fc-item__content ').length > 0;
                    });
                    if (isok) {
                        break;
                    }
                } catch (e) { }
                await tikPage.waitForTimeout(1000);
                if (times > 10) {
                    break;
                }
                times++;
            }
            if (isok) {
                ans = ans.concat(await tikPage.evaluate(() => {
                    let a = document.querySelectorAll('.fc-item__content ');
                    let ans = [];
                    for (let i = 0; i < a.length; i++) {
                        let child = a[i];
                        let t = (s) => {
                            try {
                                return child.querySelector(s).innerText.trim() ? child.querySelector(s).innerText.trim() + '. ' : '';
                            } catch (e) {
                                return ''
                            }
                        }
                        ans.push(`${t('.fc-item__kicker')}${t('.js-headline-text')}${t('.fc-item__standfirst')}`);
                    }
                    return ans;
                }));
            }
        }

        await nature();
//        await guardianView();

        res.json(ans);
    });


    app.get('/tiktokcomments2', async function (req, res) {
        let pages = await browser2.pages();
        let page = pages[pages.length - 1];
        let size = await page.evaluate(() => {
            return {
                width: window.outerWidth,
                height: window.outerHeight,
            };
        });
        await page.setViewport({
            width: parseInt(size.width),
            height: parseInt(size.height),
        });

        let ans = [];

        try {
            ans = ans.concat(await page.evaluate(() => {
                let a = document.querySelectorAll(
                    'div[data-testid="cellInnerDiv"]' +
                    ',div[data-testid="tweetText"]' +
                    ',div[data-testid="card.layoutLarge.detail"]' +
                    ',#react-root > div > div > div.css-1dbjc4n.r-18u37iz.r-13qz1uu.r-417010 > main > div > div > div > div.css-1dbjc4n.r-14lw9ot.r-jxzhtn.r-1ljd8xs.r-13l2t4g.r-1phboty.r-1jgb5lz.r-11wrixw.r-61z16t.r-1ye8kvj.r-13qz1uu.r-184en5c > div > div.css-1dbjc4n.r-ymttw5.r-1f1sjgu > div.css-901oao.r-1awozwy.r-18jsvk2.r-18u37iz.r-1qd0xha.r-1blvdjr.r-1vr29t4.r-vrz42v.r-bcqeeo.r-1h8ys4a.r-qvutc0' +
                    ',#react-root > div > div > div.css-1dbjc4n.r-18u37iz.r-13qz1uu.r-417010 > main > div > div > div > div.css-1dbjc4n.r-14lw9ot.r-jxzhtn.r-1ljd8xs.r-13l2t4g.r-1phboty.r-1jgb5lz.r-11wrixw.r-61z16t.r-1ye8kvj.r-13qz1uu.r-184en5c > div > div.css-1dbjc4n.r-ymttw5.r-1f1sjgu > div.css-1dbjc4n.r-1s2bzr4 > div > span' +
                    ''
                )
                let ans = [];
                for (let i = 0; i < a.length; i++) {
                    let child = a[i];
                    if (child.getAttribute('data-testid') === 'cellInnerDiv' && child.querySelector('div[dir="ltr"]')) {
                        child = child.querySelector('div[dir="ltr"]');
                    }
                    if (child.getAttribute('data-testid') === 'card.layoutLarge.detail') {
                        for (let j = 0; j < child.children.length; j++) {
                            try {
                                if (child.children[j].innerText.trim()) {
                                    ans.push(child.children[j].innerText.trim());
                                }
                            } catch (e) { }
                        }
                        continue;
                    }
                    try {
                        if (child.innerText.trim()) {
                            ans.push(child.innerText.trim());
                        }
                    } catch (e) { }
                }
                return ans;
            }));
        } catch (e) { }

        res.json(ans);
    });

    var server = app.listen(4033)
})();

