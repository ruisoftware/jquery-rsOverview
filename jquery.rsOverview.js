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
* scrollSpeed:     'medium'       Speed used by the browser to move a selected canvas position   
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
        var coef,               // cache used to scale graphically
            scrollbarPixels,    // number pixels occupied by system scroll bar (only used for overflowed elements)

            content = {         // the content element being monitoried. By default, content is the whole document
                obj: null,
                sizeX: 0,
                sizeY: 0,
                resized: function (object) {
                    this.sizeX = object.width();
                    this.sizeY = object.height();
                }
            },

            viewport = {        // the viewport element being monitoried. By default, viewport is the browser window
                obj: null,
                sizeX: 0,
                sizeY: 0,
                resized: function () {
                    this.sizeX = this.obj.width();
                    this.sizeY = this.obj.height();
                }
            },

            defaults = {        // defaults input parameters
                viewport: window,
                center: true,
                autoHide: false,
                scrollSpeed: 'medium'
            },

        onResize =
            function (event) {
                if (defaults.viewport === window) {
                    content.resized(content.obj);
                } else {
                    // get the overflowed content
                    var overflowedHtml = content.obj.html();
                    try {
                        // hidden div used to calculate the dimensions of an overflowed div
                        content.obj.prepend('<div style="float: left; display: none;"></div>');
                        var calc = $("div:eq(0)", content.obj); // selects the div created above
                        calc.html(overflowedHtml); // place the content in this temp div
                        content.resized(calc); // use this temp div to calculate the content size
                    } finally {
                        content.obj.html(overflowedHtml);
                    }
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
                coef = Math.max(coefX, coefY);
                coefX = (viewport.sizeX - scrollbarPixels) / overviewCtrl.width();
                coefY = (viewport.sizeY - scrollbarPixels) / overviewCtrl.height();
                coef = Math.max(Math.max(coefX, coefY), coef);

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

        // returns the width of a vertical scroll bar in pixels (same as height of an horizontal scroll bar)
        scrollbarWidth =
            function () {
                // create a div with overflow: scroll (which forces scrollbars to appear)
                var calcDiv = $("<div style='visibily: hidden; overflow: scroll; width: 100px;'></div>");
                // place it in DOM
                $("body").append(calcDiv);
                try {
                    return 100 - calcDiv[0].clientWidth;
                } finally {
                    calcDiv.remove();
                }
            };

        return this.each(function () {
            var overviewCtrl = $(this);

            // if options is not empty, then merge with the default settings
            if (options) {
                $.extend(defaults, options);
            }

            scrollbarPixels = defaults.viewport === window ? 0 : scrollbarWidth();

            // elements being monitorized for scroll and resize events
            viewport.obj = $(defaults.viewport);
            if (defaults.viewport === window) {
                content.obj = $(document);
            } else {
                content.obj = viewport.obj;
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
                }, defaults.scrollSpeed);
                e.preventDefault();
            });

            overviewCtrl.bind('rsOverview.resize', onResize);
            overviewCtrl.bind('rsOverview.render', onRender);

            // graphical initialization when plugin is called (after page and DOM are loaded)
            overviewCtrl.trigger('rsOverview.resize');
        });
    };
})(jQuery);
