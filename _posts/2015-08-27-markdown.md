---
layout: default
layout: page
layout: post
title: github Pages搭建个人博客总结
category: 技术文章
tag: [github, jekyll, markdown, 博客搭建]
---
#github Pages搭建个人博客总结
　　历时半个月，终于在上下班的空闲时间里搭建了一个简陋的博客，目前从博文发布到评论再到博文分类，雏形也基本形成，现在根据从github注册到最后使用markdown写博客做一个小小的总结。

　　使用github pages搭建的博客是静态博客，即所有现成的页面都是使用现有的html等静态文档组成，不涉及数据库和后台的搭建，对于前端初学者是一个很好的练手环境，目前github分配给每个人300M的免费空间，使用github搭建一个中小型博客也是绰绰有余了。

　　使用github搭建博客的理想配置为：github+jekyll+markdown：    
1.github：git是现在最为流行的分布式版本控制系统，github则是一个远程托管git库的平台，只要在上面注册一个账号，你就可以使用github上的免费空间托管你的项目。

2.jekyll：jekyll是一种简单、易学易用的适用于博客、静态网站生成引擎。它使用一个模板目录作为网站布局的基础框架，支持markdown等标记语言的解析，提供了模板、变量、插件等功能，最终生成一个完整的静态的web站点。

3.markdown：markdown是一种可以使用普通文本编辑器的标记语言，通过类似HTML的标记语法，可以使普通文本内容具有一定的格式。

好了，关于相关技术介绍到此为止，总的来说，要搭建一个个人静态博客，需要git门槛，前端HTML、CSS以及javascript基础，同时对jekyll和markdown需要进行简单的入门学习。下面简单总结下我的个人博客的搭建过程。
###1.创建Github Pages
####1.1创建个人站点
到[github](www.github.com)根据提示注册github账号，之后点击右上角创建个人仓库，站点命名格式为**用户名/用户名.github.io**，之后，即可看到一个空的个人仓库。
####1.2本地git相关
对于网站文件托管至github以及后续博文的发布，git的涉及的命令如下：

		git init //创建版本库，初始化git仓库
		git add filename 
		git commit -m "提交说明"  //添加文件到本地仓库
		git push origin master  //将master主分支push到远程仓库中
###2.jekyll本地环境的搭建
1.windows环境下载[RubyInstaller](http://rubyinstaller.org/),一路选择下一步，中途注意选择自动配置环境变量，这样安装后就无需手动配置环境变量。

2.下载最新的[DevKit](https://github.com/oneclick/rubyinstaller/downloads/),通过DevKit进行后续的gem安装。解压下载的Devkit到C:\DevKit，然后打开cmd，输入以下命令进行安装：

		cd C:\Devkit
		ruby dk.rb init
		ruby dk.rb install
3.完成上面的安装后就可以安装jekyll了，安装jekyll需通过gem进行安装，理想安装命令如下：

		gem install Jekyll
但是由于国内网络环境问题，gem操作会被墙掉，索性可以使用淘宝团队开发的[RubyGems镜像](http://ruby.taobao.org/)进行替换源安装,具体使用方法参照链接。

检查jekyll是否安装成功：

		jekyll -version

4.安装Rdiscount，这个用来解析markdown标记的文本，命令如下:

		gem install rdiscount

5.运行本地jekyll，cd到当前git本地库下，运行如下命令：
		
		jekyll serve --safe --watch

打开浏览器，进入`http://localhost:4000/index.html`即可进入博客首页。
>注：index.html是你的首页HTML文档
###3.jekyll目录构成
在本地git库下，需要手动创建几个文件夹：

_includes　　**公共内容引用目录**

_layouts　　**存放模板文件**

_posts　　**博文，HTML文件或MD文件**

css 　　**css静态文件**

js 　　　**js文件**

最终的目录组成如下图：

###4.使用markdown写博文
博文的命名格式为YYYY-MM-DD-TITLE.html或YYYY-MM-DD-TITLE.md，使用html写博客是一件很艰辛的事，markdown弱化了HTML的标签书写，使用一些很简单的标记即可完成类似“标题”、“引用”、“代码”等标签的书写，十分方便。

目前使用的markdown编写环境：markdownPad2。