/**
* jQuery Overview - A viewport/content length overview
* ====================================================
* jQuery Overview displays two rectangles representing each one the content and the viewport.
*
* Licensed under The MIT License
* 
* @version   0.1
* @since     11.27.2010
* @author    Jose Rui Santos
*
* 
* Input parameter  Default value  Remarks
* ================ =============  ===============================================================================================
* viewport:        window         The element being monitored by the plug-in.
* center:          true           Whether to center the rendering of the inner DIVs relatively to the outer DIV.
* autoHide:        false          Whether to hide the plug-in when the content has the same size or is smaller than the viewport.
* scrollSpeed:     'medium'       Speed used when moving to a selected canvas position   
*
* Alternatively, you can define default values only once, and then use thoughout all the rsOverview calls.
* To define defaults values use the $.fn.rsOverview.defaults, e.g.
* $.fn.rsOverview.defaults.scrollSpeed = 300;
* $.fn.rsOverview.defaults.autoHide = true;
*
* If the size of the content element that is being monited changes, the plug-in must be notified with a call to
* $(element).rsOverview('contentSizeChanged');
* Example:
* You have the following markup being used by the plug-in to monitor the document.
* <div id="overview">
*   <div></div>
*   <div></div>
* </div>
* If the document size changes, then the following call must be made:
* $("#overview").rsOverview('contentSizeChanged');
* This will render the plug-in to the correct area size.

* Usage with default values:
* ==========================
* $('#overview').rsOverview();
*
* <div id="overview">
*   <div></div>
*   <div></div>
* </div>
*
* #overview {
*     position: fixed;
*     width: 200px;
*     height: 300px;
* }
*
* #overview div {
*     position: absolute;
* }
*
*/
(function ($) {
    var OverviewClass = function ($element, opts, scrollbarPixels) {
        var $divs = $("div", $element),
            $contentDiv = $divs.eq(0),
            $viewportDiv = $divs.eq(1),
            cache = {
                coef: 0,           // scale cache
                scrPixels: {
                    x: scrollbarPixels,
                    y: scrollbarPixels
                }
            },

            content = {         // the content element being monitoried. By default, content is the whole document
                $obj: null,
                sizeX: 0,
                sizeY: 0,
                resized: function () {
                    this.sizeX = this.$obj.width();
                    this.sizeY = this.$obj.height();
                },
                resizedOverflow: function () {
                    var obj = this.$obj[0].children.length == 1 ? (this.$obj[0].children[0].children.length > 0 ? this.$obj[0].children[0] : this.$obj[0]) : this.$obj[0];
                    this.sizeX = obj.scrollWidth;
                    this.sizeY = obj.scrollHeight;
                }
            },

            viewport = {        // the viewport element being monitoried. By default, viewport is the browser window
                $obj: null,
                sizeX: 0,
                sizeY: 0,
                resized: function () {
                    this.sizeX = this.$obj.width();
                    this.sizeY = this.$obj.height();
                }
            },

            getXScrollBarPixels = function () {
                return content.sizeX <= viewport.sizeX ? 0 : cache.scrPixels.x;
            },

            getYScrollBarPixels = function () {
                return content.sizeY <= viewport.sizeY ? 0 : cache.scrPixels.y;
            },

            onResize = function (event) {
                if (opts.viewport === window) {
                    content.resized();
                } else {
                    content.resizedOverflow();
                    var ovr = [viewport.$obj.css('overflow-x'), viewport.$obj.css('overflow-y')];
                    cache.scrPixels.x = ovr[0] == 'hidden' ? 0 : scrollbarPixels;
                    cache.scrPixels.y = ovr[1] == 'hidden' ? 0 : scrollbarPixels;
                }
                viewport.resized();

                if (opts.autoHide) {
                    if (content.sizeX <= viewport.sizeX && content.sizeY <= viewport.sizeY) {
                        $element.hide();
                        return;
                    }
                    $element.show();
                }

                var elementSize = {
                    x: $element.width(),
                    y: $element.height()
                },
                    coefX = content.sizeX / elementSize.x,
                    coefY = content.sizeY / elementSize.y;
                cache.coef = Math.max(coefX, coefY);
                coefX = (viewport.sizeX - getYScrollBarPixels()) / elementSize.x;
                coefY = (viewport.sizeY - getXScrollBarPixels()) / elementSize.y;
                cache.coef = Math.max(Math.max(coefX, coefY), cache.coef);

                // compute inner DIV size that corresponds to the size of the content being monitored
                var calcWidth = content.sizeX / cache.coef,
                    calcHeight = content.sizeY / cache.coef;
                $contentDiv.width(calcWidth).height(calcHeight);
                if (opts.center) {
                    $contentDiv.css({
                        'left': ((elementSize.x - calcWidth) / 2) + 'px',
                        'top': ((elementSize.y - calcHeight) / 2) + 'px'
                    });
                }

                $element.trigger('render.rsOverview');
            },

            onRender = function (event) {

                // compute inner DIV size and position that corresponds to the size and position of the viewport monitored
                var calcWidth = (viewport.sizeX - getYScrollBarPixels()) / cache.coef,
                    calcHeight = (viewport.sizeY - getXScrollBarPixels()) / cache.coef;
                $viewportDiv.
                    width(calcWidth).
                    height(calcHeight).
                    css({
                        'left': ((viewport.$obj.scrollLeft() / cache.coef) + (opts.center ? $contentDiv.position().left : 0)) + 'px',
                        'top': ((viewport.$obj.scrollTop() / cache.coef) + (opts.center ? $contentDiv.position().top : 0)) + 'px'
                    });
            },

            init = function () {

                // elements being monitorized for scroll and resize events
                viewport.$obj = $(opts.viewport);
                if (opts.viewport === window) {
                    content.$obj = $(document);
                } else {
                    content.$obj = viewport.$obj;
                }

                // when the viewport is scrolled or when is resized, the plugin is updated
                viewport.$obj.scroll(function () {
                    $element.trigger('render.rsOverview');
                }).resize(function () {
                    $element.trigger('resize.rsOverview');
                });

                $viewportDiv.mousedown(function (e) {
                    var dragInfo = {
                        initPos: $viewportDiv.offset(),
                        initClick: {
                            X: e.pageX,
                            Y: e.pageY
                        }
                    };

                    // prevents text selection during drag
                    this.onselectstart = function () {
                        return false;
                    };

                    $viewportDiv.bind('mousemove.rsOverview', function (e) {
                        var pos = [$element.position(), $contentDiv.position()];
                        viewport.$obj.
                            scrollLeft(cache.coef * (e.pageX - dragInfo.initClick.X + dragInfo.initPos.left - pos[0].left - pos[1].left)).
                            scrollTop(cache.coef * (e.pageY - dragInfo.initClick.Y + dragInfo.initPos.top - pos[0].top - pos[1].top));
                    });
                    e.preventDefault();
                });

                // the mouseup event might happen outside the plugin, so to make sure the unbind always runs, it must done on body level
                $("body").mouseup(function () {
                    $viewportDiv.unbind('mousemove.rsOverview');
                });

                // mouse click on the content: scroll jumps directly to that position
                $contentDiv.mousedown(function (e) {
                    var $pos = [$element.position(), $(this).position()];
                    if (opts.viewport === window) {
                        var scrHtml = [$("html").scrollLeft(), $("html").scrollTop()],
                            scrX, scrY, isSteppingX = true, supportsHtml = (scrHtml[0] != 0 || scrHtml[1] != 0);

                        $("html").animate({
                            scrX: supportsHtml? scrHtml[0] : $("body").scrollLeft(),
                            scrY: supportsHtml? scrHtml[1] : $("body").scrollTop()
                        }, {
                            duration: 0
                        });
                        $("html").animate({
                            scrX: cache.coef * (e.pageX - $pos[0].left - $pos[1].left - $viewportDiv.width() / 2),
                            scrY: cache.coef * (e.pageY - $pos[0].top - $pos[1].top - $viewportDiv.height() / 2)
                        }, { 
                            duration: opts.scrollSpeed,
                            step: function (now, fx) {
                                if (isSteppingX) {
                                    $("html, body").scrollLeft(now);
                                } else {
                                    $("html, body").scrollTop(now);
                                }
                                isSteppingX = !isSteppingX;
                            }
                        });
                    } else {
                        viewport.$obj.animate({
                            scrollLeft: cache.coef * (e.pageX - $pos[0].left - $pos[1].left - $viewportDiv.width() / 2),
                            scrollTop: cache.coef * (e.pageY - $pos[0].top - $pos[1].top - $viewportDiv.height() / 2)
                        }, opts.scrollSpeed);
                    }
                    e.preventDefault();
                });
                $element.bind('resize.rsOverview', onResize).bind('render.rsOverview', onRender);

                // graphical initialization when plugin is called (after page and DOM are loaded)
                $element.trigger('resize.rsOverview');
            };

        init();
    }

    $.fn.rsOverview = function (options) {
        var contentSizeChanged = function () {
            return this.trigger('resize.rsOverview');
        };

        if (typeof options == 'string' && options == 'contentSizeChanged') {
            return contentSizeChanged.apply(this);
        }
        
        var opts = $.extend({}, $.fn.rsOverview.defaults, options),

            // returns the size of a vertical/horizontal scroll bar in pixels
            getScrollbarSize = function () {
                // create a div with overflow: scroll (which forces scrollbars to appear)
                var $calcDiv = $("<div style='visibily: hidden; overflow: scroll; width: 100px;'></div>");
                // place it in DOM
                $("body").append($calcDiv);
                try {
                    var clientWidth = $calcDiv[0].clientWidth;
                    return 100 - (clientWidth == 100 || clientWidth == 0? 83: clientWidth);
                } finally {
                    $calcDiv.remove();
                }
            },

            // number pixels occupied by system scroll bar (only used for overflowed elements);
            scrollbarPixels = opts.viewport === window ? 0 : getScrollbarSize();

        return this.each(function () {
            new OverviewClass($(this), opts, scrollbarPixels);
        });
    };

    // public access to the default input parameters
    $.fn.rsOverview.defaults = {
        viewport: window,
        center: true,
        autoHide: false,
        scrollSpeed: 'medium'
    };

})(jQuery);
