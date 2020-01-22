---
layout: post
title: Android电话监听功能开发及注意事项
subtitle: 
date: 2020-1-22
author: "lijiahao"
tags: ['Android']
---

前段时间接到一个需求，需要在公司内部办公APP启动后自动监听来电，根据来电号码通过HTTP请求查询号码对应的员工信息，并在系统界面上显示，这个需求看似简单，但在开发过程中还是遇到了不少问题，下面就本次功能开发中遇到的问题及注意事项进行记录。

<h3>1. 电话监听初始方案</h3>

首先就是解决电话监听问题，我们需要在电话响起的时候拿到来电号码，查了下发现Android就已经提供了`PhoneStateListener`类，可以监听来电、接听、挂断等状态，我们只需在实现一个`PhoneReceiver.java`继承`BroadcastReceiver`并在APP启动的时候进行注册监听即可，首先是`PhoneReceiver.java`实现大致代码如下：

```java
public class PhoneReceiver extends BroadcastReceiver {
  @Override
    public void onReceive(Context context, Intent intent){
        mContext = context;
        if(intent.getAction().equals(Intent.ACTION_NEW_OUTGOING_CALL)){
            Log.d("log", "拨出");
        }else{
            TelephonyManager tm = (TelephonyManager)context.getSystemService(Service.TELEPHONY_SERVICE);
            //设置一个监听器
            tm.listen(listener, PhoneStateListener.LISTEN_CALL_STATE);
        }
    }
  
  	private PhoneStateListener listener = new PhoneStateListener(){

        @Override
        public void onCallStateChanged(int state, final String incomingNumber) {
            super.onCallStateChanged(state, incomingNumber);
            Log.d("log", "state:" + state);
            switch(state){
                case TelephonyManager.CALL_STATE_IDLE:
                    Log.d("log", "挂断");
                		removeOverlay(); // 移除系统弹窗
                    break;
                case TelephonyManager.CALL_STATE_OFFHOOK:
                    Log.d("log", "接听"); // 移除系统弹窗
                		removeOverlay();
                    break;
                case TelephonyManager.CALL_STATE_RINGING:
                    // 请求接口查询电话号码，输出来电号码
                		Log.d("log", "响铃:来电号码" + incomingNumber);
                		addOverlay(); // 添加系统弹窗
                    break;
            }
        }
    };
}
```

可以从`PhoneReceiver.java`看到，在`onCallStateChanged`回调方法里，我们可以根据`state`来区分不同的电话变动状态来执行添加\移除系统弹窗的动作，并通过`incomingNumber`准确获得此次电话状态对应的电话号码。

系统弹窗的添加和删除就是使用Android提供的`WindowManager`的`addView`和`removeView`进行操作即可。对应的弹窗UI可以自行定义。

在`AndroidMainfest.xml`对这个receiver进行注册即可，注册时要注意声明使用`READ_PHONE_STATE`权限:

```xml

<manifest xmlns:android="http://schemas.android.com/apk/res/android"
          package="com.rnpr">
    <uses-permission android:name="android.permission.READ_PHONE_STATE" />

    <application>
        <receiver android:name="com.rnpr.PhoneReceiver" android:enabled="true" android:exported="false">
            <intent-filter>
                <action android:name="android.intent.action.PHONE_STATE"/>
            </intent-filter>
        </receiver>
    </application>

</manifest>
  
```

此时将代码运行起来，打个电话试试，这是可以看到已经可能在来电时弹窗了并在挂掉电话时移除弹窗了，不过如果让APP在前台的状态下多试几次，就会发现弹窗不会移除了！此时在查看`WindowManager`的view发现变成了`null`，所以在执行`wm.removeView(phoneView);`时，就会出现`View not attached to window manager`的错误，通过搜索后可以得到类似的答案：

> 如果在Dialog显示期间，该Activity因为某种原因被杀掉且又重新启动了，那么当任务结束时，Dismiss Dialog的时候WindowManager检查，就会发现该Dialog所属的Activity已经不存在了(重新启动了一次，是一个新的 Activity)，所以会报IllegalArgumentException： View not attached to window manager.

也就是说，在弹出系统弹窗期间，Activity被重启了，导致当前系统弹窗的线程被改变了，然后再次触发`removeView`操作时，找不到原来的UI线程，导致弹窗关闭失败，因此如果要安全的移除弹窗，就必须要依赖Android的生命周期机制，在生命周期内添加、移除系统弹窗，但是从`PhoneReceiver.java`的代码来看，继承自`BroadcastReceiver`的`PhoneReceiver`并没有任何生命周期，因此必须对`PhoneReceiver.java`进行改造，要有生命周期，就需要使用Android的`service`来实现电话监听功能。

<h3>2. 电话监听service方案</h3>

这个方案就是以服务的形式提供电话监听功能，需要使用的是Android的`Service`，Service有一类似于Activity完整的生命周期，在服务停止时可以执行`onDestroy`，`PhoneService.java`代码如下：

```java
public class PhoneService extends Service {
  
    /**startService()
     * 第一次调用：PhoneService()->onCreate()->onStartCommand()
     * 以后再次调用：->onStartCommand()
     * stopService()后:onDestroy()
     * */
    /**bindService()
     * 第一次调用：PhoneService()->onCreate()->onBind()->onServiceConnected()[ServiceConnection中的回调方法]
     * onbindService():只有当前Activity与Service连接->onUnbind()->onDestroy()
     * */
  
  	@Override
    public IBinder onBind(Intent intent) {
        return new Binder();
    }
  	@Override
    public boolean onUnbind(Intent intent) {
        return super.onUnbind(intent);
    }
  
   @Override
    public void onCreate() {
      super.onCreate();
      // 服务创建时进行电话监听
      phoneStateListener = new PhoneStateListener() {
            @Override
            public void onCallStateChanged(int state, String number) {
                super.onCallStateChanged(state, number);
                String currentPhoneState = null;
                SharedPreferences sharedPreferences = mContext.getSharedPreferences(NAME, MODE_PRIVATE);
                switch (state) {
                    case TelephonyManager.CALL_STATE_RINGING:
                        currentPhoneState = "Device is ringing. Call from " + number + ".\n\n";
                        Log.d(TAG, currentPhoneState);
                        break;
                    case TelephonyManager.CALL_STATE_OFFHOOK:
                        currentPhoneState = "Device call state is currently Off Hook.\n\n";
                        Log.d(TAG, currentPhoneState);
                        if (alertView != null) {
                            windowManager.removeView(alertView);
                            alertView = null;
                        }
                        break;
                    case TelephonyManager.CALL_STATE_IDLE:
                        currentPhoneState = "Device call state is currently Idle.\n\n";
                        Log.d(TAG, currentPhoneState);
                        if (alertView != null) {
                            windowManager.removeView(alertView);
                            alertView = null;
                        }
                        break;
                }
            }
        };
        telephonyManager.listen(phoneStateListener, PhoneStateListener.LISTEN_CALL_STATE);
    }
  
  	@Override
    public void onDestroy() {
        super.onDestroy();
        Log.d(TAG, "onDestroy");
        // 停止电话监听（必要代码）
        telephonyManager.listen(phoneStateListener,PhoneStateListener.LISTEN_NONE);
    }

    @Override
    public int onStartCommand (Intent intent, int flags, int startId) {
        return super.onStartCommand(intent, flags, startId);
    }
}
```

把之前`PhoneStateListener`的初始化代码放到了Service的`onCreate`中 ，然后在`onDestroy`中要记得把电话监听停了。接着在`PhoneReceiver.java`中开启服务:

```java
public class PhoneReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
      Log.d(TAG, "PhoneReceiver onReceive()");
      // 开启电话监听服务
      Intent myIntent = new Intent(context, PhoneService.class);
      context.startService(myIntent);
    }
}
```

同样的，在`AndroidMainfest.xml`中注册`receiver`和`service`:

```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
          package="com.rnpr">
    <uses-permission android:name="android.permission.READ_PHONE_STATE" />

    <application>
        <receiver android:name="com.rnpr.PhoneReceiver" android:enabled="true" android:exported="false">
            <intent-filter>
                <action android:name="android.intent.action.PHONE_STATE"/>
            </intent-filter>
        </receiver>

        <service android:name="com.rnpr.PhoneService"
            android:enabled="true"
            android:exported="true"/>
    </application>

</manifest>
```

此时再次运行代码进行测试，发现不管多少次调用来电显示，都可以正常显示和移除系统弹窗了。

<h3>3. onCallStateChanged中发起HTTP请求</h3>

`onCallStateChanged`方法里已经可以根据不同的`state`区分电话状态，并且可以获得具体的电话号码`incomingNumber`，接下来就可以发起HTTP请求获取电话的详细信息了。但是由于Android ANR机制，我们无法在`onCallStateChanged`中直接发起HTTP请求等耗时操作，如果强制在上面写相关代码，运行时会发现这段代码会直接忽略，因此我们需要“间接”地使用`asyncTask`来完成网络请求任务。

`asyncTask`是Android中实现异步任务的最简单方法之一，同时他也提供了操作UI的相关方法，因此很合适我们本次发起HTTP请求后更新UI的需求，`asyncTask`执行异步任务有下面几个步骤：
* `execute(Params... params)`:执行一个异步任务，需要我们在代码中调用此方法，触发异步任务的执行;
* `onPreExecute()`: 在execute(Params... params)被调用后立即执行，一般用来在执行后台任务前对UI做一些标记;
* `doInBackground(Params... params)`: 在onPreExecute()完成后立即执行，用于执行较为费时的操作，此方法将接收输入参数和返回计算结果。在执行过程中可以调用publishProgress(Progress... values)来更新进度信息;
* `onProgressUpdate(Progress... values)`: 在调用publishProgress(Progress... values)时，此方法被执行，直接将进度信息更新到UI组件上;
* `onPostExecute(Result result)`: 当后台操作结束时，此方法将会被调用，计算结果将做为参数传递到此方法中，直接将结果显示到UI组件上。

`asyncTask`的数据流如下图：
![asyncTask](/img/asyncTask.png)

`asyncTask`的使用需要注意以下几点：
* 不要手动调用onPreExecute()，doInBackground(Params... params)，onProgressUpdate(Progress... values)，onPostExecute(Result result)这几个方法
* 不能在doInBackground(Params... params)中更改UI组件的信息

在本次需求中在`doInBackground`中进行HTTP请求，然后将结果返回到`onPostExecute`中接着进行系统弹窗的显示及即可。

<h3>4. Android保活相关</h3>
到这里，电话监听的主要功能已经完成了，但还有个问题，由于Android的系统省电机制，如果APP不在省电白名单内，那么当APP退出后，前面的`PhoneService`在5-10分钟后就会强制kill掉，那么此时服务将停止，除非再次启动APP重启这个服务，这个问题也是常见的Android保活问题，为了能让APP在后台长时间运行，目前有几个典型的保活做法：在屏幕锁屏时启动一个1px像素的Activity、启动一个隐藏的通知栏、在后台播放无声音频，这些做法目的都是要APP长时间保持运行状态，具体的做法可以参考[这个项目](https://github.com/herojing/KeepProcessLive)。

但这些五花八门的保活做法并不能保证APP 100%保活，尤其在Android 8之后，只要APP不是在省电白名单内，一段时间后系统还是会把APP的进程给kill掉，我在实际项目中加入保活代码后，应用持续状态从之前的5-10分钟延长到1个多小时，如果要实现完美的APP后台运行，有以下建议：

* 引导用户手动到系统设置将APP加入省电白名单，这也是最简单高效的做法；
* 联系Android系统厂商，将APP加入到厂商白名单，目前来看微信是在部分OS内做到了这一点，但是这个需要大量的资金支持，此方法不推荐。

(完)