---
layout: post
title: sparkee-自动化monorepo管理工具
subtitle: sparkee工作原理及适用场景详解
date: 2022-7-4
author: "lijiahao"
tags: ['npm', 'pnpm']
---

[Sparkee](https://github.com/Geocld/sparkee)是一个类似[lerna](https://github.com/lerna/lerna)的monorepo管理工具，但又有很多不同，本文将详细介绍本人开发sparkee的初衷以及该工具的具体使用场景。

<h3>为什么要造轮子</h3>

造轮子的初衷无非无非就是现有的工具不好用或不能满足自己的项目场景。在我自己的monorepo项目中有以下几点是lerna等monorepo工具无法解决的:

<h4>pnpm局限性</h4>

项目使用[pnpm](https://pnpm.io/)自带的`monorepo`功能进行依赖管理和`同仓多项目`管理，但pnpm的版本管理和发布功能却十分鸡肋，无法查看当前`monorepo`下`package`的版本和相互依赖关系，且发布只有`pnpm publish`发布全部package或使用`--filter`指定package发布，至于`版本自增`、`changelog`等发布工作流自己配合`changesets`和`Rush`使用。

<h4>lerna局限性</h4>

`lerna`在发布工作流就做的很好，上述pnpm的局限性貌似可以解决，但在项目具体使用中发现以下问题: 

* `lerna`的`monorepo`管理方式是统一开发、统一发布，比较典型的是[babel](https://github.com/babel/babel)这个大型`monorepo`，每个`package`的依赖关系极强，因此一个release发布需要涉及全部`package`的发布。但在我的实际项目中，每个`package`确实存在依赖关系，但一旦只有一个`package`发生变动，这个`package`发布时我是不希望其余`package`只是修改版本然后发布一次，相比我更希望支持`pnpm --filter <package> publish`的方式，很遗憾lerna不支持这个特性。

* `lerna`不支持`workspace`协议。`pnpm`的`monorepo`管理支持使用`workspace`协议，在`package.json`中使用`"foo": "workspace:*"`的方式调用`package`，因此在执行`pnpm publish`时pnpm会自动修改`package`的当前版本号，无需担心`workspace`关键字会发布到release版本的`package.json`中。遗憾的是lerna已经停止新功能迭代，无法对`workspace`协议进行支持，在[lerna-lite
](https://github.com/ghiscoding/lerna-lite)号称可以支持`workspace`协议协议，兼容lerna命令，但在具体使用时发现`lerna-lite`依然会在发布时强制把`package`的本地`package.json`文件里的`workspace`关键字去掉再进行发布，因此`lerna-lite`也不能很好的兼容`workspace`协议发布。

此时`sparkee`就是基于`pnpm publish`保留`workspace`协议但又能很好的支持lerna发布工作流而开发的`monorepo`版本管理工具


<h3>sparkee特性</h3>

* 相比`lerna`复杂而且冗长的命令，`sparkee`命令很简单，目前只有三个命令: `sparkee init`, `sparkee info` 和 `sparkee publish`

* 支持`workspace`协议，执行`sparkee publish`其实内部调用的是`pnpm publish`，因此无需担心项目内`workspace`被影响

* 发布支持`版本自增`、`自动提交tag`、`changelog自动生成`，符合lerna标准发布工作流，弥补`pnpm`发布管理短板

* 支持单个`package`发布

* 支持`package`版本查看以及树状依赖关系图

<h3>sparkee支持的项目结构</h3>

`sparkee`需要在标准`monorepo`项目结构下工作，即`package`需要统一放在`packages`下，每个`package`维护自己的`package.json`:

```
your-repo/
  package.json
  packages/
    package-1/
      package.json
    package-2/
      package.json
```

> 这里需要注意的是`sparkee`将`package.json`内的`name`作为`package`的名称，而不是目录名，这一点和`pnpm`规则是一样的

这里我展示具体demo的项目结构:

```
pnpm-monorepo
├── package.json
├── packages
    ├── pkg1
    |   └── package.json // name: @geocld/pkg1
    └── pkg2
        └── package.json // name: @geocld/pkg2
```

<h3>安装</h3>
`sparkee`支持全局安装或在项目内安装使用：

```bash
$ npm i sparkee -g
$ npm i sparkee --save-dev
```

或者通过`pnpm add`将`sparkee`安装在最外层:

```bash
$ pnpm add sparkee -w
```

安装完成后可以通过`sparkee`或`spk`执行`sparkee`

> 安装在项目内使用`npx sparkee`或`npx spk`

![1](/img/sparkee/1.png)

<h3>sparkee init</h3>

`sparkee init`会初始化当前`monorepo`，init过程用户指定选择管理当前`packages`下的`package`，或者管理全部:

```bash
$ npx sparkee init
```

![1](/img/sparkee/1.png)

初始化完成后项目根目录会生成一个`spark.json`，内容即刚才选择需要管理的模块:

```js
// spark.json
{
  "packages": [
    "@geocld/pkg1",
    "@geocld/pkg2"
  ]
}
```

<h3>sparkee info</h3>

`sparkee info`可以查看当前`packages`的版本信息，可选项`--tree`展示`packages`的依赖树关系。

```sh
$ sparkee info <--tree>
```

`info`
![info1](/img/sparkee/info1.png)


`info -- tree`
![info2](/img/sparkee/info2.png)

<h3>sparkee publish</h3>

`sparkee publish`是`sparkee`的核心，其遵循了模块发布的[标准工作流](https://github.com/conventional-changelog/conventional-changelog/tree/master/packages/conventional-changelog-cli#recommended-workflow)。

执行`sparkee publish`时，其内部主要做了以下工作：

1. 通过比较最近一次的`tag`检测到最近一次提交变动的项目（`src`文件夹和`package.json`），如果没有发布过tag则以第一次`commit`做比较
2. 选择需要发布的模块，可以发布单个或多个模块
3. 自动更新`package`下`package.json`的版本号
4. 通过`conventional-changelog`在选定发布的`package`中生成changelog，注意`changelog`需要`git commit`符合[Angular提交规范](https://docs.google.com/document/d/1QrDFcIiPjSLDn3EL15IJygNPiHORgU1_OOAqWjiDU5Y/edit#heading=h.greljkmo14y0)，否则得到的changelog可能是空的
5. 自动依次执行`git Commit`、`git tag`、 `git push`
6. 通过`pnpm`进行发布


完整的`sparkee`工作流如下：

![workflow](/img/sparkee/workflow.png)

demo: 
![pub-demo](/img/sparkee/publish-demo.png)

<h3>总结</h3>
可以说Sparkee是为了完善`pnpm`发布而开发的版本发布工具，如果你的项目使用了`pnpm`，同时希望得到有别于lerna的版本发布方式，那么可以试一下`sparkee`。如果你对这个项目感兴趣，可以随时对本项目发起pr以完善`sparkee`的功能和使用体验。

(完)