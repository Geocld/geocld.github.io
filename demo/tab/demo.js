window.onload = function ()
{
	var title = document.getElementById('tab-title');
	var TitleLi = title.getElementsByTagName('li');

	var content = document.getElementById("tab-content");
	var tabct = content.getElementsByClassName("tabct");
	for(var i = 0; i < TitleLi.length; i++)
	{
		TitleLi[i].index = i;
		TitleLi[i].onmouseover = function ()
		{
			for(var i = 0; i < TitleLi.length; i++)
			{
				TitleLi[i].className = '';
				tabct[i].style.display = 'none';
			}
			this.className = 'active';
			tabct[this.index].style.display = 'block';
		}
	}

	/*object method*/
	new Tabswitch('div2');

	/*target*/
	var title3 = document.getElementById('tab-title3');
	var TitleLi3 = title3.getElementsByTagName('li');
	
	for(var i = 0; i < TitleLi3.length; i++)
	{
		TitleLi3[i].index = i;
		TitleLi3[i].onclick = function ()
		{
			for(var i = 0; i < TitleLi3.length; i++)
			{
				TitleLi3[i].className = '';
			}
			this.className = 'active';
		}
	}
}

function Tabswitch(id)
{
	var _this = this;
	this.title2 = document.getElementById('tab-title2');
	this.TitleLi2 = this.title2.getElementsByTagName('li');

	this.content2 = document.getElementById('tab-content2');
	this.tabct2 = this.content2.getElementsByClassName('tabct');
	for (var i = 0; i < this.TitleLi2.length; i++)
	{
		this.TitleLi2[i].index = i;
		this.TitleLi2[i].onmouseover = function ()
		{
			_this.fnmouseover(this);
		}
	}
}

Tabswitch.prototype.fnmouseover = function(oLi)
{
	for (var i = 0; i < this.TitleLi2.length; i++)
	{
		this.TitleLi2[i].className = '';
		this.tabct2[i].style.display = 'none';
	}
	oLi.className = 'active';
	this.tabct2[oLi.index].style.display = 'block';
}