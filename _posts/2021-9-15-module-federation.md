---
layout: post
title: 关于module Federation的思考
subtitle: webpack5新特性module Federation学习和思考
date: 2021-9-15
author: "lijiahao"
tags: ['webpack']
---

[module Federation](https://webpack.docschina.org/concepts/module-federation/)是webpack5发布的几个新特性之一，module Federation的理念是应用可以动态引用其他客户端或服务端的模块，因此这也是webpack首次官方开放`微前端`概念特性，接下来我们将通过一些具体例子来体会module Federation具体可以做的事和可以解决的问题。

<h3>当前前端应用开发和部署过程的痛点</h3>

一切脱离具体需求的开发特性都是纸上谈兵，为了能够更好的了理解module Federation（下文统称mf）的具体应用，我们先来看下前端在具体开发时遇到的几个痛点：

1. 开发了一套内部使用的基于vue2的的UI组件库，但是有其他项目使用react或vue3，使用常规npm模块包的方式无法直接使用，但每个项目对符合设计规范的组件库又有迫切需求。
2. A项目里需要嵌套B项目的模块，B项目就得把该模块提取成组件再以npm包的形式提供给A项目，但B项目不得不衍生出一个公共组件进行维护，每次组件有更新，A模块还得进行一次npm包更新和发版。
3. 项目随着功能迭代变得过于繁杂，继续在现有项目上添加代码势必增加后续项目维护的难度，寻求更加简洁优雅的功能模块拆分和维护方案。

以上痛点可以看到都有一个共同点，就是都希望把一个前端应用拆分成多个可以独立运行的模块，便于独立开发和引用，而且引用还需具备远程调用的特性。接下来，我们就带着这些开发痛点和需求，来看看mf能不能帮我们解决这些问题。

<h3>module Federation理念和微前端的联系</h3>

mf官方有提到使用的动机：

> 多个独立的构建可以组成一个应用程序，这些独立的构建之间不应该存在依赖关系，因此可以单独开发和部署它们。
> 
> 这通常被称作微前端，但并不仅限于此。

因此不难看出，mf实际想要做的事，便是把 多个无相互依赖、单独部署的应用合并为一个。通俗点讲，即mf提供了能在当前应用中远程加载其他服务器上应用的能力。

每一个webpack构建的应用可以看做是一个`host`，而每一个host里包含的模块可以当做是一个`remote`供微前端应用调用。每个应用都可以是一个`host`和`remote`，每个应用的架构模型如下：
![1](/img/webpack/1.png)

而mf提供的能力就是把每个应用中可以共用的component或library提取出来，部署到应用集群中，每个应用可以引用其他应用暴露出来的模块，自身也能被其他应用引用，这就实现了一个`去中心化`的应用部署集群。
![2](/img/webpack/2.png)

<h3>module Federation实例探讨</h3>

我们从webpack官方给的[例子](https://github.com/module-federation/module-federation-examples/tree/master/basic-host-remote)作为例子，来看看webpack配置里到底怎么通过mf来实现跨应用的远程引用的。

这个项目展示了两个react项目是如何调用对方的远程组件的，代码量很少，而且webpac配置才60多行，没有复杂的配置，因此很有学习价值。

这个例子的应用关联关系如下：

* app1作为host应用，远程引用了app2的`Button`组件
* app2作为remote应用，对外分享了自己的`Button`组件

![3](/img/webpack/3.png)

app1和app2的项目文件结构如下
![4](/img/webpack/4.png)
两者的项目结构基本一致，唯一区别就是app2多了一个`src/Button.js`组件，这也是app1应用中远程调用的组件。

接着我们再把app1和app2的代码一个个过一遍。

<h4>src/App.js</h4>
`src/App.js`作为react的主应用代码，渲染了应用标题和按钮:

![5](/img/webpack/5.png)

左侧(app1)第3行引用了一个app2的`RemoteButton`，并在第10行对这个`RemoteButton`进行调用，右侧(app2)则是常规的按钮调用（第1行和第8行）。

<h4>src/bootstrap.js</h4>
两个应用的`src/bootstrap.js`内容一致：

```js
import App from "./App";
import React from "react";
import ReactDOM from "react-dom";

ReactDOM.render(<App />, document.getElementById("root"));

```

<h4>src/index.js</h4>

`src/index.js`只有一段调用`bootstrap`逻辑：

![6](/img/webpack/6.png)

这两段代码只有三行，但却暗藏mf运行的玄机。app1使用常见的静态引入调用`bootstrap`以启动应用，但app2却用到了动态引入(`import("./bootstrap")`)。这是因为app1是要引入app2的远程模块，就必须要等所有依赖都加载完成后才执行自身的入口文件（否则应用直接崩溃），那app2就必须使用异步加载来达到共享模块的依赖前置，这个可以尝试修改app2的`index.js`采用同步加载方式加载`bootstrap`来进行应用，改成同步后整个应用就跑不起来了。

那怎么让app1等待依赖都准备好后才启动（执行bootstrap）呢，答案就是对`app1/src/bootstrap.js`执行懒加载，在`app1/src/webpack.config.js`中加入以下懒加载配置：

```js
{
  test: /bootstrap\.js$/,
  loader: 'bundle-loader',
  options: {
    lazy: true,
  },
}
```

<h4>src/webpack.config.js</h4>
两个应用的webpack配置差异如下：

![7](/img/webpack/7.png)

这里对`ModuleFederationPlugin`调用的差异进行解释。两个应用都使用了webpack的内置插件`ModuleFederationPlugin`，但二者的配置略有差异：

app1: 
* `name`: 输出的模块名，被远程引用时路径为`${name}/${expose}`
* `remotes`: 定义调用的远程应用名称及链接，规则为`appName@url`，例子为`app2@http://localhost:3002/remoteEntry.js`。
* `shared`: 当前应用暴露到外部的模块，例子中暴露了`react`和`react-dom`模块，由于`react`和`react-dom`在全局作用域只允许存在一个版本，故需设置单版本共享`{ singleton: false }`，`shared`的完整配置见[文档](https://webpack.docschina.org/plugins/module-federation-plugin/#Sharing-hints)。

app2:
* `library.type`: 声明全局变量的类型，类型可选值为`var`, `module`, `assign`, `this`, `window`, `self`, `global`, `commonjs`, `commonjs2`, `commonjs-module`, `amd`, `amd-require`, `umd`, `umd2`, `jsonp`, `system`。
* `library.name`: 声明全局变量的名称
* `filename`: 构建输出的文件名
* `exposes`: 被远程引用时可暴露的资源路径及其别名，app2共享了`./src/Button`组件。

从mf的配置来看，核心就是`remotes`和`exposes`就实现了模块的共享和远程引用。

<h3>一些个人的思考</h3>
刚开始了解mf的时候，觉得mf的使用url的远程引用和常规的`script`标签引用没什么两样，再多次查阅文档和demo实践后，总结出这两者有有以下区别：

1. mf的远程模块是以webpack打包后的组件形式提供，可以按需在代码任意地方引用，而script标签的引用只适应在全局引用。
2. 使用script的引用，只适应整个模块的共享，例如一个按钮组件，使用script的话就得单独为改组件分配一个共享域名，而使用mf可以在同一个域名内对一个应用的任意模块进行共享。

可以说mf在设计理念上还是比较先进，但在具体的业务场景落地时可能会存在以下问题：

1. 使用mf搭建的微前端框架各应用之间存在相互依赖，需要做到依赖前置才能正常运行，一旦其中某个应用服务异常，将可能导致大规模的应用崩溃，对此是否需要借助集群多点部署的方式来保证系统的稳定运行？
2. mf是webpack5的新特性，webpack5为了支持远程加载对内部的runtime也进行了大规模的改造，因此如果要使用mf，就必须对当前的构建工具进行升级，并把现有应用可共享的模块进行提炼，工作量比较大，可以考虑从新项目进行入手。
3. 针对使用react、vue这一类开发框架的应用，使用mf进行模块共享时还需考虑框架的版本，如果是应用处于不同的大版本，那么就有可能导致运行上下文的版本不一致，这也是将应用接入微前端的难点之一。

由于本人也是刚接触学习module-federation，理解和总结可能会有所偏颇，如有错漏，欢迎指正。

(完)

[module-Federation原理学习](https://github.com/efoxTeam/emp/wiki/%E3%80%8Amodule-Federation%E5%8E%9F%E7%90%86%E5%AD%A6%E4%B9%A0%E3%80%8B)
