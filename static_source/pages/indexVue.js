window.vueapp = new Vue({
    el: '#app',
    data() {
        return {
            tempConfigs: null,
            currentPage: 1,
            currentEssay: '20171',
            oxfordTransMap: {},
            transQueue: [],
            kQueue: [],
            tiktokQueue: [],
            audio: new Audio(),
            playaudio: false,
            defaultshow: true,
            curw: '',
            articles: [],
        }
    },
    mounted() {
        (async () => {
            document.body.style.height = window.innerHeight + 'px';
            window.addEventListener('resize', () => {
                document.body.style.height = window.innerHeight + 'px';
            });

            axios.interceptors.response.use(function (response) {
                if (!response.data) {
                    toast('翻译失败！');
                    if (response.config.self_trace_id) {
                        document.getElementById(response.config.self_trace_id).innerText = 'lol翻译失败';
                    }
                } else if (response.config.url.startsWith('/trans_sentence')) {
                    if (!response.data.trans || response.data.trans.trim() === '') {
                        toast('翻译失败！');
                        if (response.config.self_trace_id) {
                            document.getElementById(response.config.self_trace_id).innerText = 'lol翻译失败';
                        }
                    }
                }
                return response;
            }, function (error) {
                if (error.config.url.startsWith('/get_single_word_data')
                    || error.config.url.startsWith('/trans_words')
                    || error.config.url.startsWith('/trans_sentence')) {
                    if (error.config.self_trace_id) {
                        document.getElementById(error.config.self_trace_id).innerText = 'lol翻译失败';
                    }
                    toast('翻译失败！');
                }
                return Promise.reject(error);
            });


            await this.loadPremiseData();


            this.changePage();

            document.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                document.execCommand('copy');
            });
            essay.addEventListener('touchstart', e => {
                essay._startX = e.touches[0].screenX;
                essay._startY = e.touches[0].screenY;
                essay._preTime = 0;
            });
            essay.addEventListener('touchmove', e => {
                if (e.timeStamp - essay._preTime > 100) {
                    let range = window.getSelection().getRangeAt(0);
                    let disX = e.touches[0].screenX - essay._startX;
                    let disY = e.touches[0].screenY - essay._startY;
                    if (Math.abs(disY) > Math.abs(disX)) {
                        try {
                            window.getSelection().removeAllRanges();
                        } catch (e) { }
                    } else {
                        if (disX > 0) {
                            range.setEnd(range.endContainer.nextElementSibling, 1);
                        } else if (disX < 0) {
                            range.setEnd(range.endContainer.previousSibling, 1);
                        }
                    }
                    essay._preTime = e.timeStamp;
                    essay._startX = e.touches[0].screenX;
                    essay._startY = e.touches[0].screenY;
                }
            });
        })();
    },
    methods: {
        toast(msg) {
            toast(msg);
        },

        async loadPremiseData() {
            let catolog = (await axios.get('/static/articles/catolog.json')).data;
            for (let i of catolog) {
                let passage = (await axios.get(`/static/articles/articles/${i}`)).data;
                this.articles.push(passage);
            }
            document.getElementById('wordListContainer').innerHTML = '加载完毕！点击切换到下一个单词开始';

            this.oxfordTransMap = (await axios.get('/static/words/out_all_sentence_tranlate.json')).data;

            let configs = await this.setgetTempConfigs();
            if (configs.preessay) {
                this.currentEssay = configs.preessay;
            }

            await DataSet.getWordsData();
        },

        async setgetTempConfigs(configs) {
            return new Promise((r, rj) => {
                if (!configs) {
                    if (this.tempConfigs) {
                        r(JSON.parse(JSON.stringify(this.tempConfigs)));
                        return;
                    }
                    axios.get("/get_temp_data?" + paramlizeForGet({ "k": "recite_words_temp_data" }))
                        .then(rsp => {
                            let data = JSON.parse(rsp.data.recite_words_temp_data || '{}');
                            this.tempConfigs = JSON.parse(JSON.stringify(data));
                            r(data);
                        })
                        .catch(e => {
                            defaultCatch(e);
                            rj();
                        });
                } else {
                    this.setgetTempConfigs()
                        .then(data => {
                            for (let i in configs) {
                                data[i] = configs[i];
                            }

                            if (JSON.stringify(data) === JSON.stringify(this.tempConfigs)) {
                                r();
                                return;
                            }

                            axios.get("/save_temp_data?" + paramlizeForGet({ k: "recite_words_temp_data", v: JSON.stringify(data) }))
                                .then(rsp => r())
                                .catch(e => rj())
                        })
                        .catch(e => rj());
                }
            });
        },

        async getEssay() {
            let e;
            try {
                e = (await axios.get(`/static/articles/articles/${this.currentEssay}`)).data
            } catch (e) { }
            if (!e) {
                e = '错误的文章';
            }
            return e;
        },

        getcontent(arra) {
            let rlt = '';
            arra.forEach(i => {
                rlt += `<span class="w" onclick="_sel_text(this)" >${i}</span> `;
            });
            return rlt.substring(0, rlt.length - 1);
        },

        doubleLang() {
            let pretop = essay.scrollTop;
            let h = 0;
            let curview = null;
            let needp = 0;
            for (let i = 0, len = essay.children.length; i < len; i++) {
                let child = essay.children[i];
                if (h >= pretop) {
                    // if (i > 0) {
                    //     curview = essay.children[i - 1];
                    // } else {
                    //     curview = child;
                    // }
                    curview = child;
                    break;
                }
                h += child.offsetHeight;
            }
            curview = curview.querySelector('.transdiv');
            let eles = essay.querySelectorAll('.transdiv');
            let queryit = false;
            let enough = false;
            for (let i = 0, len = eles.length; i < len; i++) {
                let e = eles[i];
                if (curview === e) {
                    enough = true;
                }
                if (e.style.display === 'none') {
                    e.style.display = '';
                    if (!enough) needp += e.offsetHeight;
                    queryit = true;
                } else {
                    if (!enough) needp -= e.offsetHeight;
                    e.style.display = 'none';
                }
            }
            essay.scrollTop = pretop + needp;
            if (queryit) {
                let transQueue = this.transQueue;
                this.transQueue = [];
                toast('开始翻译');
                (async () => {
                    for (let i of transQueue) {
                        try { await i(); } catch (e) { }
                    }
                    toast('翻译结束');
                })();
            }
        },

        collectSen() {
            let w = window.getSelection().toString();
            if (!w || w.trim() === '') {
                return;
            }
            w = w.trim();

            try {
                window.getSelection().removeAllRanges();
            } catch (e) { }

            axios.get('/record_sentence?' + paramlizeForGet({
                title: this.currentEssay,
                word: w.split(/\s+/g).join(' '),
            }));
            toast('已收藏');
        },

        async changePage(upOrDown) {
            let shorsenlen = 6;

            this.transQueue = [];
            let passage = await this.getEssay();
            essay.style.visibility = 'hidden';
            essay.innerHTML = '';
            essay.scrollTop = 0;

            let listtemp = passage.split(/\./g).filter(i => i && i.trim());
            let list = [''];
            let found = false;
            for (let i = 0, len = listtemp.length; i < len; i++) {
                let count = 0;
                count += listtemp[i].length - listtemp[i].replace(/"|“|”/g, '').length;
                if (found) {
                    list[list.length - 1] = list[list.length - 1] + '.' + listtemp[i];
                    found = false;
                } else {
                    list.push(listtemp[i]);
                }
                if (count % 2 !== 0) {
                    found = true;
                }
            }


            listtemp = list.filter(i => i && i.trim());
            list = [''];
            for (let i = 0, len = listtemp.length; i < len; i++) {
                if (listtemp[i].split(/\s+/g).filter(i => i.trim()).length <= shorsenlen) {
                    let j = i;
                    while (true) {
                        if (listtemp[j].split(/\s+/g).filter(i => i.trim()).length <= shorsenlen) {
                            if (list.length === 1 && list[0] === '') {
                                list[list.length - 1] = list[list.length - 1] + listtemp[j];
                            } else {
                                list[list.length - 1] = list[list.length - 1] + '.' + listtemp[j];
                            }
                            i++;
                            j++;
                        } else {
                            list[list.length - 1] = list[list.length - 1] + '.' + listtemp[j];
                            break;
                        }
                        if (j >= listtemp.length) {
                            break;
                        }
                    }
                } else if (
                    (
                        /[0-9]/.test(list[list.length - 1][list[list.length - 1].length - 1])
                        && /[0-9]/.test(listtemp[i][0])
                    )
                ) {
                    list[list.length - 1] = list[list.length - 1] + '.' + listtemp[i];
                } else {
                    list.push(listtemp[i]);
                }
            }

            list.forEach(i => {
                if (!i.trim()) {
                    return;
                }

                let words = i.split(/\s+/g);
                let div = document.createElement('div');
                let worddiv = document.createElement('div');
                let transdiv = document.createElement('div');
                transdiv.classList.add('transdiv');
                transdiv.style.display = 'none';
                worddiv.innerHTML = this.getcontent(words) + '.';
                div.appendChild(worddiv);
                div.appendChild(transdiv);
                div.appendChild(document.createElement('br'))
                essay.appendChild(div);

                let transit = async () => {
                    await transToIt(words.join(' '), transdiv);
                }

                let trspan = document.createElement('span');
                trspan.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-globe"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>`;
                worddiv.insertBefore(trspan, worddiv.firstElementChild);
                trspan.onclick = async () => {
                    transdiv.style.display = '';
                    await transit();
                }

                this.transQueue.push(async () => {
                    await transit();
                });
            });

            let d = document.createElement('div');
            d.style.cssText = "height: 70vh;"
            essay.appendChild(d);

            d = document.createElement('div');
            d.innerText = 'BACK TO TOP';
            d.style.cssText = "text-align: center;";
            d.onclick = () => {
                essay.scrollTop = 0;
            }
            essay.appendChild(d);



            essay.style.visibility = '';
            this.setgetTempConfigs({
                preessay: this.currentEssay,
            })
        },

        async showQueriedWords() {
            if (id('#ci_contain').style.display === 'none') {
                id('#ci_contain').style.display = 'flex';
                toast('获取中');


                id('#ci_danci').onclick = async () => {
                    let list = (await axios.get('/record_word?' + paramlizeForGet({ title: this.currentEssay }))).data;

                    let h = ``;

                    h += `<ul style="display: flex;">`;
                    list.forEach(i => {
                        h += `<li onclick="vueapp.showWordMeans(\`${i}\`, null, true)" style="margin-left: 30px;">${i}</li>`;
                    });
                    h += `</ul>`;

                    id('#ci_contain_list').innerHTML = h;
                }

                id('#ci_juzi').onclick = async () => {
                    let sentencelist = (await axios.get('/record_sentence?' + paramlizeForGet({ title: this.currentEssay }))).data;

                    let h2 = `<ul style="">`;
                    sentencelist.forEach(i => {
                        let words = i.split(/\s+/g);
                        let uid = uuid();
                        h2 += `<li style="margin: 30px 0; ">
                            <span onclick="transfollow(this)">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-globe"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
                            </span>
                            <span>${this.getcontent(words)}</span>
                            <div class="ktrans"></div>
                        </li>`;
                    });
                    h2 += `</ul>`;

                    id('#ci_contain_list').innerHTML = h2;
                }

                await id('#ci_danci').onclick();
            } else {
                id('#ci_contain').style.display = 'none';
            }
        },

        async changeEssay() {
            this.currentPage = 1;

            let essaylist = `<ul style="display: flex; flex-wrap: wrap;">`;
            let passages = (await axios.get('/static/articles/catolog.json')).data;
            for (let t of passages) {
                essaylist += `
                        <li class="chi" 
                            style="${t === this.currentEssay ? 'background: rgb(214,214,214)' : ''}"
                            onclick="vueapp.currentEssay = \`${t}\`;  vueapp.changePage(); funyContainer.close();">
                            ${t}
                        </li>
                    `;
            }
            essaylist += `</ul>`;

            let html = `
                <div style="display: flex">
                    <input style="flex-grow: 1; max-width: calc(50% - 20px);" value="${vueapp.currentEssay}" onchange=""/>
                    <button style="width: 50%; flex-shrink: 0;" onclick="vueapp.currentEssay = this.previousElementSibling.value; vueapp.changePage(); funyContainer.close();">
                        ok 共 ${passages.length} 篇
                    </button>
                </div>
                ${essaylist}
            `;
            fullPopup(html, 'funyContainer');
        },

        async tiktokcomments() {
            let con = id('#twittercon');

            if (id('#twittercon').style.display === 'none') {
                id('#twittercon').style.display = 'flex';
            } else {
                id('#twittercon').style.display = 'none';
            }

            let refreshcomments = async (container, args) => {
                con.parentElement.scrollTop = 0;
                let list;
                try {
                    list = (await axios.get('/tiktokcomments?' + paramlizeForGet(args || {}))).data;
                } catch (e) {
                    toast('获取失败！');
                }
                this.tiktokQueue = [];
                container.innerHTML = '';
                let html = '';
                let stupid = [];
                list.forEach(i => {
                    let id = uuid();
                    let sentence = '';
                    let splits = i.split(/\s+/g);
                    let spid = uuid();
                    for (let i = 0, len = splits.length; i < len; i++) {
                        let w = splits[i].replace(/\`/g, ' ');
                        sentence += `<span onclick="vueapp.showWordMeans(\`${w}\`, null, true)">${splits[i]}</span> `;
                    }
                    html += `<li style="margin-bottom: 20px;">
                            <div><span id="${spid}">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-globe"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
                            </span>${sentence}</div>
                            <div id="${id}"></div>
                        </li>
                        <li style=" border-bottom: 1px solid black;     margin-bottom: 15px;"></li>
                    `

                    stupid.push({
                        id: spid,
                        sen: i,
                        tid: id,
                    });

                    this.tiktokQueue.push(async () => {
                        await transToIt(i, document.getElementById(id));
                    });
                });
                container.innerHTML = html;

                stupid.forEach(i => {
                    document.getElementById(i.id).onclick = async () => {
                        await transToIt(i.sen, document.getElementById(i.tid));
                    }
                })
            }
            let comments = con.querySelector('#tik_comments');
            con.querySelector('#tik_tarns').onclick = async () => {
                let transQueue = this.tiktokQueue;
                this.tiktokQueue = [];
                toast('开始翻译');
                (async () => {
                    for (let i of transQueue) {
                        try { await i(); } catch (e) { }
                    }
                    toast('翻译结束');
                })();
            }
            con.querySelector('#tik_refresh').onclick = async () => {
                toast('获取新闻中');
                refreshcomments(comments);
            }
            con.querySelector('#tik_refresh_twitter').onclick = async () => {
                toast('获取推特消息中');
                refreshcomments(comments, { twitter: '1' });
            }
        },

        async fast_seek() {
            if (id('#fast_seekcc').style.display === 'none') {
                id('#fast_seekcc').style.display = 'flex';
            } else {
                id('#fast_seekcc').style.display = 'none';
            }

        },

        async showWordMeans(w, container, notrecord) {
            toast('查询中');

            if (w && w.trim()) {
                w = w.trim();
            } else {
                w = window.getSelection().toString();
                if (!w || w.trim() === '') {
                    return;
                }
                w = w.trim();
            }

            if (!w) {
                return;
            }

            let splits = w.split(/\s+/g);

            if (splits.length === 1 && !notrecord) {
                axios.get('/record_word?' + paramlizeForGet({
                    title: this.currentEssay,
                    word: w
                }));
            }


            let words_data = await DataSet.getWordsData();
            let item = null;
            if (w && words_data[w]) {
                item = {
                    'w': w,
                    'originalWord': words_data[w]['originalWord'],
                    'variety': words_data[w]['variety'],
                    "means": words_data[w]['means'],
                }
            } else {
                let setFailed = () => {
                    item = {
                        'w': '查找失败',
                        'originalWord': '查找失败',
                        'variety': '',
                        "means": {},
                    }
                }
                try {
                    item = (await axios.get('/get_single_word_data?' + paramlizeForGet({ word: w }))).data;
                    if (!item || !item.originalWord) {
                        setFailed();
                    }
                } catch (e) {
                    setFailed();
                }
            }
            let trans;

            if (splits.length > 1) {
                splits = splits.filter(i => i);
                trans = await transToIt(splits.join(' '));
            }

            let similarwordsinpup = uuid();
            let html = `
                <div style="padding-left: 10px; padding-right: 10px; ">
                <div>${await this.getSentences(w, item.variety + ' ' + item.originalWord)}</div>
                <h3>
                    <span>${item.originalWord}</span>
                    <span onclick="vueapp.playw(\`${item.originalWord}\`, true)">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-headphones"><path d="M3 18v-6a9 9 0 0 1 18 0v6"></path><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"></path></svg>
                    </span>
                </h3>
                <div id="${similarwordsinpup}"></div>
                <h3>${item.variety}</h3>
                <div>${trans ? '直接翻译：' + trans.trans : ''}</div>
                <ul>
            `;
            for (let pos of Object.keys(item.means)) {
                html += `<li>
                    <span>${pos}</span>
                    <span>${item.means[pos]}</span>
                </li>`;
            }
            html += `</ul><ul>`;

            try {
                let oxforddata = await axios.get(`/static/oxford/${item.originalWord}.json`); oxforddata = oxforddata.data;
                let oxfordArr = [oxforddata[0]];
                (oxforddata[1] || []).forEach(i => oxfordArr.push(i));

                html += `<ul>`;
                for (let oxford of oxfordArr || []) {
                    html += `<li>
                        <h4 style="margin: 0; margin-top: 10px;" onclick="cheapFolder(this)">牛津解释：${oxford.name}： ${oxford.pos}</h4>
                        <div style="display: none;"></div>
                        <div style="display: none;">${oxford.content}</div>
                        <img  style="display: none;"  onerror="genOxfordPage(this)" src=""/>
                    </li>`;
                }
                html += `</ul>`;
            } catch (e) { }

            // for (let oxford of item.oxford || []) {
            //     html += `<li>
            //         <h4 style="margin: 0; margin-top: 10px;" onclick="cheapFolder(this)">牛津解释：${oxford.name}： ${oxford.pos}</h4>
            //         <div style="display: none;"></div>
            //         <div style="display: none;">${oxford.content}</div>
            //         <img  style="display: none;"  onerror="genOxfordPage(this)" src=""/>
            //     </li>`;
            // }

            html += `</ul>
                </div>`;

            if (container) {
                container.innerHTML = html;
            } else {
                html += `
                    <div style="position: absolute; right: 0; bottom: 72px; width: 38px; user-select: none;">
                        <span onclick="upOrDown(this.parentElement.parentElement.parentElement, 'up', 1)">⬆️</span>
                        <span onclick="upOrDown(this.parentElement.parentElement.parentElement, 'down', 1)">⬇️</span>
                    </div>
                `;
                fullPopup(html);
            }


            get_similars(item.w, document.getElementById(similarwordsinpup));

            try {
                window.getSelection().removeAllRanges();
            } catch (e) { }
        },

        async getwords() {
            let allwords = (await axios.get('/record_word')).data;
            let readCounts = (await axios.get('/word_read_count')).data;
            let words = [];
            Object.keys(allwords).forEach(i => {
                allwords[i].forEach(j => {
                    if (words.indexOf(j) < 0) {
                        words.push({
                            w: j,
                            c: readCounts[j] || 0,
                        })
                    }
                })
            });
            return words;
        },

        async deletew() {
            if (this.curw.trim()) {
                await axios.get('/record_word?' + paramlizeForGet({
                    word: this.curw,
                    delete: '1'
                }));
            }
            this.nextWord();
        },

        async nextWord() {
            let allwords = await this.getwords();
            let groups = {};
            let min = Number.MAX_SAFE_INTEGER;
            let max = 0;
            allwords.forEach(i => {
                if (!groups[i.c]) {
                    groups[i.c] = [];
                }
                groups[i.c].push(i)
                min = Math.min(min, i.c);
                max = Math.max(max, i.c);
            });
            let words = groups[min];
            let indx = Math.floor((Math.random() * 1000) % words.length);
            document.getElementById('wordListContainer').innerHTML = `
                <div style="position: absolute; right: 0; bottom: 72px; width: 38px; user-select: none;">
                    <span onclick="upOrDown(this.parentElement.parentElement, 'up', 1)">⬆️</span>
                    <span onclick="upOrDown(this.parentElement.parentElement, 'down', 1)">⬇️</span>
                </div>
                <div>max: ${max} min:${min} total: ${allwords.length}</div>
                <div>left: ${words.length}</div>
                <div id="folll" style="display: ${this.defaultshow ? '' : 'none'}">
                    <h1>${words[indx].w}</h1>
                    <div id="means"></div>
                </div>
            `
            await this.showWordMeans(words[indx].w, document.getElementById('means'), true);
            await axios.get('/word_read_count?' + paramlizeForGet({
                word: words[indx].w,
                count: 1
            }));

            this.curw = words[indx].w;
            this, this.playw(words[indx].w)
        },


        async playw(w, mustPlay) {
            if (this.playaudio || mustPlay) {
                this.audio.autoplay = true;
                this.audio.src = `/get_audio?word=${w}`
                this.audio.play();
            }
        },

        async getSentences(w, variety) {
            let getVarieties = (s) => {
                if (!s || !s.trim()) return new Set();
                let b = /[a-zA-Z]+/g;
                let caps;
                let se = new Set();
                while (true) {
                    caps = b.exec(s);
                    if (!caps) break;
                    if (caps[0].length < 2) {
                        continue;
                    }
                    se.add(caps[0]);
                }
                return se;
            }

            let varieties = getVarieties(variety);
            varieties.add(w);

            let getSenList = (varieties, regx) => {
                let added = [];
                let senlist = [];
                this.articles.forEach(i => {
                    for (let w of varieties) {
                        let ww = '';
                        for (let k = 0, len = w.length; k < len; k++) {
                            if (/[a-zA-Z]/.test(w[k])) {
                                ww += w[k];
                            } else {
                                ww += '\\' + w[k];
                            }
                        }

                        let caps = new RegExp(regx(ww)).exec(i);
                        if (caps) {
                            let sp = caps.index;
                            let ep = sp + w.length;
                            while (sp > 0 && i[sp] !== '.') {
                                sp--;
                            }
                            while (ep < i.length && i[ep] !== '.') {
                                ep++;
                            }
                            if (sp !== 0) sp++;
                            if (ep !== i.length) ep++;

                            let s = i.substring(sp, ep);
                            if (added.indexOf(s) < 0) {
                                added.push(s);
                                let rs = '';
                                let splits = s.split(/\s+/g);
                                for (let m = 0; m < splits.length; m++) {
                                    let child = splits[m];
                                    if (child.split('').filter(i => /[a-zA-Z]/.test(i)).join('') === w.split('').filter(i => /[a-zA-Z]/.test(i)).join('')) {
                                        rs += `<span><u>${child}</u></span> `;
                                    } else {
                                        rs += `<span onclick="vueapp.showWordMeans(\`${child}\`, null, true)">${child}</span> `;
                                    }
                                }
                                senlist.push(rs);
                            }
                        }
                    }
                });
                return senlist;
            }

            let senlist = getSenList(varieties, (ww) => `[ |\\b]${ww}[\\b| ]`);
            if (senlist.length === 0) {
                senlist = getSenList(varieties, (ww) => `${ww}`);
            }

            let html = `<ul>`;
            for (let i of senlist) {
                html += `<li style="margin-left: 48px; list-style: square;">
                        <span onclick="transfollow(this)">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-globe"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
                        </span>
                        <span>${i}</span>
                        <span></span>
                    </li>`;
            }
            html += '</ul>'
            return html;
        },

    },
});