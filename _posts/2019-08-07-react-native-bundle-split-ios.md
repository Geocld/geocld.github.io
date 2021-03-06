---
layout: post
title: 低版本react-native bundle拆包---iOS异步加载实践(三)
subtitle: 本文介绍iOS端下如何将拆分的jsbundle进行异步加载
date: 2019-8-7
author: "lijiahao"
tags: ['React-Native', 'iOS']
---



本系列前两篇文章[低版本react-native bundle拆包---jsbundle的拆解实践(一)](http://geocld.github.io/2019/07/16/react-native-bundle-split/)、[低版本react-native bundle拆包---Android异步加载实践(二)](http://geocld.github.io/2019/08/01/react-native-bundle-split-android/)分别介绍了如何将React-native生产包拆分成基础包(common.jsbundle)和业务包(business.jsbundle)并在Android端进行业务包接入、分步加载jsbundle，本篇文章将介绍如何在iOS端进行jsbundle的分步加载。



> 注1：
>
> 本文将全面涉及iOS开发以及Objective-c语言，如果对这二者不了解那本文对你来说将比较难懂，建议有知识储备再进行阅读。

>
>
>注2:
>
>本文实验代码基于react-native v0.55.4，但本文主要涉及react-native原生方面的jsbundle加载，理论上加载方式在任何版本的react-native下都适用。



<h3>react-native在iOS下的启动流程简介</h3>

按照惯例我们先来过一下iOS端的RN加载流程，在[低版本react-native bundle拆包---Android异步加载实践(二)](http://geocld.github.io/2019/08/01/react-native-bundle-split-android/)中我们看到RN在Android下加载涉及了`Application`、`Activity`、`Delegate`等诸多概念，在iOS下的加载就简单得多，来看下RN初始化项目ios文件夹的内容，核心文件就一个`AppDelegate.m`，这个类似于Android的`Application`，即在应用首次打开的时候会执行里面的内容，`AppDelegate.m`的内容也很简单，主要就是RN的初始化和视图加载:

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

`AppDelegate.m`就是获取jsbundle的本地路径或线上路径，然后使用`RCTRootView`初始化一个视图，初始化传入jsbundle的路径和appkey，最后再将视图添加到iOS的`viewController`中，这样iOS端整个RN的加载渲染就完成了，是不是很简单？



<h3>接入多个jsbundle</h3>

了解了iOS端的加载流程后，很容易就可以知道，如果要接入多个jsbundle，那么只需要新创建一个`viewController`，再按照`AppDelegate.m`的`RootView`初始化方法加载不同的jsbundle路径和appKey就可以轻松实现。



<h3>jsbundle分步加载</h3>

<h4>1.加载基础包</h4>

在`AppDelegate`中，react-native初始化视图是使用了`RCTRootView`类提供的`initWithBundleURL`方法来加载一个完整的jsbundle，事实上，查看`RCTRootView`类的源码，发现这个类还提供了`initWithBridge`方法来初始化RN视图，react-native bridge在iOS的概念就类似Android的`reactContext`，因此，先使用`RCTBridge`类加载基础包创建一个bridge:

```objective-c
#import "RCTBridge.h"

NSURL *jsCodeLocation = [NSURL URLWithString:[[NSBundle mainBundle] pathForResource:@"common.jsbundle" ofType:nil]];
  
bridge = [[RCTBridge alloc] initWithBundleURL:jsCodeLocation
                                 moduleProvider:nil launchOptions:launchOptions];
```

至此，一个包含基础包运行逻辑的js bridge已经完成，接下来就是在这个bridge的基础上运行业务包内的代码，从而得到完整的bridge。

<h4>2.加载业务包</h4>

js bridge加载业务包代码，需要使用react-native`RCTBridge`的`executeSourceCode`方法，该方法传入的内容为js代码并执行，但这个方法并没有开发，因此，我们需要手动将这个方法暴露出来，项目根目录下新创建一个`RCTBridge.h`，内容如下：

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

<h4>3.加载视图</h4>

最后就是使用第一点里提到`RCTRootView`类里的`initWithBridge`将分别加载了基础包和业务包的bridge传入，加上appKey初始化一个`RCTRootView`，再添加到`viewController`的`view`即可：

```objective-c
RCTRootView * root = [[RCTRootView alloc] initWithBridge:bridge moduleName:@"RN_bundle_split_business" initialProperties:initialProperties];

self.view = root;
```



<h3>小结</h3>
至此，react-native打包拆包、Android端和iOS端分步加载的基本思路和关键点已经介绍完毕，可以看出，整个的加载分包流程还是要归功于javascript的灵活性，可以随时注入新的js代码。react-native能把js加载和视图绑定设计得非常巧妙，而且提供的接口刚好也适合分包，完全不需要额外的源代码修改和使用反射。另外在进行分步加载操作时也可以根据本文的思路自有发挥加载的时序，如加载时序利用好了可以做到进入业务视图秒加载的效果。



（完）



参考:

[React native拆包之 原生加载多bundle](https://blog.csdn.net/tyro_smallnew/article/details/83660345)

