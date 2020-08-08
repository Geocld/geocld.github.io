(window.webpackJsonp=window.webpackJsonp||[]).push([[12],{476:function(n,e,t){"use strict";t.r(e);var r=t(62),o=Object(r.a)({},(function(){var n=this,e=n.$createElement,t=n._self._c||e;return t("ContentSlotsDistributor",{attrs:{"slot-key":n.$parent.slotKey}},[t("p",[n._v("最近对JavaScript中的闭包做了一些深入的了解，目前的对闭包的理解也只能算是一知半解，现结合目前看过的资料，对闭包做一个初步的总结。")]),n._v(" "),t("p",[n._v("##什么是闭包（Closures）\n闭包是指有权访问另一个函数作用域中的变量的函数。")]),n._v(" "),t("p",[n._v("在函数的实际使用过程中，当函数被调用时，会创建函数执行环境及其作用域链，然后会根据arguments和其他命名参数初始化形成活动对象（AO）。这个执行环境仅在函数调用时存在，一旦函数执行完毕，该执行环境和作用域链则立即被销毁，有时候外部函数调用后，仍需要调用内部函数的活动对象，此时需要使用闭包。")]),n._v(" "),t("p",[n._v("##内部函数\n所谓内部函数，就是定义在一个函数之中的函数。")]),n._v(" "),t("div",{staticClass:"language- extra-class"},[t("pre",[t("code",[n._v("function outerFn () {\n    function innerFn () {}\n}\n")])])]),t("p",[n._v("innerFn ()是一个被包含在outerFn ()作用域中的内部函数，根据函数作用域链的查找方式，在outerFn ()内部调用innerFn ()是有效的，而在outerFn ()外部调用innerFn ()是无效的。")]),n._v(" "),t("div",{staticClass:"language- extra-class"},[t("pre",[t("code",[n._v('function outerFn() {\n        document.write("Outer function<br/>");\n        function innerFn() {\n            document.write("Inner function<br/>");\n        }\n    }\n    innerFn();//外部作用域链无法找到innerFn的作用域，执行产生错误\n')])])]),t("p",[n._v("如果在outerFn()内部调用innerFn，则可以成功运行。")]),n._v(" "),t("div",{staticClass:"language- extra-class"},[t("pre",[t("code",[n._v('function outerFn() {\n        document.write("Outer function<br/>");\n        function innerFn() {\n            document.write("Inner function<br/>");\n        }\n        innerFn();\n    }\n    outerFn();\n')])])]),t("p",[n._v("##闭包使得内部函数可以在外部函数之外访问\n闭包通常采用返回函数的方式，使外部函数的作用域保留在内部函数中，外部函数执行完毕后，其作用域链和活动对象依旧保留在内部函数中，故内部函数可以继续使用。")]),n._v(" "),t("p",[n._v("还是以上面的例子为例，要使innerFn()成为outerFn()的闭包，代码如下：")]),n._v(" "),t("div",{staticClass:"language- extra-class"},[t("pre",[t("code",[n._v('function outerFn() {\n        document.write("Outer function<br/>");\n        function innerFn() {\n            document.write("Inner function<br/>");\n        }\n        return innerFn;\n    }\n    var fnRef = outerFn();\n    fnRef();\n')])])]),t("p",[n._v("在outerFn()内部，使用"),t("code",[n._v("return innerFn;")]),n._v("语句作为函数的返回值，全局执行环境中，"),t("code",[n._v("var fnRef = outerFn();")]),n._v("调用outerFn()函数，outerFn()函数会创建该函数的执行环境和活动变量，在outerFn()执行结束后，其作用域和活动变量理应被销毁，但是由于返回一个innerFn函数，其作用域和活动对象保留在innerFn函数中，使得在后续"),t("code",[n._v("fnRef();")]),n._v("是可以访问到innerFn()。")]),n._v(" "),t("p",[n._v("在上面的例子中，我们称"),t("code",[n._v("innerFn()")]),n._v("是"),t("code",[n._v("outerFn()")]),n._v("的闭包。")]),n._v(" "),t("p",[n._v("##总结\n总的来说，闭包就是在函数中定义函数，闭包有权访问函数内部所有变量，闭包之所以能实现这些功能的原因如下：")]),n._v(" "),t("p",[n._v("1.后台执行环境中，闭包的作用域包含自身的作用域，包含函数的作用域和全局作用域。")]),n._v(" "),t("p",[n._v("2.通常，函数的作用域及其所有变量都会在函数执行结束后销毁。")]),n._v(" "),t("p",[n._v("3.但在函数返回一个闭包，这个函数的作用域会一直存在内存中，保存到闭包不存在为止。")]),n._v(" "),t("hr"),n._v(" "),t("p",[n._v("##更多相关概念\n其实闭包需要涉及到的相关概念很多，包括执行环境/执行上下文（Execution context），变量对象（Variable Object），活动对象（Activation Object），作用域链（Scope chain），理解这些概念很更深层次的了解闭包的原理，这些会在后续博文继续总结。")]),n._v(" "),t("p",[n._v("##参考资料\n"),t("a",{attrs:{href:"http://www.cnblogs.com/dolphinX/archive/2012/09/29/2708763.html",target:"_blank",rel:"noopener noreferrer"}},[n._v("JavaScript 闭包究竟是什么"),t("OutboundLink")],1)]),n._v(" "),t("p",[n._v("《JavaScript高级程序设计》")]),n._v(" "),t("p",[n._v("《jQuery基础教程》")])])}),[],!1,null,null,null);e.default=o.exports}}]);