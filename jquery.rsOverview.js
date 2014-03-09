/**
* jQuery Overview - A viewport/content length overview
* ====================================================
* jQuery Overview displays two rectangles representing the content and the position of the viewport within the content.
* It provides a navigation interface to the user of the current viewport location within the whole document.
* Optionally, the user can bookmark specific locations in the page. These bookmarks can be loaded and saved.
* Can also work for overflowed elements, that is, when you have a blocked element with content that overflows it, causing scroll bars to appear.
*
* With the 'direction' parameter, introduced in version 3.3, you can monitor only the vertical scroll position, the horizontal scroll position or both scroll positions.
* A vertical or horizontal only mode allows you to use this plug-in for something that resembles a scroll bar.
*
* Licensed under The MIT License
* 
* @version   3.3
* @since     11.27.2010
* @author    Jose Rui Santos
* http://www.ruisoftware.com/
*
*
* Usage with default values:
* ==========================
* $('#overview').rsOverview();
*
*
* Required markup
* ==========================
* Any element can be used as a placeholder for this plug-in. For example:
* <div id="overview"></div>
*
*
* Markup generated
* ==========================
* Two children span elements are added to the plug-in container.
* For demonstration purposes, the generated markup is shown here in upper case.
*
* <div id="overview">
*   <SPAN class="content"></SPAN>
*   <SPAN class="viewport"></SPAN>
* </div>
*
* If there are bookmarks being used, then additional elements are inserted after the viewport element.
* The following is a markup that contains 3 bookmarks:
* <div id="overview">
*   <SPAN class="content"></SPAN>
*   <SPAN class="viewport"></SPAN>
*   <SPAN class="bookm"></SPAN>
*   <SPAN class="bookm"></SPAN>
*   <SPAN class="bookm"></SPAN>
* </div>
*
*
* CSS
* ==========================
* The placeholder element (#overview) should have some dimension:
* #overview {
*     position: absolute;
*     width: 200px;
*     height: 300px;
* }
* To monitor the whole document, use position fixed.
*
*
* Methods              Remarks
* ===================  ==================================================================================================================
* invalidate           Call this method when content has been changed dynamically. It notifies the plug-in to rescale to the correct size
* toggleBk             Create/remove a bookmark in the current scroll position. Typically called from a "Toggle bookmark" control.
* clearBk              Removes all bookmarks created so far. Typically called from a "Clear all" control.
* prevBk               Scrolls the content backwards to previous bookmark.
* nextBk               Scrolls the content forwards to next bookmark.
* destroy              Unbinds all events and completely removes the plugin from the page.
*
*
* Parameter            Remarks
* ===================  ==================================================================================================================
* For documentation regarding parameters, please check the bottom of this file.
*
* If you don't want to use bookmarks, then just set bookmarkClass to null (or do not call any bookmark related methods), e.g.
  $('#overview').rsOverview({
      bookmarkClass: null,
      monitor: $("#memo")    // use this plug-in on an overflow element and not on the whole page
  });
* Alternatively, you can change the default values only once, and then use throughout all the plug-in instances.
* To define defaults values use the $.fn.rsOverview.defaults, e.g.
* $.fn.rsOverview.defaults.scrollSpeed = 300;
* $.fn.rsOverview.defaults.autoHide = true;
* 
* 
* Event                Remarks
* ===================  ==================================================================================================================
* For documentation regarding events, please check the bottom of this file.
*
* Example on how to set events:
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
* Getter        Return          Remarks
* ============  ==============  ===========================================================================================================
* readonly      boolean         Returns false if the plug-in receives mouse events; true otherwise.
* center        boolean         Returns false if the content and viewport rectangules are positionated on the top left corner; True if they are centered relatively to the parent.
* autoHide      boolean         Returns false if the plug-in is always visible; true to hide it when the content has the same or smaller size than the viewport.
* scrollSpeed   integer/string  Returns the current animation speed in ms when moving from one location to other, trigered by mouse click or by bookmark navigation. Use 0 for no animation. The strings 'slow', 'normal' and 'fast' can also be used.
* bookmarks     array           Returns all the bookmarks. The type of each array element, depends on the direction parameter:
*                               If direction is 'horizontal', then each element is an integer that represents the horizontal scrolling position. Example: [5, 12];
*                               If direction is 'vertical', then each element is an integer that represents the vertical scrolling position. Example: [11, 80, 30].
*                               If direction is other (or 'both'), then each element is a two integers array, that represents the horizontal and vertical scrolling position. Example: [[6,44], [40, 120], [0, 130]].
* Example:
    var isReadOnly = $("#overview").rsOverview('option', 'readonly');
*
*
* Setter            Input          Remarks
* ================  =============  ============================================================================================================
* bookmarks         array          Parses the input array and on success, creates all bookmarks from that array. Any previous bookmarks are removed.
* readonly          boolean        Enables or disables the mouse input
* center            boolean        Affects the way the content and viewport rectangules are rendered: centered relatively to the parent or not
* autoHide          boolean        If true then the plug-in automatically hides itself when content has the same or smaller size than the viewport
* scrollSpeed       integer/string Amount of time that it takes to move from current scroll position to the point where user clicked (in content area). Use 0 for no animation.
* All setters return the value that was just set.
* Example:
    $("#overview").rsOverview('option', 'bookmarks', [[0,0], [0,100], [50,800]]);  // loads 3 bookmarks.
*
*
* If the size of the content element that is being monited changes, the plug-in must be notified through a call to 'invalidate' method.
* Image you have the following markup being used by the plug-in to monitor the document:
*    <div id="album"></div>
* If the album content increases or decreases, then the following call must be made:
* $("#album").rsOverview('invalidate');
* This notifies the plug-in to render the correct area size.
*
*
* This plug-in follows all good jQuery practises, namely:
*  - The possibility to use more than one instance on the same web page
*  - The possibility to work with more than one instance simultaneously, e.g. $("#overviewDoc, #overviewPhotos").rsOverview('bookmarkToggle');
*  - Except for getter/setter calls, it respects jQuery chaining, which allows calling multiple methods on the same statement.
*/
(function ($) {
    var OverviewClass = function ($elem, opts, scrollbarPixels) {
        var $contentRect = null,
            $viewportRect = null,
            monitorWindow = opts.monitor === window || $(opts.monitor).is($(window)),
            animating = false,
            dragInfo,
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
                    toggle: null,
                    toggleIdx: null,
                    triggerToggle: function (event, newToggleIdx) {
                        var newToggle = newToggleIdx > -1;
                        if (newToggle !== this.toggle || newToggle && newToggleIdx != this.toggleIdx) {
                            if (opts.bookmarkActiveClass) {
                                bookmarkUtil.$allBks.removeClass(opts.bookmarkActiveClass);
                                if (newToggle) {
                                    bookmarkUtil.$allBks.eq(newToggleIdx).addClass(opts.bookmarkActiveClass);
                                }
                            }
                            if (newToggle) {
                                bookmarkUtil.currIdx = newToggleIdx;
                            }
                            if (newToggle !== this.toggle && opts.onChangeToggle) {
                                opts.onChangeToggle(event, newToggle);
                            }
                            this.toggle = newToggle;
                            this.toggleIdx = newToggleIdx;
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
                $allBks: $(),
                currIdx: -1,
                qt: 0,
                marks: [],
                getPnt: function (key) {
                    switch (opts.direction) {
                        case 'horizontal':
                            return { scrollLeft: key };
                        case 'vertical':
                            return { scrollTop: key };
                        default:
                            return { scrollLeft: key[0], scrollTop: key[1] };
                    }
                },
                checkEvents: function (event) {
                    if (opts.bookmarkClass) {
                        this.states.triggerToggle(event, this.getMarkedIdx());
                        if (opts.onChangeCtrlState) {
                            this.states.triggerPrev(event, this.currIdx > 0 || this.states.toggle === false && this.currIdx === 0);
                            this.states.triggerNext(event, this.currIdx < this.qt - 1);
                            this.states.triggerClearAll(event, this.qt > 0);
                        }
                    }
                },
                arrayIndexOf: function (key) {
                    switch (opts.direction) {
                        case 'horizontal':
                        case 'vertical':
                            return $.inArray(key, this.marks);
                        default:
                            for (var i = 0; i < this.marks.length; ++i) {
                                var mark = this.marks[i];
                                if (mark[0] == key[0] && mark[1] == key[1]) {
                                    return i;
                                }
                            }
                    }
                    return -1;
                },
                doToggle: function (event, x, y) {
                    var key = opts.direction == 'horizontal' ? x : (opts.direction == 'vertical' ? y : [x, y]),
                        idx = this.arrayIndexOf(key);
                    if (idx === -1) {
                        // create a new bookmark
                        var pos = $viewportRect.position(),
                            $bookm = $("<span>").addClass(opts.bookmarkClass).css('position', 'absolute').appendTo($elem); 

                        if (opts.bookmarkHint) {
                            $bookm.attr('title', opts.bookmarkHint);
                        }
                        switch (opts.direction) {
                            case 'horizontal':
                                $bookm.css({
                                    'left': Math.round(pos.left + ($viewportRect.width() - $bookm.outerWidth()) / 2) + 'px',
                                    'top': 0,
                                    'bottom': 0,
                                    'height': 'auto'
                                });
                                break;
                            case 'vertical':
                                $bookm.css({
                                    'left': 0,
                                    'right': 0,
                                    'width': 'auto',
                                    'top': Math.round(pos.top + ($viewportRect.height() - $bookm.outerHeight()) / 2) + 'px'
                                });
                                break;
                            default:
                                $bookm.css({
                                    'left': Math.round(pos.left + ($viewportRect.width() - $bookm.outerWidth()) / 2) + 'px',
                                    'top': Math.round(pos.top + ($viewportRect.height() - $bookm.outerHeight()) / 2) + 'px'
                                });
                        }
                        $bookm.mousedown(function (e) {
                            if (!opts.readonly) {
                                var idx = bookmarkUtil.$allBks.index(this);
                                if (idx > -1 && idx < bookmarkUtil.qt) { // found the bookmark ?
                                    scrollTo(bookmarkUtil.getPnt(bookmarkUtil.marks[idx]), function () {
                                        bookmarkUtil.checkEvents(e);
                                    });
                                }
                                return false;
                            }
                        });

                        this.marks.push(key); // append
                        this.$allBks = this.$allBks.add($bookm);
                        this.qt = this.marks.length;
                        this.currIdx = this.qt - 1;
                    } else {
                        // delete current bookmark
                        this.marks.splice(idx, 1); // delete
                        this.$allBks.eq(idx).remove(); // from DOM
                        this.$allBks.splice(idx, 1); // from jQuery "array"
                        this.qt = this.marks.length;
                        if (this.currIdx >= this.qt) {
                            this.currIdx = this.qt - 1;
                        }
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
                    this.$allBks.remove(); // from DOM
                    this.$allBks = $();
                    if (event) {
                        this.checkEvents(event);
                    }
                },
                clearAll: function (event) {
                    this.doClearAll(event);
                },
                go: function (idx, onComplete) {
                    if (idx > -1 && idx < this.qt) {
                        scrollTo(this.getPnt(this.marks[idx]), onComplete);
                        return true;
                    }
                    return false;
                },
                gotoPrev: function (event) {
                    if (this.currIdx > 0 || this.states.toggle === false) {
                        if (this.states.toggle !== false) {
                            this.currIdx--;
                        }
                        this.go(this.currIdx, function () {
                            bookmarkUtil.checkEvents(event);
                        });
                    }
                },
                gotoNext: function (event) {
                    if (this.currIdx < this.qt - 1) {
                        this.currIdx++;
                        this.go(this.currIdx, function () {
                            bookmarkUtil.checkEvents(event);
                        });
                    }
                },
                getMarkedIdx: function () {
                    switch (opts.direction) {
                        case 'horizontal':
                            return $.inArray(content.$obj.scrollLeft(), this.marks);
                        case 'vertical':
                            return $.inArray(content.$obj.scrollTop(), this.marks);
                        default:
                            return this.arrayIndexOf([content.$obj.scrollLeft(), content.$obj.scrollTop()]);
                    }
                },
                isInteger: function (num) {
                    return typeof num === "number" && num % 1 === 0;
                },
                parseLoad: function (bookmarks) {
                    var list = [];
                    if (bookmarks) {
                        if (bookmarks instanceof Array) {
                            var qt = bookmarks.length;
                            if (opts.direction == 'horizontal' || opts.direction == 'vertical') {
                                for (var i = 0; i < qt; ++i) {
                                    var elem = bookmarks[i];
                                    if (this.isInteger(elem)) {
                                        list.push(elem);
                                    } else {
                                        throw 'Invalid element ' + elem + ' at index ' + i + '. Expected an integer. Example: [0, 34, 23]';
                                    }
                                }
                            } else {
                                for (var i = 0; i < qt; ++i) {
                                    var elem = bookmarks[i];
                                    if (elem instanceof Array && elem.length === 2 && this.isInteger(elem[0]) && this.isInteger(elem[1])) {
                                        list.push(elem);
                                        continue;
                                    }
                                    throw 'Invalid element ' + elem + ' at index ' + i + '. Expected a [x, y] two integers array. Example: [[0, 0], [40, 80], [40, 300]]';
                                }
                            }
                        } else {
                            switch (opts.direction) {
                                case 'horizontal':
                                case 'vertical':
                                    throw 'Expected an array of integers. Example: [0, 80, 300]';
                                default:
                                    throw 'Expected an array of [x, y] arrays, where x and y are integers. Example: [[0, 0], [40, 80], [40, 300]]';
                            }
                        }
                    }
                    return list;
                },
                loadMarks: function (event, bookmarks) {
                    try {
                        var loaded = this.parseLoad(bookmarks),
                            qt = loaded.length;
                        this.doClearAll(null);
                        if (opts.direction == 'horizontal' || opts.direction == 'vertical') {
                            for (var i = 0; i < qt; ++i) {
                                this.doToggle(null, loaded[i], loaded[i]);
                            }
                        } else {
                            for (var i = 0; i < qt; ++i) {
                                this.doToggle(null, loaded[i][0], loaded[i][1]);
                            }
                        }
                        $elem.triggerHandler('resize.rsOverview'); // to correctly render the marks
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

            scrollTo = function (toPnt, onComplete) {
                var $anim = monitorWindow ? $("html,body") : viewport.$obj;
                if (animating) {
                    $anim.stop(true);
                }
                // will animate? If the toPnt is the current point, then no need to animate
                var currPos = [0, 0], willChange;
                $anim.each(function () { // for "html,body" find out which one actually contains the scroll information
                    var $this = $(this),
                        x = $this.scrollLeft(),
                        y = $this.scrollTop();
                    if (x != 0 || y != 0) {
                        currPos[0] = x;
                        currPos[1] = y;
                        return false;
                    }
                });

                switch (opts.direction) {
                    case 'horizontal':
                        willChange = currPos[0] != toPnt.scrollLeft;
                        break;
                    case 'vertical':
                        willChange = currPos[1] != toPnt.scrollTop;
                        break;
                    default:
                        willChange = currPos[0] != toPnt.scrollLeft || currPos[1] != toPnt.scrollTop;
                }
                if (willChange) {
                    if (opts.bookmarkClass && opts.bookmarkActiveClass) {
                        bookmarkUtil.$allBks.removeClass(opts.bookmarkActiveClass);
                    }
                    animating = true;
                    $anim.animate(toPnt, {
                        duration: opts.scrollSpeed, 
                        queue: false,
                        complete: function (event) {
                            animating = false;
                            if (onComplete !== undefined) {
                                onComplete();
                            }
                        }
                    });
                }
            },

            getXScrollBarPixels = function () {
                return content.sizeX <= viewport.sizeX ? 0 : cache.scrPixels.x;
            },

            getYScrollBarPixels = function () {
                return content.sizeY <= viewport.sizeY ? 0 : cache.scrPixels.y;
            },

            onResize = function (event) {
                var needsToHide = function () {
                    switch(opts.direction) {
                        case 'horizontal': return content.sizeX <= viewport.sizeX;
                        case 'vertical': return content.sizeY <= viewport.sizeY;
                        default: return content.sizeX <= viewport.sizeX && content.sizeY <= viewport.sizeY;
                    }
                };
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
                    if (needsToHide()) {
                        $elem.hide();
                        return;
                    }
                    $elem.show();
                } else {
                    if ($elem.css('display') == 'none') {
                        $elem.show();
                    }
                }
                
                var elementSize = {
                    x: $elem.width(),
                    y: $elem.height()
                }, coefX = coefY = 0;
                
                if (opts.direction != 'vertical') {
                    coefX = content.sizeX / elementSize.x;
                }
                if (opts.direction != 'horizontal') {
                    coefY = content.sizeY / elementSize.y;
                }
                cache.scaleCoef = Math.max(coefX, coefY);
                
                if (opts.direction != 'vertical') {
                    coefX = (viewport.sizeX - getYScrollBarPixels()) / elementSize.x;
                }
                if (opts.direction != 'horizontal') {
                    coefY = (viewport.sizeY - getXScrollBarPixels()) / elementSize.y;
                }
                cache.scaleCoef = Math.max(Math.max(coefX, coefY), cache.scaleCoef);

                if (opts.direction != 'horizontal' && opts.direction != 'vertical') {
                    // compute inner DIV size that corresponds to the size of the content being monitored
                    var calcWidth = content.sizeX / cache.scaleCoef,
                        calcHeight = content.sizeY / cache.scaleCoef;
                    $contentRect.width(Math.round(calcWidth)).height(Math.round(calcHeight)).css({
                        'left': Math.round(opts.center ? (elementSize.x - calcWidth) / 2 : 0) + 'px',
                        'top': Math.round(opts.center ? (elementSize.y - calcHeight) / 2 : 0) + 'px'
                    });
                }
                $elem.triggerHandler('render.rsOverview', [true]);
            },

            doRenderHorizontal = function (needResize) {
                if (needResize) {                
                    var calcWidth = (viewport.sizeX - getYScrollBarPixels()) / cache.scaleCoef;
                    $viewportRect.width(Math.round(calcWidth));

                    for (var i = 0; i < bookmarkUtil.marks.length; ++i) {
                        var pnt = bookmarkUtil.getPnt(bookmarkUtil.marks[i]),
                            $bookm = bookmarkUtil.$allBks.eq(i);
                        $bookm.css({
                            'left': Math.round((calcWidth - $bookm.outerWidth()) / 2 + pnt.scrollLeft / cache.scaleCoef) + 'px',
                            'top': 0,
                            'bottom': 0
                        });
                    }
                }
                $viewportRect.css('left', Math.round(viewport.$obj.scrollLeft() / cache.scaleCoef) + 'px');
            },
            
            doRenderVertical = function (needResize) {
                if (needResize) {                
                    var calcHeight = (viewport.sizeY - getXScrollBarPixels()) / cache.scaleCoef;
                    $viewportRect.height(Math.round(calcHeight));

                    for (var i = 0; i < bookmarkUtil.marks.length; ++i) {
                        var pnt = bookmarkUtil.getPnt(bookmarkUtil.marks[i]),
                            $bookm = bookmarkUtil.$allBks.eq(i);
                        $bookm.css({
                            'top': Math.round((calcHeight - $bookm.outerHeight()) / 2 + pnt.scrollTop / cache.scaleCoef) + 'px',
                            'left': 0,
                            'right': 0
                        });
                    }
                }
                $viewportRect.css('top', Math.round(viewport.$obj.scrollTop() / cache.scaleCoef) + 'px');
            },
            
            doRenderBoth = function (pos, needResize) {
                if (needResize) {
                    var calcWidth = (viewport.sizeX - getYScrollBarPixels()) / cache.scaleCoef,
                        calcHeight = (viewport.sizeY - getXScrollBarPixels()) / cache.scaleCoef;
                    $viewportRect.width(Math.round(calcWidth)).height(Math.round(calcHeight));

                    for (var i = 0; i < bookmarkUtil.marks.length; ++i) {
                        var pnt = bookmarkUtil.getPnt(bookmarkUtil.marks[i]),
                            $bookm = bookmarkUtil.$allBks.eq(i);
                        $bookm.css({
                            'left': Math.round(pos.left + (calcWidth - $bookm.outerWidth()) / 2 + pnt.scrollLeft / cache.scaleCoef) + 'px',
                            'top': Math.round(pos.top + (calcHeight - $bookm.outerHeight()) / 2 + pnt.scrollTop / cache.scaleCoef) + 'px'
                        });
                    }
                }
                pos.left = viewport.$obj.scrollLeft() / cache.scaleCoef + (opts.center ? pos.left : 0);
                pos.top = viewport.$obj.scrollTop() / cache.scaleCoef + (opts.center ? pos.top : 0);
                $viewportRect.css({
                    'left': Math.round(pos.left) + 'px',
                    'top': Math.round(pos.top) + 'px'
                });
            },
            onRender = function (event, needResize) {
                // compute inner element size and position that corresponds to the size and position of the viewport monitored
                switch (opts.direction) {
                    case 'horizontal':
                        doRenderHorizontal(needResize);
                        break;
                    case 'vertical':
                        doRenderVertical(needResize);
                        break;
                    default:
                        doRenderBoth($contentRect.position(), needResize);
                }
                if (!animating) {
                    bookmarkUtil.checkEvents(event);
                }
            },
            onMouseWheel = function (event) {
                var delta = {x: 0, y: 0};
                if (event.wheelDelta === undefined && event.originalEvent !== undefined && (event.originalEvent.wheelDelta !== undefined || event.originalEvent.detail !== undefined)) { 
                    event = event.originalEvent;
                }
                if (event.wheelDelta) { 
                    delta.y = event.wheelDelta/120;
                }
                if (event.detail) {
                    delta.y = -event.detail/3;
                }
                var evt = event || window.event;
                if (evt.axis !== undefined && evt.axis === evt.HORIZONTAL_AXIS) {
                    delta.x = - delta.y;
                    delta.y = 0;
                }
                if (evt.wheelDeltaY !== undefined) {
                    delta.y = evt.wheelDeltaY/120;
                }
                if (evt.wheelDeltaX !== undefined) { 
                    delta.x = - evt.wheelDeltaX/120;
                }

                event.preventDefault ? event.preventDefault() : event.returnValue = false; // prevents scrolling
                if (opts.direction == 'horizontal') {
                    viewport.$obj.scrollLeft(viewport.$obj.scrollLeft() - delta.y*opts.mousewheel);
                } else {
                    viewport.$obj.scrollTop(viewport.$obj.scrollTop() - delta.y*opts.mousewheel);
                }
                return false;
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
                        $elem.triggerHandler('resize.rsOverview');
                        break;
                    case 'autoHide':
                        opts.autoHide = value;
                        $elem.triggerHandler('resize.rsOverview');
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
            doScroll = function () {
                $elem.triggerHandler('render.rsOverview', [false]);
            },
            doResize = function () {
                $elem.triggerHandler('resize.rsOverview');
            },
            doViewportMousedown = function (e) {
                if (!opts.readonly) {
                    if (animating) {
                        (monitorWindow ? $("html,body") : viewport.$obj).stop(true);
                        animating = false;
                    }
                    var contPos = $contentRect.position(),
                        viewPos = $viewportRect.position();
                    dragInfo = {
                        initPos: { 
                            x: viewPos.left - contPos.left,
                            y: viewPos.top - contPos.top
                        },
                        initClick: {
                            x: e.clientX,
                            y: e.clientY
                        }
                    };

                    // prevents text selection during drag
                    this.ondragstart = this.onselectstart = function () {
                        return false;
                    };

                    $(document).bind('mousemove.rsOverview', doDocumentMousemove);
                    e.preventDefault();
                }
            },
            doDocumentMousemove = function (e) {
                switch (opts.direction) {
                    case 'horizontal':
                        viewport.$obj.
                            scrollLeft(cache.scaleCoef * (e.clientX - dragInfo.initClick.x + dragInfo.initPos.x));
                        break;
                    case 'vertical':
                        viewport.$obj.
                            scrollTop(cache.scaleCoef * (e.clientY - dragInfo.initClick.y + dragInfo.initPos.y));
                        break;
                    default:
                        viewport.$obj.
                            scrollLeft(cache.scaleCoef * (e.clientX - dragInfo.initClick.x + dragInfo.initPos.x)).
                            scrollTop(cache.scaleCoef * (e.clientY - dragInfo.initClick.y + dragInfo.initPos.y));
                }
                e.preventDefault();
            },
            doDocumentMouseup = function () {
                if (!opts.readonly) {
                    $(document).unbind('mousemove.rsOverview', doDocumentMousemove);
                }
            },
            doContentMousedownHorizVert = function (e) {
                if (!opts.readonly) {
                    scrollTo(opts.direction == 'horizontal' ? 
                        { scrollLeft: (e.offsetX - $viewportRect.width() / 2)*cache.scaleCoef } :
                        { scrollTop: (e.offsetY - $viewportRect.height() / 2)*cache.scaleCoef }, function () {
                        bookmarkUtil.checkEvents(e);
                    });
                    e.preventDefault();
                }
            },
            doContentMousedownBoth = function (e) {
                if (!opts.readonly) {
                    scrollTo({
                        scrollLeft: cache.scaleCoef * (e.offsetX - $viewportRect.width() / 2),
                        scrollTop: cache.scaleCoef * (e.offsetY - $viewportRect.height() / 2)
                    }, function () {
                        bookmarkUtil.checkEvents(e);
                    });
                    e.preventDefault();
                }
            },
            init = function () {
                if ($elem.css('position') === 'static') {
                    $elem.css('position', 'relative');
                }
                $contentRect = $("<span>").addClass(opts.contentClass).css('position', 'absolute');
                $viewportRect = $("<span>").addClass(opts.viewportClass).css('position', 'absolute');
                $elem.append($contentRect).append($viewportRect);
                if (opts.direction == 'horizontal' || opts.direction == 'vertical') {
                    $contentRect.css({ 'left': 0, 'top': 0, 'bottom': 0, 'right': 0 });
                }
                switch (opts.direction) {
                    case 'horizontal':
                        $viewportRect.css({ 'top': 0, 'bottom': 0 });
                        break;
                    case 'vertical':
                        $viewportRect.css({ 'left': 0, 'right': 0 });
                }

                // elements being monitorized for scroll and resize events
                viewport.$obj = $(opts.monitor);
                content.$obj = monitorWindow ? $(document) : viewport.$obj;
                if (monitorWindow) {
                    switch (opts.direction) {
                        case 'horizontal':
                            $scrollAnim = $({ 'scrollLeft': 0 });
                            break;
                        case 'vertical':
                            $scrollAnim = $({ 'scrollTop': 0 });
                            break;
                        default:
                            $scrollAnim = $({ 'scrollLeft': 0, 'scrollTop': 0 });
                    }
                }
                // when the viewport is scrolled or when is resized, the plugin is updated
                viewport.$obj.
                    bind('scroll.rsOverview', doScroll).
                    bind('resize.rsOverview', doResize);

                if (opts.mousewheel !== 0) {
                    (monitorWindow? $(window) : viewport.$obj).bind('DOMMouseScroll.rsOverview mousewheel.rsOverview', onMouseWheel);
                }

                $viewportRect.bind('mousedown.rsOverview', doViewportMousedown);

                // the mouseup event might happen outside the plugin, so to make sure the unbind always runs, it must done on document level
                $(document).bind('mouseup.rsOverview', doDocumentMouseup);

                // mouse click on the content: viewport jumps directly to that position
                if (opts.direction == 'horizontal' || opts.direction == 'vertical') {
                    $contentRect.bind('mousedown.rsOverview', doContentMousedownHorizVert);
                } else {
                    $contentRect.bind('mousedown.rsOverview', doContentMousedownBoth);
                }

                $elem.
                    bind('resize.rsOverview', onResize).
                    bind('render.rsOverview', onRender).
                    bind('toggleBk.rsOverview', onToggleBk).
                    bind('clearBk.rsOverview', onClearBk).
                    bind('prevBk.rsOverview', onPrevBk).
                    bind('nextBk.rsOverview', onNextBk).
                    bind('getter.rsOverview', onGetter).
                    bind('setter.rsOverview', onSetter).
                    bind('create.rsOverview', onCreate).
                    bind('destroy.rsOverview', onDestroy);

                // graphical initialization when plugin is called (after page and DOM are loaded)
                $elem.triggerHandler('resize.rsOverview');

                $elem.triggerHandler('create.rsOverview');
            },
            onDestroy = function () {
                $elem.triggerHandler('clearBk.rsOverview');
                
                viewport.$obj.
                    unbind('scroll.rsOverview', doScroll).
                    unbind('resize.rsOverview', doResize);
                
                if (opts.mousewheel !== 0) {
                    (monitorWindow? $(window) : viewport.$obj).unbind('DOMMouseScroll.rsOverview mousewheel.rsOverview', onMouseWheel);
                }
                
                $viewportRect.
                    unbind('mousedown.rsOverview', doViewportMousedown);
                $(document).
                    unbind('mouseup.rsOverview', doDocumentMouseup).
                    unbind('mousemove.rsOverview', doDocumentMousemove);

                if (opts.direction == 'horizontal' || opts.direction == 'vertical') {
                    $contentRect.unbind('mousedown.rsOverview', doContentMousedownHorizVert);
                } else {
                    $contentRect.unbind('mousedown.rsOverview', doContentMousedownBoth);
                }

                $elem.
                    unbind('resize.rsOverview', onResize).
                    unbind('render.rsOverview', onRender).
                    unbind('toggleBk.rsOverview', onToggleBk).
                    unbind('clearBk.rsOverview', onClearBk).
                    unbind('prevBk.rsOverview', onPrevBk).
                    unbind('nextBk.rsOverview', onNextBk).
                    unbind('getter.rsOverview', onGetter).
                    unbind('setter.rsOverview', onSetter).
                    unbind('create.rsOverview', onCreate).
                    unbind('destroy.rsOverview', onDestroy);

                $contentRect.remove();
                $viewportRect.remove();
                $elem.css('position', '');
                if ($elem.attr('style') == '') {
                    $elem.removeAttr('style');
                }
            };

        init();
    }

    $.fn.rsOverview = function (options) {
        var invalidate = function () {
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
        destroy = function () {
            return this.trigger('destroy.rsOverview');
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
                case 'invalidate': return invalidate.apply(this);
                case 'toggleBk': return bookmarkToggle.apply(this);
                case 'clearBk': return bookmarkClearAll.apply(this);
                case 'prevBk': return bookmarkGotoPrev.apply(this);
                case 'nextBk': return bookmarkGotoNext.apply(this);
                case 'destroy': return destroy.call(this);
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
        	scrollbarPixels = opts.monitor === window || $(opts.monitor).is($(window)) ? 0 : getScrollbarSize();

        return this.each(function () {
            new OverviewClass($(this), opts, scrollbarPixels);
        });
    };

    // public access to the default input parameters
    $.fn.rsOverview.defaults = {
        // properties
        monitor: $(window),             // The element being monitored by the plug-in. Type: jQuery object.
        direction: 'both',              // The monitoring direction. Type: String 'horizontal', 'vertical' or 'both'.
        center: true,                   // Whether to render the content and viewport rectangles centered in the placeholder area. Ignored for direction 'horizontal' and 'vertical'. Type: boolean.
        autoHide: false,                // Whether to hide the plug-in when the content has the same size or is smaller than the viewport. Type: boolean.
        readonly: false,                // False: Reacts to mouse/keyboard events; True: Ignores mouse/keyboard events. Type: boolean.
        scrollSpeed: 'normal',          // Animation speed used when moving to a selected position or when moving to a bookmark. You can also use a sepecific duration in milliseconds. Use 0 for no animation. Type: string or integer.
        bookmarkClass: 'bookm',         // CSS class(es) for bookmark style. Typically is a small square with a distinct background color or border. Type: string.
        bookmarkActiveClass: 'active',  // CSS class(es) for the bookmark whose coordinates match the current location. Typically is used for highlighting. Type: string.
        bookmarkHint: 'Go to bookmark', // Hint message that appears when the user mouses over the bookmark area. Use null to disable hints. Type: string.
        contentClass: 'content',        // CSS class(es) for the outer div representing the content area. Type: string.
        viewportClass: 'viewport',      // CSS class(es) for the inner div representing the viewport area. Type: string.
        mousewheel: 0,                  // Amount to step applied to each mousewheel event. Use 0 to disable scrolling on mousewheel. Type: integer.

        // events
        onCreate: null,                 // Event fired after the plug-in has been initialized. Type: function(event)
        onChangeCtrlState: null,        // Event fired when the UI controls for prev/next/clearAll needs to be disabled/enabled. Type: function(event, kind, enabled)
        onChangeToggle: null            // Event fired when the UI control for the toggle UI control needs to be pushed down or up. Type: function(event, isMarked)
    };

})(jQuery);