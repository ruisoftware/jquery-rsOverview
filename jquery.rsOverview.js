(function ($) {
    $.fn.rsOverview = function (options) {
        var coef;           // cache used to scale graphically 
        var viewportObj;    // the viewport element being monitoried
        var content = {     // the content element being monitoried. By default, content is the whole document
            obj: null,
            sizeX: 0,
            sizeY: 0
        };

        // defaults input parameters
        var defaults = {
            'viewport': window
        },

        onResize =
            function (event) {
                if (defaults.viewport === window) {
                    content.sizeX = content.obj.width();
                    content.sizeY = content.obj.height();
                } else {
                    var calc = $("div:eq(0)", content.obj);
                    calc.html(content.obj.html());
                    content.sizeX = calc.width();
                    content.sizeY = calc.height();
                }
                $(this).trigger('rsOverview.render');
            },

        onRender =
            function (event) {
                var overviewCtrl = $(this);
                var coefX = content.sizeX / overviewCtrl.width();
                var coefY = content.sizeY / overviewCtrl.height();
                coef = coefX > coefY ? coefX : coefY;
                coefX = (viewportObj.width() - scrollbarPixels) / overviewCtrl.width();
                coefY = (viewportObj.height() - scrollbarPixels) / overviewCtrl.height();
                coef = coefX > coefY ? (coefX > coef ? coefX : coef) : (coefY > coef ? coefY : coef);
                $('div:eq(0)', this).
                    width(content.sizeX / coef).
                    height(content.sizeY / coef);
                $('div:eq(1)', this).
                    width((viewportObj.width() - scrollbarPixels) / coef).
                    height((viewportObj.height() - scrollbarPixels) / coef).
                    css('left', viewportObj.scrollLeft() / coef).
                    css('top', viewportObj.scrollTop() / coef);
            },

        // TODO: find some way to calculate the scroll bar width (value for height will be the same)
        scrollbarWidth =
            function () {
                return 17;
            };
        
        var scrollbarPixels = scrollbarWidth();

        return this.each(function () {
            var overviewCtrl = $(this);

            // if options is not empty, then merge with the default settings
            if (options) {
                $.extend(defaults, options);
            }

            // elements being monitorized for scroll and resize events
            viewportObj = $(defaults.viewport);
            if (defaults.viewport === window) {
                content.obj = $(document);
            } else {
                content.obj = viewportObj;
                // hidden div used to calculate the dimensions of an overflowed div
                content.obj.prepend('<div style="float: left; display: none;"></div>');
            }

            // when the viewport is scrolled or when is resized, the plugin is updated
            viewportObj.scroll(function () {
                overviewCtrl.trigger('rsOverview.render');
            }).resize(function () {
                overviewCtrl.trigger('rsOverview.resize');
            });

            // div:eq(0) selects the canvas
            // div:eq(1) selects the viewport
            $("div:eq(1)", overviewCtrl).mousedown(function (e) {
                var dragInfo = {
                    initPos: $(this).offset(),
                    initClickX: e.pageX,
                    initClickY: e.pageY
                };
                $(this).bind('mousemove', function (e) {
                    viewportObj.
                        scrollLeft(coef * (e.pageX - dragInfo.initClickX + dragInfo.initPos.left - overviewCtrl.position().left)).
                        scrollTop(coef * (e.pageY - dragInfo.initClickY + dragInfo.initPos.top - overviewCtrl.position().top));
                });
            });


            // the mouseup event might happen outside the plugin, so to make sure the unbind always runs, it must done on body level
            $("body").mouseup(function () {
                $("div:eq(1)", overviewCtrl).unbind('mousemove');
            });

            // mouse click on the canvas: scroll jumps directly to that position
            $("div:eq(0)", overviewCtrl).mousedown(function (e) {
                (defaults.viewport === window ? $("body, html") : viewportObj).animate({
                    scrollLeft: coef * (e.pageX - overviewCtrl.position().left),
                    scrollTop: coef * (e.pageY - overviewCtrl.position().top)
                }, 'fast');
            });

            overviewCtrl.bind('rsOverview.resize', onResize);
            overviewCtrl.bind('rsOverview.render', onRender);

            // graphical initialization when plugin is called (after page and DOM are loaded)
            overviewCtrl.trigger('rsOverview.resize');
        });
    };

})(jQuery);
