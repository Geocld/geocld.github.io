window.onload = function ()
{
	var oDiv = document.getElementById('div');
	var aLi = document.getElementsByTagName('ol')[0].getElementsByTagName('li');
	var oUl = oDiv.getElementsByTagName('ul')[0];

	var now = 0;

	for(var i = 0; i < aLi.length; i++)
	{
		aLi[i].index = i;
		aLi[i].onclick = function ()
		{
			now = this.index;
			tab();
		}
	}

	function tab()
	{
		for(var i = 0; i < aLi.length; i++)
		{
			aLi[i].className = '';
		}
		aLi[now].className = 'active';
		startMove(oUl, {top: -150*now});
	}

	function autoplay()
	{
		now++;
		if(now == aLi.length)
		{
			now = 0;
		}
		tab();
	}

	var timer = setInterval(autoplay, 5000);

	oDiv.onmouseover = function ()
	{
		clearInterval(timer);
	}

	oDiv.onmouseout = function ()
	{
		timer = setInterval(autoplay, 5000);
	}
}