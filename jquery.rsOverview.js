/**
* jQuery Overview - A viewport/content length overview
* ====================================================
* jQuery Overview displays two rectangles representing each one the content and the viewport.
* Provides an overview of the whole page to the user.
*
* Licensed under The MIT License
* 
* @version   3
* @since     11.27.2010
* @author    Jose Rui Santos
*
*
* Usage with default values:
* ==========================
* $('#overview').rsOverview();
*
* Required markup
* ==========================
* <div id="overview"></div>
*
* Markup generated
* ==========================
* Two children div elements are added to the #overview.
* <div id="overview">
*   <div class="content"></div>
*   <div class="viewport"></div>
* </div>
*
* CSS
* ==========================
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
* Please check the bottom of this file, for documentation regarding parameters.
* 
* If you don't want to use bookmarks, then just set bookmarkClass to null (or do not call any bookmark related methods), e.g.
  $('#overview').rsOverview({
      bookmarkClass: null,
      monitor: $("#memo")    // use this plug-in on an overflow element and not on the whole page
  });
* 
* Alternatively, you can change the default values only once, and then use thoughout all the plug-in instances.
* To define defaults values use the $.fn.rsOverview.defaults, e.g.
* $.fn.rsOverview.defaults.scrollSpeed = 300;
* $.fn.rsOverview.defaults.autoHide = true;
* 
* 
* Methods              Remarks
* ===================  ==================================================================================================================
* contentSizeChanged   Call this method when content has been changed dynamically. It notifies the plug-in to rescale to the correct size
* toggleBk             Create/remove a bookmark in the current scroll position. Typically called from a "Toggle bookmark" control.
* clearBk              Removes all bookmarks created so far. Typically called from a "Clear all" control.
* prevBk               Scrolls the content backwards to previous bookmark
* nextBk               Scrolls the content forwards to next bookmark

* 
* Events:
* ===================================================
* onChangeCtrlState: function(event, kind, enabled)     kind can be 'prev', 'next', 'clear'. enabled can be true or false.
* onChangeToggle: function(event, isMarked)             isMarked is true when current location is bookmarked, false otwerwise
*
* Events are defined at construction time, e.g.,
    $("#overview").rsOverview({
        onChangeCtrlState: function (event, kind, enabled) {
            if (enabled) {
                $("#btnBookmark" + kind).removeAttr("disabled");
            } else {
                $("#btnBookmark" + kind).attr("disabled", "disabled");
            }
        },
        onChangeToggle: function (event, isMarked) {
            $("#btnBookmarkToggle").toggleClass('.buttonDown', isMarked); // make button down when isMarked is true or up when isMarked is false
        }
    });
*
*
* Getters       Return          Remarks
* ============  ==============  ===========================================================================================================
* bookmarks     String array    Returns all the bookmarks. Each string element from the array has the format 'x#y', where x and y are integers that represent the bookmark location.
* readonly      boolean         Returns false if the plug-in receives mouse events; true otherwise.
* center        boolean         Returns false if the two content and viewport rectangules, are positionated on top left corner; True if they are centered relatively to the outer DIV.
* autoHide      boolean         Returns false if the plug-in is always visible; true to hide it when the content has the same or smaller size than the viewport.
* scrollSpeed   integer/string  Returns the current animation speed in ms when moving from one location to other, trigered by mouse click or by bookmark navigation. Use 0 for no animation. The strings 'slow', 'normal' and 'fast' can also be used.
* Example:
    var isReadOnly = $("#overview").rsOverview('option', 'readonly');
*
*
* Setters           Input         Remarks
* ================  ============  ============================================================================================================
* bookmarks         String array  Parses the input array and on success, creates all bookmarks from that array. Any previous bookmarks are removed.
* readonly          boolean       Enables or disables the mouse input
* center            boolean       Affects the way the two content and viewport rectangules are rendered: centered relatively to the outer DIV or not
* autoHide          boolean       If true then the plug-in automatically hides itself when content has the same or smaller size than the viewport
* scrollSpeed       integer/string 
* All setters return the value that was just set.
* Example:
    $("#overview").rsOverview('option', 'bookmarks', ['0#0', '0#100', '50#800']);  // loads 3 bookmarks 
*
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
*
*
* This plug-in follows all good jQuery practises, namely:
*  The possibility to use more than one instance on the same web page
*  The possibility to work with more than one instance simultaneously, e.g. $("#overviewDoc, #overviewDiv").rsOverview('bookmarkToggle');
*  Except for getter/setter calls, it respects jQuery chaining, which allows calling multiple methods on the same statement.
*/
(function ($) {
    var OverviewClass = function ($elem, opts, scrollbarPixels) {
        var $contentDiv = null,
            $viewportDiv = null,
            monitorWindow = opts.monitor === window || $(opts.monitor).is($(window)),
            cache = {
                scaleCoef: 0,
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
                        (monitorWindow ? $("html,body") : content.$obj).
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
                        $elem.trigger('resize.rsOverview'); // to correctly render the marks
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
                if (monitorWindow) {
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
                        $elem.hide();
                        return;
                    }
                    $elem.show();
                } else {
                    if ($elem.is(':hidden')) {
                        $elem.show();
                    }
                }

                var elementSize = {
                    x: $elem.width(),
                    y: $elem.height()
                }, coefX = content.sizeX / elementSize.x,
                    coefY = content.sizeY / elementSize.y;
                cache.scaleCoef = Math.max(coefX, coefY);
                coefX = (viewport.sizeX - getYScrollBarPixels()) / elementSize.x;
                coefY = (viewport.sizeY - getXScrollBarPixels()) / elementSize.y;
                cache.scaleCoef = Math.max(Math.max(coefX, coefY), cache.scaleCoef);

                // compute inner DIV size that corresponds to the size of the content being monitored
                var calcWidth = content.sizeX / cache.scaleCoef,
                    calcHeight = content.sizeY / cache.scaleCoef;
                $contentDiv.width(calcWidth).height(calcHeight).css({
                    'left': (opts.center ? (elementSize.x - calcWidth) / 2 : 0).toFixed(0) + 'px',
                    'top': (opts.center ? (elementSize.y - calcHeight) / 2 : 0).toFixed(0) + 'px'
                });

                $elem.trigger('render.rsOverview');
            },

            onRender = function (event) {
                // compute inner DIV size and position that corresponds to the size and position of the viewport monitored
                var calcWidth = (viewport.sizeX - getYScrollBarPixels()) / cache.scaleCoef,
                    calcHeight = (viewport.sizeY - getXScrollBarPixels()) / cache.scaleCoef;
                $viewportDiv.
                    width(calcWidth).
                    height(calcHeight).
                    css({
                        'left': ((viewport.$obj.scrollLeft() / cache.scaleCoef) + (opts.center ? $contentDiv.position().left : 0)).toFixed(1) + 'px',
                        'top': ((viewport.$obj.scrollTop() / cache.scaleCoef) + (opts.center ? $contentDiv.position().top : 0)).toFixed(1) + 'px'
                    });

                for (var i in bookmarkUtil.marks) {
                    var pnt = bookmarkUtil.getPnt(bookmarkUtil.marks[i]),
                        $bookm = $(opts.bookmarkClass + ":eq(" + i + ")", $contentDiv);
                    $bookm.css({
                        'left': ((calcWidth - $bookm.outerWidth()) / 2 + (pnt[0] / cache.scaleCoef)).toFixed(0) + 'px',
                        'top': ((calcHeight - $bookm.outerHeight()) / 2 + (pnt[1] / cache.scaleCoef)).toFixed(0) + 'px'
                    });
                }

                if (opts.bookmarkClass) {
                    bookmarkUtil.states.triggerToggle(event, bookmarkUtil.isMarked());
                }
            },
            onToggleBk = function (event) {
                if (opts.bookmarkClass) {
                    bookmarkUtil.toggle(event);
                }
            },
            onClearBk = function (event) {
                if (opts.bookmarkClass) {
                    bookmarkUtil.clearAll(event);
                }
            },
            onPrevBk = function (event) {
                if (opts.bookmarkClass) {
                    bookmarkUtil.gotoPrev(event);
                }
            },
            onNextBk = function (event) {
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
                        $elem.trigger('resize.rsOverview');
                        break;
                    case 'autoHide':
                        opts.autoHide = value;
                        $elem.trigger('resize.rsOverview');
                        break;
                    case 'scrollSpeed': opts.scrollSpeed = value;
                }
                return onGetter(event, field);
            },
            onCreate = function (event) {
                if (opts.onCreate) {
                    opts.onCreate(event);
                }
            },
            init = function () {
                $contentDiv = $("<div>").addClass(opts.contentClass).css('overflow', 'hidden');
                $viewportDiv = $("<div>").addClass(opts.viewportClass);
                $elem.append($contentDiv).append($viewportDiv);

                // elements being monitorized for scroll and resize events
                viewport.$obj = $(opts.monitor);
                if (monitorWindow) {
                    content.$obj = $(document);
                } else {
                    content.$obj = viewport.$obj;
                }

                // when the viewport is scrolled or when is resized, the plugin is updated
                viewport.$obj.scroll(function () {
                    $elem.trigger('render.rsOverview');
                }).resize(function () {
                    $elem.trigger('resize.rsOverview');
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
                            var pos = [$elem.position(), $contentDiv.position()];
                            viewport.$obj.
                                    scrollLeft(cache.scaleCoef * (e.pageX - dragInfo.initClick.X + dragInfo.initPos.left - pos[0].left - pos[1].left)).
                                    scrollTop(cache.scaleCoef * (e.pageY - dragInfo.initClick.Y + dragInfo.initPos.top - pos[0].top - pos[1].top));
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

                // mouse click on the content: viewport jumps directly to that position
                $contentDiv.mousedown(function (e) {
                    if (!opts.readonly) {
                        var $pos = [$elem.position(), $(this).position()];
                        if (monitorWindow) {
                            var fromPnt = [$("html").scrollLeft(), $("html").scrollTop()],
                                toPnt = [
                                    cache.scaleCoef * (e.pageX - $pos[0].left - $pos[1].left - $viewportDiv.width() / 2),
                                    cache.scaleCoef * (e.pageY - $pos[0].top - $pos[1].top - $viewportDiv.height() / 2)
                                ],
                                supportsHtml = (fromPnt[0] != 0 || fromPnt[1] != 0);

                            if (fromPnt[0] === 0 && fromPnt[1] === 0) {
                                fromPnt[0] = $("body").scrollLeft();
                                fromPnt[1] = $("body").scrollTop();
                            }
                            $("html,body").animate({ scrollLeft: toPnt[0], scrollTop: toPnt[1] }, opts.scrollSpeed);

                        } else {
                            viewport.$obj.animate({
                                scrollLeft: cache.scaleCoef * (e.pageX - $pos[0].left - $pos[1].left - $viewportDiv.width() / 2),
                                scrollTop: cache.scaleCoef * (e.pageY - $pos[0].top - $pos[1].top - $viewportDiv.height() / 2)
                            }, opts.scrollSpeed);
                        }
                        e.preventDefault();
                    }
                });

                $elem.
                    bind('resize.rsOverview', onResize).
                    bind('render.rsOverview', onRender).
                    bind('toggleBk.rsOverview', onToggleBk).
                    bind('clearBk.rsOverview', onClearBk).
                    bind('prevBk.rsOverview', onPrevBk).
                    bind('nextBk.rsOverview', onNextBk).
                    bind('getter.rsOverview', onGetter).
                    bind('setter.rsOverview', onSetter).
                    bind('create.rsOverview', onCreate);

                // graphical initialization when plugin is called (after page and DOM are loaded)
                $elem.trigger('resize.rsOverview');

                $elem.triggerHandler('create.rsOverview');
            };

        init();
    }

    $.fn.rsOverview = function (options) {
        var contentSizeChanged = function () {
            return this.trigger('resize.rsOverview');
        },
        bookmarkToggle = function () {
            return this.trigger('toggleBk.rsOverview');
        },
        bookmarkClearAll = function () {
            return this.trigger('clearBk.rsOverview');
        },
        bookmarkGotoPrev = function () {
            return this.trigger('prevBk.rsOverview');
        },
        bookmarkGotoNext = function () {
            return this.trigger('nextBk.rsOverview');
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
                case 'toggleBk': return bookmarkToggle.apply(this);
                case 'clearBk': return bookmarkClearAll.apply(this);
                case 'prevBk': return bookmarkGotoPrev.apply(this);
                case 'nextBk': return bookmarkGotoNext.apply(this);
                case 'option': return option.apply(this, otherArgs);
                default: return this;
            }
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
                return 100 - (clientWidth == 100 || clientWidth == 0 ? 83 : clientWidth);
            } finally {
                $calcDiv.remove();
            }
        },

        // number pixels occupied by system scroll bar (only used for overflowed elements);
        scrollbarPixels = opts.monitor === window || opts.monitor === $(window) ? 0 : getScrollbarSize();

        return this.each(function () {
            new OverviewClass($(this), opts, scrollbarPixels);
        });
    };

    // public access to the default input parameters
    $.fn.rsOverview.defaults = {
        monitor: $(window),         // The element being monitored by the plug-in. Type: jQuery object.
        center: true,               // Whether to render the content and viewport reactangles centered in the placeholder area. Type: boolean.
        autoHide: false,            // Whether to hide the plug-in when the content has the same size or is smaller than the viewport. Type: boolean.
        readonly: false,            // False: Reacts to mouse/keyboard events; True: Ignores mouse/keyboard events. Type: boolean.
        scrollSpeed: 'medium',      // Speed used when moving to a selected canvas position or when moving to a bookmark. You can also use a sepecific duration in milliseconds. Type: string or integer.
        bookmarkClass: 'bookm',     // CSS class(es) for bookmark style. Typically should be 1x1 or 3x3 px square with a distinct background color or border. Type: string.
        contentClass: 'content',    // CSS class(es) for the outer div representing the content area. Type: string.
        viewportClass: 'viewport',  // CSS class(es) for the inner div representing the viewport area. Type: string.
        onCreate: null,             // Event fired after the plug-in has been initialized. Type: function(event)
        onChangeCtrlState: null,    // Event fired when the UI controls for prev/next/clearAll needs to be disabled/enabled. Type: function(event, kind, enabled)
        onChangeToggle: null        // Event fired when the UI control for the toggle UI control needs to be pushed down or up. Type: function(event, isMarked)
    };

})(jQuery);
