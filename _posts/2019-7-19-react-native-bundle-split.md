---
layout: post
title: 低版本react-native bundle拆包---jsbundle的拆解实践(一)
subtitle: 本文以0.55版本react-native为例，介绍拆包思路以及如何通过metro拆包
date: 2019-7-16
author: "lijiahao"
tags: ['React-Native']
---



<h2>背景介绍</h2>
公司部分业务APP以react-native作为技术栈，且当前有一个完整的APP，不同的团队负责不同的业务开发，工作成果以子工程的形式加入到现有APP中，随着业务开发的迭代加快以及更多新的业务线的加入，子工程体积增加，进而主工程的体积也跟着增加，同时热更新以全量包的形式进行，也大大增加了用户更新时的流量消耗，因此业务拆包势在必行，拆包的目标如下：

1. 减小业务打包生成的jsbundle体积，进而减小接入的APP的体积以及子工程热更新时下载体积，提升用户体验；
2. 实现基础jsbundle和业务jsbundle的分离，多个业务共用一个基础包，使业务jsbundle更纯粹，提高开发效率；
3. 优化子工程的jsbundle加载，实现基础包预加载，减小加载业务bundle时的白屏时间。

本系列文章将以react-native 0.55为具体例子，从以下几个方面讲述如何拆包以及如何使用拆出来的jsbundle进行异步加载:

1. 0.52~0.55版本如何改造官方metro打包工具，使react-native bundle命令支持基础包和业务包的拆分；
2. 在原react-native应用的APP（之后称之为主工程）中，如何加入另一个react-native应用的子工程；
3. 主工程原生层如何预加载基础包，在进入对应的子工程viewController/Activity的时候加载业务包。

> 注: 因为Facebook对react-native 0.56以上的metro拆包已经趋于完善并开放了`createModuleIdFactory`方法的接口，如果你的react-native版本在0.56以上，那么第一点你只需关注相关方法实现即可，第2、3点是基于APP原生的思路及实现，理论上在任意版本的react-native都适用。

本系列文章适合以下人群阅读：
熟悉react-native加载原理、打包流程，同时希望了解0.50以上RN异步加载jsbundle过程同时了解原生开发的开发人员。

不适用以下人群：
react-native初学者，不了解APP原生开发及objective-c/Java语言的开发人员。



<h2>react-native jsbundle解析</h2>
在进行如何进行业务拆包之前，我们先对react-native的jsbundle做一个简单的认识。

通过react-native bundle命令可对当前RN项目进行打包，以iOS为例，具体命令例子如下：

```
react-native bundle --platform ios --dev false --entry-file index.js --bundle-output __test__/example/index.ios.jsbundle --assets-dest __test__/example/
```

在对应目录下即生成对应的`index.ios.jsbundle`和相应的assets文件夹，`index.ios.jsbundle`内容大致如下：

```
var 
__DEV__ = false,
__BUNDLE_START_TIME__ = this.nativePerformanceNow ? nativePerformanceNow() : Date.now(),
process = this.process || {};
process.env=process.env || {};
process.env.NODE_ENV = "production";
!(function(r) {
	"use strict";
 
	r.__r = o, 
 
	r.__d = function(r,i,n) {
		if(null != e[i]) 
			return;
		e[i] = {
			dependencyMap:n,factory:r,hasError:!1,importedAll:t,importedDefault:t,isInitialized:!1,publicModule:{exports:{}}
		}
	},
 
	r.__c = n;
 
   ....
   
})();
__d(function(r,o,t,i,n){t.exports=r.ErrorUtils},18,[]);
...
...
__d(function(c,e,t,a,n){var r=e(n[0]);r(r.S,'Object',{create:e(n[1])})},506,[431,460]);
require(46);
require(11);
```

可以看到jsbundle大致包含了4部分：

1. var 声明的变量，对当前运行环境的定义，bundle 的启动时间、Process进程环境相关信息;
2. (function() { })() 闭包中定义的代码块，其中定义了对 define（__d）、  require（__r）、clear（__c） 的支持，以及 module（react-native及第三方dependences依赖的module） 的加载逻辑;
3. __d 定义的代码块，包括RN框架源码 js 部分、自定义js代码部分、图片资源信息，供 require 引入使用;
4. require定义的代码块，找到 `__d` 定义的代码块并执行，其中`require`中的数字即为 `__d`定义行中最后出现的那个数字。

可以看到，如果每个业务都单独打一个完整包，那么每个包都会包含第一部分和第二部分，因此我们的目标也就是把第一部分和第二部分提取出来，放到基础包`common.jsbundle`中，到时业务包共用此基础包。



<h2>业务拆包</h2>
业务拆包有两个方法：1.使用google的[diff-match-patch](https://github.com/google/diff-match-patch)工具计算业务patch，在集成到主工程并需要加载业务页面时，再合成一个完整的jsbundle进行加载；2.扩展react-native官方打包工具metro，将打包后的业务代码提取出来，下面一一介绍。

<h3>diff-match-patch拆包</h3>
Google给`diff-match-patch`提供了多语言版本，包括Java、Objective-c、Python及JavaScript等，因此很很容易用在跨平台的react-native应用中。首先我们在没有业务代码的RN框架进行打包，得到`common.ios.jsbundle`，接下来再添加业务代码，如在一个业务页面添加代码`<Text>Hello World</Text>`，打包，得到业务包`business.ios.bundle`，接下来我们写一段脚本，将我们添加的这段代码通过diff-match-patch提取出来，以补丁(patch)的形式作为业务拆包:

``` javascript
// split.js
const DiffMatchPatch = require('diff-match-patch');
const fs = require('fs');
 
const dmp = new DiffMatchPatch();

fs.readFile(`${process.cwd()}/common.ios.jsbundle`, 'utf8', (e, data) => {
  let commonData = data;
  fs.readFile(`${process.cwd()}/business.ios.jsbundle`, 'utf8', (e, data) => {
    let businessData = data;
    const patch = dmp.patch_make(commonData, businessData); // 生成补丁
    const patchText = dmp.patch_toText(patch); // 生成补丁文本
     fs.writeFileSync(`${process.cwd()}/diff.ios.patch`, patchText);
  });
});

```
使用node执行此脚本，得到`diff.ios.patch`，内容如下：

```
@@ -761599,32 +761599,83 @@
 ent(s.Text,null,
+%22Hello World%22),o.default.createElement(s.Text,null,
 this.state.param
```



可以看到，`diff-match-patch`生成的patch记录了业务包和公共包的差异部分，差异部分以特殊的符号记录了对应位置、字符等信息。



业务包体积方面，原`business.ios.jsbundle`大小为1.2MB，经过`diff-match-patch`处理得到的`diff-mch_apply`仅为121B，在子应用整合到主应用时，业务只需提供一个`.patch`文件，主工程再根据需要使用`diff-match-patch`的[patch_apply](https://github.com/google/diff-match-patch/wiki/API#patch_applypatches-text1--text2-results)方法将`diff.ios.jsbundle`和`common.ios.js`重新合成一个完整的`business.ios.jsbundle`即可。



到了这里通过`diff-match-patch`拆业务包得到`xxx.patch`的方案看起来很完美，但是我们最后没有采取这个方案，因为`diff-match-patch`在实际的业务包处理过程中存在以下大坑:

1. `diff-match-patch`得到的patch是记录业务包和基础包的差异，并且是文本记录，除了记录单纯的业务代码差异外，还加入了额外的补丁信息，实际业务开发过程中，差异部分是很多的，因此一个原1000行的业务jsbundle经过`diff-match-patch`处理，得到的`diff.patch`文件能达到2000多行！原业务包大小为3.6MB，补丁包大小居然达到7.2MB！这大大违背了我们拆包的初衷。
2. `diff-match-patch`的`patch_apply`方法在Android中存在严重的效率问题，性能一般的机型，光是合并刚才上面Hello world的例子拆出来的仅为121B的`diff.patch`，就花了3200ms左右！如果补丁文件再大一些，合并效率会更低，因此完整的业务拆包`diff-match-patch`并不适用。



<h3>使用metro拆包</h3>
metro是react-native的官方打包工具及dev server工具，在执行`react-native bundle`或在RN项目下执行`npm start`时，实际是调用metro-builder来进行加载打包任务的，针对拆包工作，0.56之后版本的RN依赖的metro已经趋于完善，开放了`--config <path / to / config>`参数来配置提供自定义文件，通过这个配置选项，我们就可以通过两个关键方法配置来修改打包配置，这两个方法分别是:`createModuleIdFactory`，`processModuleFilter`。



* `createModuleIdFactory`负责固定 module 的ID。在上文的`jsbundle解析`中，`__d`中定义的各个module后都有一个数字表示，并在最后的require方法中进行调用（如require(41)），这其中的数字就是`createModuleIdFactory`方法生成的，如果添加了module，那么ID会重新生成，如果要做一个基础包，那么公共module的ID必须是固定的，因此0.56+版本的RN可以通过此方法的接口来将module的ID固定，0.52~0.55的RN依赖的metro也用到了这个方法，只是没暴露出来，因此可以通过修改源码的方式来实现0.56+版本相同的效果。
* `processModuleFilter` 负责过滤掉基础包的内容模块，0.56以下版本没有此方法，因此需要我们自己来实现这个过滤方法。

<h4>1. 固定模块ID</h4>
首先是固定module ID，我们来看metro `createModuleIdFactory`的实现，在`metro/src/lib/createModuleIdFactory.js`看到该方法， 很简单:

```javascript
function createModuleIdFactory() {
  const fileToIdMap = new Map();
    let nextId = 0;
    return path => {
      let id = fileToIdMap.get(path);
      if (typeof id !== 'number') {
        id = nextId++;
        fileToIdMap.set(path, id);
      }
      return id;
    };
}

module.exports = createModuleIdFactory;
```

从上述源码也可以看出，系统使用整数型的方式，从0开始遍历所有模块，并依次使 Id 增加 1。所以我们可以修改此处逻辑，以模块路径名称的方式作为Id即可。

```javascript
function createModuleIdFactory() {

  if (!process.env.__PROD__) { // debug模式
    const fileToIdMap = new Map();
    let nextId = 0;
    return path => {
      let id = fileToIdMap.get(path);
      if (typeof id !== 'number') {
        id = nextId++;
        fileToIdMap.set(path, id);
      }
      return id;
    };
  } else { // 生产打包使用具体包路径代替id，方便拆包处理
    // 定义项目根目录路径
    const projectRootPath = `${process.cwd()}`;
    // path 为模块路径名称
    return path => {
      let moduleName = '';
      if(path.indexOf('node_modules\\react-native\\Libraries\\') > 0) {
          moduleName = path.substr(path.lastIndexOf('\\') + 1);
      } else if(path.indexOf(projectRootPath)==0){
          moduleName = path.substr(projectRootPath.length + 1);
      }
  
      moduleName = moduleName.replace('.js', '');
      moduleName = moduleName.replace('.png', '');
      moduleName = moduleName.replace('.jpg', '');
      moduleName = moduleName.replace(/\\/g, '_'); // 适配Windows平台路径问题
      moduleName = moduleName.replace(/\//g, '_'); // 适配macos平台路径问题
  
      return moduleName;
    };
  }
  
}

module.exports = createModuleIdFactory;
```

这里我加了一个`process.env.__PROD__`的判断，即在开发模式下依旧使用原模式（**因为我发现全局改的话开发模式会运行失败**）。在打包的时候注入一个`__PROD__`环境变量才会进入自定义固定ID那段方法，在这段代码中，依据模块路径 path，在其基础上进行自定义路径名称，并作为 Id 返回，使用模块的路径作为ID，保证返回的ID是绝对固定的。

<h4>2. 基础包和业务包打包</h4>
在完成了打包源码修改后，接下来就是要分别打出基础模块与业务模块的jsbundle文件。在打包之前，需要我们分别定义好基础模块与业务模块文件，核心代码如下：

```javascript
// base.js
require('react-native');
require('react');
...这里可以引入更多的第三方模块及自己的公共模块
```



```javascript
// index.js
class App extends Component {
    render() {
        return (
            <View>
                <Text>
                    hello world
                </Text>
            </View>
        )
    }
}

AppRegistry.registerComponent("business", () => App);
```



> 注1：base.js为基础模块入口，index.js为业务业务模块入口
>
> 注2：**base.js没有`AppRegistry.registerComponent`入口，业务模块必须要有这个入口，这个一定要注意，这个是网上很多类似拆包文章没有说清楚的事！！！**



接下来就是通过`react-native bundle`命令来进行打包了，需要两个不同的命令，区别在于打包入口文件参数（--entry-file）不一样:



基础包:

```bash
react-native bundle --platform ios --dev false --entry-file base.js --bundle-output __test__/example/common.ios.jsbundle --assets-dest __test__/ios/
```



业务包:

```bash
react-native bundle --platform ios --dev false --entry-file index.js --bundle-output __test__/example/business.ios.jsbundle --assets-dest __test__/ios/
```



打完包打开jsbundle看下`require`及`__d`对应的module ID，看下是不是都变成模块路径了，通过这个也可以直观明了的看到jsbundle每一行对应的模块。



<h4>3.求出差异包 </h4>
我们已经通过 react-native bundle 将基础包（common.jsbundle）和业务包（business.jsbundle）生成，接下来就是要生成一个业务包独有的内容，及差异包（diff.jsbundle）。关于这个差异包，网上流传的方法最多的方法就是通过linux的`comm`命令，命令如下:

```Bash
comm -2 -3 ./__test__/ios/business.ios.jsbundle ./__test__/ios/common.ios.jsbundle > ./__test__/ios/diff.ios.jsbundle
```



选项-2表示不显示在第二个文件中出现的内容， -3表示不显示同时在两个文件中都出现的内容，通过这个组合就可以生成业务模块独有的代码。在实际实践中，我发现求出来的`diff.jsbundle`依旧比较大，观察`diff.jsbundle`中的内容，发现`diff.jsbundle`和`common.jsbundle`中依旧有相同的内容！通过查这个`comm`命令的使用方法得知，这个命令在对有序文本的过滤效果是比较好的，但是面对我们杂乱无章的jsbundle文本，过滤效果就会出现bug，因此comm命令并不能求解出最优`diff.jsbundle`。



那么换个思路，`common.jsbundle`和`business.jsbundle`都是纯文本文件，我们已经把各个模块的ID固定，而且每个模块的定义(也就是jsbundle中的__d)都是作为文本的固定行排列，两者相同的行肯定是一模一样的，那么就很好办了，只要对`business.jsbundle`进行逐行扫描，判断每一行是否有在`common.jsbundle`出现过，如没有出现过，那么肯定就是业务独有的内容，再将这些差异逐行写入`diff.jsbundle`，这样既保证了内容的唯一性，也保证了模块定义的顺序，在后续的异步加载jsbundle时不至于出现业务模块定义错乱的问题！实现的node.js代码如下(ps: 编程语言和求差算法可以进行进一步优化):

```javascript
// diff.js: 找出common和business的不同行

var fs = require('fs');
var readline = require('readline');

function readFileToArr(fReadName,callback){
  var fRead = fs.createReadStream(fReadName);
  var objReadline = readline.createInterface({
      input:fRead
  });
  var arr = new Array();
  objReadline.on('line',function (line) {
      arr.push(line);
      //console.log('line:'+ line);
  });
  objReadline.on('close',function () {
     // console.log(arr);
      callback(arr);
  });
}

var argvs = process.argv.splice(2);
var commonFile = argvs[0]; // common.ios.jsbundle
var businessFile = argvs[1]; // business.ios.jsbundle
var diffOut = argvs[2]; // diff.ios.jsbundle
readFileToArr(commonFile, function (c_data) {
  var diff = [];
  var commonArrs = c_data;
  readFileToArr(businessFile, function (b_data) {
    var businessArrs = b_data;
    for (let i = 0; i < businessArrs.length; i++) {
      if (commonArrs.indexOf(businessArrs[i]) === -1) { // business中独有的行
        diff.push(businessArrs[i]);
      }
    }
    // console.log(diff.length);
    var newContent = diff.join('\n');
    fs.writeFileSync(diffOut, newContent); // 生成diff.ios.jsbundle
  });
});
```



使用方法:

```bash
node ./__test__/diff.js ./__test__/ios/common.ios.jsbundle ./__test__/ios/business.ios.jsbundle ./__test__/ios/diff.ios.jsbundle
```

至此，我们的基础包`base.jsbundle`和业务包`diff.jsbundle`就已经完成了，只要交付给主工程应用，主工程预集成基础包`base.jsbundle`，并在启动时预加载基础包，在进入不同业务时按需加载`diff.jsbundle`，这个我在后续章节会有详细介绍。



<h3>小结</h3>
本章重点讲解了react-native jsbundle在`diff-match-patch`和`metro`的拆包实践，可以看出，针对0.56以下版本的RN，最优解依旧是修改metro源码，进行拆包，而且源码修改量也不大，清晰易懂，效果明显。对于`diff-match-patch`的拆包则不适于拆解完整的业务包，但在代码量改动极小的热更新方面，使用`diff-match-patch`来进行补丁更新，效果会很明显。



