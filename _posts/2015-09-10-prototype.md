---
layout: default
layout: page
layout: post
title: JavaScript prototype的一些理解
category: JavaScript
tag: [JavaScript]
---

#JavaScript prototype的一些理解#
之前JavaScript的面向对象思想接触较少，近期在面向对象的专题复习中，之前只了解原型模式、构造函数模式+原型模式可以进行面向对象编程，且通过prototype属性，可以为构造函数提供共用的函数访问，但是对prototype的设计来由、JavaScript的内部实现方式知之甚少，通过参阅《JavaScript高级程序设计》和参考各种大牛的博客文章，个人对prototype的有一些新的理解。

###理解原型对象和prototype###
每个函数都有一个prototype（原型）属性，这个属性是一个**指针**，指向一个对象，JavaScript中这个对象就是**原型对象**，原型对象的用途是包含我们需要创建对象所具备的属性和方法。

>JavaScript中，无论什么时候，只要创建了一个函数，就会根据一组特定的规则为该函数创建一个prototype属性，这个属性指向函数的原型对象。在默认情况下，所有原型对象都会自动获得一个constructor（构造函数）属性，这个属性包含一个指向prototype属于所在函数的指针。

以上是《JavaScript高级程序设计》对prototype和constructor的文字描述，简单的说，就是**函数自带prototype属性，prototype属性指向该函数的原型对象（原型对象中包含属性和方法），原型对象中有一个constructor属性，该属性又指会函数本身**。举个例子：

	function Student() {

	}
	Student.prototype.name = "xiaoming";
	Student.prototype.sayhello = function(){
		alert("hello");
	};

例子中创建一个名为Student的函数，该函数与原型对象的关系如下图：

![](http://i.imgur.com/Io5db1a.jpg)

左侧是我们创建的Student函数（也可以称为构造函数），函数内自动生成一个prototype属性，该属性指向右侧Student的原型对象，原型对象下有一个constructor属性，该属性也是一个指针，指会Student函数。

如果对Student函数实例化，如下：

	function Student() {

	}
	Student.prototype.name = "xiaoming";
	Student.prototype.sayhello = function(){
		alert("hello");
	};

	var xiaohong = new Student();

则构造函数、原型对象和实例的关系如下图：

![](http://i.imgur.com/htRrEQO.jpg)

可以看到：当调用构造函数创建一个新实例后，该实例的内部将包含一个指针（内部属性[[prototype]]，浏览器查看原型链是\__proto__），指向构造函数的原型对象。**这个连接关系存在于实例与构造函数的原型对象之间，而不是存在于实例和构造函数之间。**

###为什么使用原型prototype
将共用的属性和方法放到原型prototype中，如此与构造函数没有直接关系，在创建实例时，多个实例共享共用属性和方法，最大限度的节省了内存，以下程序说明了这一点：

	function Student(name) {
		this.name = name;
	}
	Student.prototype.share = [];

	Student.prototype.sayhello = function(){
		alert("hello");
	};

	var xiaohong = new Student('xiaohong');
	var xiaoming = new Student('xiaoming');

	xiaohong.share.push(1);
	xiaoming.share.push(2);
	console.log(xiaoming.share);//[1,2]

###原型链
当代码读取对象的某个属性时，会执行一遍搜索，目标是具有给定名字的属性。搜索首先从对象实例开始，如果在实例中找到该属性则会继续搜索实例prototype的原型，prototype原型没有搜索到，则到Object原型搜索，最后还是没搜索到，则返回null（也有些资料说是返回undefined），按照这个搜索路径递归就是**原型链**。

上面Student的实例的原型链如下：

	xiaoming ↘
	xiaohong --> Student.prototype --> Object.prototype --> null

下面程序说明了按原型链进行属性查找的情况：

	        function foo() {
            this.add = function (x, y) {
                return x + y;
            }
        }

        foo.prototype.add = function (x, y) {
            return x + y + 10;
        }

        Object.prototype.subtract = function (x, y) {
            return x - y;
        }

        var f = new foo();
        alert(f.add(1, 2)); //结果是3，而不是13
        alert(f.subtract(1, 2)); //结果是-1（属性先查找自身）

属性按照原型链查找时先查找自身的属性，一旦查找到后就不会再进行后续查找；如果没有再查找原型，再没有，再往上查找，直到查到Object的原型上。

参考资料：

 [深入理解JavaScript系列（5）：强大的原型和原型链](http://www.cnblogs.com/TomXu/archive/2012/01/05/2305453.html)

 [JavaScript教程-创建对象BY廖雪峰](http://www.liaoxuefeng.com/wiki/001434446689867b27157e896e74d51a89c25cc8b43bdb3000/0014344997235247b53be560ab041a7b10360a567422a78000)

《JavaScript高级程序设计》