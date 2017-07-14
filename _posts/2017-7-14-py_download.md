---
layout: post
title: 使用Python获取页面图片信息并下载图片
subtitle: ""
date: 2017-7-14
author: "lijiahao"
tags: [Python]
---

近期个人需要在一些网页上获取图片，因一张张图片保存实在麻烦，研究了下使用Python自动化获取并下载图片，以下是研究历程：

### 获取HTML源代码

```python
import urllib
import urllib2

header = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/59.0.3071.115 Safari/537.36"
        , "Connection": "keep-alive"
        , "Referer": "http://yoururl"
        ,"Accept":"application/json, text/plain, */*"
    }
#  设置请求的header
```

首先获得HTML的结构

使用`urllib`:

```python
def getHtml(url):
    page = urllib.urlopen(url)
    html = page.read()
    return html
```

但是这样无法设置headers，使用`urllib2`可解决：

```python
def getHtml(url):
	req = urllib2.Request(url, headers=header)
	html = urllib2.urlopen(req)
	htmlData = html.read()
	print '解析成功!'
	# with open('test.txt', 'w') as f:
	# 	f.write(htmlData)
	return htmlData
```

拿到HTML源码后即可根据正则获取图片的src，将图片的src用列表保存，如

```
urllist = ['123456.jpg', 'aa.jpg']
```

### 请求图片链接并下载到本地

对`urllist`循环进行请求,使用`urllib.urlretrieve`可直接下载，无需发动请求:

```python
x = 0
for imgurl in imglist:
        urllib.urlretrieve(imgurl,'%s.jpg' %x) #打开imglist中保存的图片网址，并下载图片保存在本地
        x = x + 1
```

经实际测试，使用`urllib.urlretrieve`仅可以下载同步渲染的图片，如百度贴吧的图片，对于需要长时间加载出来的图片则会出现下载的图片在本地无法预览的提示，而且`urllib.urlretrieve`使用的默认python的header，肯定拿到不图片。

改进：使用`urllib2.urlopen`发起请求，再使用`f.write`保存图片到本地:

```python
for imgurl in imglist:
		x = x + 1
		request = urllib2.Request(imgurl, None, header) #设置请求头部
		response = urllib2.urlopen(request)
		with open("%s.jpg" %x, "wb") as f:
			f.write(response.read())
```

### 添加实时进度条

通过`urllib2.urlopen`解决请求图片+下载图片的功能，不过这个方法有个缺陷，如果需要添加下载进度条功能，使用如下代码添加进度条，会出现进度条状态和`f.write`不同步的情况，原因是`urllib2.urlopen`拿回来的数据是一次性写到`f.write`里面的：

```python
def chunk_report(bytes_so_far, chunk_size, total_size):
	percent = float(bytes_so_far) / total_size
	percent = round(percent * 100, 2)
	sys.stdout.write("Downloaded %d of %d bytes (%0.2f%%)\r" %(bytes_so_far, total_size, percent))

	if bytes_so_far >= total_size:
		sys.stdout.write('\n')

def chunk_read(resp, chunk_size=1024, report_hook=None):
	total_size = resp.info().getheader('Content-Length').strip() # 获得response的数据长度
	total_size = int(total_size)
	bytes_so_far = 0

	while 1:
		chunk = resp.read(chunk_size)
		bytes_so_far += len(chunk)

		if not chunk:
			break

		if report_hook:
			report_hook(bytes_so_far, chunk_size, total_size)
            
def getImg(html):
    for imgurl in imglist:
		x = x + 1
		request = urllib2.Request(imgurl, None, header) #设置请求头部
		response = urllib2.urlopen(request)
        chunk_read(response, report_hook=chunk_report) #无效
		with open("%s.jpg" %x, "wb") as f:
			f.write(response.read())
```

为了让response的数据用流的形式写入文件，就需要使用`requests`模块了，同时进度条可以使用现成的`progressbar`模块，具体如下:

```python
# -*- coding: utf-8 -*-

import re
import sys
import requests
import progressbar
import urllib2

header = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/59.0.3071.115 Safari/537.36"
        , "Connection": "keep-alive"
        , "Referer": "http://cl.xias.pw/htm_data/16/1707/2509191.html"
        ,"Accept":"application/json, text/plain, */*"
    }


def getHtml(url):
	req = urllib2.Request(url, headers=header)
	html = urllib2.urlopen(req)
	htmlData = html.read()
	print '解析成功!'
	# with open('test.txt', 'w') as f:
	# 	f.write(htmlData)
	return htmlData

def getImg(html):
	reg = r"<input src='(.+?\.md.jpg)'" #此处的图片链接正则根据不同的页面结构会有不同
	imgre = re.compile(reg)
	imglist = imgre.findall(html)
	x = 0
	for imgurl in imglist:
		x = x + 1
        # requests采用数据流的形式返回response
		response = requests.request('GET', imgurl, stream=True, data=None, headers=header)
		
		total_length = int(response.headers.get("Content-Length"))
		with open("%s.jpg" %x, "wb") as f:
			widgets = ['Progress: ', progressbar.Percentage(), ' ',
               progressbar.Bar(marker='#', left='[', right=']'),
               ' ', progressbar.ETA(), ' ', progressbar.FileTransferSpeed()]
			pbar = progressbar.ProgressBar(widgets=widgets, maxval=total_length).start()
			for chunk in response.iter_content(chunk_size=1):
				if chunk:
					f.write(chunk)
					f.flush()
				pbar.update(len(chunk) + 1)
			pbar.finish()

html = getHtml("http://yoururl")
getImg(html)

```

### 小结

这个小项目从简单的urllib应用到最后requests数据流的改进，有以下知识点：

1. `urllib.urlretrieve`发起的请求是使用Python默认的headers，如果需要改动headers，则需要使用`urllib2.urlopen`发起请求
2. `urllib2.urlopen`拿到的数据无法已数据流的形式给开发者使用
3. response返回的Content-Length，urllib2和requests的结构展示方式不同，urllib2使用`response.info().getheader('Content-Length').strip()`获得，requests使用`response.headers.get("Content-Length")`
4. requests是实现了urllib和urllib2功能的http模块，简单的应用场景可以直接使用urllib，复杂的场景使用requests为佳.

(完)