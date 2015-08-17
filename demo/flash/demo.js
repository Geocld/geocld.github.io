function getByClass(oParent, sClass)
{
	var aEle = oParent.getElementsByTagName('*');
	var aResult = [];

	for(var i = 0; i < aEle.length; i++)
	{
		if(aEle[i].className == sClass)
		{
			aResult.push(aEle[i]);
		}
	}
	return aResult;
}

window.onload = function ()
{
	var oDiv = document.getElementById('div');
	var oMarkleft = getByClass(oDiv, 'mark_left')[0];
	var oMarkright = getByClass(oDiv, 'mark_right')[0];
	var oBtnleft = getByClass(oDiv, 'btn_left')[0];
	var oBtnright = getByClass(oDiv, 'btn_right')[0];

	var oBigpic = getByClass(oDiv, 'big_pic')[0];
	var aLiBigpic = oBigpic.getElementsByTagName('li');

	var oSmallpic = getByClass(oDiv, 'small_pic')[0];
	var oUlSmallpic = oSmallpic.getElementsByTagName('ul')[0];
	var aLiSmallpic = oSmallpic.getElementsByTagName('li');

	var nowZIndex = 2;

	var now = 0;

	oUlSmallpic.style.width = aLiSmallpic.length * aLiSmallpic[0].offsetWidth + 'px';

	//左右按钮浮现
	oMarkleft.onmouseover = oBtnleft.onmouseover = function ()
	{
		startMove(oBtnleft, {opacity: 100});
	}
	oMarkleft.onmouseout = oBtnleft.onmouseout = function ()
	{
		startMove(oBtnleft, {opacity: 0});
	}
	oMarkright.onmouseover = oBtnright.onmouseover = function ()
	{
		startMove(oBtnright, {opacity: 100});
	}
	oMarkright.onmouseout = oBtnright.onmouseout = function ()
	{
		startMove(oBtnright, {opacity: 0});
	}
	//大图切换
	for(var i = 0; i < aLiSmallpic.length; i++)
	{
		aLiSmallpic[i].index = i;
		aLiSmallpic[i].onclick = function()
		{
			if (this.index == now) return;
			now = this.index;
			tab();
		}

		aLiSmallpic[i].onmouseover = function ()
		{
			startMove(this, {opacity: 100});
		}

		aLiSmallpic[i].onmouseout = function ()
		{
			if(this.index != now)
			{
				startMove(this, {opacity: 60});
			}
		}
	}
	function tab()
	{
		aLiBigpic[now].style.zIndex = nowZIndex++;

		for(var i = 0; i < aLiSmallpic.length; i++)
		{
			startMove(aLiSmallpic[i], {opacity: 60});
		}
		startMove(aLiSmallpic[now], {opacity: 100});

		aLiBigpic[now].style.height = 0;
		startMove(aLiBigpic[now], {height: 320});

		if(now == 0)
		{
			startMove(oUlSmallpic, {left: 0});
		}
		else if (now == aLiSmallpic.length - 1)
		{
			startMove(oUlSmallpic, {left: -(now-2)*aLiSmallpic[0].offsetWidth});
		}
		else 
		{
			startMove(oUlSmallpic, {left: -(now-1)*aLiSmallpic[0].offsetWidth});
		}
	}

	//按钮切换
	oBtnleft.onclick = function ()
	{
		now--;
		if(now == -1)
		{
			now = aLiSmallpic.length - 1;
		}

		tab();
	}

	oBtnright.onclick = function ()
	{
		now++;
		if(now == aLiSmallpic.length)
		{
			now = 0;
		}

		tab();
	}

	var timer = setInterval(oBtnright.onclick, 2000);
	oDiv.onmouseover = function ()
	{
		clearInterval(timer);
	}
	oDiv.onmouseout = function()
	{
		timer=setInterval(oBtnright.onclick, 2000);
	}
}