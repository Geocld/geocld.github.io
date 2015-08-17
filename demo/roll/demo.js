window.onload = function()
{
	var oDiv = document.getElementById('div1');
	var oUl = oDiv.getElementsByTagName('ul')[0];
	var oLi = oDiv.getElementsByTagName('li');

	var oBtn1 = document.getElementById('btn1');
	var oBtn2 = document.getElementById('btn2');

	oUl.innerHTML = oUl.innerHTML + oUl.innerHTML;
	oUl.style.width = oLi[0].offsetWidth * oLi.length + 'px';

	var speed = -2;

	function move()
	{
		if (oUl.offsetLeft < -oUl.offsetWidth / 2)
		{
			oUl.style.left = '0';
		}
		if (oUl.offsetLeft > 0)
		{
			oUl.style.left = -oUl.offsetWidth / 2 + 'px';
		}
		oUl.style.left = oUl.offsetLeft + speed +'px';
	}
	var timer = setInterval(move,30);

	oDiv.onmouseover = function()
	{
		clearInterval(timer);
	}
	oDiv.onmouseout = function()
	{
		timer = setInterval(move,30);
	}

	oBtn1.onclick = function()
	{
		speed = -2;
	}
	oBtn2.onclick = function()
	{
		speed = 2;
	}
}