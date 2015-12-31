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
队列的操作和栈非常类似，根据栈的操作，这里定义两个队列操作：

1.`enqueue(data)`: 添加数据插入队尾。

2.`dequeue`： 读取队列头节点数据并删除该节点。

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

