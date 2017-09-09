(function(window){
    var duration = 0; //切换时长ms
    var stay = 0; //停留时长ms
    var container = null; //外部容器
    var wrap = null; //需要轮播的对象
    var dotsWrap = null; //锚点
    var leftArrow = null; //左箭头
    var rightArrow = null; //右箭头
    var enableTransition = false; //是否使用css3过度切换动画
    var enablePosition = false; //是否使用绝对定位切换动画
    var enableTouch = true; //是否允许触摸滑动
    var enableClick = true; //是否允许点击dot切换
    var direct = 'right'; //轮播方向
    var autoTimeoutId = null; //自动轮播计时器
    var endTimeoutId = null; //动画过渡完成计时器,防止ios qq内置浏览器有时偶尔不触发transitionEnd的bug
    var rAFTimeoutId = null; //帧动画
    var anicomplete = true; //动画播放完成
    var carouselCount = 0;
    var maxCount;
    var parentWidth = 0;
    var wrapWidth = 0;
    var prefixStyle = null;
    var bannerClick = false;
    var endTime = new Date().getTime();

    var Carousel = {
        init: function(options) {
            var self = this;
            prefixStyle = this._getPrefixStyle();
            container = options.container;
            wrap = options.wrap;
            dotsWrap = options.dotsWrap;
            leftArrow = options.leftArrow;
            rightArrow = options.rightArrow;
            duration = options.duration||1000;
            stay = options.stay||3000;
            options.enableTouch!=undefined && (enableTouch = options.enableTouch);
            options.enableTransition!=undefined && (enableTransition = options.enableTransition);
            options.enablePosition!=undefined && (enablePosition = options.enablePosition);
            options.enableClick!=undefined && (enableClick = options.enableClick);
            wrapWidth = wrap.scrollWidth;
            parentWidth = container.clientWidth;
            maxCount = Math.ceil(wrapWidth / parentWidth) - 1;

            if(enableTransition){
            	enablePosition = false;
            }

            if(enablePosition){
            	container.style.position = 'relative';
            	wrap.style.position = 'absolute';
            	wrap.style.left = '0';
            	wrap.style.top = '0';
            }

            if (maxCount > 0) {
                this.createDots(maxCount + 1);
            } else {
                return;
            }

            if(enableTransition){
            	container.addEventListener('webkitTransitionEnd',function(){
	            	self.endCallBack();
	            })
	            container.addEventListener('transitionend',function(){
	            	self.endCallBack();
	            })
            }
            
            if(enableTouch){
            	this.bindTouchEvent();
            }
            
            if(enableClick){
                this.bindDotClickEvent();
            }

            this.bindArrowClickEvent();
            this.endCallBack();
        },
        //创建dot
        createDots: function(carouselCount) {
        	var html = '';
            for (var i = 0; i < carouselCount; i++) {
                if (i == 0) {
                    html+='<div class="dot active"></div>';
                } else {
                    html+='<div class="dot"></div>';
                }
            }
            dotsWrap.innerHTML = html;
        },
        //激活dot
        activeDot: function(num){
            var offsetX = 0;
            if(!num && num!=0){
                if(enablePosition){
                    offsetX = this._getComputedStyle('left');
                    offsetX ? (offsetX = Number(offsetX.replace('px',''))) : offsetX = 0;
                }else{
                    offsetX = this._getComputedTranslateX();
                }
                num = Math.floor((Math.abs(offsetX)+parentWidth/2)/parentWidth);
            }
            dom = dotsWrap.getElementsByClassName('active')[0];
            if(dom){
                dom.className = 'dot';
            }
            dotsWrap.getElementsByClassName('dot')[num].className = 'dot active';
        },
        bindDotClickEvent: function(){
            var self = this;
            var dots = dotsWrap.getElementsByClassName('dot');
            var length = dots.length;
            for(var i=0; i<length; i++){
                dots[i].addEventListener('touchstart',function(event){
                    event.stopPropagation();
                })
                dots[i].addEventListener('touchend',function(event){
                    event.stopPropagation();
                });
                (function(num){
                    dots[num].addEventListener('click',function(){
                        self.goToNoTransition(num);
                    })
                })(i)
            }
        },
        //绑定左右箭头切换事件
        bindArrowClickEvent: function(){
            var self = this;
            var cancelRAF =  this._getCancelRAF();
            var offsetX = 0;
            if(leftArrow){
                leftArrow.addEventListener('touchstart',function(event){
                    event.stopPropagation();
                })
                leftArrow.addEventListener('touchend',function(event){
                    event.stopPropagation();
                })
                leftArrow.addEventListener('click',function(event){
                    event.stopPropagation();
                    if(carouselCount<maxCount){
                        _stop();
                        self.toLeft();
                    }
                })
            }
            if(rightArrow){
                rightArrow.addEventListener('touchstart',function(event){
                    event.stopPropagation();
                })
                rightArrow.addEventListener('touchend',function(event){
                    event.stopPropagation();
                })
                rightArrow.addEventListener('click',function(){
                    event.stopPropagation();
                    if(carouselCount>0){
                        _stop();
                        self.toRight();
                    }
                })
            }
            function _stop(){
                cancelRAF(rAFTimeoutId);
                clearTimeout(autoTimeoutId);
                clearTimeout(endTimeoutId);
                if(!enablePosition){
                    wrap.style[prefixStyle.transitionDuration] = '0ms';
                    translateX = self._getComputedTranslateX();
                    offsetX = translateX;
                    wrap.style[prefixStyle.transform] = 'translateX(' + translateX + 'px) translateZ(0)';
                }else{
                    wrap.style[prefixStyle.transitionDuration] = '0ms';
                    left = self._getComputedStyle('left');
                    left ? (left = Number(left.replace('px',''))) : left = 0;
                    offsetX = left;
                    wrap.style.left = left+'px';
                }
            }
        },
        //绑定触屏事件
        bindTouchEvent: function () {
        	var self = this;
            var startX = 0;
            var translateX = 0;
            var left = 0;
            var cancelRAF = this._getCancelRAF();
            container.addEventListener('touchstart', function(event) {
            	event.preventDefault();
                cancelRAF(rAFTimeoutId);
            	clearTimeout(autoTimeoutId);
            	clearTimeout(endTimeoutId);
                bannerClick = false;
                startX = event.touches[0].pageX;
                if(!enablePosition){
                	wrap.style[prefixStyle.transitionDuration] = '0ms';
                	translateX = self._getComputedTranslateX();
	            	wrap.style[prefixStyle.transform] = 'translateX(' + translateX + 'px) translateZ(0)';
                }else{
                    wrap.style[prefixStyle.transitionDuration] = '0ms';
                	left = self._getComputedStyle('left');
                	left ? (left = Number(left.replace('px',''))) : left = 0;
                	wrap.style.left = left+'px';
                }
                
            })
            container.addEventListener('touchmove', function(event) {
            	event.preventDefault();
                var dtX = event.touches[0].pageX - startX;
                var _translateX =  translateX+dtX>0 ? 0 : translateX+dtX;
                var _left =  left+dtX>0 ? 0 : left+dtX;
                _translateX = _translateX < parentWidth - wrapWidth ? parentWidth - wrapWidth : _translateX;
                _left = _left < parentWidth - wrapWidth ? parentWidth - wrapWidth : _left;
                if(!enablePosition){
                	wrap.style[prefixStyle.transform] = 'translateX(' + _translateX + 'px) translateZ(0)';
                }else{
                	wrap.style.left = _left+'px';
                }
                
            })
            container.addEventListener('touchend', function(event) {
            	event.preventDefault();
                if(!enablePosition){
                	translateX = self._getComputedTranslateX();
	                next(translateX);
                }else{
                	left = self._getComputedStyle('left');
                	left ? (left = Number(left.replace('px',''))) : left = 0;
	                next(left);
                }
                function next(offsetX){
                    var now = new Date().getTime();
                    //点击后继续移动
                    if (Math.abs(event.changedTouches[0].pageX - startX) < 5) {
                        bannerClick = true;
                        if (carouselCount == 0) {
                            direct = 'left';
                        } else if (carouselCount == maxCount) {
                            direct = 'right';
                        }
                        if(anicomplete){
                            autoTimeoutId = setTimeout(function(){
                                if (direct == 'left')
                                    self.toLeft();
                                else
                                    self.toRight();
                            }, stay - (now - endTime));
                        }else{
                            if (direct == 'left')
                                self.toLeft();
                            else
                                self.toRight();
                        }
                        return;
                    }
                    anicomplete = false;
                	if (event.changedTouches[0].pageX > startX){
                        //跟新carouselCount
	                	carouselCount = Math.ceil(Math.abs(offsetX/parentWidth));
	                	if(carouselCount == 0){
	                		self.goTo(0)
	                		return;
	                	}
	                    self.toRight();
	                }else{
                        //跟新carouselCount
	                	carouselCount = Math.floor(Math.abs(offsetX/parentWidth));
	                	if(carouselCount == maxCount){
	                		self.goTo(maxCount);
	                		return;
	                	}
	                    self.toLeft();
	                }
                }
                
            })
       	},
        //根据index切换到
        goTo: function(num){
            var self = this;
            var translateX = -num*parentWidth;
            if(enableTransition){
                time = duration * (Math.ceil(Math.abs(-translateX - this._getComputedTranslateX())) / parentWidth);
                time = time>duration ? duration : time;
                wrap.style[prefixStyle.transitionDuration] = time+'ms';
                //强制刷新
                this._getComputedTranslateX();
                wrap.style[prefixStyle.transform] = 'translateX(-' + translateX + 'px) translateZ(0)';
                self._startTransition();
            }else if(enablePosition){
                left = wrap.style.left;
                left ? (left = Number(left.replace('px',''))) : left = 0;
                time = duration * (Math.ceil(Math.abs(-translateX - left)) / parentWidth);
                time = time>duration ? duration : time;
                self._position(wrap,left,time);
            }else{
                wrap.style[prefixStyle.transitionDuration] = '0ms';
                self._translation(wrap, -translateX, duration/2);
            }
            
        },
        //根据index切换到(无过渡效果)
        goToNoTransition: function(num){
            var translateX = -num*parentWidth;
            var cancelRAF = this._getCancelRAF();
            cancelRAF(rAFTimeoutId);
            clearTimeout(autoTimeoutId);
            clearTimeout(endTimeoutId);
            if(!enablePosition){
                wrap.style[prefixStyle.transitionDuration] = '0ms';
                //强制刷新
                this._getComputedTranslateX();
                wrap.style[prefixStyle.transform] = 'translateX(' + translateX + 'px) translateZ(0)';
            }else{
                wrap.style.left = translateX+'px';
            }
            carouselCount = num;
            this.endCallBack();
            this.activeDot(num);
        },
       	//向右切换
       	toLeft: function() {
            if (carouselCount >= maxCount) return;

            var self = this;
            var translateX = 0;
            var style = null;
            var startX = 0;
            var time = 0;
            var left = 0;

            clearTimeout(autoTimeoutId);
            clearTimeout(endTimeoutId);
            anicomplete = false;
            carouselCount++;

            if (carouselCount < maxCount) {
                translateX = parentWidth * carouselCount;
            } else if (carouselCount == maxCount) {
                translateX = wrapWidth - parentWidth;
            }

            if(enableTransition){
            	time = duration * (Math.ceil(Math.abs(-translateX - this._getComputedTranslateX())) / parentWidth);
                time = time>duration ? duration : time;
            	wrap.style[prefixStyle.transitionDuration] = time+'ms';
            	//强制刷新
            	this._getComputedTranslateX();
            	wrap.style[prefixStyle.transform] = 'translateX(-' + translateX + 'px) translateZ(0)';
                self._startTransition();
            }else if(enablePosition){
            	left = wrap.style.left;
        		left ? (left = Number(left.replace('px',''))) : left = 0;
        		time = duration * (Math.ceil(Math.abs(-translateX - left)) / parentWidth);
                time = time>duration ? duration : time;
            	wrap.style[prefixStyle.transitionDuration] = '0ms';
            	this._position(wrap,-translateX,time);
            }else{
            	wrap.style[prefixStyle.transitionDuration] = '0ms';
            	self._translation(wrap, -translateX, duration/2);
            }
            
            endTimeoutId = setTimeout(function() {
            	self.endCallBack();
            },duration+100)
        },
        //向右切换
        toRight: function() {

            if (carouselCount <= 0) return;

            var self = this;
            var translateX = 0;
            var style = null;
            var time = 0;
            var left = 0;

            clearTimeout(autoTimeoutId);
            clearTimeout(endTimeoutId);
            anicomplete = false;
            carouselCount--;
            translateX = parentWidth * carouselCount;

            if(enableTransition){
            	time = duration * (Math.ceil(Math.abs(-translateX - this._getComputedTranslateX())) / parentWidth);
                time = time>duration ? duration : time;
            	wrap.style[prefixStyle.transitionDuration] = time+'ms';
            	//强制刷新
            	this._getComputedTranslateX();
            	wrap.style[prefixStyle.transform] = 'translateX(-' + translateX + 'px) translateZ(0)';
                self._startTransition();
            }else if(enablePosition){
            	left = wrap.style.left;
        		left ? (left = Number(left.replace('px',''))) : left = 0;
        		time = duration * (Math.ceil(Math.abs(-translateX - left)) / parentWidth);
                time = time>duration ? duration : time;
            	wrap.style[prefixStyle.transitionDuration] = '0ms';
            	this._position(wrap,-translateX,time);
            }else{
            	wrap.style[prefixStyle.transitionDuration] = '0ms';
            	self._translation(wrap, -translateX, duration/2);
            }
            //防止endCallBack
            endTimeoutId = setTimeout(function() {
            	self.endCallBack();
            },duration+100)
        },
        //过渡完成回调
       	endCallBack: function () {

       		var self = this;
       		var dom = null;
            var left = 0;
            var cancelRAF = this._getCancelRAF();

            endTime = new Date().getTime();
            anicomplete = true;
            this.activeDot(carouselCount);
            if (carouselCount == 0) {
                direct = 'left';
            } else if (carouselCount == maxCount) {
                direct = 'right';
            }
            cancelRAF(rAFTimeoutId);
            clearTimeout(endTimeoutId);
            clearTimeout(autoTimeoutId);
            autoTimeoutId = setTimeout(function() {
                if (anicomplete) {
                    if (direct == 'left')
                        self.toLeft();
                    else
                        self.toRight();
                }
            }, stay);
        },
        //跟踪transtion过渡
        _startTransition: function(){
            var rAF = this._getRAF();
            var self = this;
            rAF(translate);
            function translate() {
                rAFTimeoutId = rAF(function() {
                    translate();
                    self.activeDot();
                })
            }
        },
        //定位实现切换
        _position: function(dom,offsetX,duration){
        	var self = this;
            var rAF = this._getRAF();
            var prefixStyle = this._getPrefixStyle();
            var startX = 0;
            var dtX = 0;
            var left = 0;
            var sign = 1;
            var now = new Date().getTime();
            startX = self._getComputedStyle('left');
        	startX ? (startX = Number(startX.replace('px',''))) : startX = 0;
            dtX = (1000 / 60) / duration * (offsetX - startX);
            rAF(translate);
            function translate() {
                rAFTimeoutId = rAF(function() {
                    left = wrap.style.left;
        			left ? left = Number(left.replace('px','')) : left = 0;
                    left > 0 && (left = 0);
                    left < parentWidth-wrapWidth && (left = parentWidth-wrapWidth); 
                    if (Math.abs(offsetX - left - dtX) > Math.abs(dtX)) {
                    	left += dtX;
                    	dom.style.left = left + 'px';
                        translate();
                        self.activeDot();
                    } else {
                        rAF(function() {
                            dom.style.left = offsetX + 'px';;
                            self.endCallBack();
                        })
                    }
                })
            }
        },
        //变化实现切换
        _translation: function(dom, offsetX, duration) {
        	var self = this;
            var rAF = window.requestAnimationFrame ||
                window.webkitRequestAnimationFrame ||
                window.mozRequestAnimationFrame ||
                window.oRequestAnimationFrame ||
                window.msRequestAnimationFrame ||
                function(callback) { window.setTimeout(callback, 1000 / 60); };
            var prefixStyle = this._getPrefixStyle();
            var startX = 0;
            var dtX = 0;
            var translateX = 0;
            var sign = 1;
            startX = this._getComputedTranslateX();
            dtX = (1000 / 60) / duration * (offsetX - startX);
            rAF(translate);

            function translate() {
                rAFTimeoutId = rAF(function() {
                    var matrix = dom.style[prefixStyle.transform];
                    if (matrix) {
                        translateX = Number(matrix.replace(/translateX\(|px\)[\s\S]*$/g, ''));
                    }
                    translateX > 0 && (translateX = 0);
                    translateX < parentWidth-wrapWidth && (translateX = parentWidth-wrapWidth); 
                    if (Math.abs(offsetX - translateX - dtX) > Math.abs(dtX)) {
                    	translateX += dtX;
                    	dom.style[prefixStyle.transform] = 'translateX(' + translateX + 'px) translateZ(0)';
                        translate();
                        self.activeDot();
                    } else {
                        rAF(function() {
                            dom.style[prefixStyle.transform] = 'translateX(' + offsetX + 'px) translateZ(0)';
                            self.endCallBack();
                        })
                    }
                })
            }
        },
        //获取css前缀
        _getPrefixStyle: function() {
            var _elementStyle = document.createElement('div').style;
            /**
             * 判断CSS 属性样式前缀
             */
            var _vendor = (function() {
                var vendors = ['t', 'webkitT', 'MozT', 'msT', 'OT'],
                    transform,
                    i = 0,
                    l = vendors.length;
                for (; i < l; i++) {
                    transform = vendors[i] + 'ransform';
                    if (transform in _elementStyle) return vendors[i].substr(0, vendors[i].length - 1);
                }
                return false;
            })();
            /**
             * 获取CSS 前缀
             * @param style
             * @returns {*} 返回CSS3兼容性前缀
             * @private
             */
            function _prefixStyle(style) {
                if (_vendor === false) return false;
                if (_vendor === '') return style;
                return _vendor + style.charAt(0).toUpperCase() + style.substr(1);
            }
            var _transform = _prefixStyle('transform');
            var style = {
                transform: _transform,
                transitionProperty: _prefixStyle('transitionProperty'),
                transitionTimingFunction: _prefixStyle('transitionTimingFunction'),
                transitionDuration: _prefixStyle('transitionDuration'),
                transitionDelay: _prefixStyle('transitionDelay'),
                transformOrigin: _prefixStyle('transformOrigin'),
            };
            return style;
        },
        //获取计算后的translateX
        _getComputedTranslateX: function(){
        	var startX = 0;
        	var style = style = window.getComputedStyle ?window.getComputedStyle(wrap, null) : null || wrap.currentStyle;
            var matrix = style[prefixStyle.transform];
            if (matrix != 'none') {
                startX = Number(matrix.replace(/matrix\(|\)/g, '').split(',')[4]);
            }
            return startX;
        },
        //获取计算后的left值
        _getComputedStyle: function(property){
        	var style = style = window.getComputedStyle ?window.getComputedStyle(wrap, null) : null || wrap.currentStyle;
            return style[property];
        },
        _getRAF: function(){
            var rAF = window.requestAnimationFrame ||
                window.webkitRequestAnimationFrame ||
                window.mozRequestAnimationFrame ||
                window.oRequestAnimationFrame ||
                window.msRequestAnimationFrame;
            var cancelRAF = window.cancelAnimationFrame ||
                window.webkitCancelAnimationFrame ||
                window.mozCancelAnimationFrame ||
                window.oCancelAnimationFrame ||
                window.msCancelAnimationFrame;
            if(rAF && cancelRAF){
                return rAF;
            }else{
                return function(callback) { window.setTimeout(callback, 1000 / 60); };
            }
        },
        _getCancelRAF: function(){
            var rAF = window.requestAnimationFrame ||
                window.webkitRequestAnimationFrame ||
                window.mozRequestAnimationFrame ||
                window.oRequestAnimationFrame ||
                window.msRequestAnimationFrame;
            var cancelRAF = window.cancelAnimationFrame ||
                window.webkitCancelAnimationFrame ||
                window.mozCancelAnimationFrame ||
                window.oCancelAnimationFrame ||
                window.msCancelAnimationFrame;
            if(rAF && cancelRAF){
                return cancelRAF;
            }else{
                return clearTimeout;
            }
        }
    }
    if(typeof define === 'function'){
    	define(function(){
    		return Carousel;
    	})
    }else{
    	window.Carousel = Carousel;
    }

})(window);