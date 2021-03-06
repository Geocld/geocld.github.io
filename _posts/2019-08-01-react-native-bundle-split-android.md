---
layout: post
title: 低版本react-native bundle拆包---Android异步加载实践(二)
subtitle: 本文介绍Android端下如何将拆分的jsbundle进行异步加载
date: 2019-8-1
author: "lijiahao"
tags: ['React-Native', 'Android']
---



在上一篇文章[低版本react-native bundle拆包---jsbundle的拆解实践(一)](http://geocld.github.io/2019/07/16/react-native-bundle-split/)已经介绍了如何通过修改react-native 0.55版本的metro实现模块ID固定并通过自定义脚本将业务代码抽离出来，从而得到基础包`common.jsbundle`和业务包`business.jsbundle`，本文将介绍如何在Android端进行改造，在原有react-native项目的基础下接入业务页面，并在进入业务页面时先加载业务页面（Activity）时先加载基础包，再加载业务包，因此具体的需求如下:



1. 主项目为react-native项目，如何在不影响主项目运行的条件下接入业务包，也就是同一个项目下如何接入多个jsbundle；
2. 业务页面如何实现`common.jsbundle`和`business.jsbundle`异步加载。



> 注：
>
> 本文将全面涉及Android开发以及Java语言，如果对这二者不了解那本文对你来说将比较难懂，建议有知识储备再进行阅读。



<h3>react-native在Android下的启动流程简介</h3>

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



<h3>接入多个jsbundle</h3>

依据react-native的加载原理，接入多个jsbundle还要互不影响，那么就需要一个新建一个`ReactNativeHost`，我们新建一个`MyReactApplication`类来初始化`ReactNativeHost`，同时提供`getReactNativeHost`供接下来的自定义`delegate`调用:

```Java
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

    public Application getApplication() {
        return appReference.get();
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



<h3>jsbundle异步加载</h3>

现在我们已经拥有一个可以和主项目react-native环境相对独立的子项目rn环境，那么现在问题来了，从上面的`MyReactApplication`初始化`ReactNativeHost`的时候看到，我们最后用到的jsbundle只有一个`business.jsbundle`，我们拆包得到的是`common.jsbundle`和`business.jsbundle`两个包，那怎么实现先加载`common.jsbundle`再加载`business.jsbundle`呢，我们再来回顾下子应用`SubActivity`从初始化到渲染界面流程:

1. `MyReactApplication`在需要加载`Activity`的时候初始化，此时也将`ReactNativeHost`初始化;
2. `SubActivity`初始化`MyReactActivityDelegate`，在`MyReactActivityDelegate`初始化过程中通过`startReactApplication` 执行 `createReactContextInBackground() `方法实现 ReactContext 的创建及 Bundle 的加载逻辑，最终将视图绑定，完成渲染。

因此，RN加载 js 代码、绑定视图的逻辑可以分开异步执行，利用这个特性，就可以将加载基础包代码、加载业务包代码以及最后绑定视图分步执行，我们在刚才`SubActivity`的基础上进行改造。

<h4>1.初始化 ReactContext 上下文环境，加载基础包</h4>

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

<h4>2.加载业务包</h4>

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

<h4>3.加载视图</h4>

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

<h3>小结</h3>

从上面的实践来看，react-native基于JavaScript的设计还是很灵活的，通过`createReactContextInBackground()`的调用实现了基础包的预先加载，在通过`loadScriptFromAssets()`的调用加载业务包，在不使用反射的情况下实现了业务模块的异步加载，降低了反射所带来的性能影响，事实上上面的实践操作中存在很多react-native存在的bug，比如多次加载重名jsbundle导致的`reactContext`不正确、退出业务activity时`reactContext`没有完全卸载等等，这些要根据具体场景灵活处理。



