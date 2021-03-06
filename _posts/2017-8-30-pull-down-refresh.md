---
layout: post
title: 一个移动端下拉刷新组件的开发思路及牵出的知识点
subtitle: ""
date: 2017-8-30
author: "lijiahao"
tags: [JavaScript]
---

最近项目需要需要在移动端做一个下拉刷新组件，其中涉及到移动端手势操作和触摸结束回调操作，手势操作之前没有怎么接触过，因此也就顺带研究了下移动端touchstart、touchmove和touchend这几个事件，同时因为把下拉刷新封装成一个组件，在父组件回调函数的事件如何传回下拉组件也有一个比较新的思路，觉得有必要记录一下。

<h3>移动端触摸事件</h3>

移动端触摸事件的核心即touch事件，touch事件有四种：

- touchstart 手指接触屏幕时触发
- touchmove 手指在屏幕上移动时触发
- touched 手指从屏幕上离开时触发
- touchcancel 系统停止跟踪触摸时触发

要做到一个可识别出“下拉”动作的组件，满足`按下-下拉-释放`动作的话使用touchstart、touchmove和touched即可，为此可以先预定于三个动作的函数，表示每个动作需要处理的东西：

```javascript
onTouchstart: function (e) {
	...
}
onTouchmove: function (e) {
	...
}
onTouchend: function (e) {
	...
}
```

此外还需要将上面定义的函数和元素进行事件绑定，在这里先和系统的window进行绑定:

```javascript
var el = window;
el.addEventListener('touchstart', this.onTouchstart, false);
el.addEventListener('touchmove', this.onTouchmove, false);
el.addEventListener('touchend', this.onTouchstart, false);
```

这样一个支持手势操作的函数框架就搭建起来了，那么该怎么使用这几个事件实现手势操作了，我们手势操作的“动作值”在哪里呢？

其实在进行`addEventListener`事件绑定时，javascript会给绑定的函数传一个类似event的参数，这个参数是一个对象，也就是上述动作函数中定义的`e`，在touch事件中，这个event就是`TouchEvent`。通过浏览器输出的`TouchEvent`如下：

![1](https://s1.simimg.com/2017/08/30/hfYh.png)



`TouchEvent`对象包含了touch事件触发对象、类型、触发时某些按键是否按下以及触发的坐标，其中对我们最有用的就是触发坐标`touches`，`touches`是一个数组，他的内容如下:

![2](https://s1.simimg.com/2017/08/30/hiPH.png)

他所包含的属性含义如下：

**clientX**：触摸目标在视口中的x坐标。

**clientY**：触摸目标在视口中的y坐标。

**identifier**：标识触摸的唯一ID。

**pageX**：触摸目标在页面中的x坐标。

**pageY**：触摸目标在页面中的y坐标。

**screenX**：触摸目标在屏幕中的x坐标。

**screenY**：触摸目标在屏幕中的y坐标。

在我们的例子中，我们以window作为触摸目标，那么client和page的坐标是一样的。x轴和y轴以被绑定元素的左上角为起点，x轴以向右为正方向，y轴以向下为正方向。

因此，针对下拉操作，我们只需关心Y坐标的移动即可。在touchstart中利用`clientY`可以知道触摸的起始点，在touchmove中实时计算移动的点和起始点的距离`diffY`，当超出可下拉的距离时启动可刷新开关，待touchend触发时执行相应的操作。大概的代码处理如下:

```javascript
const Y_DIFF_MAX = 100;
var scrollEl = document.body // 将body作为滚动监听元素
var startPulldown = false, // 开始下拉开关
          startY = 0, // 下拉的起始坐标
          moveY = 0, // 移动距离
          canRefresh = false;
onTouchstart = (e) => {
  var scrollTop = scrollEl.scrollTop;
  startPulldown = (scrollTop == 0);
  if (startPulldown) { // 如果body是处于页面顶部就开始执行下拉刷新操作
    startY = e.touches[0].clientY; // 获得起始点的坐标
  }
}
onTouchmove = (e) => {
  if (!startPulldown) return;
  moveY = e.touches[0].clientY;
  var yDiff = moveY - startY;
  if (yDiff > 0) {
    e.preventDefault();
    this.yDiff = Math.min(parseInt(yDiff / 2), Y_DIFF_MAX);
    canRefresh = this.yDiff >= 60;
  }
}
onTouchend = (e) => {
  startPulldown = false;
  if (!canRefresh) {
    // 下拉距离不够, 不刷新;
    this.yDiff = 0;
  } else {
    // 刷新, 执行回调;
   	callback()
  }
}
callback = () => {
    ...
}
```

至此，一个下拉->出发回调的下拉刷新组件的主干程序已完成，你可以根据自身的业务需求完善以上代码。

<h3>回调的巧妙利用</h3>

在这里需要结合Vue组件来说，还是以上代码，这个下拉刷新一般封装成组件，方便代码复用，在下拉到达触发回调函数的条件时，需要下拉组件`$emit`一个事件给父组件，父组件在`$emit`中进行回调操作。如果父组件完成回调函数后下拉组件还需要根据父组件的回调结果进行下一步操作(如收起刷新按钮)，如果在Vue 1.0+里，一般的做法是从父组件`broacast`把回调结果给下拉组件；如果是在Vue 2.0+里，需要下拉组件先在`$root`绑定一个事件，父组件完成回调操作后，需要`$root.emit`将事件传递给下拉组件，不管怎么样，这个下拉组件如果想和父组件通信，通信信息必须通过第三方，这样看来不是很优雅，那么有没有一对一的方案呢，答案是有的，通过`Promise`可以将回调结果传递回子组件，直接看代码：

```javascript
this.onTouchend = (e) => {
          startPulldown = false;
          if (!canRefresh) {
            // console.log('下拉距离不够, 不刷新');
            this.yDiff = 0;
          } else {
            // console.log('刷新, 执行回调');
            // 5秒超时后恢复
            var resumeTimer = setTimeout(() => {
              console.log('time out')
              this.yDiff = 0;
            }, TIME_OUT);
            canRefresh = false;
            // ------------------重点在这---------------------------------
            if (typeof callback === 'function') {
              callback().then(() => { // 父组件完成回调后再进行其他操作
                // console.log('success');
                clearTimeout(resumeTimer);
                this.yDiff = 0;
              }).catch(() => {
                clearTimeout(resumeTimer);
                this.yDiff = 0;
              });
            } else {
              clearTimeout(resumeTimer);
              this.yDiff = 0;
            }
          }
        }
```

因此，父组件给下拉组件绑定的回调函数就必须是一个`promise`:

```javascript
mounted: function () {
  // 绑定组件，并把回调函数当做一个promise，将结果传回子组件
  this.$refs.pull_down_refresh.bindElement(null, () => {
    return new Promise((resolve, reject) => {
      this.catchData().then(() => {
        resolve();
      });
    });
  });
}
```

下拉组件需要声明一个`bindElement`方法：

```javascript
methods: {
  bindElement: function(el, callback) {
    ...
  }
}
```

<h3>启发</h3>

通过这个下拉组件的开发主要有两点启发：

1.针对一些在页面顶部的手势操作，需要`touchstart`、`touchmove`和`touched`这三个事件同时使用，同时配合触摸的Y坐标使用，这个下拉组件的触摸事件也可以很好的解决微信浏览器里下拉后出现的黑色底的问题，只要不设置callback回调即可；

2.如果多个组件之间存在异步的事件通信，不妨试试`promise`，`promise`可以无条件的把一个组件的执行结果传递给另一个组件。