![](./md_data/a.png)
![](./md_data/b.png)
![](./md_data/c.png)

![](./md_data/d.jpg)

# 功能有哪些？
主要功能就是，双语阅读，以及查词时，自动检索出该词出现在你学过的文章中的那些地方。

每个句子左上角都有个“球型“符号，点击就可翻译当前句子，每个单词都可点击后直接翻译。

收录了牛津词典，在单词解释页下方可以点击查详情。

在单词解释页会根据“最短编辑距离”算法列出前十个写法上相近的词。

# 怎么添加文章
在 static_source/articles/articles 目录下放入你的文章，然后将文件名按照JSON的语法规则添加到 static_source/articles/catolog.json 下

# 如何运行？
运行本程序需要你的电脑安装有 python3.x 版本，以及 nodejs

安装python所需依赖
```
python -m pip install flask flask_cors
```

进入nodejs文件夹执行以下指令：
```
npm install
```

然后回到项目的根目录下，执行以下指令：
```
python index.py
```
打开 localhost:8090 即可访问程序
