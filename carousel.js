// define(function() {
    function Carousel(options) {
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
        var dotClassName = ''; //锚点类名
        var activeClassName = ''; //激活的锚点类名
        var direct = 'right'; //轮播方向
        var autoTimeoutId = null; //自动轮播计时器
        var endTimeoutId = null; //动画过渡完成计时器,防止ios qq内置浏览器有时偶尔不触发transitionEnd的bug
        var rAFTimeoutId1 = null; //跟踪transtion过渡计时器
        var rAFTimeoutId2 = null; //定位实现切换计时器
        var rAFTimeoutId3 = null; //变化实现切换计时器
        var anicomplete = true; //动画播放完成
        var carouselCount = 0; //当前移动位置
        var maxCount; //最大的移动位置
        var parentWidth = 0; //父容器宽度
        var wrapWidth = 0; //轮播对象宽度
        var prefixStyle = null; //css3前缀
        var bannerClick = false; //是否点击了banner
        var endTime = new Date().getTime(); //动画结束后的时间戳
        var isWindowFocus = true;
        var CarouselObj = {
            init: function(options) {
                var self = this;
                this.initDefault();
                container = options.container;
                wrap = options.wrap;
                dotsWrap = options.dotsWrap;
                leftArrow = options.leftArrow;
                rightArrow = options.rightArrow;
                duration = options.duration || 1000;
                stay = options.stay || 3000;
                activeClassName = options.activeClassName;
                dotClassName = options.dotClassName;
                options.enableTouch != undefined && (enableTouch = options.enableTouch);
                options.enableTransition != undefined && (enableTransition = options.enableTransition);
                options.enablePosition != undefined && (enablePosition = options.enablePosition);
                options.enableClick != undefined && (enableClick = options.enableClick);
                options.activeClassName
                wrapWidth = wrap.scrollWidth;
                parentWidth = container.clientWidth;
                maxCount = Math.ceil(wrapWidth / parentWidth) - 1;

                if (enableTransition) {
                    enablePosition = false;
                }

                if (enablePosition) {
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

                if (enableTransition) {
                    this._addEvent(container, 'webkitTransitionEnd', function() {
                        self.endCallBack();
                    })
                    this._addEvent(container, 'transitionend', function() {
                        self.endCallBack();
                    })
                    this._addEvent(container, 'oTransitionEnd', function() {
                        self.endCallBack();
                    })
                    this._addEvent(container, 'MSTransitionEnd', function() {
                        self.endCallBack();
                    })
                }

                if (enableTouch) {
                    this.bindTouchEvent();
                }

                if (enableClick) {
                    this.bindDotClickEvent();
                }

                this.bindArrowClickEvent();
                this.endCallBack();
                function onVisibilityChanged(event) {
                    var hidden = event.target.hidden;
                    if (hidden){
                        isWindowFocus = false;
                    }else{
                        isWindowFocus = true;
                        self.endCallBack();
                    }
                }
                document.addEventListener("visibilitychange", onVisibilityChanged, false);
            },
            initDefault: function() {
                prefixStyle = this._getPrefixStyle();
                if (prefixStyle.transitionProperty && prefixStyle.transform) {
                    enableTransition = true;
                } else if (!prefixStyle.transform) {
                    enablePosition = true;
                }
            },
            //创建dot
            createDots: function(carouselCount) {
                var html = '';
                for (var i = 0; i < carouselCount; i++) {
                    if (i == 0) {
                        html += '<div class="' + dotClassName + ' ' + activeClassName + '"></div>';
                    } else {
                        html += '<div class="' + dotClassName + '"></div>';
                    }
                }
                dotsWrap.innerHTML = html;
            },
            //激活dot
            activeDot: function(num) {
                var offsetX = 0;
                if (!num && num != 0) {
                    if (enablePosition) {
                        offsetX = this._getComputedStyle('left');
                        offsetX ? (offsetX = Number(offsetX.replace('px', ''))) : offsetX = 0;
                    } else {
                        offsetX = this._getComputedTranslateX();
                    }
                    num = Math.floor((Math.abs(offsetX) + parentWidth / 2) / parentWidth);
                }
                dom = dotsWrap.getElementsByClassName(activeClassName)[0];
                if (dom) {
                    dom.className = dotClassName;
                }
                //防止当前容器删除后报错
                if(dotsWrap.getElementsByClassName(dotClassName)[num]){
                    dotsWrap.getElementsByClassName(dotClassName)[num].className = dotClassName + ' ' + activeClassName;
                }
            },
            bindDotClickEvent: function() {
                var self = this;
                var dots = dotsWrap.getElementsByClassName(dotClassName);
                var length = dots.length;
                for (var i = 0; i < length; i++) {
                    (function(num) {
                        self._bindClickEvent(dots[num], function(event) {
                            self._stopPropagation(event);
                            self.goToNoTransition(num);
                        })
                    })(i)
                }
            },
            //绑定左右箭头切换事件
            bindArrowClickEvent: function() {
                var self = this;
                var offsetX = 0;
                if (leftArrow) {
                    self._bindClickEvent(leftArrow, function(event) {
                        self._stopPropagation(event);
                        if (carouselCount < maxCount) {
                            _stop();
                            self.toLeft();
                        }
                    })
                }
                if (rightArrow) {
                    self._bindClickEvent(rightArrow, function(event) {
                        self._stopPropagation(event);
                        if (carouselCount > 0) {
                            _stop();
                            self.toRight();
                        }
                    })
                }

                function _stop() {
                    self._clearAllTimeoutId();
                    if (!enablePosition) {
                        wrap.style[prefixStyle.transitionDuration] = '0ms';
                        translateX = self._getComputedTranslateX();
                        offsetX = translateX;
                        wrap.style[prefixStyle.transform] = 'translateX(' + translateX + 'px) translateZ(0)';
                    } else {
                        wrap.style[prefixStyle.transitionDuration] = '0ms';
                        left = self._getComputedStyle('left');
                        left ? (left = Number(left.replace('px', ''))) : left = 0;
                        offsetX = left;
                        wrap.style.left = left + 'px';
                    }
                }
            },
            //绑定触屏事件
            bindTouchEvent: function() {
                var self = this;
                var startX = 0;
                var translateX = 0;
                var left = 0;
                this._addEvent(container, 'touchstart', function(event) {
                    self._clearAllTimeoutId();
                    bannerClick = false;
                    startX = event.touches[0].pageX;
                    if (!enablePosition) {
                        wrap.style[prefixStyle.transitionDuration] = '0ms';
                        translateX = self._getComputedTranslateX();
                        wrap.style[prefixStyle.transform] = 'translateX(' + translateX + 'px) translateZ(0)';
                    } else {
                        wrap.style[prefixStyle.transitionDuration] = '0ms';
                        left = self._getComputedStyle('left');
                        left ? (left = Number(left.replace('px', ''))) : left = 0;
                        wrap.style.left = left + 'px';
                    }
                })
                this._addEvent(container, 'touchmove', function(event) {
                    //防止ios下拉
                    self._preventDefault(event);
                    self._stopPropagation(event);
                    var dtX = event.touches[0].pageX - startX;
                    var _translateX = translateX + dtX > 0 ? 0 : translateX + dtX;
                    var _left = left + dtX > 0 ? 0 : left + dtX;
                    _translateX = _translateX < parentWidth - wrapWidth ? parentWidth - wrapWidth : _translateX;
                    _left = _left < parentWidth - wrapWidth ? parentWidth - wrapWidth : _left;
                    if (!enablePosition) {
                        wrap.style[prefixStyle.transform] = 'translateX(' + _translateX + 'px) translateZ(0)';
                    } else {
                        wrap.style.left = _left + 'px';
                    }
                })
                this._addEvent(container, 'touchend', function(event) {
                    if (!enablePosition) {
                        translateX = self._getComputedTranslateX();
                        next(translateX);
                    } else {
                        left = self._getComputedStyle('left');
                        left ? (left = Number(left.replace('px', ''))) : left = 0;
                        next(left);
                    }

                    function next(offsetX) {
                        var now = new Date().getTime();
                        //点击后继续移动
                        if (Math.abs(event.changedTouches[0].pageX - startX) < 5) {
                            bannerClick = true;
                            if (carouselCount == 0) {
                                direct = 'left';
                            } else if (carouselCount == maxCount) {
                                direct = 'right';
                            }
                            if (anicomplete) {
                                autoTimeoutId = setTimeout(function() {
                                    if (direct == 'left')
                                        self.toLeft();
                                    else
                                        self.toRight();
                                }, stay - (now - endTime));
                            } else {
                                if (direct == 'left')
                                    self.toLeft();
                                else
                                    self.toRight();
                            }
                            return;
                        }
                        anicomplete = false;
                        if (event.changedTouches[0].pageX > startX) {
                            //跟新carouselCount
                            carouselCount = Math.ceil(Math.abs(offsetX / parentWidth));
                            if (carouselCount == 0) {
                                self.goTo(0)
                                return;
                            }
                            self.toRight();
                        } else {
                            //跟新carouselCount
                            carouselCount = Math.floor(Math.abs(offsetX / parentWidth));
                            if (carouselCount == maxCount) {
                                self.goTo(maxCount);
                                return;
                            }
                            self.toLeft();
                        }
                    }

                })
            },
            //根据index切换到
            goTo: function(num) {
                var self = this;
                var translateX = num * parentWidth;
                anicomplete = false;
                this._translateX(translateX);
            },
            //根据index切换到(无过渡效果)
            goToNoTransition: function(num) {
                var translateX = -num * parentWidth;
                this._clearAllTimeoutId();
                if (!enablePosition) {
                    wrap.style[prefixStyle.transitionDuration] = '0ms';
                    //强制刷新
                    this._getComputedTranslateX();
                    wrap.style[prefixStyle.transform] = 'translateX(' + translateX + 'px) translateZ(0)';
                } else {
                    wrap.style.left = translateX + 'px';
                }
                carouselCount = num;
                this.endCallBack();
                this.activeDot(num);
            },
            //向右切换
            toLeft: function() {
                if (carouselCount >= maxCount) {
                    this.endCallBack();
                    return;
                };
                var translateX = 0;
                var style = null;
                var startX = 0;
                var time = 0;
                var left = 0;

                this._clearAllTimeoutId();
                anicomplete = false;
                carouselCount++;

                if (carouselCount < maxCount) {
                    translateX = parentWidth * carouselCount;
                } else if (carouselCount == maxCount) {
                    translateX = wrapWidth - parentWidth;
                }

                this._translateX(translateX);
            },
            //向右切换
            toRight: function() {
                if (carouselCount <= 0) {
                    this.endCallBack();
                    return;
                }
                var translateX = 0;
                var style = null;
                var time = 0;
                var left = 0;

                this._clearAllTimeoutId();
                anicomplete = false;
                carouselCount--;
                translateX = parentWidth * carouselCount;
                this._translateX(translateX);

            },
            //过渡完成回调
            endCallBack: function() {
                //如果容器已被删除，停止轮播
                if(!wrap.isConnected){
                    this._clearAllTimeoutId();
                    return;
                }
                var self = this;
                var dom = null;
                var offsetX = 0;

                endTime = new Date().getTime();
                this.activeDot(carouselCount);
                if (carouselCount == 0) {
                    direct = 'left';
                } else if (carouselCount == maxCount) {
                    direct = 'right';
                }
                this._clearAllTimeoutId();
                if (enablePosition) {
                    offsetX = this._getComputedStyle('left');
                    offsetX ? (offsetX = Number(offsetX.replace('px', ''))) : offsetX = 0;
                } else {
                    offsetX = this._getComputedTranslateX();
                }
                if (-carouselCount * parentWidth != offsetX) {
                    if (!enablePosition) {
                        wrap.style[prefixStyle.transitionDuration] = '0ms';
                        wrap.style[prefixStyle.transform] = 'translateX(' + offsetX + 'px) translateZ(0)';
                    } else {
                        wrap.style[prefixStyle.transitionDuration] = '0ms';
                        wrap.style.left = offsetX + 'px';
                    }
                    this._translateX(carouselCount * parentWidth);
                } else {
                    anicomplete = true;
                    autoTimeoutId = setTimeout(function() {
                        if (anicomplete) {
                            if (direct == 'left')
                                self.toLeft();
                            else
                                self.toRight();
                        }
                    }, stay);
                }
            },
            //跟踪transtion过渡
            _startTransition: function() {
                var rAF = this._getRAF();
                var self = this;
                rAF(translate);

                function translate() {
                    rAFTimeoutId1 = rAF(function() {
                        translate();
                        self.activeDot();
                    })
                }
            },
            //定位实现切换
            _position: function(dom, offsetX, duration) {
                var self = this;
                var rAF = this._getRAF();
                var prefixStyle = this._getPrefixStyle();
                var startX = 0;
                var dtX = 0;
                var left = 0;
                var sign = 1;
                var now = new Date().getTime();
                startX = self._getComputedStyle('left');
                startX ? (startX = Number(startX.replace('px', ''))) : startX = 0;
                dtX = (1000 / 60) / duration * (offsetX - startX);
                rAF(translate);

                function translate() {
                    rAFTimeoutId2 = rAF(function() {
                        left = wrap.style.left;
                        left ? left = Number(left.replace('px', '')) : left = 0;
                        left > 0 && (left = 0);
                        left < parentWidth - wrapWidth && (left = parentWidth - wrapWidth);
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
                    rAFTimeoutId3 = rAF(function() {
                        var matrix = dom.style[prefixStyle.transform];
                        if (matrix) {
                            translateX = Number(matrix.replace(/translateX\(|px\)[\s\S]*$/g, ''));
                        }
                        translateX > 0 && (translateX = 0);
                        translateX < parentWidth - wrapWidth && (translateX = parentWidth - wrapWidth);
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
            //x轴平移
            _translateX: function(translateX) {
                var self = this;
                if (enableTransition) {
                    time = duration * (Math.ceil(Math.abs(-translateX - this._getComputedTranslateX())) / parentWidth);
                    time = time > duration ? duration : time;
                    wrap.style[prefixStyle.transitionDuration] = time + 'ms';
                    //强制刷新
                    this._getComputedTranslateX();
                    wrap.style[prefixStyle.transform] = 'translateX(-' + translateX + 'px) translateZ(0)';
                    self._startTransition();
                    //防止transitionend不响应
                    endTimeoutId = setTimeout(function() {
                        self.endCallBack();
                    }, duration + 100)
                } else if (enablePosition) {
                    left = wrap.style.left;
                    left ? (left = Number(left.replace('px', ''))) : left = 0;
                    time = duration * (Math.ceil(Math.abs(-translateX - left)) / parentWidth);
                    time = time > duration ? duration : time;
                    wrap.style[prefixStyle.transitionDuration] = '0ms';
                    this._position(wrap, -translateX, time);
                } else {
                    wrap.style[prefixStyle.transitionDuration] = '0ms';
                    self._translation(wrap, -translateX, duration / 2);
                }

            },
            _clearAllTimeoutId: function() {
                var cancelRAF = this._getCancelRAF();
                cancelRAF(rAFTimeoutId1);
                cancelRAF(rAFTimeoutId2);
                cancelRAF(rAFTimeoutId3);
                clearTimeout(autoTimeoutId);
                clearTimeout(endTimeoutId);
            },
            //兼容ios冒泡,banner.click 阻止默认事件后，将不会触发子元素的点击
            _bindClickEvent: function(dom, fn) {
                var self = this;
                this._addEvent(dom, 'touchstart', function(event) {
                    self._stopPropagation(event);
                })
                this._addEvent(dom, 'touchmove', function(event) {
                    self._preventDefault(event);
                    self._stopPropagation(event);
                })
                this._addEvent(dom, 'touchend', function(event) {
                    self._stopPropagation(event);
                })
                this._addEvent(dom, 'click', fn);
            },
            _addEvent: function(ele, event_name, func) {
                if (window.attachEvent) {
                    ele.attachEvent('on' + event_name, func);
                } else {
                    ele.addEventListener(event_name, func, false); //默认事件是冒泡
                }
            },
            _stopPropagation: function(e) {
                if (e && e.stopPropagation) { //非IE   
                    e.stopPropagation();
                } else { //IE   
                    window.event.cancelBubble = true;
                }
            },
            _preventDefault: function(e) {
                e.preventDefault ? e.preventDefault() : (e.returnValue = false);
            },
            //获取css前缀
            _getPrefixStyle: function() {
                var _elementStyle = document.createElement('div').style;

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
            _getComputedTranslateX: function() {
                var startX = 0;
                var style = style = window.getComputedStyle ? window.getComputedStyle(wrap, null) : null || wrap.currentStyle;
                var matrix = style[prefixStyle.transform];
                if (matrix != 'none') {
                    startX = Number(matrix.replace(/matrix\(|\)/g, '').split(',')[4]);
                }
                return startX;
            },
            //获取计算后的left值
            _getComputedStyle: function(property) {
                var style = window.getComputedStyle ? window.getComputedStyle(wrap, null) : null || wrap.currentStyle;
                return style[property];
            },
            //获取requestAnimationFrame帧函数
            _getRAF: function() {
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
                if (rAF && cancelRAF) {
                    return rAF;
                } else {
                    return function(callback) { window.setTimeout(callback, 1000 / 60); };
                }
            },
            //获取cancelAnimationFrame取消帧函数
            _getCancelRAF: function() {
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
                if (rAF && cancelRAF) {
                    return cancelRAF;
                } else {
                    return clearTimeout;
                }
            }
        }
        if(options){
            CarouselObj.init(options);
        }
        return CarouselObj;
    }
//     return Carousel;
// })