#jquery-rsOverview [![Build Status](https://travis-ci.org/ruisoftware/jquery-rsOverview.svg?branch=master)](https://travis-ci.org/ruisoftware/jquery-rsOverview)
Displays two rectangles, one inside the other. The outer rectangle represents the content (document), while the inner rectangle represents the viewport (browser window).  

It provides to the user a visual overview of where the viewport is located within the document as well their relative sizes.  

#Use cases
- Custom horizontal scroll bar.
- Custom vertical scroll bar.
- Custom two directional scroll bar in a single control.
![rsoverview](https://cloud.githubusercontent.com/assets/428736/20385043/ebf1049a-acc6-11e6-98cc-ed2bfea53718.png)

It works for the whole document page as well any overflowed element.  
Also it can bookmark locations in the current page for a later visit.  
You can use the [beforeunload event](https://developer.mozilla.org/en-US/docs/Web/Events/beforeunload) to save the bookmarks of tehe current page, just before a new page is loaded. After a new page is loaded, you can get their new bookmarks, thus never loosing track of the bookmarks.

Check out a [demo](http://codepen.io/ruisoftware/pen/LbbGme "on CodePen").

#Key Features
 - Works with the <code>&lt;body&gt;</code> (whole page) or any other element;
 - Optionally auto hides itself if the viewport is larger than the content;
 - Viewport size is updated when browser is resized;
 - Overrides the native mouse wheel speed (if `mousewheel` property is not zero); 
 - Bookmark management:
     - Toogle bookmarks at the current location;
     - Scroll to next or previous bookmark;
     - Clear all bookmarks;
     - Load and save bookmarks;
 - Highly customizable:
     - Any markup you want, as long is not inline;
     - Free to style the way you want in CSS;
     - Strong event driven support;
 - Responsive design, suitable for any window sizes;
 
#Installation

You can install from [npm](https://www.npmjs.com/):
````bash
npm install jquery-rsOverview --save
````
or directly from git:
````javascript
<script src="http://rawgit.com/ruisoftware/jquery-rsOverview/master/src/jquery.rsOverview.js"></script>
````
or you can download the Zip archive from github, clone or fork this repository and include `jquery.rsOverview.js` from your local machine.

You also need to download jQuery. In the example below, jQuery is downloaded from Google cdn.

#Usage

First, you must run grunt. Grunt among other tasks, minimizes the js file and places all production files inside a new dist folder.

Open the following file from `src/demo/demo.html` (or you can try it [live here](http://codepen.io/ruisoftware/pen/LbbGme "on CodePen")).

````html
<!DOCTYPE html>
<html>
<head>
    <script src='https://ajax.googleapis.com/ajax/libs/jquery/2.1.4/jquery.min.js'></script>
    <script src='../../dist/jquery.rsOverview.min.js'></script>
    <style>
        #doc {
            position: fixed;
            width: 5em;
            height: 15em;
            right: 1em;
            top: 1em;
        }

        #overflowed {
            display: inline-block;
            width: 30em;
            height: 20em;
            border: 1px grey dashed;
            overflow: hidden; /* hide the native scroll bars. I want to use custom ones instead */
        }

        #element {
            position: absolute;
            left: 32em;
            top: 10em;
            width: 10em;
            height: 8em;
        }

        #elementHoriz {
            position: absolute;
            left: .5em;
            width: 29em;
            top: 26.2em;
            height: 1em;
        }

        #elementVert {
            position: absolute;
            top: 7.2em;
            left: 29.6em;
            height: 19em;
            width: 1em;  
        }

        .content {
            background-color: rgba(200, 100, 100, .5);
            cursor: crosshair;
        }

        .viewport {
            background-color: rgba(0, 0, 0, .5);
            cursor: move;
        }

        #element .content {
            background-image: url('./bug.jpg');
            background-size: cover;
            overflow: hidden; /* to hide the box-shadow below */
        }

        #element .viewport {
            background-color: transparent;
            box-shadow: 0 0 0 3em rgba(255, 255, 255, .4);
        }
    </style>
</head>
<body>
    <h1>jquery-rsOverview plugin demo</h1>
    <p>Make your own horizontal, vertical or bidirectional scroll bar.</p>

    <aside id='doc'></aside> <!-- bidirectional scroll bar for the whole document -->
 
    <div id='overflowed'>
        <img src='./bug.jpg' width='653' height='436'>
    </div>
    <!-- vertical, horizontal and bidirectional scroll bars -->
    <aside id='elementVert'></aside>
    <aside id='elementHoriz'></aside>
    <aside id='element'></aside>

    <script>
        // add some content to the page
        var $body = $('body').css('white-space', 'nowrap');
        for (var i = 0; i < 250; ++i) {
            $body.append('<p>' + new Array(15).join('The quick, brown fox jumps over a lazy dog. --' + i + '--') + '</p>');
        }

        // bidirectional scroll bar for the whole document
        $('#doc').rsOverview();
        
        // bidirectional scroll bar for the #overflowed element
        $('#element').rsOverview({
            monitor: $('#overflowed')
        });

        // vertical scroll bar for the #overflowed element
        $('#elementVert').rsOverview({
            monitor: $('#overflowed'),
            direction: 'vertical'
        });

        // horizontal scroll bar for the #overflowed element
        $('#elementHoriz').rsOverview({
            monitor: $('#overflowed'),
            direction: 'horizontal'
        });
    </script>
</body>
</html>
````
# License
This project is licensed under the terms of the [MIT license](https://opensource.org/licenses/mit-license.php)

# Bug Reports & Feature Requests
Please use the [issue tracker](https://github.com/ruisoftware/jquery-rsSlideIt/issues) to report any bugs or file feature requests.

# Contributing
Please refer to the [Contribution page](https://github.com/ruisoftware/jquery-rsSlideIt/blob/master/CONTRIBUTING.md) from more information.
