exports.paramlizeForPost = function paramlizeForPost(inputData, files) {
    const FormData = require('form-data');
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

exports.paramlizeForGet = function paramlizeForGet(data) {
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


exports.getQMarks = function (rowNumbers, qMarkNumbers) {
    let ans = '';
    for (let i = 0; i < rowNumbers; i++) {
        if (i !== 0) ans += ',';
        ans += '(';
        for (let j = 0; j < qMarkNumbers; j++) {
            if (j !== 0) ans += ',';
            ans += '?';
        }
        ans += ')';
    }
    return ans;
}

/**
   * 将集合分为多个组
   *
   * @param arrays     需要被分组的集合
   * @param eachLength 分的每组的大小
   * @return 分好组的集合
   */
exports.splitList = (arrays, eachLength) => {
    const result = [];
    const size = arrays.length;
    let start = 0;
    let end = 0;

    let flag = size - eachLength;

    for (; start < size; start += eachLength) {
        if (end > flag) {
            end = size;
        } else {
            end = start + eachLength;
        }
        const a = [];
        for (let i = start; i < end; i++) {
            a.push(arrays[i]);
        }
        result.push(a);
    }
    return result;
}

/**
 * 将集合分组，然后单独处理每个组
 * 这对于数据量很大的集合要进行数据库查询时，进行分批查询
 */
exports.splitProcess = (list, len, consumer) => {
    let splitList = (arrays, eachLength) => {
        const result = [];
        const size = arrays.length;
        let start = 0;
        let end = 0;

        let flag = size - eachLength;

        for (; start < size; start += eachLength) {
            if (end > flag) {
                end = size;
            } else {
                end = start + eachLength;
            }
            const a = [];
            for (let i = start; i < end; i++) {
                a.push(arrays[i]);
            }
            result.push(a);
        }
        return result;
    }

    const l = splitList(list, len);
    for (let i = 0; i < l.length; i++) {
        consumer(l[i]);
    }
}

/**
 * @param {String} recipient 收件人
 * @param {String} subject 发送的主题
 * @param {String} html 发送的html内容
 */
exports.sendMail = function (recipient, subject, html, configs) {
    const getMailServer = function () {
        return require('nodemailer').createTransport({
            service: 'smtp.163.com',
            host: "smtp.163.com",
            secureConnection: true,
            port: 465,
            auth: {
                user: configs.email.user,
                pass: configs.email.pass,
            }
        });
    }

    getMailServer().sendMail({
        from: configs.email.user,
        to: recipient,
        subject: subject,
        html: html

    }, function (error, response) {
        if (error) {
            console.log(error);
        }
        console.log('发送邮件成功, 邮件标题：' + subject);
    });
}

exports.sleep = function (interval) {
    return new Promise(resolve => {
        setTimeout(resolve, interval);
    })
};

exports.getBrowser = async function (headless) {
    const puppeteer = require('puppeteer');
    if (typeof headless === 'undefined') {
        headless = true;
    }
    const browser = await puppeteer.launch({
        'headless': headless,
        ignoreHTTPSErrors: true,
        'args': [
            '--disable-extensions',
            '--hide-scrollbars',
            '--disable-bundled-ppapi-flash',
            '--mute-audio',
            '--no-sandbox',
            '--disable-gpu',
            '--disable-web-security',
            '--disable-infobars',
            // '–disable-images',
            // "--proxy-server=" + configs.proxyServer,
        ],
        'ignoreDefaultArgs': ["--enable-automation"],
        'devtools': false,
        'dumpio': true,
    });


    // const page = await browser.newPage();
    // await page.setViewport({ width: 1280, height: 800 });
    // page.setDefaultNavigationTimeout(1000 * 1000);
    // await page.evaluateOnNewDocument('() =>{ Object.defineProperties(navigator,'
    //     + '{ webdriver:{ get: () => false } }) }');
    // await page.setUserAgent(configs.getUserAgents())
    // // await page.authenticate({ username: configs.proxyUser, password: configs.proxyPass });
    // page.goto("https://baidu.com");
    return browser;
}

exports.pageDefaultSet = async function (page) {
    page.setDefaultNavigationTimeout(1000 * 1000);
    await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 1 });

    await page.evaluateOnNewDocument('() =>{ Object.defineProperties(navigator,'
        + '{ webdriver:{ get: () => false } }) }');
    await page.setUserAgent(configs.getUserAgents());

    await page.evaluateOnNewDocument(() => {
        delete navigator.__proto__.webdriver;
        Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
        Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
        Object.defineProperty(navigator, 'platform', {
            get: () => "Linux armxxxxx",
            configurable: true
        });
        window.chrome = {
            app: {},
            runtime: {},
            getUserMedia: {}
        };
    });
}

/**
 * 记录 puppeteer 的所有请求
 */
exports.setupLoggingOfAllNetworkData = async function (page) {
    const cdpSession = await page.target().createCDPSession()
    await cdpSession.send('Network.enable')
    const cdpRequestDataRaw = {}
    const addCDPRequestDataListener = (eventName) => {
        cdpSession.on(eventName, request => {
            cdpRequestDataRaw[request.requestId] = cdpRequestDataRaw[request.requestId] || {}
            Object.assign(cdpRequestDataRaw[request.requestId], { [eventName]: request })
        })
    }
    addCDPRequestDataListener('Network.requestWillBeSent')
    addCDPRequestDataListener('Network.requestWillBeSentExtraInfo')
    addCDPRequestDataListener('Network.responseReceived')
    addCDPRequestDataListener('Network.responseReceivedExtraInfo')
    return cdpRequestDataRaw
}

exports.runmany = async function (call, maxTimes, interval) {
    const sleep = function (interval) {
        return new Promise(resolve => {
            setTimeout(resolve, interval);
        })
    }

    let keepRun = true;
    let count = 1;
    do {
        if (await call(count)) {
            keepRun = false;
        }

        await sleep(interval);

        if (count >= maxTimes) {
            keepRun = false;
        }
        count++;
    } while (keepRun);
}

exports.ioSocketServer = function (client) {
    const express = require('express');
    const app = express();
    const path = require('path');
    const server = require('http').createServer(app);
    const io = require('socket.io')(server);

    server.listen(3000, () => {
        console.log('Server listening at port %d', 3000);
    });

    app.use(express.static(path.join(__dirname, 'public')));

    io.on('connection', function (socket) {
        if (client) {
            client.instance = socket;
        }
        //断开事件
        socket.on('disconnect', function (data) {
            client.instance = null;
        });

        socket.on('test_email', () => {
            comon.sendMail(configs.receiver, '测试邮件', '测试邮件是否正常');
        })
    });
}

exports.getAllFilesPath = function getAllFilesPath(path) {
    const fs = require('fs');
    let fileList = [];
    function walk(path) {
        let dirList = fs.readdirSync(path);

        dirList.forEach(function (item) {
            if (fs.statSync(path + '/' + item).isFile()) {
                fileList.push(path + '/' + item);
            }
        });

        dirList.forEach(function (item) {
            if (fs.statSync(path + '/' + item).isDirectory()) {
                walk(path + '/' + item);
            }
        });
    }
    walk(path);
    return fileList;
}
