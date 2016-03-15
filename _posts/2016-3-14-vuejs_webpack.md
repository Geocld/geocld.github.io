---
layout: post
title: vue.js+webpack模块管理及组件开发学习笔记（一）
subtitle: "组件化开发是前端的发展趋势，从当前最流行的模块管理工具及MVVM开发框架学习新的开发模式"
date: 2016-3-14
author: "lijiahao"
tags: [vue.js,webpack]
---
这两年，Angular、React、Vue等MV**开发框架可谓红遍了整个前端领域，在web app领域得到了更加广泛的应用，同时，配合webpack、Browserify等模块打包管理工具，开发效率也得以大大提升，前段时间也利用闲暇时间从零摸索了Vue.js和webpack的配合使用，学习web app组件开发模式，在这里写成文章整理一下思路。

本文涉及到的技术栈主要包括：

- vue.js

- webpack

- npm

下面先对这三个进行简单的介绍。

<h4>vue.js</h4>
> Vue.js是一个构建数据驱动的 web 界面的库。Vue.js 的目标是通过尽可能简单的 API 实现响应的数据绑定和组合的视图组件。

以上是Vue.js官方定义，故名思议，以数据驱动视图是Vue.js推崇的开发模式，与jQuery手工操作DOM元素以更新视图不同，Vue.js提倡尽量减少DOM操作。因此，Vue.js是一个专注于视图的开发框架，也就是MVVM中的VM，下面一个简单的例子解释了一个完整的MVVM模型：
	
	<!--这里是view-->
	<div id="app">
		awesome {{ name }}
	</div>

	//这是model部分
	var myData = {
		name: 'Vue.js'
	}

	//创建一个Vue实例，连接上面的view和model，也就是“ViewModel”
	new Vue({
		el: '#app',
		data: myData
	})

渲染结果为：
	
	awesome Vue.js

基于这样一种MVVM开发模式，在配合vue的组件开发、数据绑定，在后续的app开发中会有极大的威力。

<h4>webpack</h4>
webpack是当前十分热门的模块加载器，它能把各种资源，如JS、css/less/sass、图片等都做为模块来使用和处理。在大型应用的开发过程中，将应用分割成一个个小模块，分工合作，然后再将小模块通过webpack进行整合，达到了“庖丁解牛”的效果，用一张图来说明webpack在作用，就是：
![](http://i.imgur.com/w4N78Sq.jpg)
<h4>npm</h4>
这几年不管是在github还是在各种社区上，都能看到npm的身影，npm是一个模块管理工具，它运行在命令行下，用来安装和管理node模块。

前面说到将开发的静态资源分成一个个模块，在我们使用该模块时，采用`npm install`即可安装相应的模块，这个在后面的具体例子会有具体的操作和应用。

<h4>vue + webpack</h4>
现在通过vue作者提供的[vue-loader-example](https://github.com/vuejs/vue-loader-example)
来一步步了解vue在webpack下的组件模块开发，同时利用npm来安装我们需要的模块包。

项目目录结构如下：

	│  .gitignore          # 忽略无需git控制的文件  比如 node_modules
	│  package.json        # 项目配置
	|  .eslintrc           # eslint加载器配置
	|  .babelrc			   # babel加载器配置
	│  index.html          # 首页
	│
	├─node_modules         #通过npm安装的模块
	│
	├─build
	│     │  webpack.base.config.js         # webpack 基础配置
	│     │  webpack.dev.config.js          # webpack 开发配置
	│     └─ webpack.prod.config.js         # webpack 生产配置
	│
	└─src
		|
		|——assets	 #静态资源 
		|
		|——components    # 组件文件夹,存放app组件
		|		A.vue
		|		B.vue
		|		Counter.vue
		|
		|——services
		|     message.js
		|
		|app.vue	## 主vue组件
		|main.js    #启动配置，webpack入口文件
		

各个文件已经做了相应的注释，以下重点讲解几个主要文件的内容和作用。

package.json：

npm安装依赖的json文件，每个由npm管理模块的项目下都会有这个
package.json文件，这个文件在项目初始化时可通过`npm init`:

![](http://i.imgur.com/Ns1AKzn.png)

如上图示范，在初次初始化时，按照提示分别输入package.json字段，包括：项目名字(name)、项目版本(version)、项目描述(description)和依赖(dependencies)等，有些选项并非必填，具体参数填写方式参考npm文档。

在进行`npm init`初始化后，就会在当前目录下生成`package.json`文件，这里将`vue-loader-example`的完整`package.json`内容展示如下:

	{
	  "name": "vue-webpack-vueloader",
	  "version": "0.0.1",
	  "description": "Example using webpack with vue-loader",
	  "main": "index.js",
	  "scripts": {
	    "dev": "webpack-dev-server --inline --hot --config build/webpack.dev.config.js",
	    "build": "webpack --progress --hide-modules --config build/webpack.prod.config.js",
	    "test": "karma start build/karma.conf.js"
	  },
	  "author": "lijiahao",
	  "license": "ISC",
	  "dependencies": {
	    "vue": "^1.0.16"
	  },
	  "devDependencies": {
	    "babel-core": "^6.1.2",
	    "babel-loader": "^6.1.0",
	    "babel-plugin-transform-runtime": "^6.1.2",
	    "babel-preset-es2015": "^6.1.2",
	    "babel-preset-stage-0": "^6.1.2",
	    "babel-runtime": "^5.8.0",
	    "css-loader": "^0.23.0",
	    "eslint": "^1.10.3",
	    "eslint-loader": "^1.3.0",
	    "file-loader": "^0.8.4",
	    "function-bind": "^1.0.2",
	    "inject-loader": "^2.0.1",
	    "jade": "^1.11.0",
	    "jasmine-core": "^2.4.1",
	    "karma": "^0.13.15",
	    "karma-jasmine": "^0.3.6",
	    "karma-phantomjs-launcher": "^0.2.1",
	    "karma-spec-reporter": "0.0.23",
	    "karma-webpack": "^1.7.0",
	    "phantomjs": "^1.9.19",
	    "stylus-loader": "^1.4.0",
	    "template-html-loader": "0.0.3",
	    "url-loader": "^0.5.7",
	    "vue-hot-reload-api": "^1.2.0",
	    "vue-html-loader": "^1.0.0",
	    "vue-loader": "^8.0.0",
	    "vue-style-loader": "^1.0.0",
	    "webpack": "^1.12.2",
	    "webpack-dev-server": "^1.12.0"
	  }
	}

注：1、dependencies键值内的内容，在运行`npm install xxx`后可以自动插入相应的值，如需要安装vue，运行`npm install vue`,npm就会自动安装最新版本的vue到当前`node_modules`文件夹中，dependencies的内容也会变成如下：

	"dependencies": {
	    "vue": "^1.0.16"
	  }

2、devDependencies键值内的内容是指开发过程中需要用到的依赖包，包括ES6转ES5加载器、CSS加载器等等，这部分的内容可通过`npm install xxx --save-dev`进行安装，如需要安装webpack,输入`npm install webpack --save-dev`,在devDependencies下就会写入webpack的具体安装信息。

在有了这个完整的`package.json`文件的情况下，使用命令：`npm install`，npm就会在当前目录下载项目所需依赖，下载的文件存放在`node_modules`中，这一过程由npm自动完成，我们只需等待即可。

通过npm安装了项目所需的依赖，包括：vue、vue-loader、webpack、babel等，这里将再下一篇博客对关键依赖进行介绍，以了解webpack的模块打包机制。




