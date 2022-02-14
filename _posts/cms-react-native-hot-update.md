---
layout: post
title: react-native 热更新优化实践
subtitle: 
date: 2019-11-13
author: "lijiahao"
tags: ['React Native', 'iOS', 'Android']
---



<h2>1. 背景介绍</h2>
公司部分业务APP以react-native作为技术栈，当前有一个完整的APP，不同的团队负责不同的业务开发，工作成果以子工程的形式加入到现有APP中，随着业务开发的迭代加快以及更多新的业务线的加入，子工程体积增加，进而主工程的体积也跟着增加，同时热更新以全量包的形式进行，也大大增加了用户更新时的流量消耗，因此业务拆包势在必行，拆包的目标如下：

1. 减小业务打包生成的jsbundle体积，进而减小接入的APP的体积以及子工程热更新时下载体积，提升用户体验；
2. 实现基础jsbundle和业务jsbundle的分离，多个业务共用一个基础包，使业务jsbundle更纯粹，提高开发效率；
3. 优化子工程的jsbundle加载，实现基础包预加载，减小加载业务bundle时的白屏时间。

本系列文章将以react-native 0.55为具体例子，从以下几个方面讲述如何拆包以及如何对基础包和业务包进行异步加载:

1. 0.52~0.55版本如何改造官方metro打包工具，使react-native bundle命令支持基础包和业务包的拆分；
2. 在原react-native应用的APP（之后称之为主工程）中，如何加入另一个react-native应用的子工程；
3. 主工程原生层如何预加载基础包，在进入对应的子工程`viewController/Activity`的时候加载业务包。

> 注: 因为Facebook对react-native 0.56以上的metro拆包已经趋于完善并开放了`createModuleIdFactory`方法的接口，如果你的react-native版本在0.56以上，那么第一点你只需关注相关方法实现即可，第2、3点是基于APP原生的思路及实现，理论上在任意版本的react-native都适用。

本文章适合以下人群阅读：
熟悉react-native加载原理、打包流程，同时希望了解0.50以上RN异步加载jsbundle过程同时了解原生开发的开发人员。

不适用以下人群：
react-native初学者，不了解APP原生开发或objective-c/Java语言的开发人员。



<h2>2. react-native jsbundle解析</h2>
在进行如何进行业务拆包之前，我们先对react-native的jsbundle做一个简单的认识。

通过react-native bundle命令可对当前RN项目进行打包，以iOS为例，具体命令例子如下：

```
react-native bundle --platform ios --dev false --entry-file index.js --bundle-output __test__/example/index.ios.jsbundle --assets-dest __test__/example/
```

在对应目录下即生成对应的`index.ios.jsbundle`和相应的assets文件夹，`index.ios.jsbundle`内容大致如下：

```javascript
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

1. var 声明的全局变量，对当前运行环境的定义和Process进程环境相关信息;
2. (function() { })() 闭包中定义的代码块，其中定义了对 define（__d）、  require（__r）、clear（__c） 的支持，以及 module（react-native及第三方dependences依赖的module） 的加载逻辑;
3. __d 定义的代码块，包括RN框架源码 js 部分、自定义js代码部分、图片资源信息，最后以 require方式 引入使用;
4. require定义的代码块，找到 `__d` 定义的代码块并执行，其中`require`中的数字即为 `__d`定义行中最后出现的那个数字。

可以看到，如果每个业务都单独打一个完整包，那么每个包都会包含第一部分和第二部分，因此我们的目标也就是把第一部分和第二部分提取出来，放到基础包`common.jsbundle`中，之后业务包共用此基础包。



## 3. 业务拆包

业务拆包有两个方法：1.使用google的[diff-match-patch](https://github.com/google/diff-match-patch)工具计算业务patch，在集成到主工程并需要加载业务页面时，再合成一个完整的jsbundle进行加载；2.扩展react-native官方打包工具metro，将打包后的业务代码提取出来，下面将对着两种方法进行介绍。



### 3.1 diff-match-patch拆包

Google给`diff-match-patch`提供了多语言版本，包括Java、Objective-c、Python及JavaScript等，因此很很容易用在跨平台的react-native应用中。首先我们在没有业务代码的RN框架进行打包，得到`common.ios.jsbundle`，接下来再添加业务代码，如在一个业务页面添加代码`<Text>Hello World</Text>`，打包，得到业务包`business.ios.bundle`，接下来我们写一段脚本，将我们添加的这段代码通过diff-match-patch提取出来，以补丁(patch)的形式作为业务拆包:

```javascript
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



到了这里通过`diff-match-patch`拆业务包得到`xxx.patch`的方案看起来很完美，但是我们使用拆包方案时没有采取这个方案，因为`diff-match-patch`在实际的业务包处理过程中存在以下大坑:

1. `diff-match-patch`得到的patch是记录业务包和基础包的差异，并且是没有经过压缩的文本记录，除了记录单纯的业务代码差异外，还加入了额外的补丁信息。实际业务开发过程中，差异部分是很多的，因此一个原1000行的业务jsbundle经过`diff-match-patch`处理，得到的`diff.patch`文件能达到2000多行！原业务包大小为3.6MB，补丁包大小居然达到7.2MB！这大大违背了我们拆包的初衷。
2. `diff-match-patch`的`patch_apply`方法在Android中存在严重的效率问题，性能一般的机型，光是合并刚才上面Hello world的例子拆出来的仅为121B的`diff.patch`，就花了3200ms左右！如果补丁文件再大一些，合并效率会更低，因此完整的业务拆包`diff-match-patch`并不适用。



### 3.2 metro拆包

`metro`是react-native的官方打包工具及dev server工具，在执行`react-native bundle`或在RN项目下执行`npm start`时，实际是调用metro-builder来进行加载打包任务的，类似与WEB开发常用的webpack。针对拆包工作，0.56之后版本的RN依赖的metro已经趋于完善，开放了`--config <path / to / config>`参数来配置提供自定义文件，通过这个配置选项，我们就可以通过两个关键方法配置来修改打包配置，这两个方法分别是:`createModuleIdFactory`，`processModuleFilter`。



- `createModuleIdFactory`负责固定 module 的ID。在上文的`jsbundle解析`中，`__d`中定义的各个module后都有一个数字表示，并在最后的require方法中进行调用（如require(41)），这其中的数字就是`createModuleIdFactory`方法生成的，如果添加了module，那么ID会重新生成，如果要做一个基础包，那么公共module的ID必须是固定的，因此0.56+版本的RN可以通过此方法的接口来将module的ID固定，0.52~0.55的RN依赖的metro也用到了这个方法，只是没暴露出来，因此可以通过修改源码的方式来实现0.56+版本相同的效果。
- `processModuleFilter` 负责过滤掉基础包的内容模块，0.56以下版本没有此方法，因此需要我们自己来实现这个过滤方法。

#### 3.2.1  固定模块ID

首先是固定module ID，我们来看metro `createModuleIdFactory`的实现，在`metro/src/lib/createModuleIdFactory.js`看到该方法， 很简单:

```javascript
// createModuleIdFactory.js
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

#### 3.2.2 基础包和业务包打包

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



#### 3.2.3 求出差异包

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

至此，我们的基础包`base.jsbundle`和业务包`diff.jsbundle`就已经完成了，只要交付给主工程应用，主工程预集成基础包`base.jsbundle`，并在启动时预加载基础包，在进入不同业务时按需加载`diff.jsbundle`，接下来的工作就是如何在native端以此加载这两个jsbundle了。



## 4. 拆分包在Android下接入

###  4.1 react-native在Android下的启动流程简介

在react-native项目刚创建时，项目android目录下原生代码有两个:`MainActivity.java`和`MainApplication.java`，`MainActivity.java`为原生层应用程序的入口文件，`MainApplication.java`作为整体应用程序的初始化入口文件，`MainActivity.java`内容如下:

```java
public class MainActivity extends ReactActivity {

    /**
     * 返回index.js下AppRegistry.registerComponent()方法传入的appKey，
     * 用来渲染视图。
     */
    @Override
    protected String getMainComponentName() {
        return "RN_bundle_split";
    }
}
```

`MainActivity.java`继承了`ReactActivity`类，通过传入的appKey来渲染对应的react-native界面。

`MainApplication.java`内容如下:

```Java
public class MainApplication extends Application implements ReactApplication {

  private final ReactNativeHost mReactNativeHost = new ReactNativeHost(this) {
    @Override
    public boolean getUseDeveloperSupport() {
      return BuildConfig.DEBUG;
    }

    @Override
    protected List<ReactPackage> getPackages() {
      return Arrays.<ReactPackage>asList(
          new MainReactPackage()
      );
    }

    @Override
    protected String getJSMainModuleName() {
      return "index";
    }
  };

  @Override
  public ReactNativeHost getReactNativeHost() {
    return mReactNativeHost;
  }

  @Override
  public void onCreate() {
    super.onCreate();
    SoLoader.init(this, /* native exopackage */ false);
  }
}
```

`MainApplication.java`主要完成三件事：

1. 实现 ReactApplication 接口，重写`getReactNativeHost `方法，返回`ReactNativeHos`t实例;
2. 定义并初始化 `ReactNativeHost`，实现 getUseDeveloperSupport、getPackages、getJSMainModuleName 方法，完成初始化设置;
3. 在` onCreate` 生命周期方法中，调用SoLoader的init方法，启动C++层逻辑代码的初始化加载。



其中`ReactNativeHost`可以当做是一个react-native运行的环境，如果需要通过加载新的jsbundle来加入新的业务页面，那么也就需要一个新的ReactNativeHost，同时也需要一个新的reactActivity来渲染业务界面。



那么疑问来了，`MainActivity.java`和`MainApplication.java`是怎么联系起来从而将react-native项目完整的跑起来呢？前面有提到，MainActivity继承了ReactActivity类的，因此一个react-native界面的具体实现就是从`ReactActivity`实现的，来大致看下`ReactActivity`的源码（部分关键代码）：

```java
/**
 * Base Activity for React Native applications.
 */
public abstract class ReactActivity extends Activity
implements DefaultHardwareBackBtnHandler, PermissionAwareActivity {
  private final ReactActivityDelegate mDelegate;

  protected ReactActivity() {
    mDelegate = createReactActivityDelegate();
  }
  
  /**
   * 返回从JavaScript注册的主要组件的名称，用于组件的渲染。
   * e.g. "RN_bundle_split"
   */
  protected @Nullable String getMainComponentName() {
    return null;
  }

  /**
   * Called at construction time, override if you have a custom delegate implementation.
   */
  protected ReactActivityDelegate createReactActivityDelegate() {
    return new ReactActivityDelegate(this, getMainComponentName());
  }

  @Override
  protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    mDelegate.onCreate(savedInstanceState);
  }
  
   /**
   * 获取 ReactNativeHost 实例
   */
  protected final ReactNativeHost getReactNativeHost() {
    return mDelegate.getReactNativeHost();
  }

  /**
   * 获取 ReactInstanceManager 实例
   */
  protected final ReactInstanceManager getReactInstanceManager() {
    return mDelegate.getReactInstanceManager();
  }

  /**
   * 加载 JSBundle
   */
  protected final void loadApp(String appKey) {
    mDelegate.loadApp(appKey);
  }
}
```

ReactActivity类中实现如下：

1. 继承 Activity，实现 DefaultHardwareBackBtnHandler、PermissionAwareActivity 两个接口，重写其中的返回事件，及请求权限的方法。
2. 构造函数中调用 createReactActivityDelegate 方法，传入this、和 getMainComponentName 方法返回值，创建 ReactActivityDelegate实例。
3. 重写 Activity 生命周期方法，调用 delegate 实例的对应生命周期方法。
4. 定义获取 ReactNativeHost、ReactInstanceManager 实例方法。
5. 定义 loadApp方法。

很明显，ReactActivity 中采用了委托的方式，将所有行为全权交给了 ReactActivityDelegate 去处理。好处也很明显，降低代码耦合，提升了可扩展性。也就是`ReactActivityDelegate`将`MainActivity.java`和`MainApplication.java`的行为关联了起来。



至此，我们至少简单了解了react-native从启动到界面呈现需要做的事：

1. `MainActivity.java`定义appKey，指定界面的渲染入口；
2. `MainApplication.java`实例化`ReactNativeHost`及其他一些react-native的环境配置项；
3. `ReactActivity`中实例化`ReactActivityDelegate`将`MainActivity.java`和`MainApplication.java`的行为关联起来，最后在`ReactActivityDelegate`中调用`createRootView`渲染视图。

在接入多个jsbundle时，我们就要依据这些react-native的加载原理来进行接入。



### 4.2 接入多个jsbundle

依据react-native的加载原理，接入多个jsbundle还要互不影响，那么就需要一个新建一个`ReactNativeHost`，我们新建一个`MyReactApplication`类来初始化`ReactNativeHost`，同时提供`getReactNativeHost`供接下来的自定义`delegate`调用:

```Java
// MyReactApplication.java
public class MyReactApplication extends Application implements ReactApplication {
    public static MyReactApplication mInstance;
    private WeakReference<Application> appReference;
    public static ReactNativeHost mReactNativeHost;
    
    private MyReactApplication() {
    }

    public static MyReactApplication getInstance() {
        if (mInstance == null) {
            synchronized (MyReactApplication.class) {
                if (mInstance == null) {
                    mInstance = new MyReactApplication();
                }
            }
        }
        return mInstance;
    }

    // 初始化ReactNativeHost
    public void init(Application application) {
        appReference = new WeakReference<>(application);
        mReactNativeHost = new ReactNativeHost(application) {
            @Override
            protected String getBundleAssetName() {
                // 指向业务包
                return "business.jsbundle";
            }

            @Override
            public boolean getUseDeveloperSupport() {
                return false;
            }

            @Override
            protected List<ReactPackage> getPackages() {
                return Arrays.<ReactPackage>asList(
                        new MainReactPackage()
                );
            }
        };
    }


    @Override
    public ReactNativeHost getReactNativeHost() {
        return mReactNativeHost;
    }
}
```

有了`MyReactApplication`这个类，需要对这个类初始化，可以在`MainApplication`的`onCreate`中进行初始化:

```java
public class MainApplication extends Application implements ReactApplication {
    ...
  @Override
  public void onCreate() {
    super.onCreate();
    SoLoader.init(this, /* native exopackage */ false);
    // MyReactApplication初始化
    MyReactApplication.getInstance().init(this);
  }
}
```



我们还要实现自定义的`ReactActivityDelegate`来服务于新的react-native环境，下面是自定义实现的`MyReactActivityDelegate`，主要是`getReactNativeHost`方法是获取的是`MyReactApplication`的`ReactNativeHost`，其他方法直接使用`ReactActivityDelegate`类中的私有方法:

```Java
public class MyReactActivityDelegate extends ReactActivityDelegate {
    ...
    @Override
    public ReactNativeHost getReactNativeHost() {
        return MyReactApplication.getInstance().getReactNativeHost();
    }
    ...
}
```



最后，就是实现一个新的`SubActivity`来渲染新的jsbundle界面了，`SubActivity`代码很简单，需要返回appKey，需要注意的是继承`ReactActivity`类，还要覆盖`ReactActivityDelegate`：

```java
public class SubActivity extends ReactActivity {

    @Nullable
    @Override
    protected String getMainComponentName() {
        return "RN_bundle_split_business";
    }

    @Override
    protected ReactActivityDelegate createReactActivityDelegate() {
        // 使用MyReactActivityDelegate覆盖原ReactActivityDelegate
        return new MyReactActivityDelegate(this, getMainComponentName());
    }

}
```

至此，一个可以正常加载jsbundle的`Activity`已经完成，使用native方法`startActivity`跳转即可。



### 4.3 jsbundle异步加载

现在我们已经拥有一个可以和主项目react-native环境相对独立的子项目rn环境，那么现在问题来了，从上面的`MyReactApplication`初始化`ReactNativeHost`的时候看到，我们最后用到的jsbundle只有一个`business.jsbundle`，我们拆包得到的是`common.jsbundle`和`business.jsbundle`两个包，那怎么实现先加载`common.jsbundle`再加载`business.jsbundle`呢，我们再来回顾下子应用`SubActivity`从初始化到渲染界面流程:

1. `MyReactApplication`在需要加载`Activity`的时候初始化，此时也将`ReactNativeHost`初始化;
2. `SubActivity`初始化`MyReactActivityDelegate`，在`MyReactActivityDelegate`初始化过程中通过`startReactApplication` 执行 `createReactContextInBackground() `方法实现 ReactContext 的创建及 Bundle 的加载逻辑，最终将视图绑定，完成渲染。

因此，RN加载 js 代码、绑定视图的逻辑可以分开异步执行，利用这个特性，就可以将加载基础包代码、加载业务包代码以及最后绑定视图分步执行，我们在刚才`SubActivity`的基础上进行改造。

#### 4.3.1 初始化 ReactContext 上下文环境，加载基础包

这次我们改造的是之前的`SubActivity`，这次我们将这个Activity继承普通的`Activity`类:

```
public class SubActivity extends Activity 
	implements DefaultHardwareBackBtnHandler, PermissionAwareActivity {
            ...
}
```

接下来就是加载基础包，加载基础包也就是将`MyReactApplication`中的`ReactNativeHost`初始化的包改成`common.jsbundle`:

```Java
...
public void init(Application application) {
        appReference = new WeakReference<>(application);
        mReactNativeHost = new ReactNativeHost(application) {
            @Override
            protected String getBundleAssetName() {
                return "common.jsbundle";
            }

            @Override
            public boolean getUseDeveloperSupport() {
                return false;
            }

            @Override
            protected List<ReactPackage> getPackages() {
                return Arrays.<ReactPackage>asList(
                        new MainReactPackage()
                );
            }
        };
    }
...
```

同时将`MyReactApplication`和`MyReactActivityDelegate`放在`SubActivity.java`的`onCreate`中进行初始化，同时执行`createReactContextInBackground()`完成`ReactContext`的初始化，监听基础包初始化完成，核心代码如下:

```Java
    @Override
    protected void onCreate(final Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        Log.d("rndebug", "初始化MyReactActivityDelegate");
        mDelegate = new MyReactActivityDelegate(this, "RN_bundle_split_business");

        Log.d("rndebug", "初始化MyReactApplication");
        MyReactApplication.getInstance().init(MainApplication.mainApplication);


        final ReactInstanceManager manager = getReactNativeHost().getReactInstanceManager();

        manager.addReactInstanceEventListener(new ReactInstanceManager.ReactInstanceEventListener() {
            @Override
            public void onReactContextInitialized(ReactContext context) {
                Log.d("rndebug", "基础包加载完毕");
                loadScript(); // 加载业务包
                initView(); // 加载视图
                manager.removeReactInstanceEventListener(this);
            }
        });
        getReactNativeHost().getReactInstanceManager().createReactContextInBackground();

    }
```

#### 4.3.2 加载业务包

上（1）过程中，我们监听了基础包加载完成的回调，在回调里面执行了`loadScript()`加载业务包，这个方法是在(1)初始化的`ReactContext`的基础上，通过调用 `CatalystInstance` 实例的 `loadScriptFromAssets()` 方法完成对业务jsBundle 文件的加载，核心代码如下:

```Java
public static void loadScriptFromAsset(Context context,
                                           CatalystInstance instance,
                                           String assetName,boolean loadSynchronously) {
        String source = assetName;
        if(!assetName.startsWith("assets://")) {
            source = "assets://" + assetName;
        }
        ((CatalystInstanceImpl)instance).loadScriptFromAssets(context.getAssets(), source,loadSynchronously);
    }
```

#### 4.3.3 加载视图

待基础包、业务包都加载完成后，调用`initView()`方法即完成视图加载:

```Java
protected void initView(){
	mDelegate.onCreate(null);
}
```

事实上，`mDelegate.onCreate()`内执行的代码如下:

```java
// MyReactActivityDelegate.java
...
    @Override
    public void onCreate(Bundle savedInstanceState) {
        if (mMainComponentName != null) {
            loadApp(mMainComponentName);
        }
        mDoubleTapReloadRecognizer = new DoubleTapReloadRecognizer();
    }

    @Override
    public void loadApp(String appKey) {
        if (mReactRootView != null) {
            throw new IllegalStateException("Cannot loadApp while app is already running.");
        }
        mReactRootView = createRootView();
        mReactRootView.startReactApplication(
                getReactNativeHost().getReactInstanceManager(),
                appKey,
                getLaunchOptions());
        getPlainActivity().setContentView(mReactRootView);
    }
...
```

这样业务rn界面`SubActivity`就完成了jsbundle的异步加载，也可以根据不同的业务包按需加载。

#### 4.3.4 Android接入小结

从上面的实践来看，Android下react-native基于JavaScript的设计还是很灵活的，通过`createReactContextInBackground()`的调用实现了基础包的预先加载，在通过`loadScriptFromAssets()`的调用加载业务包，在不使用反射的情况下实现了业务模块的异步加载，降低了反射所带来的性能影响。

## 5. iOS端接入拆分包

### 5.1 react-native在iOS下的启动流程简介

与Android下`Application`、`Activity`、`Delegate`等诸多概念不同，react-native在iOS下的加载简单得多，启动核心文件就一个`AppDelegate.m`，这个类似于Android的`Application`，即在应用首次打开的时候会执行里面的内容，`AppDelegate.m`的内容也很简单，主要是RN的初始化和视图加载:

```objective-c
@implementation AppDelegate
  - (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
  NSURL *jsCodeLocation;
  jsCodeLocation = [[RCTBundleURLProvider sharedSettings] jsBundleURLForBundleRoot:@"index" fallbackResource:nil];
  
  // 初始化react-native rootview
  RCTRootView *rootView = [[RCTRootView alloc] initWithBundleURL:jsCodeLocation
                                                      moduleName:@"RN_bundle_split"
                                               initialProperties:nil
                                                   launchOptions:launchOptions];
  rootView.backgroundColor = [[UIColor alloc] initWithRed:1.0f green:1.0f blue:1.0f alpha:1];

  self.window = [[UIWindow alloc] initWithFrame:[UIScreen mainScreen].bounds];
  UIViewController *rootViewController = [UIViewController new];
  
  // 将react-native view加载到viewController中
  rootViewController.view = rootView;
  self.window.rootViewController = rootViewController;
  [self.window makeKeyAndVisible];
  return YES;
}
```

`AppDelegate.m`就是获取jsbundle的本地路径或线上路径，然后使用`RCTRootView`初始化一个视图，初始化传入jsbundle的路径和appkey，最后再将视图添加到iOS的`viewController`中，这样iOS端整个RN的加载渲染就完成了。

### 5.2 接入多个jsbundle

基于iOS的启动流程，如果要接入多个jsbundle，只需要新创建一个`viewController`，再按照`AppDelegate.m`的`RootView`初始化方法加载不同的jsbundle路径和appKey就可以轻松实现。



### 5.3 jsbundle分步加载

#### 5.3.1 加载基础包

在`AppDelegate`中，react-native初始化视图是使用了`RCTRootView`类提供的`initWithBundleURL`方法来加载一个完整的jsbundle，事实上，查看`RCTRootView`类的源码，发现这个类还提供了`initWithBridge`方法来初始化RN视图，react-native bridge在iOS的概念就类似Android的`reactContext`，因此，先使用`RCTBridge`类加载基础包创建一个bridge:

```objective-c
#import "RCTBridge.h"

NSURL *jsCodeLocation = [NSURL URLWithString:[[NSBundle mainBundle] pathForResource:@"common.jsbundle" ofType:nil]];
  
bridge = [[RCTBridge alloc] initWithBundleURL:jsCodeLocation
                                 moduleProvider:nil launchOptions:launchOptions];
```

接下来就是在这个bridge的基础上运行业务包内的代码，从而得到完整的bridge。

#### 5.3.2 加载业务包

js bridge加载业务包代码，需要使用react-native`RCTBridge`的`executeSourceCode`方法，该方法传入的内容为js代码并执行，但这个方法并没有开放给开发者使用，因此，我们需要手动将这个方法暴露出来，项目根目录下新创建一个`RCTBridge.h`：

```objective-c
#import <Foundation/Foundation.h>

@interface RCTBridge (RnLoadJS)

 - (void)executeSourceCode:(NSData *)sourceCode sync:(BOOL)sync;

@end
```

然后在需要加载业务包的地方`#import "RCTBridge.h"`，读取业务包的内容并进行加载:

```objective-c
NSLog(@"subapp:业务包加载开始");
NSString * busJsCodeLocation = [[NSBundle mainBundle] pathForResource:@"business.ios.jsbundle" ofType:nil];

NSData * sourceBus = [NSData dataWithContentsOfFile:busJsCodeLocation options:NSDataReadingMappedIfSafe error:nil];

[(RCTBridge *)bridge.batchedBridge executeSourceCode:sourceBus sync:YES];
NSLog(@"subapp:业务包加载结束");
```

#### 5.3.3 加载视图

最后就是使用第一点里提到`RCTRootView`类里的`initWithBridge`将分别加载了基础包和业务包的bridge传入，加上appKey初始化一个`RCTRootView`，再添加到`viewController`的`view`即可：

```objective-c
RCTRootView * root = [[RCTRootView alloc] initWithBridge:bridge moduleName:@"RN_bundle_split_business" initialProperties:initialProperties];

self.view = root;
```



## 6. 静态资源压缩及热更新方案

静态资源目前的优化控制在文件级别，通过diff命令可计算出相邻版本的差异包。

![图片](/img/diff.png)

因此不管是jsbundle还是静态资源的热更新，目前的优化方案依然是寻求局部最优解，差异包的分发仅仅针对版本号为上一版本的客户端，而面向更老版本的客户端，我们依然采用全量包下发的方案。这是一个工程化的整体考量，首先针对全版本做差异化分发势必大大增加版本发布工作量与复杂度，另外随着业务子应用逐步趋于稳定，新版本覆盖率往往很高，因此为少数老版本做差异化分发，代价较大。

以上是招商证券在react-native热更新优化方面的实践，目前基于react-native技术栈及相关优化方案已在公司移动办公和内部业务线中全面铺开。

