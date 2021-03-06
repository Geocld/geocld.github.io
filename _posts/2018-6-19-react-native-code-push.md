---
layout: post
title: react-native-code-push热更新探索实录(IOS)
subtitle: "更详细的react-native-code-push使用实录，一步一步实现IOS下的React-native热更新。"
date: 2018-6-19
author: "lijiahao"
tags: ['React-native', 'react-native-code-push']
---

`React-native-code-push`是微软针对React-native推出的热更新服务，最近的React-native项目需要对热更新进行调研，了解到微软有提供相应的热更新模块，便着手去尝试使用这个模块的使用。事实上`React-native-code-push`的[官方文档](https://github.com/Microsoft/react-native-code-push)写的十分详细，针对IOS和Android也有很详细的配置说明，网上也有很多相关的教程，但是在实际动手实现的过程中，发现有很多问题：

* 官方文档的配置有遗漏，导致某些头文件无法找到，后来是通过code-push的issues才找到答案；
* 网上搜到的博客教程内容通篇一律，不同作者写出来的文章引用的图片甚至一些项目bundleId都是一样的，极度怀疑这些作者是否真正去实践过并写出这个教程；
* `React-native-code-push`和`xcode`更新很频繁，不同的版本在操作配置上都会有不少细节需要注意。

基于以上问题，我决定根据自己今天的实践把今天的调研记录下来，一方面也是自己的一点总结，另一方面也可以给苦于网上通篇一律教程所困扰的开发者们提供点思路，此文我会尽量把`React-native-code-push`在React-native项目的IOS环境配置、使用写清楚，最后能实现一个可以热更新的demo。

> 本文涉及的依赖及环境版本如下:
>
> React-native: 0.55.4
>
> React-native-code-push: 5.3.4
>
> Xcode:  9.4
>
> macOS：10.13.4

<h3>创建一个React-native项目</h3>

假设你已经全局安装了`react-native`，那么使用`react-native init <project name>`创建一个新项目:

```
react-native init RnHotUpdateDemo
```

创建后RnHotUpdateDemo会自动生成以下文件，node_modules也已经安装了相关依赖:

![](http://ww2.sinaimg.cn/large/005zWjpngy1fsglhvjr8wj30f80b4jsc.jpg)

ios环境下运行项目(如果这里还不知道如何运行rn项目，请先自行学习react-native的启动，此处不再赘述)：

![](http://ww.sinaimg.cx/005zWjpngy1fsglo68cgfj30bb0lyaau.jpg)

到这里我们已经得到了一个没经过任何配置的原汁原味的React-native项目，接下来就是引入`React-native-code-push`来让这个项目支持热更新。

<h3>安装 CodePush CLI</h3>

在终端使用如下命令进行安装:

```Bash
sudo npm install -g code-push-cli
```

安装后可直接在终端使用`code-push`命令，利用这个命令我们可以进行后续的注册、发布等操作。

<h3>注册CodePush 账号</h3>

终端执行`code-push register`会打开浏览器，进入注册页面，注册后页面上会提供一个`Access Key`，将此key填入终端，即完成code-push的登陆:

![](http://ww.sinaimg.cx/005zWjpngy1fsgm2km0hkj30ke055751.jpg)

<h3>在CodePush服务器中创建App</h3>

在终端输入`code-push app add <appName> <os> <platform>`完成创建，其中os为ios或android，platform为react-native，如下：

```bash
code-push app add RnHotUpdateDemo ios react-native
```

注册完成之后会返回一套deployment key:

![](http://t1.aixinxi.net/o_1cgbm4nml44j24fp8g18s01orma.png-j.jpg)

包括Staging和Production，这是code-push对刚新增的应用的标识符，在后面的配置中需要用到。这里不用记下来，可直接使用下面的命令查到对应应用的deployment key:

```
code-push deployment ls <appName> -k
```

![](http://t1.aixinxi.net/o_1cgbmdphbr741mdg5h41npj1e9ca.png-j.jpg)

使用以下命令可查看自己账号下的app:

![](http://t1.aixinxi.net/o_1cgbmik2o9p91c3b13r31k0a8ba.png-j.jpg)

更多关于`code-push`的命令使用可直接使用`code-push -h`查看，如果命令没有输入正确code-push也会展示全部的命令，很方便。

<h3>CodePush在IOS端下的集成</h3>

首先需要在React Native项目中安装codePush依赖：`npm i react-native-code-push --save `，接着我们先使用`react-native link react-native-code-push`命令来先完成react-native和react-native-code-push的构建关联:

![](http://t1.aixinxi.net/o_1cgbni46n1teirgob89ha21mn1a.png-j.jpg)

这里会要求输入 deployment key，直接Enter跳过即可，因为我们会在后续步骤中通过更加灵活的方式配置。使用xcode打开项目，看看刚才这步关联动作我们能直接看到的变化是什么，其实最直观的变化就是AppDelegate.m这个文件:

![](http://t1.aixinxi.net/o_1cgbnneic12j2aa0102mb6c1vb0a.png-j.jpg)

AppDelegate.m中增加了codePush的头文件引用，同时新增了CodePush对JSBundle文件的引用。但此时看到引用头文件时出错，提示头文件未找到，我们在接下来的配置中解决这个问题。

<h3>Xcode端配置</h3>

1.引入CodePush.xcodeproj

在项目`node_modules/react-native-code-push/ios` 文件夹内找到CodePush.xcodeproj，将其拖入Xcode的LIbraries文件夹下，Xcode会自动创建对CodePush.xcodeproj的引用。

![](http://t1.aixinxi.net/o_1cgc9uht61g5l1j16dda1tbm8t1a.png-j.jpg)



2.引入CodePush SDK

在Xcode中首先选中目录树最顶层项目，选中TARGETS下的项目，选择Build Phases，打开“Link Binary With Libraries”下拉框，可以看到当前项目编译时依赖的二进制文件，在这里我们需要把codePush的二进制文件引入，也就是引入CodePush编译好的SDK文件（.a结尾）。打开刚拖入的CodePush.xcodeproj下的Products，可看到"libCodePush.a"的文件，将其拖入到“Link Binary With Libraries”列表即可，具体过程如图：

![](http://t1.aixinxi.net/o_1cgcaa0d018gj1go1ps01igslhsa.png-j.jpg)



3.引入libz.tbd

根据CodePush的文档，CodePush还需要依赖一个名为libz.tbd的工具包，引入的位置还是上面的“Link Binary With Libraries”,该工具包的添加方式如下:

![](http://t1.aixinxi.net/o_1cgcascrv1m93q4oel0t4mp0a.png-j.jpg)

到了这里，我们已经把CodePush的编译二进制文件引入到项目中了，按理项目中已经可以正常引用CodePush的头文件，让我们回到刚才出现报错的AppDelegate.m文件中检查，发现报错依旧存在，错误：'CodePush/CodePush.h' file not found。这已经是按照官方文档进行操作了，是不是哪里出了问题？经过Google搜索，最后在这个[issues](https://github.com/Microsoft/react-native-code-push/issues/662)中找到了答案:

![](http://t1.aixinxi.net/o_1cgcbcacb1uibo871l3818gm1pa8a.png-j.jpg)

意思就是Xcode的头文件检索路径不正确，导致找不到对应的.h文件。按照下图的顺序找到“Header Search Paths”：

![](http://t1.aixinxi.net/o_1cgcbgmql1e99pnve41q951uvta.png-j.jpg)

将`$(SRCROOT)/../node_modules/react-native-code-push/ios/CodePush`修改为`$(SRCROOT)/../node_modules/react-native-code-push/ios`，再到Xcode菜单Product—>clean对项目重置一下，再次检查AppDelegate.m，发现之前的报错已经消失，可以正常引入CodePush.h文件了。



4.配置deployment key

在`react-native link react-native-code-push`环节我们跳过了deployment key在Xcode端的配置，在这里我们需要手动配置。

4.1 在Xcode的项目导航视图中的PROJECT下选择你的项目， 选择Info页签 ，在Configurations节点下单击 + 按钮 ，选择Duplicate "Release Configaration ， 输入Staging。

![](http://t1.aixinxi.net/o_1cgdacrdd1orm9s1162r3ka1t12a.png-j.jpg)



4.2 在build Settings页签中单击 + 按钮然后选择Add User-Defined Setting，然后输入CODEPUSH_KEY，然后填入deployment key。

![](http://t1.aixinxi.net/o_1cgdajoko1avp137c1mmaknpm00a.png-j.jpg)

新增的CODEPUSH_KEY节点下Debug不用填，Release填入的是CodePush上Production的key值，Staging填入的是CodePush上Staging的key值：

![](http://t1.aixinxi.net/o_1cgdarik6e53c49ats1du9ek5a.png-j.jpg)

4.3 打开 Info.plist文件，在CodePushDeploymentKey中输入$(CODEPUSH_KEY)，并修改Bundle versions为三位，如图：

![](http://t1.aixinxi.net/o_1cgdb7t8f9qa8201lgl524reva.png-j.jpg)

至此，原生层的CodePush集成已经完成，接下来在React-native使用接入CodePush。

<h3>在React-native中接入CodePush</h3>

热更新根据更新的时机分为即时更新和手动更新。即时更新是应用启动时就马上下载更新文件并更新应用，手动更新是通过用户的交互行为执行了某个事件后再下载更新，本次demo演示的是即时更新。

官方文档介绍React-native下引用CodePush有两种方式，第一种方式是引用codePush高阶组件，应用在项目根组件中，也就是在App.js中引用：

```javascript
import codePush from "react-native-code-push";

class App extends Component {
}

export default codePush(App);
```

但是这样引用后打开控制台，发现CodePush报错了：

![](http://t1.aixinxi.net/o_1cgdcksva6mro57jn1b2kp0qa.png-j.jpg)

提示没有正确配置deployment key ，通过Google查了下发现也有不少人遇到跟我一样的问题，原因大概是在模拟器环境下是Debug模式，但是刚才我们在Xcode模式只配置了Release和Staging两个模式的deployment key，所以会出现上面的报错。好了，那么既然一定要在模拟器环境下进行调试，又要配置deployment key，那么就采用CodePush调用的第二种方法，使用`codePush.sync`，在`componentDidMount()`钩子中进行调用:

```javascript
import codePush from "react-native-code-push";

class App extends Component {
    ...
    componentDidMount () {
        codePush.sync({
          updateDialog: true, // 是否打开更新提示弹窗
          installMode: codePush.InstallMode.IMMEDIATE,
          mandatoryInstallMode: codePush.InstallMode.IMMEDIATE,
          deploymentKey: 'Pay3W7Nfaa3bLG9C9ZXTwMgS7zMD68d21987-8919-4d4e-8062-52c8293250cb',
          });
  	}
	...
}
export default App;
```

上面的deploymentKey在这里填入的事Staging的key，如果是要打包上线到正式环境，这里应该填入Production的key，实际项目需要定义一个区分生产环境和开发环境的宏，根据这个宏给deploymentKey赋值。

重新刷新项目（RN的代码支持热更新，只需command+d调出调试菜单刷新即可），打开控制台，看到应用启动时CodePush会检查更新并提示当前应用是最新版本：

![](http://t1.aixinxi.net/o_1cgddmef11ekcvab8bbdj1kcsa.png-j.jpg)

接下来发布新版本来检测CodePush的热更新。

<h3>发布更新包</h3>

在终端通过`code-push release-react`命令发布更新包，最简单的参数如下:

```bash
code-push release-react <appName> <platform>
```

![](http://t1.aixinxi.net/o_1cgdencv9lfl147di4psr81159a.png-j.jpg)

> `code-push release-react <appName> <platform>`这个命令会默认将更新包上传至Staging环境中，如果需要更新至Production环境可使用类似如下命令:
>
> ```
> code-push release-react <appName> <platform> --t 1.0.1 --dev false --d Production --des "update description" --m ture
> ```

执行`code-push release-react RnHotUpdateDemo ios`后会先使用`react-native bundle`命令对react-native的代码和react-native的图片资源打包，打包的路径CodePush会自己分配。

打包完成后会将打包文件上传到CodePush服务器，由于刚才在react-native端调用的是Staging的deployment key，打包资源会存放在CodePush服务器对应的Staging文件夹:

![](http://t1.aixinxi.net/o_1cgdesq7l59npl215vuhooupfa.png-j.jpg)

查看已发布的更新包:

![](http://t1.aixinxi.net/o_1cgdh0aec1ev968k15r81svtkrba.png-j.jpg)

再次打开APP，看到控制台中CodePush检查到更新并提示用户更新：

![](http://t1.aixinxi.net/o_1cgdf6vf31vv0l1h1uj9nbvkvaa.png-j.jpg)

![](http://t1.aixinxi.net/o_1cgdf7v9v566180au6vhig1824a.png-j.jpg)

选择下载，CodePush会在APP后台自动下载并刷新重载页面，控制台有如下输出,提示更新成功，之后再次进入应用CodePush都会提示改应用已经是最新版本，无需更新。

![](http://t1.aixinxi.net/o_1cgdfc3521arg1t2tntv16v81ioha.png-j.jpg)

<h3>总结</h3>

本文对一个全新的react-native项目接入React-native-code-push，从iOS环境到RN代码进行接入，最后实现了可在iOS端的热更新，期间也发现如CodePush头文件引入出错、RN层接入CodePush出错这类问题并一一解决之，最终实现了在iOS端可热更新的demo，目前该demo已托管至GitHub，有兴趣可自行查看实现(https://github.com/Geocld/RnHotUpdateDemo)。目前该demo还有很多带完善的地方：

* 支持Android端更新；
* 后台静默更新时出现更新进度；
* CodePush使用的是微软的服务器，实际情况还需搭建自己的服务器进行更新。

（完）

参考：

[React Native CodePush实践小结](https://segmentfault.com/a/1190000009642563)

[react-native-code-push](https://github.com/Microsoft/react-native-code-push)

[微软的React Native热更新 - 使用篇](https://www.jianshu.com/p/67de8aa052af)

