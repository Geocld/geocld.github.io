---
layout: post
title: Vue.js自定义指令开发笔记
subtitle: "本文将对如何在Vue.js 1.0及2.0上进行自定义指令开发进行介绍"
date: 2016-12-30
author: "lijiahao"
tags: [Vue.js]
---

Vue.js指令在官方文档中描述比较简单，对Vue.js指令不太了解的话如果需要写一个自定义指令往往不知道从何下手，最近跟着项目从Vue.js 1.0升级至2.0，之间也开发了几个1.0和2.0的自定义指令，对自定义指令开发有了粗浅的认识，本文将以一个具体的表单验证指令来学习如何开发一个自定义指令，同时了解vue.js 1.0和2.0的自定义指令的差异。

<h4>指令需求明确</h4>

本文将以一个具体的手机号码表单验证指令来描述Vue.js自定义指令的开发过程，这个手机号码表单验证指令需要有以下功能：

1. 绑定某个具体元素下的input元素，在页面加载后及自动加验证机制绑定在该元素上；
2. 指令可以取到当前input的实时数据，在input失去焦点（blur）后及时验证输入手机号码的合法性；
3. 如果指令内部验证不合法，触发Vue实例下的一个具体方法事件

通过这个功能比较绕的指令开发，最后我们可以了解到自定义指令传参、自定义钩子、事件绑定、指令外外部传递事件等具体用法。

<h4>Vue.js 1.0自定义指令</h4>

先根据Vue.js 1.0的官方文档[自定义指令](http://v1.vuejs.org/guide/custom-directive.html)，可以看到自定义指令的基本钩子函数如下：

```javascript
Vue.directive('my-directive', {
  bind: function () {
    // 指令与被绑定元素第一次绑定时触发，通常做一些事件监听的初始化
  },
  update: function (newValue, oldValue) {
    // 被绑定元素内容发生变化时触发，可接受参数，在这里也可以进行事件监听的初始化
  },
  unbind: function () {
    // 指令与元素解绑时触发，比如通过路由转跳页面时需要解绑指令
  }
})
```

可以看到三个基本的钩子函数，基本的用法已经写在注释中，在我们的电话验证指令中，我们需要在接受外部参数，同时元素也需要进行事件触发，因此我们把指令的功能都放在update钩子中：

```javascript
update: function(fn) {
  var self = this; // 在这里this指向的是指令
  if (typeof fn !== 'function') {
    return false
  }
  // 这里将外部方法与指令内部方法绑定，这样在指令内可以直接使用this.handler来触发外部方法
  self.handler = function() {
    fn.call(self);
  }
  //对绑定的元素进行事件监听，通过self.el可以访问到指令绑定的元素
  self.el.getElementsByTagName('input')[0].addEventListener('blur', function () {
    self.checkout(self.params.input_value); //正则验证，通过类似self.fn调用,这里看到的self.params.input_value是外部传到指令内的值，下面有具体的介绍
  });
},
```

正则验证方法如下：

```javascript
checkout: function(value) {
  var filter = /^1[358]\d{9}$/;
  if (!filter.test(value)) {
  	this.handler()
  }
}
```

事件绑定和回调已经处理，接下来就是如何把元素的值传到指令内部进行验证，在上面update钩子中我们看到了`self.params.input_value`这样的写法，这其实就是通过自定义指令params参数传递进来的：

```javascript
Vue.directive('test', {
  params: ['input_value'],// 外部传递参数，可以多个，类似props
  acceptStatement: true, // 这里表示可以为指令表达式传参
  update: function(fn) {
    ...
  },
  checkout: function(value) {
    ...
  }
})
```

经过上面的处理，一个可以进行电话号码验证的自定义指令已经完成，来看看具体的使用，

```javascript
<div id='test' v-cloak>
  <!-- 指令回调函数为hello，写在实例外部 -->
  <div v-test="hello" :input_value="value">
  	<input type="text" v-model=value>
  </div>
</div>
<script>
// 指令注册，命名为test，在使用的时候写法为v-test
Vue.directive('test', {
  params: ['input_value'],
  acceptStatement: true,
  update: function(fn) {
    var self = this;
    if (typeof fn !== 'function') {
    	return false
  }
  self.handler = function() {
  	fn.call(self);
  }

  self.el.getElementsByTagName('input')[0].addEventListener('blur', function () {
    self.checkout(self.params.input_value);
    });
  },
  checkout: function(value) {
    var filter = /^1[358]\d{9}$/;
    if (!filter.test(value)) {
    	this.handler()
    }
  }
})
var demo = new Vue({
  el: '#test',
  data: function() {
    return {
    	value: ''
    }
},
methods: {
  hello: function() {
    // alert('触发外部回调fn')
    console.log('手机号码格式不正确！')
    }
  }
});
</script>
```

总结一下Vue.js 1.0指令的注意事项：

1. 根据需求（是否需要多次触发，是否需要监听实时值）来决定在`bind`还是`update`钩子上进行指令功能注册；
2. 需要指令回调函数，需要自行存一个handler方法，后续进行的回调；
3. 需要向指令传递参数，使用`params`参数，用法类似`props`
4. 值得注意的是，自定义指令中，this指向的是指令自身，既不是绑定的dom，也不是Vue实例，如需拿到绑定的dom，需要使用`this.el`

<h4>Vue.js 2.0自定义指令</h4>

Vue.js 2.0自定义指令 API较1.0的有很大的不同，这里同样实现一个验证电话指令来说明。

先看看2.0的钩子函数变化，比较1.0，除了bind，update，unbind三个钩子，还多了inserted和componentUpdated，官方的解释是：

> `inserted`: 被绑定元素插入父节点时调用（父节点存在即可调用，不必存在于 document 中）。
>
> `componentUpdated`: 被绑定元素所在模板完成一次更新周期时调用。

在本案例中我们没有用到这两个钩子，读者可以根据对官方文档的解释按需使用2.0新增的钩子。

Vue.js 2.0的自定义指令钩子都有钩子参数，而且都相同，这点也和1.0有所不同（1.0中只有update都可以传参），这也就意味着在任何一个钩子中都可以进行参数传递以及事件绑定。而且针对在上文1.0实现的指令中使用的update钩子，1.0中update是**当绑定的元素**值发生变化时触发，但是在了2.0中，则变为**被绑定元素所在的模板更新时调用，而不论绑定值是否变化**，这就意味着：**如果当前页面有多个元素绑定同一个指令，一旦任意一个元素的值发生变化，全部元素的指令就会同时触发！**这明显不符合指令的最初需求（及只有在当前元素最后输入结束后再检查内部的值是否合法并执行回调函数）。因此针对我们所需的验证指令，在2.0中，将事件监听绑定和回调执行放在bind函数中，说的有点不清楚，看如下代码就明白了：

```javascript
bind: function(el, binding) { // el是绑定指令的元素, binding是一个对象，包含了指令的绑定值、参数等属性，具体参阅官方文档
  var value = binding.value; // 传递给指令的值
  var input_value = value.input_value;
  el.handler = function () { // This directive.handler
    value.methods.call(this, value);
  };

  el.getElementsByTagName('input')[0].addEventListener('blur', function () {
    checkout(el.getElementsByTagName('input')[0].value); // 由于将事件监听绑定放在了bind中，在元素blur时需要使用原生方法拿到input的值
  });
  
  //工具函数
  function checkout (value) {
    var filter = /^1[358]\d{9}$/;
    if (!filter.test(value)) {
      el.handler()
    }
  }
}
```

接下来看整体的代码理解自定义指令是如何传参和回调的：

```javascript
<div id='test' v-cloak>
  <div v-test="{methods: hello}">
  	<input type="text" v-model=value>
  </div>
</div>
    
<script>
      Vue.directive('test', {
      bind: function(el, binding) { // el是绑定指令的元素
        var value = binding.value; // 传递给指令的值
        var input_value = value.input_value;
        el.handler = function () { // This directive.handler
          value.methods.call(this, value);
        };

        el.getElementsByTagName('input')[0].addEventListener('blur', function () {
          checkout(el.getElementsByTagName('input')[0].value);
        });

        function checkout (value) {
          var filter = /^1[358]\d{9}$/;
          if (!filter.test(value)) {
            el.handler()
          }
        }
      }
    })
    var demo = new Vue({
      el: '#test',
      data: function() {
        return {
          value: '111',
          value2: ''
        }
      },
      methods: {
        hello: function() {
          // alert('触发外部fn')
          console.log('手机号码格式不正确！')
        }
      }
    });
</script>
```

在模板中通过对象字面量的形式传递参数，本例传递了一个回调函数，其他的工具函数较1.0的不同在于直接将工具函数放在钩子函数中，不能再使用`this.fn`的形式访问工具函数。

总结一下Vue.js 2.0指令的注意事项：

1. 指令中没有`this`关键字，指令中通过`el`可以直接拿到指令绑定的元素;
2. 需要传递回调函数及其他参数，统一通过对象字面量的形式传递；
3. `update`钩子会触发当前所有已绑定的元素，而不管该元素有没有更新值。

<h4>指令的模块化写法</h4>

通过上面的例子可以大致了解Vue.js自定义指令的基本开发思想，如果需要将自定义指令模块化，除了自定义指令的核心代码外，还需要加上模块化外层代码，如下：

```javascript
;(function () {
  var vue_directive = {};
  var dir_name = {
    bind: function() {...},
    update: function() {...},
    unbind: function() {...}
  };
  // 模块导出
  vue_directive.install = function (Vue) {
    Vue.directive('dir_name', dir_name);
  };

  if (typeof exports === 'object') {
    module.exports = vue_directive;
  } else if (typeof define === 'function' && define.amd) {
    define([], function () {
      return vue_directive
    })
  } else if (window.Vue) {
    window.vue_directive = vue_directive;
    Vue.use(vue_directive);
  }
 })();
```

这样我们就可以直接使用`Vue.use()`使用自定义指令。

<h4>总结</h4>

正如Vuejs官方文档所说：

> 代码复用的主要形式和抽象是组件——然而，有的情况下,你仍然需要对纯 DOM 元素进行底层操作,这时候就会用到自定义指令

平时Vue.js升级至2.0后，鼓励的是使用组件的形式去实现代码的复用，因此2.0的自定义指令较1.0弱化了自定义指令的数据响应能力，在从1.0往2.0迁移时如涉及自定义指令的变化，要重点关注。

本文的所涉及的代码已经托管在[vue-directive-example](https://github.com/Geocld/vue-directive-example)中，如果你想学习如何游刃有余的开发一个Vue自定义指令，强烈建议你按照本文亲自动手做一下。

（完）