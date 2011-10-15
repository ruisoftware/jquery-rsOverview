/**
* jQuery Overview - A viewport/content length overview
* ====================================================
* jQuery Overview displays two rectangles representing each one the content and the viewport.
*
* Licensed under The MIT License
* 
* @version   2
* @since     11.27.2010
* @author    Jose Rui Santos
*
* Input parameter    Default value  Remarks
* =================  =============  ===============================================================================================
* viewport           window         The element being monitored by the plug-in.
* center             true           Whether to center the rendering of the inner DIVs relatively to the outer DIV.
* autoHide           false          Whether to hide the plug-in when the content has the same size or is smaller than the viewport.
* scrollSpeed        'medium'       Speed used when moving to a selected canvas position or when moving to a bookmark.
* readonly           false          False: Reacts to mouse events; True: Ignores mouse events
* bookmarkClass      '.bookm'       CSS selector class for the bookmarks. Typically should be 1x1 or 3x3 px square with a distinct background color or border
* onChangeCtrlState  null           Event fired when the prev/next/clearAll controls - typically buttons - needs to be disabled/enabled 
* onChangeToggle     null           Event fired when the toggle control - typically a button - needs to be pushed down or up
* If you prefer not to use bookmarks, then just set bookmarkClass to null.
*
* Alternatively, you can define default values only once, and then use thoughout all the rsOverview instances.
* To define defaults values use the $.fn.rsOverview.defaults, e.g.
* $.fn.rsOverview.defaults.scrollSpeed = 300;
* $.fn.rsOverview.defaults.autoHide = true;
*
* Usage with default values:
* ==========================
* $('#overview').rsOverview();
*
* <div id="overview">
*   <div class="content"></div>
*   <div class="viewport"></div>
* </div>
*
* #overview {
*     position: fixed;
*     width: 200px;
*     height: 300px;
* }
*
* .content,
* .viewport {
*     position: absolute;
* }
*
* If the size of the content element that is being monited changes, the plug-in must be notified with a call to 'contentSizeChanged' method.
* Example:
* You have the following markup being used by the plug-in to monitor the document.
*    <div id="overview">
*        <div class="content"></div>
*        <div class="viewport"></div>
*    </div>
* If the document size changes, then the following call must be made:
* $("#overview").rsOverview('contentSizeChanged');
* This will render the plug-in to the correct area size.
*/
(function ($) {
    var OverviewClass = function ($element, opts, scrollbarPixels) {
        var $divs = $element.children("div"),
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

            bookmarkUtil = {
                states: {
                    // states are null(initial state), true or false
                    toggle: null,
                    triggerToggle: function (event, newToggle) {
                        if (opts.onChangeToggle && newToggle !== this.toggle) {
                            this.toggle = newToggle;
                            opts.onChangeToggle(event, this.toggle);
                        }
                    },
                    prev: null,
                    triggerPrev: function (event, newPrev) {
                        if (opts.onChangeCtrlState && newPrev !== this.prev) {
                            this.prev = newPrev;
                            opts.onChangeCtrlState(event, 'prev', this.prev);
                        }
                    },
                    next: null,
                    triggerNext: function (event, newNext) {
                        if (opts.onChangeCtrlState && newNext !== this.next) {
                            this.next = newNext;
                            opts.onChangeCtrlState(event, 'next', this.next);
                        }
                    },
                    clearAll: null,
                    triggerClearAll: function (event, newClearAll) {
                        if (opts.onChangeCtrlState && newClearAll !== this.clearAll) {
                            this.clearAll = newClearAll;
                            opts.onChangeCtrlState(event, 'clear', this.clearAll);
                        }
                    }
                },
                currIdx: 0,
                qt: 0,
                marks: [],
                getPnt: function (key) {
                    var k = key.split("#");
                    return [parseInt(k[0], 10), parseInt(k[1], 10)];
                },
                checkEvents: function (event) {
                    if (opts.onChangeCtrlState) {
                        if (this.currIdx === -1) {
                            this.states.triggerPrev(event, false);
                            this.states.triggerNext(event, false);
                            this.states.triggerClearAll(event, false);
                        } else {
                            this.states.triggerPrev(event, true);
                            this.states.triggerNext(event, this.currIdx < this.qt - 1);
                            this.states.triggerClearAll(event, true);
                        }
                    }
                    this.states.triggerToggle(event, this.isMarked());
                },
                doToggle: function (event, x, y) {
                    var key = x + "#" + y,
                        idx = $.inArray(key, this.marks);
                    if (idx === -1) {
                        this.marks.push(key); // append
                        var pos = [$viewportDiv.position().left - $contentDiv.position().left,
                                   $viewportDiv.position().top - $contentDiv.position().top],
                            half = [$viewportDiv.width() / 2, $viewportDiv.height() / 2],
                            $bookm = $("<div />").
                                addClass(opts.bookmarkClass.replace(/^[.]/, '')). // if opts.bookmarkClass string starts with a period, then remove it
                                appendTo($contentDiv);
                        var size = [$bookm.outerWidth(), $bookm.outerHeight()];
                        $bookm.css({
                            'position': 'absolute',
                            'left': (pos[0] + half[0] - size[0] / 2).toFixed(0) + 'px',
                            'top': (pos[1] + half[1] - size[1] / 2).toFixed(0) + 'px'
                        });
                        this.qt = this.marks.length;
                        this.currIdx = this.qt - 1;
                    } else {
                        this.marks.splice(idx, 1); // delete
                        $(opts.bookmarkClass + ":eq(" + idx + ")", $contentDiv).remove();
                        this.qt = this.marks.length;
                        this.currIdx = idx - 1;
                    }
                    if (event) {
                        this.checkEvents(event);
                    }
                },
                toggle: function (event) {
                    this.doToggle(event, content.$obj.scrollLeft(), content.$obj.scrollTop());
                },
                doClearAll: function (event) {
                    this.marks.length = 0;
                    this.qt = 0;
                    this.currIdx = -1;
                    $(opts.bookmarkClass, $contentDiv).remove();
                    if (event) {
                        this.checkEvents(event);
                    }
                },
                clearAll: function (event) {
                    this.doClearAll(event);
                },
                go: function (idx) {
                    if (idx > -1 && idx < this.qt) {
                        var pnt = this.getPnt(this.marks[idx]);
                        (opts.viewport === window ? $("html,body") : content.$obj).
                            animate({ scrollLeft: pnt[0], scrollTop: pnt[1] }, opts.scrollSpeed);
                        return true;
                    }
                    return false;
                },
                beforeGo: function (offset) {
                    var idx = this.getMarkedIdx();
                    if (idx !== -1) {
                        this.currIdx = idx + offset;
                    }

                    if (this.currIdx < 0) {
                        this.currIdx = 0;
                    }
                    if (this.currIdx > this.qt - 1) {
                        this.currIdx = this.qt - 1;
                    }
                },
                gotoPrev: function (event) {
                    this.beforeGo(-1);
                    var success = this.go(this.currIdx);
                    if (success) {
                        if (opts.onChangeCtrlState) {
                            if (this.currIdx === 0) {
                                this.states.triggerPrev(event, false);
                            }
                            this.states.triggerNext(event, true);
                        }
                        --this.currIdx;
                    }
                    return success;
                },
                gotoNext: function (event) {
                    this.beforeGo(+1);
                    var success = this.go(this.currIdx);
                    if (success) {
                        if (opts.onChangeCtrlState) {
                            if (this.currIdx === this.qt - 1) {
                                this.states.triggerNext(event, false);
                            }
                            this.states.triggerPrev(event, true);
                        }
                        ++this.currIdx;
                    }
                    return success;
                },
                getMarkedIdx: function () {
                    return $.inArray(content.$obj.scrollLeft() + "#" + content.$obj.scrollTop(), this.marks);
                },
                isMarked: function () {
                    return this.getMarkedIdx() > -1;
                },
                parseLoad: function (bookmarks) {
                    var list = [];
                    if (bookmarks) {
                        if (bookmarks instanceof Array) {
                            for (var i in bookmarks) {
                                var elem = bookmarks[i];
                                if (elem) {
                                    try {
                                        var pair = elem.split('#');
                                    } catch (er) {
                                        pair = null; // elem is not a string. Will throw the exception below
                                    }
                                    if (pair && pair.length === 2) {
                                        var pnt = [parseInt(pair[0], 10), parseInt(pair[1], 10)];
                                        if (!isNaN(pnt[0]) && !isNaN(pnt[1])) {
                                            list.push(pnt);
                                            continue;
                                        }
                                    }
                                }
                                throw 'Invalid element ' + elem + ' at index ' + i + '. Expected a "x#y" string object, where x and y are integers. Example: ["0#0","40#80","40#300"]';
                            }
                        } else {
                            throw 'Expected an array of strings "x#y", where x and y are integers. Example: ["0#0","40#80","40#300"]';
                        }
                    }
                    return list;
                },
                loadMarks: function (event, bookmarks) {
                    try {
                        var loaded = this.parseLoad(bookmarks);
                        this.doClearAll(null);
                        for (var i in loaded) {
                            this.doToggle(null, loaded[i][0], loaded[i][1]);
                        }
                        $element.trigger('resize.rsOverview'); // to correctly render the marks
                        this.checkEvents(event);
                    } catch (er) {
                        var msg = 'rsOverview.loadMarks(): ' + er;
                        if (window.console) {
                            console.error(msg);
                        } else {
                            alert(msg);
                        }
                    }
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
                } else {
                    if ($element.is(':hidden')) {
                        $element.show();
                    }
                }

                var elementSize = {
                    x: $element.width(),
                    y: $element.height()
                }, coefX = content.sizeX / elementSize.x,
                    coefY = content.sizeY / elementSize.y;
                cache.coef = Math.max(coefX, coefY);
                coefX = (viewport.sizeX - getYScrollBarPixels()) / elementSize.x;
                coefY = (viewport.sizeY - getXScrollBarPixels()) / elementSize.y;
                cache.coef = Math.max(Math.max(coefX, coefY), cache.coef);

                // compute inner DIV size that corresponds to the size of the content being monitored
                var calcWidth = content.sizeX / cache.coef,
                    calcHeight = content.sizeY / cache.coef;
                $contentDiv.width(calcWidth).height(calcHeight).css({
                    'left': (opts.center ? (elementSize.x - calcWidth) / 2 : 0).toFixed(1) + 'px',
                    'top': (opts.center ? (elementSize.y - calcHeight) / 2 : 0).toFixed(1) + 'px'
                });

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
                        'left': ((viewport.$obj.scrollLeft() / cache.coef) + (opts.center ? $contentDiv.position().left : 0)).toFixed(1) + 'px',
                        'top': ((viewport.$obj.scrollTop() / cache.coef) + (opts.center ? $contentDiv.position().top : 0)).toFixed(1) + 'px'
                    });

                for (var i in bookmarkUtil.marks) {
                    var pnt = bookmarkUtil.getPnt(bookmarkUtil.marks[i]),
                        $bookm = $(opts.bookmarkClass + ":eq(" + i + ")", $contentDiv);
                    $bookm.css({
                        'left': ((calcWidth - $bookm.outerWidth()) / 2 + (pnt[0] / cache.coef)).toFixed(0) + 'px',
                        'top': ((calcHeight - $bookm.outerHeight()) / 2 + (pnt[1] / cache.coef)).toFixed(0) + 'px'
                    });
                }

                if (opts.bookmarkClass) {
                    bookmarkUtil.states.triggerToggle(event, bookmarkUtil.isMarked());
                }
            },
            onBookmarkToggle = function (event) {
                if (opts.bookmarkClass) {
                    bookmarkUtil.toggle(event);
                }
            },
            onBookmarkClearAll = function (event) {
                if (opts.bookmarkClass) {
                    bookmarkUtil.clearAll(event);
                }
            },
            onBookmarkGotoPrev = function (event) {
                if (opts.bookmarkClass) {
                    bookmarkUtil.gotoPrev(event);
                }
            },
            onBookmarkGotoNext = function (event) {
                if (opts.bookmarkClass) {
                    bookmarkUtil.gotoNext(event);
                }
            },
            onGetter = function (event, field) {
                switch (field) {
                    case 'bookmarks': return bookmarkUtil.marks;
                    case 'readonly': return opts.readonly;
                    case 'center': return opts.center;
                    case 'autoHide': return opts.autoHide;
                    case 'scrollSpeed': return opts.scrollSpeed;
                }
                return null;
            },
            onSetter = function (event, field, value) {
                switch (field) {
                    case 'bookmarks':
                        if (opts.bookmarkClass) {
                            bookmarkUtil.loadMarks(event, value);
                        }
                        break;
                    case 'readonly':
                        opts.readonly = value;
                        break;
                    case 'center':
                        opts.center = value;
                        $element.trigger('resize.rsOverview');
                        break;
                    case 'autoHide':
                        opts.autoHide = value;
                        $element.trigger('resize.rsOverview');
                        break;
                    case 'scrollSpeed': opts.scrollSpeed = value;
                }
                return onGetter(event, field);
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
                    if (!opts.readonly) {
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
                    }
                });

                // the mouseup event might happen outside the plugin, so to make sure the unbind always runs, it must done on body level
                $("body").mouseup(function () {
                    if (!opts.readonly) {
                        $viewportDiv.unbind('mousemove.rsOverview');
                    }
                });

                // mouse click on the content: scroll jumps directly to that position
                $contentDiv.mousedown(function (e) {
                    if (!opts.readonly) {
                        var $pos = [$element.position(), $(this).position()];
                        if (opts.viewport === window) {
                            var fromPnt = [$("html").scrollLeft(), $("html").scrollTop()],
                                toPnt = [
                                    cache.coef * (e.pageX - $pos[0].left - $pos[1].left - $viewportDiv.width() / 2),
                                    cache.coef * (e.pageY - $pos[0].top - $pos[1].top - $viewportDiv.height() / 2)
                                ],
                                supportsHtml = (fromPnt[0] != 0 || fromPnt[1] != 0);

                            if (fromPnt[0] === 0 && fromPnt[1] === 0) {
                                fromPnt[0] = $("body").scrollLeft();
                                fromPnt[1] = $("body").scrollTop();
                            }
                            $("html,body").animate({ scrollLeft: toPnt[0], scrollTop: toPnt[1] }, opts.scrollSpeed);

                        } else {
                            viewport.$obj.animate({
                                scrollLeft: cache.coef * (e.pageX - $pos[0].left - $pos[1].left - $viewportDiv.width() / 2),
                                scrollTop: cache.coef * (e.pageY - $pos[0].top - $pos[1].top - $viewportDiv.height() / 2)
                            }, opts.scrollSpeed);
                        }
                        e.preventDefault();
                    }
                });
                $element.
                        bind('resize.rsOverview', onResize).
                        bind('render.rsOverview', onRender).
                        bind('bookmarkToggle.rsOverview', onBookmarkToggle).
                        bind('bookmarkClearAll.rsOverview', onBookmarkClearAll).
                        bind('bookmarkGotoPrev.rsOverview', onBookmarkGotoPrev).
                        bind('bookmarkGotoNext.rsOverview', onBookmarkGotoNext).
                        bind('getter.rsOverview', onGetter).
                        bind('setter.rsOverview', onSetter).
                        css('overflow', 'hidden');

                // graphical initialization when plugin is called (after page and DOM are loaded)
                $element.trigger('resize.rsOverview');
            };

        init();
    }

    $.fn.rsOverview = function (options) {
        var contentSizeChanged = function () {
            return this.trigger('resize.rsOverview');
        },
        bookmarkToggle = function () {
            return this.trigger('bookmarkToggle.rsOverview');
        },
        bookmarkClearAll = function () {
            return this.trigger('bookmarkClearAll.rsOverview');
        },
        bookmarkGotoPrev = function () {
            return this.trigger('bookmarkGotoPrev.rsOverview');
        },
        bookmarkGotoNext = function () {
            return this.trigger('bookmarkGotoNext.rsOverview');
        },
        bookmarkLoadMarks = function (bookmList) {
            return this.trigger('bookmarkLoadMarks.rsOverview', [bookmList]);
        },
        option = function (options) {
            if (typeof arguments[0] == 'string') {
                var op = arguments.length == 1 ? 'getter' : (arguments.length == 2 ? 'setter' : null);
                if (op != null) {
                    return this.eq(0).triggerHandler(op + '.rsOverview', arguments);
                }
            }
        };

        if (typeof options == 'string') {
            var otherArgs = Array.prototype.slice.call(arguments, 1);
            switch (options) {
                case 'contentSizeChanged': return contentSizeChanged.apply(this);
                case 'bookmarkToggle': return bookmarkToggle.apply(this);
                case 'bookmarkClearAll': return bookmarkClearAll.apply(this);
                case 'bookmarkGotoPrev': return bookmarkGotoPrev.apply(this);
                case 'bookmarkGotoNext': return bookmarkGotoNext.apply(this);
                case 'bookmarkLoadMarks': return bookmarkLoadMarks.apply(this, otherArgs);
                case 'option': return option.apply(this, otherArgs);
                default: return this;
            }
        }

        var opts = $.extend({}, $.fn.rsOverview.defaults, options);

        // returns the size of a vertical/horizontal scroll bar in pixels
        getScrollbarSize = function () {
            // create a div with overflow: scroll (which forces scrollbars to appear)
            var $calcDiv = $("<div style='visibily: hidden; overflow: scroll; width: 100px;'></div>");
            // place it in DOM
            $("body").append($calcDiv);
            try {
                var clientWidth = $calcDiv[0].clientWidth;
                return 100 - (clientWidth == 100 || clientWidth == 0 ? 83 : clientWidth);
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
        readonly: false,
        scrollSpeed: 'medium',
        bookmarkClass: '.bookm',
        onChangeCtrlState: null, // function(event, kind, enabled)
        onChangeToggle: null     // function(event, isMarked)
    };

})(jQuery);
