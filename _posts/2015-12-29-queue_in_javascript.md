---
layout: post
title: JavaScript中的数据结构——队列(Queue)
subtitle: "队列在JavaScript中的实现和原理"
date: 2015-12-29
author: "lijiahao"
tags: [JavaScript,数据结构,算法]
---
队列(queue),与栈(stack)类似，也是一种线性结构，操作与栈类似，但与栈不同的是，队列使用的是先进先出(FIFO)的操作方式，队列的操作和生活中的排队一样，排队的队伍中，先到的在队伍前排的会先处理，后来排队的后处理，一张图表示如下：

![](http://i.imgur.com/UpNjASQ.jpg)

<h4>队列的操作</h4>
队列的操作和栈非常类似，根据栈的操作，这里定义三个队列操作：

1.`size()`: 队列长度

2.`enqueue(data)`: 添加数据插入队尾。

3.`dequeue()`： 读取队列头节点数据并删除该节点。

可以发现在操作方法上，队列和栈就已经有区别了，队列多了一个计算长度的`size()`方法，这是因为队列的两端操作有关，后面会进行介绍。

<h4>队列的具体实现</h4>
同样先使用构造函数+原型模式实现队列操作，构造函数需要具备三个属性：`_oldestIndex`，`_newestIndex`和`_storage`:

	function Queue() {
	    this._oldestIndex = 1;
	    this._newestIndex = 1;
	    this._storage = {};
	}
`_oldestIndex`: 队列队首元素“指针”；

`_newestIndex`： 队列队尾元素“指针”；

`_storage`： 队列的存储空间。

<h5>size()方法</h5>
计算队列的长度需要使用两个变量`_oldestIndex`和`_newestIndex`，而在栈计算长度是只使用了一个`size`变量，存在这种差异的原因在与两种数据结构的数据出入方式不同，栈的方式为`LIFO`,元素的操作只会在栈顶发生，栈底元素的位置不会变，故只用简单的加减法即可计算出栈的长度。但是队列却不同，正如上图显示的，队列的操作为`FIFO`操作，元素的进出发生在队列的两端，如果只用一个`size`进行简单的加减法操作，我们无法准确获得队列当前`队首`和`队尾`的位置，这时候，就需要使用两个变量(在C语言里就是`指针`)记录`队首`和`队尾`的位置。故队列的`size()`具体实现如下：

	Queue.prototype.size = function() {
	    return this._newestIndex - this._oldestIndex;
	};

<h5>enqueue(data)和dequeue()方法</h5>
有了`size()`的原理后，`enqueue(data)`和`dequeue()`操作就简单多了。

先是`enqueue(data)`方法，这个方法的操作会影响两个变量：

1.使用`_storage`对象存储新加入的元素；

2.`_newestIndex`作为队尾的键值，当新元素入队时，`_newestIndex`加1，初始值为1。

使用JavaScript实现的具体代码如下：

	Queue.prototype.enqueue = function(data) {
	    this._storage[this._newestIndex] = data;
	    this._newestIndex++;
	};

接下来是`dequeue()`操作，该操作有一样有两个变量受影响：

1.使用当前的`_oldestIndex`作为键值从`_storage`中删除排在最前面的元素；

2.`_oldestIndex`键值加1，指向当前新的队首元素的位置。

具体实现代码如下：

	Queue.prototype.dequeue = function() {
	    var oldestIndex = this._oldestIndex,
	        newestIndex = this._newestIndex,
	        deletedData;
	 	//判断是否存在假溢出、空队列的情况
	    if (oldestIndex !== newestIndex) {
	        deletedData = this._storage[oldestIndex];
	        delete this._storage[oldestIndex];
	        this._oldestIndex++;
	 
	        return deletedData;
	    }
	};

故JavaScript实现队列操作的完整代码如下：

	function Queue() {
	    this._oldestIndex = 1;
	    this._newestIndex = 1;
	    this._storage = {};
	}
	
	Queue.prototype.size = function() {
	    return this._newestIndex - this._oldestIndex;
	};
	 
	Queue.prototype.enqueue = function(data) {
	    this._storage[this._newestIndex] = data;
	    this._newestIndex++;
	};
	 
	Queue.prototype.dequeue = function() {
	    var oldestIndex = this._oldestIndex,
	        newestIndex = this._newestIndex,
	        deletedData;
	 
	    if (oldestIndex !== newestIndex) {
	        deletedData = this._storage[oldestIndex];
	        delete this._storage[oldestIndex];
	        this._oldestIndex++;
	 
	        return deletedData;
	    }
	};

<h5>队列的另一种实现方式</h5>
在栈的操作中，最后使用了数组的`push()`和`pop()`操作模拟了栈的操作，同样的，队列操作也可以，在栈操作的基础上使用`reverse()`可以轻松模拟，具体代码如下：

		//创建一个数组来模拟队列
        var a=new Array();
        console.log(a);
        //push: 在数组的末尾添加一个或更多元素，并返回新的长度
        console.log("入队");
        a.push(1)
        console.log(a);//----->1
        a.push(2);
        console.log(a);//----->1,2
        a.push(3);
        console.log(a);//----->1,2,3
        a.push(4);
        console.log(a);//----->1,2,3,4
		console.log("先对数组进行反序操作，保证队首元素在数组的最后");
		a = a.reverse();
		console.log(a)
        console.log("出队，先进先出");
        console.log(a);
        //pop：从数组中把最后一个元素删除，并返回这个元素的值
        a.pop();//----->4
        console.log(a);
        a.pop();//----->3
        console.log(a);
        a.pop();//----->2
        console.log(a);
        a.pop();//----->1
        console.log(a);
在firebug下的输入如下：

![](http://i.imgur.com/90FhO8B.jpg)

<h4>总结</h4>
通过本文和上篇文章([JavaScript中的数据结构——栈(Stack)](http://geocld.github.io/2015/12/28/stack_in_javascript/))的介绍，对常用的两种线性数据结构——`栈`和`队列`进行了介绍：`栈`存储数据并从最新的元素中进行出栈操作；`队列`存储数据并从最旧的元素中进行出队操作。并通过JavaScript实现了这两种数据结构的操作。

在具体的实际使用中，`栈`操作和`队列`操作比上面所说的复杂很多，但是基本的设计原则如下：如果需要解决的问题是需要对数据进行有序操作，那么优先考虑`栈`和`队列`。

参考资料：

[Data Structures With JavaScript: Stack and Queue](http://code.tutsplus.com/articles/data-structures-with-javascript-stack-and-queue--cms-23348)