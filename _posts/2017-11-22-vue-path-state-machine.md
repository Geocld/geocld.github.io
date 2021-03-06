---
layout: post
title: Vue1+源码-深入解析Vue的path状态机
subtitle: "本文将对Vue1.0.26源码的path状态机进行详细的介绍"
date: 2017-11-22
author: "lijiahao"
tags: ['Vue', 'JavaScript']
---

本文将深入解析Vue源码中的path状态机，介绍path状态机如何工作，以及状态机的应用情景。

> ps.我参考的是Vue 1.0.26的源码，下面将主要针对源码中`/parsers/path.js`和`/parser/expression.js`对Vue的path状态机进行说明。

<h3>什么是有限状态机</h3>

有限状态机（finite-state machine，简称FSM），是一种可以描述状态和动作的数学模型，在组件开发中常用在描述组件的状态和状态转换时触发的动作。有限状态机有以下特点：

- 状态有限
- 某一时刻必定处于一个状态
- 在特定的条件下，一个状态可以向另一个状态转换

这么看FSM有点抽象，现在具一个具体的例子：现在需要实现一个开关组件，开关组件有开和关两个状态。对应的，在“开”状态时，可以触发的动作是“关闭”；在“关”状态时，可以触发的动作是“开”，两个状态可以相互转换，使用JavaScript实现如下：

```javascript
function StateMechine () {
	this.currentState = 'on'; // 当前状态
}

// 状态列表，每个状态有对应的可转换状态以及动作
StateMechine.prototype.states = {
	'on': {
		to: 'off',
		action: 'turnOff'
	},
	'off': {
		to: 'on',
		action: 'turnOn'
	}
}

StateMechine.prototype.turn = function () {
	var old_status = this.currentState;
	console.log('当前状态是' + old_status + '，之后将状态切换为' + this.states[old_status].to)
	this.currentState = this.states[old_status].to;
	this[this.states[old_status].action]();
}

StateMechine.prototype.turnOn = function () {
	console.log('执行turn on transition');
}

StateMechine.prototype.turnOff = function () {
	console.log('执行turn off transition');
}
```

对这个开关对的进行实例化，并执行状态转换动作：

```javascript
var my_state = new StateMechine();

my_state.turn(); // 先把开关关闭
setTimeout(() => { // 1s后重新打开开关
	my_state.turn();
}, 1000)
```

执行结果如下：

```
> 当前状态是on，之后将状态切换为off
> 执行turn off transition
> 当前状态是off，之后将状态切换为on
> 执行turn on transition
```

从上面的例子可以看到，使用状态机描述一个组件，可以很好的解决回调函数、事件监听、发布/订阅等问题，在逻辑上更合理，也更易于降低代码的复杂度。

<h3>Vue的path状态机概述</h3>

Vue解析路径字符串也使用到了状态机，例如templae中通过prop传递这样一个参数:

```
<div :data="a.b.c"></div>
```

在Vue进行模板解析编译时，会把`a.b.c`解析成字符串，那么怎么把这个字符串再次解析成JavaScript可以直接访问的状态呢，此时Vue的path状态机就派上用场了，例如上面的`a.b.c`路径的例子，Vue状态机会把这个路径解析成`['a', 'b', 'c']`，通过`a[pathAry[0]][pathAry[1]]`的形式即可访问到对应路径的属性。**说到这里，有个问题就来了**:对于这种字符串，不是可以直接使用Function直接拼接path字符串就可以直接取到这个值了吗？如下：

```javascript
var parse = new Function('a', 'return a.b.c;')
parse(a) // 可以直接得到a.b.c
```

确实如此，如果是只是为了得到路径属性的值，可以直接通过拼接的形式取到，这也是源码expression.js中`makeGetterFn`所实现的：

```
// expression.js
function makeGetterFn (body) {
    return new Function('scope', 'return ' + body + ';')
}
```

但是如果Vue需要对路径中的每一层对象都**进行响应式改造**就需要使用path状态机了。

<h3>Path状态机的状态和动作</h3>

Vue的Path状态机（pathStateMachine）也是一个有限状态机，也就必然少不了`状态`和`动作`，path解析最后的结果以数组(keys)的形式保存。

Vue 的状态机模式解析 path 实际上是将 path 的每个索引的字符视为一个状态，将接下来一个字符视为当前状态的输入，并根据输入进行状态转移以及响应操作，如果输入不是期望的，那么状态机将异常中止。只有状态机正常运行直到转移到结束状态，才算解析成功。例如路径字符串`a][`，在解析第一个字符a时，合法的字符串情况第二个字符有以下可能的状态：

- 字符，还是属性名字的一部分，继续添加到a之后
- `[`或者`.`，a为第一级属性key，接着访问第三个字符，进入下一级属性解析
- `undefined`，没有字符串，解析结束

在解析a之后解析到了']'，不在状态期望的值中，因此解析失败。

`path.js`里面一共定义了9种状态和4种动作，每个状态和动作的含义如下：

```javascript
// actions
var APPEND = 0 // 字符串还没结束时拼接到前一个字符串之后作为新的属性名，如:hello.world在解析第一个字符h后解析e，发现这个属性名还未结束，将e拼接在h之后成为一个新的属性名he,以此类推
var PUSH = 1 // 将每个阶段解析的结果添加到keys中，如hello.world解析到第一个.时，hello当做一个完整的属性名，push到keys中，如keys = ['hello']
var INC_SUB_PATH_DEPTH = 2 // 解析下一级属性，如.[这两个字符串代表进入下一级属性
var PUSH_SUB_PATH = 3 // 将下一级解析的属性名添加到keys中

// states
var BEFORE_PATH = 0 // path解析前的初始状态
var IN_PATH = 1 // 路径解析状态
var BEFORE_IDENT = 2 // 遇到.字符时进入该状态，表示在合法字符之前
var IN_IDENT = 3 // 解析合法字符中
var IN_SUB_PATH = 4 // 在下一级属性解析的状态
var IN_SINGLE_QUOTE = 5 // 单引号状态
var IN_DOUBLE_QUOTE = 6 // 双引号状态
var AFTER_PATH = 7 // 解析完成
var ERROR = 8 // 错误状态
```

actions和states组合成path的状态模型，path状态机中一共定义了7个状态模型，如

```javascript
pathStateMachine[BEFORE_PATH] = {
  'ws': [BEFORE_PATH],
  'ident': [IN_IDENT, APPEND],
  '[': [IN_SUB_PATH],
  'eof': [AFTER_PATH]
}
```

状态模型每个key表示当前可能接受的输入，value是一个数组，第一个元素表示接受该输入后进入的状态，第二个元素是执行的动作。BEFORE_PATH状态下，假设约定输入的字符为char，此时状态机接受4种输入:

- `ws`:空格，tab之类的操作符，进入IN_PATH状态
- `ident`:char是`_`或`$`或`a-z`、`A-Z`，当前层级的属性名还没结束，进入IN_IDENT状态，同时执行APPEND
- `[`:进入第二级属性解析状态IN_SUB_PATH
- `eof`:char为undefined，结束解析，进入AFTER_PATH状态

关于'ws','ident'的具体定义在`path.js`的`getPathCharType`中，原理就是通过`ch.charCodeAt(0)`对`[`,`]`,`.`,`_`,`$`进行分类，也就是前面说的状态机“可能的输入”，path状态机就是根据每一个字符的输入，来决定状态机当前的状态和动作，并在满足一个合法路径的时候将当前层级推到数组中，以此类推最后得到总的层级关系数组，部分实现的源码如下：

```javascript
/**
 * Parse a string path into an array of segments
 *
 * @param {String} path
 * @return {Array|undefined}
 */
function parse (path) {
	var keys = [] // 存放各个层次属性的数组，也是最后的返回结果
	var index = -1 // 路径字符串的索引
	var mode = BEFORE_PATH // 当前状态
	var subPathDepth = 0
	var c, newChar, key, type, transition, action, typeMap
    
    var actions = [] // actions是具体的执行动作

	actions[APPEND] = function () { // APPEND操作是连接字符串
	    if (key === undefined) {
	      key = newChar
	    } else {
	      key += newChar
	    }
	}
    // 其他actions就不摘抄了
    
    // 开始循环遍历path
    while (mode != null) {
		index++
		c = path[index]

		type = getPathCharType(c) // 获取当前字符的类型，如'ws','indent'等
		typeMap = pathStateMachine[mode] // 通过mode（当前状态）获取对应的状态模型
		transition = typeMap[type] || typeMap['else'] || ERROR // 从状态机模型取响相应的状态和动作，如[IN_IDENT, APPEND]

		if (transition === ERROR) {
			console.log('非法字符')
			return
		}

		mode = transition[0]  // 下一个状态，在这里完成了状态的转换
		action = actions[transition[1]] // 转换状态的action
		if (action) {
			newChar = transition[2]
			newChar = newChar === undefined ? c : newChar
			if (action() === false){
				return
			}
		}

		if (mode === AFTER_PATH) {
			keys.raw = path
			return keys
		}
	}
}
```

完整的源码可以参见[这里](https://github.com/vuejs/vue/blob/e9872271fa9b2a8bec1c42e65a2bb5c4df808eb2/src/parsers/path.js)。

<h3>一个具体的实例</h3>

现在我们回到本文最开始举的例子，解析`a.b.c`这个路径，为了说明状态机的原理，这里我稍微改造下路径`at['b'].c`，结合上面的`parse()`来看看解析的过程是怎样的，首先约定如下:

```
index : 当前path的索引
mode : 当前状态
input : 当前输入
type : 当前输入经过getPathCharType之后得到的结果
next mode : 下一个状态
action : 当前执行的动作
key : 当前路径属性的临时变量
keys : 存放各个层次属性的数组，也是最后的返回结果
```

1. index = 0

```
mode = BEFORE_PATH
input = 'a'
type = 'ident'
next mode = IN_IDENT
action = APPEND
key = 'a'
keys = []
```

2. index = 1

```
mode = IN_IDENT
input = 't'
type = 'indent'
next mode = IN_IDENT
action = APPEND
key = 'at'
keys = []
```

3. index = 2

```
mode = IN_IDENT
input = '['
type = '['
next mode = IN_SUB_PATH
action = PUSH
key = undefined
keys = ['at']
```

4. index = 3

```
mode = IN_SUB_PATH
input = '''
type = '''
next mode = IN_SINGLE_QUOTE
action = APPEND
key = '''
keys = ['at']
```

5. index = 4

```
mode = IN_SINGLE_QUOTE
input = 'b'
type = 'else'
next mode = IN_SINGLE_QUOTE
action = APPEND
key = ''b'
keys = ['at']
```

6. index = 5

```
mode = IN_SINGLE_QUOTE
input = '''
type = '''
next mode = IN_SUB_PATH
action = APPEND
key = ''b''
keys = ['at']
```

7. index = 6

```
mode = IN_SINGLE_QUOTE
input = ']'
type = ']'
next mode = IN_PATH
action = PUSH_SUB_PATH
key = undefined
keys = ['at', 'b']
```

8. index = 7

```
mode = IN_PATH
input = '.'
type = ']'
next mode = BEFORE_IDENT
action = undefined
key = undefined
keys = ['at', 'b']
```

9. index = 8

```
mode = BEFORE_IDENT
input = 'c'
type = 'ident'
next mode = IN_IDENT
action = APPEND
key = 'c'
keys = ['at', 'b']
```

9. index = 9

```
mode = IN_IDENT
input = undefined
type = 'eof'
next mode = AFTER_PATH
action = PUSH
key = undefined
keys = ['at', 'b', 'c']
```

到这里状态机分析就结束了，最后得到的keys供Vue进行属性响应改造使用。如果上面过程看的有点晕，建议对照着源码仔细阅读，毕竟这里涉及各种状态的互相转换。

<h3>总结</h3>

有限状态机是JavaScript里很实用但不太常见的结构模型，Vue的path状态机更是针对不同的字符有不同的状态表现，刚开始我看也是一头雾水，但经过多次反复阅读，总算可以把Vue的path状态机的工作原理说清楚了，也充分学习了有限状态机的具体应用，不过刚才我粗略看了下Vue2+的源码，没有找到状态机的使用，可能Vue2使用了jsx解析（这个纯属猜测）可以省略path解析这一步？这有待后续探讨。

（完）

参考：

[Vue 模板表达式解析和 path 状态机](https://github.com/banama/aboutVue/blob/master/pathStateMachine.md)

