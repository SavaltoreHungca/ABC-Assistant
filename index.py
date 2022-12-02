webview_server_ip = 'http://192.168.0.181:8112/spider'
# webview_server_ip = ''

import requests
from flask import Flask, request, jsonify, make_response, send_from_directory, send_file
import os
from threading import RLock
from collections import OrderedDict
import json
import sys


# 工具函数 ============================

def str_date_subtract(a, b):
    return parse_str_date(a).timestamp() - parse_str_date(b).timestamp()


def parse_str_date(d):
    from datetime import datetime
    for formation in ['%Y-%m-%d %H:%M:%S', '%Y-%m-%d']:
        try:
            return datetime.strptime(d, formation)
        except Exception as e:
            pass


def split_list(iterable, each_length):
    arrays = []
    for i in iterable:
        arrays.append(i)

    result = []
    size = len(arrays)
    start = 0
    end = 0
    flag = size - each_length

    while start < size:
        if end > flag:
            end = size
        else:
            end = start + each_length
        a = []
        for i in range(start, end):
            a.append(arrays[i])
        result.append(a)

        start += each_length
    return result


def list_all_files(rootdir, contain_sub_dir=False):
    import os
    _files = []
    lists = os.listdir(rootdir)
    for i in range(0, len(lists)):
        path = os.path.join(rootdir, lists[i])
        if os.path.isdir(path) and contain_sub_dir:
            _files.append({
                "name": path.replace(os.path.dirname(path) + os.path.sep, ""),
                "path": path,
                "isFile": False,
                "children": list_all_files(path, contain_sub_dir=contain_sub_dir)
            })
        if os.path.isfile(path):
            _files.append({
                "name": path.replace(os.path.dirname(path) + os.path.sep, ""),
                "path": path,
                "isFile": True,
            })
    return _files


def list_all_file(rootdir, contain_sub_dir=True):
    import os
    _files = []
    lists = os.listdir(rootdir)
    for i in range(0, len(lists)):
        path = os.path.join(rootdir, lists[i])
        if os.path.isdir(path) and contain_sub_dir:
            _files.extend(list_all_file(path))
        if os.path.isfile(path):
            _files.append(path)
    return _files


def asyncexec(f, args, kwargs):
    from threading import Thread
    thr = Thread(target=f, args=args, kwargs=kwargs)
    thr.start()


class QMarkValue:
    def __init__(self, qMarkNumbers) -> None:
        self.qMarkNumbers = qMarkNumbers
        self.curRow = 1
        self.curQ = 1

    def next(self, value):
        v = value()
        if self.curQ == 1 and self.curRow == 1:
            ans = '(' + v
        elif self.curQ == 1:
            ans = ', (' + v
        elif self.curQ == self.qMarkNumbers:
            ans = ',' + v + ')'
        else:
            ans = ',' + v
        self.curQ += 1
        if self.curQ > self.qMarkNumbers:
            self.curQ = 1
            self.curRow += 1
        return ans


def Levenshtein_Distance(str1, str2):
    """
    计算字符串 str1 和 str2 的编辑距离
    :param str1
    :param str2
    :return:
    """
    matrix = [[i + j for j in range(len(str2) + 1)] for i in range(len(str1) + 1)]

    for i in range(1, len(str1) + 1):
        for j in range(1, len(str2) + 1):
            if (str1[i - 1] == str2[j - 1]):
                d = 0
            else:
                d = 1

            matrix[i][j] = min(matrix[i - 1][j] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j - 1] + d)

    return matrix[len(str1)][len(str2)]


def dateMinNums(startTime, endTime):
    import datetime
    '''计算两个时间点之间的分钟数'''
    # 处理格式,加上秒位
    # 计算分钟数
    startTime2 = startTime
    endTime2 = endTime
    seconds = (endTime2 - startTime2).seconds
    # 来获取时间差中的秒数。注意，seconds获得的秒只是时间差中的小时、分钟和秒部分的和，并没有包含时间差的天数（既是两个时间点不是同一天，失效）
    total_seconds = (endTime2 - startTime2).total_seconds()
    # 来获取准确的时间差，并将时间差转换为秒
    mins = total_seconds / 60
    return int(mins)


def _15_play_music():
    import datetime
    import time
    import pygame
    pygame.mixer.init()
    previous_date = datetime.datetime.now()
    while True:
        n = datetime.datetime.now()
        miniu = dateMinNums(previous_date, n)
        if miniu >= 55:
            pygame.mixer.music.load("C:\\Users\\oem\\Music\\飞鸟和蝉.mp3")
            pygame.mixer.music.play()

            music_start_time = datetime.datetime.now()
            while dateMinNums(music_start_time, datetime.datetime.now()) <= 5:
                time.sleep(1)

            previous_date = datetime.datetime.now()
        time.sleep(1)


def get_dic_v(dic_obj, k, default_v):
    if not dic_obj.get(k):
        dic_obj[k] = default_v
    return dic_obj[k]


PROJECT_PATH = os.path.split(os.path.realpath(__file__))[0]
words_path = PROJECT_PATH + '/static_source/words'

user_home = os.path.expanduser('~')
tempdata_dir = os.path.abspath(user_home + '/hgctempdata')
audios_dir = f'{tempdata_dir}/audios/'
if not os.path.exists(tempdata_dir):
    os.makedirs(tempdata_dir)
if not os.path.exists(audios_dir):
    os.makedirs(audios_dir)
tem_datas = dict()


def ok(data=None):
    if data is None:
        res = make_response(jsonify({
            "status": "ok"
        }))
        res.headers['Content-Type'] = 'application/json; charset=utf-8'
    elif type(data) == str:
        res = make_response(data)
    else:
        res = make_response(jsonify(data))
        res.headers['Content-Type'] = 'application/json; charset=utf-8'
    return res


# 正文部分 =======================


def setget_temp_data(k, data=None, to_save=False, d_type=None, is_audio=False):
    if not k or not k.strip():
        return None

    if is_audio:
        lock = get_dic_v(tem_datas, '__audio_lock', RLock())
        lock.acquire(blocking=True)
        try:
            k = ''.join(filter(lambda a: str.isalpha(a) or a == '-' or a == ' ', k)).strip()
            p = audios_dir

            if k and not os.path.exists(p + k):
                rsp = requests.get(f'https://dict.youdao.com/dictvoice?type=1&audio={k}', timeout=3)
                with open(p + k, 'wb') as f:
                    f.write(rsp.content)
                return rsp.content
            with open(p + k, 'rb') as f:
                return f.read()
        finally:
            lock.release()

    if d_type is None:
        d_type = {}
    k_lock = k + '_lock'
    lock = tem_datas.get(k_lock)
    if not lock:
        lock = RLock()
        tem_datas[k_lock] = lock
    p = tempdata_dir + '/' + k + '.json'
    try:
        lock.acquire(blocking=True)
        kvmap = tem_datas.get(k)
        if not kvmap:
            try:
                with open(p, encoding='utf-8') as f:
                    kvmap = json.loads(f.read())
            except Exception as e:
                kvmap = d_type
            tem_datas[k] = kvmap
        if to_save:
            with open(p, 'wb') as f:
                if data:
                    f.write(json.dumps(data).encode('utf-8'))
                    tem_datas[k] = dict(data)
                else:
                    f.write(json.dumps(kvmap).encode('utf-8'))
        return kvmap
    finally:
        lock.release()


# def setget_temp_data(k, to_save=False, d_type=None, is_audio=False):
# try:
#     temp_data_lock.acquire(blocking=True)
#
#     if is_audio:
#         rlt = requests.post(temp_server_ip, data={
#             'k': k,
#             'is_audio': 'True'
#         })
#         return rlt.content
#
#     if d_type is None:
#         d_type = {}
#     data = tem_datas.get(k)
#
#     if to_save and data:
#         requests.post(temp_server_ip, data={
#             'k': k,
#             'to_save': 'True',
#             'd_type': json.dumps(d_type),
#             'data': json.dumps(data)
#         }, verify=False)
#         return
#
#     if not data:
#         rlt = requests.post(temp_server_ip, data={
#             'k': k,
#             'd_type': json.dumps(d_type),
#         }, verify=False)
#         data = json.loads(rlt.text)
#         tem_datas[k] = data
# except Exception as e:
#     pass
# finally:
#     temp_data_lock.release()
# return data


def get_verb_list():
    words_data = get_words_data()
    p = words_path + '/oxford_verb/oxford_verbs.json'
    if not tem_datas.get('words_verbs'):
        with open(p, encoding='utf-8') as f:
            words_verbs = json.loads(f.read())
            ans = OrderedDict()
            words = []
            for i in words_verbs.keys():
                words.append(i)
            from functools import cmp_to_key

            def _sort_manner(b, a):
                ad = words_data[a]
                bd = words_data[b]
                if ad['paperCount'] != bd['paperCount']:
                    return ad['paperCount'] - bd['paperCount']
                else:
                    return ad['useCount'] - bd['useCount']

            words.sort(key=cmp_to_key(_sort_manner))

            for i in words:
                ans[i] = words_verbs[i]

            tem_datas['words_verbs'] = ans
    return tem_datas['words_verbs']


# 已经去除重复词，只留下 originalWord
def get_words_data():
    p = words_path + '/words.json'
    if not tem_datas.get('words_json_data'):
        with open(p, encoding='utf-8') as f:
            ans = dict()
            words_json_data = json.loads(f.read())
            for w in words_json_data.keys():
                obj = words_json_data[w]
                if obj and obj.get('originalWord'):
                    fakew = w
                    w = obj.get('originalWord')
                    if ans.get(w):
                        ansobj = ans[w]
                        ansobj['useCount'] += obj['useCount']
                        ansobj['paperCount'] = max(ansobj['paperCount'], obj['paperCount'])
                    else:
                        ans[fakew] = obj
                        ans[w] = obj
            tem_datas['words_json_data'] = ans
    return tem_datas['words_json_data']


def trans_by_puppeeter(sentence):
    rsp = requests.get(
        f"http://localhost:4033/trans_sentence?sentence={sentence}", timeout=20)
    return rsp.json()['trans']


def trans_by_webview(sentence):
    import datetime
    sentence = sentence.replace("'", "\\'", sys.maxsize)

    def execute_spide():
        f = """
            function () {
                if (count === 0) {
                    document.getElementById('tta_output_ta').value = '';
                }
                document.getElementById('tta_input_ta').value = '""" + sentence + """' + ((count % 2 > 0) ? ' ' : '');
                document.getElementById('tta_input_ta').click();
                var rlt = document.getElementById('tta_output_ta').value;
                if (rlt) {
                    rlt = rlt.trim();
                    if (rlt && rlt !== '...' && rlt.substring(rlt.length - 3) !== '...') {
                        return rlt;
                    };
                };
            }
            """

        previous_date = tem_datas.get("__previous_trans_sen_time")
        needRefresh = ''
        n = datetime.datetime.now()
        if not previous_date or dateMinNums(previous_date, n) >= 5:
            needRefresh = '1'
        tem_datas["__previous_trans_sen_time"] = datetime.datetime.now()

        if tem_datas.get("__previous_trans_sen") == sentence:
            needRefresh = '1'
        tem_datas["__previous_trans_sen"] = sentence

        return requests.post(webview_server_ip, data=json.dumps({
            "pageId": "trans_sentence_page",
            "requestUrl": "http://cn.bing.com/translator?ref=TThis&text=&from=en&to=zh-Hans",
            "needRefresh": needRefresh,
            "finishLoadTag": "#tta_input_ta",
            "function": f,
            "retryTimes": '3',
            "asyncWay": "1",
        }), timeout=20)

    rsp = execute_spide()
    if rsp.status_code == 500:
        rsp = execute_spide()
    if rsp.status_code == 500:
        return ''
    return rsp.text


def trans_sentence(sentence):
    try:
        words_temp = setget_temp_data('trans_sentence')
        ans = {}
        need_write = False

        if sentence == '' or sentence.strip() == '':
            ans['trans'] = ''
        elif words_temp.get(sentence) and words_temp.get(sentence) and words_temp.get(
                sentence).strip() and words_temp.get(sentence).strip() != '...':
            ans['trans'] = words_temp[sentence]
        else:
            try:
                if webview_server_ip:
                    trans = trans_by_webview(sentence)
                else:
                    trans = trans_by_puppeeter(sentence)
                words_temp[sentence] = trans
                need_write = True
                ans['trans'] = trans
            except Exception as e:
                ans['trans'] = ''
        if need_write:
            setget_temp_data('trans_sentence', to_save=True)
        return ans
    finally:
        # accessLock.release()
        pass


def trans_w_by_puppeeter(w):
    rsp = requests.get(
        f"http://localhost:4033?words={w}", timeout=20)
    return rsp.json()[0]


def trans_w_by_webview(w):
    f = """
    function () {
        var ans = {
            means: []
        };
        ans.w = document.getElementById('headword').innerText;
        var e = document.querySelector('.hd_area');
        e = e.nextElementSibling;
        for (var i = 0, len = e.children.length; i < len; i++) {
            var child = e.children[i];
            ans.means.push({
                pos: child.querySelector('.pos').innerText,
                tran: child.querySelector('.def').innerText,
            });
        };
        return JSON.stringify(ans);
    }
    """
    rsp = requests.post(webview_server_ip, data=json.dumps({
        "pageId": "trans_word_page",
        "requestUrl": "https://cn.bing.com/dict/search?q=" + w,
        "needRefresh": "1",
        "finishLoadTag": "#headword",
        "function": f,
        "asyncWay": "",
    }), timeout=20)
    if rsp.status_code == 500:
        f = """
        function () {
            var ans = {
                means: []
            };
            var w = document.querySelector('.word-title .title').innerText;
            ans.w = w? w: document.getElementById('search_input').value;
            var e = document.querySelector('.basic');
            for (var i = 0, len = e.children.length; i < len; i++) {
                var child = e.children[i];
                if (child.className.indexOf('word-exp') >= 0) {
                    ans.means.push({
                        pos: child.querySelector('.pos') ? child.querySelector('.pos').innerText : '',
                        tran: child.querySelector('.trans') ? child.querySelector('.trans').innerText : '',
                    });
                };
            };
            return JSON.stringify(ans);
        }
        """
        rsp = requests.post(webview_server_ip, data=json.dumps({
            "pageId": "trans_word_page",
            "requestUrl": "https://dict.youdao.com/m/result?word=" + w + "&lang=en",
            "needRefresh": "1",
            "finishLoadTag": "#search_input",
            "function": f,
            "asyncWay": "",
        }), timeout=20)
    if rsp.status_code == 500:
        return ''
    return json.loads(rsp.text)


def trans_words(words):
    words_temp = setget_temp_data('words_trans')
    ans = []
    need_write = False
    for w in words:
        if words_temp.get(w):
            ans.append(words_temp[w])
        else:
            try:
                if webview_server_ip:
                    rsp = trans_w_by_webview(w)
                else:
                    rsp = trans_w_by_puppeeter(w)
                words_temp[w] = rsp
                need_write = True
                ans.append(rsp)
            except Exception as e:
                ans.append({
                    "w": w,
                    "means": [],
                })

    if need_write:
        setget_temp_data('words_trans', to_save=True)
    return ans


def save_seek_words(w='', is_konwn=''):
    words_temp = setget_temp_data('save_seek_words', d_type=[])

    need_write = False
    if is_konwn == '是' and w:
        need_write = True
        words_temp.append(w)

    if need_write:
        setget_temp_data('save_seek_words', to_save=True)


def record_word(title, word, delete=False):
    kvmap = setget_temp_data('record_word')
    if not kvmap.get(title):
        kvmap[title] = []

    if delete and word:
        for i in kvmap:
            try:
                kvmap[i].remove(word)
            except Exception as e:
                pass
        setget_temp_data('record_word', to_save=True)
    elif not word and not title:
        return kvmap
    elif not word:
        return kvmap[title]
    elif word not in kvmap[title]:
        kvmap[title].append(word)
        setget_temp_data('record_word', to_save=True)


def record_sentence(title, word):
    kvmap = setget_temp_data('record_sentence')
    if not kvmap.get(title):
        kvmap[title] = []

    if not word:
        return kvmap[title]

    if word not in kvmap[title]:
        kvmap[title].append(word)
        setget_temp_data('record_sentence', to_save=True)


def word_read_count(word, count):
    kvmap = setget_temp_data('word_read_count')

    if not count and not word:
        return kvmap

    if not count:
        if kvmap.get(word):
            return kvmap.get(word)
        else:
            return 0

    if kvmap.get(word):
        kvmap[word] = kvmap[word] + int(count)
    else:
        kvmap[word] = int(count)
    setget_temp_data('word_read_count', to_save=True)


app = Flask(
    import_name=__name__,
    static_url_path='/static',
    static_folder=PROJECT_PATH + '/static_source',
    template_folder=PROJECT_PATH + '/static_source/pages'
)
app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0

from flask_cors import CORS

CORS(app, resources=r'/*', supports_credentials=True)  # 注册CORS, "/*" 允许访问所有api


# ============== 页面路由

@app.route("/")
def homeapi():
    return app.send_static_file('pages/index.html')


@app.route("/fastseek")
def fastseekapi():
    return app.send_static_file('pages/fast_seek_words.html')


# ============== 英语单词功能

@app.route("/verb_list")
def verb_listapi():
    current_page = int(request.args.get('currentPage', '1'))
    each_page_size = int(request.args.get('each_page_size', '10'))
    words = get_verb_list().keys()
    list = []
    for w in words:
        list.append({
            "w": w,
            "situations": get_verb_list()[w]
        })
    splited_list = split_list(list, each_page_size)
    return ok({
        "totalItems": len(list),
        "currentPage": current_page,
        "list": splited_list[current_page - 1],
    })


@app.route("/verb_sentence_list")
def verb_sentence_listapi():
    current_page = int(request.args.get('currentPage', '1'))
    each_page_size = int(request.args.get('each_page_size', '10'))
    words = get_verb_list().keys()
    list = []
    for w in words:
        for situation in get_verb_list()[w]:
            for explain in situation["explainations"]:
                if len(explain["examples"]) > 0:
                    example = explain["examples"][0]
                    list.append({
                        "w": w,
                        "situation": situation['situation'],
                        "explain": explain,
                        "example": example,
                    })

    splited_list = split_list(list, each_page_size)
    return ok({
        "totalItems": len(list),
        "currentPage": current_page,
        "list": splited_list[current_page - 1],
    })


@app.route('/get_words_data')
def get_words_dataapi():
    words_data = get_words_data()
    return ok(words_data)


# 获取解析过的单词列表或者获取一个词的相近词
@app.route("/parsed_essay_words")
def parsed_essay_wordsapi():
    from functools import cmp_to_key

    word = request.args.get('word', '')
    if word:
        words_data = get_words_data()
        kmap = dict()
        allow = []
        ans = []
        for ow in words_data.keys():
            allow.append(ow)
            kmap[ow] = Levenshtein_Distance(word, ow)

        def cmp_d(a, b):
            return kmap[a] - kmap[b]

        allow.sort(key=cmp_to_key(cmp_d))
        for i in allow[0:10]:
            if i == word:
                continue
            ans.append({
                'w': i,
                'variety': words_data[i]['variety'],
                "means": words_data[i]['means'],
            })
        return ok(ans)

    current_page = int(request.args.get('currentPage', '1'))
    each_page_size = int(request.args.get('each_page_size', '10'))
    list = []
    splited_list = split_list(list, each_page_size)
    ans = splited_list[current_page - 1]

    return ok({
        "totalItems": len(list),
        "currentPage": current_page,
        "list": ans,
    })


# 快速浏览单词
@app.route("/fast_seek_words")
def fast_seek_wordsapi():
    word = request.args.get('word', '')
    is_know_word = request.args.get('is_know_word', '')

    if word and is_know_word:
        save_seek_words(word, is_know_word)
        return ok()

    current_page = int(request.args.get('currentPage', '1'))
    each_page_size = int(request.args.get('each_page_size', '1'))
    words = get_words_data()

    splited_words = split_list(words.keys(), each_page_size)

    ans = []
    for w in splited_words[current_page - 1]:
        words[w]['w'] = w
        ans.append(words[w])

    return ok({
        "totalItems": len(words.keys()),
        "currentPage": current_page,
        "list": ans,
    })


@app.route("/get_single_word_data")
def get_single_word_dataapi():
    # words_data = get_words_data()
    word = request.args.get('word', '')
    # if word and words_data.get(word):
    #     return ok({
    #         'w': word,
    #         'originalWord': words_data[word]['originalWord'],
    #         'variety': words_data[word]['variety'],
    #         "means": words_data[word]['means'],
    #     })
    # else:
    ans = trans_words([word])
    if ans and len(ans) > 0:
        ans = ans[0]
        means = dict()
        for i in ans['means']:
            means[i['pos']] = i['tran']
        return ok({
            'w': ans['w'],
            'originalWord': ans['w'],
            'variety': '',
            "means": means,
        })
    # else:
    #     return ok({
    #         'w': '未找到',
    #         'originalWord': '未找到',
    #         'variety': '未找到',
    #         "means": {},
    #     })


# 将查询过的单词记录下来
@app.route("/record_word")
def record_wordapi():
    title = request.args.get('title', '')
    word = request.args.get('word', '')
    delete = request.args.get('delete', '')
    return ok(record_word(title, word, delete=delete))


# 收藏句子
@app.route("/record_sentence")
def record_sentenceapi():
    title = request.args.get('title', '')
    word = request.args.get('word', '')
    if title and word:
        record_sentence(title, word)
    else:
        return ok(record_sentence(title, word))
    return ok()


# 单词阅读次数
@app.route("/word_read_count")
def word_read_countapi():
    word = request.args.get('word', '')
    count = request.args.get('count', '')
    return ok(word_read_count(word, count))


@app.route("/get_audio")
def get_audioapi():
    word = request.args.get('word', '')

    def fff(a):
        return str.isalpha(a) or a == '-' or a == ' '

    word = ''.join(filter(fff, word)).strip()

    data = setget_temp_data(word, is_audio=True)

    response = make_response(data)
    response.mimetype = 'application/octet-stream'
    response.headers["Content-Disposition"] = "attachment; filename=\"{}\"".format(word.encode().decode('latin-1'))
    return response


@app.route("/tiktokcomments", methods=['POST', 'GET'])
def tiktokcommentsapi():
    twitter = request.args.get('twitter', '')
    if twitter:
        rsp = requests.get('http://localhost:4033/tiktokcomments2', timeout=20)
    else:
        if webview_server_ip:
            f = """
            function () {
                var a = document.querySelectorAll('.c-card__copy');
                var ans = [];
                for (var i = 0; i < a.length; i++) {
                    var child = a[i];
                    var t = function (s) {
                        try {
                            var r = child.querySelector(s).innerText.trim();
                            if (r) {
                                if (r[r.length - 1] === '.') {
                                    return r + ' ';
                                } else {
                                    return r + '. ';
                                };
                            } else {
                                return '';
                            };
                        } catch (e) {
                            return '';
                        };
                    };
                    ans.push('' + t('.c-card__article-type') + t('.c-card__title') + t('.c-card__standfirst'));
                };
                return JSON.stringify(ans);
            }
            """
            rsp = requests.post(webview_server_ip, data=json.dumps({
                "pageId": "tiktokcomments_nature",
                "requestUrl": "https://www.nature.com/news",
                "needRefresh": "",
                "finishLoadTag": ".c-card__copy",
                "function": f,
                "asyncWay": "",
            }), timeout=20)
        else:
            rsp = requests.get('http://localhost:4033/tiktokcomments')

    return ok(rsp.text)


# ============== 通用接口

@app.route("/trans_words")
def trans_wordsapi():
    words = request.args.getlist('words')
    return ok(trans_words(words))


@app.route("/trans_sentence")
def trans_sentenceapi():
    sentence = request.args.get('sentence')
    return ok(trans_sentence(sentence))


@app.route("/save_temp_data")
def save_temp_dataapi():
    k = request.args['k']
    v = request.args['v']
    temp_json = setget_temp_data('tempdata')
    temp_json[k] = v
    setget_temp_data('tempdata', to_save=True)
    return ok()


@app.route("/get_temp_data")
def get_temp_dataapi():
    k_list = request.args.getlist('k')
    temp_json = setget_temp_data('tempdata')
    if temp_json is None:
        temp_json = dict()
    return ok(dict((k, temp_json.get(k)) for k in k_list))


if __name__ == '__main__':

    if not webview_server_ip:
        def launch_query_server():
            os.system(f'node {PROJECT_PATH}/nodejs/src/query_server.js')


        asyncexec(launch_query_server, [], {})

    # asyncexec(_15_play_music, [])
    app.run(port=8090, debug=False, host='0.0.0.0')
