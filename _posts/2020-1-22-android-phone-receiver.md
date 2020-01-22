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

此时将代码运行起来，打个电话试试，此时可以看到已经可以在来电时弹窗并在挂掉电话时移除弹窗了，不过如果让APP在前台的状态下多试几次，就会发现弹窗不会移除了！此时在查看`WindowManager`的view发现变成了`null`，所以在执行`wm.removeView(phoneView)`时，就会出现`View not attached to window manager`的错误，通过搜索后可以得到类似的答案：

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

把之前`PhoneStateListener`的初始化代码放到了Service的`onCreate`中 ，然后在`onDestroy`中要记得把电话监听停了，接着在`PhoneReceiver.java`中开启服务:

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