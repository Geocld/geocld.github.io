---
layout: post
title: vue.js+webpack模块管理及组件开发（二）
subtitle: "项目开发所需模块以及通过npm下载后，就可以进一步配置webpack并进行模块开发了"
date: 2016-3-27
author: "lijiahao"
tags: [vue.js,webpack]
---
在上一篇博客中已经配置好`package.json`文件并通过`npm`安装了项目开发的依赖，接下来就需要配置`webpack`，通过`webpack`来对项目中的静态资源（样式文件、脚本、图片等）进行打包，并实现一系列的自动化构建，使开发更加便捷。

<h4>webpack配置</h4>
这里还是使用上一篇博客中提到的项目目录，在`./build`文件夹下有三个文件`webpack.base.config.js`、`webpack.dev.config.js`、`webpack.prod.config.js`这三个文件分别是webpack的基础配置、开发配置及生产配置。基础配置包括了webpack的最基本配置，包括入口文件、输入文件、加载器配置、插件配置等，这些配置将在运行项目时告诉webpack需要做些什么，下面是`webpack.base.config.js`的内容：

	module.exports = {
	  //页面入口文件配置
	  entry: './src/main.js',
	  //入口文件输出配置
	  output: {
	    path: './dist',
	    publicPath: 'dist/',
	    filename: 'build.js'
	  },
	  //加载器配置
	  module: {
	    loaders: [
	      {
	        test: /\.vue$/,
	        loader: 'vue'
	      },
	      {
	        test: /\.js$/,
	        loader: 'babel!eslint',
	        // make sure to exclude 3rd party code in node_modules
	        exclude: /node_modules/
	      },
	      {
	        // edit this for additional asset file types
	        test: /\.(png|jpg|gif)$/,
	        loader: 'url',
	        query: {
	          // inline files smaller then 10kb as base64 dataURL
	          limit: 10000,
	          // fallback to file-loader with this naming scheme
	          name: '[name].[ext]?[hash]'
	        }
	      }
	    ]
	  },
	  // vue-loader 设置:
	  //将所有的*.vue文件转化为javascript文件并执行ESLint检测，这里需要配置.eslintrc文件
	  vue: {
	    loaders: {
	      js: 'babel!eslint'
	    }
	  }
	}

(1)entry是页面入口文件配置，output 是对应输出项配置（即入口文件最终要生成什么名字的文件、存放到哪里），在这里，将`./src/main.js`作为入口文件，将打包整合后的文件输出为`./dist/build.js`。

(2)module.loaders是webpack最重要的一项配置，它告知webpack每一种文件都需要使用什么加载器来处理：

	module: {
		//加载器配置
	    loaders: [
		  //.vue文件使用vue-loader处理（这里将-loader省去了）
	      {
	        test: /\.vue$/,
	        loader: 'vue'
	      },
		  //.js文件首先经过ealint-loader处理，再经过babel-loader处理
	      {
	        test: /\.js$/,
	        loader: 'babel!eslint',
	        // make sure to exclude 3rd party code in node_modules
	        exclude: /node_modules/
	      },
	      {
	        //图片文件使用url-loader处理，小于10kb的直接转换为base64
	        test: /\.(png|jpg|gif)$/,
	        loader: 'url',
	        query: {
	          limit: 10000,
	          // fallback to file-loader with this naming scheme
	          name: '[name].[ext]?[hash]'
	        }
	      }
	    ]
	  }

注1：对于加载器`loader`一项，"-loader"可以省略不写；多个loader之间使用"!"连接，类似于Linux的`pipe`命令，在这种情况下加载器的加载顺序为从右向左处理。

注2：对于所需要的加载器，需要写在`package.json`文件中，并通过`npm install`下载安装到`./node_modules`文件夹中才会生效，否则在编译过程中因找不到加载器报错。

对于`webpack.dev.config.js`和`webpack.prod.config.js`，这两个分别是webpack在开发模式和生产模式下的配置。开发模式下通常会配置一些代码错误提示、map等调试信息，在运行项目时使用命令`npm run dev`时默认使用开发配置；生产配置则用于项目正式发布上线时生产正式`build.js`文件，在这种模式下不会产生调试信息，同时会压缩文件，在运行`npm run build`时使用这种配置。

<h4>组件开发</h4>
在一个大型应用中，通常会把界面拆分为多个小组件，每个组件在同一个地方封装它的CSS样式、模板和javascript定义，这样即可以细化任务分配，有利于团队合作，又有利于组件的复用。

在vue.js中,组件以`*.vue`文件呈现，称之为“单文本组件”，如下是一个组件文本的具体内容：

![](http://i.imgur.com/7uqcZm4.png)

可以看到，将组件的样式放在`style`标签中，将模板放在放在`template`标签中，将javascript定义放在`script`标签中,这样便组成一个小而全的组件。

同时针对`*.vue`文件格式，需要使用[vue-loader](https://github.com/vuejs/vue-loader)将`*.vue`转为webpack可以识别的文件格式。

<h4>实例</h4>
模块已安装完毕、webpack也配置完成，同时也了解组件化开发的模式，接下来就在本篇博文和上一篇博文的基础上做一个实时检索的demo，实现通过webpack进行模块整合的组件开发。

首先是`./index.html`:

	<!DOCTYPE html>
	<html>
	<head>
	<meta charset="utf-8">
	<meta http-equiv="X-UA-Compatible" content="IE=edge,chrome=1">
	<title>demo</title>
	
	</head>
	<body>
	    <div id="demo"></div>
	    <script src="dist/build.js"></script>
	</body>
	</html>

项目入口index文件非常的简单，只需设置一个`<div id="demo"></div>`作为vue组件的挂载点，再引用通过webpack编译整合后的`build.js`即可，也无需引入`style`标签，因为webpack已经将样式以javascript的形式存放在`build.js`中，在运行`build.js`，会自动在`head`上加上`style`。

接下来我们开始编写我们的app组件，在`.\src\components`中新建两个文件：`condition.vue`、`list.vue`，分别作为检索输入条件组件和检索列表组件：

	<!--condition.vue-->
	<style scoped>
	h3 {
		color: red;
	}
	input {
		border: 1px solod #ebebeb;
		padding-left: 3px;
	}
	</style>
	<template>
	  <div class="condition">
	  	<h3>search</h3>
	    <input type="text" v-model="filterText">
	  </div>
	</template>
	
	<script>
	export default {
	  props: ['filterText']
	}

`condition.vue`中只有一个input元素，将input元素的数据绑定在`filterText`属性上。

	<!--list.vue-->
	<style scoped>
	h3 {
		color: green;
	}
	ul {
		padding-left: 0;
	}
	ul li {
		list-style: none;
	}
	</style>
	<template>
	  <div class="list">
	  	<h3>result</h3>
	    <ul>
	      <li v-for="item in items">
	        {{ item }}
	      </li>
	    </ul>
	  </div>
	</template>
	
	<script>
	export default {
	  props: ['items']
	}
	</script>

`list.vue`将检索列表用`v-for`进行渲染。

接下来就是将`condition.vue`和`list.vue`联系起来，此时需要一个作为整合功能的组件`App.vue`:

	<!--App.vue-->
	<template>
	  <div>
	    <div class="condition_box">
	      <condition :filter-text.sync="filterText"></condition>
	    </div>
	    
	    <div class="result_box">
	      <list :items="filteredItems"></list>
	    </div>
	  </div>
	</template>
	
	<script>
	import condition from './components/condition.vue'
	import list from './components/list.vue'
	
	export default {
	  el: 'body',
	  data () {
	    return {
	      filterText: '',
	      items: ['Jack Yang', 'Angel', 'New York']
	    }
	  },
	  components: {
	    condition,
	    list
	  },
	  computed: {
	    filteredItems: function() {
	      return this.$data.items.filter(function(item) {
	        return item.indexOf(this.$data.filterText) != -1;
	      }.bind(this));
	    }
	  }
	}
	</script>
	
	<style scoped>
	* {
	  margin: 0; 
	  padding: 0;
	  box-sizing: border-box;
	}
	.box {
	  padding: 10px;
	}
	</style>

`App.vue`通过es6模块管理的`import ... from ...`语法将`condition.vue`和`list.vue`引用过来，并注册为`condition`和`list`标签，再通过`v-bind`实现父组件和子组件的通信，最后通过`computed`计算属性实现检索条件和检索结果的对应。

所有的组件(.vue)已经准备完毕，接下来就是需要一个入口文件`\src\main.js`将组件实例化：

	//main.js
	var Vue = require('vue')
	import app from './App.vue'
	
	new Vue(app);

所有的工作已经完成，此时回到项目主目录下，运行：

	npm run dev

在开发模式下运行项目，根据提示在浏览器打开`http://localhost:8080`即可看到项目,在线[demo](http://geocld.github.io/demo/search/index.html)

![](http://i.imgur.com/thSza6Q.png)

![](http://i.imgur.com/7ILm5iM.png)

由于已经开启`热加载模式`，因此如果在开发模式下修改组件，浏览器会实时将改动呈现在页面上，无需重新刷新，十分方便。

<h4>结语</h4>
本系列博客采用的vue组件开发脚手架已上传至github（[vue-webpack-vueLoader](https://github.com/Geocld/vue-webpack-vueLoader)），后续的项目开发可以以此为基础进行扩展(vue-router\vue-resource等)。

不止Vue.js有组件开发，Angular.js、React.js也有一样的组件开发过程，不同的框架开发模式也大同小异，同时作为一种数据驱动的框架，搭配组件开发在数据逻辑较为复杂的情形下确实可以提高不少生产力，组件开发给项目开发带来的便利性还需在后续的实际项目中去体会和实践。

（完）

参考资料：

[构建大型应用](http://cn.vuejs.org/guide/application.html)

[webpack 入门指南](http://www.cnblogs.com/vajoy/p/4650467.html)

[webpack module bundler](https://webpack.github.io/)

