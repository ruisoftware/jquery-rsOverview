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
*
* 
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
    $.fn.rsOverview = function (options) {
        var coef;           // cache used to scale graphically 
        var content = {     // the content element being monitoried. By default, content is the whole document
            obj: null,
            sizeX: 0,
            sizeY: 0,
            resized: function (object) {
                this.sizeX = object.width();
                this.sizeY = object.height();
            }
        };
        var viewport = {    // the viewport element being monitoried. By default, viewport is the browser window
            obj: null,
            sizeX: 0,
            sizeY: 0,
            resized: function () {
                this.sizeX = this.obj.width();
                this.sizeY = this.obj.height();
            }
        };

        // defaults input parameters
        var defaults = {
            viewport: window,
            center: true,
            autoHide: false
        },

        onResize =
            function (event) {
                if (defaults.viewport === window) {
                    content.resized(content.obj);
                } else {
                    var calc = $("div:eq(0)", content.obj);
                    calc.html(content.obj.html());
                    content.resized(calc);
                }
                viewport.resized(viewport.obj);

                if (defaults.autoHide) {
                    if (content.sizeX <= viewport.sizeX && content.sizeY <= viewport.sizeY) {
                        $(this).hide();
                        return;
                    }
                    $(this).show();
                }

                $(this).trigger('rsOverview.render');
            },

        onRender =
            function (event) {
                var overviewCtrl = $(this);
                var coefX = content.sizeX / overviewCtrl.width();
                var coefY = content.sizeY / overviewCtrl.height();
                var scrollbarPixels = defaults.viewport === window ? 0 : scrollbarWidth();
                coef = coefX > coefY ? coefX : coefY;
                coefX = (viewport.sizeX - scrollbarPixels) / overviewCtrl.width();
                coefY = (viewport.sizeY - scrollbarPixels) / overviewCtrl.height();
                coef = coefX > coefY ? (coefX > coef ? coefX : coef) : (coefY > coef ? coefY : coef);

                // compute inner DIV size that corresponds to the size of the content being monitored
                var calcWidth = content.sizeX / coef;
                var calcHeight = content.sizeY / coef;
                var innerContentDiv = $('div:eq(0)', this).width(calcWidth).height(calcHeight);
                if (defaults.center) {
                    innerContentDiv.
                        css('left', (overviewCtrl.width() - calcWidth) / 2).
                        css('top', (overviewCtrl.height() - calcHeight) / 2);
                }

                // compute inner DIV size and position that corresponds to the size and position of the viewport monitored
                calcWidth = (viewport.sizeX - scrollbarPixels) / coef;
                calcHeight = (viewport.sizeY - scrollbarPixels) / coef;
                $('div:eq(1)', this).
                    width(calcWidth).
                    height(calcHeight).
                    css('left', (viewport.obj.scrollLeft() / coef) + (defaults.center ? innerContentDiv.position().left : 0)).
                    css('top', (viewport.obj.scrollTop() / coef) + (defaults.center ? innerContentDiv.position().top : 0));
            },

        // TODO: find some way to calculate the scroll bar width (value for height will be the same)
        scrollbarWidth =
            function () {
                return 17;
            };

        return this.each(function () {
            var overviewCtrl = $(this);

            // if options is not empty, then merge with the default settings
            if (options) {
                $.extend(defaults, options);
            }

            // elements being monitorized for scroll and resize events
            viewport.obj = $(defaults.viewport);
            if (defaults.viewport === window) {
                content.obj = $(document);
            } else {
                content.obj = viewport.obj;
                // hidden div used to calculate the dimensions of an overflowed div
                content.obj.prepend('<div style="float: left; display: none;"></div>');
            }

            // when the viewport is scrolled or when is resized, the plugin is updated
            viewport.obj.scroll(function () {
                overviewCtrl.trigger('rsOverview.render');
            }).resize(function () {
                overviewCtrl.trigger('rsOverview.resize');
            });

            // div:eq(0) selects the content
            // div:eq(1) selects the viewport
            $("div:eq(1)", overviewCtrl).mousedown(function (e) {
                var dragInfo = {
                    initPos: $(this).offset(),
                    initClickX: e.pageX,
                    initClickY: e.pageY
                };

                // prevents text selection during drag
                this.onselectstart = function () {
                    return false;
                };

                $(this).bind('mousemove', function (e) {
                    var innerDIVcontent = $("div:eq(0)", overviewCtrl);
                    viewport.obj.
                        scrollLeft(coef * (e.pageX - dragInfo.initClickX + dragInfo.initPos.left - overviewCtrl.position().left - innerDIVcontent.position().left)).
                        scrollTop(coef * (e.pageY - dragInfo.initClickY + dragInfo.initPos.top - overviewCtrl.position().top - innerDIVcontent.position().top));
                });
                e.preventDefault();
            });

            // the mouseup event might happen outside the plugin, so to make sure the unbind always runs, it must done on body level
            $("body").mouseup(function () {
                $("div:eq(1)", overviewCtrl).unbind('mousemove');
            });

            // mouse click on the content: scroll jumps directly to that position
            $("div:eq(0)", overviewCtrl).mousedown(function (e) {
                (defaults.viewport === window ? $("body, html") : viewport.obj).animate({
                    scrollLeft: coef * (e.pageX - overviewCtrl.position().left - $(this).position().left),
                    scrollTop: coef * (e.pageY - overviewCtrl.position().top - $(this).position().top)
                }, 'fast');
                e.preventDefault();
            });

            overviewCtrl.bind('rsOverview.resize', onResize);
            overviewCtrl.bind('rsOverview.render', onRender);

            // graphical initialization when plugin is called (after page and DOM are loaded)
            overviewCtrl.trigger('rsOverview.resize');
        });
    };
})(jQuery);
